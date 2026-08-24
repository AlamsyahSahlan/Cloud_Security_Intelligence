import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { Award, Upload, Link as LinkIcon, CheckCircle, AlertTriangle, ShieldAlert, X } from 'lucide-react';

const Certificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({ student_id: '', type: 'IJAZAH' });
  const [file, setFile] = useState(null);

  const fetchCerts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/certificates');
      setCertificates(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/students');
      setStudents(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCerts();
    fetchStudents();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert("Pilih file PDF!");
    
    const data = new FormData();
    data.append('student_id', formData.student_id);
    data.append('type', formData.type);
    data.append('pdf', file);

    try {
      await api.post('/certificates/issue', data);
      setIsModalOpen(false);
      setFile(null);
      fetchCerts();
      alert('Sertifikat berhasil dibuat! Menunggu persetujuan Kepala Sekolah.');
    } catch (e) {
      alert('Gagal membuat sertifikat: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.post(`/certificates/${id}/approve`);
      fetchCerts();
      alert('Sertifikat berhasil disetujui dan disimpan ke Blockchain!');
    } catch (e) {
      alert('Gagal menyetujui sertifikat: ' + (e.response?.data?.error || e.message));
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Penerbitan Sertifikat & Ijazah Digital</h1>
        {(user?.role === 'TU' || user?.role === 'ADMIN') && (
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <Upload size={18} /> Terbitkan Sertifikat
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="px-6 py-3">No. Sertifikat</th>
                <th className="px-6 py-3">Nama Siswa</th>
                <th className="px-6 py-3">Tipe</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Blockchain Tx</th>
                <th className="px-6 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center py-8">Loading...</td></tr>
              ) : certificates.length > 0 ? (
                certificates.map((cert) => (
                  <tr key={cert.id} className="border-b hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium">{cert.certificate_number}</td>
                    <td className="px-6 py-4">{cert.student_name}</td>
                    <td className="px-6 py-4">{cert.type}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded text-xs font-medium ${cert.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {cert.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {cert.blockchain_tx_hash ? (
                        <span className="text-blue-600 flex items-center gap-1 font-mono text-xs">
                          <LinkIcon size={14} /> {cert.blockchain_tx_hash.substring(0, 15) + '...'}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {cert.status === 'PENDING' && user?.role === 'KEPALA_SEKOLAH' && (
                        <button onClick={() => handleApprove(cert.id)} className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded-md text-xs font-medium mr-2">
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" className="text-center py-8 text-slate-500">Tidak ada sertifikat.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Terbitkan Sertifikat Baru</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Siswa</label>
                <select 
                  required 
                  value={formData.student_id}
                  onChange={(e) => setFormData({...formData, student_id: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Pilih Siswa</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name} ({s.nis})</option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipe Sertifikat</label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="IJAZAH">Ijazah</option>
                  <option value="TRANSKRIP">Transkrip</option>
                  <option value="SERTIFIKAT_PKL">Sertifikat PKL</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">Upload File PDF</label>
                <input 
                  type="file" 
                  accept="application/pdf"
                  required
                  onChange={handleFileChange}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Batal</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Certificates;
