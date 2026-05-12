/**
 * Pure-function tests for services/subscriptionService.
 * The Stripe-backed flows (createCheckoutSession, handleWebhookEvent) are
 * smoke-tested at the boundary — we don't hit the real Stripe API here.
 */

const path = require('path');

// Stub Stripe so require('stripe')(key) returns a controllable mock.
jest.mock('stripe', () => {
  const mock = jest.fn();
  return jest.fn(() => ({
    customers: { create: jest.fn(async () => ({ id: 'cus_mock' })) },
    checkout: {
      sessions: { create: jest.fn(async (args) => ({ id: 'cs_mock', url: 'https://checkout.stripe.com/c/mock', __args: args })) },
    },
    billingPortal: {
      sessions: { create: jest.fn(async () => ({ url: 'https://billing.stripe.com/p/mock' })) },
    },
  }));
});

// Stub the env BEFORE requiring config.
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_PRICE_CREATOR_PRO_MONTHLY = 'price_creator_m';
process.env.STRIPE_PRICE_CREATOR_PRO_ANNUAL  = 'price_creator_a';
process.env.STRIPE_PRICE_ADVERTISER_PRO_MONTHLY = 'price_adv_m';
process.env.STRIPE_PRICE_ADVERTISER_PRO_ANNUAL  = 'price_adv_a';

// Force-reload config with the env above.
jest.isolateModules(() => {
  delete require.cache[require.resolve('../config/config')];
});

const svc = require('../services/subscriptionService');

describe('getPriceId', () => {
  test('returns the configured price id', () => {
    expect(svc.getPriceId('creator_pro', 'monthly')).toBe('price_creator_m');
    expect(svc.getPriceId('advertiser_pro', 'annual')).toBe('price_adv_a');
  });
  test('unknown plan/interval → empty string', () => {
    expect(svc.getPriceId('mystery', 'monthly')).toBe('');
    expect(svc.getPriceId('creator_pro', 'biennial')).toBe('');
  });
});

describe('planFromPriceId', () => {
  test('round-trips known prices', () => {
    expect(svc.planFromPriceId('price_creator_m')).toEqual({ plan: 'creator_pro', interval: 'monthly' });
    expect(svc.planFromPriceId('price_adv_a')).toEqual({ plan: 'advertiser_pro', interval: 'annual' });
  });
  test('unknown price returns null', () => {
    expect(svc.planFromPriceId('price_unknown')).toBeNull();
  });
});

describe('mapStripeStatus', () => {
  test('maps the canonical Stripe statuses to our enum', () => {
    expect(svc.mapStripeStatus('trialing')).toBe('trialing');
    expect(svc.mapStripeStatus('active')).toBe('active');
    expect(svc.mapStripeStatus('past_due')).toBe('past_due');
    expect(svc.mapStripeStatus('unpaid')).toBe('past_due');
    expect(svc.mapStripeStatus('canceled')).toBe('canceled');
    expect(svc.mapStripeStatus('incomplete_expired')).toBe('expired');
    expect(svc.mapStripeStatus('incomplete')).toBe('past_due');
  });
  test('unknown status defaults to active (defensive)', () => {
    expect(svc.mapStripeStatus('martian_state')).toBe('active');
  });
});

describe('createCheckoutSession validation', () => {
  const mkUser = (overrides = {}) => ({
    _id: 'u1',
    email: 'a@b.c',
    nombre: 'Ada',
    apellido: '',
    rol: 'advertiser',
    subscription: { stripeCustomerId: 'cus_existing' },
    save: jest.fn(async () => {}),
    ...overrides,
  });

  test('rejects unknown plan', async () => {
    await expect(svc.createCheckoutSession(mkUser(), 'mystery', 'monthly')).rejects.toThrow(/not self-serve/);
  });
  test('rejects enterprise (not subscribable)', async () => {
    await expect(svc.createCheckoutSession(mkUser(), 'advertiser_enterprise', 'monthly')).rejects.toThrow(/not self-serve/);
  });
  test('rejects role mismatch', async () => {
    await expect(svc.createCheckoutSession(mkUser({ rol: 'creator' }), 'advertiser_pro', 'monthly'))
      .rejects.toThrow(/does not match user role/);
  });
  test('rejects bad interval', async () => {
    await expect(svc.createCheckoutSession(mkUser(), 'advertiser_pro', 'biennial')).rejects.toThrow(/Interval/);
  });
  test('happy path builds a checkout session with 14-day trial', async () => {
    const session = await svc.createCheckoutSession(mkUser(), 'advertiser_pro', 'monthly');
    expect(session.url).toMatch(/checkout\.stripe\.com/);
    // Inspect what we asked Stripe to build.
    const args = session.__args;
    expect(args.mode).toBe('subscription');
    expect(args.line_items[0].price).toBe('price_adv_m');
    expect(args.subscription_data.trial_period_days).toBe(14);
    expect(args.payment_method_collection).toBe('if_required');
  });
});
