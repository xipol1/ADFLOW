const axios = require('axios');

class DiscordAPI {
  constructor(botToken) {
    this.botToken = String(botToken || '').trim();
    this.baseURL = 'https://discord.com/api/v10';
  }

  get headers() {
    if (!this.botToken) throw new Error('DISCORD_BOT_TOKEN no configurado');
    return {
      Authorization: `Bot ${this.botToken}`
    };
  }

  async getGuild(guildId) {
    const url = `${this.baseURL}/guilds/${guildId}`;
    const res = await axios.get(url, {
      headers: this.headers,
      params: { with_counts: true }
    });
    return res.data;
  }
}

module.exports = DiscordAPI;

