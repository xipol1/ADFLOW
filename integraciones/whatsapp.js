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

  async verifyAccess(accessToken, phoneNumberId) {
    try {
      const token = accessToken || this.accessToken;
      const id = phoneNumberId || this.phoneNumberId;
      if (!token || !id) {
        return { valid: false, error: 'Credenciales incompletas' };
      }
      const url = `https://graph.facebook.com/v17.0/${id}?fields=verified_name,quality_rating`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: this.timeout,
      });
      if (res.data && res.data.verified_name) {
        return { valid: true, phoneInfo: res.data };
      }
      return { valid: false, error: 'No se pudo verificar el acceso' };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }

  async publishAd(to, content, targetUrl) {
    const body = {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'cta_url',
        body: { text: content },
        action: {
          name: 'cta_url',
          parameters: { display_text: 'Ver m\u00e1s', url: targetUrl },
        },
      },
    };
    return this.apiCall(body);
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
