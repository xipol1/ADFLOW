/**
 * Admin endpoints for manual subscription management.
 *
 * Used for: Enterprise grants, grandfathering, refunds/comps, debugging
 * Stripe-vs-DB drift. Stripe webhooks (Fase 2) write to the same
 * subscription subdoc and emit SubscriptionEvent rows, so these admin
 * actions are intentionally additive — they don't replace billing.
 *
 *   POST   /api/admin/subscriptions/:userId/grant
 *          body: { plan, reason, grandfatheredUntil? }
 *   POST   /api/admin/subscriptions/:userId/revoke
 *          body: { reason }
 *   GET    /api/admin/subscriptions/:userId/events
 *   GET    /api/admin/subscriptions/leads
 *   PATCH  /api/admin/subscriptions/leads/:id  body: { status, notes }
 */

const express = require('express');
const router = express.Router();
const { autenticar } = require('../middleware/auth');
const { ensureDb } = require('../lib/ensureDb');
const { isValidPlanKey, PLANS } = require('../config/plans');

const requireAdmin = (req, res, next) => {
  const rol = req.usuario?.rol || req.usuario?.role;
  if (rol !== 'admin') return res.status(403).json({ success: false, message: 'Solo administradores' });
  next();
};

router.use(autenticar, requireAdmin);

// POST /:userId/grant — manual plan grant (Enterprise, comp, grandfather)
router.post('/:userId/grant', async (req, res) => {
  try {
    if (!(await ensureDb())) return res.status(503).json({ success: false, message: 'DB unavailable' });
    const Usuario = require('../models/Usuario');
    const SubscriptionEvent = require('../models/SubscriptionEvent');

    const { plan, reason, grandfatheredUntil } = req.body || {};
    if (!isValidPlanKey(plan)) {
      return res.status(400).json({ success: false, message: 'plan inválido' });
    }

    const user = await Usuario.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    if (PLANS[plan].role !== user.rol) {
      return res.status(400).json({
        success: false,
        message: `El plan ${plan} no aplica al rol ${user.rol}`,
      });
    }

    const fromPlan = user.subscription?.plan || null;
    const fromStatus = user.subscription?.status || null;

    user.subscription = {
      ...(user.subscription?.toObject?.() || user.subscription || {}),
      plan,
      status: 'granted',
      billingInterval: null,
      currentPeriodStart: new Date(),
      currentPeriodEnd: null,
      trialEnd: null,
      cancelAtPeriodEnd: false,
      grantedBy: req.usuario.id,
      grantedReason: reason || '',
      grandfatheredUntil: grandfatheredUntil ? new Date(grandfatheredUntil) : null,
    };
    await user.save();

    await SubscriptionEvent.create({
      user: user._id,
      type: grandfatheredUntil ? 'grandfathered' : 'granted',
      fromPlan,
      toPlan: plan,
      fromStatus,
      toStatus: 'granted',
      actor: { kind: 'admin', userId: req.usuario.id },
      metadata: { reason: reason || '', grandfatheredUntil: grandfatheredUntil || null },
    });

    res.json({ success: true, subscription: user.subscription });
  } catch (e) {
    res.status(500).json({ success: false, message: e?.message || 'Error interno' });
  }
});

// POST /:userId/revoke — strip the subscription, user drops to free
router.post('/:userId/revoke', async (req, res) => {
  try {
    if (!(await ensureDb())) return res.status(503).json({ success: false, message: 'DB unavailable' });
    const Usuario = require('../models/Usuario');
    const SubscriptionEvent = require('../models/SubscriptionEvent');

    const { reason } = req.body || {};
    const user = await Usuario.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const fromPlan = user.subscription?.plan || null;
    const fromStatus = user.subscription?.status || null;

    user.subscription = {
      plan: null,
      status: 'expired',
      billingInterval: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      trialEnd: null,
      cancelAtPeriodEnd: false,
      stripeCustomerId: user.subscription?.stripeCustomerId || null,
      stripeSubscriptionId: null,
      grantedBy: null,
      grantedReason: '',
      grandfatheredUntil: null,
    };
    await user.save();

    await SubscriptionEvent.create({
      user: user._id,
      type: 'revoked',
      fromPlan,
      toPlan: null,
      fromStatus,
      toStatus: 'expired',
      actor: { kind: 'admin', userId: req.usuario.id },
      metadata: { reason: reason || '' },
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e?.message || 'Error interno' });
  }
});

// GET /:userId/events — audit log
router.get('/:userId/events', async (req, res) => {
  try {
    if (!(await ensureDb())) return res.status(503).json({ success: false, message: 'DB unavailable' });
    const SubscriptionEvent = require('../models/SubscriptionEvent');
    const events = await SubscriptionEvent
      .find({ user: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json({ success: true, events });
  } catch (e) {
    res.status(500).json({ success: false, message: e?.message || 'Error interno' });
  }
});

// GET /leads — enterprise contact-sales pipeline
router.get('/leads', async (req, res) => {
  try {
    if (!(await ensureDb())) return res.status(503).json({ success: false, message: 'DB unavailable' });
    const EnterpriseLead = require('../models/EnterpriseLead');
    const { status } = req.query;
    const q = status ? { status } : {};
    const leads = await EnterpriseLead.find(q).sort({ createdAt: -1 }).limit(500).lean();
    res.json({ success: true, leads });
  } catch (e) {
    res.status(500).json({ success: false, message: e?.message || 'Error interno' });
  }
});

// PATCH /leads/:id — update lead status / notes
router.patch('/leads/:id', async (req, res) => {
  try {
    if (!(await ensureDb())) return res.status(503).json({ success: false, message: 'DB unavailable' });
    const EnterpriseLead = require('../models/EnterpriseLead');
    const allowed = ['status', 'notes'];
    const update = {};
    for (const k of allowed) if (k in (req.body || {})) update[k] = req.body[k];
    const lead = await EnterpriseLead.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead no encontrado' });
    res.json({ success: true, lead });
  } catch (e) {
    res.status(500).json({ success: false, message: e?.message || 'Error interno' });
  }
});

module.exports = router;
