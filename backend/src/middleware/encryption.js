const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const getKeys = () => {
  // Require these at runtime to ensure dotenv is loaded
  const key = Buffer.from(process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef', 'utf-8');
  const iv = Buffer.from(process.env.ENCRYPTION_IV || 'abcdef0123456789', 'utf-8');
  return { key, iv };
};

const encrypt = (text) => {
  if (!text) return text;
  try {
    const { key, iv } = getKeys();
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  } catch (err) {
    console.error('Encryption error:', err);
    return null;
  }
};

const decrypt = (encryptedText) => {
  if (!encryptedText) return encryptedText;
  try {
    const { key, iv } = getKeys();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption error:', err);
    return null;
  }
};

const hashDocument = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

module.exports = {
  encrypt,
  decrypt,
  hashDocument,
  hashPassword,
  comparePassword
};
