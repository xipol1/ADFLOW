/**
 * Meta OAuth Service — Facebook Login for Business
 *
 * Handles the full OAuth 2.0 flow for Meta platforms:
 * - Authorization URL generation
 * - Code → short-lived token exchange
 * - Short-lived → long-lived token exchange (60 days)
 * - Fetch user's Facebook Pages (with page access tokens)
 * - Fetch linked Instagram Business accounts
 * - Fetch WhatsApp Business accounts
 * - Token refresh
 * - Token debug/validation
 */

const axios = require('axios');
const config = require('../config/config');

const GRAPH_BASE = `https://graph.facebook.com/${config.meta.graphApiVersion}`;
const OAUTH_BASE = `https://www.facebook.com/${config.meta.graphApiVersion}/dialog/oauth`;
const TIMEOUT = 15000;

/**
 * Build the Meta OAuth authorization URL.
 * @param {string} state - Signed state parameter (JWT) for CSRF protection
 * @returns {string} The full authorization URL to redirect the user to
 */
function getAuthorizationUrl(state) {
  const params = new URLSearchParams({
    client_id: config.meta.appId,
    redirect_uri: getCallbackUrl(),
    state,
    scope: config.meta.scopes,
    response_type: 'code',
  });
  return `${OAUTH_BASE}?${params.toString()}`;
}

/**
 * Exchange an authorization code for a short-lived access token.
 * @param {string} code - Authorization code from Meta callback
 * @returns {Promise<{access_token: string, token_type: string, expires_in: number}>}
 */
async function exchangeCodeForToken(code) {
  const res = await axios.get(`${GRAPH_BASE}/oauth/access_token`, {
    params: {
      client_id: config.meta.appId,
      client_secret: config.meta.appSecret,
      redirect_uri: getCallbackUrl(),
      code,
    },
    timeout: TIMEOUT,
  });
  return res.data;
}

/**
 * Exchange a short-lived token for a long-lived token (~60 days).
 * @param {string} shortLivedToken
 * @returns {Promise<{access_token: string, token_type: string, expires_in: number}>}
 */
async function exchangeForLongLivedToken(shortLivedToken) {
  const res = await axios.get(`${GRAPH_BASE}/oauth/access_token`, {
    params: {
      grant_type: 'fb_exchange_token',
      client_id: config.meta.appId,
      client_secret: config.meta.appSecret,
      fb_exchange_token: shortLivedToken,
    },
    timeout: TIMEOUT,
  });
  return res.data;
}

/**
 * Fetch the user's Facebook Pages with page-level access tokens.
 * When the user token is long-lived, page tokens are also long-lived and never expire.
 * @param {string} userAccessToken
 * @returns {Promise<Array<{id, name, access_token, category, fan_count, followers_count}>>}
 */
async function fetchUserPages(userAccessToken) {
  const res = await axios.get(`${GRAPH_BASE}/me/accounts`, {
    params: {
      fields: 'id,name,access_token,category,fan_count,followers_count,picture',
      access_token: userAccessToken,
      limit: 100,
    },
    timeout: TIMEOUT,
  });
  return res.data?.data || [];
}

/**
 * Fetch the Instagram Business Account linked to a Facebook Page.
 * @param {string} pageId
 * @param {string} pageAccessToken
 * @returns {Promise<object|null>} Instagram business account data or null
 */
async function fetchInstagramBusinessAccount(pageId, pageAccessToken) {
  try {
    const res = await axios.get(`${GRAPH_BASE}/${pageId}`, {
      params: {
        fields: 'instagram_business_account{id,name,username,followers_count,profile_picture_url,media_count}',
        access_token: pageAccessToken,
      },
      timeout: TIMEOUT,
    });
    return res.data?.instagram_business_account || null;
  } catch {
    return null;
  }
}

/**
 * Fetch WhatsApp Business accounts linked to the user's businesses.
 * @param {string} userAccessToken
 * @returns {Promise<Array>} Array of WA business accounts with phone numbers
 */
async function fetchWhatsAppBusinessAccounts(userAccessToken) {
  try {
    const res = await axios.get(`${GRAPH_BASE}/me/businesses`, {
      params: {
        fields: 'id,name,owned_whatsapp_business_accounts{id,name,phone_numbers{display_phone_number,verified_name,id,quality_rating}}',
        access_token: userAccessToken,
      },
      timeout: TIMEOUT,
    });

    const businesses = res.data?.data || [];
    const waAccounts = [];

    for (const biz of businesses) {
      const owned = biz.owned_whatsapp_business_accounts?.data || [];
      for (const wa of owned) {
        const phones = wa.phone_numbers?.data || [];
        for (const phone of phones) {
          waAccounts.push({
            businessId: biz.id,
            businessName: biz.name,
            wabaId: wa.id,
            wabaName: wa.name,
            phoneNumberId: phone.id,
            displayPhoneNumber: phone.display_phone_number,
            verifiedName: phone.verified_name,
            qualityRating: phone.quality_rating,
          });
        }
      }
    }

    return waAccounts;
  } catch {
    // WhatsApp Business access is optional — many users won't have it
    return [];
  }
}

/**
 * Fetch basic user profile from Meta.
 * @param {string} accessToken
 * @returns {Promise<{id: string, name: string, email: string}>}
 */
async function fetchUserProfile(accessToken) {
  const res = await axios.get(`${GRAPH_BASE}/me`, {
    params: {
      fields: 'id,name,email',
      access_token: accessToken,
    },
    timeout: TIMEOUT,
  });
  return res.data;
}

/**
 * Refresh a long-lived token. Meta allows refreshing tokens that haven't expired yet.
 * The new token is valid for another 60 days.
 * @param {string} currentLongLivedToken
 * @returns {Promise<{access_token: string, token_type: string, expires_in: number}>}
 */
async function refreshLongLivedToken(currentLongLivedToken) {
  // Meta's refresh mechanism is the same as the exchange
  return exchangeForLongLivedToken(currentLongLivedToken);
}

/**
 * Debug/validate a token. Returns token metadata including expiry and scopes.
 * @param {string} inputToken
 * @returns {Promise<object>} Token debug info
 */
async function debugToken(inputToken) {
  const appToken = `${config.meta.appId}|${config.meta.appSecret}`;
  const res = await axios.get(`${GRAPH_BASE}/debug_token`, {
    params: {
      input_token: inputToken,
      access_token: appToken,
    },
    timeout: TIMEOUT,
  });
  return res.data?.data || {};
}

/**
 * Get the full callback URL for Meta OAuth.
 * @returns {string}
 */
function getCallbackUrl() {
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${config.server.port}`;
  return `${backendUrl}${config.meta.oauthCallbackPath}`;
}

/**
 * Fetch audience demographics for an Instagram Business account.
 *
 * Instagram Graph requires the `instagram_manage_insights` scope. Returns:
 *   - audience_gender_age: { 'F.18-24': n, 'M.25-34': n, ... }
 *   - audience_country: { ES: n, MX: n, ... }
 *   - audience_city: { 'Madrid, Spain': n, ... }
 *   - audience_locale: { 'es_ES': n, 'en_US': n, ... }
 *
 * Demographic insights only return data for accounts with ≥100 followers, so
 * smaller accounts will return 200 with empty results — we surface that as
 * `insufficientFollowers: true` rather than an error.
 *
 * @param {string} igBusinessId
 * @param {string} pageAccessToken
 * @returns {Promise<{ok: boolean, demographics?: object, insufficientFollowers?: boolean, error?: string}>}
 */
async function fetchInstagramAudienceDemographics(igBusinessId, pageAccessToken) {
  if (!igBusinessId || !pageAccessToken) {
    return { ok: false, error: 'missing igBusinessId or pageAccessToken' };
  }
  try {
    const res = await axios.get(`${GRAPH_BASE}/${igBusinessId}/insights`, {
      params: {
        metric: 'audience_gender_age,audience_country,audience_city,audience_locale',
        period: 'lifetime',
        access_token: pageAccessToken,
      },
      timeout: TIMEOUT,
      validateStatus: () => true,
    });

    if (res.status === 400 && /follower/i.test(JSON.stringify(res.data || {}))) {
      // Instagram returns 400 for accounts under the 100-follower minimum.
      return { ok: true, insufficientFollowers: true, demographics: null };
    }
    if (res.status >= 400) {
      return { ok: false, error: `IG insights HTTP ${res.status}: ${res.data?.error?.message || ''}` };
    }

    const out = {};
    for (const item of res.data?.data || []) {
      const value = item.values?.[0]?.value || {};
      out[item.name] = value;
    }
    return { ok: true, demographics: out };
  } catch (err) {
    return { ok: false, error: err?.message || 'IG insights fetch failed' };
  }
}

module.exports = {
  getAuthorizationUrl,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchUserPages,
  fetchInstagramBusinessAccount,
  fetchInstagramAudienceDemographics,
  fetchWhatsAppBusinessAccounts,
  fetchUserProfile,
  refreshLongLivedToken,
  debugToken,
  getCallbackUrl,
};
