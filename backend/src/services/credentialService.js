import crypto from 'crypto';
import env from '../../config/env.js';
import User from '../models/User.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const keyBuffer = Buffer.from(env.CREDENTIAL_ENCRYPTION_KEY, 'hex');

// ─────────────────────────────────────────────────────────────────────────────
// Core encrypt/decrypt
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Encrypts a plaintext string with AES-256-GCM.
 * Returns a base64 string containing iv + authTag + ciphertext.
 * Returns null if input is null/undefined/empty.
 * @param {string|null} plaintext
 * @returns {string|null}
 */
export function encrypt(plaintext) {
  if (plaintext == null || plaintext === '') return null;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const authTag = cipher.getAuthTag();

  // Concatenate: iv (16) + authTag (16) + ciphertext (variable)
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypts an AES-256-GCM encrypted base64 string.
 * Returns the original plaintext.
 * Returns null if input is null/undefined/empty.
 * @param {string|null} encryptedBase64
 * @returns {string|null}
 */
export function decrypt(encryptedBase64) {
  if (encryptedBase64 == null || encryptedBase64 === '') return null;

  const combined = Buffer.from(encryptedBase64, 'base64');

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

// ─────────────────────────────────────────────────────────────────────────────
// Credential-level helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Takes a raw credentials object from registration/update and returns
 * a new object with sensitive fields encrypted.
 * @param {Object} credentialsInput
 * @returns {Object}
 */
export function encryptUserCredentials(credentialsInput) {
  if (!credentialsInput) return {};

  const result = {};
  const now = new Date();

  if (credentialsInput.github) {
    result.github = {
      accessToken: encrypt(credentialsInput.github.accessToken),
      connected: Boolean(credentialsInput.github.accessToken),
      connectedAt: credentialsInput.github.accessToken ? now : null,
    };
  }

  if (credentialsInput.slack) {
    result.slack = {
      botToken: encrypt(credentialsInput.slack.botToken),
      workspaceId: credentialsInput.slack.workspaceId || null,
      connected: Boolean(credentialsInput.slack.botToken),
      connectedAt: credentialsInput.slack.botToken ? now : null,
    };
  }

  if (credentialsInput.jira) {
    result.jira = {
      baseUrl: credentialsInput.jira.baseUrl || null,
      email: credentialsInput.jira.email || null,
      apiToken: encrypt(credentialsInput.jira.apiToken),
      connected: Boolean(credentialsInput.jira.apiToken),
      connectedAt: credentialsInput.jira.apiToken ? now : null,
    };
  }

  return result;
}

/**
 * Takes the stored encrypted credentials from MongoDB and returns
 * a new object with all encrypted fields decrypted back to plaintext.
 * @param {Object} encryptedCredentials
 * @returns {Object}
 */
export function decryptUserCredentials(encryptedCredentials) {
  if (!encryptedCredentials) return {};

  const result = {};

  if (encryptedCredentials.github) {
    result.github = {
      accessToken: decrypt(encryptedCredentials.github.accessToken),
    };
  }

  if (encryptedCredentials.slack) {
    result.slack = {
      botToken: decrypt(encryptedCredentials.slack.botToken),
      workspaceId: encryptedCredentials.slack.workspaceId || null,
    };
  }

  if (encryptedCredentials.jira) {
    result.jira = {
      baseUrl: encryptedCredentials.jira.baseUrl || null,
      email: encryptedCredentials.jira.email || null,
      apiToken: decrypt(encryptedCredentials.jira.apiToken),
    };
  }

  return result;
}

/**
 * Fetches a User from MongoDB by userId and returns their fully
 * decrypted credentials ready for connector use.
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export async function getDecryptedCredentials(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  return decryptUserCredentials(user.credentials);
}

export default {
  encrypt,
  decrypt,
  encryptUserCredentials,
  decryptUserCredentials,
  getDecryptedCredentials,
};
