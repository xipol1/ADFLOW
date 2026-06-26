const axios = require('axios');

const DISCORD_API = 'https://discord.com/api/v10';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
      // The bot's own guild member must be fetched by its REAL user id.
      // `/guilds/{id}/members/@me` is rejected by Discord (Invalid Form Body
      // 50035 — `@me` is not a valid snowflake here), and the alternative
      // `/users/@me/guilds/{id}/member` refuses bots (code 20001). Resolve the
      // bot's user id once (cached on the instance) and use it explicitly.
      if (!this._botUserId) this._botUserId = (await this.getBotInfo()).id;
      const botMember = await this._req('GET', `/guilds/${guildId}/members/${this._botUserId}`);

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

  // Text (0) + announcement (5) channels where an ad embed can be posted,
  // normalized + sorted by Discord's display position. Forum/voice/category
  // channels are excluded (publishAd posts a plain message+embed).
  async getPublishableChannels(guildId) {
    const channels = await this.getGuildChannels(guildId);
    return (Array.isArray(channels) ? channels : [])
      .filter((c) => c.type === 0 || c.type === 5)
      .map((c) => ({ id: c.id, name: c.name, type: c.type, position: c.position ?? 0 }))
      .sort((a, b) => a.position - b.position);
  }

  // Heuristic default publish target from a getPublishableChannels() list:
  // prefer an announcements/promo channel, then #general, else the top channel.
  static pickDefaultPublishChannel(channels) {
    if (!Array.isArray(channels) || channels.length === 0) return null;
    const byName = (re) => channels.find((c) => re.test(String(c.name || '')));
    return (
      byName(/anuncio|announc|promo|publi|novedad/i) ||
      byName(/general|principal|main|chat/i) ||
      channels[0]
    );
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

  // ─── Censo de miembros y muestreo de actividad (autenticidad) ──────────────
  //
  // Alimentan el lector de autenticidad (% bots estimado, ráfagas de alta,
  // engagement real). fetchAllMembers REQUIERE el privileged intent
  // GUILD_MEMBERS activado en el Developer Portal — sin él, /guilds/{id}/members
  // devuelve 403. sampleRecentActivity solo lee metadata (autor + timestamp),
  // así que NO necesita el intent Message Content.

  /** Snowflake → fecha de creación de la cuenta (epoch Discord 2015-01-01). */
  static snowflakeToDate(id) {
    try {
      return new Date(Number((BigInt(id) >> BigInt(22)) + BigInt(1420070400000)));
    } catch {
      return null;
    }
  }

  /**
   * GET con reintentos: respeta el 429 (`retry_after`) de Discord y reintenta
   * los 5xx transitorios con backoff exponencial. Lanza un error envuelto
   * (mismo formato que _req) al agotar los reintentos.
   */
  async _getWithRetry(path, { retries = 4 } = {}) {
    if (!this.token) throw new Error('DISCORD_BOT_TOKEN no configurado');
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const res = await axios({
          method: 'GET',
          url: `${DISCORD_API}${path}`,
          headers: this.headers,
          timeout: this.timeout,
        });
        return res.data;
      } catch (err) {
        const status = err.response?.status;
        const retryable = status === 429 || (status >= 500 && status <= 599);
        if (retryable && attempt < retries) {
          const ra = Number(
            err.response?.data?.retry_after ?? err.response?.headers?.['retry-after'],
          );
          const waitMs = Number.isFinite(ra) && ra > 0
            ? Math.ceil(ra * 1000) + 250
            : Math.min(8000, 500 * 2 ** attempt);
          await sleep(waitMs);
          attempt += 1;
          continue;
        }
        const msg = err.response?.data?.message || err.message;
        const code = err.response?.data?.code;
        throw new Error(`Discord [GET ${path}]: ${msg}${code ? ` (code ${code})` : ''}`);
      }
    }
  }

  /**
   * Censo completo de miembros del guild, paginando /guilds/{id}/members.
   * Discord ordena por user.id ascendente; avanzamos el cursor `after` al id
   * máximo de cada página. Cap defensivo en maxPages (→ truncated + log; regla
   * "no silent caps"). Requiere el intent GUILD_MEMBERS.
   */
  async fetchAllMembers(guildId, { maxPages = 60, pageSize = 1000 } = {}) {
    const limit = Math.min(1000, Math.max(1, pageSize));
    const members = [];
    let after = '0';
    let pages = 0;
    let truncated = false;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (pages >= maxPages) { truncated = true; break; }
      const batch = await this._getWithRetry(
        `/guilds/${guildId}/members?limit=${limit}&after=${after}`,
      );
      if (!Array.isArray(batch) || batch.length === 0) break;
      members.push(...batch);
      pages += 1;
      if (batch.length < limit) break;
      after = batch.reduce(
        (mx, m) => (m?.user?.id && BigInt(m.user.id) > BigInt(mx) ? m.user.id : mx),
        after,
      );
    }
    if (truncated) {
      console.warn(
        `[Discord] member census truncated at ${members.length} (maxPages=${maxPages}) for guild ${guildId}`,
      );
    }
    return { members, fetched: members.length, truncated };
  }

  /**
   * Muestrea mensajes recientes de los canales de texto publicables para medir
   * engagement real y distribución de actividad. Solo lee metadata (autor +
   * timestamp); el contenido no se usa → no hace falta Message Content.
   * Devuelve eventos crudos; el cálculo (autores únicos, Gini, vitalidad) vive
   * en discordAuthenticityService (función pura).
   */
  async sampleRecentActivity(guildId, { perChannel = 100, windowDays = 14, maxChannels = 10 } = {}) {
    const channels = await this.getPublishableChannels(guildId).catch(() => []);
    const targets = channels.slice(0, maxChannels);
    const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
    const limit = Math.min(100, Math.max(1, perChannel));
    const events = [];
    let channelsScanned = 0;
    for (const ch of targets) {
      const msgs = await this._getWithRetry(
        `/channels/${ch.id}/messages?limit=${limit}`,
      ).catch(() => null);
      if (!Array.isArray(msgs)) continue; // sin permiso de lectura en ese canal, etc.
      channelsScanned += 1;
      for (const m of msgs) {
        const ts = m?.timestamp ? new Date(m.timestamp).getTime() : NaN;
        if (!Number.isFinite(ts) || ts < cutoff) continue;
        events.push({
          authorId: m.author?.id || null,
          isBot: !!m.author?.bot,
          timestamp: ts,
          channelId: ch.id,
        });
      }
    }
    return {
      events,
      messages: events.length,
      channelsScanned,
      channelsAvailable: channels.length,
      truncated: channels.length > targets.length,
      windowDays,
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

  // ─── OAuth2 de usuario (prueba de propiedad del servidor) ────────────────────
  //
  // El invite del bot demuestra que ALGUIEN con "Gestionar servidor" añadió el
  // bot, pero no quién. Para activar un canal necesitamos probar que es ESTE
  // usuario quien controla el guild. Lo hacemos con el flujo OAuth2 `identify
  // guilds`: tras autorizar, listamos sus guilds (`GET /users/@me/guilds`) y
  // comprobamos que es owner o admin del que está reclamando.

  // Bits de permiso a nivel de usuario que consideramos "control del servidor".
  static get OWNER_PERMS() {
    const ADMINISTRATOR = BigInt(1) << BigInt(3);
    const MANAGE_GUILD = BigInt(1) << BigInt(5);
    return { ADMINISTRATOR, MANAGE_GUILD, mask: ADMINISTRATOR | MANAGE_GUILD };
  }

  /**
   * URL de autorización OAuth2 con scope `identify guilds` (solo lectura;
   * no concede al bot ningún permiso adicional).
   */
  static generateOAuthUrl({ clientId, redirectUri, state }) {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identify guilds',
      // `consent` fuerza la pantalla de autorización aunque ya la concediera
      // antes, evitando reusar silenciosamente un grant de otra sesión.
      prompt: 'consent',
    });
    if (state) params.set('state', state);
    return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  }

  /** Intercambia el `code` del callback por un access_token de usuario. */
  static async exchangeOAuthCode({ clientId, clientSecret, code, redirectUri }) {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });
    try {
      const res = await axios.post(`${DISCORD_API}/oauth2/token`, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
      });
      return res.data; // { access_token, token_type, scope, ... }
    } catch (err) {
      const msg = err.response?.data?.error_description || err.response?.data?.error || err.message;
      throw new Error(`Discord OAuth token: ${msg}`);
    }
  }

  /** Lista los guilds del usuario autenticado (requiere un user access_token). */
  static async getUserGuilds(accessToken) {
    try {
      const res = await axios.get(`${DISCORD_API}/users/@me/guilds`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10000,
      });
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      throw new Error(`Discord OAuth guilds: ${msg}`);
    }
  }

  /** Devuelve true si el usuario es owner o admin del guild (objeto de getUserGuilds). */
  static userControlsGuild(guild) {
    if (!guild) return false;
    if (guild.owner === true) return true;
    try {
      const perms = BigInt(guild.permissions || '0');
      return (perms & DiscordBot.OWNER_PERMS.mask) !== BigInt(0);
    } catch {
      return false;
    }
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

  async apiCall(path, method = 'GET', body = null) {
    return this._req(method, path, body);
  }

  async sendMessageToChannel(channelId, content) {
    const body = typeof content === 'string' ? { content } : content;
    return this._req('POST', `/channels/${channelId}/messages`, body);
  }

  async getGuildMemberCount(guildId) {
    const guild = await this.getGuild(guildId);
    return guild.approximate_member_count || 0;
  }

  async verifyBotAccess(guildId) {
    try {
      const guild = await this.getGuild(guildId);
      if (!guild || guild.code) {
        return { valid: false, error: guild?.message || 'No se pudo acceder al servidor' };
      }

      const access = await this.verifyBotAccessNew(guildId).catch((err) => ({
        isPresent: false,
        error: err.message,
      }));

      if (!access.isPresent) {
        return {
          valid: false,
          isPresent: false,
          error: access.error || 'El bot no es miembro del servidor.',
        };
      }
      if (!access.canViewChannels) {
        return {
          valid: false,
          isPresent: true,
          error: 'El bot no tiene permiso VIEW_CHANNEL en el servidor.',
          canSendMessages: !!access.canSendMessages,
          canViewChannels: false,
        };
      }
      if (!access.canSendMessages) {
        return {
          valid: false,
          isPresent: true,
          error: 'El bot no tiene permiso SEND_MESSAGES — no podra publicar campañas.',
          canSendMessages: false,
          canViewChannels: true,
        };
      }

      return {
        valid: true,
        guild: { name: guild.name, id: guild.id, memberCount: guild.approximate_member_count },
        isPresent: true,
        canViewChannels: true,
        canReadHistory: !!access.canReadHistory,
        canSendMessages: true,
        canAddReactions: !!access.canAddReactions,
      };
    } catch (err) {
      return { valid: false, isPresent: false, error: err.message };
    }
  }

  /**
   * Publica una campaña en el canal de Discord.
   *
   * Si `opts.embed` está presente (de un format `embed` o `embed_image`),
   * lo usamos como base sobre el embed default. Si `opts.media` trae una
   * imagen, va al `image.url` del embed. El texto plano (`content`) se
   * envía como mensaje fuera del embed para que el usuario lo lea aunque
   * tenga embeds bloqueados.
   */
  async publishAd(channelId, content, targetUrl, opts = {}) {
    const customEmbed = opts.embed || null;
    const media = Array.isArray(opts.media) ? opts.media : [];
    const firstImage = media.find((m) => m && m.type === 'image');

    // Helper: parse "#7C3AED" → 0x7C3AED. Discord espera un int de 24 bits.
    const parseColor = (hex) => {
      if (!hex) return 0x6366f1;
      const m = String(hex).match(/^#?([0-9a-fA-F]{6})$/);
      return m ? parseInt(m[1], 16) : 0x6366f1;
    };

    const embed = {
      ...(customEmbed?.title ? { title: customEmbed.title.slice(0, 256) } : {}),
      description: customEmbed?.description || content,
      color: parseColor(customEmbed?.color),
      ...(customEmbed?.thumbnail ? { thumbnail: { url: customEmbed.thumbnail } } : {}),
      ...(customEmbed?.image || firstImage ? { image: { url: customEmbed?.image || firstImage.url } } : {}),
      ...(targetUrl ? {
        fields: [{ name: '🔗 Enlace', value: `[Ver más](${targetUrl})` }],
      } : {}),
      footer: { text: 'Publicidad via ChannelAd' },
      timestamp: new Date().toISOString(),
    };

    // Si el customEmbed tomó el description, mandamos el content como
    // mensaje plano por encima del embed para máxima visibilidad.
    const body = {
      ...(customEmbed?.description ? { content: String(content || '').slice(0, 2000) } : {}),
      embeds: [embed],
    };
    return this._req('POST', `/channels/${channelId}/messages`, body);
  }
}

module.exports = DiscordBot;
