const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const cryptoService = require('../services/crypto.service');

const logAudit = (userId, action, targetTable, targetId, ip, oldValue = null, newValue = null) => {
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, target_table, target_id, old_value, new_value, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), userId, action, targetTable, targetId, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null, ip);
};

// GET /api/students
router.get('/', authenticate, authorize('TU', 'ADMIN', 'KEPALA_SEKOLAH', 'GURU'), (req, res) => {
  try {
    const { class: studentClass, major, search } = req.query;
    let query = "SELECT id, nis, nisn, full_name, class, major, enrollment_year, status FROM students WHERE status = 'ACTIVE'";
    const params = [];

    if (studentClass) {
      query += " AND class = ?";
      params.push(studentClass);
    }
    if (major) {
      query += " AND major = ?";
      params.push(major);
    }
    if (search) {
      query += " AND (full_name LIKE ? OR nis LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    const students = db.prepare(query).all(...params);
    res.json({ success: true, data: students });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/students/:id
router.get('/:id', authenticate, (req, res) => {
  try {
    const studentId = req.params.id;
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
    
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    // Access check: Only authorized roles or the student themselves
    if (!['TU', 'ADMIN', 'KEPALA_SEKOLAH', 'GURU'].includes(req.user.role) && req.user.id !== student.user_id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Decrypt sensitive fields
    student.nik = cryptoService.decryptField(student.encrypted_nik);
    student.address = cryptoService.decryptField(student.encrypted_address);
    student.phone = cryptoService.decryptField(student.encrypted_phone);

    delete student.encrypted_nik;
    delete student.encrypted_address;
    delete student.encrypted_phone;

    res.json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/students
router.post('/', authenticate, authorize('TU', 'ADMIN'), (req, res) => {
  try {
    const { nis, nisn, nama, full_name, tempatLahir, birth_place, tanggalLahir, birth_date, jenisKelamin, gender, kelas, studentClass, jurusan, major, tahunMasuk, enrollment_year, nik, alamat, address, noHp, phone, user_id } = req.body;
    const id = uuidv4();

    const finalFullName = nama || full_name || '';
    const finalBirthPlace = tempatLahir || birth_place || '';
    const finalBirthDate = tanggalLahir || birth_date || '';
    const finalGender = jenisKelamin || gender || 'L';
    const finalClass = kelas || studentClass || '';
    const finalMajor = jurusan || major || '';
    const finalYear = tahunMasuk || enrollment_year || new Date().getFullYear();
    const finalNik = nik || '';
    const finalAddress = alamat || address || '';
    const finalPhone = noHp || phone || '';

    const encryptedNik = cryptoService.encryptField(finalNik);
    const encryptedAddress = cryptoService.encryptField(finalAddress);
    const encryptedPhone = cryptoService.encryptField(finalPhone);

    db.prepare(`
      INSERT INTO students (id, nis, nisn, full_name, birth_place, birth_date, gender, class, major, enrollment_year, encrypted_nik, encrypted_address, encrypted_phone, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, nis, nisn, finalFullName, finalBirthPlace, finalBirthDate, finalGender, finalClass, finalMajor, finalYear, encryptedNik, encryptedAddress, encryptedPhone, user_id || null);

    logAudit(req.user.id, 'CREATE_STUDENT', 'students', id, req.ip, null, { nis, full_name: finalFullName });

    res.json({ success: true, data: { id, nis, full_name: finalFullName } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/students/:id
router.put('/:id', authenticate, authorize('TU', 'ADMIN'), (req, res) => {
  try {
    const id = req.params.id;
    const { nama, full_name, kelas, studentClass, jurusan, major } = req.body;
    
    const finalFullName = nama || full_name || '';
    const finalClass = kelas || studentClass || '';
    const finalMajor = jurusan || major || '';

    const oldData = db.prepare('SELECT full_name, class, major FROM students WHERE id = ?').get(id);

    db.prepare(`
      UPDATE students SET full_name = ?, class = ?, major = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(finalFullName, finalClass, finalMajor, id);

    logAudit(req.user.id, 'UPDATE_STUDENT', 'students', id, req.ip, oldData, { full_name: finalFullName, class: finalClass, major: finalMajor });

    res.json({ success: true, message: 'Student updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/students/:id
router.delete('/:id', authenticate, authorize('ADMIN'), (req, res) => {
  try {
    const id = req.params.id;
    db.prepare("UPDATE students SET status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
    logAudit(req.user.id, 'DELETE_STUDENT', 'students', id, req.ip);
    res.json({ success: true, message: 'Student deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
