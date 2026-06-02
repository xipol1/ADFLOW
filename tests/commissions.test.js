const {
  COMMISSION_TIERS,
  MIN_COMMISSION_RATE,
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
      founder:       0.18,
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

describe('resolveCommissionRate — founder channel (18% vitalicio cap)', () => {
  test('founder channel caps a standard campaign at 18%', () => {
    expect(resolveCommissionRate({ isFounderChannel: true })).toBe(COMMISSION_TIERS.founder);
    expect(resolveCommissionRate({ isFounderChannel: true })).toBe(0.18);
  });

  test('founder cap lowers higher tiers (autoCampaign 25%, collaborative 28%, noAdminAccess 22%)', () => {
    expect(resolveCommissionRate({ isFounderChannel: true, campaignType: 'autoCampaign' })).toBe(0.18);
    expect(resolveCommissionRate({ isFounderChannel: true, campaignType: 'collaborative' })).toBe(0.18);
    expect(resolveCommissionRate({ isFounderChannel: true, hasAdminAccess: false })).toBe(0.18);
  });

  test('founder cap never RAISES an already-better rate (volumeHigh 15% stays 15%)', () => {
    expect(resolveCommissionRate({ isFounderChannel: true, monthlyGMV: 25000 })).toBe(COMMISSION_TIERS.volumeHigh);
    expect(resolveCommissionRate({ isFounderChannel: true, isPartnerAPI: true })).toBe(0.18);
  });

  test('isFounderChannel only applies when strictly true', () => {
    expect(resolveCommissionRate({ isFounderChannel: false })).toBe(COMMISSION_TIERS.standard);
    expect(resolveCommissionRate({ isFounderChannel: undefined })).toBe(COMMISSION_TIERS.standard);
  });
});

describe('resolveCommissionRate — floor invariant', () => {
  test('MIN_COMMISSION_RATE is the volumeHigh tier (15%) and no resolvable rate ever drops below it', () => {
    expect(MIN_COMMISSION_RATE).toBe(0.15);
    expect(MIN_COMMISSION_RATE).toBe(COMMISSION_TIERS.volumeHigh);
    const ctxs = [
      {}, { isFounderChannel: true },
      { isFounderChannel: true, monthlyGMV: 999999, isPartnerAPI: true },
      { monthlyGMV: 25000 }, { campaignType: 'autoCampaign' }, { hasAdminAccess: false },
    ];
    for (const ctx of ctxs) {
      expect(resolveCommissionRate(ctx)).toBeGreaterThanOrEqual(MIN_COMMISSION_RATE);
    }
  });
});
