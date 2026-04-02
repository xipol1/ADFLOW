/**
 * Token Refresh Service — Automatically renews Meta OAuth tokens before expiry.
 *
 * Designed for Vercel serverless: called via cron endpoint, no persistent process.
 * Finds channels with tokens expiring within 7 days and refreshes them.
 */

const Canal = require('../models/Canal');
const { ensureDb } = require('../lib/ensureDb');
const { decrypt } = require('../lib/encryption');
const metaOAuth = require('./metaOAuthService');

const REFRESH_WINDOW_DAYS = 7;

/**
 * Refresh all Meta OAuth tokens that are about to expire.
 * @returns {Promise<{refreshed: number, failed: number, skipped: number, details: Array}>}
 */
async function refreshExpiringTokens() {
  const ok = await ensureDb();
  if (!ok) throw new Error('Database not available');

  const cutoff = new Date(Date.now() + REFRESH_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // Find channels with OAuth tokens expiring within the window
  const channels = await Canal.find({
    'credenciales.tokenType': 'oauth_meta',
    'credenciales.tokenExpiresAt': { $ne: null, $lte: cutoff },
    estado: 'activo',
  });

  const results = { refreshed: 0, failed: 0, skipped: 0, details: [] };

  for (const canal of channels) {
    try {
      const currentToken = decrypt(canal.credenciales.accessToken);
      if (!currentToken) {
        results.skipped++;
        results.details.push({ id: canal._id, status: 'skipped', reason: 'no token' });
        continue;
      }

      // Attempt refresh
      const newTokenData = await metaOAuth.refreshLongLivedToken(currentToken);
      canal.credenciales.accessToken = newTokenData.access_token; // pre-save encrypts
      canal.credenciales.tokenExpiresAt = new Date(
        Date.now() + (newTokenData.expires_in || 5184000) * 1000
      );
      await canal.save();

      results.refreshed++;
      results.details.push({
        id: canal._id,
        plataforma: canal.plataforma,
        status: 'refreshed',
        newExpiry: canal.credenciales.tokenExpiresAt,
      });
    } catch (err) {
      results.failed++;
      results.details.push({
        id: canal._id,
        plataforma: canal.plataforma,
        status: 'failed',
        error: err.message,
      });
      console.error(`Token refresh failed for canal ${canal._id}:`, err.message);
    }
  }

  console.log(
    `Token refresh complete: ${results.refreshed} refreshed, ${results.failed} failed, ${results.skipped} skipped`
  );
  return results;
}

module.exports = { refreshExpiringTokens };
