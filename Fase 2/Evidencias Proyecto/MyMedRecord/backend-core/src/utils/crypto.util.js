const crypto = require('crypto');
const config = require('../config/env');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes recommended for GCM
const TAG_LENGTH = 16;

/**
 * Encripta un texto usando AES-256-GCM.
 * @param {string} text - Texto plano a encriptar
 * @returns {string} Formato IV:AUTH_TAG:ENCRYPTED_TEXT (en hex)
 */
function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(config.SECURITY.AES_KEY, 'utf-8').subarray(0, 32),
    iv
  );

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Desencripta un texto previamente encriptado con AES-256-GCM.
 * @param {string} cipherText - Formato IV:AUTH_TAG:ENCRYPTED_TEXT
 * @returns {string} Texto desencriptado
 */
function decrypt(cipherText) {
  if (!cipherText || !cipherText.includes(':')) return cipherText;
  
  const [ivHex, tagHex, encryptedText] = cipherText.split(':');
  if (!ivHex || !tagHex || !encryptedText) return cipherText;

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(config.SECURITY.AES_KEY, 'utf-8').subarray(0, 32),
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = {
  encrypt,
  decrypt,
};
