/**
 * WhatsApp Intel cron endpoint.
 *
 * GET /api/jobs/whatsapp-intel
 * Protected by CRON_SECRET (same pattern as telegramIntel).
 *
 * Itera todos los Canal WA con BaileysSession conectada vinculada y
 * refresca metrics + scoring + crea CanalScoreSnapshot.
 */

const express = require('express');
const loadJob = () => require('../jobs/whatsappIntelJob');

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

async function handleWhatsAppIntel(req, res) {
  try {
    const { runWhatsAppIntelJob } = loadJob();
    const result = await runWhatsAppIntelJob();
    return res.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      duration_ms: result.duration_ms,
      timestamp: result.timestamp,
    });
  } catch (err) {
    console.error('WhatsApp intel cron error:', err?.message);
    return res.status(500).json({
      success: false,
      message: 'WhatsApp intel sync failed',
      error: err?.message,
    });
  }
}

router.get('/whatsapp-intel', requireCronSecret, handleWhatsAppIntel);
router.post('/whatsapp-intel', requireCronSecret, handleWhatsAppIntel);

module.exports = router;
