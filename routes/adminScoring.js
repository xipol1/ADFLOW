/**
 * Admin scoring endpoints — protected by CRON_SECRET.
 *
 * These endpoints are called by:
 *   - Vercel Cron (schedule lives in vercel.json → "0 3 * * *")
 *   - Ops tooling for manual re-runs
 *
 * Auth: `Authorization: Bearer <CRON_SECRET>`. In environments without a
 * CRON_SECRET set, the endpoints return 503 to prevent accidental public
 * exposure.
 */

const express = require('express');
const { runScoringBatch, recalcularCASCanal } = require('../services/scoringOrchestrator');

const router = express.Router();

function requireCronSecret(req, res, next) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return res.status(503).json({
      success: false,
      message: 'CRON_SECRET not configured',
    });
  }
  const header = req.headers.authorization;
  if (header !== `Bearer ${secret}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  return next();
}

/**
 * POST /api/admin/scoring/run
 *
 * Body / query params:
 *   cursor       — resume from this channel _id (optional)
 *   batchSize    — override default (optional)
 *   concurrency  — override default (optional)
 *
 * Returns JSON with `nextCursor` so the caller (Vercel Cron or a shell
 * script) can keep paginating until null.
 */
router.post('/run', requireCronSecret, async (req, res) => {
  try {
    const cursor = req.body?.cursor || req.query.cursor || null;
    const batchSize = Number(req.body?.batchSize || req.query.batchSize) || undefined;
    const concurrency = Number(req.body?.concurrency || req.query.concurrency) || undefined;

    const result = await runScoringBatch({
      cursor,
      batchSize,
      concurrency,
      trigger: 'scheduled',
    });
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('Scoring cron error:', err?.message);
    return res.status(500).json({ success: false, message: 'Scoring cron failed' });
  }
});

/**
 * Vercel Cron calls GET (not POST). We accept both so the same endpoint
 * can be targeted from vercel.json and from ops tooling.
 */
router.get('/run', requireCronSecret, async (req, res) => {
  try {
    const result = await runScoringBatch({
      cursor: req.query.cursor || null,
      batchSize: Number(req.query.batchSize) || undefined,
      concurrency: Number(req.query.concurrency) || undefined,
      trigger: 'scheduled',
    });
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('Scoring cron error:', err?.message);
    return res.status(500).json({ success: false, message: 'Scoring cron failed' });
  }
});

/**
 * POST /api/admin/scoring/recalculate/:canalId
 *
 * Single-channel recalculation. Useful for admin UI when a channel owner
 * reports a stale score.
 */
router.post('/recalculate/:canalId', requireCronSecret, async (req, res) => {
  try {
    const result = await recalcularCASCanal(req.params.canalId, { trigger: 'manual' });
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('Manual recalc error:', err?.message);
    return res.status(500).json({ success: false, message: err?.message || 'failed' });
  }
});

module.exports = router;
