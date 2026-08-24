// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CertificateRegistry
 * @dev Smart contract untuk manajemen sertifikat/ijazah SMK dengan blockchain.
 * Menyimpan hash dokumen secara immutable untuk verifikasi keaslian.
 * Menggunakan AccessControl untuk RBAC dan ReentrancyGuard untuk keamanan.
 */
contract CertificateRegistry is AccessControl, ReentrancyGuard {
    bytes32 public constant KEPALA_SEKOLAH_ROLE = keccak256("KEPALA_SEKOLAH_ROLE");
    bytes32 public constant TU_ROLE = keccak256("TU_ROLE");

    struct Certificate {
        string studentId;
        string certType;
        bytes32 documentHash;
        string metadata;
        address issuer;
        uint256 issuedAt;
        bool isRevoked;
        string revokeReason;
    }

    mapping(bytes32 => Certificate) public certificates;
    mapping(string => bytes32[]) public studentCertificates;
    
    uint256 public totalCertificates;
    bytes32[] public allCertificateHashes;

    event CertificateIssued(
        bytes32 indexed documentHash,
        string studentId,
        string certType,
        address issuer,
        uint256 timestamp
    );
    
    event CertificateRevoked(
        bytes32 indexed documentHash,
        string reason,
        address revokedBy,
        uint256 timestamp
    );
    
    event CertificateVerified(
        bytes32 indexed documentHash,
        bool isValid,
        address verifier,
        uint256 timestamp
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(KEPALA_SEKOLAH_ROLE, msg.sender);
        _grantRole(TU_ROLE, msg.sender);
    }

    /**
     * @dev Menerbitkan sertifikat baru. Hanya KEPALA_SEKOLAH atau ADMIN yang bisa.
     * @param studentId ID siswa
     * @param certType Tipe sertifikat (IJAZAH, TRANSKRIP, SERTIFIKAT_PKL, SERTIFIKAT_MAGANG)
     * @param documentHash Hash SHA-256 dari dokumen PDF
     * @param metadata JSON string berisi metadata tambahan
     */
    function issueCertificate(
        string memory studentId,
        string memory certType,
        bytes32 documentHash,
        string memory metadata
    ) external nonReentrant {
        require(
            hasRole(KEPALA_SEKOLAH_ROLE, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "CertificateRegistry: Must have KEPALA_SEKOLAH_ROLE or ADMIN_ROLE to issue"
        );
        require(certificates[documentHash].issuedAt == 0, "CertificateRegistry: Document hash already registered");
        require(bytes(studentId).length > 0, "CertificateRegistry: Student ID cannot be empty");
        require(bytes(certType).length > 0, "CertificateRegistry: Certificate type cannot be empty");

        certificates[documentHash] = Certificate({
            studentId: studentId,
            certType: certType,
            documentHash: documentHash,
            metadata: metadata,
            issuer: msg.sender,
            issuedAt: block.timestamp,
            isRevoked: false,
            revokeReason: ""
        });

        studentCertificates[studentId].push(documentHash);
        allCertificateHashes.push(documentHash);
        totalCertificates++;

        emit CertificateIssued(documentHash, studentId, certType, msg.sender, block.timestamp);
    }

    /**
     * @dev Verifikasi keaslian sertifikat berdasarkan hash dokumen.
     * Fungsi ini public — siapa saja bisa memverifikasi.
     */
    function verifyCertificate(bytes32 documentHash) external view returns (
        bool isValid,
        string memory studentId,
        string memory certType,
        uint256 issuedAt,
        address issuer,
        bool isRevoked
    ) {
        Certificate memory cert = certificates[documentHash];
        
        if (cert.issuedAt == 0) {
            return (false, "", "", 0, address(0), false);
        }

        isValid = !cert.isRevoked;
        
        return (
            isValid,
            cert.studentId,
            cert.certType,
            cert.issuedAt,
            cert.issuer,
            cert.isRevoked
        );
    }

    /**
     * @dev Mencabut sertifikat. Hanya ADMIN atau KEPALA_SEKOLAH.
     */
    function revokeCertificate(bytes32 documentHash, string memory reason) external nonReentrant {
        require(
            hasRole(KEPALA_SEKOLAH_ROLE, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "CertificateRegistry: Must have KEPALA_SEKOLAH_ROLE or ADMIN_ROLE to revoke"
        );
        require(certificates[documentHash].issuedAt != 0, "CertificateRegistry: Certificate does not exist");
        require(!certificates[documentHash].isRevoked, "CertificateRegistry: Certificate already revoked");

        certificates[documentHash].isRevoked = true;
        certificates[documentHash].revokeReason = reason;

        emit CertificateRevoked(documentHash, reason, msg.sender, block.timestamp);
    }

    /**
     * @dev Mengambil semua hash sertifikat milik seorang siswa.
     */
    function getCertificatesByStudent(string memory studentId) external view returns (bytes32[] memory) {
        return studentCertificates[studentId];
    }

    function getCertificateCount() external view returns (uint256) {
        return totalCertificates;
    }

    function getAllCertificateHashes() external view returns (bytes32[] memory) {
        return allCertificateHashes;
    }

    function grantKepalaSekolahRole(address account) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "CertificateRegistry: Must have ADMIN_ROLE to grant roles");
        grantRole(KEPALA_SEKOLAH_ROLE, account);
    }

    function grantTURole(address account) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "CertificateRegistry: Must have ADMIN_ROLE to grant roles");
        grantRole(TU_ROLE, account);
    }
}
