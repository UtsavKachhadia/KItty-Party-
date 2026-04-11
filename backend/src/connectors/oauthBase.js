import { encrypt, decrypt } from '../utils/encryption.js';
import env from '../../config/env.js';

export default class OAuthBase {
  constructor(providerName, clientId, clientSecret, redirectUri) {
    this.providerName = providerName;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  getAuthorizationUrl(userId, scopes) {
    throw new Error('Not implemented');
  }

  async exchangeCodeForToken(code, state) {
    throw new Error('Not implemented');
  }

  async refreshToken(userId) {
    throw new Error('Not implemented');
  }

  async revokeToken(userId) {
    throw new Error('Not implemented');
  }

  async saveToken(userId, tokenData) {
    const user = await import('../models/User.js').then(m => m.default.findById(userId));
    if (!user) throw new Error('User not found');

    const encryptedToken = encrypt(JSON.stringify(tokenData), env.CREDENTIAL_SECRET);

    user.integrations = user.integrations || {};
    user.integrations[this.providerName] = {
      ...user.integrations[this.providerName],
      encryptedToken,
      connectedAt: new Date()
    };
    
    user.markModified('integrations');
    await user.save();
  }

  async getToken(userId) {
    const user = await import('../models/User.js').then(m => m.default.findById(userId));
    if (!user || !user.integrations || !user.integrations[this.providerName]) {
      return null;
    }

    const integration = user.integrations[this.providerName];
    if (!integration.encryptedToken) {
      return integration.accessToken || null; // Backwards compatibility for PAT
    }

    const decryptedStr = decrypt(integration.encryptedToken, env.CREDENTIAL_SECRET);
    if (!decryptedStr) return null;

    let tokenData;
    try {
      tokenData = JSON.parse(decryptedStr);
    } catch (e) {
      return null;
    }

    if (tokenData.expiresAt && tokenData.expiresAt < Date.now()) {
       return await this.refreshToken(userId);
    }

    return tokenData;
  }
}

