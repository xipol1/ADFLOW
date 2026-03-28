/**
 * Adflow Scoring & Pricing Engine
 *
 * channel_score =
 *   Attention (25%) + Intent (15%) + Trust (20%) +
 *   Performance (25%) + Liquidity (15%)
 *
 * price =
 *   (attention × CPM / 1000) × (score / 50) × adjustments
 */

// ── Intent lookup by category ────────────────────────────────────────────────
const INTENT_MAP = {
  memes: 40,
  humor: 40,
  entretenimiento: 45,
  news: 60,
  noticias: 60,
  general: 70,
  gaming: 55,
  fitness: 75,
  salud: 75,
  educacion: 80,
  niche: 85,
  tecnologia: 85,
  technology: 85,
  marketing: 85,
  negocios: 90,
  business: 90,
  finanzas: 90,
  finance: 90,
  ecommerce: 90,
  high_intent: 100,
  crypto: 95,
  investing: 95,
};

// ── Platform CPM baselines (€ per 1000 views) ───────────────────────────────
const CPM_MAP = {
  telegram: 8,
  discord: 5,
  whatsapp: 12,
  instagram: 15,
  newsletter: 20,
  facebook: 10,
  blog: 6,
  default: 8,
};

// ── Minimum prices per platform (€) ─────────────────────────────────────────
const MIN_PRICE = {
  telegram: 50,
  discord: 30,
  whatsapp: 60,
  instagram: 80,
  newsletter: 80,
  facebook: 40,
  blog: 30,
  default: 30,
};

/**
 * Calculate attention score (0-100)
 * attention = views_avg × engagement_rate × scroll_depth
 * attention_score = min(100, (attention / 5000) × 100)
 */
function calcAttention(metrics) {
  const viewsAvg = metrics.viewsAvg || 0;
  const engagementRate = metrics.engagementRate || 0;
  const scrollDepth = metrics.scrollDepth || 0.5;

  const attention = viewsAvg * engagementRate * scrollDepth;
  return Math.min(100, (attention / 5000) * 100);
}

/**
 * Calculate intent score (0-100)
 * Based on channel category
 */
function calcIntent(category) {
  if (!category) return 70; // default general
  const key = String(category).toLowerCase().trim();
  return INTENT_MAP[key] || 70;
}

/**
 * Calculate trust score (0-100)
 * trust_score = (repeat_rate × 50) + (audience_quality × 50)
 */
function calcTrust(metrics) {
  const repeatRate = Math.min(1, metrics.repeatRate || 0);
  const audienceQuality = Math.min(1, metrics.audienceQuality || 0.5);

  let base = (repeatRate * 50) + (audienceQuality * 50);

  // Penalty for disputes/refunds
  const totalCampaigns = metrics.totalCampaigns || 1;
  const disputeRate = (metrics.disputes || 0) / Math.max(totalCampaigns, 1);
  const refundRate = (metrics.refunds || 0) / Math.max(totalCampaigns, 1);

  base -= disputeRate * 20;
  base -= refundRate * 15;

  // Bonus for verified channels
  if (metrics.verifiedSince) {
    const monthsVerified = (Date.now() - new Date(metrics.verifiedSince).getTime()) / (30 * 24 * 60 * 60 * 1000);
    base += Math.min(10, monthsVerified * 0.5);
  }

  // Bonus for on-time publishing
  if (metrics.publishOnTime > 0.9) base += 5;
  if (metrics.publishOnTime > 0.95) base += 5;

  return Math.max(0, Math.min(100, base));
}

/**
 * Calculate performance score (0-100)
 * ctr_score = min(100, (ctr / 0.02) × 100)
 * conversion_score = min(100, (conversion / 0.02) × 100)
 * performance_score = (ctr_score × 0.6) + (conversion_score × 0.4)
 */
function calcPerformance(metrics) {
  const ctr = metrics.ctr || 0;
  const conversion = metrics.conversionRate || 0;

  const ctrScore = Math.min(100, (ctr / 0.02) * 100);
  const conversionScore = Math.min(100, (conversion / 0.02) * 100);

  return (ctrScore * 0.6) + (conversionScore * 0.4);
}

/**
 * Calculate liquidity score (0-100)
 * liquidity_score = fill_rate × 100
 */
function calcLiquidity(metrics) {
  const fillRate = Math.min(1, metrics.fillRate || 0);
  let base = fillRate * 100;

  // Bonus for fast response time
  const avgResponse = metrics.avgResponseTime || 24;
  if (avgResponse < 2) base += 10;
  else if (avgResponse < 6) base += 5;
  else if (avgResponse > 48) base -= 10;

  return Math.max(0, Math.min(100, base));
}

/**
 * Calculate channel score (0-100) — the composite score
 *
 * @param {Object} metrics - ChannelMetrics document
 * @param {String} category - Channel category
 * @returns {Object} { attention, intent, trust, performance, liquidity, total }
 */
function calculateChannelScore(metrics, category) {
  const attention = calcAttention(metrics);
  const intent = calcIntent(category);
  const trust = calcTrust(metrics);
  const performance = calcPerformance(metrics);
  const liquidity = calcLiquidity(metrics);

  const total = Math.round(
    (attention * 0.25) +
    (intent * 0.15) +
    (trust * 0.20) +
    (performance * 0.25) +
    (liquidity * 0.15)
  );

  return {
    attention: Math.round(attention),
    intent: Math.round(intent),
    trust: Math.round(trust),
    performance: Math.round(performance),
    liquidity: Math.round(liquidity),
    total: Math.max(0, Math.min(100, total)),
  };
}

/**
 * Calculate recommended price (€) — dynamic pricing
 *
 * price = (attention × cpm / 1000) × (score / 50)
 * + fill_rate adjustments
 * + minimum floor
 *
 * @param {Object} metrics - ChannelMetrics document
 * @param {Object} scores  - Output from calculateChannelScore()
 * @param {String} platform - Channel platform
 * @returns {Number} recommended price in €
 */
function calculatePrice(metrics, scores, platform) {
  const viewsAvg = metrics.viewsAvg || 0;
  const engagementRate = metrics.engagementRate || 0;
  const scrollDepth = metrics.scrollDepth || 0.5;
  const fillRate = Math.min(1, metrics.fillRate || 0);

  const plat = String(platform || 'default').toLowerCase().trim();
  const cpm = CPM_MAP[plat] || CPM_MAP.default;
  const minPrice = MIN_PRICE[plat] || MIN_PRICE.default;

  // Base attention value
  const attention = viewsAvg * engagementRate * scrollDepth;

  // Core formula
  let price = (attention * cpm / 1000) * (scores.total / 50);

  // Fill rate adjustments
  if (fillRate < 0.4) price *= 0.8;
  else if (fillRate > 0.8) price *= 1.2;

  // Engagement premium
  if (engagementRate > 0.1) price *= 1.1;
  if (engagementRate > 0.2) price *= 1.15;

  // Performance premium
  if (scores.performance > 70) price *= 1.1;
  if (scores.performance > 90) price *= 1.15;

  // Trust premium
  if (scores.trust > 80) price *= 1.05;

  // Round to nearest €5
  price = Math.round(price / 5) * 5;

  // Floor
  return Math.max(minPrice, price);
}

/**
 * Calculate day-level pricing multiplier based on audience insights
 *
 * @param {Number} dayScore - Day insight score (0-100)
 * @param {Number} basePrice - The channel's recommended price
 * @returns {Number} adjusted price for that day
 */
function calculateDayPrice(dayScore, basePrice) {
  // Score 0 = -20%, Score 50 = base, Score 100 = +30%
  const multiplier = 0.8 + (dayScore / 100) * 0.5;
  const price = Math.round((basePrice * multiplier) / 5) * 5;
  return Math.max(price, 5);
}

module.exports = {
  calculateChannelScore,
  calculatePrice,
  calculateDayPrice,
  calcAttention,
  calcIntent,
  calcTrust,
  calcPerformance,
  calcLiquidity,
  INTENT_MAP,
  CPM_MAP,
  MIN_PRICE,
};
