/**
 * Subscription billing service — Stripe wrapper for the four paid SKUs
 * (creator_pro and advertiser_pro, monthly + annual).
 *
 * Three public surfaces:
 *   - createCheckoutSession(user, plan, interval) → Stripe Checkout URL
 *   - createPortalSession(user)                   → Stripe Billing Portal URL
 *   - handleWebhookEvent(event)                   → reconcile DB from Stripe
 *
 * Enterprise plans are NOT sold via Checkout. They are admin-granted via
 * routes/adminSubscriptions.js after the lead is qualified.
 *
 * Trial: 14 days, no card required (payment_method_collection=if_required).
 * Annual discount: priced into the price ID itself, no coupons.
 */

const config = require('../config/config');
const { TRIAL_DAYS, isValidPlanKey, PLANS } = require('../config/plans');

const SUBSCRIBABLE_PLANS = new Set(['creator_pro', 'advertiser_pro']);

function getStripe() {
  const key = config.stripe?.secretKey;
  if (!key || !key.startsWith('sk_')) return null;
  return require('stripe')(key);
}

function getPriceId(plan, interval) {
  return config.stripe?.subscriptionPrices?.[plan]?.[interval] || '';
}

/**
 * Find or create the Stripe Customer for this user. Idempotent — we cache
 * the id on user.subscription.stripeCustomerId so subsequent calls are
 * O(1) and survive Stripe Customer deduplication.
 */
async function ensureCustomer(stripe, user) {
  if (user.subscription?.stripeCustomerId) {
    return user.subscription.stripeCustomerId;
  }
  const customer = await stripe.customers.create({
    email: user.email,
    name: `${user.nombre || ''} ${user.apellido || ''}`.trim() || undefined,
    metadata: {
      userId: String(user._id),
      role: user.rol,
    },
  });
  user.subscription = {
    ...(user.subscription?.toObject?.() || user.subscription || {}),
    stripeCustomerId: customer.id,
  };
  await user.save();
  return customer.id;
}

/**
 * Build a Stripe Checkout Session. Caller is responsible for redirecting
 * the user to the returned `url`.
 *
 * Validates: plan is subscribable, matches user role, price id is wired.
 */
async function createCheckoutSession(user, plan, interval) {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe not configured');

  if (!isValidPlanKey(plan) || !SUBSCRIBABLE_PLANS.has(plan)) {
    throw new Error(`Plan ${plan} is not self-serve subscribable`);
  }
  if (PLANS[plan].role !== user.rol) {
    throw new Error(`Plan ${plan} does not match user role ${user.rol}`);
  }
  if (interval !== 'monthly' && interval !== 'annual') {
    throw new Error(`Interval must be monthly or annual`);
  }
  const priceId = getPriceId(plan, interval);
  if (!priceId) throw new Error(`Stripe price id not configured for ${plan}/${interval}`);

  const customerId = await ensureCustomer(stripe, user);

  return stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    // 14-day trial with no card required. Stripe will collect a card at
    // the end of the trial; we surface "trial ends in 2 days" emails via
    // the customer.subscription.trial_will_end webhook (Fase 4).
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: { userId: String(user._id), plan, interval },
    },
    payment_method_collection: 'if_required',
    allow_promotion_codes: true,
    success_url: config.stripe.checkoutSuccessUrl || 'https://channelad.io/account/billing?status=success',
    cancel_url:  config.stripe.checkoutCancelUrl  || 'https://channelad.io/pricing?status=cancelled',
    metadata: { userId: String(user._id), plan, interval },
  });
}

/**
 * Customer Portal — Stripe-hosted page where the user can switch plan,
 * update card, cancel, view invoices. Requires the Portal to be enabled
 * in the Stripe Dashboard once per environment.
 */
async function createPortalSession(user) {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe not configured');
  if (!user.subscription?.stripeCustomerId) {
    throw new Error('User has no Stripe customer; nothing to manage');
  }
  return stripe.billingPortal.sessions.create({
    customer: user.subscription.stripeCustomerId,
    return_url: config.stripe.portalReturnUrl || 'https://channelad.io/account/billing',
  });
}

/**
 * Map a Stripe Subscription object to our internal status enum.
 * Stripe statuses: trialing, active, past_due, canceled, unpaid, incomplete,
 *                  incomplete_expired, paused.
 */
function mapStripeStatus(stripeStatus) {
  switch (stripeStatus) {
    case 'trialing':           return 'trialing';
    case 'active':             return 'active';
    case 'past_due':           return 'past_due';
    case 'unpaid':             return 'past_due';
    case 'canceled':           return 'canceled';
    case 'incomplete_expired': return 'expired';
    case 'incomplete':         return 'past_due';
    case 'paused':             return 'past_due';
    default:                   return 'active';
  }
}

/**
 * Reverse-lookup: from a Stripe price ID, recover (plan, interval).
 * Returns null if the price isn't one of ours (defensive — Stripe webhook
 * could fire for products we don't recognise during account sharing).
 */
function planFromPriceId(priceId) {
  const map = config.stripe?.subscriptionPrices || {};
  for (const [plan, prices] of Object.entries(map)) {
    if (prices.monthly === priceId) return { plan, interval: 'monthly' };
    if (prices.annual  === priceId) return { plan, interval: 'annual'  };
  }
  return null;
}

/**
 * Reconcile a single Stripe subscription event into our DB.
 * Idempotent — re-running with the same Stripe event is safe.
 *
 * Handles:
 *   - customer.subscription.created
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *   - invoice.payment_failed → status=past_due (logged)
 *
 * Other events are ignored (we just return false so the route can 200).
 */
async function handleWebhookEvent(event) {
  const Usuario = require('../models/Usuario');
  const SubscriptionEvent = require('../models/SubscriptionEvent');
  const { ensureDb } = require('../lib/ensureDb');
  if (!(await ensureDb())) return false;

  const type = event?.type;
  const obj = event?.data?.object;
  if (!type || !obj) return false;

  // All sub-related events carry a customer id; resolve our user from it.
  const customerId = obj.customer;
  if (!customerId) return false;
  const user = await Usuario.findOne({ 'subscription.stripeCustomerId': customerId });
  if (!user) return false;

  if (
    type === 'customer.subscription.created' ||
    type === 'customer.subscription.updated' ||
    type === 'customer.subscription.deleted'
  ) {
    const sub = obj;
    const priceId = sub.items?.data?.[0]?.price?.id;
    const found = planFromPriceId(priceId);
    const newPlan = found?.plan || user.subscription?.plan || null;
    const newInterval = found?.interval || user.subscription?.billingInterval || null;

    const fromPlan = user.subscription?.plan || null;
    const fromStatus = user.subscription?.status || null;
    const newStatus = type === 'customer.subscription.deleted'
      ? 'expired'
      : mapStripeStatus(sub.status);

    user.subscription = {
      ...(user.subscription?.toObject?.() || user.subscription || {}),
      plan: newPlan,
      status: newStatus,
      billingInterval: newInterval,
      currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000) : null,
      currentPeriodEnd:   sub.current_period_end   ? new Date(sub.current_period_end * 1000)   : null,
      trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      stripeSubscriptionId: sub.id,
      // grantedBy is preserved if it was previously set; Stripe doesn't own it.
    };
    await user.save();

    // Pick the event type label closest to what happened.
    let evtType = 'plan_changed';
    if (type === 'customer.subscription.created') evtType = (newStatus === 'trialing') ? 'trial_started' : 'created';
    else if (type === 'customer.subscription.deleted') evtType = 'expired';
    else if (fromStatus === 'trialing' && newStatus === 'active') evtType = 'activated';
    else if (sub.cancel_at_period_end && !user.subscription.cancelAtPeriodEnd) evtType = 'cancel_requested';
    else if (fromPlan !== newPlan) evtType = 'plan_changed';
    else evtType = 'renewed';

    await SubscriptionEvent.create({
      user: user._id,
      type: evtType,
      fromPlan,
      toPlan: newPlan,
      fromStatus,
      toStatus: newStatus,
      billingInterval: newInterval,
      actor: { kind: 'stripe', userId: null },
      stripeEventId: event.id,
      metadata: { stripeSubscriptionId: sub.id },
    });

    // Welcome email — fire once when the subscription is first created
    // (trialing or active). Fire-and-forget so a flaky SMTP doesn't reject
    // the webhook back to Stripe.
    if (type === 'customer.subscription.created' && newPlan) {
      try {
        const emailService = require('./emailService');
        const { PLANS } = require('../config/plans');
        const label = PLANS[newPlan]?.label || newPlan;
        emailService
          .enviarBienvenidaPlanPro(user, label, user.subscription.trialEnd)
          .catch((e) => { try { require('../lib/logger').warn('subscription.welcome_email_fail', { msg: e?.message }); } catch {} });
      } catch { /* email service not available */ }
    }
    return true;
  }

  // Stripe fires this 3 days before trial_end. Surface the "add card" CTA
  // before the user gets charged so they can opt in/out consciously.
  if (type === 'customer.subscription.trial_will_end') {
    try {
      const emailService = require('./emailService');
      const { PLANS } = require('../config/plans');
      const label = PLANS[user.subscription?.plan]?.label || 'Pro';
      const trialEnd = obj.trial_end ? new Date(obj.trial_end * 1000) : user.subscription?.trialEnd;
      emailService
        .enviarTrialAcabaEn(user, label, trialEnd)
        .catch((e) => { try { require('../lib/logger').warn('subscription.trial_will_end_email_fail', { msg: e?.message }); } catch {} });
    } catch { /* email service not available */ }
    return true;
  }

  if (type === 'invoice.payment_failed') {
    const fromStatus = user.subscription?.status || null;
    user.subscription = {
      ...(user.subscription?.toObject?.() || user.subscription || {}),
      status: 'past_due',
    };
    await user.save();
    await SubscriptionEvent.create({
      user: user._id,
      type: 'payment_failed',
      fromPlan: user.subscription?.plan || null,
      toPlan: user.subscription?.plan || null,
      fromStatus,
      toStatus: 'past_due',
      actor: { kind: 'stripe', userId: null },
      stripeEventId: event.id,
      metadata: { invoiceId: obj.id },
    });
    return true;
  }

  return false;
}

module.exports = {
  getStripe,
  getPriceId,
  ensureCustomer,
  createCheckoutSession,
  createPortalSession,
  handleWebhookEvent,
  mapStripeStatus,
  planFromPriceId,
  SUBSCRIBABLE_PLANS,
};
