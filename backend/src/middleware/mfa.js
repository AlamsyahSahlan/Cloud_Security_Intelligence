const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const db = require('../config/database');

const setupMFA = async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({ name: `SMKCloudSecurity(${req.user.username})` });
    
    db.prepare('UPDATE users SET mfa_secret = ? WHERE id = ?').run(secret.base32, req.user.id);

    const data_url = await qrcode.toDataURL(secret.otpauth_url);
    
    res.json({
      success: true,
      data: {
        secret: secret.base32,
        qrcode: data_url
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const verifyMFA = (req, res, next) => {
  try {
    // We expect user id to be available, either from auth middleware or from a pre-login check
    const userId = req.user ? req.user.id : req.body.userId;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID required for MFA' });
    }

    const user = db.prepare('SELECT mfa_secret, mfa_enabled FROM users WHERE id = ?').get(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.mfa_enabled === 1) {
      const token = req.body.mfaToken || req.headers['x-mfa-token'];
      if (!token) {
        return res.status(401).json({ success: false, error: 'MFA token required' });
      }

      const verified = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token: token,
        window: 1 // allows 30 seconds before or after
      });

      if (!verified) {
        return res.status(401).json({ success: false, error: 'Invalid MFA token' });
      }
    }
    
    next();
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const enableMFA = (req, res) => {
  try {
    // Require token to enable
    const token = req.body.mfaToken;
    const user = db.prepare('SELECT mfa_secret FROM users WHERE id = ?').get(req.user.id);
    
    const verified = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token: token
    });

    if (!verified) {
      return res.status(400).json({ success: false, error: 'Invalid token, cannot enable MFA' });
    }

    db.prepare('UPDATE users SET mfa_enabled = 1 WHERE id = ?').run(req.user.id);
    res.json({ success: true, message: 'MFA enabled successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const disableMFA = (req, res) => {
  try {
    const targetUserId = req.params.id; // Admin disabling for a user
    db.prepare('UPDATE users SET mfa_enabled = 0, mfa_secret = NULL WHERE id = ?').run(targetUserId);
    res.json({ success: true, message: 'MFA disabled successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  setupMFA,
  verifyMFA,
  enableMFA,
  disableMFA
};
