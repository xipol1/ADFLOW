/**
 * One-shot: provision the 4 Stripe Products + Prices for ChannelAd Pro plans.
 *
 *   - Creator Pro  (monthly + annual)
 *   - Advertiser Pro (monthly + annual)
 *
 * Idempotent: looks up products/prices by metadata.channelad_plan/interval and
 * reuses them if found. Re-running after a price change creates a NEW price
 * (Stripe prices are immutable) and prints the new ids — you then update the
 * STRIPE_PRICE_* env vars manually so historical subscriptions on the old
 * price keep billing correctly.
 *
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe-subscription-products.js
 */

require('dotenv').config();

const { PLANS } = require('../config/plans');

const SUBSCRIBABLE = ['creator_pro', 'advertiser_pro'];
const INTERVALS = ['monthly', 'annual'];

async function ensureProduct(stripe, planKey) {
  const plan = PLANS[planKey];
  const list = await stripe.products.search({
    query: `metadata['channelad_plan']:'${planKey}' AND active:'true'`,
  });
  if (list.data.length > 0) return list.data[0];
  return stripe.products.create({
    name: `ChannelAd — ${plan.label}`,
    metadata: { channelad_plan: planKey },
  });
}

async function ensurePrice(stripe, product, planKey, interval) {
  const plan = PLANS[planKey];
  const unitAmount = interval === 'monthly' ? plan.monthlyPriceCents : plan.annualPriceCents;
  const list = await stripe.prices.search({
    query: `product:'${product.id}' AND metadata['channelad_plan']:'${planKey}' AND metadata['channelad_interval']:'${interval}' AND active:'true'`,
  });
  // If a price exists with the SAME amount, reuse it. If amount differs, the
  // operator wants a price change → create a new one and let them rotate env.
  const matching = list.data.find(p => p.unit_amount === unitAmount && p.currency === 'eur');
  if (matching) return matching;

  return stripe.prices.create({
    product: product.id,
    unit_amount: unitAmount,
    currency: 'eur',
    recurring: { interval: interval === 'monthly' ? 'month' : 'year' },
    metadata: { channelad_plan: planKey, channelad_interval: interval },
  });
}

async function run() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !key.startsWith('sk_')) {
    console.error('STRIPE_SECRET_KEY missing or invalid');
    process.exit(1);
  }
  const stripe = require('stripe')(key);

  const out = {};
  for (const planKey of SUBSCRIBABLE) {
    const product = await ensureProduct(stripe, planKey);
    out[planKey] = { product: product.id, prices: {} };
    for (const interval of INTERVALS) {
      const price = await ensurePrice(stripe, product, planKey, interval);
      out[planKey].prices[interval] = price.id;
    }
  }

  console.log('\nProvisioned. Paste these into your .env:\n');
  console.log(`STRIPE_PRICE_CREATOR_PRO_MONTHLY=${out.creator_pro.prices.monthly}`);
  console.log(`STRIPE_PRICE_CREATOR_PRO_ANNUAL=${out.creator_pro.prices.annual}`);
  console.log(`STRIPE_PRICE_ADVERTISER_PRO_MONTHLY=${out.advertiser_pro.prices.monthly}`);
  console.log(`STRIPE_PRICE_ADVERTISER_PRO_ANNUAL=${out.advertiser_pro.prices.annual}`);
  console.log('\nFull provisioning map:');
  console.log(JSON.stringify(out, null, 2));
}

run().catch(err => {
  console.error('Stripe provisioning failed:', err);
  process.exit(1);
});
