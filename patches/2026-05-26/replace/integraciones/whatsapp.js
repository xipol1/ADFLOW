const axios = require('axios');

class WhatsAppAPI {
  constructor(accessToken, phoneNumberId) {
    this.accessToken = String(accessToken || '').trim();
    this.phoneNumberId = String(phoneNumberId || '').trim();
    this.baseURL = this.phoneNumberId
      ? `https://graph.facebook.com/v17.0/${this.phoneNumberId}`
      : '';
    this.timeout = 10000;
  }

  get headers() {
    if (!this.accessToken) throw new Error('WHATSAPP access token no configurado');
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  _ensureConfigured() {
    if (!this.baseURL) throw new Error('WHATSAPP phoneNumberId no configurado');
  }

  async apiCall(body) {
    this._ensureConfigured();
    const url = `${this.baseURL}/messages`;
    const res = await axios.post(url, body, {
      headers: this.headers,
      timeout: this.timeout,
    });
    return res.data;
  }

  async sendTextMessage(to, text) {
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: String(text ?? '') },
    };
    return this.apiCall(payload);
  }

  async sendImageMessage(to, imageUrl, caption = '') {
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: {
        link: String(imageUrl ?? ''),
        ...(caption ? { caption: String(caption) } : {}),
      },
    };
    return this.apiCall(payload);
  }

  async sendVideoMessage(to, videoUrl, caption = '') {
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'video',
      video: {
        link: String(videoUrl ?? ''),
        ...(caption ? { caption: String(caption) } : {}),
      },
    };
    return this.apiCall(payload);
  }

  async sendDocumentMessage(to, documentUrl, caption = '', filename = '') {
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'document',
      document: {
        link: String(documentUrl ?? ''),
        ...(caption ? { caption: String(caption) } : {}),
        ...(filename ? { filename: String(filename) } : {}),
      },
    };
    return this.apiCall(payload);
  }

  async sendTemplateMessage(to, templateName, parameters = []) {
    const components = parameters.length > 0
      ? [{
          type: 'body',
          parameters: parameters.map((p) => ({ type: 'text', text: String(p) })),
        }]
      : [];

    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'es' },
        ...(components.length > 0 ? { components } : {}),
      },
    };
    return this.apiCall(payload);
  }

  async getPhoneNumberInfo(phoneNumberId) {
    if (!this.accessToken) throw new Error('WHATSAPP access token no configurado');
    const id = phoneNumberId || this.phoneNumberId;
    if (!id) throw new Error('WHATSAPP phoneNumberId no configurado');
    const url = `https://graph.facebook.com/v17.0/${id}?fields=verified_name,quality_rating,display_phone_number,status`;
    const res = await axios.get(url, {
      headers: this.headers,
      timeout: this.timeout,
    });
    return res.data;
  }

  // Verifies a Meta access token has *ownership* of the phone number.
  async verifyAccess(accessToken, phoneNumberId) {
    try {
      const token = accessToken || this.accessToken;
      const id = phoneNumberId || this.phoneNumberId;
      if (!token || !id) {
        return { valid: false, error: 'Credenciales incompletas' };
      }
      const headers = { Authorization: `Bearer ${token}` };

      const phoneUrl = `https://graph.facebook.com/v17.0/${id}?fields=verified_name,quality_rating,display_phone_number,whatsapp_business_account`;
      const phoneRes = await axios.get(phoneUrl, { headers, timeout: this.timeout });
      if (!phoneRes.data?.verified_name) {
        return { valid: false, error: 'No se pudo verificar el acceso al número' };
      }

      const wabaId = phoneRes.data?.whatsapp_business_account?.id;
      if (!wabaId) {
        return {
          valid: false,
          error: 'Token sin acceso a la WABA del número (no se puede verificar ownership)',
        };
      }
      try {
        await axios.get(
          `https://graph.facebook.com/v17.0/${wabaId}?fields=id`,
          { headers, timeout: this.timeout },
        );
      } catch (wabaErr) {
        return {
          valid: false,
          error: 'El token no administra la WABA propietaria del número.',
        };
      }

      return { valid: true, phoneInfo: phoneRes.data, wabaId };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }

  /**
   * Publica una campaña en WhatsApp.
   *
   * Acepta el payload rico (media[], buttons[], format) y mapea a la API de
   * WhatsApp Cloud. Limitaciones reales respecto a Telegram:
   *
   *   1. `cta_url` interactive sólo admite **un** URL button. Si la campaña
   *      trae varios, el primero va al botón y los demás se anexan al body
   *      como texto plano ("👉 Comprar: https://...").
   *   2. Los `button` interactive (reply) son postback puro — no abren
   *      URLs. Por eso siempre preferimos `cta_url`.
   *   3. No hay álbumes nativos: 2+ media se mandan como N mensajes
   *      consecutivos y el texto+botón viene en un follow-up.
   *   4. Caption en header.image/video/document tiene el mismo cap de
   *      1024 chars que Telegram. Para textos largos: media sin caption +
   *      mensaje de texto separado.
   *
   * Devuelve el resultado del PRIMER mensaje enviado (el "principal" desde
   * el punto de vista del receptor).
   */
  async publishAd(to, content, targetUrl, opts = {}) {
    const buttons = Array.isArray(opts.buttons) ? opts.buttons : [];
    const media = Array.isArray(opts.media) ? opts.media : [];
    const text = String(content || '');

    // Botón principal: si vienen buttons[], el primero. Si no, "Ver más" legacy.
    const primaryBtn = buttons[0] || (targetUrl ? { label: 'Ver más', url: targetUrl } : null);
    const extraBtns = buttons.slice(1);

    // Botones extra anexados al body como texto (WhatsApp auto-linkea).
    const bodyText = extraBtns.length > 0
      ? `${text}\n\n${extraBtns.map((b) => `👉 ${b.label}: ${b.url}`).join('\n')}`
      : text;

    const CAPTION_CAP = 1024;
    const captionFits = bodyText.length <= CAPTION_CAP;

    // Helper: construye el interactive cta_url, opcionalmente con header media.
    const buildInteractive = (headerMedia) => {
      const interactive = {
        type: 'cta_url',
        body: { text: bodyText.slice(0, CAPTION_CAP) },
        action: {
          name: 'cta_url',
          parameters: {
            display_text: String(primaryBtn.label || 'Ver más').slice(0, 20),
            url: String(primaryBtn.url),
          },
        },
      };
      if (headerMedia) {
        const mediaType = headerMedia.type === 'video' ? 'video'
          : headerMedia.type === 'document' ? 'document'
          : 'image';
        interactive.header = {
          type: mediaType,
          [mediaType]: { link: headerMedia.url },
        };
      }
      return {
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive,
      };
    };

    // ── Branch 1: no media ───────────────────────────────────────────
    if (media.length === 0) {
      if (!primaryBtn) {
        return this.sendTextMessage(to, bodyText);
      }
      if (!captionFits) {
        // Texto largo: mandamos primero el texto completo plano,
        // después el interactive con un teaser corto + botón.
        await this.sendTextMessage(to, bodyText);
        return this.apiCall(buildInteractive(null));
      }
      return this.apiCall(buildInteractive(null));
    }

    // ── Branch 2: single media ───────────────────────────────────────
    if (media.length === 1) {
      const m = media[0];
      if (primaryBtn && captionFits) {
        return this.apiCall(buildInteractive(m));
      }
      // Texto largo o sin botón: 2 mensajes
      let firstResult;
      if (m.type === 'video')         firstResult = await this.sendVideoMessage(to, m.url, captionFits ? bodyText : '');
      else if (m.type === 'document') firstResult = await this.sendDocumentMessage(to, m.url, captionFits ? bodyText : '');
      else                            firstResult = await this.sendImageMessage(to, m.url, captionFits ? bodyText : '');
      if (!captionFits) {
        await this.sendTextMessage(to, bodyText);
      }
      if (primaryBtn) {
        await this.apiCall(buildInteractive(null));
      }
      return firstResult;
    }

    // ── Branch 3: 2+ media (sin álbum nativo) ───────────────────────
    const sendItem = (m) => {
      if (m.type === 'video')         return this.sendVideoMessage(to, m.url, '');
      if (m.type === 'document')      return this.sendDocumentMessage(to, m.url, '');
      return this.sendImageMessage(to, m.url, '');
    };
    const firstMediaResult = await sendItem(media[0]);
    for (const m of media.slice(1)) {
      await sendItem(m);
    }
    if (primaryBtn) {
      await this.apiCall(buildInteractive(null));
    } else if (bodyText.trim()) {
      await this.sendTextMessage(to, bodyText);
    }
    return firstMediaResult;
  }

  async sendInteractiveMessage(to, content, buttons = []) {
    const actionButtons = buttons.map((btn, idx) => ({
      type: 'reply',
      reply: { id: btn.id || `btn_${idx}`, title: String(btn.title || '').substring(0, 20) },
    }));

    const body = {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: content },
        action: { buttons: actionButtons.slice(0, 3) }, // WhatsApp max 3 buttons
      },
    };
    return this.apiCall(body);
  }
}

module.exports = WhatsAppAPI;
