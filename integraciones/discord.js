const axios = require('axios');

const DISCORD_API = 'https://discord.com/api/v10';

class DiscordBot {
  constructor(botToken) {
    this.token = String(botToken || '').trim();
    this.botToken = this.token;
    this.baseURL = DISCORD_API;
    this.timeout = 10000;
    this.headers = {
      Authorization: `Bot ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  async _req(method, path, data = null) {
    if (!this.token) throw new Error('DISCORD_BOT_TOKEN no configurado');
    try {
      const config = {
        method,
        url: `${DISCORD_API}${path}`,
        headers: this.headers,
        timeout: 10000,
      };
      if (data) config.data = data;

      const res = await axios(config);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      const code = err.response?.data?.code;
      throw new Error(`Discord [${method} ${path}]: ${msg}${code ? ` (code ${code})` : ''}`);
    }
  }

  // ─── Info y verificación ───────────────────────────────────────────────────

  async getBotInfo() {
    return this._req('GET', '/users/@me');
  }

  async verifyBotAccessNew(guildId) {
    try {
      const guild = await this.getGuild(guildId, true);
      const botMember = await this._req('GET', `/guilds/${guildId}/members/@me`);

      const botRoleIds = new Set(botMember.roles);
      const guildRoles = await this._req('GET', `/guilds/${guildId}/roles`);

      let permBits = BigInt(0);
      for (const role of guildRoles) {
        if (role.id === guildId || botRoleIds.has(role.id)) {
          permBits |= BigInt(role.permissions);
        }
      }

      const VIEW_CHANNEL = BigInt(1) << BigInt(10);
      const READ_HISTORY = BigInt(1) << BigInt(16);
      const ADD_REACTIONS = BigInt(1) << BigInt(6);
      const SEND_MESSAGES = BigInt(1) << BigInt(11);

      return {
        isPresent: true,
        guildName: guild.name,
        memberCount: guild.approximate_member_count,
        presenceCount: guild.approximate_presence_count,
        canViewChannels: (permBits & VIEW_CHANNEL) !== BigInt(0),
        canReadHistory: (permBits & READ_HISTORY) !== BigInt(0),
        canSendMessages: (permBits & SEND_MESSAGES) !== BigInt(0),
        canAddReactions: (permBits & ADD_REACTIONS) !== BigInt(0),
        permissionBits: permBits.toString(),
      };
    } catch (err) {
      return { isPresent: false, error: err.message };
    }
  }

  // ─── Métricas del servidor ─────────────────────────────────────────────────

  async getGuild(guildId, withCounts = true) {
    return this._req('GET', `/guilds/${guildId}${withCounts ? '?with_counts=true' : ''}`);
  }

  async getGuildChannels(guildId) {
    return this._req('GET', `/guilds/${guildId}/channels`);
  }

  async getGuildRoles(guildId) {
    return this._req('GET', `/guilds/${guildId}/roles`);
  }

  async fetchGuildMetrics(guildId) {
    const guild = await this.getGuild(guildId, true);
    const channels = await this.getGuildChannels(guildId).catch(() => []);

    const textChannels = channels.filter(c => c.type === 0);
    const voiceChannels = channels.filter(c => c.type === 2);
    const announcementChannels = channels.filter(c => c.type === 5);

    return {
      nombre: guild.name,
      descripcion: guild.description || null,
      seguidores: guild.approximate_member_count || guild.member_count || 0,
      onlineAhora: guild.approximate_presence_count || 0,
      ratioOnline: guild.approximate_member_count
        ? Math.round((guild.approximate_presence_count / guild.approximate_member_count) * 100)
        : 0,
      nivelBoost: guild.premium_tier || 0,
      numBoosts: guild.premium_subscription_count || 0,
      numCanalesTexto: textChannels.length,
      numCanalesVoz: voiceChannels.length,
      numCanalesAnuncio: announcementChannels.length,
      numRoles: guild.roles?.length || 0,
      esVerificado: guild.verified || false,
      esPartner: guild.features?.includes('PARTNERED') || false,
      tieneInsights: guild.features?.includes('COMMUNITY') || false,
      vanityUrl: guild.vanity_url_code || null,
      iconHash: guild.icon || null,
      timestamp: new Date(),
    };
  }

  // ─── Tracking de mensajes ──────────────────────────────────────────────────

  async sendMessage(channelId, content, embeds = []) {
    return this._req('POST', `/channels/${channelId}/messages`, {
      content,
      embeds,
      allowed_mentions: { parse: [] },
    });
  }

  async getMessage(channelId, messageId) {
    return this._req('GET', `/channels/${channelId}/messages/${messageId}`);
  }

  async getMessageReactions(channelId, messageId, emoji) {
    const encoded = encodeURIComponent(emoji);
    return this._req('GET', `/channels/${channelId}/messages/${messageId}/reactions/${encoded}?limit=100`);
  }

  async getPostMetrics(channelId, messageId) {
    try {
      const message = await this.getMessage(channelId, messageId);

      const reactions = {};
      let totalReactions = 0;

      if (message.reactions) {
        for (const r of message.reactions) {
          const key = r.emoji.name || r.emoji.id;
          reactions[key] = r.count;
          totalReactions += r.count;
        }
      }

      let threadReplies = 0;
      if (message.thread) {
        const threadId = message.thread.id;
        const threadMessages = await this._req(
          'GET',
          `/channels/${threadId}/messages?limit=100`
        ).catch(() => []);
        threadReplies = Array.isArray(threadMessages) ? threadMessages.length : 0;
      }

      return {
        messageId,
        channelId,
        reactions,
        totalReactions,
        threadReplies,
        pinned: message.pinned || false,
        timestamp: message.timestamp,
        editedTimestamp: message.edited_timestamp || null,
      };
    } catch (err) {
      return { messageId, channelId, error: err.message };
    }
  }

  // ─── Invitación del bot ────────────────────────────────────────────────────

  static generateBotInviteUrl(clientId) {
    const permissions = 338688;
    const scopes = encodeURIComponent('bot applications.commands');
    return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=${scopes}`;
  }

  static parseGatewayEvent(eventType, eventData) {
    switch (eventType) {
      case 'MESSAGE_CREATE':
        return {
          type: 'new_message',
          guildId: eventData.guild_id,
          channelId: eventData.channel_id,
          messageId: eventData.id,
          authorId: eventData.author?.id,
          isBot: eventData.author?.bot || false,
          content: eventData.content?.slice(0, 100),
          timestamp: new Date(eventData.timestamp),
        };

      case 'MESSAGE_REACTION_ADD':
        return {
          type: 'reaction_add',
          guildId: eventData.guild_id,
          channelId: eventData.channel_id,
          messageId: eventData.message_id,
          userId: eventData.user_id,
          emoji: eventData.emoji?.name || eventData.emoji?.id,
          timestamp: new Date(),
        };

      case 'GUILD_MEMBER_ADD':
        return {
          type: 'member_join',
          guildId: eventData.guild_id,
          userId: eventData.user?.id,
          timestamp: new Date(eventData.joined_at),
        };

      case 'GUILD_MEMBER_REMOVE':
        return {
          type: 'member_leave',
          guildId: eventData.guild_id,
          userId: eventData.user?.id,
          timestamp: new Date(),
        };

      default:
        return null;
    }
  }

  // ─── Backward-compatible methods (legacy API) ─────────────────────────────

  // Legacy: apiCall used by old code
  async apiCall(path, method = 'GET', body = null) {
    return this._req(method, path, body);
  }

  // Legacy: sendMessageToChannel
  async sendMessageToChannel(channelId, content) {
    const body = typeof content === 'string' ? { content } : content;
    return this._req('POST', `/channels/${channelId}/messages`, body);
  }

  async getGuildMemberCount(guildId) {
    const guild = await this.getGuild(guildId);
    return guild.approximate_member_count || 0;
  }

  // Legacy: verifyBotAccess returns {valid, guild} format
  async verifyBotAccess(guildId) {
    try {
      const guild = await this.getGuild(guildId);
      if (!guild || guild.code) {
        return { valid: false, error: guild?.message || 'No se pudo acceder al servidor' };
      }
      // Also include new fields for the new SocialSyncService
      const newAccess = await this.verifyBotAccessNew(guildId).catch(() => ({}));
      return {
        valid: true,
        guild: { name: guild.name, id: guild.id, memberCount: guild.approximate_member_count },
        // New fields
        isPresent: true,
        canViewChannels: newAccess.canViewChannels ?? true,
        canReadHistory: newAccess.canReadHistory ?? true,
        canSendMessages: newAccess.canSendMessages ?? true,
        canAddReactions: newAccess.canAddReactions ?? true,
      };
    } catch (err) {
      return { valid: false, isPresent: false, error: err.message };
    }
  }

  async publishAd(channelId, content, targetUrl) {
    const body = {
      embeds: [{
        description: content,
        color: 0x6366f1,
        fields: [{ name: '\ud83d\udd17 Enlace', value: `[Ver m\u00e1s](${targetUrl})` }],
        footer: { text: 'Publicidad via ChannelAd' },
        timestamp: new Date().toISOString(),
      }],
    };
    return this._req('POST', `/channels/${channelId}/messages`, body);
  }
}

module.exports = DiscordBot;
