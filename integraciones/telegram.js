const axios = require('axios');

class TelegramAPI {
  constructor(botToken) {
    this.botToken = String(botToken || '').trim();
    this.baseURL = this.botToken ? `https://api.telegram.org/bot${this.botToken}` : '';
    this.timeout = 10000;
  }

  _ensureConfigured() {
    if (!this.baseURL) throw new Error('TELEGRAM_BOT_TOKEN no configurado');
  }

  async getChat(chatId) {
    this._ensureConfigured();
    const url = `${this.baseURL}/getChat`;
    const res = await axios.get(url, {
      params: { chat_id: chatId },
      timeout: this.timeout,
    });
    return res.data;
  }

  async getChatAdministrators(chatId) {
    this._ensureConfigured();
    const url = `${this.baseURL}/getChatAdministrators`;
    const res = await axios.get(url, {
      params: { chat_id: chatId },
      timeout: this.timeout,
    });
    return res.data;
  }

  async getChatMemberCount(chatId) {
    this._ensureConfigured();
    const url = `${this.baseURL}/getChatMemberCount`;
    const res = await axios.get(url, {
      params: { chat_id: chatId },
      timeout: this.timeout,
    });
    return res.data;
  }

  async sendMessage(chatId, text, options = {}) {
    this._ensureConfigured();
    const url = `${this.baseURL}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text: String(text ?? ''),
      ...options,
    };
    const res = await axios.post(url, payload, { timeout: this.timeout });
    return res.data;
  }

  async sendPhoto(chatId, photo, options = {}) {
    this._ensureConfigured();
    const url = `${this.baseURL}/sendPhoto`;
    const payload = {
      chat_id: chatId,
      photo,
      ...options,
    };
    const res = await axios.post(url, payload, { timeout: this.timeout });
    return res.data;
  }

  async getUpdates(offset = 0) {
    this._ensureConfigured();
    const url = `${this.baseURL}/getUpdates`;
    const res = await axios.get(url, {
      params: { offset, timeout: 30 },
      timeout: 35000,
    });
    return res.data;
  }

  async verifyBotAccess(chatId) {
    try {
      this._ensureConfigured();
      const chatInfo = await this.getChat(chatId);
      if (!chatInfo || !chatInfo.ok) {
        return { valid: false, error: 'No se pudo obtener info del chat' };
      }
      return { valid: true, chat: chatInfo.result };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }

  async publishAd(chatId, content, targetUrl) {
    this._ensureConfigured();
    const text = content;
    const options = {
      parse_mode: 'HTML',
      reply_markup: JSON.stringify({
        inline_keyboard: [[{ text: '\ud83d\udc49 Ver m\u00e1s', url: targetUrl }]],
      }),
    };
    return this.sendMessage(chatId, text, options);
  }
}

module.exports = TelegramAPI;
