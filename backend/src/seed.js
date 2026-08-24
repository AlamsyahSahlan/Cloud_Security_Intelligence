require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const db = require('./config/database');
const { hashPassword } = require('./middleware/encryption');
const cryptoService = require('./services/crypto.service');

async function seed() {
  // ✅ Inisialisasi database terlebih dahulu
  await db.initialize();

  console.log('Starting database seed...');
  
  // Clear existing (optional, but good for testing)
  db.prepare('DELETE FROM certificates').run();
  db.prepare('DELETE FROM grades').run();
  db.prepare('DELETE FROM students').run();
  db.prepare('DELETE FROM subjects').run();
  db.prepare('DELETE FROM audit_logs').run();
  db.prepare('DELETE FROM waf_logs').run();
  db.prepare('DELETE FROM users').run();

  const users = [
    { username: 'admin', password: 'Admin@123', role: 'ADMIN', full_name: 'Administrator Sistem' },
    { username: 'kepsek', password: 'Kepsek@123', role: 'KEPALA_SEKOLAH', full_name: 'Dr. Ahmad Suryadi, M.Pd' },
    { username: 'guru1', password: 'Guru@123', role: 'GURU', full_name: 'Siti Nurhaliza, S.Pd' },
    { username: 'tu1', password: 'TataUsaha@123', role: 'TU', full_name: 'Budi Santoso' },
    { username: 'siswa1', password: 'Siswa@123', role: 'SISWA', full_name: 'Alamsyah Sahlan' },
    { username: 'dudi1', password: 'Dudi@123', role: 'DUDI', full_name: 'PT Teknologi Nusantara' }
  ];

  const userIds = {};

  for (const u of users) {
    const id = uuidv4();
    userIds[u.username] = id;
    const hashed = await hashPassword(u.password);
    
    db.prepare(`
      INSERT INTO users (id, username, password, full_name, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, u.username, hashed, u.full_name, u.role);
    console.log(`Created user: ${u.username} (${u.role})`);
  }

  const subjects = [
    { code: 'MK-01', name: 'Matematika', major: 'UMUM', semester: 1 },
    { code: 'MK-02', name: 'Bahasa Indonesia', major: 'UMUM', semester: 1 },
    { code: 'MK-03', name: 'Bahasa Inggris', major: 'UMUM', semester: 1 },
    { code: 'RPL-01', name: 'Pemrograman Web', major: 'RPL', semester: 1 },
    { code: 'RPL-02', name: 'Basis Data', major: 'RPL', semester: 1 },
    { code: 'TKJ-01', name: 'Jaringan Komputer', major: 'TKJ', semester: 1 }
  ];

  const subjectIds = {};

  for (const s of subjects) {
    const id = uuidv4();
    subjectIds[s.code] = id;
    db.prepare(`
      INSERT INTO subjects (id, code, name, major, semester)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, s.code, s.name, s.major, s.semester);
  }
  console.log('Created subjects');

  const students = [
    { nis: '1001', nisn: '001001', full_name: 'Alamsyah Sahlan', class: 'XII-RPL', major: 'RPL', nik: '3201010101010001', address: 'Jl. Merdeka No 1', phone: '081234567890', user_id: userIds['siswa1'] },
    { nis: '1002', nisn: '001002', full_name: 'Budi Darmawan', class: 'XII-RPL', major: 'RPL', nik: '3201010101010002', address: 'Jl. Merdeka No 2', phone: '081234567891', user_id: null },
    { nis: '1003', nisn: '001003', full_name: 'Citra Kirana', class: 'XII-TKJ', major: 'TKJ', nik: '3201010101010003', address: 'Jl. Merdeka No 3', phone: '081234567892', user_id: null },
    { nis: '1004', nisn: '001004', full_name: 'Dewi Lestari', class: 'XII-TKJ', major: 'TKJ', nik: '3201010101010004', address: 'Jl. Merdeka No 4', phone: '081234567893', user_id: null },
    { nis: '1005', nisn: '001005', full_name: 'Eko Patrio', class: 'XII-RPL', major: 'RPL', nik: '3201010101010005', address: 'Jl. Merdeka No 5', phone: '081234567894', user_id: null }
  ];

  const studentIds = {};

  for (const st of students) {
    const id = uuidv4();
    studentIds[st.nis] = id;
    
    db.prepare(`
      INSERT INTO students (id, nis, nisn, full_name, class, major, enrollment_year, encrypted_nik, encrypted_address, encrypted_phone, user_id)
      VALUES (?, ?, ?, ?, ?, ?, 2021, ?, ?, ?, ?)
    `).run(
      id, st.nis, st.nisn, st.full_name, st.class, st.major, 
      cryptoService.encryptField(st.nik),
      cryptoService.encryptField(st.address),
      cryptoService.encryptField(st.phone),
      st.user_id
    );
  }
  console.log('Created 5 students with encrypted PII');

  // Grades for siswa1
  const grades = [
    { student_id: studentIds['1001'], subject_id: subjectIds['MK-01'], score: 85.5, grade_letter: 'A' },
    { student_id: studentIds['1001'], subject_id: subjectIds['RPL-01'], score: 90.0, grade_letter: 'A' }
  ];

  for (const g of grades) {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO grades (id, student_id, subject_id, semester, score, grade_letter, teacher_id)
      VALUES (?, ?, ?, 1, ?, ?, ?)
    `).run(id, g.student_id, g.subject_id, g.score, g.grade_letter, userIds['guru1']);
  }
  console.log('Created sample grades');

  console.log('\nSeed completed successfully!');
  console.log('----------------------------------------------------');
  console.log('Default Admin -> admin : Admin@123');
  console.log('Default Kepsek -> kepsek : Kepsek@123');
  console.log('Default Guru -> guru1 : Guru@123');
  console.log('Default TU -> tu1 : TataUsaha@123');
  console.log('Default Siswa -> siswa1 : Siswa@123');
  console.log('Default DUDI -> dudi1 : Dudi@123');
  console.log('----------------------------------------------------');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
