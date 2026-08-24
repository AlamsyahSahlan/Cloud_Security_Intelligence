const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { hashPassword, comparePassword } = require('../middleware/encryption');
const { authenticate, authorize, generateToken } = require('../middleware/auth');
const { setupMFA, verifyMFA, enableMFA } = require('../middleware/mfa');
const { csrfTokens } = require('../middleware/waf');

// Helper for audit logs
const logAudit = (userId, action, targetTable, targetId, ip) => {
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, target_table, target_id, ip_address)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), userId, action, targetTable, targetId, ip);
};

router.post('/register', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { username, password, full_name, email, role } = req.body;
    
    // Check if user exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Username already exists' });
    }

    const hashedPassword = await hashPassword(password);
    const id = uuidv4();
    
    db.prepare(`
      INSERT INTO users (id, username, password, full_name, email, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, username, hashedPassword, full_name, email, role);

    logAudit(req.user.id, 'CREATE_USER', 'users', id, req.ip);

    res.json({ success: true, data: { id, username, full_name, role } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password, mfaToken } = req.body;
    
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || user.is_active === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // MFA Verification if enabled
    if (user.mfa_enabled === 1) {
      if (!mfaToken) {
        return res.status(403).json({ success: false, error: 'MFA_REQUIRED', userId: user.id });
      }
      
      const speakeasy = require('speakeasy');
      const verified = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token: mfaToken,
        window: 1
      });

      if (!verified) {
        return res.status(401).json({ success: false, error: 'Invalid MFA token' });
      }
    }

    const token = generateToken(user);
    logAudit(user.id, 'LOGIN', 'users', user.id, req.ip);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          role: user.role
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/mfa/setup', authenticate, setupMFA);
router.post('/mfa/verify', verifyMFA, (req, res) => {
  res.json({ success: true, message: 'Token is valid' });
});
router.post('/mfa/enable', authenticate, enableMFA);

router.get('/profile', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, username, full_name, email, role, mfa_enabled FROM users WHERE id = ?').get(req.user.id);
  res.json({ success: true, data: user });
});

router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
    
    const isMatch = await comparePassword(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid old password' });
    }

    const hashedPassword = await hashPassword(newPassword);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.user.id);
    logAudit(req.user.id, 'CHANGE_PASSWORD', 'users', req.user.id, req.ip);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/csrf-token', (req, res) => {
  const sessionId = req.headers['x-session-id'] || uuidv4();
  const token = crypto.randomBytes(32).toString('hex');
  csrfTokens.set(sessionId, token);
  
  res.json({
    success: true,
    data: {
      csrfToken: token,
      sessionId: sessionId
    }
  });
});

module.exports = router;
