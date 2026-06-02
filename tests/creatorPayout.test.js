/**
 * Proportional creator payout (product decision 2026-06).
 *
 * Promo/welcome credits are a discount, not cash — the creator's withdrawable
 * payout is their share of the money actually captured, never of the full
 * price. A 100%-credit-funded campaign must yield a 0 EUR payout, which closes
 * the audit's credits→cash money-loss vector.
 */
const { computeCreatorPayable, resolveCreatorPayable } = require('../lib/creatorPayout');

describe('computeCreatorPayable — share of captured money', () => {
  test('fully credit-funded (0 captured) → 0', () => {
    expect(computeCreatorPayable(0, 0.15)).toBe(0);
  });

  test('fully real money → price*(1-rate)', () => {
    expect(computeCreatorPayable(100, 0.15)).toBe(85);
  });

  test('partial credits → captured share only (price 100, 30 credits → 70 captured)', () => {
    expect(computeCreatorPayable(70, 0.15)).toBe(59.5);
  });

  test('null/NaN captured is treated as 0', () => {
    expect(computeCreatorPayable(undefined, 0.15)).toBe(0);
    expect(computeCreatorPayable(NaN, 0.15)).toBe(0);
  });

  test('negative captured can never produce a negative payout', () => {
    expect(computeCreatorPayable(-50, 0.15)).toBe(0);
  });

  test('missing rate falls back to the configured default (still finite, >= 0)', () => {
    const v = computeCreatorPayable(100, undefined);
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThanOrEqual(100);
  });
});

describe('resolveCreatorPayable — what a creator can withdraw', () => {
  test('prefers the persisted creatorPayable', () => {
    expect(resolveCreatorPayable({ creatorPayable: 42, netAmount: 85, price: 100 })).toBe(42);
  });

  test('a fully credit-funded completed campaign is NOT withdrawable (0, not netAmount)', () => {
    expect(resolveCreatorPayable({ creatorPayable: 0, netAmount: 85 })).toBe(0);
  });

  test('derives from capturedAmount when creatorPayable is absent', () => {
    expect(resolveCreatorPayable({ capturedAmount: 70, commissionRate: 0.15 })).toBe(59.5);
  });

  test('legacy campaign (no captured fields) falls back to netAmount', () => {
    expect(resolveCreatorPayable({ netAmount: 85, price: 100, commissionRate: 0.15 })).toBe(85);
  });

  test('legacy with neither captured nor netAmount derives from price', () => {
    expect(resolveCreatorPayable({ price: 100, commissionRate: 0.15 })).toBe(85);
  });

  test('null campaign → 0 (never throws)', () => {
    expect(resolveCreatorPayable(null)).toBe(0);
    expect(resolveCreatorPayable(undefined)).toBe(0);
  });
});

describe('pricing v2 — advertiser-paid commission (creator gets 100% of base)', () => {
  test('computeCreatorPayable: captured is gross, creator share = captured/(1+rate)', () => {
    // advertiser paid €120 (base €100 + 20% on top) → creator gets €100
    expect(computeCreatorPayable(120, 0.20, 2)).toBe(100);
    // €60 captured (half paid) → €50 to creator
    expect(computeCreatorPayable(60, 0.20, 2)).toBe(50);
  });

  test('v1 remains the default when pricingVersion is omitted (commission deducted)', () => {
    expect(computeCreatorPayable(100, 0.20)).toBe(80);
    expect(computeCreatorPayable(100, 0.20, 1)).toBe(80);
  });

  test('resolveCreatorPayable derives v2 share from capturedAmount', () => {
    expect(resolveCreatorPayable({ capturedAmount: 120, commissionRate: 0.20, pricingVersion: 2 })).toBe(100);
  });

  test('resolveCreatorPayable v2 fallback from price (no captured/net) = price/(1+rate)', () => {
    expect(resolveCreatorPayable({ price: 120, commissionRate: 0.20, pricingVersion: 2 })).toBe(100);
  });

  test('v2 founder channel (18%): €118 gross → €100 to creator', () => {
    expect(computeCreatorPayable(118, 0.18, 2)).toBe(100);
  });
});
