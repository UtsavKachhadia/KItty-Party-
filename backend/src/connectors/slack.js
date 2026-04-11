import { WebClient } from '@slack/web-api';

const KNOWN_ACTIONS = ['postMessage', 'mentionUser', 'lookupChannel', 'getUser', 'getAuthInfo'];

/**
 * Creates a Slack WebClient from user-specific token.
 */
function getSlackClient(context) {
  const token = context?.tokens?.slack;
  if (!token) {
    throw new Error('Slack token not configured for this user');
  }
  return new WebClient(token);
}

const handlers = {
  async getAuthInfo(web) {
    return await web.auth.test();
  },

  async postMessage(web, { channel, text, blocks }) {
    const args = { channel, text };
    if (blocks) args.blocks = blocks;
    const res = await web.chat.postMessage(args);
    return { ts: res.ts, channel: res.channel };
  },

  async mentionUser(web, { channel, userId, text }) {
    const mentionText = `<@${userId}> ${text}`;
    const res = await web.chat.postMessage({ channel, text: mentionText });
    return { ts: res.ts, channel: res.channel };
  },

  async lookupChannel(web, { name }) {
    const cleanName = name.replace(/^#/, '');
    const res = await web.conversations.list({ types: 'public_channel,private_channel', limit: 200 });
    const ch = (res.channels || []).find(
      (c) => c.name === cleanName || c.name_normalized === cleanName
    );
    if (!ch) throw new Error(`Channel "${name}" not found`);
    return { channelId: ch.id, name: ch.name };
  },

  async getUser(web, { email }) {
    const res = await web.users.lookupByEmail({ email });
    return { userId: res.user.id, name: res.user.real_name };
  },
};

const slackConnector = {
  name: 'slack',
  KNOWN_ACTIONS,

  async execute(action, params, user) {
    try {
      if (!handlers[action]) {
        return { success: false, error: `Unknown Slack action: ${action}` };
      }
      const web = getSlackClient(user);
      const data = await handlers[action](web, params || {});
      return { success: true, data };
    } catch (err) {
      console.error(`❌ Slack Action Failed [${action}]:`, err.message);
      
      let errorMsg = err.message || 'Slack API call failed';
      
      // Provide helpful diagnoses for common Slack error codes
      if (err.code === 'slack_webapi_platform_error') {
        const platformError = err.data?.error;
        if (platformError === 'invalid_auth') {
          errorMsg = "Invalid Slack token. Please check your Bot User OAuth Token in settings.";
        } else if (platformError === 'missing_scope') {
          errorMsg = `Missing required Slack scopes (e.g., chat:write, users:read). Error: ${err.data.needed}`;
        } else if (platformError === 'not_in_channel') {
          errorMsg = "The bot is not in the specified channel. Please invite it first using /invite @botname.";
        }
      }

      return {
        success: false,
        error: errorMsg,
        data: err.data || null
      };
    }
  },

  isConfigured(context) {
    if (context) return Boolean(context?.tokens?.slack);
    return true; 
  },
};

export default slackConnector;
