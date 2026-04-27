/**
 * Admin endpoints for the PayoutAttempt queue.
 *
 * GET  /api/admin/payouts              — list (filter by status)
 * GET  /api/admin/payouts/:id          — single attempt + linked campaign/creator
 * POST /api/admin/payouts/:id/retry    — re-fire the Stripe transfer
 *
 * All routes require an authenticated admin (req.usuario.rol === 'admin').
 */
const express = require('express');
const router = express.Router();
const { autenticar } = require('../middleware/auth');
const { ensureDb } = require('../lib/ensureDb');

const requireAdmin = (req, res, next) => {
  const rol = req.usuario?.rol || req.usuario?.role;
  if (rol !== 'admin') {
    return res.status(403).json({ success: false, message: 'Solo administradores' });
  }
  next();
};

router.use(autenticar, requireAdmin);

// ─── GET /api/admin/payouts ────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const ok = await ensureDb();
  if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

  const PayoutAttempt = require('../models/PayoutAttempt');

  const status = req.query.status;
  const filter = {};
  // Default view = anything not yet succeeded (the admin's working set).
  if (status && ['pending', 'processing', 'succeeded', 'failed'].includes(status)) {
    filter.status = status;
  } else {
    filter.status = { $in: ['pending', 'processing', 'failed'] };
  }

  const limit = Math.min(parseInt(req.query.limit) || 50, 200);

  const items = await PayoutAttempt.find(filter)
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate('campaign', 'price commissionRate netAmount status completedAt')
    .populate('creator', 'email nombre stripeConnectAccountId')
    .lean();

  return res.json({
    success: true,
    data: { items, count: items.length },
  });
});

// ─── GET /api/admin/payouts/:id ────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const ok = await ensureDb();
  if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

  const PayoutAttempt = require('../models/PayoutAttempt');
  const attempt = await PayoutAttempt.findById(req.params.id)
    .populate('campaign')
    .populate('creator', 'email nombre stripeConnectAccountId');

  if (!attempt) return res.status(404).json({ success: false, message: 'No encontrada' });
  return res.json({ success: true, data: attempt });
});

// ─── POST /api/admin/payouts/:id/retry ─────────────────────────────────────
// Synchronous: the admin clicks "retry" and waits for the Stripe round-trip
// (a few hundred ms). Stripe's idempotency key (transfer:<campaignId>) means
// hitting retry twice never sends a second transfer.
router.post('/:id/retry', async (req, res) => {
  const ok = await ensureDb();
  if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

  const PayoutAttempt = require('../models/PayoutAttempt');
  const attempt = await PayoutAttempt.findById(req.params.id);
  if (!attempt) return res.status(404).json({ success: false, message: 'No encontrada' });

  if (attempt.status === 'succeeded') {
    return res.status(409).json({
      success: false,
      message: 'Esta transferencia ya fue completada con éxito',
      data: attempt,
    });
  }
  if (attempt.status === 'processing') {
    return res.status(409).json({
      success: false,
      message: 'La transferencia ya está en curso',
      data: attempt,
    });
  }

  attempt.status = 'processing';
  attempt.attempts += 1;
  attempt.lastAttemptedAt = new Date();
  await attempt.save();

  try {
    const stripeConnect = require('../services/stripeConnectService');
    const transfer = await stripeConnect.transferToCreator(
      attempt.amount,
      attempt.stripeAccountId,
      { campaignId: String(attempt.campaign), creatorId: String(attempt.creator) },
      { idempotencyKey: attempt.stripeIdempotencyKey || `transfer:${attempt.campaign}` }
    );
    attempt.status = 'succeeded';
    attempt.succeededAt = new Date();
    attempt.stripeTransferId = transfer?.id || null;
    attempt.lastError = null;
    await attempt.save();
    return res.json({ success: true, data: attempt });
  } catch (err) {
    attempt.status = 'failed';
    attempt.lastError = err?.message || String(err);
    await attempt.save();
    return res.status(502).json({
      success: false,
      message: 'Stripe rechazó el reintento',
      data: attempt,
    });
  }
});

module.exports = router;
