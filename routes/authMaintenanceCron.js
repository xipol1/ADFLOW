/**
 * Auth maintenance cron endpoint.
 *
 * GET/POST /api/jobs/auth-cleanup
 * Protected by CRON_SECRET. Triggered daily by Vercel Cron to delete
 * accounts that never verified their email (see jobs/unverifiedCleanupJob).
 */

const express = require('express');
const loadJob = () => require('../jobs/unverifiedCleanupJob');

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
    const { runUnverifiedCleanupJob } = loadJob();
    const result = await runUnverifiedCleanupJob();
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('Auth cleanup cron error:', err?.message);
    return res.status(500).json({
      success: false,
      message: 'Auth cleanup failed',
      error: err?.message,
    });
  }
}

router.get('/auth-cleanup', requireCronSecret, handle);
router.post('/auth-cleanup', requireCronSecret, handle);

module.exports = router;
