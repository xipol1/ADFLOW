const axios = require('axios');

class DiscordAPI {
  constructor(botToken) {
    this.botToken = String(botToken || '').trim();
    this.baseURL = 'https://discord.com/api/v10';
    this.timeout = 10000;
  }

  get headers() {
    if (!this.botToken) throw new Error('DISCORD_BOT_TOKEN no configurado');
    return {
      Authorization: `Bot ${this.botToken}`,
      'Content-Type': 'application/json',
    };
  }

  async apiCall(path, method = 'GET', body = null) {
    const url = `${this.baseURL}${path}`;
    const config = {
      method,
      url,
      headers: this.headers,
      timeout: this.timeout,
    };
    if (body) config.data = body;
    const res = await axios(config);
    return res.data;
  }

  async getGuild(guildId) {
    return this.apiCall(`/guilds/${guildId}?with_counts=true`);
  }

  async getGuildChannels(guildId) {
    return this.apiCall(`/guilds/${guildId}/channels`);
  }

  async sendMessageToChannel(channelId, content) {
    const body = typeof content === 'string' ? { content } : content;
    return this.apiCall(`/channels/${channelId}/messages`, 'POST', body);
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
      return { valid: true, guild: { name: guild.name, id: guild.id, memberCount: guild.approximate_member_count } };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }

  async publishAd(channelId, content, targetUrl) {
    const body = {
      embeds: [{
        description: content,
        color: 0x6366f1,
        fields: [{ name: '\ud83d\udd17 Enlace', value: `[Ver m\u00e1s](${targetUrl})` }],
        footer: { text: 'Publicidad via ADFLOW' },
        timestamp: new Date().toISOString(),
      }],
    };
    return this.apiCall(`/channels/${channelId}/messages`, 'POST', body);
  }
}

module.exports = DiscordAPI;
