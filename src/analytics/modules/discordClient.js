// Analytics Event Listener
// Attaches to an existing Discord client to capture events for analytics
// (Modified from ivan-bot's discordClient.js to share the main bot's client)

const { ChannelType, AuditLogEvent } = require('discord.js');
const debug = require('../utils/debug');

class AnalyticsEventListener {
  constructor(client, processingCoordinator) {
    this.coordinator = processingCoordinator;
    this.eventCount = 0;
    this.client = client;

    debug('event', 'Setting up analytics event handlers');
    this._setupEventHandlers();
  }

  _setupEventHandlers() {
    const c = this.client;

    // --- Reactions ---
    c.on('messageReactionAdd', async (reaction, user) => {
      try {
        if (reaction.partial) await reaction.fetch();
        if (user.bot) return;
        const emoji = this._extractEmoji(reaction.emoji);
        const threadContext = this._getThreadContext(reaction.message.channel);
        const memberData = await this._extractMemberData(reaction.message.guild, user);
        this._forward('reaction_added', {
          user,
          channel: reaction.message.channel,
          message: reaction.message,
          emoji_name: emoji.name,
          emoji_unicode: emoji.unicode,
          emoji_id: emoji.id,
          emoji_animated: emoji.animated,
          ...memberData,
          ...threadContext,
        });
      } catch (err) {
        console.error('[Analytics] Error in reactionAdd:', err.message);
      }
    });

    c.on('messageReactionRemove', async (reaction, user) => {
      try {
        if (reaction.partial) await reaction.fetch();
        if (user.bot) return;
        const emoji = this._extractEmoji(reaction.emoji);
        const threadContext = this._getThreadContext(reaction.message.channel);
        const memberData = await this._extractMemberData(reaction.message.guild, user);
        this._forward('reaction_removed', {
          user,
          channel: reaction.message.channel,
          message: reaction.message,
          emoji_name: emoji.name,
          emoji_unicode: emoji.unicode,
          emoji_id: emoji.id,
          ...memberData,
          ...threadContext,
        });
      } catch (err) {
        console.error('[Analytics] Error in reactionRemove:', err.message);
      }
    });

    // --- Voice ---
    c.on('voiceStateUpdate', async (oldState, newState) => {
      try {
        const user = newState.member?.user || oldState.member?.user;
        if (!user || user.bot) return;

        const guild = newState.guild || oldState.guild;
        const memberData = await this._extractMemberData(guild, user);

        if (!oldState.channel && newState.channel) {
          this._forward('voice_join', {
            user,
            channel: newState.channel,
            ...memberData,
          });
        } else if (oldState.channel && !newState.channel) {
          this._forward('voice_leave', {
            user,
            channel: oldState.channel,
            ...memberData,
          });
        } else if (oldState.channel && newState.channel && oldState.channelId !== newState.channelId) {
          this._forward('voice_switch', {
            user,
            channel: newState.channel,
            previous_channel_id: String(oldState.channelId),
            previous_channel_name: oldState.channel?.name || '',
            from_channel_id: String(oldState.channelId),
            from_channel_name: oldState.channel?.name || '',
            ...memberData,
          });
        }
      } catch (err) {
        console.error('[Analytics] Error in voiceState:', err.message);
      }
    });

    // --- Member/Role Changes ---
    c.on('guildMemberUpdate', (oldMember, newMember) => {
      try {
        const oldRoles = new Set(oldMember.roles.cache.map(r => r.name));
        const newRoles = new Set(newMember.roles.cache.map(r => r.name));
        const currentRoles = [...newMember.roles.cache.values()]
          .filter(r => r.name !== '@everyone')
          .map(r => r.name);
        const servername = newMember.displayName || newMember.nickname || '';

        for (const role of newRoles) {
          if (!oldRoles.has(role)) {
            this._forward('role_added', {
              user: newMember.user,
              role_name: role,
              guild_id: String(newMember.guild.id),
              roles: currentRoles,
              servername,
            });
          }
        }

        for (const role of oldRoles) {
          if (!newRoles.has(role)) {
            this._forward('role_removed', {
              user: newMember.user,
              role_name: role,
              guild_id: String(newMember.guild.id),
              roles: currentRoles,
              servername,
            });
          }
        }
      } catch (err) {
        console.error('[Analytics] Error in memberUpdate:', err.message);
      }
    });

    // --- Threads ---
    c.on('threadCreate', async (thread) => {
      try {
        const parentType = thread.parent ? classifyChannelTypeSimple(thread.parent.type) : 'text';
        const user = thread.ownerId ? await thread.guild.members.fetch(thread.ownerId).then(m => m.user).catch(() => null) : null;
        const memberData = user ? await this._extractMemberData(thread.guild, user) : {};
        this._forward('thread_created', {
          user,
          channel: thread,
          parent_channel_type: parentType,
          parent_channel_name: thread.parent?.name || '',
          parent_channel_id: String(thread.parentId || ''),
          ...memberData,
        });
      } catch (err) {
        console.error('[Analytics] Error in threadCreate:', err.message);
      }
    });

    c.on('threadDelete', (thread) => {
      try {
        const parentType = thread.parent ? classifyChannelTypeSimple(thread.parent.type) : 'text';
        this._forward('thread_deleted', {
          channel: thread,
          parent_channel_type: parentType,
          parent_channel_name: thread.parent?.name || '',
        });
      } catch (err) {
        console.error('[Analytics] Error in threadDelete:', err.message);
      }
    });

    c.on('threadMembersUpdate', async (addedMembers, removedMembers, thread) => {
      try {
        for (const [, member] of addedMembers) {
          if (member.user?.bot || member.id === c.user.id) continue;
          const parentType = thread.parent ? classifyChannelTypeSimple(thread.parent.type) : 'text';
          const memberData = await this._extractMemberData(thread.guild, member.user || { id: member.id });
          this._forward('thread_member_join', {
            user: member.user || { id: member.id },
            channel: thread,
            parent_channel_type: parentType,
            parent_channel_name: thread.parent?.name || '',
            ...memberData,
          });
        }
      } catch (err) {
        console.error('[Analytics] Error in threadMembersUpdate:', err.message);
      }
    });

    // --- Webhooks / Announcements ---
    c.on('webhookUpdate', async (channel) => {
      try {
        if (channel.type !== ChannelType.GuildAnnouncement) return;

        await new Promise(r => setTimeout(r, 2000));
        const auditLogs = await channel.guild.fetchAuditLogs({
          type: AuditLogEvent.WebhookCreate,
          limit: 5,
        });

        const recentEntry = auditLogs.entries.find(entry => {
          const age = Date.now() - entry.createdTimestamp;
          return age < 10000 && entry.target?.channelId === channel.id;
        });

        if (!recentEntry) return;
        const user = recentEntry.executor;
        if (!user || user.bot) return;

        const memberData = await this._extractMemberData(channel.guild, user);
        this._forward('announcement_followed', {
          user,
          channel,
          ...memberData,
        });
      } catch (err) {
        console.error('[Analytics] Error in webhookUpdate:', err.message);
      }
    });

    // --- Messages ---
    c.on('messageCreate', async (message) => {
      try {
        const threadContext = this._getThreadContext(message.channel);

        if (message.author.bot) {
          this._forward('message', {
            user: message.author,
            channel: message.channel.isThread?.() ? message.channel.parent || message.channel : message.channel,
            message,
            guild_id: String(message.guild?.id || ''),
            ...threadContext,
          });
          return;
        }

        const memberData = await this._extractMemberData(message.guild, message.author);

        let eventType = 'message';
        if (message.stickers?.size > 0) eventType = 'sticker_message';
        else if (message.content?.includes('tenor.com') || message.content?.includes('giphy.com')) eventType = 'gif_message';

        this._forward(eventType, {
          user: message.author,
          channel: message.channel,
          message,
          has_sticker: eventType === 'sticker_message',
          has_gif: eventType === 'gif_message',
          ...memberData,
          ...threadContext,
        });
      } catch (err) {
        console.error('[Analytics] Error in message:', err.message);
      }
    });

    c.on('messageUpdate', async (oldMessage, newMessage) => {
      try {
        if (newMessage.author?.bot) return;
        const threadContext = this._getThreadContext(newMessage.channel);
        const memberData = newMessage.guild && newMessage.author
          ? await this._extractMemberData(newMessage.guild, newMessage.author)
          : {};
        this._forward('message_edit', {
          user: newMessage.author,
          channel: newMessage.channel,
          message: newMessage,
          author_id: String(newMessage.author?.id || ''),
          ...memberData,
          ...threadContext,
        });
      } catch (err) {
        console.error('[Analytics] Error in messageUpdate:', err.message);
      }
    });

    c.on('messageDelete', async (message) => {
      try {
        if (message.author?.bot) return;
        const threadContext = this._getThreadContext(message.channel);
        const memberData = message.guild && message.author
          ? await this._extractMemberData(message.guild, message.author)
          : {};
        this._forward('message_delete', {
          user: message.author,
          channel: message.channel,
          message,
          ...memberData,
          ...threadContext,
        });
      } catch (err) {
        console.error('[Analytics] Error in messageDelete:', err.message);
      }
    });

    // --- Invites ---
    c.on('inviteCreate', (invite) => {
      try {
        if (!invite.inviter) return;
        this._forward('invite_created', {
          user: invite.inviter,
          channel: invite.channel,
          invite_code: invite.code,
          invite_url: invite.url,
          max_uses: invite.maxUses,
          max_age: invite.maxAge,
        });
      } catch (err) {
        console.error('[Analytics] Error in inviteCreate:', err.message);
      }
    });

    // --- Member join/leave ---
    c.on('guildMemberAdd', (member) => {
      try {
        this._forward('member_joined', {
          user: member.user,
          guild_id: String(member.guild.id),
          joined_at: member.joinedAt?.toISOString(),
        });
      } catch (err) {
        console.error('[Analytics] Error in memberAdd:', err.message);
      }
    });

    c.on('guildMemberRemove', (member) => {
      try {
        this._forward('member_left', {
          user: member.user,
          guild_id: String(member.guild.id),
        });
      } catch (err) {
        console.error('[Analytics] Error in memberRemove:', err.message);
      }
    });

    // --- Channels ---
    c.on('channelCreate', (channel) => {
      try {
        this._forward('channel_created', {
          channel,
          parent_channel_id: String(channel.parentId || ''),
        });
      } catch (err) {
        console.error('[Analytics] Error in channelCreate:', err.message);
      }
    });

    c.on('channelDelete', (channel) => {
      try {
        this._forward('channel_deleted', {
          channel,
        });
      } catch (err) {
        console.error('[Analytics] Error in channelDelete:', err.message);
      }
    });

    // --- Scheduled Events ---
    c.on('guildScheduledEventUserAdd', (event, user) => {
      try {
        this._forward('scheduled_event_user_add', {
          user,
          event_name: event.name,
          event_id: String(event.id),
        });
      } catch (err) {
        console.error('[Analytics] Error in scheduledEventUserAdd:', err.message);
      }
    });

    c.on('guildScheduledEventUserRemove', (event, user) => {
      try {
        this._forward('scheduled_event_user_remove', {
          user,
          event_name: event.name,
          event_id: String(event.id),
        });
      } catch (err) {
        console.error('[Analytics] Error in scheduledEventUserRemove:', err.message);
      }
    });
  }

  // --- Data extraction helpers ---
  _extractEmoji(emoji) {
    if (emoji.id) {
      return {
        id: String(emoji.id),
        name: emoji.name || '',
        unicode: '',
        animated: !!emoji.animated,
      };
    }
    return {
      id: null,
      name: emoji.name || emoji.toString(),
      unicode: emoji.name || emoji.toString(),
      animated: false,
    };
  }

  async _extractMemberData(guild, user) {
    if (!guild || !user) return {};
    try {
      const member = await guild.members.fetch(user.id);
      const roles = member.roles.cache
        .filter(r => r.name !== '@everyone')
        .map(r => r.name);
      return {
        roles,
        servername: member.displayName || member.nickname || '',
        guild_id: String(guild.id),
      };
    } catch {
      return {
        roles: [],
        servername: '',
        guild_id: String(guild.id),
      };
    }
  }

  _getThreadContext(channel) {
    if (channel.isThread?.()) {
      return { thread_id: String(channel.id), thread_name: channel.name || '' };
    }
    return {};
  }

  // --- Event forwarding ---
  _forward(eventType, data) {
    try {
      const userName = data.user?.username || data.user?.tag || data.user?.id || 'unknown';
      const channelName = data.channel?.name || data.channel?.id || 'N/A';
      debug('event', `>> ${eventType} | user=${userName} | channel=${channelName}`);
      const count = this.coordinator.processEvent(eventType, data);
      this.eventCount += count;
      debug('event', `   -> produced ${count} analytics event(s)`);
    } catch (err) {
      console.error(`[Analytics] Forward error for ${eventType}:`, err.message);
    }
  }

  getStats() {
    return { eventsForwarded: this.eventCount };
  }
}

function classifyChannelTypeSimple(type) {
  if (type === ChannelType.GuildVoice || type === ChannelType.GuildStageVoice) return 'voice';
  if (type === ChannelType.GuildForum) return 'forum';
  return 'text';
}

module.exports = AnalyticsEventListener;
