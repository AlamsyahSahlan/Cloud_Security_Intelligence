import React, { useState } from 'react';
import axios from 'axios';
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Shield } from 'lucide-react';

const VerifyDocument = () => {
  const [file, setFile] = useState(null);
  const [hashInput, setHashInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function hashFile(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!file && !hashInput) {
      setError('Silakan upload file PDF atau masukkan hash dokumen.');
      return;
    }
    
    setError('');
    setLoading(true);
    setResult(null);

    try {
      let hashToVerify = hashInput;
      
      if (file) {
        hashToVerify = await hashFile(file);
      }

      // We use raw axios here since this is public and doesn't need auth token
      const res = await axios.post('/api/certificates/verify', { hash: hashToVerify });
      setResult({ status: 'VALID', data: res.data });
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setResult({ status: 'INVALID', message: 'Dokumen tidak ditemukan di blockchain atau telah dimanipulasi.' });
      } else if (err.response && err.response.status === 410) {
        setResult({ status: 'REVOKED', message: err.response.data.message || 'Sertifikat telah dicabut.', reason: err.response.data.reason });
      } else {
        setError('Terjadi kesalahan saat memverifikasi dokumen.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full text-center mb-8">
        <Shield className="mx-auto h-16 w-16 text-blue-600 mb-4" />
        <h1 className="text-3xl font-extrabold text-slate-900">🔍 Portal Verifikasi Dokumen SMK</h1>
        <p className="mt-4 text-lg text-slate-600">Verifikasi keaslian ijazah, transkrip, dan sertifikat menggunakan teknologi Blockchain.</p>
      </div>

      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition cursor-pointer">
            <input 
              type="file" 
              accept=".pdf" 
              className="hidden" 
              id="file-upload" 
              onChange={(e) => setFile(e.target.files[0])} 
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
              <Upload className="mx-auto h-12 w-12 text-slate-400" />
              <span className="mt-4 text-sm font-medium text-slate-900">
                {file ? file.name : 'Pilih File PDF atau Drag & Drop ke sini'}
              </span>
              <span className="mt-1 text-xs text-slate-500">Maksimal ukuran file: 5MB</span>
            </label>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">Atau masukkan hash manual</span>
            </div>
          </div>

          <div>
            <input 
              type="text" 
              value={hashInput} 
              onChange={(e) => setHashInput(e.target.value)} 
              placeholder="Masukkan SHA-256 Hash dokumen" 
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition"
          >
            {loading ? 'Memverifikasi...' : 'Verifikasi Dokumen'}
          </button>
        </form>

        {result && (
          <div className="mt-8 pt-8 border-t border-slate-200">
            {result.status === 'VALID' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <div>
                    <h3 className="text-lg font-bold text-green-800">Dokumen Valid (Terverifikasi)</h3>
                    <p className="text-green-600 text-sm">Tercatat dalam blockchain dan tidak mengalami perubahan.</p>
                  </div>
                </div>
                <div className="bg-white rounded p-4 text-sm space-y-2">
                  <div className="flex justify-between"><span className="text-slate-500">Nama:</span> <span className="font-medium">{result.data.studentName || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Tipe:</span> <span className="font-medium">{result.data.type || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Penerbit:</span> <span className="font-medium">{result.data.issuer || 'SMK'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Tx Hash:</span> <span className="font-mono text-xs text-blue-600 break-all">{result.data.txHash || '-'}</span></div>
                </div>
              </div>
            )}
            
            {result.status === 'INVALID' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-red-800 mb-1">DOKUMEN TIDAK VALID</h3>
                <p className="text-red-600 text-sm">{result.message}</p>
              </div>
            )}

            {result.status === 'REVOKED' && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-orange-800 mb-1">DOKUMEN DICABUT</h3>
                <p className="text-orange-600 text-sm mb-3">{result.message}</p>
                <div className="bg-white rounded p-3 text-sm text-left">
                  <span className="font-medium text-orange-800">Alasan:</span> {result.reason || '-'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="mt-12 text-center text-sm text-slate-500">
        <p>Powered by Blockchain Technology & Zero Trust Architecture</p>
      </div>
    </div>
  );
};

export default VerifyDocument;
