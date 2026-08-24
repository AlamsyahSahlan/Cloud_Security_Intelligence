import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Search, Plus, Edit2, Trash2, Lock, X } from 'lucide-react';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);

  const [formData, setFormData] = useState({
    nis: '', nisn: '', nama: '', tempatLahir: '', tanggalLahir: '',
    jenisKelamin: 'L', kelas: '', jurusan: '', tahunMasuk: '',
    nik: '', alamat: '', noHp: ''
  });

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/students');
      setStudents(res.data.data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openModal = (student = null) => {
    if (student) {
      setCurrentStudent(student);
      setFormData(student);
    } else {
      setCurrentStudent(null);
      setFormData({
        nis: '', nisn: '', nama: '', tempatLahir: '', tanggalLahir: '',
        jenisKelamin: 'L', kelas: '', jurusan: '', tahunMasuk: '',
        nik: '', alamat: '', noHp: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (currentStudent) {
        await api.put(`/students/${currentStudent.id || currentStudent._id}`, formData);
      } else {
        await api.post('/students', formData);
      }
      closeModal();
      fetchStudents();
    } catch (error) {
      console.error('Error saving student:', error);
      alert('Gagal menyimpan data siswa');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus siswa ini?')) {
      try {
        await api.delete(`/students/${id}`);
        fetchStudents();
      } catch (error) {
        console.error('Error deleting student:', error);
      }
    }
  };

  const filteredStudents = students.filter(s => 
    (s.nama || '').toLowerCase().includes(search.toLowerCase()) || 
    (s.nis || '').includes(search)
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Manajemen Data Siswa</h1>
        <button 
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
        >
          <Plus size={18} /> Tambah Siswa
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Cari berdasarkan Nama atau NIS..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="px-6 py-3">No</th>
                <th className="px-6 py-3">NIS</th>
                <th className="px-6 py-3">Nama Lengkap</th>
                <th className="px-6 py-3">Kelas</th>
                <th className="px-6 py-3">Jurusan</th>
                <th className="px-6 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center py-8 text-slate-500">Loading...</td></tr>
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((student, idx) => (
                  <tr key={student.id || student._id || idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4">{idx + 1}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{student.nis}</td>
                    <td className="px-6 py-4">{student.nama}</td>
                    <td className="px-6 py-4">{student.kelas}</td>
                    <td className="px-6 py-4">{student.jurusan}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openModal(student)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(student.id || student._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" className="text-center py-8 text-slate-500">Tidak ada data siswa.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">{currentStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="studentForm" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">NIS</label>
                  <input type="text" name="nis" value={formData.nis} onChange={handleInputChange} required className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">NISN</label>
                  <input type="text" name="nisn" value={formData.nisn} onChange={handleInputChange} required className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                  <input type="text" name="nama" value={formData.nama} onChange={handleInputChange} required className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tempat Lahir</label>
                  <input type="text" name="tempatLahir" value={formData.tempatLahir} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Lahir</label>
                  <input type="date" name="tanggalLahir" value={formData.tanggalLahir} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kelas</label>
                  <input type="text" name="kelas" value={formData.kelas} onChange={handleInputChange} required className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jurusan</label>
                  <input type="text" name="jurusan" value={formData.jurusan} onChange={handleInputChange} required className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                
                <div className="md:col-span-2 mt-4 mb-2">
                  <h3 className="text-sm font-semibold text-slate-600 flex items-center gap-2 border-b pb-2"><Lock size={16} className="text-blue-500"/> Data Sensitif (Dienkripsi)</h3>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">NIK <Lock size={12} className="text-slate-400"/></label>
                  <input type="text" name="nik" value={formData.nik} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">No HP <Lock size={12} className="text-slate-400"/></label>
                  <input type="text" name="noHp" value={formData.noHp} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">Alamat Lengkap <Lock size={12} className="text-slate-400"/></label>
                  <textarea name="alamat" value={formData.alamat} onChange={handleInputChange} rows="2" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
              <button onClick={closeModal} className="px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition">Batal</button>
              <button type="submit" form="studentForm" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Simpan Data</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
