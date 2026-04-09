const {
  COMMISSION_TIERS,
  DEFAULT_COMMISSION_RATE,
  resolveCommissionRate,
} = require('../config/commissions');

describe('COMMISSION_TIERS', () => {
  test('standard tier is 20%', () => {
    expect(COMMISSION_TIERS.standard).toBe(0.20);
  });

  test('all required tiers are defined with expected rates', () => {
    expect(COMMISSION_TIERS).toEqual({
      standard:      0.20,
      autoCampaign:  0.25,
      collaborative: 0.28,
      noAdminAccess: 0.22,
      partnerAPI:    0.18,
      volumeMid:     0.18,
      volumeHigh:    0.15,
    });
  });

  test('noAdminAccess carries +2% penalty over standard', () => {
    expect(COMMISSION_TIERS.noAdminAccess - COMMISSION_TIERS.standard).toBeCloseTo(0.02, 10);
  });

  test('volume tiers are strictly lower than standard', () => {
    expect(COMMISSION_TIERS.volumeMid).toBeLessThan(COMMISSION_TIERS.standard);
    expect(COMMISSION_TIERS.volumeHigh).toBeLessThan(COMMISSION_TIERS.volumeMid);
  });

  test('premium campaign tiers are higher than standard', () => {
    expect(COMMISSION_TIERS.autoCampaign).toBeGreaterThan(COMMISSION_TIERS.standard);
    expect(COMMISSION_TIERS.collaborative).toBeGreaterThan(COMMISSION_TIERS.autoCampaign);
  });

  test('DEFAULT_COMMISSION_RATE equals standard tier', () => {
    expect(DEFAULT_COMMISSION_RATE).toBe(COMMISSION_TIERS.standard);
  });
});

describe('resolveCommissionRate', () => {
  test('no context returns standard', () => {
    expect(resolveCommissionRate()).toBe(COMMISSION_TIERS.standard);
    expect(resolveCommissionRate({})).toBe(COMMISSION_TIERS.standard);
  });

  test('partner API wins over everything', () => {
    expect(
      resolveCommissionRate({
        isPartnerAPI: true,
        campaignType: 'collaborative',
        monthlyGMV: 50000,
      }),
    ).toBe(COMMISSION_TIERS.partnerAPI);
  });

  test('volume tiers take precedence over campaign type', () => {
    expect(resolveCommissionRate({ monthlyGMV: 25000 })).toBe(COMMISSION_TIERS.volumeHigh);
    expect(resolveCommissionRate({ monthlyGMV: 6000 })).toBe(COMMISSION_TIERS.volumeMid);
    expect(
      resolveCommissionRate({ monthlyGMV: 25000, campaignType: 'collaborative' }),
    ).toBe(COMMISSION_TIERS.volumeHigh);
  });

  test('campaign type resolves when no volume tier applies', () => {
    expect(resolveCommissionRate({ campaignType: 'autoCampaign' })).toBe(
      COMMISSION_TIERS.autoCampaign,
    );
    expect(resolveCommissionRate({ campaignType: 'collaborative' })).toBe(
      COMMISSION_TIERS.collaborative,
    );
  });

  test('hasAdminAccess=false triggers noAdminAccess penalty', () => {
    expect(resolveCommissionRate({ hasAdminAccess: false })).toBe(COMMISSION_TIERS.noAdminAccess);
  });

  test('hasAdminAccess default (undefined/true) leaves standard in place', () => {
    expect(resolveCommissionRate({ hasAdminAccess: true })).toBe(COMMISSION_TIERS.standard);
    expect(resolveCommissionRate({})).toBe(COMMISSION_TIERS.standard);
  });

  test('volume threshold boundary is inclusive (≥5000 and ≥20000)', () => {
    expect(resolveCommissionRate({ monthlyGMV: 5000 })).toBe(COMMISSION_TIERS.volumeMid);
    expect(resolveCommissionRate({ monthlyGMV: 4999 })).toBe(COMMISSION_TIERS.standard);
    expect(resolveCommissionRate({ monthlyGMV: 20000 })).toBe(COMMISSION_TIERS.volumeHigh);
  });
});
