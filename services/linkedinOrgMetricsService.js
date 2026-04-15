/**
 * LinkedIn Organization Metrics Service — pull analytics for Company Pages.
 *
 * Operates on Canals with plataforma='linkedin' and identificadores.linkedinUrn
 * matching "urn:li:organization:*". Organization endpoints are richer than
 * personal ones because LinkedIn officially supports Page admin analytics
 * via the Community Management API.
 *
 * Endpoints used (all official, documented, stable):
 *
 *   1. /rest/networkSizes/{urn}?edgeType=COMPANY_FOLLOWED_BY_MEMBER
 *      → total organic follower count. REPLACES the deprecated
 *        organizationalEntityFollowerStatistics.totalFollowerCount field
 *        which was removed by LinkedIn without warning.
 *
 *   2. /rest/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity={urn}
 *      → demographic breakdowns (industry, function, seniority, geo, staff
 *        count). Time-bound mode adds daily followerGains for CVS feeding.
 *
 *   3. /rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity={urn}
 *      → aggregate share statistics (impressions, clicks, likes, shares,
 *        comments, engagement, uniqueImpressionsCount). Lifetime + time-bound.
 *
 *   4. /rest/organizationPageStatistics?q=organization&organization={urn}
 *      → page VISIT statistics (NOT post reach). Overview/careers/jobs/life-at
 *        page views, desktop vs mobile split, unique page views (time-bound),
 *        segmentation by country/function/industry/seniority/staff.
 *        Signal of BRAND AWARENESS independent of content production.
 *
 *   5. /rest/shares?q=owners&owners={urn}&sharesPerOwner={n}
 *      → recent posts for posts/week velocity calculation.
 *
 *   6. /rest/organizations/{id}?projection=(id,localizedName,vanityName,logoV2,…)
 *      → basic org metadata (name, vanity, logo, industries, founded date,
 *        staff count range, organization status) for Canal enrichment.
 *
 * Tolerance model: every call returns { ok, error } and never throws on HTTP
 * failures. 401/403 marks scopeMissing=true. A canal that fails sync is
 * logged and the orchestrator moves on.
 *
 * What requires the Marketing Developer Platform (partner tier):
 *   - Ad campaign creation / updates      → /adAccounts, /adCampaigns
 *   - Sponsored content analytics          → /adAnalytics
 *   - Matched Audiences uploads            → /adSegments
 * This service does NOT touch any of those; it only reads organic page data.
 */

const axios = require('axios');
const config = require('../config/config');

const API_BASE = 'https://api.linkedin.com';
const REQUEST_TIMEOUT_MS = 15000;
const RATE_LIMIT_MS = 1500;
const LINKEDIN_REST_VERSION = config.linkedin?.restApiVersion || '202603';
const LINKEDIN_VERSION = LINKEDIN_REST_VERSION; // back-compat
const MAX_POSTS_PER_ORG = 20;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Axios helper — uniform error handling and automatic LinkedIn-Version header.
 * Returns { ok: true, data } or { ok: false, status, reason }.
 */
async function liGet(path, accessToken, extraHeaders = {}) {
  try {
    const res = await axios.get(`${API_BASE}${path}`, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': LINKEDIN_REST_VERSION,
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

// ═══════════════════════════════════════════════════════════════════════════
// 1. Total follower count (networkSizes) — FIXES the 0-always bug
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch the authoritative total follower count of a company page.
 *
 * Previously this service relied on
 * `organizationalEntityFollowerStatistics.totalFollowerCount`, which LinkedIn
 * has removed from the response. Their migration note points to the
 * networkSizes endpoint as the canonical replacement.
 *
 * Returns { ok, followerCount } or { ok:false, scopeMissing, error }.
 */
async function getOrgTotalFollowerCount(accessToken, orgUrn) {
  if (!orgUrn) return { ok: false, error: 'missing orgUrn', followerCount: 0 };
  const encoded = encodeURIComponent(orgUrn);
  const path = `/rest/networkSizes/${encoded}?edgeType=COMPANY_FOLLOWED_BY_MEMBER`;
  const r = await liGet(path, accessToken);
  if (!r.ok) {
    return {
      ok: false,
      scopeMissing: r.status === 403 || r.status === 401,
      error: `networkSizes: ${r.reason}`,
      followerCount: 0,
    };
  }
  return { ok: true, followerCount: Number(r.data?.firstDegreeSize) || 0 };
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Follower statistics (demographics) + time-bound follower growth
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch demographic follower breakdowns for an organization (lifetime).
 *
 * This endpoint no longer returns totalFollowerCount. Use
 * getOrgTotalFollowerCount() for that. This function returns ONLY the
 * seven demographic facets.
 */
async function getOrgFollowerStatistics(accessToken, orgUrn) {
  if (!orgUrn) return { ok: false, error: 'missing orgUrn' };
  const encoded = encodeURIComponent(orgUrn);
  const path =
    `/rest/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${encoded}`;

  const r = await liGet(path, accessToken);
  if (!r.ok) {
    return {
      ok: false,
      scopeMissing: r.status === 403 || r.status === 401,
      error: `followerStatistics: ${r.reason}`,
      demographics: null,
    };
  }

  const elements = Array.isArray(r.data?.elements) ? r.data.elements : [];
  const first = elements[0] || {};

  return {
    ok: true,
    demographics: {
      byAssociationType: first.followerCountsByAssociationType || [],
      byGeoCountry:      first.followerCountsByGeoCountry || [],
      byGeo:             first.followerCountsByGeo || [],
      byFunction:        first.followerCountsByFunction || [],
      byIndustry:        first.followerCountsByIndustry || [],
      bySeniority:       first.followerCountsBySeniority || [],
      byStaffCountRange: first.followerCountsByStaffCountRange || [],
    },
  };
}

/**
 * Fetch time-bound follower gains (daily) over a date range.
 *
 * The response shape is an array of per-day elements with followerGains
 * containing organicFollowerGain and paidFollowerGain. Summing organic gains
 * over N days gives us the "followerGrowth{N}d" signal that feeds CVS.
 *
 * Retention: 12 months rolling, up to 2 days before the request date.
 */
async function getOrgFollowerGrowth(accessToken, orgUrn, days) {
  if (!orgUrn) return { ok: false, error: 'missing orgUrn' };
  const endMs = Date.now();
  const startMs = endMs - days * 24 * 60 * 60 * 1000;

  const encoded = encodeURIComponent(orgUrn);
  const timeIntervals =
    `(timeRange:(start:${startMs},end:${endMs}),timeGranularityType:DAY)`;
  const path =
    `/rest/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${encoded}` +
    `&timeIntervals=${encodeURIComponent(timeIntervals)}`;

  const r = await liGet(path, accessToken);
  if (!r.ok) {
    return {
      ok: false,
      scopeMissing: r.status === 403 || r.status === 401,
      error: `followerGrowth ${days}d: ${r.reason}`,
      growth: null,
    };
  }

  const elements = Array.isArray(r.data?.elements) ? r.data.elements : [];
  let organicGain = 0;
  let paidGain = 0;
  for (const el of elements) {
    organicGain += Number(el.followerGains?.organicFollowerGain) || 0;
    paidGain += Number(el.followerGains?.paidFollowerGain) || 0;
  }
  return {
    ok: true,
    growth: organicGain,
    paidGrowth: paidGain,
    samples: elements.length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Share statistics (lifetime + time-bound) — feeds CAF, CER, CAP
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch aggregate lifetime share statistics.
 * Returns impressions, clicks, likes, comments, shares, engagement, unique.
 */
async function getOrgShareStatistics(accessToken, orgUrn) {
  if (!orgUrn) return { ok: false, error: 'missing orgUrn' };
  const encoded = encodeURIComponent(orgUrn);
  const path =
    `/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encoded}`;

  const r = await liGet(path, accessToken);
  if (!r.ok) {
    return {
      ok: false,
      scopeMissing: r.status === 403 || r.status === 401,
      error: `shareStatistics: ${r.reason}`,
      impressions: 0,
      clicks: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      engagement: 0,
      uniqueImpressions: 0,
    };
  }

  const elements = Array.isArray(r.data?.elements) ? r.data.elements : [];
  // Lifetime aggregate comes in a single element with totalShareStatistics.
  const agg = elements[0]?.totalShareStatistics || elements[0] || {};

  return {
    ok: true,
    impressions: Number(agg.impressionCount) || 0,
    clicks: Number(agg.clickCount) || 0,
    likes: Number(agg.likeCount) || 0,
    comments: Number(agg.commentCount) || 0,
    shares: Number(agg.shareCount) || 0,
    engagement: Number(agg.engagement) || 0,
    uniqueImpressions: Number(agg.uniqueImpressionsCount) || 0,
  };
}

/**
 * Fetch time-bound share statistics summed over a window (days).
 * Feeds impressions7d / impressions30d / engagement7d / engagement30d
 * fields on the snapshot, which in turn drive the velocity component of CAF.
 *
 * Retention: 12 months rolling.
 */
async function getOrgShareStatisticsTimeBound(accessToken, orgUrn, days) {
  if (!orgUrn) return { ok: false, error: 'missing orgUrn' };
  const endMs = Date.now();
  const startMs = endMs - days * 24 * 60 * 60 * 1000;

  const encoded = encodeURIComponent(orgUrn);
  const timeIntervals =
    `(timeRange:(start:${startMs},end:${endMs}),timeGranularityType:DAY)`;
  const path =
    `/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encoded}` +
    `&timeIntervals=${encodeURIComponent(timeIntervals)}`;

  const r = await liGet(path, accessToken);
  if (!r.ok) {
    return {
      ok: false,
      scopeMissing: r.status === 403 || r.status === 401,
      error: `shareStatistics ${days}d: ${r.reason}`,
      impressions: 0,
      clicks: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      engagementSum: 0,
    };
  }

  const elements = Array.isArray(r.data?.elements) ? r.data.elements : [];
  const totals = {
    impressions: 0,
    clicks: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    engagementSum: 0,
  };
  for (const el of elements) {
    const s = el.totalShareStatistics || el;
    totals.impressions += Number(s.impressionCount) || 0;
    totals.clicks += Number(s.clickCount) || 0;
    totals.likes += Number(s.likeCount) || 0;
    totals.comments += Number(s.commentCount) || 0;
    totals.shares += Number(s.shareCount) || 0;
    totals.engagementSum += Number(s.engagement) || 0;
  }
  // LinkedIn's "engagement" field is a per-day ratio, so summing it is not
  // meaningful. We recompute an aggregate engagement rate from the totals.
  const engagementRate =
    totals.impressions > 0
      ? +(
          (totals.likes + totals.comments + totals.shares + totals.clicks) /
          totals.impressions
        ).toFixed(6)
      : 0;

  return {
    ok: true,
    impressions: totals.impressions,
    clicks: totals.clicks,
    likes: totals.likes,
    comments: totals.comments,
    shares: totals.shares,
    engagementRate,
    samples: elements.length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. Organization page visit statistics (NEW — brand awareness signal)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch organization page visit statistics (lifetime or time-bound).
 *
 * This measures visits to the company's LinkedIn page itself — NOT reach
 * of individual posts. A key signal for:
 *   - Brand awareness independent of content production
 *   - Antifraud: high follower count + 0 page views = suspicious
 *   - Career/jobs traction when the page owner is in growth mode
 *
 * Returns an aggregated summary across all geographies/functions/etc.
 */
async function getOrgPageStatistics(accessToken, orgUrn, options = {}) {
  if (!orgUrn) return { ok: false, error: 'missing orgUrn' };
  const encoded = encodeURIComponent(orgUrn);

  let path = `/rest/organizationPageStatistics?q=organization&organization=${encoded}`;
  if (options.days) {
    const endMs = Date.now();
    const startMs = endMs - options.days * 24 * 60 * 60 * 1000;
    const timeIntervals =
      `(timeRange:(start:${startMs},end:${endMs}),timeGranularityType:DAY)`;
    path += `&timeIntervals=${encodeURIComponent(timeIntervals)}`;
  }

  const r = await liGet(path, accessToken);
  if (!r.ok) {
    return {
      ok: false,
      scopeMissing: r.status === 403 || r.status === 401,
      error: `pageStatistics${options.days ? ` ${options.days}d` : ''}: ${r.reason}`,
      pageViews: null,
    };
  }

  const elements = Array.isArray(r.data?.elements) ? r.data.elements : [];

  // Lifetime: a single element with totalPageStatistics.views.{...}
  // Time-bound: one element per day, each with totalPageStatistics.views.{...}
  //             We sum them.
  const sum = {
    allPageViews: 0,
    desktopPageViews: 0,
    mobilePageViews: 0,
    overviewPageViews: 0,
    careersPageViews: 0,
    jobsPageViews: 0,
    lifeAtPageViews: 0,
    uniquePageViews: 0,
  };
  for (const el of elements) {
    const v = el.totalPageStatistics?.views || {};
    sum.allPageViews     += Number(v.allPageViews?.pageViews) || 0;
    sum.desktopPageViews += Number(v.allDesktopPageViews?.pageViews) || 0;
    sum.mobilePageViews  += Number(v.allMobilePageViews?.pageViews) || 0;
    sum.overviewPageViews+= Number(v.overviewPageViews?.pageViews) || 0;
    sum.careersPageViews += Number(v.careersPageViews?.pageViews) || 0;
    sum.jobsPageViews    += Number(v.jobsPageViews?.pageViews) || 0;
    sum.lifeAtPageViews  += Number(v.lifeAtPageViews?.pageViews) || 0;
    // uniquePageViews is only present in time-bound mode
    sum.uniquePageViews  += Number(v.allPageViews?.uniquePageViews) || 0;
  }

  return { ok: true, pageViews: sum, samples: elements.length };
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. Recent posts + 6. Org details (mostly unchanged, versioned paths)
// ═══════════════════════════════════════════════════════════════════════════

async function getOrgRecentShares(accessToken, orgUrn, limit = MAX_POSTS_PER_ORG) {
  if (!orgUrn) return { ok: false, error: 'missing orgUrn', posts: [] };
  const encoded = encodeURIComponent(orgUrn);
  // Note: /rest/shares is the versioned counterpart of /v2/shares. Behavior
  // is identical for the q=owners finder.
  const path =
    `/rest/shares?q=owners&owners=${encoded}&count=${limit}&sharesPerOwner=${limit}`;

  const r = await liGet(path, accessToken);
  if (!r.ok) {
    return {
      ok: false,
      scopeMissing: r.status === 403 || r.status === 401,
      error: `shares: ${r.reason}`,
      posts: [],
    };
  }

  const elements = Array.isArray(r.data?.elements) ? r.data.elements : [];
  const posts = elements
    .map((el) => {
      const urn = el.activity || el.id || '';
      const created = Number(el.created?.time) || 0;
      const text = el.text?.text || el.content?.title || '';
      return {
        urn,
        text: String(text).slice(0, 500),
        createdAt: created ? new Date(created) : null,
      };
    })
    .filter((p) => p.urn);

  return { ok: true, posts };
}

async function getOrgDetails(accessToken, orgUrn) {
  const orgId = (orgUrn || '').split(':').pop();
  if (!orgId) return { ok: false, error: 'missing orgId' };
  // Use the versioned path. We request an extended projection so we can
  // enrich the Canal with founded date, staff count range, industries,
  // description, specialties, and status — all data points used by the
  // scoring engine's CTF (Trust) component.
  const projection =
    '(id,localizedName,vanityName,logoV2,coverPhotoV2,' +
    'industries,localizedSpecialties,staffCountRange,foundedOn,' +
    'localizedDescription,organizationType,organizationStatus,' +
    'parentRelationship,pinnedPost,localizedWebsite)';
  const path = `/rest/organizations/${orgId}?projection=${encodeURIComponent(projection)}`;
  const r = await liGet(path, accessToken);
  if (!r.ok) return { ok: false, error: `organization: ${r.reason}` };
  const d = r.data || {};
  return {
    ok: true,
    details: {
      id: String(d.id || orgId),
      name: d.localizedName || '',
      vanityName: d.vanityName || '',
      logoUrl: d.logoV2?.original || '',
      coverUrl: d.coverPhotoV2?.original || '',
      industries: d.industries || [],
      specialties: d.localizedSpecialties || [],
      staffCountRange: d.staffCountRange || '',
      foundedOn: d.foundedOn || null,
      description: d.localizedDescription || '',
      organizationType: d.organizationType || '',
      organizationStatus: d.organizationStatus || '',
      parentUrn: d.parentRelationship?.parent || '',
      pinnedPostUrn: d.pinnedPost || '',
      website: d.localizedWebsite || '',
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// High-level: syncOrgCanal — orchestrates all endpoints and returns summary
// ═══════════════════════════════════════════════════════════════════════════

async function syncOrgCanal(canal, decryptedAccessToken) {
  const orgUrn = canal.identificadores?.linkedinUrn || '';
  if (!orgUrn || !/^urn:li:organization:/.test(orgUrn)) {
    return {
      ok: false,
      error: 'canal is not a LinkedIn organization (linkedinUrn missing or not organization)',
      canalId: canal._id,
    };
  }

  const scopeMissingDetails = {
    orgDetails: false,
    orgFollowers: false,
    orgShares: false,
    orgPageStats: false,
  };

  // 1. Org details (also serves as token liveness check)
  const detailsRes = await getOrgDetails(decryptedAccessToken, orgUrn);
  if (!detailsRes.ok) {
    return { ok: false, error: detailsRes.error, canalId: canal._id };
  }
  await sleep(RATE_LIMIT_MS);

  // 2. Total follower count (networkSizes — the FIXED endpoint)
  const totalFollowersRes = await getOrgTotalFollowerCount(decryptedAccessToken, orgUrn);
  if (totalFollowersRes.scopeMissing) scopeMissingDetails.orgFollowers = true;
  await sleep(RATE_LIMIT_MS);

  // 3. Demographic breakdowns
  const followerStats = await getOrgFollowerStatistics(decryptedAccessToken, orgUrn);
  if (followerStats.scopeMissing) scopeMissingDetails.orgFollowers = true;
  await sleep(RATE_LIMIT_MS);

  // 4. Follower growth 7d + 30d (feeds CVS)
  const growth7 = await getOrgFollowerGrowth(decryptedAccessToken, orgUrn, 7);
  if (growth7.scopeMissing) scopeMissingDetails.orgFollowers = true;
  await sleep(RATE_LIMIT_MS);

  const growth30 = await getOrgFollowerGrowth(decryptedAccessToken, orgUrn, 30);
  if (growth30.scopeMissing) scopeMissingDetails.orgFollowers = true;
  await sleep(RATE_LIMIT_MS);

  // 5. Share statistics (lifetime aggregate)
  const shareStats = await getOrgShareStatistics(decryptedAccessToken, orgUrn);
  if (shareStats.scopeMissing) scopeMissingDetails.orgShares = true;
  await sleep(RATE_LIMIT_MS);

  // 6. Share statistics time-bound 7d + 30d
  const shareStats7 = await getOrgShareStatisticsTimeBound(decryptedAccessToken, orgUrn, 7);
  if (shareStats7.scopeMissing) scopeMissingDetails.orgShares = true;
  await sleep(RATE_LIMIT_MS);

  const shareStats30 = await getOrgShareStatisticsTimeBound(decryptedAccessToken, orgUrn, 30);
  if (shareStats30.scopeMissing) scopeMissingDetails.orgShares = true;
  await sleep(RATE_LIMIT_MS);

  // 7. Page visit statistics (lifetime) + 30d window
  const pageStats = await getOrgPageStatistics(decryptedAccessToken, orgUrn);
  if (pageStats.scopeMissing) scopeMissingDetails.orgPageStats = true;
  await sleep(RATE_LIMIT_MS);

  const pageStats30 = await getOrgPageStatistics(decryptedAccessToken, orgUrn, { days: 30 });
  if (pageStats30.scopeMissing) scopeMissingDetails.orgPageStats = true;
  await sleep(RATE_LIMIT_MS);

  const pageStats7 = await getOrgPageStatistics(decryptedAccessToken, orgUrn, { days: 7 });
  if (pageStats7.scopeMissing) scopeMissingDetails.orgPageStats = true;
  await sleep(RATE_LIMIT_MS);

  // 8. Recent posts (posts/week calculation)
  const sharesRes = await getOrgRecentShares(decryptedAccessToken, orgUrn, MAX_POSTS_PER_ORG);

  // Compute posts/week + latest post date
  let postsPerWeek = null;
  let latestPostDate = null;
  if (sharesRes.ok && sharesRes.posts.length > 0) {
    const dated = sharesRes.posts
      .map((p) => p.createdAt)
      .filter((d) => d instanceof Date && !Number.isNaN(d.getTime()))
      .sort((a, b) => a - b);
    if (dated.length > 0) latestPostDate = dated[dated.length - 1];
    if (dated.length >= 2) {
      const spanMs = dated[dated.length - 1] - dated[0];
      const spanWeeks = spanMs / (7 * 24 * 3600 * 1000);
      if (spanWeeks > 0) postsPerWeek = +(dated.length / spanWeeks).toFixed(2);
    }
  }

  // Engagement rate (lifetime): (likes+comments+shares+clicks) / impressions
  // Use clicks as well (clickCount is engagement per LinkedIn's own formula).
  const engagementRate =
    shareStats.ok && shareStats.impressions > 0
      ? +(
          (shareStats.likes +
            shareStats.comments +
            shareStats.shares +
            shareStats.clicks) /
          shareStats.impressions
        ).toFixed(4)
      : 0;

  return {
    ok: true,
    canalId: canal._id,
    orgUrn,
    details: detailsRes.details,
    followerCount: totalFollowersRes.ok ? totalFollowersRes.followerCount : 0,
    demographics: followerStats.ok ? followerStats.demographics : null,
    followerGrowth7d: growth7.ok ? growth7.growth : null,
    followerGrowth30d: growth30.ok ? growth30.growth : null,
    shareStats: shareStats.ok ? shareStats : null,
    shareStats7d: shareStats7.ok ? shareStats7 : null,
    shareStats30d: shareStats30.ok ? shareStats30 : null,
    pageViews: pageStats.ok ? pageStats.pageViews : null,
    pageViews7d: pageStats7.ok ? pageStats7.pageViews?.allPageViews || 0 : null,
    pageViews30d: pageStats30.ok ? pageStats30.pageViews?.allPageViews || 0 : null,
    uniquePageViews30d:
      pageStats30.ok ? pageStats30.pageViews?.uniquePageViews || 0 : null,
    postCount: sharesRes.ok ? sharesRes.posts.length : 0,
    postsPerWeek,
    latestPostDate,
    engagementRate,
    scopeMissing:
      scopeMissingDetails.orgFollowers ||
      scopeMissingDetails.orgShares ||
      scopeMissingDetails.orgPageStats,
    scopeMissingDetails,
  };
}

module.exports = {
  getOrgTotalFollowerCount,
  getOrgFollowerStatistics,
  getOrgFollowerGrowth,
  getOrgShareStatistics,
  getOrgShareStatisticsTimeBound,
  getOrgPageStatistics,
  getOrgRecentShares,
  getOrgDetails,
  syncOrgCanal,
  LINKEDIN_VERSION,
  LINKEDIN_REST_VERSION,
  RATE_LIMIT_MS,
  MAX_POSTS_PER_ORG,
};
