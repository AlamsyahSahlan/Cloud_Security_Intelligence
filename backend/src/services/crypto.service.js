const fs = require('fs');
const crypto = require('crypto');
const { encrypt, decrypt, hashDocument } = require('../middleware/encryption');

class CryptoService {
  hashFile(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', (data) => {
        hash.update(data);
      });
      
      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });
      
      stream.on('error', (err) => {
        reject(err);
      });
    });
  }

  hashBuffer(buffer) {
    return hashDocument(buffer);
  }

  encryptField(plaintext) {
    return encrypt(plaintext);
  }

  decryptField(ciphertext) {
    return decrypt(ciphertext);
  }

  generateCertificateNumber(type, year, sequence) {
    let prefix = 'IJZ';
    if (type === 'TRANSKRIP') prefix = 'TRK';
    else if (type === 'SERTIFIKAT_PKL') prefix = 'PKL';
    else if (type === 'SERTIFIKAT_MAGANG') prefix = 'MAG';

    const paddedSeq = String(sequence).padStart(5, '0');
    return `${prefix}-${year}-${paddedSeq}`;
  }
}

module.exports = new CryptoService();
