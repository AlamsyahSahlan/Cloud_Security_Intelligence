const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../smk_admin.db');

/**
 * Wrapper class yang memberikan API yang kompatibel dengan better-sqlite3
 * agar semua file route tidak perlu diubah.
 * 
 * API yang didukung:
 *   db.prepare(sql).get(...params)   -> ambil 1 baris
 *   db.prepare(sql).all(...params)   -> ambil semua baris
 *   db.prepare(sql).run(...params)   -> jalankan INSERT/UPDATE/DELETE
 *   db.exec(sql)                     -> jalankan multi-statement SQL
 */
class DatabaseWrapper {
  constructor(sqlDb, filePath) {
    this._db = sqlDb;
    this._filePath = filePath;
    this._initialized = true;
  }

  _save() {
    try {
      const data = this._db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this._filePath, buffer);
    } catch (err) {
      console.error('Database save error:', err.message);
    }
  }

  exec(sql) {
    this._db.run(sql);
    this._save();
  }

  prepare(sql) {
    const self = this;
    return {
      get(...params) {
        let stmt;
        try {
          stmt = self._db.prepare(sql);
          if (params.length > 0) {
            stmt.bind(params);
          }
          if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
          }
          stmt.free();
          return undefined;
        } catch (err) {
          if (stmt) { try { stmt.free(); } catch(e) {} }
          throw err;
        }
      },

      all(...params) {
        let stmt;
        try {
          const results = [];
          stmt = self._db.prepare(sql);
          if (params.length > 0) {
            stmt.bind(params);
          }
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return results;
        } catch (err) {
          if (stmt) { try { stmt.free(); } catch(e) {} }
          throw err;
        }
      },

      run(...params) {
        self._db.run(sql, params);
        self._save();
        return { changes: self._db.getRowsModified() };
      }
    };
  }
}

// Objek proxy sementara sebelum database ter-inisialisasi
// Route files yang melakukan require('./config/database') akan mendapat objek ini
// Setelah initialize() dipanggil, semua method akan berfungsi
let _wrapper = null;

const dbProxy = {
  prepare(sql) {
    if (!_wrapper) throw new Error('Database belum diinisialisasi! Panggil initialize() terlebih dahulu.');
    return _wrapper.prepare(sql);
  },
  exec(sql) {
    if (!_wrapper) throw new Error('Database belum diinisialisasi! Panggil initialize() terlebih dahulu.');
    return _wrapper.exec(sql);
  },

  async initialize() {
    console.log('📦 Initializing SQL.js database...');
    const SQL = await initSqlJs();
    
    let sqlDb;
    if (fs.existsSync(dbPath)) {
      console.log('📂 Loading existing database from', dbPath);
      const buffer = fs.readFileSync(dbPath);
      sqlDb = new SQL.Database(buffer);
    } else {
      console.log('🆕 Creating new database at', dbPath);
      sqlDb = new SQL.Database();
    }

    _wrapper = new DatabaseWrapper(sqlDb, dbPath);

    // Create tables
    _wrapper._db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        full_name TEXT,
        email TEXT,
        role TEXT CHECK(role IN ('ADMIN','KEPALA_SEKOLAH','GURU','TU','SISWA','DUDI')),
        mfa_secret TEXT,
        mfa_enabled INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT
      )
    `);

    _wrapper._db.run(`
      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        nis TEXT UNIQUE,
        nisn TEXT,
        full_name TEXT,
        birth_place TEXT,
        birth_date TEXT,
        gender TEXT,
        class TEXT,
        major TEXT,
        enrollment_year INTEGER,
        encrypted_nik TEXT,
        encrypted_address TEXT,
        encrypted_phone TEXT,
        user_id TEXT,
        status TEXT DEFAULT 'ACTIVE',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);

    _wrapper._db.run(`
      CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE,
        name TEXT,
        major TEXT,
        semester INTEGER
      )
    `);

    _wrapper._db.run(`
      CREATE TABLE IF NOT EXISTS grades (
        id TEXT PRIMARY KEY,
        student_id TEXT,
        subject_id TEXT,
        semester INTEGER,
        score REAL,
        grade_letter TEXT,
        teacher_id TEXT,
        blockchain_tx_hash TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT,
        FOREIGN KEY(student_id) REFERENCES students(id),
        FOREIGN KEY(subject_id) REFERENCES subjects(id),
        FOREIGN KEY(teacher_id) REFERENCES users(id)
      )
    `);

    _wrapper._db.run(`
      CREATE TABLE IF NOT EXISTS certificates (
        id TEXT PRIMARY KEY,
        student_id TEXT,
        type TEXT CHECK(type IN ('IJAZAH','TRANSKRIP','SERTIFIKAT_PKL','SERTIFIKAT_MAGANG')),
        certificate_number TEXT UNIQUE,
        pdf_hash TEXT,
        blockchain_tx_hash TEXT,
        issued_by TEXT,
        issued_at TEXT,
        status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING','ISSUED','VERIFIED','REVOKED')),
        metadata TEXT,
        revoked_at TEXT,
        revoked_reason TEXT,
        FOREIGN KEY(student_id) REFERENCES students(id),
        FOREIGN KEY(issued_by) REFERENCES users(id)
      )
    `);

    _wrapper._db.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT,
        target_table TEXT,
        target_id TEXT,
        old_value TEXT,
        new_value TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    _wrapper._db.run(`
      CREATE TABLE IF NOT EXISTS waf_logs (
        id TEXT PRIMARY KEY,
        ip_address TEXT,
        method TEXT,
        path TEXT,
        attack_type TEXT,
        payload TEXT,
        blocked INTEGER DEFAULT 1,
        severity TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    _wrapper._save();
    console.log('✅ Database initialized successfully with all tables.');
    return dbProxy;
  }
};

module.exports = dbProxy;
