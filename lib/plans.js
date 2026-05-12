/**
 * ChannelAd — Subscription plan helpers (v1.0, Fase 1).
 *
 * Pure functions that resolve a user's effective plan, feature flags, and
 * commission rate. NO database calls — callers pass plain user objects.
 *
 * Anywhere that needs to know "what plan is this user on" or "can this user
 * use feature X" must go through here. Do not read user.subscription
 * directly in business code — use getUserPlan(user) so the active/trial/
 * expired logic stays in one place.
 */

const { PLANS, DEFAULT_PLAN_BY_ROLE, isValidPlanKey } = require('../config/plans');
const { resolveCommissionRate } = require('../config/commissions');

const ACTIVE_STATUSES = new Set(['active', 'trialing', 'granted']);

/**
 * Return the plan key currently in effect for this user.
 * Falls back to the role's free tier if subscription is missing, expired,
 * canceled, or the stored plan key is unknown.
 *
 * @param {Object} user - Mongoose Usuario doc or lean object
 * @returns {string} a key of PLANS (e.g. 'advertiser_pro')
 */
function getUserPlanKey(user) {
  const role = user?.rol === 'creator' ? 'creator' : 'advertiser';
  const fallback = DEFAULT_PLAN_BY_ROLE[role];

  const sub = user?.subscription;
  if (!sub || !isValidPlanKey(sub.plan)) return fallback;
  if (!ACTIVE_STATUSES.has(sub.status)) return fallback;

  // Sanity check: the plan must belong to the user's role. Prevents an
  // advertiser from carrying a creator plan and vice versa (e.g. after a
  // role swap).
  if (PLANS[sub.plan].role !== role) return fallback;

  // currentPeriodEnd guard: if set and in the past, treat as expired.
  // (Stripe webhook is supposed to flip status to 'canceled' or 'past_due',
  // but defensive check.)
  if (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) < new Date()) {
    return fallback;
  }

  return sub.plan;
}

/** Return the full plan config for this user. */
function getUserPlan(user) {
  return PLANS[getUserPlanKey(user)];
}

/**
 * True iff the user's plan unlocks the named feature.
 * Unknown feature names → false (fail-closed).
 */
function hasFeature(user, feature) {
  const plan = getUserPlan(user);
  return Boolean(plan?.features?.[feature]);
}

/**
 * Return a numeric limit for the user's plan (e.g. 'maxChannels',
 * 'conversionsPerMonth', 'lookbackDays'). Infinity for unlimited.
 * Unknown limit → 0 (fail-closed; callers should treat 0 as "blocked").
 */
function getLimit(user, key) {
  const plan = getUserPlan(user);
  const val = plan?.limits?.[key];
  if (val === Infinity) return Infinity;
  if (typeof val !== 'number') return 0;
  return val;
}

/**
 * Effective commission rate for a campaign about to be created by this
 * advertiser. Priority:
 *   1. Plan override (advertiser_pro → 0.15, etc.)
 *   2. Global resolveCommissionRate(ctx) — volume, type, partner, etc.
 *
 * The returned rate must be SNAPSHOTTED on Campaign.commissionRate at
 * creation time (the existing pre-save hook on Campaign already does this
 * — see models/Campaign.js). Never recompute the rate for an already-saved
 * campaign or transaction; that would break historical billing.
 *
 * @param {Object} advertiser - Usuario doc with .subscription populated
 * @param {Object} [ctx]      - Context for the global resolver (partnerAPI,
 *                              monthlyGMV, campaignType, hasAdminAccess)
 * @returns {number} rate in [0, 1]
 */
function effectiveCommissionRate(advertiser, ctx = {}) {
  const baseline = resolveCommissionRate(ctx);

  // Only advertisers carry a commission override. Creators' plans never
  // affect their commission cut (decision: pricing #3, 2026-05-12).
  if (advertiser?.rol !== 'advertiser') return baseline;

  const plan = getUserPlan(advertiser);
  const override = plan?.commissionRateOverride;
  if (typeof override !== 'number') return baseline;

  // The override REPLACES the standard/volume/type rate, but partner-API
  // campaigns keep their special wholesale rate (0.18) since that's a B2B
  // contract, not a subscription perk.
  if (ctx.isPartnerAPI) return baseline;

  // Otherwise pick the better-for-advertiser rate between the override
  // and the resolver output (so a volumeHigh advertiser on Pro doesn't
  // get worse terms than they would on Free).
  return Math.min(override, baseline);
}

module.exports = {
  getUserPlanKey,
  getUserPlan,
  hasFeature,
  getLimit,
  effectiveCommissionRate,
  ACTIVE_STATUSES,
};
