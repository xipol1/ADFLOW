/**
 * AES-256-GCM encryption utility for credential storage.
 *
 * Encrypted values are stored as "iv:authTag:ciphertext" (hex-encoded).
 * Requires ENCRYPTION_KEY env var — exactly 32 characters (256 bits).
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV is standard for GCM
const AUTH_TAG_LENGTH = 16;
const SEPARATOR = ':';

// Lazy-loaded key buffer (validated on first use)
let _keyBuffer = null;

function getKey() {
  if (_keyBuffer) return _keyBuffer;

  const raw = process.env.ENCRYPTION_KEY || '';
  if (raw.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be exactly 32 characters (got ${raw.length}). ` +
      'Set it in your .env file.'
    );
  }
  _keyBuffer = Buffer.from(raw, 'utf8');
  return _keyBuffer;
}

/**
 * Encrypt a plaintext string.
 * @param {string} plaintext
 * @returns {string} "iv:authTag:ciphertext" hex format, or empty string if input is empty
 */
function encrypt(plaintext) {
  if (!plaintext) return '';

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');
  return [iv.toString('hex'), authTag, encrypted].join(SEPARATOR);
}

/**
 * Decrypt an encrypted string produced by encrypt().
 * @param {string} encryptedStr "iv:authTag:ciphertext" hex format
 * @returns {string} The original plaintext
 */
function decrypt(encryptedStr) {
  if (!encryptedStr) return '';

  // If it doesn't look encrypted, return as-is (backward compat)
  if (!isEncrypted(encryptedStr)) return encryptedStr;

  const key = getKey();
  const parts = encryptedStr.split(SEPARATOR);
  // Must have exactly 3 parts: iv, authTag, ciphertext
  if (parts.length !== 3) return encryptedStr;

  const [ivHex, authTagHex, ciphertext] = parts;

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Heuristic check: does this value look like our encrypted format?
 * Format: 24-char hex IV : 32-char hex authTag : hex ciphertext
 * @param {string} value
 * @returns {boolean}
 */
function isEncrypted(value) {
  if (!value || typeof value !== 'string') return false;
  const parts = value.split(SEPARATOR);
  if (parts.length !== 3) return false;

  const [iv, authTag, ciphertext] = parts;
  // IV = 12 bytes = 24 hex chars, authTag = 16 bytes = 32 hex chars
  if (iv.length !== IV_LENGTH * 2) return false;
  if (authTag.length !== AUTH_TAG_LENGTH * 2) return false;
  if (!ciphertext || ciphertext.length === 0) return false;
  // All parts must be valid hex
  return /^[0-9a-f]+$/i.test(iv + authTag + ciphertext);
}

/**
 * Encrypt a value only if it's not already encrypted.
 * Safe to call multiple times on the same value.
 * @param {string} value
 * @returns {string}
 */
function encryptIfNeeded(value) {
  if (!value || isEncrypted(value)) return value || '';
  return encrypt(value);
}

/**
 * Get decrypted credentials from a Canal document.
 * Returns a plain object with all credential fields decrypted.
 * @param {object} canal - Mongoose document or lean object
 * @returns {object} { botToken, accessToken, phoneNumberId, webhookUrl, refreshToken, pageAccessToken }
 */
function getDecryptedCreds(canal) {
  const creds = canal?.credenciales || {};
  return {
    botToken: decrypt(creds.botToken || ''),
    accessToken: decrypt(creds.accessToken || ''),
    phoneNumberId: decrypt(creds.phoneNumberId || ''),
    webhookUrl: creds.webhookUrl || '', // not encrypted (not sensitive)
    refreshToken: decrypt(creds.refreshToken || ''),
    pageAccessToken: decrypt(creds.pageAccessToken || ''),
  };
}

module.exports = {
  encrypt,
  decrypt,
  isEncrypted,
  encryptIfNeeded,
  getDecryptedCreds,
};
