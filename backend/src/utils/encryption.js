import crypto from 'crypto';
import env from '../../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const KEY_LEN = 32;

/**
 * Derives a 32-byte key using PBKDF2 with the provided salt and the master
 * CREDENTIAL_ENCRYPTION_KEY from environment variables.
 */
function getKey(salt) {
  if (!env.CREDENTIAL_ENCRYPTION_KEY) {
    throw new Error('Missing CREDENTIAL_ENCRYPTION_KEY in env variables');
  }
  return crypto.pbkdf2Sync(env.CREDENTIAL_ENCRYPTION_KEY, salt, 100000, KEY_LEN, 'sha512');
}

/**
 * Encrypts a string symmetrically using AES-256-GCM.
 * Format returned: <salt:hex>:<iv:hex>:<authTag:hex>:<encrypted:hex>
 */
export function encrypt(text) {
  if (!text) throw new Error('Cannot encrypt empty value');

  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKey(salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a ciphertext produced by the above encrypt function.
 */
export function decrypt(encData) {
  if (!encData) throw new Error('Cannot decrypt empty value');

  const parts = encData.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid ciphertext format');
  }

  const salt = Buffer.from(parts[0], 'hex');
  const iv = Buffer.from(parts[1], 'hex');
  const authTag = Buffer.from(parts[2], 'hex');
  const encryptedText = parts[3];

  const key = getKey(salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Masks a token for safe display/logging: ****<last4>
 * Never log raw tokens.
 */
export function maskToken(token) {
  if (!token || token.length < 4) return '****';
  return `****${token.slice(-4)}`;
}

/**
 * Resolve and decrypt credentials for a given user + service.
 * Returns the parsed credential object (from the Token collection),
 * or throws if not found.
 * Caller is responsible for nulling the result after use.
 */
export async function resolveCredentials(userId, service) {
  const { getUserTokens } = await import('../services/credentialService.js');
  const tokens = await getUserTokens(userId);

  if (!tokens) {
    throw new Error(`No credentials found for user ${userId}`);
  }

  // Map connector names to the credential shape each connector expects
  switch (service) {
    case 'github': {
      const token = tokens.github;
      if (!token) throw new Error(`User has no github integration connected`);
      return { token };
    }
    case 'slack': {
      const token = tokens.slack;
      if (!token) throw new Error(`User has no slack integration connected`);
      return { token };
    }
    case 'jira': {
      const key = tokens.jira?.key;
      const domain = tokens.jira?.domain;
      if (!key || !domain) throw new Error(`User has no jira integration connected`);
      return { key, domain };
    }
    default:
      throw new Error(`Unknown service: ${service}`);
  }
}
