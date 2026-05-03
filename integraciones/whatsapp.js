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

  // Verifies a Meta access token has *ownership* of the phone number, not
  // just read access. Two-step check:
  //
  //   1. GET /{phoneNumberId}?fields=...,whatsapp_business_account
  //      Meta only populates `whatsapp_business_account` when the caller's
  //      token has admin scope on the parent WABA — a token that can read
  //      a phone's `verified_name` but not its WABA edge is suspicious.
  //   2. GET /{wabaId}?fields=id  — confirms the token can actually reach
  //      the parent WABA. If 403, ownership cross-check fails.
  //
  // This makes a stolen/leaked read-only token insufficient to claim the
  // channel, raising the bar above "API call returns 200".
  async verifyAccess(accessToken, phoneNumberId) {
    try {
      const token = accessToken || this.accessToken;
      const id = phoneNumberId || this.phoneNumberId;
      if (!token || !id) {
        return { valid: false, error: 'Credenciales incompletas' };
      }
      const headers = { Authorization: `Bearer ${token}` };

      // Step 1: phone fields including parent WABA
      const phoneUrl = `https://graph.facebook.com/v17.0/${id}?fields=verified_name,quality_rating,display_phone_number,whatsapp_business_account`;
      const phoneRes = await axios.get(phoneUrl, { headers, timeout: this.timeout });
      if (!phoneRes.data?.verified_name) {
        return { valid: false, error: 'No se pudo verificar el acceso al número' };
      }

      // Step 2: WABA cross-check (ownership signal)
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
