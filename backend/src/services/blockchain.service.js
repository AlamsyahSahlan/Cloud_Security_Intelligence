const { ethers } = require('ethers');

// Mock ABI in case file is not found
let CertificateRegistryABI = [
  "function issueCertificate(string studentId, string certType, bytes32 documentHash, string metadata)",
  "function verifyCertificate(bytes32 documentHash) view returns (bool isValid, string studentId, string certType, uint256 timestamp, address issuer, bool isRevoked)",
  "function getCertificatesByStudent(string studentId) view returns (bytes32[])",
  "function revokeCertificate(bytes32 documentHash, string reason)"
];

try {
  const artifact = require('../../../blockchain/artifacts/contracts/CertificateRegistry.sol/CertificateRegistry.json');
  if (artifact && artifact.abi) {
    CertificateRegistryABI = artifact.abi;
  }
} catch (error) {
  console.warn('CertificateRegistry ABI not found at expected path. Using default ABI.');
}

class BlockchainService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.contract = null;
    this.initialized = false;
  }

  init() {
    try {
      const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
      const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
      const contractAddress = process.env.CONTRACT_ADDRESS;

      if (!privateKey || !contractAddress) {
        console.warn('Blockchain credentials not fully provided in .env');
        return;
      }

      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      this.contract = new ethers.Contract(contractAddress, CertificateRegistryABI, this.wallet);
      this.initialized = true;
      console.log('Blockchain service initialized');
    } catch (err) {
      console.error('Failed to initialize blockchain service:', err);
    }
  }

  getContract() {
    if (!this.initialized) this.init();
    return this.contract;
  }

  async issueCertificate(studentId, certType, pdfHash, metadata) {
    try {
      const contract = this.getContract();
      if (!contract) return null;

      const hashBytes32 = pdfHash.startsWith('0x') ? pdfHash : '0x' + pdfHash;
      const tx = await contract.issueCertificate(studentId, certType, hashBytes32, JSON.stringify(metadata));
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('Blockchain issueCertificate error:', error);
      return null;
    }
  }

  async verifyCertificate(pdfHash) {
    try {
      const contract = this.getContract();
      if (!contract) return null;

      const hashBytes32 = pdfHash.startsWith('0x') ? pdfHash : '0x' + pdfHash;
      const result = await contract.verifyCertificate(hashBytes32);
      return {
        isValid: result.isValid,
        studentId: result.studentId,
        certType: result.certType,
        timestamp: Number(result.timestamp),
        issuer: result.issuer
      };
    } catch (error) {
      console.error('Blockchain verifyCertificate error:', error);
      return null;
    }
  }

  async getCertificateDetails(pdfHash) {
    try {
      const contract = this.getContract();
      if (!contract) return null;

      const hashBytes32 = pdfHash.startsWith('0x') ? pdfHash : '0x' + pdfHash;
      const result = await contract.getCertificateDetails(hashBytes32);
      return {
        studentId: result.studentId,
        certType: result.certType,
        metadata: result.metadata,
        timestamp: Number(result.timestamp),
        issuer: result.issuer,
        isRevoked: result.isRevoked
      };
    } catch (error) {
      console.error('Blockchain getCertificateDetails error:', error);
      return null;
    }
  }

  async revokeCertificate(pdfHash, reason) {
    try {
      const contract = this.getContract();
      if (!contract) return null;

      const hashBytes32 = pdfHash.startsWith('0x') ? pdfHash : '0x' + pdfHash;
      const tx = await contract.revokeCertificate(hashBytes32, reason);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('Blockchain revokeCertificate error:', error);
      return null;
    }
  }

  async logGradeChange(studentId, subjectId, oldScore, newScore, teacherId) {
    // Implement if GradeAuditLog contract is available
    // Mock implementation for now
    console.log(`Mock Blockchain Grade Log: \${studentId} \${subjectId} \${oldScore}->\${newScore} by \${teacherId}`);
    return "0xmocktxhash1234567890abcdef";
  }
}

module.exports = new BlockchainService();
