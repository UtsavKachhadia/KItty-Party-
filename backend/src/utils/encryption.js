import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * @param {string} plaintext - The text to encrypt.
 * @param {string} secretKey - A 32-byte hex string.
 * @returns {{ iv: string, encryptedData: string, authTag: string }}
 */
export function encrypt(plaintext, secretKey) {
  if (!plaintext) return null;
  if (!secretKey || Buffer.from(secretKey, 'hex').length !== 32) {
    throw new Error('Invalid secret key. Must be a 32-byte hex string.');
  }

  const keyBuffer = Buffer.from(secretKey, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    authTag: authTag.toString('hex')
  };
}

/**
 * Decrypts data using AES-256-GCM.
 * @param {{ iv: string, encryptedData: string, authTag: string }} encryptedObj 
 * @param {string} secretKey 
 * @returns {string} plaintext
 */
export function decrypt({ iv, encryptedData, authTag }, secretKey) {
  if (!iv || !encryptedData || !authTag) return null;
  if (!secretKey || Buffer.from(secretKey, 'hex').length !== 32) {
    throw new Error('Invalid secret key. Must be a 32-byte hex string.');
  }

  const keyBuffer = Buffer.from(secretKey, 'hex');
  const ivBuffer = Buffer.from(iv, 'hex');
  const authTagBuffer = Buffer.from(authTag, 'hex');

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, ivBuffer);
    decipher.setAuthTag(authTagBuffer);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed. Invalid authTag or tampered payload.');
  }
}
