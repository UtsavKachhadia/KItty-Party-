import User from '../models/User.js';
import { encrypt, decrypt } from '../utils/encryption.js';

// Moved encryption logic to utils/encryption.js

/**
 * Saves or updates tokens for a given userId securely in the Token collection.
 */
export async function saveUserTokens(userId, { github, slack, jiraKey, jiraDomain }) {
  const secretKey = process.env.CREDENTIAL_SECRET || process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!secretKey) throw new Error('CREDENTIAL_SECRET missing');

  const updateData = {};

  if (github !== undefined) {
    const enc = encrypt(github, secretKey);
    updateData['integrations.github.encryptedToken'] = enc ? JSON.stringify(enc) : null;
    updateData['integrations.github.connectedAt'] = new Date();
  }

  if (slack !== undefined) {
    const enc = encrypt(slack, secretKey);
    updateData['integrations.slack.encryptedToken'] = enc ? JSON.stringify(enc) : null;
    updateData['integrations.slack.connectedAt'] = new Date();
  }

  if (jiraKey !== undefined) {
    const enc = encrypt(jiraKey, secretKey);
    updateData['integrations.jira.apiToken'] = enc ? JSON.stringify(enc) : null;
    if (jiraDomain !== undefined) {
      updateData['integrations.jira.domain'] = jiraDomain;
    }
    updateData['integrations.jira.connectedAt'] = new Date();
  }

  return User.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { new: true }
  );
}

/**
 * Retrieves and decrypts the tokens for a given user.
 */
export async function getUserTokens(userId) {
  // Must explicitly select token fields since they have `select: false` in the schema
  const user = await User.findById(userId).select(
    '+integrations.github.accessToken +integrations.github.encryptedToken ' +
    '+integrations.slack.accessToken +integrations.slack.encryptedToken +integrations.slack.botToken ' +
    '+integrations.jira.apiToken'
  );
  if (!user || !user.integrations) {
    return { github: null, slack: null, jira: { key: null, domain: null } };
  }

  const secretKey = process.env.CREDENTIAL_SECRET || process.env.CREDENTIAL_ENCRYPTION_KEY;

  const safeDecrypt = (val) => {
    try {
      if (!val) return null;
      return decrypt(JSON.parse(val), secretKey);
    } catch {
      return null;
    }
  };

  const integrations = user.integrations;

  return {
    github: safeDecrypt(integrations.github?.encryptedToken),
    slack: safeDecrypt(integrations.slack?.encryptedToken),
    jira: {
      key: safeDecrypt(integrations.jira?.apiToken),
      domain: integrations.jira?.domain,
    },
  };
}
