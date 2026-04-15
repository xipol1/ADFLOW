/**
 * LinkedIn Sync Service — top-level orchestrator for LinkedIn Canal metrics.
 *
 * Mirrors the shape of telegramIntelService.syncAllMappedChannels: iterates
 * over every Canal with plataforma='linkedin', dispatches to the right
 * per-type service (creator vs organization), updates the Canal document,
 * and creates a CanalScoreSnapshot for historical tracking.
 *
 * Token handling:
 *   - The Canal's access token is AES-GCM encrypted; we call
 *     `lib/encryption.getDecryptedCreds` to read it.
 *   - If the token is expired or about to expire (< 24h to expiry), we
 *     attempt to refresh via linkedinOAuthService.refreshAccessToken BEFORE
 *     making the metrics call. This keeps the existing
 *     tokenRefreshService's 7-day window untouched (no overlap, no race).
 *   - If refresh fails, the canal is marked with an error and the sync
 *     moves on. The next pass (nightly cron) retries automatically.
 *
 * Scoring:
 *   - We DO NOT recalculate CAS/CAF/CTF/CER/CVS here. That's the job of the
 *     scoring engine (services/channelScoringV2). We only persist the raw
 *     metrics on the Canal and in the snapshot's linkedinIntel field.
 *   - The nightly scoring cron will pick up the new metrics on its next run.
 *
 * Rate limiting:
 *   - 2 seconds between canals (LinkedIn daily rate limits are app-level
 *     and vary by endpoint; we play conservatively).
 *   - Each per-canal sync itself rate-limits between internal API calls
 *     (handled inside linkedinCreatorMetricsService / linkedinOrgMetricsService).
 */

const BETWEEN_CANAL_DELAY_MS = 2000;
const TOKEN_REFRESH_MARGIN_MS = 24 * 60 * 60 * 1000; // refresh if expires within 24h

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ensure the canal's access token is fresh. Refreshes it if it expires
 * within the TOKEN_REFRESH_MARGIN_MS window. Returns a decrypted, usable
 * access token or null if the refresh failed.
 */
async function ensureFreshToken(canal) {
  const { decrypt, encryptIfNeeded } = require('../lib/encryption');
  const linkedinOAuth = require('./linkedinOAuthService');

  const tokenType = canal.credenciales?.tokenType || '';
  if (tokenType !== 'oauth_linkedin') {
    return { ok: false, error: 'canal is not oauth_linkedin', token: null };
  }

  const accessTokenEnc = canal.credenciales?.accessToken || '';
  const refreshTokenEnc = canal.credenciales?.refreshToken || '';
  const expiresAt = canal.credenciales?.tokenExpiresAt
    ? new Date(canal.credenciales.tokenExpiresAt).getTime()
    : 0;

  if (!accessTokenEnc) {
    return { ok: false, error: 'no access token stored', token: null };
  }

  // If still valid for more than the margin, use as-is
  const needsRefresh = !expiresAt || expiresAt - Date.now() < TOKEN_REFRESH_MARGIN_MS;
  if (!needsRefresh) {
    return { ok: true, token: decrypt(accessTokenEnc) };
  }

  // Needs refresh
  const refreshToken = decrypt(refreshTokenEnc || '');
  if (!refreshToken) {
    return { ok: false, error: 'no refresh token; reconnect required', token: null };
  }

  try {
    const newData = await linkedinOAuth.refreshAccessToken(refreshToken);
    const newAccess = newData.access_token;
    const newRefresh = newData.refresh_token || refreshToken;
    const expiresIn = newData.expires_in || 5184000; // 60 days default

    // Persist the new tokens directly on the canal doc. The pre-save hook
    // in models/Canal.js will re-encrypt them automatically.
    canal.credenciales.accessToken = newAccess;
    canal.credenciales.refreshToken = newRefresh;
    canal.credenciales.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
    await canal.save();

    return { ok: true, token: newAccess, refreshed: true };
  } catch (err) {
    return { ok: false, error: `refresh failed: ${err.message}`, token: null };
  }
}

/**
 * Persist the creator sync result onto the Canal and create a snapshot.
 * Input: canal (mongoose doc, not lean), result from syncCreatorCanal.
 */
async function persistCreatorMetrics(canal, result) {
  const CanalScoreSnapshot = require('../models/CanalScoreSnapshot');

  const eng = result.engagement || {};
  const now = new Date();

  // Update Canal with the fresh raw metrics (NOT scores — those are computed
  // by the nightly scoring cron from these same numbers).
  canal.estadisticas = canal.estadisticas || {};
  canal.estadisticas.ultimaActualizacion = now;
  // NEW: we now have creator follower count via /rest/memberFollowersCount.
  // Only overwrite if the live value is actually a positive number; otherwise
  // keep whatever was there (manual declaration, previous sync, etc.).
  if (Number.isFinite(result.followerCount) && result.followerCount > 0) {
    canal.estadisticas.seguidores = result.followerCount;
  }
  if (result.profile?.name && !canal.nombreCanal) {
    canal.nombreCanal = result.profile.name;
  }

  // Crawler fields — urlPublica for creators is the LinkedIn profile URL,
  // which we can build from the numeric id / sub.
  canal.crawler = canal.crawler || {};
  canal.crawler.ultimaActualizacion = now;
  // LinkedIn does not expose vanity names via userinfo, so we use the
  // numeric sub as fallback. If the user had a vanityName in another path,
  // it wouldn't get overwritten.
  if (!canal.crawler.urlPublica && result.profile?.id) {
    canal.crawler.urlPublica = `https://www.linkedin.com/in/${result.profile.id}`;
  }

  await canal.save();

  // Create a snapshot with scores preserved from the Canal's current state.
  // We DO NOT recompute scores here — see file-header comment.
  await CanalScoreSnapshot.create({
    canalId: canal._id,
    fecha: now,
    CAF: canal.CAF ?? 50,
    CTF: canal.CTF ?? 50,
    CER: canal.CER ?? 50,
    CVS: canal.CVS ?? 50,
    CAP: canal.CAP ?? 50,
    CAS: canal.CAS ?? 50,
    nivel: canal.nivel || 'BRONZE',
    CPMDinamico: canal.CPMDinamico || 0,
    confianzaScore: canal.verificacion?.confianzaScore ?? 30,
    ratioCTF_CAF: canal.antifraude?.ratioCTF_CAF ?? null,
    flags: canal.antifraude?.flags ?? [],
    seguidores: canal.estadisticas?.seguidores || 0,
    nicho: canal.categoria || 'otros',
    plataforma: 'linkedin',
    version: 2,
    linkedinIntel: {
      type: 'creator',
      personUrn: result.personUrn || '',
      // Engagement aggregates from the last 10 posts
      postCount: eng.postCount || 0,
      totalLikes: eng.totals?.likes || 0,
      totalComments: eng.totals?.comments || 0,
      totalShares: eng.totals?.shares || 0,
      avgLikesPerPost: eng.averages?.likesPerPost || 0,
      avgCommentsPerPost: eng.averages?.commentsPerPost || 0,
      postsPerWeek: eng.postsPerWeek || null,
      latestPostDate: eng.latestPostDate || null,
      // NEW: member follower count + growth (requires r_member_profileAnalytics)
      memberFollowersCount:
        Number.isFinite(result.followerCount) ? result.followerCount : null,
      memberFollowersGrowth7d:
        Number.isFinite(result.followerGrowth7d) ? result.followerGrowth7d : null,
      memberFollowersGrowth30d:
        Number.isFinite(result.followerGrowth30d) ? result.followerGrowth30d : null,
      scopeMissing: !!result.scopeMissing,
      scopeMissingDetails: {
        memberFollowers: !!result.scopeMissingDetails?.memberFollowers,
        orgFollowers: false,
        orgShares: false,
        orgPageStats: false,
      },
    },
  });
}

/**
 * Persist the organization sync result onto the Canal and create a snapshot.
 */
async function persistOrgMetrics(canal, result) {
  const CanalScoreSnapshot = require('../models/CanalScoreSnapshot');
  const now = new Date();

  // Update follower count on the Canal (orgs expose this cleanly, unlike
  // personal profiles).
  canal.estadisticas = canal.estadisticas || {};
  canal.estadisticas.seguidores = result.followerCount || canal.estadisticas.seguidores || 0;
  canal.estadisticas.ultimaActualizacion = now;

  // Keep name and logo fresh if the org updated them
  if (result.details?.name && !canal.nombreCanal) {
    canal.nombreCanal = result.details.name;
  }
  if (result.details?.logoUrl && !canal.foto) {
    canal.foto = result.details.logoUrl;
  }

  canal.crawler = canal.crawler || {};
  canal.crawler.ultimaActualizacion = now;
  if (!canal.crawler.urlPublica && result.details?.vanityName) {
    canal.crawler.urlPublica = `https://www.linkedin.com/company/${result.details.vanityName}`;
  }

  await canal.save();

  await CanalScoreSnapshot.create({
    canalId: canal._id,
    fecha: now,
    CAF: canal.CAF ?? 50,
    CTF: canal.CTF ?? 50,
    CER: canal.CER ?? 50,
    CVS: canal.CVS ?? 50,
    CAP: canal.CAP ?? 50,
    CAS: canal.CAS ?? 50,
    nivel: canal.nivel || 'BRONZE',
    CPMDinamico: canal.CPMDinamico || 0,
    confianzaScore: canal.verificacion?.confianzaScore ?? 30,
    ratioCTF_CAF: canal.antifraude?.ratioCTF_CAF ?? null,
    flags: canal.antifraude?.flags ?? [],
    seguidores: result.followerCount || 0,
    nicho: canal.categoria || 'otros',
    plataforma: 'linkedin',
    version: 2,
    linkedinIntel: {
      type: 'organization',
      orgUrn: result.orgUrn || '',
      // ── Core follower + share aggregates (lifetime) ───────────────
      followerCount: result.followerCount || 0,
      impressions: result.shareStats?.impressions || 0,
      clicks: result.shareStats?.clicks || 0,
      likes: result.shareStats?.likes || 0,
      comments: result.shareStats?.comments || 0,
      shares: result.shareStats?.shares || 0,
      uniqueImpressions: result.shareStats?.uniqueImpressions || 0,
      engagementRate: result.engagementRate || 0,
      // ── NEW: time-bound follower growth (feeds CVS) ───────────────
      followerGrowth7d:
        Number.isFinite(result.followerGrowth7d) ? result.followerGrowth7d : null,
      followerGrowth30d:
        Number.isFinite(result.followerGrowth30d) ? result.followerGrowth30d : null,
      // ── NEW: time-bound share statistics (feeds CAF velocity) ────
      impressions7d: result.shareStats7d?.impressions ?? null,
      impressions30d: result.shareStats30d?.impressions ?? null,
      clicks7d: result.shareStats7d?.clicks ?? null,
      clicks30d: result.shareStats30d?.clicks ?? null,
      engagement7d: result.shareStats7d?.engagementRate ?? null,
      engagement30d: result.shareStats30d?.engagementRate ?? null,
      // ── NEW: page visit statistics (brand awareness signal) ──────
      pageViews: result.pageViews
        ? {
            allPageViews: result.pageViews.allPageViews ?? null,
            desktopPageViews: result.pageViews.desktopPageViews ?? null,
            mobilePageViews: result.pageViews.mobilePageViews ?? null,
            overviewPageViews: result.pageViews.overviewPageViews ?? null,
            careersPageViews: result.pageViews.careersPageViews ?? null,
            jobsPageViews: result.pageViews.jobsPageViews ?? null,
            lifeAtPageViews: result.pageViews.lifeAtPageViews ?? null,
          }
        : undefined,
      pageViews7d: Number.isFinite(result.pageViews7d) ? result.pageViews7d : null,
      pageViews30d: Number.isFinite(result.pageViews30d) ? result.pageViews30d : null,
      uniquePageViews30d:
        Number.isFinite(result.uniquePageViews30d) ? result.uniquePageViews30d : null,
      // ── Shared fields ─────────────────────────────────────────────
      postCount: result.postCount || 0,
      postsPerWeek: result.postsPerWeek || null,
      latestPostDate: result.latestPostDate || null,
      scopeMissing: !!result.scopeMissing,
      scopeMissingDetails: {
        memberFollowers: false,
        orgFollowers: !!result.scopeMissingDetails?.orgFollowers,
        orgShares: !!result.scopeMissingDetails?.orgShares,
        orgPageStats: !!result.scopeMissingDetails?.orgPageStats,
      },
    },
  });
}

/**
 * Sync every LinkedIn canal mapped in the database.
 *
 * @returns {Promise<{ processed, errors: string[], skipped, duration_ms }>}
 */
async function syncAllMappedLinkedInCanals(options = {}) {
  const Canal = require('../models/Canal');
  const { syncCreatorCanal } = require('./linkedinCreatorMetricsService');
  const { syncOrgCanal } = require('./linkedinOrgMetricsService');

  const start = Date.now();
  const errors = [];
  let processed = 0;
  let skipped = 0;
  let creators = 0;
  let orgs = 0;

  const canales = await Canal.find({
    plataforma: 'linkedin',
    estado: { $ne: 'eliminado' },
    'credenciales.tokenType': 'oauth_linkedin',
  });

  if (canales.length === 0) {
    return { processed: 0, errors: [], skipped: 0, creators: 0, orgs: 0, duration_ms: Date.now() - start };
  }

  // Optional cap for testing / rate-limit safety
  const cap = options.cap || canales.length;
  const toProcess = canales.slice(0, cap);

  for (const canal of toProcess) {
    const label = `${canal._id} (${canal.identificadores?.linkedinUrn || 'no-urn'})`;
    try {
      // 1. Ensure token is fresh
      const tokenRes = await ensureFreshToken(canal);
      if (!tokenRes.ok) {
        errors.push(`${label}: ${tokenRes.error}`);
        skipped++;
        await sleep(BETWEEN_CANAL_DELAY_MS);
        continue;
      }
      const accessToken = tokenRes.token;

      // 2. Dispatch by URN type
      const urn = canal.identificadores?.linkedinUrn || '';
      if (/^urn:li:person:/.test(urn)) {
        const result = await syncCreatorCanal(canal, accessToken);
        if (!result.ok) {
          errors.push(`${label} (creator): ${result.error || 'unknown'}`);
          skipped++;
        } else {
          await persistCreatorMetrics(canal, result);
          creators++;
          processed++;
        }
      } else if (/^urn:li:organization:/.test(urn)) {
        const result = await syncOrgCanal(canal, accessToken);
        if (!result.ok) {
          errors.push(`${label} (org): ${result.error || 'unknown'}`);
          skipped++;
        } else {
          await persistOrgMetrics(canal, result);
          orgs++;
          processed++;
        }
      } else {
        errors.push(`${label}: urn type unknown (${urn})`);
        skipped++;
      }
    } catch (err) {
      errors.push(`${label}: fatal ${err.message}`);
      skipped++;
    }

    await sleep(BETWEEN_CANAL_DELAY_MS);
  }

  return {
    processed,
    creators,
    orgs,
    skipped,
    errors,
    duration_ms: Date.now() - start,
  };
}

module.exports = {
  syncAllMappedLinkedInCanals,
  ensureFreshToken,
  persistCreatorMetrics,
  persistOrgMetrics,
  TOKEN_REFRESH_MARGIN_MS,
  BETWEEN_CANAL_DELAY_MS,
};
