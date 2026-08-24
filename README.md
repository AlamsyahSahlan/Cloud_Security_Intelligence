<div align="center">

# Cloud Security Architecture

### Sistem Administrasi SMK dengan Keamanan Berlapis

[![Node.js](https://img.shields.io/badge/Node.js-v24.18.0-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v18.2.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Ethereum](https://img.shields.io/badge/Ethereum-Blockchain-3C3C3D?style=for-the-badge&logo=ethereum&logoColor=white)](https://ethereum.org/)
[![Solidity](https://img.shields.io/badge/Solidity-v0.8.19-363636?style=for-the-badge&logo=solidity&logoColor=white)](https://soliditylang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**Tugas Final Mata Kuliah Cloud Security Architecture**

Universitas Muhammadiyah Makassar - Program Studi Teknik Informatika

</div>

---

## Deskripsi Proyek

Sistem Administrasi SMK (Sekolah Menengah Kejuruan) berbasis web yang mengimplementasikan **empat pilar keamanan Cloud** secara terintegrasi:

| Pilar | Teknologi | Fungsi |
|-------|-----------|--------|
| **WAF** | Custom 5-Layer WAF | Mendeteksi & memblokir SQL Injection, XSS, Path Traversal, DDoS |
| **Zero Trust** | MFA (TOTP) + RBAC | Autentikasi berlapis & kontrol akses berbasis peran |
| **Enkripsi** | AES-256-CBC | Melindungi data PII (NIK, No HP, Alamat) di database |
| **Blockchain** | Ethereum Smart Contract | Menjamin keaslian & integritas ijazah digital |

---

## Arsitektur Sistem

```
+-----------------------------------------------------------+
|                    FRONTEND (React + Vite)                 |
|                   http://localhost:5173                     |
+-----------------------------------------------------------+
                          | API Proxy
                          v
  +------------------------------------------------------+
  |              WAF (5 Layers)                           |
  |  Layer 1: Rate Limiting (100 req/15min)               |
  |  Layer 2: SQL Injection Filter (Regex)                |
  |  Layer 3: XSS Filter (Pattern Matching)               |
  |  Layer 4: CSRF Protection (Token-based)               |
  |  Layer 5: Security Headers (Helmet.js)                |
  +------------------------------------------------------+
                          |
                          v
  +------------------------------------------------------+
  |           BACKEND (Express.js)                        |
  |           http://localhost:3001                        |
  |                                                        |
  |  +-----------+ +-----------+ +-------------+          |
  |  | JWT Auth  | | MFA/TOTP  | | RBAC 6 Role |          |
  |  +-----------+ +-----------+ +-------------+          |
  |  +-----------+ +-----------+ +-------------+          |
  |  | AES-256   | | SHA-256   | | Audit Trail |          |
  |  +-----------+ +-----------+ +-------------+          |
  +------------------------------------------------------+
           |                            |
           v                            v
  +--------------+          +--------------------+
  |   SQLite DB  |          | Ethereum Blockchain|
  |  (SQL.js)    |          |  (Hardhat Network) |
  |  smk_admin.db|          |  localhost:8545    |
  +--------------+          +--------------------+
```

---

## Screenshot Aplikasi

### Halaman Login
![Login](screenshots/login.png)

### Dashboard Utama
![Dashboard](screenshots/dashboard.png)

### WAF Dashboard - Monitoring Serangan Real-time
![WAF Dashboard](screenshots/waf-dashboard.png)

### Simulasi Serangan SQL Injection - Diblokir WAF
![SQL Injection Blocked](screenshots/waf-sqli-blocked.png)

### Simulasi Serangan XSS - Diblokir WAF
![XSS Blocked](screenshots/waf-xss-blocked.png)

### MFA Setup - QR Code & Google Authenticator
![MFA Setup](screenshots/mfa-setup.png)

### RBAC - Perbandingan Akses Admin vs Siswa
![RBAC](screenshots/rbac-comparison.png)

### Data Siswa - Enkripsi AES-256 pada Data Sensitif
![Encryption](screenshots/encryption-aes256.png)

### Sertifikat & Ijazah Digital - Blockchain Transaction
![Certificates](screenshots/certificates-blockchain.png)

### Portal Verifikasi Publik - Ijazah Terverifikasi
![Verification](screenshots/verification-portal.png)

### Audit Log - Pencatatan Aktivitas Sistem
![Audit Log](screenshots/audit-log.png)

---

## Fitur Keamanan

### 1. Web Application Firewall (WAF) - 5 Layer Protection

| Layer | Proteksi | Severity |
|-------|----------|----------|
| Rate Limiting | Membatasi 100 request/15 menit per IP | MEDIUM |
| SQL Injection Filter | Mendeteksi UNION SELECT, OR 1=1, DROP TABLE, dll. | CRITICAL |
| XSS Filter | Mendeteksi script tag, javascript:, onerror=, dll. | HIGH |
| Path Traversal | Mendeteksi ../, ..\ | CRITICAL |
| CSRF Protection | Token-based validation untuk POST/PUT/DELETE | HIGH |

### 2. Zero Trust Architecture

- **Multi-Factor Authentication (MFA)**: TOTP berbasis RFC 6238, kompatibel dengan Google Authenticator
- **Role-Based Access Control (RBAC)**: 6 tingkatan peran dengan prinsip Least Privilege

| Role | Data Siswa | Sertifikat | WAF/Audit |
|------|-----------|------------|-----------|
| ADMIN | Full Access | Terbitkan & Lihat | Full Access |
| KEPALA_SEKOLAH | Lihat | Approve | Lihat |
| GURU | Lihat | - | - |
| TU | Full Access | Terbitkan | - |
| SISWA | Data Sendiri | - | - |
| DUDI | - | Verifikasi | - |

### 3. Enkripsi AES-256-CBC

Data PII (Personally Identifiable Information) yang dienkripsi:
- Nomor Induk Kependudukan (NIK)
- Nomor Handphone
- Alamat Lengkap

### 4. Blockchain (Ethereum Smart Contract)

```solidity
// Smart Contract: CertificateRegistry.sol
function issueCertificate(
    string memory studentId,
    string memory certType,
    bytes32 pdfHash
) external onlyAuthorized { ... }

function verifyCertificate(
    bytes32 pdfHash
) external view returns (bool isValid, ...) { ... }
```

- Hash SHA-256 dari file PDF ijazah disimpan permanen di Blockchain
- Siapa saja dapat memverifikasi keaslian ijazah melalui Portal Verifikasi Publik
- Ijazah yang dimodifikasi otomatis terdeteksi sebagai tidak valid

---

## Cara Menjalankan

### Prasyarat

- [Node.js](https://nodejs.org/) v18+ (direkomendasikan v24)
- [Git](https://git-scm.com/)
- [Google Authenticator](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2) (untuk fitur MFA)

### Instalasi

```bash
# 1. Clone repository
git clone https://github.com/YOUR_USERNAME/cloud-security-architecture.git
cd cloud-security-architecture

# 2. Install dependencies
cd blockchain && npm install && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### Menjalankan Aplikasi (3 Terminal)

**Terminal 1 - Blockchain (Hardhat Network)**
```bash
cd blockchain
npx hardhat node
```

**Terminal 2 - Backend API Server**
```bash
cd backend
npm run seed    # Pertama kali saja: membuat data awal
npm run dev     # Jalankan server di port 3001
```

**Terminal 3 - Frontend React**
```bash
cd frontend
npm run dev     # Jalankan di port 5173
```

### Akses Aplikasi

Buka browser: **http://localhost:5173**

### Akun Default

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | Admin@123 |
| Kepala Sekolah | kepsek | Kepsek@123 |
| Guru | guru1 | Guru@123 |
| Tata Usaha | tu1 | TataUsaha@123 |
| Siswa | siswa1 | Siswa@123 |
| DUDI | dudi1 | Dudi@123 |

---

## Pengujian Keamanan

| No | Jenis Serangan | Hasil | Status |
|----|---------------|-------|--------|
| 1 | SQL Injection | HTTP 403 - Diblokir WAF | CRITICAL |
| 2 | XSS (Cross-Site Scripting) | HTTP 403 - Diblokir WAF | HIGH |
| 3 | Path Traversal | HTTP 403 - Diblokir WAF | CRITICAL |
| 4 | Brute Force Login | HTTP 429 - Rate Limited | MEDIUM |
| 5 | Ijazah Palsu (PDF diedit) | Verifikasi Gagal - Hash tidak cocok | BLOCKED |

---

## Struktur Proyek

```
cloud-security-architecture/
|-- blockchain/                # Smart Contract Ethereum
|   |-- contracts/
|   |   +-- CertificateRegistry.sol
|   |-- scripts/
|   |   +-- deploy.js
|   +-- hardhat.config.js
|
|-- backend/                   # API Server (Express.js)
|   |-- src/
|   |   |-- config/
|   |   |   |-- database.js           # SQLite (SQL.js) setup
|   |   |   +-- waf.config.js         # WAF pattern config
|   |   |-- middleware/
|   |   |   |-- waf.js                # 5-Layer WAF middleware
|   |   |   |-- auth.js               # JWT + RBAC middleware
|   |   |   +-- mfa.js                # TOTP MFA middleware
|   |   |-- routes/
|   |   |   |-- auth.routes.js
|   |   |   |-- student.routes.js
|   |   |   |-- certificate.routes.js
|   |   |   +-- audit.routes.js
|   |   |-- services/
|   |   |   |-- crypto.service.js      # AES-256 Encrypt/Decrypt
|   |   |   +-- blockchain.service.js  # Ethers.js integration
|   |   |-- seed.js
|   |   +-- index.js
|   +-- .env
|
|-- frontend/                  # React UI (Vite)
|   |-- src/
|   |   |-- pages/
|   |   |   |-- Login.jsx
|   |   |   |-- Dashboard.jsx
|   |   |   |-- WafDashboard.jsx
|   |   |   |-- Students.jsx
|   |   |   |-- Certificates.jsx
|   |   |   |-- MfaSetup.jsx
|   |   |   |-- AuditLog.jsx
|   |   |   +-- PublicVerify.jsx
|   |   |-- contexts/
|   |   |   +-- AuthContext.jsx
|   |   +-- utils/
|   |       +-- api.js
|   +-- vite.config.js
|
|-- screenshots/               # Screenshot aplikasi
+-- README.md
```

---

## Teknologi yang Digunakan

### Backend
| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| Node.js | v24.18.0 | Runtime JavaScript |
| Express.js | v4.18.2 | Framework web API |
| SQL.js | v1.11.0 | SQLite database (WebAssembly) |
| bcryptjs | v2.4.3 | Password hashing |
| jsonwebtoken | v9.0.2 | JWT authentication |
| speakeasy | v2.0.0 | TOTP/MFA generation |
| ethers.js | v6.9.0 | Ethereum Blockchain interaction |
| helmet | v7.1.0 | HTTP security headers |

### Frontend
| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| React | v18.2.0 | UI library |
| Vite | v5.4.21 | Build tool & dev server |
| Tailwind CSS | v3.4.0 | Utility-first CSS |
| Recharts | v2.x | Chart visualization |

### Blockchain
| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| Hardhat | v2.19.0 | Development framework |
| Solidity | v0.8.19 | Smart contract language |

---

## Informasi Penulis

| | |
|---|---|
| **Nama** | Alamsyah Sahlan |
| **NIM** | 105841111823 |
| **Program Studi** | Teknik Informatika |
| **Fakultas** | Teknik |
| **Universitas** | Universitas Muhammadiyah Makassar |
| **Mata Kuliah** | Cloud Security Architecture |
| **Tahun** | 2026 |

---

## Lisensi

Proyek ini dibuat untuk keperluan akademik sebagai Tugas Final mata kuliah Cloud Security Architecture.

---

<div align="center">

*Built by Alamsyah Sahlan - Universitas Muhammadiyah Makassar*

</div>
