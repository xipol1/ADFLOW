const axios = require('axios');

const API_BASE = 'https://api.linkedin.com';
const TIMEOUT = 10000;

class LinkedInAPI {
  constructor(accessToken) {
    this.accessToken = String(accessToken || '').trim();
  }

  get headers() {
    if (!this.accessToken) throw new Error('LinkedIn access token no configurado');
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Fetch user profile via OpenID Connect userinfo endpoint.
   * Requires 'openid' and 'profile' scopes.
   */
  async getProfile() {
    const res = await axios.get(`${API_BASE}/v2/userinfo`, {
      headers: this.headers,
      timeout: TIMEOUT,
    });
    return res.data; // { sub, name, email, picture, ... }
  }

  /**
   * Verify that the access token is valid by fetching the profile.
   */
  async verifyAccess() {
    try {
      const profile = await this.getProfile();
      if (!profile || !profile.sub) {
        return { valid: false, error: 'No se pudo verificar el acceso a LinkedIn' };
      }
      return { valid: true, profile };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }

  /**
   * Fetch organization details.
   * Requires 'r_organization_social' or admin access to the org.
   */
  async getOrganization(orgId) {
    const res = await axios.get(`${API_BASE}/v2/organizations/${orgId}`, {
      headers: this.headers,
      params: { projection: '(id,localizedName,vanityName,logoV2)' },
      timeout: TIMEOUT,
    });
    return res.data;
  }

  /**
   * Fetch follower count for an organization.
   */
  async getOrganizationFollowers(orgId) {
    try {
      const res = await axios.get(
        `${API_BASE}/v2/organizationalEntityFollowerStatistics`,
        {
          headers: this.headers,
          params: { q: 'organizationalEntity', organizationalEntity: `urn:li:organization:${orgId}` },
          timeout: TIMEOUT,
        }
      );
      const stats = res.data?.elements?.[0];
      return stats?.followerCounts?.organicFollowerCount || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Publish a post on LinkedIn (personal or organization).
   * @param {string} authorUrn - e.g. 'urn:li:person:xxx' or 'urn:li:organization:xxx'
   * @param {string} text - Post text
   * @param {string} [targetUrl] - Optional link to include
   */
  async publishPost(authorUrn, text, targetUrl) {
    const body = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: targetUrl ? 'ARTICLE' : 'NONE',
          ...(targetUrl ? {
            media: [{
              status: 'READY',
              originalUrl: targetUrl,
            }],
          } : {}),
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    const res = await axios.post(`${API_BASE}/v2/ugcPosts`, body, {
      headers: this.headers,
      timeout: TIMEOUT,
    });
    return res.data;
  }

  /**
   * Publish an ad formatted post on LinkedIn.
   */
  async publishAd(authorUrn, content, targetUrl) {
    const text = `${content}\n\n${targetUrl ? `Mas info: ${targetUrl}` : ''}`.trim();
    return this.publishPost(authorUrn, text, targetUrl);
  }
}

module.exports = LinkedInAPI;
