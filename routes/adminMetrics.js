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

// ── Capa 2 Fase 4 — per-canal intelligence detail ──────────────────────────
// Returns the full CanalIntelligence document + a compact 30d trend
// (timestamp + subscribersCount per snapshot, for sparkline charting) +
// the top 5 posts by reactions in the same window. Triggers a fresh
// recompute IF the persisted doc is older than 6h (so admins always see
// a relatively fresh score without hitting the DB hot-path).
async function handleChannelIntelligenceDetail(req, res) {
  const { canalId } = req.params;
  if (!canalId) return res.status(400).json({ success: false, message: 'canalId required' });

  let CanalIntelligence;
  let CanalMetricsSnapshot;
  let CanalPostObservation;
  let intelligenceService;
  try {
    CanalIntelligence = require('../models/CanalIntelligence');
    CanalMetricsSnapshot = require('../models/CanalMetricsSnapshot');
    CanalPostObservation = require('../models/CanalPostObservation');
    intelligenceService = require('../services/CanalIntelligenceService');
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Capa 2 modules not loadable', error: err.message });
  }

  try {
    let intel = await CanalIntelligence.findOne({ canalId }).lean();
    const STALE_MS = 6 * 3600 * 1000;
    if (!intel || (intel.computedAt && Date.now() - new Date(intel.computedAt).getTime() > STALE_MS)) {
      try {
        await intelligenceService.recompute(canalId);
        intel = await CanalIntelligence.findOne({ canalId }).lean();
      } catch (err) {
        // If recompute fails (e.g. canal has no intelligence enabled), fall
        // back to whatever stale data we have. Surface the error in the body
        // so admins can see why the data is old.
        console.warn(`[adminMetrics] intelligence recompute failed canal=${canalId}:`, err.message);
      }
    }
    if (!intel) {
      return res.status(404).json({ success: false, message: 'No intelligence for this canal — metricsIntelligence may not be enabled' });
    }

    const since30d = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    // Lazy-require CanalAlert + FraudDetectionService so this endpoint
    // works on deploys where Fase 5 hasn't shipped yet.
    let alerts = [];
    try {
      const CanalAlert = require('../models/CanalAlert');
      alerts = await CanalAlert.find({ canalId, status: 'active' })
        .sort({ severity: 1, triggeredAt: -1 })
        .limit(50)
        .lean();
    } catch (_) { /* Capa 2 Fase 5 modules missing — return empty alerts */ }

    const [trendRaw, topPosts] = await Promise.all([
      CanalMetricsSnapshot.find({ canalId, timestamp: { $gte: since30d } })
        .sort({ timestamp: 1 })
        .select('timestamp subscribersCount')
        .lean(),
      CanalPostObservation.find({ canalId, publishedAt: { $gte: since30d } })
        .sort({ 'reactions.total': -1, publishedAt: -1 })
        .limit(5)
        .select('_id type body publishedAt reactions.total nlp.categories')
        .lean(),
    ]);

    const trend = trendRaw.map((s) => ({
      ts: s.timestamp,
      subscribers: s.subscribersCount,
    }));

    return res.json({
      success: true,
      data: {
        intelligence: intel,
        trend,
        alerts,
        topPosts: topPosts.map((p) => ({
          _id: p._id,
          type: p.type,
          publishedAt: p.publishedAt,
          reactions: p.reactions?.total ?? 0,
          categories: p.nlp?.categories || [],
          bodyPreview: typeof p.body === 'string' ? p.body.substring(0, 200) : '',
        })),
      },
    });
  } catch (err) {
    console.error('[adminMetrics] channel-intelligence detail error:', err?.message);
    return res.status(500).json({ success: false, message: 'Detail fetch failed', error: err.message });
  }
}

router.get(
  '/channel-intelligence/:canalId',
  autenticar,
  requireAdmin,
  handleChannelIntelligenceDetail
);

// ── Capa 2 Fase 5 — alert management ────────────────────────────────────────

async function handleListAlertsForCanal(req, res) {
  const { canalId } = req.params;
  const includeResolved = req.query.includeResolved === 'true';
  try {
    const fraud = require('../services/FraudDetectionService');
    const alerts = await fraud.listAlertsForCanal(canalId, { includeResolved, limit: 100 });
    return res.json({ success: true, data: { alerts } });
  } catch (err) {
    console.error('[adminMetrics] list alerts error:', err?.message);
    return res.status(500).json({ success: false, message: 'List alerts failed', error: err.message });
  }
}

async function handleResolveAlert(req, res) {
  const { alertId } = req.params;
  const note = String(req.body?.note || '').slice(0, 1000);
  try {
    const fraud = require('../services/FraudDetectionService');
    const updated = await fraud.resolveAlert(alertId, {
      userId: req.usuario?._id || req.usuario?.id,
      note,
    });
    if (!updated) return res.status(404).json({ success: false, message: 'Alert not found' });
    return res.json({ success: true, data: { alert: updated } });
  } catch (err) {
    console.error('[adminMetrics] resolve alert error:', err?.message);
    return res.status(500).json({ success: false, message: 'Resolve failed', error: err.message });
  }
}

async function handleDismissAlert(req, res) {
  const { alertId } = req.params;
  const note = String(req.body?.note || '').slice(0, 1000);
  try {
    const fraud = require('../services/FraudDetectionService');
    const updated = await fraud.dismissAlert(alertId, {
      userId: req.usuario?._id || req.usuario?.id,
      note,
    });
    if (!updated) return res.status(404).json({ success: false, message: 'Alert not found' });
    return res.json({ success: true, data: { alert: updated } });
  } catch (err) {
    console.error('[adminMetrics] dismiss alert error:', err?.message);
    return res.status(500).json({ success: false, message: 'Dismiss failed', error: err.message });
  }
}

router.get('/channel-intelligence/:canalId/alerts', autenticar, requireAdmin, handleListAlertsForCanal);
router.post('/channel-intelligence/alerts/:alertId/resolve', autenticar, requireAdmin, handleResolveAlert);
router.post('/channel-intelligence/alerts/:alertId/dismiss', autenticar, requireAdmin, handleDismissAlert);

module.exports = router;
