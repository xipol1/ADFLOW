/**
 * ChannelAd — Platform commission tiers (v2.0).
 *
 * Single source of truth for commission rates across the platform.
 * Any controller, service, or job that charges the platform fee must
 * import from this file. Do NOT hardcode commission rates anywhere else.
 */

const COMMISSION_TIERS = {
  standard:       0.20,  // manual standard campaign
  autoCampaign:   0.25,  // auto-campaign
  collaborative:  0.28,  // premium collaborative campaign
  noAdminAccess:  0.22,  // channel without admin access (+2% penalty)
  partnerAPI:     0.18,  // Getalink and future API partners
  volumeMid:      0.18,  // advertiser with >€5K/month GMV
  volumeHigh:     0.15,  // advertiser with >€20K/month GMV
};

/**
 * Resolve the commission rate for a campaign based on its context.
 * Priority order (highest → lowest):
 *   1. Partner API campaign
 *   2. Volume tier (based on advertiser monthly GMV)
 *   3. Campaign type (autoCampaign / collaborative)
 *   4. Channel without admin access (penalty)
 *   5. standard fallback
 *
 * @param {Object} ctx
 * @param {boolean} [ctx.isPartnerAPI]     - Campaign created via partner API (Getalink, etc.)
 * @param {number}  [ctx.monthlyGMV]       - Advertiser monthly GMV in € (volume discount)
 * @param {string}  [ctx.campaignType]     - 'standard' | 'autoCampaign' | 'collaborative'
 * @param {boolean} [ctx.hasAdminAccess]   - Whether the channel has admin access (default true)
 * @returns {number} commission rate in [0, 1]
 */
function resolveCommissionRate(ctx = {}) {
  if (ctx.isPartnerAPI) return COMMISSION_TIERS.partnerAPI;

  const gmv = Number(ctx.monthlyGMV) || 0;
  if (gmv >= 20000) return COMMISSION_TIERS.volumeHigh;
  if (gmv >= 5000)  return COMMISSION_TIERS.volumeMid;

  if (ctx.campaignType === 'collaborative') return COMMISSION_TIERS.collaborative;
  if (ctx.campaignType === 'autoCampaign')  return COMMISSION_TIERS.autoCampaign;

  // hasAdminAccess defaults to true; only penalize when explicitly false.
  if (ctx.hasAdminAccess === false) return COMMISSION_TIERS.noAdminAccess;

  return COMMISSION_TIERS.standard;
}

/**
 * Legacy default. Prefer resolveCommissionRate() for new code.
 * Exposed so older modules can migrate incrementally without hardcoding 0.20.
 */
const DEFAULT_COMMISSION_RATE = COMMISSION_TIERS.standard;

module.exports = {
  COMMISSION_TIERS,
  DEFAULT_COMMISSION_RATE,
  resolveCommissionRate,
};
