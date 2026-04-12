import OAuthBase from './oauthBase.js';
import env from '../../config/env.js';

export class SlackOAuth extends OAuthBase {
  constructor() {
    super('slack', env.SLACK_CLIENT_ID, env.SLACK_CLIENT_SECRET, `${env.BASE_URL}/api/connectors/auth/slack/callback`);
  }

  getAuthorizationUrl(userId, scopes = ['channels:read', 'chat:write']) {
    const state = JSON.stringify({ userId, ts: Date.now() });
    const url = new URL('https://slack.com/oauth/v2/authorize');
    url.searchParams.append('client_id', this.clientId);
    url.searchParams.append('scope', scopes.join(','));
    url.searchParams.append('redirect_uri', this.redirectUri);
    url.searchParams.append('state', Buffer.from(state).toString('base64'));
    return url.toString();
  }

  async exchangeCodeForToken(code, state) {
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri
      })
    });

    const data = await response.json();
    if (!data.ok) throw new Error('Slack OAuth Failed: ' + data.error);

    const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('ascii'));
    
    // Store botToken and userToken
    await this.saveToken(decodedState.userId, {
      botToken: data.access_token,
      botUserId: data.bot_user_id,
      userToken: data.authed_user?.access_token,
      refreshToken: data.refresh_token, // theoretically Slack refresh if opted-in
      teamId: data.team?.id,
      expiresAt: data.expires_in ? Date.now() + (data.expires_in * 1000) : null
    });

    return data;
  }

  async refreshToken(userId) {
    // Basic Slack refresh if using user tokens with expiry
    const user = await import('../models/User.js').then(m => m.default.findById(userId));
    if (!user || !user.integrations || !user.integrations.slack) return null;
    
    const integration = user.integrations.slack;
    const decryptedStr = await import('../utils/encryption.js').then(m => m.decrypt(integration.token, env.CREDENTIAL_SECRET));
    const tokenData = JSON.parse(decryptedStr);

    if (!tokenData.refreshToken) throw new Error('No refresh token available for Slack');

    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: tokenData.refreshToken
      })
    });

    const data = await response.json();
    if (!data.ok) throw new Error('Failed to refresh Slack token');

    const newTokenData = {
      botToken: data.access_token,
      botUserId: data.bot_user_id || tokenData.botUserId,
      userToken: data.authed_user?.access_token || tokenData.userToken,
      refreshToken: data.refresh_token || tokenData.refreshToken,
      teamId: data.team?.id || tokenData.teamId,
      expiresAt: data.expires_in ? Date.now() + (data.expires_in * 1000) : null
    };

    await this.saveToken(userId, newTokenData);
    return newTokenData;
  }
}

export const slackOAuth = new SlackOAuth();
