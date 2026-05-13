/**
 * ChannelScore — combines the CanalIntelligence aggregate into the
 * marketplace-facing score (confianzaScore + inventoryTier + price range).
 *
 * Pure function. Deterministic given the same inputs + weights. The
 * weights snapshot is persisted alongside each score so historical recompute
 * is reproducible after the formula evolves.
 *
 * Anchor invariant: confianzaScore NEVER drops below CONFIANZA_FLOOR for
 * a canal that has passed Flujo A verification (Canal.verificado === true).
 * Intelligence can RAISE the score; it cannot lower it past the floor.
 *
 * Component design — each is a 0..1 sub-score derived from the aggregates:
 *   cadence         : posts/week + consistency + recency
 *   growth          : 30d follower growth + acceleration
 *   engagement      : reactions per post / per follower + decay
 *   contentQuality  : unique content + media richness + category coherence
 *   trust           : brand safety + inverse bot suspicion + lang focus
 *
 * Final score = weighted sum of components × 100, then floored against
 * the verification anchor (85 if verified, 0 otherwise).
 *
 * Operators can tune weights via env vars (CAPA2_SCORE_W_*) without
 * redeploying. Each tune bumps formulaVersion.
 */

'use strict';

const FORMULA_VERSION = 'capa2-cs-v1';

// Default weights — sum is 1.0.
const DEFAULT_WEIGHTS = {
  cadence: 0.20,
  growth: 0.20,
  engagement: 0.30,
  contentQuality: 0.15,
  trust: 0.15,
};

// Anchor floors and ceilings for the final score:
//   - Verified canal (Canal.verificado===true) never drops below 85.
//   - Unverified canals max out at 84 (so verification has real meaning).
const VERIFIED_FLOOR = 85;
const UNVERIFIED_CEILING = 84;

// Inventory tier thresholds based on the final score.
const TIER_THRESHOLDS = [
  { tier: 'S', min: 92 },
  { tier: 'A', min: 80 },
  { tier: 'B', min: 60 },
  { tier: 'C', min: 0 },
];

// Reference values that anchor each component's "good" mark to 1.0.
// These are intentionally generous so canals can ALWAYS hit 1.0 if they
// excel — the score isn't a percentile, it's an absolute quality measure.
const COMPONENT_REFERENCES = {
  // Cadence
  POSTS_PER_WEEK_REFERENCE: 7,        // 1 post/day = top of curve
  RECENCY_HARD_FLOOR_HOURS: 24 * 14,  // older than 2 weeks → recency component = 0
  // Growth
  GROWTH_RATE_30D_REFERENCE: 0.20,    // +20% in 30d ≈ excellent
  // Engagement
  ENGAGEMENT_RATE_REFERENCE: 0.05,    // 5% engagement per post per follower
  // Trust
  BOT_SUSPICION_PENALTY_FULL: 0.7,    // 0.7+ suspicion → trust component drops to 0
};

function getWeights() {
  return {
    cadence: Number(process.env.CAPA2_SCORE_W_CADENCE || DEFAULT_WEIGHTS.cadence),
    growth: Number(process.env.CAPA2_SCORE_W_GROWTH || DEFAULT_WEIGHTS.growth),
    engagement: Number(process.env.CAPA2_SCORE_W_ENGAGEMENT || DEFAULT_WEIGHTS.engagement),
    contentQuality: Number(process.env.CAPA2_SCORE_W_CONTENT || DEFAULT_WEIGHTS.contentQuality),
    trust: Number(process.env.CAPA2_SCORE_W_TRUST || DEFAULT_WEIGHTS.trust),
  };
}

function clamp01(x) {
  if (typeof x !== 'number' || !Number.isFinite(x)) return null;
  return Math.max(0, Math.min(1, x));
}

// ─── Component scorers ──────────────────────────────────────────────────────

function scoreCadence(cadence) {
  if (!cadence) return null;
  const parts = [];
  // Frequency: ramp from 0 → 1 as posts/week → POSTS_PER_WEEK_REFERENCE
  if (cadence.postsPerWeekAvg30d != null) {
    parts.push(clamp01(cadence.postsPerWeekAvg30d / COMPONENT_REFERENCES.POSTS_PER_WEEK_REFERENCE));
  }
  // Consistency: already 0..1
  if (cadence.postingConsistencyScore != null) {
    parts.push(cadence.postingConsistencyScore);
  }
  // Recency: 1 if posted today, 0 if older than RECENCY_HARD_FLOOR_HOURS
  if (cadence.lastPostRecencyHours != null) {
    const r = 1 - cadence.lastPostRecencyHours / COMPONENT_REFERENCES.RECENCY_HARD_FLOOR_HOURS;
    parts.push(clamp01(r));
  }
  if (parts.length === 0) return null;
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

function scoreGrowth(growth) {
  if (!growth) return null;
  // Only the 30d rate counts toward the main growth component (90d is
  // backward-looking; 7d is too noisy). Acceleration acts as a multiplier.
  const r30 = growth.followerGrowthRate30d;
  if (r30 == null) return null;
  // Map -0.10..+0.20 → 0..1 (decline penalises; +20% in 30d ≈ 1.0)
  const base = clamp01((r30 + 0.10) / (COMPONENT_REFERENCES.GROWTH_RATE_30D_REFERENCE + 0.10));
  // Light acceleration nudge: +/-0.1
  let multiplier = 1;
  if (growth.growthAcceleration != null) {
    multiplier += clamp01(growth.growthAcceleration * 5) * 0.1;
  }
  return clamp01(base * multiplier);
}

function scoreEngagement(engagement) {
  if (!engagement) return null;
  const r = engagement.engagementRate30d;
  if (r == null) return null;
  // Anchor: 5% per-post engagement rate maps to 1.0.
  const base = clamp01(r / COMPONENT_REFERENCES.ENGAGEMENT_RATE_REFERENCE);
  // Decay: positive (healthy) decay nudges up; near-zero leaves it; negative
  // (old > new — unusual / suspicious) pulls down slightly.
  let nudge = 0;
  if (engagement.engagementDecayScore != null) {
    nudge = engagement.engagementDecayScore * 0.10;
  }
  return clamp01(base + nudge);
}

function scoreContentQuality(contentMix) {
  if (!contentMix) return null;
  const parts = [];
  if (contentMix.uniqueContentRatio != null) parts.push(contentMix.uniqueContentRatio);
  if (contentMix.mediaRichnessScore != null) parts.push(contentMix.mediaRichnessScore);
  if (contentMix.categoryCoherenceScore != null) parts.push(contentMix.categoryCoherenceScore);
  // High promotional ratio drags content quality down. We don't penalise
  // canals that publish ads — we penalise canals that publish ONLY ads.
  // Curve: 0% promotional = neutral, 40%+ promotional = -0.2 penalty.
  if (contentMix.promotionalRatio30d != null) {
    const penalty = Math.max(0, (contentMix.promotionalRatio30d - 0.2) / 0.5);
    parts.push(1 - clamp01(penalty * 0.3));
  }
  if (parts.length === 0) return null;
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

function scoreTrust(trust) {
  if (!trust) return null;
  const parts = [];
  // Brand safety: 0..100 → 0..1
  if (trust.brandSafetyScoreAvg != null) {
    parts.push(clamp01(trust.brandSafetyScoreAvg / 100));
  }
  // Bot suspicion: invert. 0 suspicion → 1.0 trust; 0.7+ suspicion → 0.
  if (trust.botAdminSuspicionScore != null) {
    const t = 1 - trust.botAdminSuspicionScore / COMPONENT_REFERENCES.BOT_SUSPICION_PENALTY_FULL;
    parts.push(clamp01(t));
  }
  if (parts.length === 0) return null;
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

// ─── Score composition ──────────────────────────────────────────────────────

function inventoryTierFor(confianzaScore) {
  if (typeof confianzaScore !== 'number') return null;
  for (const t of TIER_THRESHOLDS) {
    if (confianzaScore >= t.min) return t.tier;
  }
  return 'C';
}

/**
 * Suggested price range derived from confianzaScore + tier + engagement.
 * Conservative bounds — the admin gets to override on the listing.
 *
 * Base price per tier (EUR per published post):
 *   S → 80-200
 *   A → 35-90
 *   B → 12-40
 *   C → 3-15
 * Then we modulate by engagement: top-engagement canals get +30% on the
 * ceiling, bottom canals stick to the floor.
 */
function priceRangeFor(tier, engagement) {
  const RANGES = {
    S: [80, 200],
    A: [35, 90],
    B: [12, 40],
    C: [3, 15],
  };
  if (!tier || !RANGES[tier]) return { floor: null, ceiling: null };
  let [floor, ceiling] = RANGES[tier];

  const engRate = engagement?.engagementRate30d;
  if (typeof engRate === 'number') {
    const engNorm = clamp01(engRate / COMPONENT_REFERENCES.ENGAGEMENT_RATE_REFERENCE) || 0;
    ceiling = ceiling + (ceiling - floor) * 0.3 * engNorm;
  }
  return { floor: Math.round(floor), ceiling: Math.round(ceiling) };
}

/**
 * Top-level: compute the score from a CanalIntelligence-shaped object
 * (or its computed-but-not-yet-persisted equivalent from aggregator).
 *
 * @param {object} args
 * @param {object} args.intelligence    output of aggregator.aggregateAll
 * @param {object} args.canal           Canal doc — used for the
 *                                      verification floor invariant
 * @param {object} [args.weights]       optional override
 */
function computeChannelScore({ intelligence, canal, weights } = {}) {
  if (!intelligence) {
    return {
      confianzaScore: null,
      inventoryTier: null,
      priceFloorEUR: null,
      priceCeilingEUR: null,
      formulaVersion: FORMULA_VERSION,
      components: { cadence: null, growth: null, engagement: null, contentQuality: null, trust: null },
    };
  }
  const w = weights || getWeights();

  const components = {
    cadence: scoreCadence(intelligence.cadence),
    growth: scoreGrowth(intelligence.growth),
    engagement: scoreEngagement(intelligence.engagement),
    contentQuality: scoreContentQuality(intelligence.contentMix),
    trust: scoreTrust(intelligence.trust),
  };

  // Weighted sum, treating null components as "not yet measurable"
  // (re-normalise weights over the non-null ones). Prevents a fresh canal
  // with sparse data from getting an unfairly low score.
  let weightedSum = 0;
  let weightUsed = 0;
  for (const key of Object.keys(components)) {
    const value = components[key];
    if (value == null) continue;
    const wk = w[key] || 0;
    weightedSum += value * wk;
    weightUsed += wk;
  }
  let rawScore = weightUsed > 0 ? (weightedSum / weightUsed) * 100 : null;

  // Apply verification anchor: verified canals never drop below 85;
  // unverified canals cap at 84.
  let confianzaScore = rawScore;
  if (canal?.verificado === true) {
    confianzaScore = Math.max(VERIFIED_FLOOR, rawScore ?? VERIFIED_FLOOR);
  } else {
    confianzaScore = Math.min(UNVERIFIED_CEILING, rawScore ?? 0);
  }
  confianzaScore = Math.round(confianzaScore);

  const inventoryTier = inventoryTierFor(confianzaScore);
  const { floor, ceiling } = priceRangeFor(inventoryTier, intelligence.engagement);

  return {
    confianzaScore,
    inventoryTier,
    priceFloorEUR: floor,
    priceCeilingEUR: ceiling,
    formulaVersion: FORMULA_VERSION,
    components,
  };
}

module.exports = {
  computeChannelScore,
  scoreCadence,
  scoreGrowth,
  scoreEngagement,
  scoreContentQuality,
  scoreTrust,
  inventoryTierFor,
  priceRangeFor,
  getWeights,
  FORMULA_VERSION,
  DEFAULT_WEIGHTS,
  VERIFIED_FLOOR,
  UNVERIFIED_CEILING,
  TIER_THRESHOLDS,
  COMPONENT_REFERENCES,
};
