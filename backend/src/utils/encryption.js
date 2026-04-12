import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes is the recommended IV size for AES-256-GCM

/**
 * Resolves the encryption key from the provided argument or environment.
 * @param {string} [explicitKey] - Optional explicit key (64-char hex string).
 * @returns {Buffer} 32-byte key buffer
 * @throws {Error} if no valid key is available
 */
function resolveKey(explicitKey) {
  const raw = explicitKey
    || process.env.CREDENTIAL_SECRET
    || process.env.CREDENTIAL_ENCRYPTION_KEY;

  if (!raw) {
    throw new Error(
      'Encryption key not available. Set CREDENTIAL_SECRET in .env ' +
      '(64-character hex string = 32 bytes). Generate with: ' +
      'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  const keyBuffer = Buffer.from(raw, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error(
      `Invalid encryption key length: expected 32 bytes (64 hex chars), got ${keyBuffer.length} bytes.`
    );
  }
  return keyBuffer;
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * @param {string} plaintext - The text to encrypt.
 * @param {string} [secretKey] - Optional 64-char hex key. Falls back to env CREDENTIAL_SECRET.
 * @returns {{ iv: string, encryptedData: string, authTag: string }} All values as hex strings.
 */
export function encrypt(plaintext, secretKey) {
  if (!plaintext) return null;

  const keyBuffer = resolveKey(secretKey);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    authTag: authTag.toString('hex'),
  };
}

/**
 * Decrypts data using AES-256-GCM.
 *
 * @param {{ iv: string, encryptedData: string, authTag: string }} encryptedObj
 * @param {string} [secretKey] - Optional 64-char hex key. Falls back to env CREDENTIAL_SECRET.
 * @returns {string} The decrypted plaintext string.
 */
export function decrypt({ iv, encryptedData, authTag }, secretKey) {
  if (!iv || !encryptedData || !authTag) return null;

  const keyBuffer = resolveKey(secretKey);
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

/**
 * Self-test: encrypts and decrypts a known string, throws if round-trip fails.
 * IMPORTANT: Uses a temporary random key — never logs plaintext or key material.
 */
export function testEncryption() {
  const testKey = crypto.randomBytes(32).toString('hex');
  const testPlaintext = 'kitty-party-encryption-self-test';

  const encrypted = encrypt(testPlaintext, testKey);
  if (!encrypted || !encrypted.iv || !encrypted.encryptedData || !encrypted.authTag) {
    throw new Error('testEncryption FAILED: encrypt() returned invalid output');
  }

  const decrypted = decrypt(encrypted, testKey);
  if (decrypted !== testPlaintext) {
    throw new Error('testEncryption FAILED: round-trip mismatch');
  }

  // Verify tamper detection
  const tampered = { ...encrypted, authTag: crypto.randomBytes(16).toString('hex') };
  let tamperedCaught = false;
  try {
    decrypt(tampered, testKey);
  } catch {
    tamperedCaught = true;
  }
  if (!tamperedCaught) {
    throw new Error('testEncryption FAILED: tampered payload was not detected');
  }

  return true; // All checks passed — no sensitive data logged
}
