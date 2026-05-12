const {
  getUserPlanKey,
  getUserPlan,
  hasFeature,
  getLimit,
  effectiveCommissionRate,
} = require('../lib/plans');
const { PLANS, isValidPlanKey } = require('../config/plans');

const advertiserFree = { rol: 'advertiser' };
const creatorFree    = { rol: 'creator' };
const advertiserPro = {
  rol: 'advertiser',
  subscription: { plan: 'advertiser_pro', status: 'active' },
};
const creatorPro = {
  rol: 'creator',
  subscription: { plan: 'creator_pro', status: 'trialing' },
};
const grantedEnt = {
  rol: 'advertiser',
  subscription: { plan: 'advertiser_enterprise', status: 'granted' },
};
const expiredPro = {
  rol: 'advertiser',
  subscription: { plan: 'advertiser_pro', status: 'expired' },
};
const pastPeriod = {
  rol: 'advertiser',
  subscription: {
    plan: 'advertiser_pro',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() - 1000),
  },
};
const wrongRolePlan = {
  rol: 'creator',
  subscription: { plan: 'advertiser_pro', status: 'active' },
};

describe('config/plans.js — definitions', () => {
  test('all 6 plan keys exist with correct roles', () => {
    expect(Object.keys(PLANS).sort()).toEqual([
      'advertiser_enterprise',
      'advertiser_free',
      'advertiser_pro',
      'creator_enterprise',
      'creator_free',
      'creator_pro',
    ]);
  });
  test('advertiser_pro carries the 15% commission lever', () => {
    expect(PLANS.advertiser_pro.commissionRateOverride).toBe(0.15);
  });
  test('creator plans have no commission override', () => {
    expect(PLANS.creator_free.commissionRateOverride).toBeNull();
    expect(PLANS.creator_pro.commissionRateOverride).toBeNull();
  });
  test('enterprise plans are customPriced', () => {
    expect(PLANS.advertiser_enterprise.customPriced).toBe(true);
    expect(PLANS.creator_enterprise.customPriced).toBe(true);
  });
  test('annual pricing reflects -20%', () => {
    expect(PLANS.creator_pro.annualPriceCents).toBe(Math.round(PLANS.creator_pro.monthlyPriceCents * 12 * 0.8));
    expect(PLANS.advertiser_pro.annualPriceCents).toBe(Math.round(PLANS.advertiser_pro.monthlyPriceCents * 12 * 0.8));
  });
  test('isValidPlanKey gatekeeps unknowns', () => {
    expect(isValidPlanKey('advertiser_pro')).toBe(true);
    expect(isValidPlanKey('hacker_god')).toBe(false);
    expect(isValidPlanKey(null)).toBe(false);
  });
});

describe('getUserPlanKey / getUserPlan', () => {
  test('no subscription → role free tier', () => {
    expect(getUserPlanKey(advertiserFree)).toBe('advertiser_free');
    expect(getUserPlanKey(creatorFree)).toBe('creator_free');
  });
  test('active paid subscription → that plan', () => {
    expect(getUserPlanKey(advertiserPro)).toBe('advertiser_pro');
    expect(getUserPlanKey(creatorPro)).toBe('creator_pro');
  });
  test('granted enterprise → that plan', () => {
    expect(getUserPlanKey(grantedEnt)).toBe('advertiser_enterprise');
  });
  test('expired subscription → free fallback', () => {
    expect(getUserPlanKey(expiredPro)).toBe('advertiser_free');
  });
  test('past currentPeriodEnd → free fallback', () => {
    expect(getUserPlanKey(pastPeriod)).toBe('advertiser_free');
  });
  test('plan belonging to wrong role → free fallback', () => {
    expect(getUserPlanKey(wrongRolePlan)).toBe('creator_free');
  });
  test('getUserPlan returns full config', () => {
    expect(getUserPlan(advertiserPro).label).toBe('Advertiser Pro');
  });
});

describe('hasFeature', () => {
  test('Free advertiser cannot bulkLaunch', () => {
    expect(hasFeature(advertiserFree, 'bulkLauncher')).toBe(false);
  });
  test('Pro advertiser can bulkLaunch', () => {
    expect(hasFeature(advertiserPro, 'bulkLauncher')).toBe(true);
  });
  test('Pro creator gets priorityListing', () => {
    expect(hasFeature(creatorPro, 'priorityListing')).toBe(true);
  });
  test('unknown feature → false', () => {
    expect(hasFeature(advertiserPro, 'teleportation')).toBe(false);
  });
});

describe('getLimit', () => {
  test('Free advertiser conversion cap is 1000', () => {
    expect(getLimit(advertiserFree, 'conversionsPerMonth')).toBe(1000);
  });
  test('Pro advertiser conversion cap is unlimited', () => {
    expect(getLimit(advertiserPro, 'conversionsPerMonth')).toBe(Infinity);
  });
  test('Free creator max channels = 2', () => {
    expect(getLimit(creatorFree, 'maxChannels')).toBe(2);
  });
  test('unknown limit key → 0', () => {
    expect(getLimit(advertiserPro, 'galaxies')).toBe(0);
  });
});

describe('effectiveCommissionRate', () => {
  test('Free advertiser, standard campaign → 0.20', () => {
    expect(effectiveCommissionRate(advertiserFree, { campaignType: 'standard' })).toBe(0.20);
  });
  test('Pro advertiser, standard campaign → 0.15 (the lever)', () => {
    expect(effectiveCommissionRate(advertiserPro, { campaignType: 'standard' })).toBe(0.15);
  });
  test('Pro advertiser does not get worse than volumeHigh', () => {
    // volumeHigh is 0.15 — same as override. Min should still be 0.15.
    expect(effectiveCommissionRate(advertiserPro, { monthlyGMV: 30000 })).toBe(0.15);
  });
  test('Pro advertiser auto-campaign is the cheaper of 0.15 vs 0.25 → 0.15', () => {
    expect(effectiveCommissionRate(advertiserPro, { campaignType: 'autoCampaign' })).toBe(0.15);
  });
  test('Partner API rate is untouched by subscription override', () => {
    expect(effectiveCommissionRate(advertiserPro, { isPartnerAPI: true })).toBe(0.18);
  });
  test('Creator subscription never alters commission', () => {
    expect(effectiveCommissionRate(creatorPro, { campaignType: 'standard' })).toBe(0.20);
  });
});
