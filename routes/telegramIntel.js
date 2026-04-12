/**
 * Telegram Intel cron endpoint.
 *
 * GET /api/jobs/telegram-intel
 * Protected by CRON_SECRET (same pattern as adminScoring/adminMetrics).
 * Vercel Cron triggers this daily at 03:00 UTC.
 */

const express = require('express');
// Lazy-loaded to avoid bundling GramJS into every Vercel function invocation
const loadJob = () => require('../jobs/telegramIntelJob');

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

async function handleTelegramIntel(req, res) {
  try {
    const { runTelegramIntelJob } = loadJob();
    const result = await runTelegramIntelJob();
    return res.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      duration_ms: result.duration_ms,
      timestamp: result.timestamp,
    });
  } catch (err) {
    console.error('Telegram intel cron error:', err?.message);
    return res.status(500).json({
      success: false,
      message: 'Telegram intel sync failed',
      error: err?.message,
    });
  }
}

// Support both GET (Vercel Cron) and POST (manual trigger)
router.get('/telegram-intel', requireCronSecret, handleTelegramIntel);
router.post('/telegram-intel', requireCronSecret, handleTelegramIntel);

module.exports = router;
