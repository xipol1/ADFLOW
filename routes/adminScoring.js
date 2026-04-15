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

  // eslint-disable-next-line no-constant-condition -- polling loop, exits via explicit break when budget or pages exhausted
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

/**
 * POST /api/admin/scoring/diag-email
 *
 * Diagnostic: shows email service config state and attempts a real send.
 * Body: { "to": "test@example.com" }   (optional, defaults to EMAIL_USER)
 *
 * Returns full config (masked) + transporter state + send result or error.
 * Remove this endpoint once the email issue is confirmed fixed.
 */
router.post('/diag-email', requireCronSecret, async (req, res) => {
  const cfg = {
    EMAIL_PROVIDER:      process.env.EMAIL_PROVIDER      || '(not set)',
    EMAIL_HOST:          process.env.EMAIL_HOST           || '(not set)',
    EMAIL_PORT:          process.env.EMAIL_PORT           || '(not set)',
    EMAIL_SECURE:        process.env.EMAIL_SECURE         || '(not set)',
    EMAIL_USER:          process.env.EMAIL_USER           ? process.env.EMAIL_USER.replace(/(.{3}).*(@.*)/, '$1***$2') : '(not set)',
    EMAIL_PASS:          process.env.EMAIL_PASS           ? '***set***' : '(not set)',
    EMAIL_FROM_NAME:     process.env.EMAIL_FROM_NAME      || '(not set)',
    EMAIL_FROM_ADDRESS:  process.env.EMAIL_FROM_ADDRESS   || '(not set)',
    NODE_ENV:            process.env.NODE_ENV             || '(not set)',
  };

  const to = req.body?.to || process.env.EMAIL_USER || '';
  let sendResult = null;
  let sendError = null;
  let transporterReady = false;

  try {
    const emailService = require('../services/emailService');
    await emailService.ready;
    transporterReady = !!emailService.transporter;

    if (!transporterReady) {
      sendError = 'transporter is null — EMAIL_PROVIDER not configured or inicializar() threw';
    } else {
      // Try verify first
      let verifyOk = false;
      let verifyError = null;
      try {
        await emailService.transporter.verify();
        verifyOk = true;
      } catch (vErr) {
        verifyError = vErr?.message || String(vErr);
      }

      if (!verifyOk) {
        sendError = `transporter.verify() failed: ${verifyError}`;
      } else if (!to) {
        sendError = 'no "to" address — pass { "to": "your@email.com" } in body';
      } else {
        // Real send
        try {
          const result = await emailService.enviarEmailVerificacion(to, 'Test User', 'diag-token-000');
          sendResult = result;
        } catch (sErr) {
          sendError = sErr?.message || String(sErr);
        }
      }
    }
  } catch (outer) {
    sendError = `outer error: ${outer?.message || outer}`;
  }

  return res.json({
    success: !sendError,
    config: cfg,
    transporterReady,
    to,
    sendResult,
    sendError,
  });
});

/**
 * DELETE /api/admin/scoring/test-user
 *
 * Delete a user by email — for test/QA cleanup.
 * Body: { "email": "test@example.com" }
 */
router.delete('/test-user', requireCronSecret, async (req, res) => {
  const email = (req.body?.email || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ success: false, message: 'email required in body' });
  }
  try {
    const database = require('../config/database');
    if (!database.estaConectado()) await database.conectar();
    const Usuario = require('../models/Usuario');
    const result = await Usuario.deleteOne({ email });
    return res.json({ success: true, deleted: result.deletedCount, email });
  } catch (err) {
    console.error('test-user delete error:', err?.message);
    return res.status(500).json({ success: false, message: err?.message || 'failed' });
  }
});

module.exports = router;
