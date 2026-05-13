/**
 * Intelligence aggregator — pure functions that compute every metric in
 * the CanalIntelligence document from raw CanalPostObservation and
 * CanalMetricsSnapshot arrays.
 *
 * Zero side effects, no DB, no clock (caller passes `now`). Designed for
 * exhaustive unit tests with synthetic fixtures — every formula in this
 * file should have a snapshot regression test.
 *
 * Conventions:
 *   - Time arithmetic in milliseconds at boundaries; durations in hours.
 *   - All "rate" metrics relative (0.05 = +5%), not percentage points.
 *   - `null` everywhere = insufficient data. Never default to 0 because
 *     downstream filters like "promotional_ratio > 0.5" would treat 0
 *     and "unknown" identically.
 *
 * Input expectations:
 *   posts: sorted DESC by publishedAt (newest first). Each post has at
 *     least { _id, publishedAt, type, isForwarded, body, bodyHash, links,
 *     reactions: {total}, nlp: {...} }.
 *   snapshots: sorted DESC by timestamp. Each has { timestamp,
 *     subscribersCount }.
 *
 * Functions are exported individually for testing PLUS a top-level
 * `aggregateAll(args)` that returns the full intelligence shape.
 */

'use strict';

const HOUR_MS = 3600 * 1000;
const DAY_MS = 24 * HOUR_MS;

// ─── Cadence ────────────────────────────────────────────────────────────────

function postsPerWeek(postCount, windowDays) {
  if (!postCount || postCount === 0) return null;
  if (!windowDays || windowDays <= 0) return null;
  return (postCount / windowDays) * 7;
}

/**
 * Posting consistency: 1 minus the coefficient of variation of inter-post
 * intervals, clamped to [0, 1]. Returns null when fewer than 3 posts (no
 * meaningful interval distribution).
 *
 *   posts evenly spaced  → CV ≈ 0     → score ≈ 1
 *   bursty + long gaps   → CV >> 1    → score = 0
 */
function postingConsistencyScore(timestampsMs) {
  if (!Array.isArray(timestampsMs) || timestampsMs.length < 3) return null;
  // Ensure DESC sort; compute intervals between adjacent posts in ms.
  const sorted = [...timestampsMs].sort((a, b) => b - a);
  const intervals = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    intervals.push(sorted[i] - sorted[i + 1]);
  }
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  if (mean === 0) return 0;
  const variance =
    intervals.reduce((acc, v) => acc + (v - mean) ** 2, 0) / intervals.length;
  const stddev = Math.sqrt(variance);
  const cv = stddev / mean; // coefficient of variation
  const score = 1 - cv;
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(1, score));
}

function lastPostRecencyHours(posts, nowMs) {
  if (!Array.isArray(posts) || posts.length === 0) return null;
  // posts assumed DESC sorted; first is most recent
  const ts = new Date(posts[0].publishedAt).getTime();
  return (nowMs - ts) / HOUR_MS;
}

/**
 * Return the most active (hour, day-of-week) buckets plus the full
 * hourly distribution.
 *
 * dow follows Mongo $dayOfWeek convention: 1=Sunday..7=Saturday — we
 * remap to 1=Monday..7=Sunday because that matches ISO and the original
 * Fase 4 spec ("1=Mon..7=Sun").
 */
function temporalActivity(posts) {
  if (!Array.isArray(posts) || posts.length === 0) {
    return { mostActiveHourOfDay: null, mostActiveDow: null, hourOfDayDistribution: [] };
  }
  const hourCounts = new Array(24).fill(0);
  const dowCounts = new Array(8).fill(0); // index 1..7
  for (const p of posts) {
    const d = new Date(p.publishedAt);
    if (Number.isNaN(d.getTime())) continue;
    hourCounts[d.getUTCHours()] += 1;
    // JS getUTCDay: 0=Sun..6=Sat. We want 1=Mon..7=Sun (ISO).
    const js = d.getUTCDay();
    const iso = js === 0 ? 7 : js;
    dowCounts[iso] += 1;
  }
  const hourOfDayDistribution = hourCounts.map((count, hour) => ({ hour, count }));
  let mostActiveHourOfDay = 0;
  for (let h = 1; h < 24; h++) if (hourCounts[h] > hourCounts[mostActiveHourOfDay]) mostActiveHourOfDay = h;
  let mostActiveDow = 1;
  for (let d = 2; d <= 7; d++) if (dowCounts[d] > dowCounts[mostActiveDow]) mostActiveDow = d;
  return { mostActiveHourOfDay, mostActiveDow, hourOfDayDistribution };
}

function computeCadence(posts30d, posts90d, nowMs) {
  const t30 = (posts30d || []).map((p) => new Date(p.publishedAt).getTime());
  return {
    postsPerWeekAvg30d: postsPerWeek(posts30d?.length || 0, 30),
    postsPerWeekAvg90d: postsPerWeek(posts90d?.length || 0, 90),
    postingConsistencyScore: postingConsistencyScore(t30),
    lastPostRecencyHours: lastPostRecencyHours(posts30d?.length ? posts30d : posts90d, nowMs),
    ...temporalActivity(posts30d || []),
  };
}

// ─── Growth ─────────────────────────────────────────────────────────────────

/**
 * Subscribers count at a specific point in the past. Picks the snapshot
 * closest to `targetMs`; returns null if no snapshot exists.
 *
 * @param {Array} snapshots  DESC by timestamp
 * @param {number} targetMs  epoch ms target
 */
function subscribersAt(snapshots, targetMs) {
  if (!Array.isArray(snapshots) || snapshots.length === 0) return null;
  let best = null;
  let bestDelta = Infinity;
  for (const s of snapshots) {
    const t = new Date(s.timestamp).getTime();
    const delta = Math.abs(t - targetMs);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = s;
    }
  }
  return best ? Number(best.subscribersCount || 0) : null;
}

function growthRate(startCount, endCount) {
  if (startCount == null || endCount == null) return null;
  if (startCount === 0) {
    // Going from 0 to anything is technically infinite growth; report
    // a sentinel rather than Infinity. Downstream code should check
    // for this.
    return endCount > 0 ? 1.0 : 0;
  }
  return (endCount - startCount) / startCount;
}

function computeGrowth(snapshots, posts30d, nowMs) {
  if (!snapshots || snapshots.length === 0) {
    return {
      followersStart30d: null,
      followersCurrent: null,
      followerGrowthRate7d: null,
      followerGrowthRate30d: null,
      followerGrowthRate90d: null,
      growthAcceleration: null,
      followersPerPost30d: null,
    };
  }
  const current = Number(snapshots[0].subscribersCount || 0);
  const sub7 = subscribersAt(snapshots, nowMs - 7 * DAY_MS);
  const sub30 = subscribersAt(snapshots, nowMs - 30 * DAY_MS);
  const sub90 = subscribersAt(snapshots, nowMs - 90 * DAY_MS);

  const r7 = growthRate(sub7, current);
  const r30 = growthRate(sub30, current);
  const r90 = growthRate(sub90, current);

  // Acceleration: change in rate between 30d window and 90d window. If
  // recent rate > older rate, growth is accelerating (positive number).
  // We need two comparable windows — use the average rate over each.
  let acceleration = null;
  if (r30 != null && r90 != null) {
    // Convert both to a "per day" rate before subtracting to avoid
    // bias from different window widths.
    const r30Daily = r30 / 30;
    const r90Daily = r90 / 90;
    acceleration = r30Daily - r90Daily;
  }

  // followersPerPost30d: how many net new subscribers we got per post.
  // null if no posts in the window (division by zero).
  let followersPerPost30d = null;
  if (posts30d && posts30d.length > 0 && sub30 != null) {
    const gained = current - sub30;
    followersPerPost30d = gained / posts30d.length;
  }

  return {
    followersStart30d: sub30,
    followersCurrent: current,
    followerGrowthRate7d: r7,
    followerGrowthRate30d: r30,
    followerGrowthRate90d: r90,
    growthAcceleration: acceleration,
    followersPerPost30d,
  };
}

// ─── Engagement ─────────────────────────────────────────────────────────────

function totalReactions(post) {
  if (!post) return 0;
  // We store reactions as a subdoc with { total, byEmoji }. Some posts
  // may not have a reactions field if it was never updated post-ingest.
  const t = post.reactions?.total;
  return typeof t === 'number' ? t : 0;
}

/**
 * Engagement decay: linear regression slope of `reactions vs days-old`,
 * sign-normalised to [-1, 1]. Negative = older posts get fewer reactions
 * (the usual case — decay). Positive = older posts have MORE reactions
 * (sometimes a sign of slow viral spread). Near zero = no signal.
 */
function engagementDecayScore(posts, nowMs) {
  if (!Array.isArray(posts) || posts.length < 4) return null;
  // x = days old, y = reactions
  const pts = posts
    .map((p) => ({
      x: (nowMs - new Date(p.publishedAt).getTime()) / DAY_MS,
      y: totalReactions(p),
    }))
    .filter((pt) => Number.isFinite(pt.x) && Number.isFinite(pt.y));
  if (pts.length < 4) return null;
  const n = pts.length;
  const sx = pts.reduce((a, p) => a + p.x, 0);
  const sy = pts.reduce((a, p) => a + p.y, 0);
  const sxy = pts.reduce((a, p) => a + p.x * p.y, 0);
  const sxx = pts.reduce((a, p) => a + p.x * p.x, 0);
  const denom = n * sxx - sx * sx;
  if (denom === 0) return 0;
  const slope = (n * sxy - sx * sy) / denom;
  // Normalise: divide by mean(y), clamp to [-1, 1]. Slope sign: positive
  // means more reactions as x (days-old) grows — "old gets more" — which
  // is the UNUSUAL case. We want decay's natural sign:
  // negative slope (newer > older) is decay's healthy version. We invert
  // sign so that "1.0 = strong decay (healthy)" and "-1.0 = old > new".
  const meanY = sy / n;
  if (meanY === 0) return 0;
  const normalised = -slope / meanY;
  if (!Number.isFinite(normalised)) return 0;
  return Math.max(-1, Math.min(1, normalised));
}

function computeEngagement(posts30d, currentFollowers) {
  if (!posts30d || posts30d.length === 0) {
    return {
      reactionsPerPostAvg30d: null,
      engagementRate30d: null,
      engagementDecayScore: null,
      topPostReactions: null,
      topPostId: null,
    };
  }
  const reactions = posts30d.map(totalReactions);
  const totalRx = reactions.reduce((a, b) => a + b, 0);
  const avg = totalRx / posts30d.length;

  let engagementRate30d = null;
  if (currentFollowers && currentFollowers > 0) {
    engagementRate30d = totalRx / currentFollowers / posts30d.length;
  }

  let topIdx = 0;
  for (let i = 1; i < reactions.length; i++) {
    if (reactions[i] > reactions[topIdx]) topIdx = i;
  }

  return {
    reactionsPerPostAvg30d: avg,
    engagementRate30d,
    engagementDecayScore: engagementDecayScore(posts30d, Date.now()),
    topPostReactions: reactions[topIdx],
    topPostId: posts30d[topIdx]?._id || null,
  };
}

// ─── Content mix ────────────────────────────────────────────────────────────

function ratio(numerator, denominator) {
  if (!denominator || denominator === 0) return null;
  return numerator / denominator;
}

/**
 * Shannon entropy of a normalised distribution → coherence score.
 * coherence = 1 - H / log2(N)
 *   H=0 (all probability on one category)    → coherence = 1
 *   H=log2(N) (uniform across N categories) → coherence = 0
 */
function entropyCoherence(shares) {
  const nonZero = shares.filter((s) => s > 0);
  if (nonZero.length <= 1) return 1; // single category or empty → perfect coherence
  const H = -nonZero.reduce((acc, s) => acc + s * Math.log2(s), 0);
  const maxH = Math.log2(nonZero.length);
  if (maxH === 0) return 1;
  return Math.max(0, Math.min(1, 1 - H / maxH));
}

function computeContentMix(posts30d) {
  if (!posts30d || posts30d.length === 0) {
    return {
      mediaRichnessScore: null,
      linkDensity: null,
      repostRatio: null,
      uniqueContentRatio: null,
      promotionalRatio30d: null,
      dominantCategories: [],
      categoryCoherenceScore: null,
      langPrimary: 'unknown',
      langMix: new Map(),
    };
  }

  const total = posts30d.length;
  const mediaCount = posts30d.filter((p) =>
    ['image', 'video', 'audio', 'document'].includes(p.type)
  ).length;
  const linkCount = posts30d.filter((p) => Array.isArray(p.links) && p.links.length > 0).length;
  const forwardedCount = posts30d.filter((p) => p.isForwarded).length;
  const promotionalCount = posts30d.filter((p) => p.nlp?.isPromotional === true).length;
  const promotionalEnrichedCount = posts30d.filter((p) => p.nlp?.isPromotional != null).length;

  // Unique content via bodyHash. Posts without a bodyHash (e.g. pure
  // media without caption) don't contribute to the duplicate count.
  const hashes = posts30d.map((p) => p.bodyHash).filter(Boolean);
  let uniqueContentRatio = null;
  if (hashes.length > 0) {
    const unique = new Set(hashes).size;
    uniqueContentRatio = unique / hashes.length;
  }

  // Category aggregation: flatten all per-post categories, weighted by
  // 1 vote per post per category.
  const categoryCounts = new Map();
  for (const p of posts30d) {
    const cats = p.nlp?.categories;
    if (!Array.isArray(cats)) continue;
    for (const c of cats) {
      categoryCounts.set(c, (categoryCounts.get(c) || 0) + 1);
    }
  }
  const categoryTotal = [...categoryCounts.values()].reduce((a, b) => a + b, 0);
  const dominantCategories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, count]) => ({
      category,
      share: categoryTotal > 0 ? count / categoryTotal : 0,
    }));
  const categoryCoherenceScore =
    categoryCounts.size === 0
      ? null
      : entropyCoherence([...categoryCounts.values()].map((v) => v / categoryTotal));

  // Lang mix
  const langCounts = new Map();
  for (const p of posts30d) {
    const lang = p.nlp?.lang || 'unknown';
    langCounts.set(lang, (langCounts.get(lang) || 0) + 1);
  }
  const langMix = new Map();
  let langPrimary = 'unknown';
  let langPrimaryCount = -1;
  for (const [lang, count] of langCounts) {
    langMix.set(lang, count / total);
    if (count > langPrimaryCount && lang !== 'unknown') {
      langPrimary = lang;
      langPrimaryCount = count;
    }
  }
  if (langPrimaryCount === -1) langPrimary = 'unknown';

  return {
    mediaRichnessScore: ratio(mediaCount, total),
    linkDensity: ratio(linkCount, total),
    repostRatio: ratio(forwardedCount, total),
    uniqueContentRatio,
    // Only count promotional ratio over posts where we actually have an
    // enriched answer. Avoids "0 / 100 = 0%" when nothing was enriched.
    promotionalRatio30d: promotionalEnrichedCount > 0
      ? promotionalCount / promotionalEnrichedCount
      : null,
    dominantCategories,
    categoryCoherenceScore,
    langPrimary,
    langMix,
  };
}

// ─── Trust ──────────────────────────────────────────────────────────────────

function computeTrust(posts30d) {
  if (!posts30d || posts30d.length === 0) {
    return {
      brandSafetyScoreAvg: null,
      brandSafetyFlagsAggregate: new Map(),
      botAdminSuspicionScore: null,
    };
  }

  const scored = posts30d.filter((p) => typeof p.nlp?.brandSafetyScore === 'number');
  const brandSafetyScoreAvg = scored.length > 0
    ? scored.reduce((a, p) => a + p.nlp.brandSafetyScore, 0) / scored.length
    : null;

  const flagsAggregate = new Map();
  for (const p of posts30d) {
    const flags = p.nlp?.brandSafetyFlags;
    if (!Array.isArray(flags)) continue;
    for (const f of flags) {
      flagsAggregate.set(f, (flagsAggregate.get(f) || 0) + 1);
    }
  }

  return {
    brandSafetyScoreAvg,
    brandSafetyFlagsAggregate: flagsAggregate,
    botAdminSuspicionScore: botAdminSuspicionScore(posts30d),
  };
}

/**
 * Heuristic bot detection. Signals (each contributing 0..1, then averaged):
 *   1. Hourly coverage: humans rest. A canal posting in 20+ different
 *      hours of the day across a 30d window has 24/7 coverage → bot-like.
 *   2. Inter-post regularity: extreme regularity (sub-minute precision)
 *      across many posts is suspicious. Uses postingConsistencyScore > 0.95.
 *   3. Low unique content: duplicate-heavy = content farm. Triggers when
 *      uniqueContentRatio < 0.4.
 *
 * Returns null if <10 posts (not enough data to judge).
 */
function botAdminSuspicionScore(posts30d) {
  if (!Array.isArray(posts30d) || posts30d.length < 10) return null;

  // Signal 1: hour-of-day coverage
  const hours = new Set();
  for (const p of posts30d) {
    const d = new Date(p.publishedAt);
    if (!Number.isNaN(d.getTime())) hours.add(d.getUTCHours());
  }
  const hourCoverage = hours.size / 24;
  // Scale: 0..15h covered → 0; 16h → 0.5; 20h+ → 1.
  const coverageSignal = Math.max(0, Math.min(1, (hourCoverage - 16 / 24) / (20 / 24 - 16 / 24)));

  // Signal 2: inter-post regularity
  const ts = posts30d.map((p) => new Date(p.publishedAt).getTime());
  const consistency = postingConsistencyScore(ts);
  const regularitySignal = consistency != null && consistency > 0.95
    ? (consistency - 0.95) / 0.05
    : 0;

  // Signal 3: duplicate content
  const hashes = posts30d.map((p) => p.bodyHash).filter(Boolean);
  let dupSignal = 0;
  if (hashes.length >= 5) {
    const unique = new Set(hashes).size;
    const uniqueRatio = unique / hashes.length;
    if (uniqueRatio < 0.4) dupSignal = (0.4 - uniqueRatio) / 0.4;
  }

  const score = (coverageSignal + regularitySignal + dupSignal) / 3;
  return Math.max(0, Math.min(1, score));
}

// ─── Aggregate-all entry point ──────────────────────────────────────────────

/**
 * Compute the full intelligence bundle for one canal.
 *
 * @param {object} args
 * @param {string} args.canalId
 * @param {string} args.channelJid
 * @param {Array}  args.snapshots          DESC by timestamp
 * @param {Array}  args.posts30d           DESC by publishedAt
 * @param {Array}  args.posts90d           DESC by publishedAt
 * @param {number} [args.now=Date.now()]
 */
function aggregateAll({ canalId, channelJid, snapshots, posts30d, posts90d, now }) {
  const nowMs = typeof now === 'number' ? now : Date.now();
  const snapshots30d = (snapshots || []).filter(
    (s) => new Date(s.timestamp).getTime() >= nowMs - 30 * DAY_MS
  );

  const cadence = computeCadence(posts30d, posts90d, nowMs);
  const growth = computeGrowth(snapshots, posts30d, nowMs);
  const engagement = computeEngagement(posts30d, growth.followersCurrent);
  const contentMix = computeContentMix(posts30d);
  const trust = computeTrust(posts30d);

  return {
    canalId,
    channelJid,
    computedAt: new Date(nowMs),
    sampleWindowDays: 30,
    inputCounts: {
      snapshots30d: snapshots30d.length,
      snapshots90d: (snapshots || []).length,
      posts30d: (posts30d || []).length,
      posts90d: (posts90d || []).length,
    },
    cadence,
    growth,
    engagement,
    contentMix,
    trust,
  };
}

module.exports = {
  aggregateAll,
  // Sub-functions exposed for tests
  postsPerWeek,
  postingConsistencyScore,
  lastPostRecencyHours,
  temporalActivity,
  subscribersAt,
  growthRate,
  computeCadence,
  computeGrowth,
  computeEngagement,
  engagementDecayScore,
  computeContentMix,
  computeTrust,
  botAdminSuspicionScore,
  entropyCoherence,
  totalReactions,
};
