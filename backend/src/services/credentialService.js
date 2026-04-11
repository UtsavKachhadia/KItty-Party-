import crypto from 'crypto';
import env from '../../config/env.js';
import Token from '../models/Token.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
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
 * Encrypts a string symmetrically.
 * Format returned: <salt:hex>:<iv:hex>:<authTag:hex>:<encrypted:hex>
 */
export function encrypt(text) {
  if (!text) return null;

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
 * Decrypts a returned string from the above encrypt function.
 */
export function decrypt(encData) {
  if (!encData) return null;

  const parts = encData.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted format');
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
 * Saves or updates tokens for a given userId securely in the Token collection.
 */
export async function saveUserTokens(userId, { github, slack, jiraKey, jiraDomain }) {
  const updateData = {};
  if (github !== undefined) updateData.githubToken = encrypt(github);
  if (slack !== undefined) updateData.slackToken = encrypt(slack);
  if (jiraKey !== undefined) updateData.jiraToken = encrypt(jiraKey);
  if (jiraDomain !== undefined) updateData.jiraDomain = jiraDomain; // Not sensitive

  return Token.findOneAndUpdate(
    { userId },
    { $set: updateData },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

/**
 * Retrieves and decrypts the tokens for a given user.
 */
export async function getUserTokens(userId) {
  const doc = await Token.findOne({ userId });
  if (!doc) {
    return { github: null, slack: null, jira: { key: null, domain: null } };
  }

  const safeDecrypt = (val) => {
    try {
        return val ? decrypt(val) : null;
    } catch {
        return null;
    }
  };

  return {
    github: safeDecrypt(doc.githubToken),
    slack: safeDecrypt(doc.slackToken),
    jira: {
      key: safeDecrypt(doc.jiraToken),
      domain: doc.jiraDomain,
    },
  };
}
