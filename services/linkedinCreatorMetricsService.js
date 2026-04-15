/**
 * LinkedIn Creator Metrics Service — pull post analytics for personal profiles.
 *
 * Operates on Canals with plataforma='linkedin' and identificadores.linkedinUrn
 * matching "urn:li:person:*". For each creator, we fetch:
 *
 *   1. Recent UGC posts (authored by the member)     — /v2/ugcPosts?q=authors
 *   2. Social actions on each post (likes/comments)  — /v2/socialActions/{urn}
 *   3. Member follower count (lifetime + 7d/30d)     — /rest/memberFollowersCount
 *      (requires scope r_member_profileAnalytics, added April 2025)
 *
 * What this service CANNOT do (by design — LinkedIn doesn't expose them via
 * OAuth outside of the Marketing Partner Program):
 *   - Per-post impressions for personal profiles (orgs only)
 *   - Profile views / search appearances  (deprecated in 2021)
 *   - Audience demographics (requires partner tier)
 *
 * Tolerance model: every HTTP call is wrapped in a try/catch. Any 401/403/
 * 404/410/429 is logged and the call returns null (or scopeMissing=true) —
 * the sync loop keeps going on the next canal. We NEVER throw up to the
 * caller on a per-canal failure; only config / db errors propagate.
 *
 * Rate limiting: 1.5 seconds between requests for the same canal. We rely
 * on the top-level sync orchestrator to space out different canals.
 */

const axios = require('axios');
const config = require('../config/config');

const API_BASE = 'https://api.linkedin.com';
const REQUEST_TIMEOUT_MS = 15000;
const RATE_LIMIT_MS = 1500;
// REST API version for /rest/* versioned endpoints. Legacy /v2/* ignore this.
const LINKEDIN_REST_VERSION = config.linkedin?.restApiVersion || '202603';
const MAX_POSTS_PER_CREATOR = 20;
// Back-compat export (some tests read LINKEDIN_VERSION)
const LINKEDIN_VERSION = LINKEDIN_REST_VERSION;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Normalize an LI URN to its numeric/alphanumeric id.
 *   "urn:li:person:ABC123" -> "ABC123"
 */
function urnToId(urn) {
  if (!urn || typeof urn !== 'string') return '';
  return urn.split(':').pop();
}

/**
 * Axios helper with uniform error handling. Returns:
 *   { ok: true,  data }
 *   { ok: false, status, reason }
 */
async function liGet(path, accessToken, extraHeaders = {}) {
  try {
    const res = await axios.get(`${API_BASE}${path}`, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': LINKEDIN_VERSION,
        ...extraHeaders,
      },
      validateStatus: () => true,
    });
    if (res.status >= 200 && res.status < 300) {
      return { ok: true, data: res.data };
    }
    return {
      ok: false,
      status: res.status,
      reason:
        (typeof res.data === 'object' && res.data?.message) ||
        (typeof res.data === 'string' && res.data.slice(0, 200)) ||
        `HTTP ${res.status}`,
    };
  } catch (err) {
    return { ok: false, status: 0, reason: err.message || 'network error' };
  }
}

/**
 * Fetch the current member's profile (id, name, headline, profilePicture).
 * Uses the /v2/userinfo endpoint (OpenID Connect) which is covered by the
 * "profile" scope — a scope every OAuth connection in this project already
 * has, so this call is guaranteed to work on every existing token.
 */
async function getMemberProfile(accessToken) {
  const r = await liGet('/v2/userinfo', accessToken);
  if (!r.ok) return { ok: false, error: `userinfo: ${r.reason}` };
  const d = r.data || {};
  return {
    ok: true,
    profile: {
      id: d.sub || '',
      name: d.name || '',
      givenName: d.given_name || '',
      familyName: d.family_name || '',
      email: d.email || '',
      picture: d.picture || '',
      locale: d.locale?.country || '',
    },
  };
}

/**
 * Fetch the authenticated member's total follower count.
 * Uses the /rest/memberFollowersCount?q=me endpoint introduced in LinkedIn
 * API version 202504. Requires the r_member_profileAnalytics scope.
 *
 * Returns:
 *   { ok: true, followerCount }
 *   { ok: false, scopeMissing, error }
 *
 * The endpoint returns an array of exactly one element with shape:
 *   { memberFollowersCount: <number> }
 */
async function getMemberFollowerCount(accessToken) {
  const r = await liGet('/rest/memberFollowersCount?q=me', accessToken);
  if (!r.ok) {
    return {
      ok: false,
      scopeMissing: r.status === 403 || r.status === 401,
      error: `memberFollowersCount: ${r.reason}`,
      followerCount: 0,
    };
  }
  const elements = Array.isArray(r.data?.elements) ? r.data.elements : [];
  const first = elements[0] || {};
  const followerCount = Number(first.memberFollowersCount) || 0;
  return { ok: true, followerCount };
}

/**
 * Fetch time-bound follower counts for a date range with DAY granularity.
 * Used to compute follower growth over 7d / 30d windows for CVS.
 *
 * @param {string} accessToken
 * @param {{ year, month, day }} startDate  — inclusive
 * @param {{ year, month, day }} endDate    — exclusive
 * @returns {{ ok, samples: [{ date, count }], scopeMissing?, error? }}
 */
async function getMemberFollowerRange(accessToken, startDate, endDate) {
  if (!startDate || !endDate) {
    return { ok: false, error: 'missing date range' };
  }
  const q =
    `(start:(year:${startDate.year},month:${startDate.month},day:${startDate.day}),` +
    `end:(year:${endDate.year},month:${endDate.month},day:${endDate.day}))`;
  const path = `/rest/memberFollowersCount?q=dateRange&dateRange=${encodeURIComponent(q)}`;
  const r = await liGet(path, accessToken);
  if (!r.ok) {
    return {
      ok: false,
      scopeMissing: r.status === 403 || r.status === 401,
      error: `memberFollowersCount dateRange: ${r.reason}`,
      samples: [],
    };
  }
  const elements = Array.isArray(r.data?.elements) ? r.data.elements : [];
  const samples = elements
    .map((el) => {
      const d = el.dateRange?.start || {};
      if (!d.year || !d.month || !d.day) return null;
      return {
        date: new Date(Date.UTC(d.year, d.month - 1, d.day)),
        count: Number(el.memberFollowersCount) || 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date - b.date);
  return { ok: true, samples };
}

/**
 * Compute the net follower growth over the last `days` days for a creator.
 * Strategy: query `memberFollowersCount` with a dateRange spanning `days+1`
 * calendar days ending today, then subtract the first sample from the last.
 *
 * Returns { ok, growth, scopeMissing? }. Growth may be negative.
 */
async function getMemberFollowerGrowth(accessToken, days) {
  const now = new Date();
  const end = {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
  };
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const start = {
    year: startDate.getUTCFullYear(),
    month: startDate.getUTCMonth() + 1,
    day: startDate.getUTCDate(),
  };
  const r = await getMemberFollowerRange(accessToken, start, end);
  if (!r.ok) {
    return { ok: false, scopeMissing: !!r.scopeMissing, error: r.error, growth: null };
  }
  if (r.samples.length < 2) {
    return { ok: true, growth: null, samples: r.samples.length };
  }
  const first = r.samples[0].count;
  const last = r.samples[r.samples.length - 1].count;
  return { ok: true, growth: last - first, samples: r.samples.length };
}

/**
 * List recent UGC posts authored by a given person URN.
 * Requires scope: r_member_social (for self) — if not granted, LinkedIn
 * returns 403 and we silently return [] so the sync can continue.
 */
async function getRecentPosts(accessToken, personUrn, limit = MAX_POSTS_PER_CREATOR) {
  if (!personUrn) return { ok: false, error: 'missing personUrn' };
  const authorsParam = encodeURIComponent(`List(${personUrn})`);
  const path =
    `/v2/ugcPosts?q=authors&authors=${authorsParam}&count=${limit}&sortBy=LAST_MODIFIED`;

  const r = await liGet(path, accessToken);
  if (!r.ok) {
    // 403 typically means r_member_social is not granted. That's an app-scope
    // issue, not a bug — the token simply can't read this. Return empty + tag.
    return {
      ok: false,
      scopeMissing: r.status === 403,
      error: `ugcPosts: ${r.reason}`,
      posts: [],
    };
  }

  const elements = Array.isArray(r.data?.elements) ? r.data.elements : [];
  const posts = elements
    .map((el) => {
      const urn = el.id || el['com.linkedin.ugc.ShareContent']?.id || '';
      const created = Number(el.created?.time) || 0;
      const lastModified = Number(el.lastModified?.time) || created;
      const commentary =
        el.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text ||
        '';
      return {
        urn,
        text: String(commentary).slice(0, 500),
        createdAt: created ? new Date(created) : null,
        lastModifiedAt: lastModified ? new Date(lastModified) : null,
      };
    })
    .filter((p) => p.urn);

  return { ok: true, posts };
}

/**
 * Fetch the social-action counters of a post URN (likes, comments).
 * Returns { likes, comments, shares, impressions } with any missing field
 * defaulting to 0. Impressions are rarely exposed for personal posts.
 */
async function getPostSocialActions(accessToken, postUrn) {
  if (!postUrn) return { likes: 0, comments: 0, shares: 0 };
  const encoded = encodeURIComponent(postUrn);
  const r = await liGet(`/v2/socialActions/${encoded}`, accessToken);
  if (!r.ok) return { likes: 0, comments: 0, shares: 0, _error: r.reason };
  const d = r.data || {};
  return {
    likes: Number(d.likesSummary?.totalLikes) || 0,
    comments: Number(d.commentsSummary?.aggregatedTotalComments) || 0,
    shares: Number(d.sharesSummary?.aggregatedTotalShares) || 0,
  };
}

/**
 * Sum the engagement stats of the N most recent posts of a creator.
 *
 * Returns:
 *   {
 *     postCount,
 *     totals: { likes, comments, shares },
 *     averages: { likesPerPost, commentsPerPost },
 *     latestPostDate,
 *     postsPerWeek,
 *   }
 *
 * Any field may be null if data was unavailable. NEVER throws.
 */
async function aggregateCreatorEngagement(accessToken, personUrn) {
  const { ok, posts, error, scopeMissing } = await getRecentPosts(
    accessToken,
    personUrn,
    MAX_POSTS_PER_CREATOR,
  );

  if (!ok) {
    return {
      ok: false,
      scopeMissing: !!scopeMissing,
      error,
      postCount: 0,
      totals: { likes: 0, comments: 0, shares: 0 },
      averages: { likesPerPost: 0, commentsPerPost: 0 },
      latestPostDate: null,
      postsPerWeek: null,
    };
  }

  const totals = { likes: 0, comments: 0, shares: 0 };
  let sampled = 0;

  // Cap social-action lookups to the 10 most recent to keep total API calls
  // per creator under budget (~15 HTTP calls).
  const lookupLimit = Math.min(posts.length, 10);
  for (let i = 0; i < lookupLimit; i++) {
    const post = posts[i];
    const actions = await getPostSocialActions(accessToken, post.urn);
    totals.likes += actions.likes || 0;
    totals.comments += actions.comments || 0;
    totals.shares += actions.shares || 0;
    sampled++;
    await sleep(500); // half the normal rate limit for intra-post calls
  }

  const averages = {
    likesPerPost: sampled > 0 ? +(totals.likes / sampled).toFixed(2) : 0,
    commentsPerPost: sampled > 0 ? +(totals.comments / sampled).toFixed(2) : 0,
  };

  // Latest post + posts/week (same math as telegramIntelService)
  const dated = posts
    .map((p) => p.createdAt)
    .filter((d) => d instanceof Date && !Number.isNaN(d.getTime()))
    .sort((a, b) => a - b);

  let postsPerWeek = null;
  if (dated.length >= 2) {
    const spanMs = dated[dated.length - 1] - dated[0];
    const spanWeeks = spanMs / (7 * 24 * 3600 * 1000);
    if (spanWeeks > 0) {
      postsPerWeek = +(dated.length / spanWeeks).toFixed(2);
    }
  }

  return {
    ok: true,
    postCount: posts.length,
    sampledForActions: sampled,
    totals,
    averages,
    latestPostDate: dated.length > 0 ? dated[dated.length - 1] : null,
    postsPerWeek,
  };
}

/**
 * High-level: sync a single creator Canal.
 *
 * Accepts a Canal object with decrypted credentials (caller is responsible
 * for decryption — typically the top-level linkedinSyncService which already
 * has the tokenRefreshService context).
 *
 * On success, mutates the canal doc in memory with fresh metrics but DOES
 * NOT save it. Returns a summary object the caller can persist + use to
 * create a CanalScoreSnapshot.
 */
async function syncCreatorCanal(canal, decryptedAccessToken) {
  const personUrn = canal.identificadores?.linkedinUrn || '';
  if (!personUrn || !/^urn:li:person:/.test(personUrn)) {
    return {
      ok: false,
      error: 'canal is not a LinkedIn person (linkedinUrn missing or not person)',
      canalId: canal._id,
    };
  }

  // 1. Profile (cheap sanity check — confirms token is valid before heavier calls)
  const profileRes = await getMemberProfile(decryptedAccessToken);
  if (!profileRes.ok) {
    return { ok: false, error: profileRes.error, canalId: canal._id };
  }
  await sleep(RATE_LIMIT_MS);

  // 2. Follower count (NEW — requires r_member_profileAnalytics)
  const followersRes = await getMemberFollowerCount(decryptedAccessToken);
  await sleep(RATE_LIMIT_MS);

  // 3. Follower growth 7d and 30d (two separate dateRange queries).
  // These are "nice to have" — if the scope is missing we still continue.
  let growth7 = { ok: false, growth: null };
  let growth30 = { ok: false, growth: null };
  if (followersRes.ok) {
    growth7 = await getMemberFollowerGrowth(decryptedAccessToken, 7);
    await sleep(RATE_LIMIT_MS);
    growth30 = await getMemberFollowerGrowth(decryptedAccessToken, 30);
    await sleep(RATE_LIMIT_MS);
  }

  // 4. Engagement aggregate from recent posts
  const engagement = await aggregateCreatorEngagement(
    decryptedAccessToken,
    personUrn,
  );

  // Consolidate scope-missing signal: if ANY of the read endpoints hit 403,
  // mark the sync as scope-limited so the caller can prompt a reconnect.
  const scopeMissingAny =
    !!followersRes.scopeMissing ||
    !!growth7.scopeMissing ||
    !!growth30.scopeMissing ||
    !!engagement.scopeMissing;

  return {
    ok: true,
    canalId: canal._id,
    personUrn,
    profile: profileRes.profile,
    followerCount: followersRes.ok ? followersRes.followerCount : 0,
    followerGrowth7d: growth7.ok ? growth7.growth : null,
    followerGrowth30d: growth30.ok ? growth30.growth : null,
    engagement,
    scopeMissing: scopeMissingAny,
    scopeMissingDetails: {
      memberFollowers: !!followersRes.scopeMissing,
      memberPosts: !!engagement.scopeMissing,
    },
  };
}

module.exports = {
  urnToId,
  getMemberProfile,
  getMemberFollowerCount,
  getMemberFollowerRange,
  getMemberFollowerGrowth,
  getRecentPosts,
  getPostSocialActions,
  aggregateCreatorEngagement,
  syncCreatorCanal,
  LINKEDIN_VERSION,
  LINKEDIN_REST_VERSION,
  RATE_LIMIT_MS,
  MAX_POSTS_PER_CREATOR,
};
