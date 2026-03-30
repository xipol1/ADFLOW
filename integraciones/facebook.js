const axios = require('axios');

const GRAPH_BASE = 'https://graph.facebook.com/v17.0';
const TIMEOUT = 10000;

class FacebookAPI {
  /**
   * Get page info (name, followers, likes, etc.)
   */
  async getPageInfo(accessToken, pageId) {
    if (!accessToken || !pageId) throw new Error('accessToken y pageId requeridos');
    const url = `${GRAPH_BASE}/${pageId}?fields=id,name,fan_count,followers_count,about,category,link,picture&access_token=${accessToken}`;
    const res = await axios.get(url, { timeout: TIMEOUT });
    return res.data;
  }

  /**
   * Get page insights/analytics
   * @param {string[]} metrics - e.g. ['page_impressions', 'page_engaged_users', 'page_fans']
   * @param {string} period - 'day', 'week', 'days_28', 'lifetime'
   */
  async getPageInsights(accessToken, pageId, metrics = [], period = 'day') {
    if (!accessToken || !pageId) throw new Error('accessToken y pageId requeridos');
    const metricStr = metrics.length > 0
      ? metrics.join(',')
      : 'page_impressions,page_engaged_users,page_fans';
    const url = `${GRAPH_BASE}/${pageId}/insights?metric=${metricStr}&period=${period}&access_token=${accessToken}`;
    const res = await axios.get(url, { timeout: TIMEOUT });
    return res.data;
  }

  /**
   * Get recent page posts with engagement data
   */
  async getPagePosts(accessToken, pageId, limit = 25) {
    if (!accessToken || !pageId) throw new Error('accessToken y pageId requeridos');
    const url = `${GRAPH_BASE}/${pageId}/posts?fields=id,message,created_time,shares,likes.summary(true),comments.summary(true)&limit=${limit}&access_token=${accessToken}`;
    const res = await axios.get(url, { timeout: TIMEOUT });
    return res.data;
  }

  /**
   * Verify that the page access token is valid
   */
  async verifyAccess(accessToken, pageId) {
    try {
      if (!accessToken || !pageId) return { valid: false, error: 'Credenciales incompletas' };
      const page = await this.getPageInfo(accessToken, pageId);
      if (page && page.id) {
        return { valid: true, page: { id: page.id, name: page.name, followers: page.followers_count } };
      }
      return { valid: false, error: 'Token inv\u00e1lido o sin acceso a la p\u00e1gina' };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }

  /**
   * Publish a post to the page
   */
  async publishPost(accessToken, pageId, message, link = null) {
    if (!accessToken || !pageId) throw new Error('accessToken y pageId requeridos');
    const url = `${GRAPH_BASE}/${pageId}/feed`;
    const payload = { message, access_token: accessToken };
    if (link) payload.link = link;
    const res = await axios.post(url, payload, { timeout: TIMEOUT });
    return res.data;
  }
}

module.exports = FacebookAPI;
