const axios = require('axios');

const TELEGRAM_API = 'https://api.telegram.org';

class TelegramBot {
  constructor(botToken) {
    this.token = String(botToken || '').trim();
    this.base = this.token ? `${TELEGRAM_API}/bot${this.token}` : '';
    // Legacy compat
    this.botToken = this.token;
    this.baseURL = this.base;
    this.timeout = 10000;
  }

  _ensureConfigured() {
    if (!this.base) throw new Error('TELEGRAM_BOT_TOKEN no configurado');
  }

  async _req(method, params = {}) {
    this._ensureConfigured();
    try {
      const { data } = await axios.post(`${this.base}/${method}`, params, {
        timeout: 10000,
      });
      if (!data.ok) throw new Error(data.description || `Telegram error on ${method}`);
      return data.result;
    } catch (err) {
      if (err.response?.data?.description) {
        throw new Error(`Telegram [${method}]: ${err.response.data.description}`);
      }
      throw err;
    }
  }

  // ─── Info del canal ────────────────────────────────────────────────────────

  async getMe() {
    return this._req('getMe');
  }

  async getChatInfo(chatId) {
    return this._req('getChat', { chat_id: chatId });
  }

  async getChatMemberCount(chatId) {
    this._ensureConfigured();
    try {
      const result = await this._req('getChatMemberCount', { chat_id: chatId });
      return { ok: true, result };
    } catch (err) {
      return { ok: false, result: 0, error: err.message };
    }
  }

  async getChatMemberCountRaw(chatId) {
    return this._req('getChatMemberCount', { chat_id: chatId });
  }

  async getChatAdministrators(chatId) {
    return this._req('getChatAdministrators', { chat_id: chatId });
  }

  // ─── Verificación de acceso admin ─────────────────────────────────────────

  async verifyAdminAccess(chatId) {
    try {
      const me = await this.getMe();
      const member = await this._req('getChatMember', {
        chat_id: chatId,
        user_id: me.id,
      });
      const isAdmin = ['administrator', 'creator'].includes(member.status);
      return {
        isAdmin,
        canPostMessages: isAdmin && (member.can_post_messages !== false),
        canEditMessages: isAdmin && (member.can_edit_messages !== false),
        status: member.status,
        botId: me.id,
        botUsername: me.username,
      };
    } catch (err) {
      return { isAdmin: false, error: err.message };
    }
  }

  // ─── Métricas del canal ────────────────────────────────────────────────────

  async fetchChannelMetrics(chatId) {
    const [chatInfo, memberCount] = await Promise.all([
      this.getChatInfo(chatId),
      this.getChatMemberCountRaw(chatId),
    ]);

    const admins = await this.getChatAdministrators(chatId).catch(() => []);

    return {
      seguidores: memberCount,
      titulo: chatInfo.title,
      username: chatInfo.username || null,
      descripcion: chatInfo.description || null,
      tipo: chatInfo.type,
      esPublico: !!chatInfo.username,
      linkedChatId: chatInfo.linked_chat_id || null,
      fotoPerfil: chatInfo.photo?.small_file_id || null,
      numAdmins: admins.length,
      slowModeDelay: chatInfo.slow_mode_delay || 0,
      fotoRestringida: chatInfo.has_protected_content || false,
      verificadoTelegram: chatInfo.is_verified || false,
      timestamp: new Date(),
    };
  }

  // ─── Estadísticas del canal (solo canales grandes) ────────────────────────

  async getChatStatistics(chatId) {
    try {
      const stats = await this._req('getChatStatistics', {
        chat_id: chatId,
        is_dark: false,
      });
      return {
        seguidoresPeriodo: stats.member_count,
        meanViewsPerPost: stats.mean_view_count,
        meanSharesPerPost: stats.mean_share_count,
        topHoursByViews: stats.top_hours_by_views,
        growthPercent: stats.growth_percent_by_period,
        enabledNotifications: stats.enabled_notifications_percentage,
        raw: stats,
      };
    } catch {
      return null;
    }
  }

  async getMessageStatistics(chatId, messageId) {
    try {
      const stats = await this._req('getMessageStatistics', {
        chat_id: chatId,
        message_id: messageId,
        is_dark: false,
      });
      return {
        views: stats.message_interaction_graph?.y_column_headers?.views || 0,
        forwards: stats.message_forwarding_graph?.y_column_headers?.forwards || 0,
        raw: stats,
      };
    } catch {
      return null;
    }
  }

  // ─── Publicación como admin ────────────────────────────────────────────────

  async sendMessage(chatId, text, opts = {}) {
    return this._req('sendMessage', {
      chat_id: chatId,
      text: String(text ?? ''),
      parse_mode: 'HTML',
      disable_web_page_preview: false,
      ...opts,
    });
  }

  async sendPhoto(chatId, photo, captionOrOpts = '', opts = {}) {
    // Backward compat: old code calls sendPhoto(chatId, photo, { caption })
    // New code calls sendPhoto(chatId, photo, caption, opts)
    if (typeof captionOrOpts === 'object') {
      opts = captionOrOpts;
      captionOrOpts = opts.caption || '';
    }
    return this._req('sendPhoto', {
      chat_id: chatId,
      photo,
      caption: captionOrOpts,
      parse_mode: 'HTML',
      ...opts,
    });
  }

  async sendDocument(chatId, document, caption, opts = {}) {
    return this._req('sendDocument', {
      chat_id: chatId,
      document,
      caption,
      parse_mode: 'HTML',
      ...opts,
    });
  }

  async sendVideo(chatId, video, caption = '', opts = {}) {
    return this._req('sendVideo', {
      chat_id: chatId,
      video,
      caption,
      parse_mode: 'HTML',
      ...opts,
    });
  }

  async sendMediaGroup(chatId, media) {
    // Telegram albums: 2-10 items, mixed photo/video allowed, no reply_markup.
    return this._req('sendMediaGroup', {
      chat_id: chatId,
      media: JSON.stringify(media),
    });
  }

  async editMessageText(chatId, messageId, text, opts = {}) {
    return this._req('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      ...opts,
    });
  }

  // ─── Lectura de métricas por post ─────────────────────────────────────────

  async getPostMetrics(chatId, messageId, statsChannelId = null) {
    const metrics = { views: null, forwards: null, reactions: {} };

    try {
      if (statsChannelId) {
        const fwd = await this._req('forwardMessage', {
          chat_id: statsChannelId,
          from_chat_id: chatId,
          message_id: messageId,
        });
        if (fwd.forward_from_chat) {
          metrics.views = fwd.views || null;
          metrics.forwards = fwd.forward_from_message_id ? (fwd.forward_count || null) : null;
        }
        await this._req('deleteMessage', {
          chat_id: statsChannelId,
          message_id: fwd.message_id,
        }).catch(() => {});
      }

      const nativeStats = await this.getMessageStatistics(chatId, messageId);
      if (nativeStats) {
        metrics.views = nativeStats.views || metrics.views;
        metrics.forwards = nativeStats.forwards || metrics.forwards;
        metrics.nativeStats = nativeStats.raw;
      }

      const msgReactions = await this._req('getMessageReactions', {
        chat_id: chatId,
        message_id: messageId,
        limit: 100,
      }).catch(() => null);

      if (msgReactions?.reactions) {
        for (const r of msgReactions.reactions) {
          const emoji = r.type?.emoji || r.type?.custom_emoji_id || 'unknown';
          metrics.reactions[emoji] = (metrics.reactions[emoji] || 0) + r.total_count;
        }
      }
    } catch (err) {
      metrics.error = err.message;
    }

    return metrics;
  }

  // ─── Webhook ───────────────────────────────────────────────────────────────

  async setWebhook(url, allowedUpdates = ['channel_post', 'edited_channel_post', 'message_reaction']) {
    return this._req('setWebhook', {
      url,
      allowed_updates: allowedUpdates,
      drop_pending_updates: false,
    });
  }

  async deleteWebhook() {
    return this._req('deleteWebhook');
  }

  async getWebhookInfo() {
    return this._req('getWebhookInfo');
  }

  static parseWebhookUpdate(update) {
    const post = update.channel_post || update.edited_channel_post;
    if (!post) return null;

    return {
      messageId: post.message_id,
      chatId: post.chat.id,
      chatUsername: post.chat.username,
      text: post.text || post.caption || null,
      views: post.views || 0,
      forwards: post.forward_count || 0,
      reactions: post.reactions?.results?.reduce((acc, r) => {
        acc[r.type?.emoji || 'custom'] = r.count;
        return acc;
      }, {}) || {},
      date: new Date(post.date * 1000),
      isEdit: !!update.edited_channel_post,
    };
  }

  // ─── Backward-compatible methods (legacy API) ─────────────────────────────

  async getChat(chatId) {
    this._ensureConfigured();
    try {
      const result = await this.getChatInfo(chatId);
      return { ok: true, result };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async getUpdates(offset = 0) {
    this._ensureConfigured();
    const result = await this._req('getUpdates', { offset, timeout: 30 });
    return { ok: true, result };
  }

  async verifyBotAccess(chatId) {
    try {
      this._ensureConfigured();

      let me;
      try {
        me = await this.getMe();
      } catch (err) {
        return { valid: false, error: `Bot token inválido: ${err.message}` };
      }

      let member;
      try {
        member = await this._req('getChatMember', {
          chat_id: chatId,
          user_id: me.id,
        });
      } catch (err) {
        return {
          valid: false,
          error: 'El bot no es miembro del canal. Añádelo como administrador antes de verificar.',
        };
      }

      const isAdmin = ['administrator', 'creator'].includes(member?.status);
      if (!isAdmin) {
        return {
          valid: false,
          error: 'El bot está en el canal pero no tiene rol de administrador. Promuévelo a admin.',
        };
      }

      const canPostMessages = member?.can_post_messages !== false;
      if (!canPostMessages) {
        return {
          valid: false,
          error: 'El bot es admin pero no tiene permiso para publicar mensajes.',
        };
      }

      const chatInfo = await this.getChatInfo(chatId);
      return {
        valid: true,
        chat: chatInfo,
        isAdmin: true,
        canPostMessages: true,
        status: member.status,
        botId: me.id,
        botUsername: me.username,
      };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }

  /**
   * Publica una campaña en el canal.
   *
   * Acepta:
   *   - content (texto del anuncio, HTML)
   *   - targetUrl (URL fallback si no hay botones custom)
   *   - opts.buttons: [{ label, url }] — hasta 4 botones inline. Si está
   *     vacío y hay targetUrl, se renderiza un botón "Ver más" para
   *     mantener el comportamiento legacy.
   *   - opts.media: [{ type:'image'|'video'|'document', url, caption }] —
   *     0, 1 o N adjuntos. Con N≥2 usa sendMediaGroup (sin botones nativos,
   *     el mensaje de texto los lleva en un follow-up).
   *
   * Para texto plano sigue siendo 1 sola llamada a sendMessage. Con media
   * pueden ser hasta 2 llamadas (media primero, texto+botones después).
   */
  async publishAd(chatId, content, targetUrl, opts = {}) {
    this._ensureConfigured();
    const buttons = Array.isArray(opts.buttons) ? opts.buttons : [];
    const media = Array.isArray(opts.media) ? opts.media : [];
    const text = String(content || '');

    // Build inline_keyboard. If the campaign provided custom buttons we use
    // those (one row each, max 4). Otherwise fall back to the legacy
    // "Ver más" CTA pointing to targetUrl.
    const inlineRows = buttons.length > 0
      ? buttons.slice(0, 4).map((b) => [{ text: String(b.label).slice(0, 64), url: String(b.url) }])
      : (targetUrl ? [[{ text: '👉 Ver más', url: targetUrl }]] : null);
    const reply_markup = inlineRows ? JSON.stringify({ inline_keyboard: inlineRows }) : undefined;

    // ── Branch 1: no media → single sendMessage (legacy behaviour). ──
    if (media.length === 0) {
      return this.sendMessage(chatId, text, {
        parse_mode: 'HTML',
        ...(reply_markup ? { reply_markup } : {}),
      });
    }

    // Telegram caption cap is 1024 chars. Para textos más largos mandamos
    // el media sin caption y el texto completo en un follow-up con botones.
    const captionFits = text.length <= 1024;

    // ── Branch 2: single media ──
    if (media.length === 1) {
      const m = media[0];
      const buttonsPayload = captionFits && reply_markup ? { reply_markup } : {};
      let mediaResult;
      if (m.type === 'video')         mediaResult = await this.sendVideo(chatId, m.url, captionFits ? text : '', buttonsPayload);
      else if (m.type === 'document') mediaResult = await this.sendDocument(chatId, m.url, captionFits ? text : '', buttonsPayload);
      else                            mediaResult = await this.sendPhoto(chatId, m.url, captionFits ? text : '', buttonsPayload);

      // Follow-up text message if caption didn't fit
      if (!captionFits) {
        await this.sendMessage(chatId, text, {
          parse_mode: 'HTML',
          ...(reply_markup ? { reply_markup } : {}),
        });
      }
      return mediaResult;
    }

    // ── Branch 3: album (2-10 media) ──
    // sendMediaGroup no soporta reply_markup, así que el texto y botones van
    // en un sendMessage posterior. Caption del primer item solo si cabe.
    const albumItems = media.slice(0, 10).map((m, i) => ({
      type: m.type === 'video' ? 'video' : m.type === 'document' ? 'document' : 'photo',
      media: m.url,
      ...(i === 0 && captionFits ? { caption: text, parse_mode: 'HTML' } : {}),
    }));
    const albumResult = await this.sendMediaGroup(chatId, albumItems);

    // Follow-up con botones (siempre, porque el álbum no los soporta) y
    // con el texto completo si no cabía en el caption.
    if (reply_markup || !captionFits) {
      await this.sendMessage(chatId, captionFits ? '' : text, {
        parse_mode: 'HTML',
        ...(reply_markup ? { reply_markup } : {}),
      });
    }
    return albumResult;
  }
}

module.exports = TelegramBot;
