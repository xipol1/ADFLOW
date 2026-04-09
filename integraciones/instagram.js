const axios = require('axios');

const GRAPH_API = 'https://graph.facebook.com/v19.0';
const GRAPH_BASE = 'https://graph.instagram.com';
const OAUTH_URL = 'https://api.instagram.com/oauth/authorize';
const TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const LONG_LIVED_URL = `${GRAPH_API}/oauth/access_token`;
const TIMEOUT = 15000;

class InstagramAPI {
  constructor(accessToken) {
    this.token = accessToken || null;
  }

  _getToken(accessToken) {
    return accessToken || this.token;
  }

  async _req(path, params = {}, token) {
    const effectiveToken = token || this.token;
    try {
      const { data } = await axios.get(`${GRAPH_API}${path}`, {
        params: { access_token: effectiveToken, ...params },
        timeout: TIMEOUT,
      });
      if (data.error) throw new Error(data.error.message);
      return data;
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message;
      throw new Error(`Instagram [${path}]: ${msg}`);
    }
  }

  // ─── OAuth ─────────────────────────────────────────────────────────────────

  static generateAuthUrl(appId, redirectUri, state) {
    const scopes = [
      'instagram_basic',
      'instagram_manage_insights',
      'pages_show_list',
      'pages_read_engagement',
    ].join(',');

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      scope: scopes,
      response_type: 'code',
      state,
    });

    return `${OAUTH_URL}?${params.toString()}`;
  }

  static async exchangeCodeForToken(code, appId, appSecret, redirectUri) {
    const { data } = await axios.post(TOKEN_URL, new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (data.error) throw new Error(data.error_message || 'Token exchange failed');
    return data;
  }

  static async getLongLivedToken(shortToken, appSecret) {
    const { data } = await axios.get(LONG_LIVED_URL, {
      params: {
        grant_type: 'ig_exchange_token',
        client_secret: appSecret,
        access_token: shortToken,
      },
    });

    if (data.error) throw new Error(data.error.message);
    return {
      accessToken: data.access_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  static async refreshLongLivedToken(longLivedToken) {
    const { data } = await axios.get(LONG_LIVED_URL, {
      params: {
        grant_type: 'ig_refresh_token',
        access_token: longLivedToken,
      },
    });

    if (data.error) throw new Error(data.error.message);
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  // ─── Perfil e información del canal ───────────────────────────────────────

  async getProfile(accessToken) {
    const token = this._getToken(accessToken);
    if (!token) throw new Error('Instagram access token no configurado');
    const url = `${GRAPH_BASE}/me?fields=id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website&access_token=${token}`;
    const res = await axios.get(url, { timeout: TIMEOUT });
    return res.data;
  }

  async getLinkedPages() {
    return this._req('/me/accounts', {
      fields: 'id,name,instagram_business_account',
    });
  }

  // ─── Métricas del canal ────────────────────────────────────────────────────

  async fetchChannelMetrics(igUserId) {
    const profile = await this._req(`/${igUserId}`, {
      fields: 'id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url',
    });

    const accountInsights = await this._req(`/${igUserId}/insights`, {
      metric: 'reach,impressions,profile_views,website_clicks,email_contacts',
      period: 'day',
      since: Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000),
      until: Math.floor(Date.now() / 1000),
    }).catch(() => null);

    const demographics = await this.getAudienceDemographics(igUserId).catch(() => null);

    const followerGrowth = await this._req(`/${igUserId}/insights`, {
      metric: 'follower_count',
      period: 'day',
      since: Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000),
      until: Math.floor(Date.now() / 1000),
    }).catch(() => null);

    const onlineFollowers = await this._req(`/${igUserId}/insights`, {
      metric: 'online_followers',
      period: 'lifetime',
    }).catch(() => null);

    return {
      igUserId,
      username: profile.username,
      nombre: profile.name,
      biografia: profile.biography || null,
      seguidores: profile.followers_count,
      siguiendo: profile.follows_count,
      numPosts: profile.media_count,
      fotoPerfil: profile.profile_picture_url || null,
      insights30d: accountInsights?.data ? this._parseInsightMetrics(accountInsights.data) : null,
      demografia: demographics,
      crecimientoSeguidores: followerGrowth?.data || null,
      horasActivas: onlineFollowers?.data?.[0]?.values || null,
      timestamp: new Date(),
    };
  }

  async getAudienceDemographics(igUserId) {
    const [ageGender, countries, cities] = await Promise.all([
      this._req(`/${igUserId}/insights`, { metric: 'audience_gender_age', period: 'lifetime' }),
      this._req(`/${igUserId}/insights`, { metric: 'audience_country', period: 'lifetime' }),
      this._req(`/${igUserId}/insights`, { metric: 'audience_city', period: 'lifetime' }),
    ]);

    const parseBreakdown = (data) => {
      if (!data?.data?.[0]?.values?.[0]?.value) return null;
      return data.data[0].values[0].value;
    };

    return {
      edadGenero: parseBreakdown(ageGender),
      paises: parseBreakdown(countries),
      ciudades: parseBreakdown(cities),
    };
  }

  // ─── Métricas por post ────────────────────────────────────────────────────

  async getRecentMedia(accessTokenOrUserId, limitOrNothing) {
    // Backward compat: old code calls getRecentMedia(accessToken, limit)
    // New code calls getRecentMedia(igUserId, limit) with this.token set
    if (this.token) {
      // New-style: first arg is igUserId
      return this._req(`/${accessTokenOrUserId}/media`, {
        fields: 'id,timestamp,media_type,permalink,like_count,comments_count',
        limit: limitOrNothing || 20,
      });
    }
    // Legacy: first arg is accessToken
    const token = accessTokenOrUserId;
    const limit = limitOrNothing || 25;
    const url = `${GRAPH_BASE}/me/media?fields=id,caption,media_type,timestamp,like_count,comments_count,permalink&limit=${limit}&access_token=${token}`;
    const res = await axios.get(url, { timeout: TIMEOUT });
    return res.data;
  }

  async getPostMetrics(mediaId) {
    const [basicInfo, insights] = await Promise.all([
      this._req(`/${mediaId}`, {
        fields: 'id,timestamp,media_type,permalink,like_count,comments_count,shares_count',
      }),
      this._req(`/${mediaId}/insights`, {
        metric: 'reach,impressions,saved,video_views,shares,plays',
      }).catch(() => null),
    ]);

    const metricsMap = {};
    if (insights?.data) {
      for (const m of insights.data) {
        metricsMap[m.name] = m.values?.[0]?.value ?? m.value ?? 0;
      }
    }

    return {
      mediaId,
      tipo: basicInfo.media_type,
      permalink: basicInfo.permalink,
      timestamp: basicInfo.timestamp,
      likes: basicInfo.like_count || 0,
      comentarios: basicInfo.comments_count || 0,
      shares: basicInfo.shares_count || metricsMap.shares || 0,
      reach: metricsMap.reach || 0,
      impresiones: metricsMap.impressions || 0,
      guardados: metricsMap.saved || 0,
      videoViews: metricsMap.video_views || metricsMap.plays || 0,
      engagementRate: metricsMap.reach
        ? Math.round(
            ((basicInfo.like_count + basicInfo.comments_count + (metricsMap.saved || 0)) /
              metricsMap.reach) *
              10000
          ) / 100
        : null,
    };
  }

  async findCampaignPost(igUserId, trackingUrl) {
    const media = await this.getRecentMedia(igUserId, 50);
    const posts = media.data || [];

    for (const post of posts) {
      const detail = await this._req(`/${post.id}`, {
        fields: 'id,caption,timestamp,permalink',
      });
      if (detail.caption && detail.caption.includes(trackingUrl)) {
        return detail;
      }
    }
    return null;
  }

  // ─── Utilidades ───────────────────────────────────────────────────────────

  _parseInsightMetrics(insightData) {
    const result = {};
    for (const metric of insightData) {
      const values = metric.values || [];
      result[metric.name] = values.reduce((sum, v) => sum + (v.value || 0), 0);
    }
    return result;
  }

  async verifyToken() {
    try {
      const debug = await axios.get(`${GRAPH_API}/debug_token`, {
        params: {
          input_token: this.token,
          access_token: this.token,
        },
      });

      const d = debug.data?.data;
      const requiredScopes = ['instagram_basic', 'instagram_manage_insights'];
      const hasScopes = requiredScopes.every(s => d?.scopes?.includes(s));

      return {
        isValid: d?.is_valid || false,
        userId: d?.user_id,
        expiresAt: d?.expires_at ? new Date(d.expires_at * 1000) : null,
        scopes: d?.scopes || [],
        hasRequiredScopes: hasScopes,
        missingScopes: requiredScopes.filter(s => !d?.scopes?.includes(s)),
      };
    } catch {
      return { isValid: false };
    }
  }

  // ─── Backward-compatible methods (legacy API) ─────────────────────────────

  async getMediaInsights(accessToken, mediaId) {
    const token = this._getToken(accessToken);
    if (!token || !mediaId) throw new Error('accessToken y mediaId requeridos');
    const url = `${GRAPH_BASE}/${mediaId}/insights?metric=reach,impressions,engagement&access_token=${token}`;
    const res = await axios.get(url, { timeout: TIMEOUT });
    return res.data;
  }

  async getAccountInsights(accessToken, period = 'day') {
    const token = this._getToken(accessToken);
    if (!token) throw new Error('Instagram access token no configurado');
    const url = `${GRAPH_BASE}/me/insights?metric=follower_count,impressions,reach&period=${period}&access_token=${token}`;
    const res = await axios.get(url, { timeout: TIMEOUT });
    return res.data;
  }

  async verifyAccess(accessToken) {
    try {
      const token = this._getToken(accessToken);
      if (!token) return { valid: false, error: 'Token no proporcionado' };
      const profile = await this.getProfile(token);
      if (profile && profile.id) {
        return { valid: true, profile };
      }
      return { valid: false, error: 'Token inválido o expirado' };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }

  async calculateEngagement(accessToken) {
    try {
      const token = this._getToken(accessToken);
      const [profile, mediaRes] = await Promise.all([
        this.getProfile(token),
        this.getRecentMedia(token, 25),
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
