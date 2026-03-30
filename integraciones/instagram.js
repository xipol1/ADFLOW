const axios = require('axios');

const GRAPH_BASE = 'https://graph.instagram.com';
const TIMEOUT = 10000;

class InstagramAPI {
  /**
   * Get business account profile info
   */
  async getProfile(accessToken) {
    if (!accessToken) throw new Error('Instagram access token no configurado');
    const url = `${GRAPH_BASE}/me?fields=id,name,biography,followers_count,media_count,profile_picture_url&access_token=${accessToken}`;
    const res = await axios.get(url, { timeout: TIMEOUT });
    return res.data;
  }

  /**
   * Get insights for a specific media object
   */
  async getMediaInsights(accessToken, mediaId) {
    if (!accessToken || !mediaId) throw new Error('accessToken y mediaId requeridos');
    const url = `${GRAPH_BASE}/${mediaId}/insights?metric=reach,impressions,engagement&access_token=${accessToken}`;
    const res = await axios.get(url, { timeout: TIMEOUT });
    return res.data;
  }

  /**
   * Get account-level insights for a period
   * @param {string} period - 'day', 'week', 'days_28', 'lifetime'
   */
  async getAccountInsights(accessToken, period = 'day') {
    if (!accessToken) throw new Error('Instagram access token no configurado');
    const url = `${GRAPH_BASE}/me/insights?metric=follower_count,impressions,reach&period=${period}&access_token=${accessToken}`;
    const res = await axios.get(url, { timeout: TIMEOUT });
    return res.data;
  }

  /**
   * Get recent media with engagement data
   */
  async getRecentMedia(accessToken, limit = 25) {
    if (!accessToken) throw new Error('Instagram access token no configurado');
    const url = `${GRAPH_BASE}/me/media?fields=id,caption,media_type,timestamp,like_count,comments_count,permalink&limit=${limit}&access_token=${accessToken}`;
    const res = await axios.get(url, { timeout: TIMEOUT });
    return res.data;
  }

  /**
   * Verify that the access token is valid
   */
  async verifyAccess(accessToken) {
    try {
      if (!accessToken) return { valid: false, error: 'Token no proporcionado' };
      const profile = await this.getProfile(accessToken);
      if (profile && profile.id) {
        return { valid: true, profile };
      }
      return { valid: false, error: 'Token inv\u00e1lido o expirado' };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }

  /**
   * Calculate real engagement rate from recent posts
   */
  async calculateEngagement(accessToken) {
    try {
      const [profile, mediaRes] = await Promise.all([
        this.getProfile(accessToken),
        this.getRecentMedia(accessToken, 25),
      ]);

      const followers = profile.followers_count || 0;
      const posts = mediaRes.data || [];

      if (followers === 0 || posts.length === 0) {
        return { engagementRate: 0, followers, postsAnalyzed: 0 };
      }

      let totalLikes = 0;
      let totalComments = 0;
      for (const post of posts) {
        totalLikes += post.like_count || 0;
        totalComments += post.comments_count || 0;
      }

      const avgInteractions = (totalLikes + totalComments) / posts.length;
      const engagementRate = avgInteractions / followers;

      return {
        engagementRate: Math.min(1, engagementRate),
        followers,
        postsAnalyzed: posts.length,
        avgLikes: Math.round(totalLikes / posts.length),
        avgComments: Math.round(totalComments / posts.length),
      };
    } catch (err) {
      return { engagementRate: 0, error: err.message };
    }
  }
}

module.exports = InstagramAPI;
