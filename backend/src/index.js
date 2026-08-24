require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/database');
const { createWafMiddleware } = require('./middleware/waf');

const authRoutes = require('./routes/auth.routes');
const studentRoutes = require('./routes/student.routes');
const gradeRoutes = require('./routes/grade.routes');
const certificateRoutes = require('./routes/certificate.routes');
const auditRoutes = require('./routes/audit.routes');

const PORT = process.env.PORT || 3001;

async function startServer() {
  // ✅ Inisialisasi database terlebih dahulu (wajib sebelum server menerima request)
  await db.initialize();

  const app = express();

  // Trust proxy for rate limiting to work behind reverse proxies
  app.set('trust proxy', 1);

  // JSON Body Parser with size limit (Important for WAF)
  app.use(express.json({ limit: require('./config/waf.config').maxBodySize }));
  app.use(express.urlencoded({ extended: true, limit: require('./config/waf.config').maxBodySize }));

  // Basic CORS
  app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
  }));

  // Apply Comprehensive WAF Middleware Stack
  const wafStack = createWafMiddleware();
  wafStack.forEach(middleware => {
    app.use(middleware);
  });

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/students', studentRoutes);
  app.use('/api/grades', gradeRoutes);
  app.use('/api/certificates', certificateRoutes);
  app.use('/api/audit', auditRoutes);

  // Base route
  app.get('/api', (req, res) => {
    res.json({ 
      message: 'SMK Cloud Security API', 
      version: '1.0.0',
      security_features_enabled: ['WAF', 'RateLimiting', 'SQLi_Protection', 'XSS_Protection', 'Path_Traversal_Protection', 'CSRF_Protection', 'MFA', 'Data_Encryption']
    });
  });

  // Global Error Handler
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error'
    });
  });

  app.listen(PORT, () => {
    console.log(`\n==========================================================`);
    console.log(`🚀 SMK Cloud Security API Server running on port ${PORT}`);
    console.log(`🛡️  Web Application Firewall (WAF) Enabled`);
    console.log(`🔒 Data Encryption & Validation Active`);
    console.log(`⛓️  Blockchain Integration Ready`);
    console.log(`==========================================================\n`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
