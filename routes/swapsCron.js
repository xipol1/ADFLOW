/**
 * Swaps maintenance cron endpoint.
 *
 * GET /api/jobs/swaps-maintenance
 * Protected by CRON_SECRET. Triggered daily by Vercel Cron at 04:15 UTC
 * (15 min after multiplatform-intel to avoid bursts).
 */

const express = require('express');
// Lazy-loaded to keep the cold-start surface of authenticated swap routes minimal.
const loadJob = () => require('../jobs/swapsMaintenanceJob');

const router = express.Router();

function requireCronSecret(req, res, next) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ success: false, message: 'CRON_SECRET not configured' });
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  return next();
}

async function handle(req, res) {
  try {
    const { runSwapsMaintenanceJob } = loadJob();
    const result = await runSwapsMaintenanceJob();
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('Swaps maintenance cron error:', err?.message);
    return res.status(500).json({
      success: false,
      message: 'Swaps maintenance failed',
      error: err?.message,
    });
  }
}

router.get('/swaps-maintenance', requireCronSecret, handle);
router.post('/swaps-maintenance', requireCronSecret, handle);

module.exports = router;
