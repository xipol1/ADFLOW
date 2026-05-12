/**
 * ChannelAd — Subscription plans (v1.0, Fase 1).
 *
 * Single source of truth for the four subscription tiers and the
 * Enterprise tier (custom-priced, granted manually by an admin).
 *
 * Pricing here is PROVISIONAL — iterate via this file only, no other
 * module should hardcode plan amounts, limits, or features.
 *
 * Pricing model:
 *   - creator_free / advertiser_free: €0, default tier on signup.
 *   - creator_pro: €15/mo or €144/year (-20%). Justified by features only
 *     (no commission rebate for creators).
 *   - advertiser_pro: €49/mo or €470/year (-20%). Lever = commission rate
 *     drops from 0.20 → 0.15. Break-even at ~€980/mo of campaign spend.
 *   - *_enterprise: customPriced=true, admin-granted, no auto-checkout.
 */

const PLANS = {
  creator_free: {
    role: 'creator',
    tier: 'free',
    label: 'Creator',
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    commissionRateOverride: null, // no override → falls back to global resolveCommissionRate()
    limits: {
      maxChannels: 2,
    },
    features: {
      priorityListing: false,
      advancedAnalytics: false,
      apiAccess: false,
      customSlug: false,
      proBadge: false,
    },
  },

  creator_pro: {
    role: 'creator',
    tier: 'pro',
    label: 'Creator Pro',
    monthlyPriceCents: 1500,   // €15
    annualPriceCents: 14400,   // €144 (-20% vs €180)
    commissionRateOverride: null,
    limits: {
      maxChannels: Infinity,
    },
    features: {
      priorityListing: true,
      advancedAnalytics: true,
      apiAccess: true,
      customSlug: true,
      proBadge: true,
    },
  },

  creator_enterprise: {
    role: 'creator',
    tier: 'enterprise',
    label: 'Creator Enterprise',
    monthlyPriceCents: null,   // custom-priced
    annualPriceCents: null,
    customPriced: true,
    commissionRateOverride: null, // negotiated case-by-case via grantedBy admin
    limits: {
      maxChannels: Infinity,
    },
    features: {
      priorityListing: true,
      advancedAnalytics: true,
      apiAccess: true,
      customSlug: true,
      proBadge: true,
    },
  },

  advertiser_free: {
    role: 'advertiser',
    tier: 'free',
    label: 'Advertiser',
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    commissionRateOverride: 0.20, // baseline; matches COMMISSION_TIERS.standard
    limits: {
      conversionsPerMonth: 1000,
      lookbackDays: 7,
    },
    features: {
      bulkLauncher: false,
      lookalike: false,
      nicheHeatmap: false,
      audienceInsights: false,
      abTestLab: false,
      forecastRoi: false,
      realtimeMonitor: false,
      multiTouchAttribution: false,
      outgoingWebhooks: false,
    },
  },

  advertiser_pro: {
    role: 'advertiser',
    tier: 'pro',
    label: 'Advertiser Pro',
    monthlyPriceCents: 4900,   // €49
    annualPriceCents: 47040,   // €470.40 (-20% vs €588)
    commissionRateOverride: 0.15, // ← the lever; 5pp below the 0.20 standard
    limits: {
      conversionsPerMonth: Infinity,
      lookbackDays: 90,
    },
    features: {
      bulkLauncher: true,
      lookalike: true,
      nicheHeatmap: true,
      audienceInsights: true,
      abTestLab: true,
      forecastRoi: true,
      realtimeMonitor: true,
      multiTouchAttribution: true,
      outgoingWebhooks: true,
    },
  },

  advertiser_enterprise: {
    role: 'advertiser',
    tier: 'enterprise',
    label: 'Advertiser Enterprise',
    monthlyPriceCents: null,
    annualPriceCents: null,
    customPriced: true,
    commissionRateOverride: null, // negotiated; null = use admin-set override on user
    limits: {
      conversionsPerMonth: Infinity,
      lookbackDays: 90,
    },
    features: {
      bulkLauncher: true,
      lookalike: true,
      nicheHeatmap: true,
      audienceInsights: true,
      abTestLab: true,
      forecastRoi: true,
      realtimeMonitor: true,
      multiTouchAttribution: true,
      outgoingWebhooks: true,
    },
  },
};

const TRIAL_DAYS = 14;
const ANNUAL_DISCOUNT = 0.20;

const DEFAULT_PLAN_BY_ROLE = {
  creator: 'creator_free',
  advertiser: 'advertiser_free',
};

const PLAN_KEYS = Object.keys(PLANS);

function isValidPlanKey(key) {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(PLANS, key);
}

module.exports = {
  PLANS,
  PLAN_KEYS,
  TRIAL_DAYS,
  ANNUAL_DISCOUNT,
  DEFAULT_PLAN_BY_ROLE,
  isValidPlanKey,
};
