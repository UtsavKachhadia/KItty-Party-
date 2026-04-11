import { WebClient } from '@slack/web-api';

const KNOWN_ACTIONS = ['postMessage', 'mentionUser', 'lookupChannel', 'getUser'];

/**
 * Creates a Slack WebClient from user-specific token.
 */
function getSlackClient(user) {
  const token = user?.connectors?.slack?.token;
  if (!token) {
    throw new Error('Slack token not configured for this user');
  }
  return new WebClient(token);
}

const handlers = {
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
      const data = await handlers[action](web, params);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Slack API call failed',
      };
    }
  },

  isConfigured(user) {
    if (user) return Boolean(user?.connectors?.slack?.token);
    return true; // Connector code is always available
  },
};

export default slackConnector;
