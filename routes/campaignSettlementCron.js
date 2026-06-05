/**
 * Campaign settlement cron endpoint.
 *
 * GET/POST /api/jobs/campaign-settlement
 * Protected by CRON_SECRET. Triggered daily by Vercel Cron. Releases escrow +
 * pays the creator for campaigns that have been live past the 15-day
 * verification window with no open dispute. See jobs/campaignSettlementJob.js.
 */

const express = require('express');
// Lazy-loaded to keep the cold-start surface minimal.
const loadJob = () => require('../jobs/campaignSettlementJob');

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
    const { runCampaignSettlementJob } = loadJob();
    const result = await runCampaignSettlementJob();
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('Campaign settlement cron error:', err?.message);
    return res.status(500).json({
      success: false,
      message: 'Campaign settlement failed',
      error: err?.message,
    });
  }
}

router.get('/campaign-settlement', requireCronSecret, handle);
router.post('/campaign-settlement', requireCronSecret, handle);

module.exports = router;
