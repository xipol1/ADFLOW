const axios = require('axios');

class WhatsAppAPI {
  constructor(accessToken, phoneNumberId) {
    this.accessToken = String(accessToken || '').trim();
    this.phoneNumberId = String(phoneNumberId || '').trim();
    this.baseURL = this.phoneNumberId ? `https://graph.facebook.com/v17.0/${this.phoneNumberId}` : '';
  }

  get headers() {
    if (!this.accessToken) throw new Error('WHATSAPP access token no configurado');
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  async sendTextMessage(to, text) {
    if (!this.baseURL) throw new Error('WHATSAPP phoneNumberId no configurado');
    const url = `${this.baseURL}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: String(text ?? '') }
    };
    const res = await axios.post(url, payload, { headers: this.headers });
    return res.data;
  }

  async sendImageMessage(to, imageUrl, caption = '') {
    if (!this.baseURL) throw new Error('WHATSAPP phoneNumberId no configurado');
    const url = `${this.baseURL}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: {
        link: String(imageUrl ?? ''),
        ...(caption ? { caption: String(caption) } : {})
      }
    };
    const res = await axios.post(url, payload, { headers: this.headers });
    return res.data;
  }
}

module.exports = WhatsAppAPI;

