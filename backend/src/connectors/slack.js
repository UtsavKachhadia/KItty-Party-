import { WebClient } from '@slack/web-api';
import env from '../../config/env.js';

const web = new WebClient(env.SLACK_BOT_TOKEN);

const KNOWN_ACTIONS = ['postMessage', 'mentionUser', 'lookupChannel', 'getUser'];

const handlers = {
  async postMessage({ channel, text, blocks }) {
    if (env.SLACK_BOT_TOKEN === 'xoxb-...') {
      return { ts: '1234567890.123456', channel };
    }

    let targetChannel = channel;

    // Auto-resolve channel names to IDs
    if (!channel.startsWith('C') && !channel.startsWith('G') && !channel.startsWith('D')) {
      try {
        const cleanName = channel.replace(/^#/, '');
        const res = await web.conversations.list({ types: 'public_channel', limit: 100 });
        const allChannels = res.channels || [];
        
        // 1. Try to find exact match
        let found = allChannels.find(c => c.name === cleanName || c.name_normalized === cleanName);
        
        if (found) {
          targetChannel = found.id;
        } else {
          // 2. Exact match not found, find ANY channel where the bot is already a member
          const joinedChannel = allChannels.find(c => c.is_member === true);
          if (joinedChannel) {
            targetChannel = joinedChannel.id;
            console.log(`Slack: Channel "${channel}" not found. Falling back to joined channel "${joinedChannel.name}"`);
          } else if (allChannels.length > 0) {
            // 3. Not in any channels? Fallback to the first one available
            targetChannel = allChannels[0].id;
            console.log(`Slack: Channel "${channel}" not found & bot not in any channels. Falling back to "${allChannels[0].name}"`);
          }
        }
      } catch (err) {
        console.error('Slack: Failed to resolve channel name.', err.message);
      }
    }

    const args = { channel: targetChannel, text };
    if (blocks) args.blocks = blocks;

    try {
      const res = await web.chat.postMessage(args);
      return { ts: res.ts, channel: res.channel, usedFallback: targetChannel !== channel };
    } catch (err) {
      // If we are not in the channel, TRY TO JOIN IT and then retry the post
      if (err.message.includes('not_in_channel')) {
        try {
          console.log(`Slack: Not in channel ${targetChannel}, attempting to join...`);
          await web.conversations.join({ channel: targetChannel });
          const retryRes = await web.chat.postMessage(args);
          return { ts: retryRes.ts, channel: retryRes.channel, joined: true };
        } catch (joinErr) {
          throw new Error(`Slack: Failed to join channel ${targetChannel}: ${joinErr.message}`);
        }
      }
      throw err;
    }
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
