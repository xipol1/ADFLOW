/**
 * Auth maintenance cron endpoints.
 *
 * GET/POST /api/jobs/auth-cleanup
 *   Deletes accounts that never verified their email (jobs/unverifiedCleanupJob).
 *
 * GET/POST /api/jobs/verification-reminder
 *   Reminds those same accounts BEFORE the cleanup deletes them
 *   (jobs/verificationReminderJob). Operational email (art. 6.1.b RGPD) —
 *   not a commercial one, so it needs no marketing consent.
 *
 * Both protected by CRON_SECRET and triggered daily by Vercel Cron. The
 * reminder must run BEFORE the cleanup in the daily schedule, so a user who
 * verifies after the reminder isn't deleted the same night.
 */

const express = require('express');
const loadJob = () => require('../jobs/unverifiedCleanupJob');
const loadReminderJob = () => require('../jobs/verificationReminderJob');

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

async function handleReminder(req, res) {
  try {
    const { runVerificationReminderJob } = loadReminderJob();
    // ?dry=1 permite ver el alcance desde el propio endpoint sin enviar nada.
    const dryRun = req.query?.dry === '1' || req.query?.dry === 'true';
    const result = await runVerificationReminderJob({ dryRun });
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('Verification reminder cron error:', err?.message);
    return res.status(500).json({
      success: false,
      message: 'Verification reminder failed',
      error: err?.message,
    });
  }
}

router.get('/auth-cleanup', requireCronSecret, handle);
router.post('/auth-cleanup', requireCronSecret, handle);
router.get('/verification-reminder', requireCronSecret, handleReminder);
router.post('/verification-reminder', requireCronSecret, handleReminder);

module.exports = router;
