import OAuthBase from './oauthBase.js';
import env from '../../config/env.js';

export class GitHubOAuth extends OAuthBase {
  constructor() {
    super('github', env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET, `${env.BASE_URL}/api/connectors/auth/github/callback`);
  }

  getAuthorizationUrl(userId, scopes = ['repo', 'user']) {
    const state = JSON.stringify({ userId, ts: Date.now() });
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.append('client_id', this.clientId);
    url.searchParams.append('redirect_uri', this.redirectUri);
    url.searchParams.append('scope', scopes.join(' '));
    url.searchParams.append('state', Buffer.from(state).toString('base64'));
    return url.toString();
  }

  async exchangeCodeForToken(code, state) {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri
      })
    });

    const data = await response.json();
    const { access_token, scope, token_type } = data;
    if (!access_token) throw new Error('Failed to get access token');

    const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('ascii'));
    
    // Validate state timestamp or cache here for CSRF

    await this.saveToken(decodedState.userId, {
      accessToken: access_token,
      refreshToken: data.refresh_token, // if present
      scope,
      tokenType: token_type,
      expiresAt: data.expires_in ? Date.now() + (data.expires_in * 1000) : null
    });

    return access_token;
  }

  async refreshToken(userId) {
    const user = await import('../models/User.js').then(m => m.default.findById(userId));
    if (!user || !user.integrations || !user.integrations.github) return null;
    
    const integration = user.integrations.github;
    const decryptedStr = await import('../utils/encryption.js').then(m => m.decrypt(integration.token, env.CREDENTIAL_SECRET));
    const tokenData = JSON.parse(decryptedStr);

    if (!tokenData.refreshToken) throw new Error('No refresh token available for GitHub');

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: tokenData.refreshToken
      })
    });

    const data = await response.json();
    if (!data.access_token) throw new Error('Failed to refresh token');

    const newTokenData = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || tokenData.refreshToken,
      scope: data.scope || tokenData.scope,
      tokenType: data.token_type || tokenData.tokenType,
      expiresAt: data.expires_in ? Date.now() + (data.expires_in * 1000) : null
    };

    await this.saveToken(userId, newTokenData);
    return newTokenData;
  }
}

export const githubOAuth = new GitHubOAuth();
