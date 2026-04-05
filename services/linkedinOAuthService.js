/**
 * LinkedIn OAuth Service — LinkedIn OpenID Connect + OAuth 2.0
 *
 * Handles the full OAuth 2.0 flow for LinkedIn:
 * - Authorization URL generation
 * - Code → access token exchange
 * - Token refresh (LinkedIn supports real refresh tokens)
 * - Fetch user profile via OpenID Connect
 * - Fetch administered organizations
 */

const axios = require('axios');
const config = require('../config/config');

const OAUTH_BASE = 'https://www.linkedin.com/oauth/v2';
const API_BASE = 'https://api.linkedin.com';
const TIMEOUT = 15000;

/**
 * Build the LinkedIn OAuth authorization URL.
 * @param {string} state - Signed state parameter (JWT) for CSRF protection
 * @returns {string}
 */
function getAuthorizationUrl(state) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.linkedin.clientId,
    redirect_uri: getCallbackUrl(),
    state,
    scope: config.linkedin.scopes,
  });
  return `${OAUTH_BASE}/authorization?${params.toString()}`;
}

/**
 * Exchange an authorization code for tokens.
 * LinkedIn returns both access_token (60 days) and refresh_token (365 days).
 * @param {string} code
 * @returns {Promise<{access_token, expires_in, refresh_token, refresh_token_expires_in}>}
 */
async function exchangeCodeForToken(code) {
  const res = await axios.post(
    `${OAUTH_BASE}/accessToken`,
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: config.linkedin.clientId,
      client_secret: config.linkedin.clientSecret,
      redirect_uri: getCallbackUrl(),
    }).toString(),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: TIMEOUT,
    }
  );
  return res.data;
}

/**
 * Refresh an access token using a refresh token.
 * @param {string} refreshToken
 * @returns {Promise<{access_token, expires_in, refresh_token, refresh_token_expires_in}>}
 */
async function refreshAccessToken(refreshToken) {
  const res = await axios.post(
    `${OAUTH_BASE}/accessToken`,
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.linkedin.clientId,
      client_secret: config.linkedin.clientSecret,
    }).toString(),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: TIMEOUT,
    }
  );
  return res.data;
}

/**
 * Fetch user profile via OpenID Connect userinfo endpoint.
 * @param {string} accessToken
 * @returns {Promise<{sub, name, email, picture}>}
 */
async function fetchUserProfile(accessToken) {
  const res = await axios.get(`${API_BASE}/v2/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: TIMEOUT,
  });
  return res.data;
}

/**
 * Fetch organizations the user administers.
 * @param {string} accessToken
 * @returns {Promise<Array<{orgId, name, vanityName, logoUrl}>>}
 */
async function fetchOrganizations(accessToken) {
  try {
    const res = await axios.get(`${API_BASE}/v2/organizationAcls`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
      params: { q: 'roleAssignee', role: 'ADMINISTRATOR', projection: '(elements*(organizationalTarget))' },
      timeout: TIMEOUT,
    });

    const elements = res.data?.elements || [];
    const orgs = [];

    for (const el of elements) {
      const orgUrn = el.organizationalTarget;
      if (!orgUrn) continue;
      const orgId = orgUrn.split(':').pop();

      try {
        const orgRes = await axios.get(`${API_BASE}/v2/organizations/${orgId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
          params: { projection: '(id,localizedName,vanityName,logoV2)' },
          timeout: TIMEOUT,
        });
        const org = orgRes.data;
        orgs.push({
          orgId: String(org.id),
          name: org.localizedName || '',
          vanityName: org.vanityName || '',
          logoUrl: org.logoV2?.original || '',
        });
      } catch {
        orgs.push({ orgId, name: '', vanityName: '', logoUrl: '' });
      }
    }

    return orgs;
  } catch {
    return [];
  }
}

/**
 * Get the full callback URL for LinkedIn OAuth.
 * @returns {string}
 */
function getCallbackUrl() {
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${config.server.port}`;
  return `${backendUrl}${config.linkedin.oauthCallbackPath}`;
}

module.exports = {
  getAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  fetchUserProfile,
  fetchOrganizations,
  getCallbackUrl,
};
