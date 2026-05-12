/**
 * User-facing subscription endpoints.
 *
 *   GET  /api/subscriptions/me            — current plan + status (resolved through lib/plans)
 *   POST /api/subscriptions/checkout      — body: { plan, interval } → { url }
 *   POST /api/subscriptions/portal        — Customer Portal session → { url }
 *   POST /api/subscriptions/cancel        — set cancel_at_period_end on Stripe
 *   POST /api/subscriptions/contact-sales — Enterprise lead capture
 *   POST /api/subscriptions/webhook       — Stripe webhook (raw body, dedicated secret)
 *
 * The webhook route is mounted at app-level with express.raw() — see app.js.
 * All other routes are JSON.
 */

const express = require('express');
const router = express.Router();
const { autenticar } = require('../middleware/auth');
const { ensureDb } = require('../lib/ensureDb');
const config = require('../config/config');
const subscriptionService = require('../services/subscriptionService');
const { getUserPlan, getUserPlanKey } = require('../lib/plans');
const { PLANS, TRIAL_DAYS } = require('../config/plans');

// ─── GET /me ────────────────────────────────────────────────────────────────
router.get('/me', autenticar, async (req, res) => {
  try {
    if (!(await ensureDb())) return res.status(503).json({ success: false, message: 'DB unavailable' });
    const Usuario = require('../models/Usuario');
    const user = await Usuario.findById(req.usuario.id).select('rol subscription').lean();
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const planKey = getUserPlanKey(user);
    const plan = getUserPlan(user);
    res.json({
      success: true,
      planKey,
      plan: {
        label: plan.label,
        tier: plan.tier,
        features: plan.features,
        limits: plan.limits,
      },
      subscription: user.subscription || null,
      trialDays: TRIAL_DAYS,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e?.message || 'Error interno' });
  }
});

// ─── POST /checkout ─────────────────────────────────────────────────────────
router.post('/checkout', autenticar, async (req, res) => {
  try {
    if (!(await ensureDb())) return res.status(503).json({ success: false, message: 'DB unavailable' });
    const { plan, interval } = req.body || {};

    const Usuario = require('../models/Usuario');
    const user = await Usuario.findById(req.usuario.id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const session = await subscriptionService.createCheckoutSession(user, plan, interval);
    res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (e) {
    res.status(400).json({ success: false, message: e?.message || 'Checkout failed' });
  }
});

// ─── POST /portal ───────────────────────────────────────────────────────────
router.post('/portal', autenticar, async (req, res) => {
  try {
    if (!(await ensureDb())) return res.status(503).json({ success: false, message: 'DB unavailable' });
    const Usuario = require('../models/Usuario');
    const user = await Usuario.findById(req.usuario.id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const session = await subscriptionService.createPortalSession(user);
    res.json({ success: true, url: session.url });
  } catch (e) {
    res.status(400).json({ success: false, message: e?.message || 'Portal failed' });
  }
});

// ─── POST /cancel ───────────────────────────────────────────────────────────
// Sets cancel_at_period_end=true on Stripe. The plan stays active until
// currentPeriodEnd, then Stripe emits customer.subscription.deleted and the
// webhook flips us to status='expired'.
router.post('/cancel', autenticar, async (req, res) => {
  try {
    if (!(await ensureDb())) return res.status(503).json({ success: false, message: 'DB unavailable' });
    const Usuario = require('../models/Usuario');
    const SubscriptionEvent = require('../models/SubscriptionEvent');
    const stripe = subscriptionService.getStripe();
    if (!stripe) return res.status(503).json({ success: false, message: 'Stripe not configured' });

    const user = await Usuario.findById(req.usuario.id);
    const subId = user?.subscription?.stripeSubscriptionId;
    if (!subId) return res.status(400).json({ success: false, message: 'No active subscription' });

    await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
    user.subscription.cancelAtPeriodEnd = true;
    await user.save();

    await SubscriptionEvent.create({
      user: user._id,
      type: 'cancel_requested',
      fromPlan: user.subscription.plan,
      toPlan: user.subscription.plan,
      fromStatus: user.subscription.status,
      toStatus: user.subscription.status,
      actor: { kind: 'self', userId: user._id },
      metadata: { reason: req.body?.reason || '' },
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e?.message || 'Cancel failed' });
  }
});

// ─── POST /contact-sales ────────────────────────────────────────────────────
// Enterprise tier lead. No auto-checkout; admin reviews via
// /api/admin/subscriptions/leads.
router.post('/contact-sales', async (req, res) => {
  try {
    if (!(await ensureDb())) return res.status(503).json({ success: false, message: 'DB unavailable' });
    const EnterpriseLead = require('../models/EnterpriseLead');

    const { email, role, company, estimatedMonthlySpend, estimatedChannels, message } = req.body || {};
    if (!email || !/.+@.+\..+/.test(email)) {
      return res.status(400).json({ success: false, message: 'email inválido' });
    }
    if (role !== 'creator' && role !== 'advertiser') {
      return res.status(400).json({ success: false, message: 'role debe ser creator o advertiser' });
    }

    // Best-effort attach to a logged-in user if one is present.
    let userId = null;
    try {
      const auth = req.headers?.authorization || '';
      const [type, token] = auth.split(' ');
      if (type === 'Bearer' && token) {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, config.jwt.secret, {
          issuer: config.jwt.issuer,
          audience: config.jwt.audience,
          algorithms: ['HS256'],
        });
        userId = decoded?.id || null;
      }
    } catch { /* anonymous lead is fine */ }

    const lead = await EnterpriseLead.create({
      user: userId,
      email: email.toLowerCase(),
      role,
      company: company || '',
      estimatedMonthlySpend: Number(estimatedMonthlySpend) || 0,
      estimatedChannels: Number(estimatedChannels) || 0,
      message: String(message || '').slice(0, 2000),
    });

    // Fire-and-forget email to sales. Doesn't block the response.
    try {
      const emailService = require('../services/emailService');
      if (emailService?.sendRaw) {
        emailService.sendRaw({
          to: 'enterprise@channelad.io',
          subject: `[Enterprise lead] ${role} — ${email}`,
          text: JSON.stringify(lead, null, 2),
        }).catch(() => {});
      }
    } catch { /* email service optional */ }

    res.json({ success: true, leadId: lead._id });
  } catch (e) {
    res.status(500).json({ success: false, message: e?.message || 'Error interno' });
  }
});

// ─── POST /webhook ──────────────────────────────────────────────────────────
// express.raw() is mounted on this single route so Stripe's signature
// verification can hash the original Buffer. Other routes on this router
// still receive parsed JSON via the global body parser.
const webhookHandler = async (req, res) => {
  const stripe = subscriptionService.getStripe();
  const secret = config.stripe?.subscriptionWebhookSecret;
  if (!stripe || !secret) {
    return res.status(503).json({ error: 'Subscription webhook not configured' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).json({ error: 'Missing stripe-signature header' });

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    try { require('../lib/logger').warn('subscription.webhook.sig_fail', { msg: err?.message }); } catch {}
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    await subscriptionService.handleWebhookEvent(event);
  } catch (err) {
    try { require('../lib/logger').error('subscription.webhook.handler', { type: event?.type, msg: err?.message }); } catch {}
    // Still 200 — Stripe retries on non-2xx, and we'd rather log and move on
    // than create a stuck queue if our DB hiccups.
  }
  res.status(200).json({ received: true });
};

// NOTE: the /webhook route is NOT mounted on this router — it must run before
// the global express.json() body parser (see app.js wiring). We export the
// handler instead and let app.js mount it on its own raw-body sub-router.

module.exports = router;
module.exports.webhookHandler = webhookHandler;
