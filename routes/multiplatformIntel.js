/**
 * Multi-Platform Intel cron endpoint.
 *
 * GET /api/jobs/multiplatform-intel
 * Protected by CRON_SECRET (same pattern as telegramIntel).
 * Vercel Cron triggers this daily at 04:00 UTC.
 */

const express = require('express');
const loadJob = () => require('../jobs/multiplatformIntelJob');

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

async function handleMultiplatformIntel(req, res) {
  try {
    // ?bootstrap=true → create initial snapshots for channels without any
    if (req.query.bootstrap === 'true') {
      const { createInitialSnapshots } = require('../services/multiplatformIntelService');
      const limit = Math.min(200, Math.max(0, Number(req.query.limit) || 200));
      const result = await createInitialSnapshots({ limit });
      return res.json({ success: true, action: 'bootstrap', ...result });
    }

    const { runMultiplatformIntelJob } = loadJob();
    const result = await runMultiplatformIntelJob();
    return res.json({
      success: true,
      processed: result.processed,
      updated: result.updated,
      errors: result.errors.slice(0, 20),
      duration_ms: result.duration_ms,
      timestamp: result.timestamp,
    });
  } catch (err) {
    console.error('Multiplatform intel cron error:', err?.message);
    return res.status(500).json({
      success: false,
      message: 'Multiplatform intel sync failed',
      error: err?.message,
    });
  }
}

router.get('/multiplatform-intel', requireCronSecret, handleMultiplatformIntel);
router.post('/multiplatform-intel', requireCronSecret, handleMultiplatformIntel);

module.exports = router;
