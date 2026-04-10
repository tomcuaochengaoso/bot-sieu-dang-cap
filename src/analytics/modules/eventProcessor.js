// Event Processing Logic Module (Guide #3)
// Transform platform events into localized analytics events with business rules

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { randomUUID } = require('crypto');
const { ChannelType, MessageType } = require('discord.js');
const debug = require('../utils/debug');

// --- Foundation Layer: Utilities ---

function generateTimestamp() {
  return Date.now(); // Unix timestamp in milliseconds for Mixpanel compatibility
}

function generateId() {
  return randomUUID();
}

function ensureString(val) {
  if (val === null || val === undefined) return '';
  return String(val);
}

function classifyChannelType(channelType) {
  if (channelType === ChannelType.GuildVoice || channelType === ChannelType.GuildStageVoice) return 'voice';
  if (channelType === ChannelType.GuildForum) return 'forum';
  return 'text';
}

// --- Data Structures ---

class EventIdentification {
  constructor({ localizedName, luong, eventType, properties = {}, trackable = true, unidentified = false }) {
    this.localizedName = localizedName;
    this.luong = luong;
    this.eventType = eventType;
    this.properties = properties;
    this.trackable = trackable;
    this.unidentified = unidentified;
  }
}

class CorrelationResult {
  constructor({ correlated = false, userId = null, username = null, messageId = null, content = null, confidence = 0, delay = 0, type = 'none' }) {
    this.correlated = correlated;
    this.userId = userId;
    this.username = username;
    this.messageId = messageId;
    this.content = content;
    this.confidence = confidence;
    this.delay = delay;
    this.type = type;
  }
}

// --- Category Trackers ---

class ForumCategoryTracker {
  constructor(categoryIds = []) {
    this.trackedCategories = new Set(categoryIds.map(String));
    this.nameCache = new Map();
  }

  isTracked(categoryId) {
    return this.trackedCategories.has(String(categoryId));
  }

  cacheName(categoryId, name) {
    this.nameCache.set(String(categoryId), name);
  }

  getName(categoryId) {
    return this.nameCache.get(String(categoryId)) || 'Unknown Forum';
  }
}

class VoiceCategoryTracker {
  constructor(fixedCategoryIds = []) {
    this.fixedCategories = new Set(fixedCategoryIds.map(String));
  }

  isFixed(categoryId) {
    return this.fixedCategories.has(String(categoryId));
  }

  getLuong(categoryId) {
    return this.isFixed(categoryId)
      ? 'Vào các kênh voice cố định'
      : 'Vào các kênh voice tự tạo';
  }
}

// --- Specialized Handlers ---

class RoleChangeHandler {
  constructor(config) {
    this.marketingRoles = new Set(config.special?.marketing_roles || []);
    this.maxRoleNameLength = 50;
  }

  process(eventType, roleName, context = {}) {
    const events = [];
    const truncatedName = roleName.length > this.maxRoleNameLength
      ? roleName.slice(0, this.maxRoleNameLength) + '...'
      : roleName;

    const isAdded = eventType === 'role_added';
    const action = isAdded ? 'added' : 'removed';
    const localizedName = isAdded
      ? `thêm vai trò ${truncatedName}`
      : `loại bỏ vai trò ${truncatedName}`;
    const isMarketing = this.marketingRoles.has(roleName);

    events.push(new EventIdentification({
      localizedName,
      luong: 'Vai trò người dùng cập nhập',
      eventType,
      properties: {
        role_name: roleName,
        role_action: action,
        is_role_event: true,
        single_role_event: !isMarketing,
        ...context,
      },
    }));

    if (isMarketing) {
      events.push(new EventIdentification({
        localizedName: 'vào mục kiến-thức-marketing',
        luong: 'Onbroading server',
        eventType: 'marketing_role_event',
        properties: {
          role_name: roleName,
          role_action: action,
          is_marketing_role: true,
          triggered_by_role_change: true,
          ...context,
        },
      }));
    }

    return events;
  }
}

class GeneralChatHandler {
  constructor(channelId) {
    this.channelId = channelId ? String(channelId) : null;
    this.eventMap = {
      message: { name: 'Sử dụng chat chung', type: 'general_chat_message' },
      gif: { name: 'Vào gif trong chat chung', type: 'general_chat_gif' },
      sticker: { name: 'Vào sticker trong chat chung', type: 'general_chat_sticker' },
    };
  }

  detect(channelId, messageType = 'message') {
    if (!this.channelId || String(channelId) !== this.channelId) return null;
    // Reactions in general chat fall through to generic text pattern
    if (messageType === 'emoji' || messageType === 'reaction') return null;
    const entry = this.eventMap[messageType] || this.eventMap.message;
    return new EventIdentification({
      localizedName: entry.name,
      luong: 'Sử dụng tính năng chat chung',
      eventType: entry.type,
      properties: {
        general_chat_interaction: true,
        interaction_type: messageType,
      },
    });
  }
}

class ModMessageHandler {
  constructor(config) {
    this.channels = new Map();
    const modChannels = config.special?.mod_channels || {};
    for (const [id, cfg] of Object.entries(modChannels)) {
      this.channels.set(String(id), {
        name: cfg.name,
        eventName: cfg.event_name,
        authorizedSenders: new Set((cfg.authorized_senders || []).map(String)),
      });
    }
  }

  detect(channelId, senderId) {
    const cfg = this.channels.get(String(channelId));
    if (!cfg) return null;
    if (!cfg.authorizedSenders.has(String(senderId))) return null;
    return new EventIdentification({
      localizedName: cfg.eventName,
      luong: 'Onbroading server',
      eventType: 'mod_message',
    });
  }
}

class SpecialThreadHandler {
  constructor(config) {
    this.threads = new Map();
    const specialThreads = config.special?.special_threads || {};
    for (const [id, cfg] of Object.entries(specialThreads)) {
      this.threads.set(String(id), {
        name: cfg.name,
        eventName: cfg.event_name,
        flowCategory: cfg.flow_category,
      });
    }
  }

  detect(threadId) {
    return this.threads.get(String(threadId)) || null;
  }

  getEvent(threadId) {
    const cfg = this.detect(threadId);
    if (!cfg) return null;
    return new EventIdentification({
      localizedName: cfg.eventName,
      luong: cfg.flowCategory,
      eventType: 'special_thread_message',
    });
  }
}

class RoomCreationHandler {
  constructor(channelId) {
    this.channelId = channelId ? String(channelId) : null;
  }

  detect(fromChannelId, toChannelId) {
    if (!this.channelId) return null;
    const from = fromChannelId ? String(fromChannelId) : null;
    const to = toChannelId ? String(toChannelId) : null;
    if (to === this.channelId || from === this.channelId) {
      return new EventIdentification({
        localizedName: 'Bấm để tạo room',
        luong: 'Vào mục Bấm để tạo room',
        eventType: 'room_creation',
        properties: {
          room_creation: true,
          trigger_channel_id: this.channelId,
          destination_channel_id: to || '',
        },
      });
    }
    return null;
  }
}

// --- Correlation Layer ---

class CorrelationEngine {
  constructor(config) {
    const corr = config.correlation || {};
    this.timeWindowMs = corr.time_window_ms || 2000;
    this.minConfidence = corr.min_confidence || 0.3;
    this.pendingTimeoutMs = corr.pending_timeout_ms || 10000;
    this.designatedBotThreadId = config.special?.designated_bot_thread_id || null;

    this.botRegistry = new Map();
    for (const bot of (config.bots?.correlation_tracked || [])) {
      this.botRegistry.set(String(bot.bot_id), {
        ...bot,
        useCorrelation: true,
        hasThreadSuffix: true,
      });
    }
    for (const bot of (config.bots?.thread_tracked || [])) {
      this.botRegistry.set(String(bot.bot_id), {
        ...bot,
        useCorrelation: false,
        hasThreadSuffix: false,
      });
    }
    for (const bot of (config.bots?.settings_bots || [])) {
      this.botRegistry.set(String(bot.bot_id), {
        ...bot,
        useCorrelation: true,
        hasThreadSuffix: true,
      });
    }

    this.messageBuffers = new Map();
    this.maxBufferSize = 20;
    this.pendingMessages = new Map();
  }

  getBotConfig(botId) {
    return this.botRegistry.get(String(botId)) || null;
  }

  addUserMessage(channelId, userId, username, messageId, content) {
    const key = String(channelId);
    if (!this.messageBuffers.has(key)) this.messageBuffers.set(key, []);
    const buffer = this.messageBuffers.get(key);
    buffer.push({ userId: String(userId), username, messageId: String(messageId), timestamp: Date.now(), content });
    if (buffer.length > this.maxBufferSize) buffer.shift();
  }

  correlate(botId, channelId, botResponseTime) {
    const config = this.getBotConfig(botId);
    if (!config || !config.useCorrelation) {
      return new CorrelationResult({ type: 'không theo dõi' });
    }

    const buffer = this.messageBuffers.get(String(channelId));
    if (!buffer || !buffer.length) {
      return new CorrelationResult({ type: 'không có tin nhắn trong bộ đệm' });
    }

    const now = botResponseTime || Date.now();
    for (let i = buffer.length - 1; i >= 0; i--) {
      const msg = buffer[i];
      const delay = now - msg.timestamp;
      if (delay <= this.timeWindowMs) {
        const confidence = Math.max(0, 1 - (delay / this.timeWindowMs));
        if (confidence >= this.minConfidence) {
          return new CorrelationResult({
            correlated: true,
            userId: msg.userId,
            username: msg.username,
            messageId: msg.messageId,
            content: msg.content,
            confidence: +confidence.toFixed(3),
            delay,
            type: 'theo dõi thời gian',
          });
        }
      }
    }

    return new CorrelationResult({ type: 'không khớp trong cửa sổ' });
  }

  addPendingMessage(messageId, data, onTimeout) {
    const key = String(messageId);
    const timer = setTimeout(() => {
      const pending = this.pendingMessages.get(key);
      if (pending) {
        this.pendingMessages.delete(key);
        if (onTimeout) onTimeout(pending);
      }
    }, this.pendingTimeoutMs);

    this.pendingMessages.set(key, { ...data, timer });
  }

  cancelPending(userId) {
    for (const [key, pending] of this.pendingMessages) {
      if (String(pending.userId) === String(userId)) {
        clearTimeout(pending.timer);
        this.pendingMessages.delete(key);
        return true;
      }
    }
    return false;
  }

  getPendingCount() {
    return this.pendingMessages.size;
  }

  cleanup() {
    for (const [, pending] of this.pendingMessages) {
      clearTimeout(pending.timer);
    }
    this.pendingMessages.clear();
    this.messageBuffers.clear();
  }
}

// --- Generic Channel Processor ---

class ChannelProcessor {
  constructor(type, patterns, defaultLuong, voiceTracker) {
    this.type = type;
    this.patterns = patterns; // interactionType -> name template
    this.defaultLuong = defaultLuong;
    this.voiceTracker = voiceTracker;
  }

  detect(channelName, interactionType, categoryId, extra = {}) {
    const nameTemplate = this.patterns[interactionType];
    if (!nameTemplate) return null;

    const forumName = extra.forumName || channelName || 'Unknown';
    const threadName = extra.threadName || channelName || 'Unknown';

    const localizedName = nameTemplate
      .replace('{channel_name}', channelName || 'Unknown')
      .replace('{forum_name}', forumName)
      .replace('{thread_name}', threadName);

    let luong = this.defaultLuong;
    if (this.type === 'voice') {
      luong = this.voiceTracker?.getLuong(categoryId) || 'Vào các kênh voice tự tạo';
    } else if (this.type === 'forum') {
      // Most forum events use dynamic luong
      if (extra.useDynamicLuong !== false) {
        luong = `Vào mục ${forumName}`;
      }
    }

    return new EventIdentification({
      localizedName,
      luong,
      eventType: `${this.type}_${interactionType}`,
      properties: {
        category_id: ensureString(categoryId),
        category_name: extra.categoryName || '',
        interaction_type: interactionType,
        ...(extra.forumName ? { forum_name: extra.forumName } : {}),
      },
    });
  }
}

// --- Main Event Processor ---

class EventProcessor {
  constructor(configPath) {
    this.config = this._loadConfig(configPath);

    // Initialize trackers
    this.forumTracker = new ForumCategoryTracker(this.config.special?.forum_category_ids);
    this.voiceTracker = new VoiceCategoryTracker(this.config.special?.voice_fixed_category_ids);

    // Initialize handlers
    this.roleHandler = new RoleChangeHandler(this.config);
    this.generalChatHandler = new GeneralChatHandler(this.config.special?.general_chat_channel_id);
    this.modHandler = new ModMessageHandler(this.config);
    this.specialThreadHandler = new SpecialThreadHandler(this.config);
    this.roomCreationHandler = new RoomCreationHandler(this.config.special?.room_creation_channel_id);

    // Initialize correlation
    this.correlation = new CorrelationEngine(this.config);

    // Initialize channel processors
    this.voiceProcessor = new ChannelProcessor('voice', {
      join: 'Vào kênh {channel_name}',
      leave: 'Rời kênh {channel_name}',
      message: 'Nhắn trong kênh {channel_name}',
      sticker: 'Gửi sticker trong kênh {channel_name}',
      reaction: 'React trong kênh {channel_name}',
      edit: 'Sửa tin nhắn trong kênh {channel_name}',
      delete: 'Xóa tin nhắn trong kênh {channel_name}',
    }, null, this.voiceTracker);

    this.forumProcessor = new ChannelProcessor('forum', {
      thread_created: 'Đăng bài trong {thread_name}',
      thread_deleted: 'Xóa bài trong {thread_name}',
      reply: 'Thảo luận về bài viết trong {forum_name}',
      sticker: 'Gửi sticker trong {forum_name}',
      reaction: 'React trong kênh {thread_name}',
      edit: 'Sửa tin nhắn về bài viết trong {forum_name}',
      delete: 'Xóa tin nhắn trong kênh {thread_name}',
    }, 'Vào các kênh chat', null);

    this.textProcessor = new ChannelProcessor('text', {
      message: 'Nhắn trong kênh {channel_name}',
      sticker: 'Gửi sticker trong kênh {channel_name}',
      reaction: 'React trong kênh {channel_name}',
      edit: 'Sửa tin nhắn trong kênh {channel_name}',
      delete: 'Xóa tin nhắn trong kênh {channel_name}',
    }, 'Vào các kênh chat', null);
  }

  _loadConfig(configPath) {
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      return yaml.load(content);
    } catch (err) {
      console.error('[EventProcessor] Failed to load config:', err.message);
      return { events: {}, bots: {}, correlation: {}, special: {}, categories: {} };
    }
  }

  // --- Main entry point ---
  process(eventType, { user, channel, message, ...extra } = {}) {
    try {
      const userProps = this._extractUser(user, extra);
      const channelProps = this._extractChannel(channel);
      const messageProps = this._extractMessage(message);
      const context = { ...userProps, ...channelProps, ...messageProps, ...extra };

      debug('process', `Processing: ${eventType} | user=${userProps.discord_name || 'N/A'} | ch=${channelProps.channel_name || 'N/A'} (${channelProps.channel_type_class || '?'})`);

      // Track user messages for correlation
      if (user && !user.bot && message && channel) {
        this.correlation.addUserMessage(
          channelProps.channel_id,
          userProps['User ID'],
          userProps.discord_name,
          messageProps.message_id,
          message.content?.slice(0, 200) || '',
        );
        debug('process', `  Buffered user message for correlation (ch=${channelProps.channel_id})`);
      }

      // Bot message path
      if (user?.bot) {
        debug('process', `  Bot message path: botId=${user.id}`);
        return this._processBotMessage(user, channel, message, context);
      }

      // Event identification (chain of responsibility)
      const identifications = this._identify(eventType, context);

      debug('process', `  Identified ${identifications.length} event(s):`);
      for (const id of identifications) {
        debug('process', `    -> name="${id.localizedName}" | luong="${id.luong}" | type=${id.eventType}${id.unidentified ? ' [UNIDENTIFIED]' : ''}`);
      }

      // Create analytics events
      return identifications.map(id => this._createAnalyticsEvent(id, context));
    } catch (err) {
      console.error(`[EventProcessor] Error processing ${eventType}:`, err.message);
      return [];
    }
  }

  // --- Phase 1: Specific handlers (priority order) ---
  _identify(eventType, ctx) {
    // Room creation (check before generic voice)
    if (eventType === 'voice_switch' || eventType === 'voice_join') {
      const room = this.roomCreationHandler.detect(ctx.previous_channel_id || ctx.from_channel_id, ctx.channel_id);
      if (room) return [room];
    }

    // Voice events
    if (['voice_join', 'voice_leave', 'voice_switch'].includes(eventType)) {
      let interactionType = eventType.replace('voice_', '');
      const extra = { categoryName: ctx.category_name };
      const isFixed = this.voiceTracker.isFixed(ctx.category_id);
      const voiceType = isFixed ? 'fixed' : 'custom';

      if (eventType === 'voice_switch') {
        // Voice switch produces "Vào kênh X" with is_voice_switch flag
        interactionType = 'join';
      }

      const result = this.voiceProcessor.detect(
        ctx.channel_name, interactionType, ctx.category_id, extra,
      );
      if (result) {
        // Override eventType to match legacy schema: fixed_voice_* or custom_voice_*
        if (eventType === 'voice_switch') {
          result.eventType = `voice_switch_to_${voiceType}`;
          result.properties.is_voice_switch = true;
          result.properties.previous_channel_id = ctx.previous_channel_id || ctx.from_channel_id || '';
          result.properties.previous_channel_name = ctx.previous_channel_name || ctx.from_channel_name || '';
        } else {
          result.eventType = `${voiceType}_voice_${interactionType}`;
        }
        return [result];
      }
    }

    // Thread created/deleted (forum only)
    if ((eventType === 'thread_created' || eventType === 'thread_deleted') && ctx.parent_channel_type === 'forum') {
      const interactionType = eventType === 'thread_created' ? 'thread_created' : 'thread_deleted';
      const result = this.forumProcessor.detect(
        ctx.channel_name, interactionType, ctx.category_id, {
          forumName: ctx.parent_channel_name || ctx.category_name,
          threadName: ctx.channel_name,
          categoryName: ctx.category_name,
        },
      );
      if (result) return [result];
    }

    // Mod message
    if (eventType === 'message' && ctx.channel_id && ctx['User ID']) {
      const mod = this.modHandler.detect(ctx.channel_id, ctx['User ID']);
      if (mod) return [mod];
    }

    // Role changes
    if (eventType === 'role_added' || eventType === 'role_removed') {
      return this.roleHandler.process(eventType, ctx.role_name || 'Unknown', ctx);
    }

    // General chat (message, gif, sticker — NOT reactions)
    if (eventType === 'message' || eventType === 'sticker_message' || eventType === 'gif_message') {
      const msgType = eventType === 'sticker_message' ? 'sticker'
        : eventType === 'gif_message' ? 'gif'
        : ctx.has_sticker ? 'sticker'
        : ctx.has_gif ? 'gif'
        : 'message';
      const general = this.generalChatHandler.detect(ctx.channel_id, msgType);
      if (general) return [general];
    }

    // Special thread
    if (ctx.thread_id) {
      const special = this.specialThreadHandler.getEvent(ctx.thread_id);
      if (special) return [special];
    }

    // --- Phase 2: Pattern-based ---
    const channelCategory = ctx.channel_type_class || 'text';

    // Voice channel messages/reactions/edits/deletes/stickers
    if (channelCategory === 'voice') {
      const interactionType = this._mapToChannelInteraction(eventType);
      if (interactionType) {
        const result = this.voiceProcessor.detect(
          ctx.channel_name, interactionType, ctx.category_id, { categoryName: ctx.category_name },
        );
        if (result) return [result];
      }
    }

    if (channelCategory === 'forum') {
      const interactionType = this._mapToForumInteraction(eventType);
      if (interactionType) {
        const forumName = ctx.parent_channel_name || ctx.category_name || 'Unknown';
        const threadName = ctx.channel_name || ctx.thread_name || 'Unknown';
        const extra = {
          forumName,
          threadName,
          categoryName: ctx.category_name,
          // forum message delete uses fixed luong "Vào các kênh chat"
          useDynamicLuong: interactionType !== 'delete',
        };
        const result = this.forumProcessor.detect(
          ctx.channel_name, interactionType, ctx.category_id, extra,
        );
        if (result) {
          // Forum reactions use "Vào các kênh chat" per luong_settings
          if (interactionType === 'reaction') {
            result.luong = 'Vào các kênh chat';
          }
          return [result];
        }
      }
    }

    // General chat reactions fall through to text pattern
    if (channelCategory === 'text' || eventType === 'reaction_added' || eventType === 'reaction_removed') {
      const interactionType = this._mapToChannelInteraction(eventType);
      if (interactionType) {
        const result = this.textProcessor.detect(
          ctx.channel_name, interactionType, ctx.category_id, { categoryName: ctx.category_name },
        );
        if (result) return [result];
      }
    }

    // --- Phase 3: Fallback ---
    return [new EventIdentification({
      localizedName: `UNIDENTIFIED_EVENT: ${eventType}`,
      luong: 'Vào các kênh chat',
      eventType,
      unidentified: true,
    })];
  }

  _mapToForumInteraction(eventType) {
    const map = {
      message: 'reply',
      sticker_message: 'sticker',
      reaction_added: 'reaction',
      reaction_removed: 'reaction',
      message_edit: 'edit',
      message_delete: 'delete',
    };
    return map[eventType] || null;
  }

  _mapToChannelInteraction(eventType) {
    const map = {
      message: 'message',
      sticker_message: 'sticker',
      gif_message: 'message',
      reaction_added: 'reaction',
      reaction_removed: 'reaction',
      message_edit: 'edit',
      message_delete: 'delete',
    };
    return map[eventType] || null;
  }

  // --- Bot message processing ---
  _processBotMessage(user, channel, message, context) {
    const botConfig = this.correlation.getBotConfig(user.id);
    if (!botConfig) {
      debug('process', `  Bot ${user.id} not tracked, skipping`);
      return [];
    }

    debug('process', `  Tracked bot: ${botConfig.bot_name} (${user.id})`);

    const designatedThreadId = this.correlation.designatedBotThreadId;
    const inBotThread = !!(context.thread_id && designatedThreadId && String(context.thread_id) === String(designatedThreadId));

    let eventName;
    if (botConfig.hasThreadSuffix) {
      eventName = inBotThread
        ? botConfig.event_name_in_thread
        : botConfig.event_name_outside_thread;
    } else {
      eventName = botConfig.event_name;
    }

    debug('process', `  Bot event: "${eventName}" | inThread=${inBotThread}`);

    // Correlation
    const corrResult = this.correlation.correlate(
      user.id,
      context.channel_id,
      Date.now(),
    );

    debug('process', `  Correlation: type=${corrResult.type} | correlated=${corrResult.correlated}${corrResult.correlated ? ` | user=${corrResult.username} | confidence=${corrResult.confidence} | delay=${corrResult.delay}ms` : ''}`);

    if (corrResult.correlated) {
      this.correlation.cancelPending(corrResult.userId);
    }

    const properties = {
      ...context,
      bot_id: ensureString(user.id),
      bot_name: botConfig.bot_name,
      vietnamese_bot_name: botConfig.vietnamese_bot_name || botConfig.bot_name,
      use_correlation: !!botConfig.useCorrelation,
      is_correlated: corrResult.correlated,
      in_bot_thread: inBotThread,
      correlation_type: corrResult.type,
      correlation_confidence: corrResult.confidence,
      correlation_delay_seconds: corrResult.delay > 0 ? +(corrResult.delay / 1000).toFixed(3) : 0,
    };

    if (corrResult.correlated) {
      properties.triggering_user_id = corrResult.userId;
      properties.triggering_username = corrResult.username;
      properties.trigger_message_id = corrResult.messageId;
      properties.trigger_message_content = corrResult.content || '';
    }

    const identification = new EventIdentification({
      localizedName: eventName,
      luong: botConfig.flow_category || 'Vào mục game gặng',
      eventType: 'bot_interaction',
      properties,
    });

    return [this._createAnalyticsEvent(identification, context)];
  }

  // --- Data extraction ---
  _extractUser(user, extra = {}) {
    if (!user) return {};
    return {
      'User ID': ensureString(user.id),
      discord_name: user.globalName || user.displayName || user.username || user.tag || '',
      server_name: extra.server_name || user.nickname || user.displayName || '',
      is_bot: !!user.bot,
      roles: extra.roles || [],
      server_id: ensureString(extra.guild_id || user.guild?.id || ''),
    };
  }

  _extractChannel(channel) {
    if (!channel) return {};
    const props = {
      channel_id: ensureString(channel.id),
      channel_name: channel.name || '',
      channel_type: this._channelTypeString(channel.type),
      channel_type_class: classifyChannelType(channel.type),
    };

    // Category
    if (channel.parent) {
      props.category_id = ensureString(channel.parent.id || channel.parentId);
      props.category_name = channel.parent.name || '';
      if (channel.isThread?.()) {
        props.parent_channel_id = ensureString(channel.parent.id);
        props.parent_channel_name = channel.parent.name || '';
        props.parent_channel_type = classifyChannelType(channel.parent.type);
        if (channel.parent.parent) {
          props.category_id = ensureString(channel.parent.parent.id);
          props.category_name = channel.parent.parent.name || '';
        }
      }
    } else if (channel.parentId) {
      props.category_id = ensureString(channel.parentId);
    }

    return props;
  }

  _channelTypeString(type) {
    const map = {
      [ChannelType.GuildText]: 'text',
      [ChannelType.GuildVoice]: 'voice',
      [ChannelType.GuildForum]: 'forum',
      [ChannelType.GuildStageVoice]: 'voice',
      [ChannelType.PublicThread]: 'public_thread',
      [ChannelType.PrivateThread]: 'private_thread',
      [ChannelType.GuildAnnouncement]: 'announcement',
      [ChannelType.GuildCategory]: 'category',
    };
    return map[type] || 'text';
  }

  _extractMessage(message) {
    if (!message) return {};
    const stickerCount = message.stickers?.size || 0;
    const props = {
      message_id: ensureString(message.id),
      message_type: message.type !== undefined ? (MessageType[message.type] || String(message.type)) : 'Default',
      character_count: message.content?.length || 0,
      attachment_count: message.attachments?.size || 0,
      has_attachments: !!(message.attachments?.size),
      has_embeds: !!(message.embeds?.length),
      embed_count: message.embeds?.length || 0,
      has_stickers: stickerCount > 0,
      sticker_count: stickerCount,
      has_gif: !!(message.content?.includes('tenor.com') || message.content?.includes('giphy.com')),
    };

    // Sticker details
    if (stickerCount > 0) {
      props.sticker_ids = [...(message.stickers?.values() || [])].map(s => ensureString(s.id));
      props.sticker_names = [...(message.stickers?.values() || [])].map(s => s.name || '');
      props.has_custom_stickers = [...(message.stickers?.values() || [])].some(s => s.guildId != null);
    }

    // Author ID (for edit events)
    if (message.author) {
      props.author_id = ensureString(message.author.id);
    }

    // Thread context
    if (message.channel?.isThread?.()) {
      props.thread_id = ensureString(message.channel.id);
      props.thread_name = message.channel.name || '';
    }

    return props;
  }

  // --- Event creation ---
  _createAnalyticsEvent(identification, context) {
    const distinctId = context.server_name || context.discord_name || context['User ID'] || generateId();
    const timestamp = generateTimestamp();

    return {
      event: identification.localizedName,
      properties: {
        ...identification.properties,
        ...context,
        $time: timestamp,
        $insert_id: generateId(),
        timestamp,
        distinct_id: distinctId,
        vietnamese_event_name: identification.localizedName,
        luong: identification.luong,
        event_type: identification.eventType,
        is_trackable: identification.trackable,
        is_unidentified: identification.unidentified,
      },
    };
  }

  getPendingCount() {
    return this.correlation.getPendingCount();
  }

  cleanup() {
    this.correlation.cleanup();
  }
}

module.exports = {
  EventProcessor,
  EventIdentification,
  CorrelationResult,
  CorrelationEngine,
  ForumCategoryTracker,
  VoiceCategoryTracker,
};
