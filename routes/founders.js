/**
 * Founder programme — public endpoints.
 *
 * GET /api/founders/status — cohort counter (granted / cap / remaining).
 * Consumed by the lead-gen Telegram bot funnel and the founding landing page.
 * No auth: it is a marketing counter, not sensitive data.
 */

const express = require('express');
const router = express.Router();
const { ensureDb } = require('../lib/ensureDb');
const { FOUNDER_COHORT_SIZE } = require('../config/founderProgram');

router.get('/status', async (req, res) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'DB unavailable' });

    const Usuario = require('../models/Usuario');
    const granted = await Usuario.countDocuments({ founderTier: true });
    const remaining = Math.max(0, FOUNDER_COHORT_SIZE - granted);

    return res.json({
      success: true,
      data: { granted, cohortSize: FOUNDER_COHORT_SIZE, remaining, full: remaining === 0 },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
