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

// Vercel Hobby function timeout is 60s. We run an internal pagination loop
// up to this budget so a single cron invocation processes ALL active canales
// (not just the first batchSize). If the budget is exhausted mid-loop, we
// return `nextCursor` so the next day's run picks up where this one stopped.
const CRON_BUDGET_MS = 50000; // leave 10s headroom before Vercel kills us

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
 * Run runScoringBatch repeatedly until either:
 *   - all active canales are processed (nextCursor === null), OR
 *   - the time budget is exhausted (bail out gracefully)
 *
 * Returns the aggregate totals plus the final cursor (or null).
 */
async function runScoringBatchesUntilBudget({ cursor, batchSize, concurrency }) {
  const startedAt = Date.now();
  const totals = {
    canalesProcesados: 0,
    canalesActualizados: 0,
    errores: 0,
    batches: 0,
  };
  let currentCursor = cursor;

  while (true) {
    const elapsed = Date.now() - startedAt;
    if (elapsed >= CRON_BUDGET_MS) {
      console.warn(
        `[scoring-cron] Budget exhausted (${elapsed}ms ≥ ${CRON_BUDGET_MS}ms) — stopping with cursor=${currentCursor}`,
      );
      break;
    }

    const page = await runScoringBatch({
      cursor: currentCursor,
      batchSize,
      concurrency,
      trigger: 'scheduled',
    });

    totals.canalesProcesados += page.canalesProcesados || 0;
    totals.canalesActualizados += page.canalesActualizados || 0;
    totals.errores += page.errores || 0;
    totals.batches += 1;

    currentCursor = page.nextCursor;
    if (!currentCursor) break; // all canales covered
  }

  return {
    ...totals,
    nextCursor: currentCursor,
    elapsed_ms: Date.now() - startedAt,
  };
}

/**
 * POST /api/admin/scoring/run
 *
 * Body / query params:
 *   cursor       — resume from this channel _id (optional)
 *   batchSize    — override default (optional)
 *   concurrency  — override default (optional)
 *
 * Handler loops over runScoringBatch internally until the time budget is
 * exhausted, so a single invocation covers all active canales rather than
 * just the first batchSize.
 */
router.post('/run', requireCronSecret, async (req, res) => {
  try {
    const cursor = req.body?.cursor || req.query.cursor || null;
    const batchSize = Number(req.body?.batchSize || req.query.batchSize) || undefined;
    const concurrency = Number(req.body?.concurrency || req.query.concurrency) || undefined;

    const result = await runScoringBatchesUntilBudget({ cursor, batchSize, concurrency });
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('Scoring cron error:', err?.message);
    return res.status(500).json({ success: false, message: 'Scoring cron failed' });
  }
});

/**
 * Vercel Cron calls GET (not POST). Same internal pagination loop.
 */
router.get('/run', requireCronSecret, async (req, res) => {
  try {
    const result = await runScoringBatchesUntilBudget({
      cursor: req.query.cursor || null,
      batchSize: Number(req.query.batchSize) || undefined,
      concurrency: Number(req.query.concurrency) || undefined,
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
