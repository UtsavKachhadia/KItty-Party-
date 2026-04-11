import { WebClient } from '@slack/web-api';

const KNOWN_ACTIONS = ['postMessage', 'mentionUser', 'lookupChannel', 'getUser'];

/**
 * Factory function that creates a Slack connector instance
 * using the provided user credentials.
 * @param {Object} credentials - { botToken: string, workspaceId?: string }
 * @returns {Object} Connector with execute() and isConfigured()
 */
export default function createSlackConnector(credentials) {
  const botToken = credentials?.botToken;
  const web = botToken ? new WebClient(botToken) : null;

  const handlers = {
    async postMessage({ channel, text, blocks }) {
      let targetChannel = channel;

      // Auto-resolve channel names to IDs
      if (!channel.startsWith('C') && !channel.startsWith('G') && !channel.startsWith('D')) {
        try {
          const cleanName = channel.replace(/^#/, '');
          const res = await web.conversations.list({ types: 'public_channel', limit: 100 });
          const allChannels = res.channels || [];

          let found = allChannels.find(c => c.name === cleanName || c.name_normalized === cleanName);

          if (found) {
            targetChannel = found.id;
          } else {
            const joinedChannel = allChannels.find(c => c.is_member === true);
            if (joinedChannel) {
              targetChannel = joinedChannel.id;
              console.log(`Slack: Channel "${channel}" not found. Falling back to joined channel "${joinedChannel.name}"`);
            } else if (allChannels.length > 0) {
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

  return {
    name: 'slack',
    KNOWN_ACTIONS,

    async execute(action, params) {
      try {
        if (!handlers[action]) {
          return { success: false, error: `Unknown Slack action: ${action}` };
        }
        if (!web) {
          return { success: false, error: 'Slack connector not configured. Please add your bot token in Settings.' };
        }
        const data = await handlers[action](params);
        return { success: true, data };
      } catch (err) {
        return { success: false, error: err.message || 'Slack API call failed' };
      }
    },

    isConfigured() {
      return Boolean(botToken);
    },
  };
}
