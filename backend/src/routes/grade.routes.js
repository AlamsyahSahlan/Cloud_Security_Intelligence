const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const blockchainService = require('../services/blockchain.service');

const logAudit = (userId, action, targetTable, targetId, ip, oldValue = null, newValue = null) => {
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, target_table, target_id, old_value, new_value, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), userId, action, targetTable, targetId, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null, ip);
};

// GET /api/grades
router.get('/', authenticate, authorize('GURU', 'TU', 'ADMIN', 'KEPALA_SEKOLAH'), (req, res) => {
  try {
    const { studentId, subjectId, semester } = req.query;
    let query = "SELECT * FROM grades WHERE 1=1";
    const params = [];

    if (studentId) { query += " AND student_id = ?"; params.push(studentId); }
    if (subjectId) { query += " AND subject_id = ?"; params.push(subjectId); }
    if (semester) { query += " AND semester = ?"; params.push(semester); }

    const grades = db.prepare(query).all(...params);
    res.json({ success: true, data: grades });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/grades/student/:studentId
router.get('/student/:studentId', authenticate, (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Students can only see their own grades
    if (req.user.role === 'SISWA') {
      const student = db.prepare('SELECT user_id FROM students WHERE id = ?').get(studentId);
      if (!student || student.user_id !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    const grades = db.prepare(`
      SELECT g.*, s.name as subject_name, s.code as subject_code 
      FROM grades g
      JOIN subjects s ON g.subject_id = s.id
      WHERE g.student_id = ?
    `).all(studentId);

    res.json({ success: true, data: grades });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/grades
router.post('/', authenticate, authorize('GURU'), (req, res) => {
  try {
    const { student_id, subject_id, semester, score, grade_letter } = req.body;
    const id = uuidv4();

    db.prepare(`
      INSERT INTO grades (id, student_id, subject_id, semester, score, grade_letter, teacher_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, student_id, subject_id, semester, score, grade_letter, req.user.id);

    logAudit(req.user.id, 'CREATE_GRADE', 'grades', id, req.ip, null, { score, grade_letter });

    res.json({ success: true, data: { id } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/grades/:id
router.put('/:id', authenticate, authorize('GURU'), async (req, res) => {
  try {
    const id = req.params.id;
    const { score, grade_letter } = req.body;
    
    const oldGrade = db.prepare('SELECT score, grade_letter, teacher_id, student_id, subject_id FROM grades WHERE id = ?').get(id);
    if (!oldGrade) return res.status(404).json({ success: false, error: 'Grade not found' });
    
    if (oldGrade.teacher_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Can only update own grades' });
    }

    db.prepare('UPDATE grades SET score = ?, grade_letter = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(score, grade_letter, id);

    logAudit(req.user.id, 'UPDATE_GRADE', 'grades', id, req.ip, 
      { score: oldGrade.score, grade_letter: oldGrade.grade_letter }, 
      { score, grade_letter }
    );

    // Optionally log to blockchain
    const txHash = await blockchainService.logGradeChange(oldGrade.student_id, oldGrade.subject_id, oldGrade.score, score, req.user.id);
    if (txHash) {
      db.prepare('UPDATE grades SET blockchain_tx_hash = ? WHERE id = ?').run(txHash, id);
    }

    res.json({ success: true, message: 'Grade updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/grades/report/:studentId
router.get('/report/:studentId', authenticate, (req, res) => {
  try {
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.studentId);
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

    const grades = db.prepare(`
      SELECT g.*, s.name as subject_name 
      FROM grades g
      JOIN subjects s ON g.subject_id = s.id
      WHERE g.student_id = ?
    `).all(req.params.studentId);

    const report = {
      student_name: student.full_name,
      nis: student.nis,
      class: student.class,
      grades: grades
    };

    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
