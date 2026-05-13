/**
 * Admin metrics endpoints.
 *
 * Two flavors of auth in this router:
 *   - /capture                 → CRON_SECRET (Vercel Cron-triggered).
 *   - /channel-intelligence/*  → autenticar + requireAdmin (operator dashboards).
 *
 * Mounted at /api/admin/metrics in app.js. Don't add unauthenticated routes here.
 */

const express = require('express');
const { runSnapshotCapture } = require('../services/campaignSnapshotService');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

function requireCronSecret(req, res, next) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return res.status(503).json({ success: false, message: 'CRON_SECRET not configured' });
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  return next();
}

// Inline admin gate — same pattern as routes/adminDashboard.js
function requireAdmin(req, res, next) {
  const rol = req.usuario?.rol || req.usuario?.role;
  if (rol !== 'admin') return res.status(403).json({ success: false, message: 'Solo administradores' });
  next();
}

async function handleCapture(req, res) {
  try {
    const batchSize = Number(req.body?.batchSize || req.query.batchSize) || undefined;
    const result = await runSnapshotCapture({ batchSize });
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('Snapshot capture cron error:', err?.message);
    return res.status(500).json({ success: false, message: 'Snapshot capture failed' });
  }
}

router.post('/capture', requireCronSecret, handleCapture);
router.get('/capture', requireCronSecret, handleCapture); // Vercel Cron uses GET

// ── Capa 2 — Channel Intelligence health ────────────────────────────────────
// Returns aggregated state from channelIntelligenceBootstrap. SAFE TO CALL
// from Vercel (the service module loads lazily; if the VPS process isn't
// running, we return a state that says so rather than crashing). The bullmq
// queue itself is read via Redis if available.
async function handleChannelIntelligenceHealth(req, res) {
  let bootstrap;
  try {
    bootstrap = require('../services/channelIntelligenceBootstrap');
  } catch (err) {
    return res.json({
      success: true,
      data: { started: false, reason: 'channelIntelligenceBootstrap not loadable', error: err.message },
    });
  }
  try {
    const health = await bootstrap.getHealth();
    return res.json({ success: true, data: health });
  } catch (err) {
    console.error('[adminMetrics] channel-intelligence health error:', err?.message);
    return res.status(500).json({ success: false, message: 'Health check failed', error: err.message });
  }
}

router.get(
  '/channel-intelligence/health',
  autenticar,
  requireAdmin,
  handleChannelIntelligenceHealth
);

module.exports = router;
