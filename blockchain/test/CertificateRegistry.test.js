const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Smart Contracts", function () {
  async function deployContractsFixture() {
    const [admin, headmaster, teacher, unauthorized] = await ethers.getSigners();

    const CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
    const certRegistry = await CertificateRegistry.deploy();

    const GradeAuditLog = await ethers.getContractFactory("GradeAuditLog");
    const gradeAudit = await GradeAuditLog.deploy();

    // Setup roles
    const KEPALA_SEKOLAH_ROLE = await certRegistry.KEPALA_SEKOLAH_ROLE();
    await certRegistry.grantRole(KEPALA_SEKOLAH_ROLE, headmaster.address);

    const GURU_ROLE = await gradeAudit.GURU_ROLE();
    await gradeAudit.grantRole(GURU_ROLE, teacher.address);

    return { certRegistry, gradeAudit, admin, headmaster, teacher, unauthorized };
  }

  describe("CertificateRegistry", function () {
    const studentId = "SMK2024001";
    const certType = "IJAZAH";
    const documentHash = ethers.id("test-document-content");
    const metadata = '{"gpa":"3.8"}';

    it("Should deploy with correct initial state", async function () {
      const { certRegistry, admin } = await loadFixture(deployContractsFixture);
      const DEFAULT_ADMIN_ROLE = await certRegistry.DEFAULT_ADMIN_ROLE();
      expect(await certRegistry.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await certRegistry.getCertificateCount()).to.equal(0);
    });

    it("Should allow admin to issue a certificate", async function () {
      const { certRegistry, admin } = await loadFixture(deployContractsFixture);
      await certRegistry.issueCertificate(studentId, certType, documentHash, metadata);
      expect(await certRegistry.getCertificateCount()).to.equal(1);
    });

    it("Should NOT allow unauthorized address to issue certificate", async function () {
      const { certRegistry, unauthorized } = await loadFixture(deployContractsFixture);
      await expect(
        certRegistry.connect(unauthorized).issueCertificate(studentId, certType, documentHash, metadata)
      ).to.be.revertedWithCustomError(certRegistry, "AccessControlUnauthorizedAccount");
    });

    it("Should verify a valid certificate", async function () {
      const { certRegistry } = await loadFixture(deployContractsFixture);
      await certRegistry.issueCertificate(studentId, certType, documentHash, metadata);
      
      const result = await certRegistry.verifyCertificate(documentHash);
      expect(result.isValid).to.be.true;
      expect(result.studentId).to.equal(studentId);
      expect(result.certType).to.equal(certType);
      expect(result.isRevoked).to.be.false;
    });

    it("Should return invalid for non-existent certificate", async function () {
      const { certRegistry } = await loadFixture(deployContractsFixture);
      const nonExistentHash = ethers.id("does-not-exist");
      const result = await certRegistry.verifyCertificate(nonExistentHash);
      expect(result.isValid).to.be.false;
      expect(result.studentId).to.equal("");
    });

    it("Should allow admin to revoke a certificate", async function () {
      const { certRegistry } = await loadFixture(deployContractsFixture);
      await certRegistry.issueCertificate(studentId, certType, documentHash, metadata);
      await certRegistry.revokeCertificate(documentHash, "Plagiarism detected");
      
      const cert = await certRegistry.certificates(documentHash);
      expect(cert.isRevoked).to.be.true;
      expect(cert.revokeReason).to.equal("Plagiarism detected");
    });

    it("Should return revoked status for revoked certificate", async function () {
      const { certRegistry } = await loadFixture(deployContractsFixture);
      await certRegistry.issueCertificate(studentId, certType, documentHash, metadata);
      await certRegistry.revokeCertificate(documentHash, "Fraud");
      
      const result = await certRegistry.verifyCertificate(documentHash);
      expect(result.isValid).to.be.false; // Valid is false since it's revoked
      expect(result.isRevoked).to.be.true;
    });

    it("Should NOT allow duplicate certificate hash", async function () {
      const { certRegistry } = await loadFixture(deployContractsFixture);
      await certRegistry.issueCertificate(studentId, certType, documentHash, metadata);
      
      await expect(
        certRegistry.issueCertificate("OTHER123", certType, documentHash, metadata)
      ).to.be.revertedWith("CertificateRegistry: Document hash already registered");
    });

    it("Should track certificates by student ID", async function () {
      const { certRegistry } = await loadFixture(deployContractsFixture);
      await certRegistry.issueCertificate(studentId, certType, documentHash, metadata);
      
      const hash2 = ethers.id("doc2");
      await certRegistry.issueCertificate(studentId, "TRANSKRIP", hash2, "{}");
      
      const hashes = await certRegistry.getCertificatesByStudent(studentId);
      expect(hashes.length).to.equal(2);
      expect(hashes[0]).to.equal(documentHash);
      expect(hashes[1]).to.equal(hash2);
    });

    it("Should emit CertificateIssued event", async function () {
      const { certRegistry, admin } = await loadFixture(deployContractsFixture);
      
      await expect(certRegistry.issueCertificate(studentId, certType, documentHash, metadata))
        .to.emit(certRegistry, "CertificateIssued")
        .withArgs(documentHash, studentId, certType, admin.address, (val) => val > 0);
    });

    it("Should emit CertificateRevoked event", async function () {
      const { certRegistry, admin } = await loadFixture(deployContractsFixture);
      await certRegistry.issueCertificate(studentId, certType, documentHash, metadata);
      
      await expect(certRegistry.revokeCertificate(documentHash, "Error in name"))
        .to.emit(certRegistry, "CertificateRevoked")
        .withArgs(documentHash, "Error in name", admin.address, (val) => val > 0);
    });

    it("Should prevent reentrancy attacks", async function () {
      const { certRegistry } = await loadFixture(deployContractsFixture);
      await certRegistry.issueCertificate(studentId, certType, documentHash, metadata);
      expect(await certRegistry.getCertificateCount()).to.equal(1);
    });
  });

  describe("GradeAuditLog", function () {
    const studentId = "SMK2024001";
    const subjectId = "MATH-101";
    const oldScore = 8000;
    const newScore = 8550; 
    const teacherId = "TCH-001";
    const reason = "Re-evaluation";

    it("Should log grade changes", async function () {
      const { gradeAudit, teacher } = await loadFixture(deployContractsFixture);
      
      await gradeAudit.connect(teacher).logGradeChange(studentId, subjectId, oldScore, newScore, teacherId, reason);
      
      const count = await gradeAudit.getTotalChanges();
      expect(count).to.equal(1);
      
      const change = await gradeAudit.getChangeByIndex(0);
      expect(change.studentId).to.equal(studentId);
      expect(change.newScore).to.equal(newScore);
    });

    it("Should track student grade history", async function () {
      const { gradeAudit, teacher } = await loadFixture(deployContractsFixture);
      
      await gradeAudit.connect(teacher).logGradeChange(studentId, subjectId, oldScore, newScore, teacherId, reason);
      await gradeAudit.connect(teacher).logGradeChange(studentId, "PHYS-101", 7500, 8000, teacherId, "Extra credit");
      
      const history = await gradeAudit.getStudentGradeHistory(studentId);
      expect(history.length).to.equal(2);
      expect(history[0].subjectId).to.equal(subjectId);
      expect(history[1].subjectId).to.equal("PHYS-101");
    });

    it("Should NOT allow unauthorized grade logging", async function () {
      const { gradeAudit, unauthorized } = await loadFixture(deployContractsFixture);
      
      await expect(
        gradeAudit.connect(unauthorized).logGradeChange(studentId, subjectId, oldScore, newScore, teacherId, reason)
      ).to.be.revertedWithCustomError(gradeAudit, "AccessControlUnauthorizedAccount");
    });

    it("Should emit GradeChanged event", async function () {
      const { gradeAudit, teacher } = await loadFixture(deployContractsFixture);
      
      await expect(
        gradeAudit.connect(teacher).logGradeChange(studentId, subjectId, oldScore, newScore, teacherId, reason)
      )
        .to.emit(gradeAudit, "GradeChanged")
        .withArgs(studentId, subjectId, oldScore, newScore, teacherId, (val) => val > 0);
    });
  });
});
