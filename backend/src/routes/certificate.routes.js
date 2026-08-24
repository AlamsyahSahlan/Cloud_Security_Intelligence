const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const cryptoService = require('../services/crypto.service');
const blockchainService = require('../services/blockchain.service');

const uploadDir = path.join(__dirname, '../../uploads/');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

const logAudit = (userId, action, targetTable, targetId, ip) => {
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, target_table, target_id, ip_address)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), userId, action, targetTable, targetId, ip);
};

// GET /api/certificates
router.get('/', authenticate, authorize('TU', 'ADMIN', 'KEPALA_SEKOLAH'), (req, res) => {
  try {
    const certs = db.prepare(`
      SELECT c.*, s.full_name as student_name, s.nis 
      FROM certificates c
      JOIN students s ON c.student_id = s.id
    `).all();
    res.json({ success: true, data: certs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/certificates/issue
router.post('/issue', authenticate, authorize('TU', 'ADMIN', 'KEPALA_SEKOLAH'), upload.single('pdf'), async (req, res) => {
  try {
    const { student_id, type } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'PDF file is required' });
    }

    const pdfHash = await cryptoService.hashFile(req.file.path);
    const id = uuidv4();
    const certNum = cryptoService.generateCertificateNumber(type, new Date().getFullYear(), Math.floor(Math.random() * 1000));
    
    db.prepare(`
      INSERT INTO certificates (id, student_id, type, certificate_number, pdf_hash, issued_by, issued_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(id, student_id, type, certNum, pdfHash, req.user.id);

    logAudit(req.user.id, 'ISSUE_CERTIFICATE', 'certificates', id, req.ip);
    
    // Cleanup temp file
    fs.unlinkSync(req.file.path);

    res.json({ success: true, data: { id, certificate_number: certNum, pdf_hash: pdfHash } });
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/certificates/:id/approve
router.post('/:id/approve', authenticate, authorize('KEPALA_SEKOLAH'), async (req, res) => {
  try {
    const id = req.params.id;
    const cert = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
    
    if (!cert) return res.status(404).json({ success: false, error: 'Certificate not found' });
    if (cert.status !== 'PENDING') return res.status(400).json({ success: false, error: 'Certificate is not pending' });

    const metadata = { certNum: cert.certificate_number, type: cert.type };
    const txHash = await blockchainService.issueCertificate(cert.student_id, cert.type, cert.pdf_hash, metadata);

    if (txHash) {
      db.prepare("UPDATE certificates SET status = 'ISSUED', blockchain_tx_hash = ? WHERE id = ?")
        .run(txHash, id);
      logAudit(req.user.id, 'APPROVE_CERTIFICATE', 'certificates', id, req.ip);
      res.json({ success: true, message: 'Certificate approved and minted on blockchain', txHash });
    } else {
      res.status(500).json({ success: false, error: 'Failed to mint on blockchain' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/certificates/:id/revoke
router.post('/:id/revoke', authenticate, authorize('ADMIN', 'KEPALA_SEKOLAH'), async (req, res) => {
  try {
    const id = req.params.id;
    const { reason } = req.body;
    
    const cert = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
    if (!cert) return res.status(404).json({ success: false, error: 'Certificate not found' });

    db.prepare("UPDATE certificates SET status = 'REVOKED', revoked_at = CURRENT_TIMESTAMP, revoked_reason = ? WHERE id = ?")
      .run(reason, id);

    if (cert.blockchain_tx_hash) {
      await blockchainService.revokeCertificate(cert.pdf_hash, reason);
    }

    logAudit(req.user.id, 'REVOKE_CERTIFICATE', 'certificates', id, req.ip);
    res.json({ success: true, message: 'Certificate revoked successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/certificates/verify (PUBLIC)
router.post('/verify', async (req, res) => {
  try {
    const { hash } = req.body;
    if (!hash) {
      return res.status(400).json({ success: false, error: 'Hash is required' });
    }

    // Check DB
    const dbCert = db.prepare('SELECT c.*, s.full_name as student_name FROM certificates c JOIN students s ON c.student_id = s.id WHERE c.pdf_hash = ?').get(hash);
    
    // Check Blockchain
    const bcCert = await blockchainService.verifyCertificate(hash);

    // If neither exists, 404
    if (!dbCert && (!bcCert || !bcCert.isValid)) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }

    // If revoked, 410
    if (dbCert && dbCert.status === 'REVOKED') {
      return res.status(410).json({ success: false, message: 'Sertifikat telah dicabut.', reason: dbCert.revoked_reason });
    }

    res.json({
      success: true,
      studentName: dbCert ? dbCert.student_name : (bcCert ? bcCert.studentId : 'Unknown'),
      type: dbCert ? dbCert.type : (bcCert ? bcCert.certType : 'Unknown'),
      issuer: 'SMK Negeri (Blockchain Verified)',
      txHash: dbCert ? dbCert.blockchain_tx_hash : null
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/certificates/:id
router.get('/:id', authenticate, (req, res) => {
  try {
    const cert = db.prepare('SELECT * FROM certificates WHERE id = ?').get(req.params.id);
    if (!cert) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: cert });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
