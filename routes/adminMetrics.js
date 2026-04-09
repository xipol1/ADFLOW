/**
 * Admin metrics endpoints — protected by CRON_SECRET.
 *
 * Called by Vercel Cron once per hour to capture any snapshots whose
 * schedule has elapsed. See services/campaignSnapshotService.js.
 */

const express = require('express');
const { runSnapshotCapture } = require('../services/campaignSnapshotService');

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

module.exports = router;
