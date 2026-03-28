const axios = require('axios');

class TelegramAPI {
  constructor(botToken) {
    this.botToken = String(botToken || '').trim();
    this.baseURL = this.botToken ? `https://api.telegram.org/bot${this.botToken}` : '';
  }

  async getChatMemberCount(chatId) {
    if (!this.baseURL) throw new Error('TELEGRAM_BOT_TOKEN no configurado');
    const url = `${this.baseURL}/getChatMemberCount`;
    const res = await axios.get(url, { params: { chat_id: chatId } });
    return res.data;
  }

  async sendMessage(chatId, text, options = {}) {
    if (!this.baseURL) throw new Error('TELEGRAM_BOT_TOKEN no configurado');
    const url = `${this.baseURL}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text: String(text ?? ''),
      ...options
    };
    const res = await axios.post(url, payload);
    return res.data;
  }

  async sendPhoto(chatId, photo, options = {}) {
    if (!this.baseURL) throw new Error('TELEGRAM_BOT_TOKEN no configurado');
    const url = `${this.baseURL}/sendPhoto`;
    const payload = {
      chat_id: chatId,
      photo,
      ...options
    };
    const res = await axios.post(url, payload);
    return res.data;
  }
}

module.exports = TelegramAPI;

