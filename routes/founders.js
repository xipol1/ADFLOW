/**
 * Founder programme — public + admin endpoints.
 *
 * GET  /api/founders/status           — public cohort counter (lead-gen bot funnel + landing).
 * GET  /api/founders/admin            — admin list of founders + cohort state.
 * POST /api/founders/admin/grant      — admin grants founderTier to a user by email.
 * POST /api/founders/admin/:id/revoke — admin revokes founderTier.
 */

const express = require('express');
const router = express.Router();
const { ensureDb } = require('../lib/ensureDb');
const { autenticar } = require('../middleware/auth');
const { FOUNDER_COHORT_SIZE } = require('../config/founderProgram');

const requireAdmin = (req, res, next) => {
  const rol = req.usuario?.rol || req.usuario?.role;
  if (rol !== 'admin') return res.status(403).json({ success: false, message: 'Solo administradores' });
  next();
};

async function cohortState() {
  const Usuario = require('../models/Usuario');
  const granted = await Usuario.countDocuments({ founderTier: true });
  const remaining = Math.max(0, FOUNDER_COHORT_SIZE - granted);
  return { granted, cohortSize: FOUNDER_COHORT_SIZE, remaining, full: remaining === 0 };
}

router.get('/status', async (req, res) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'DB unavailable' });
    return res.json({ success: true, data: await cohortState() });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/admin', autenticar, requireAdmin, async (req, res) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'DB unavailable' });

    const Usuario = require('../models/Usuario');
    const founders = await Usuario.find({ founderTier: true })
      .select('nombre email rol createdAt founderFirstPaidCampaignAt')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: { founders, cohort: await cohortState() } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/admin/grant', autenticar, requireAdmin, async (req, res) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'DB unavailable' });

    const email = (req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ success: false, message: 'Email requerido' });

    const Usuario = require('../models/Usuario');
    const user = await Usuario.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    if (user.founderTier) {
      return res.json({ success: true, alreadyFounder: true, data: user, cohort: await cohortState() });
    }

    const granted = await Usuario.countDocuments({ founderTier: true });
    if (granted >= FOUNDER_COHORT_SIZE) {
      return res.status(409).json({ success: false, message: 'Cohorte completa' });
    }

    user.founderTier = true;
    await user.save();

    return res.json({ success: true, data: user, cohort: await cohortState() });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/admin/:id/revoke', autenticar, requireAdmin, async (req, res) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'DB unavailable' });

    const Usuario = require('../models/Usuario');
    const user = await Usuario.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    user.founderTier = false;
    // founderFirstPaidCampaignAt is preserved as audit trail.
    await user.save();

    return res.json({ success: true, data: user, cohort: await cohortState() });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
