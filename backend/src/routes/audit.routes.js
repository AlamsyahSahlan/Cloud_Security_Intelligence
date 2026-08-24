const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/audit/logs
router.get('/logs', authenticate, authorize('ADMIN', 'KEPALA_SEKOLAH'), (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const logs = db.prepare(`
      SELECT a.*, u.username, u.full_name 
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
    
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/audit/waf
router.get('/waf', authenticate, authorize('ADMIN'), (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const logs = db.prepare(`
      SELECT * FROM waf_logs
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
    
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/audit/waf/stats
router.get('/waf/stats', authenticate, authorize('ADMIN'), (req, res) => {
  try {
    const totalBlocked = db.prepare("SELECT count(*) as count FROM waf_logs WHERE blocked = 1").get().count;
    
    const byAttackType = db.prepare("SELECT attack_type, count(*) as count FROM waf_logs GROUP BY attack_type").all();
    
    const bySeverity = db.prepare("SELECT severity, count(*) as count FROM waf_logs GROUP BY severity").all();
    
    res.json({ 
      success: true, 
      data: {
        totalBlocked,
        byAttackType,
        bySeverity
      } 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/audit/activity
router.get('/activity', authenticate, authorize('ADMIN'), (req, res) => {
  try {
    const summary = db.prepare("SELECT action, count(*) as count FROM audit_logs GROUP BY action").all();
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
