import { WebClient } from '@slack/web-api';
import env from '../../config/env.js';

const web = new WebClient(env.SLACK_BOT_TOKEN);

const KNOWN_ACTIONS = ['postMessage', 'mentionUser', 'lookupChannel', 'getUser'];

const handlers = {
  async postMessage({ channel, text, blocks }) {
    if (env.SLACK_BOT_TOKEN === 'xoxb-...') {
      return { ts: '1234567890.123456', channel };
    }
    const args = { channel, text };
    if (blocks) args.blocks = blocks;
    const res = await web.chat.postMessage(args);
    return { ts: res.ts, channel: res.channel };
  },

  async mentionUser({ channel, userId, text }) {
    const mentionText = `<@${userId}> ${text}`;
    const res = await web.chat.postMessage({ channel, text: mentionText });
    return { ts: res.ts, channel: res.channel };
  },

  async lookupChannel({ name }) {
    const cleanName = name.replace(/^#/, '');
    const res = await web.conversations.list({ types: 'public_channel,private_channel', limit: 200 });
    const ch = (res.channels || []).find(
      (c) => c.name === cleanName || c.name_normalized === cleanName
    );
    if (!ch) throw new Error(`Channel "${name}" not found`);
    return { channelId: ch.id, name: ch.name };
  },

  async getUser({ email }) {
    const res = await web.users.lookupByEmail({ email });
    return { userId: res.user.id, name: res.user.real_name };
  },
};

const slackConnector = {
  name: 'slack',
  KNOWN_ACTIONS,

  async execute(action, params) {
    try {
      if (!handlers[action]) {
        return { success: false, error: `Unknown Slack action: ${action}` };
      }
      const data = await handlers[action](params);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Slack API call failed',
      };
    }
  },

  isConfigured() {
    return Boolean(env.SLACK_BOT_TOKEN);
  },
};

export default slackConnector;
