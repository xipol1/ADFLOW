/**
 * Beta programme — what a signed-in user without access can see and do.
 *
 *   GET  /api/beta/estado    — my access + waitlist status + public counter
 *   POST /api/beta/waitlist  — join the founding waitlist as the logged-in user
 *
 * Context: `betaAccess` gates the /advertiser and /creator dashboards. Until
 * it is granted the user was bounced to a dead-end banner whose every CTA
 * pointed back at a gated route. These endpoints back a real waiting room:
 * the user can see where they actually stand and put their channel forward.
 *
 * The waitlist rows live in FounderRegistration, the same collection the
 * public /founding landing writes to — joined to the account by email so a
 * user who signed up on the landing before registering sees their real
 * position here rather than being asked to sign up twice.
 */

const express = require('express');
const router = express.Router();
const { autenticar, requiereEmailVerificado } = require('../middleware/auth');
const { ensureDb } = require('../lib/ensureDb');
const {
  NICHE_IDS,
  NICHE_MAP,
  SIZE_IDS,
  PLATFORM_IDS,
  SLOTS_PER_NICHE,
  CAP,
  computeDisplayedCount,
} = require('../config/founderWaitlist');

let FounderRegistration;
try {
  FounderRegistration = require('../models/FounderRegistration');
} catch (_) { /* DB-less environments — endpoints answer 503 below. */ }

// Shape one waitlist row for the client. Never returns tokens belonging to
// other people, IPs, or user agents — only what the waiting room renders.
function serializeWaitlist(doc) {
  if (!doc) return null;
  return {
    confirmed: !!doc.confirmed,
    queuePosition: doc.queuePosition || null,
    referralCount: doc.referralCount || 0,
    referralToken: doc.referralToken,
    nicho: doc.nicho,
    nichoLabel: NICHE_MAP[doc.nicho]?.label || doc.nicho,
    handle: doc.handle,
    platform: doc.platform,
    createdAt: doc.createdAt,
  };
}

// ── GET /estado ───────────────────────────────────────────────────────
router.get('/estado', autenticar, async (req, res) => {
  try {
    const dbOk = await ensureDb().catch(() => false);
    if (!dbOk) return res.status(503).json({ success: false, message: 'DB no disponible' });

    const Usuario = require('../models/Usuario');
    const user = await Usuario.findById(req.usuario.id)
      .select('email rol betaAccess betaGrantedAt')
      .lean();
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    // Admins are always in — mirrors authController.buildUserResponse.
    const betaAccess = user.rol === 'admin' || user.betaAccess === true;

    let waitlist = null;
    let confirmados = 0;
    if (FounderRegistration) {
      try {
        const [doc, count] = await Promise.all([
          FounderRegistration.findOne({ email: user.email }).lean(),
          FounderRegistration.countDocuments({ confirmed: true }),
        ]);
        waitlist = serializeWaitlist(doc);
        confirmados = count;
      } catch (_) { /* degrade to "not on the list" rather than failing the page */ }
    }

    const displayed = computeDisplayedCount(confirmados);

    return res.json({
      success: true,
      data: {
        betaAccess,
        betaGrantedAt: user.betaGrantedAt || null,
        rol: user.rol,
        waitlist,
        cohorte: {
          displayed,
          cap: CAP,
          remaining: Math.max(0, CAP - displayed),
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /waitlist ────────────────────────────────────────────────────
// Join the founding waitlist as the signed-in user. Unlike the public
// /api/founder-waitlist/register this skips the double opt-in: the account's
// email is already verified (requiereEmailVerificado), so asking the user to
// confirm the same address a second time buys nothing and loses people.
router.post('/waitlist', autenticar, requiereEmailVerificado, async (req, res) => {
  try {
    const dbOk = await ensureDb().catch(() => false);
    if (!dbOk || !FounderRegistration) {
      return res.status(503).json({ success: false, message: 'Servicio no disponible momentáneamente.' });
    }

    const Usuario = require('../models/Usuario');
    const user = await Usuario.findById(req.usuario.id).select('email').lean();
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const { handle, platform, nicho, size } = req.body || {};

    if (!handle || typeof handle !== 'string' || handle.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Indica el handle de tu canal.' });
    }
    if (!nicho || !NICHE_IDS.includes(nicho)) {
      return res.status(400).json({ success: false, message: 'Selecciona un nicho válido.' });
    }
    if (!size || !SIZE_IDS.includes(size)) {
      return res.status(400).json({ success: false, message: 'Selecciona el tamaño del canal.' });
    }
    const plat = (platform && PLATFORM_IDS.includes(platform)) ? platform : 'other';

    // Idempotent: someone who already signed up on the landing keeps their
    // original position instead of being pushed to the back of the queue.
    const existing = await FounderRegistration.findOne({ email: user.email });
    if (existing) {
      return res.json({
        success: true,
        message: 'Ya estabas en la lista.',
        data: serializeWaitlist(existing.toObject()),
      });
    }

    const nicheConfirmed = await FounderRegistration.countDocuments({ confirmed: true, nicho });
    if (nicheConfirmed >= SLOTS_PER_NICHE) {
      return res.status(409).json({ success: false, message: 'Este nicho ya está completo. Prueba con uno cercano.' });
    }

    const pos = (await FounderRegistration.countDocuments({ confirmed: true })) + 1;
    const doc = await FounderRegistration.create({
      email: user.email,
      handle: handle.trim().slice(0, 120),
      platform: plat,
      nicho,
      size,
      // Verified account → treat as confirmed on the spot.
      confirmed: true,
      confirmedAt: new Date(),
      queuePosition: pos,
      source: 'app-beta',
      ip: (req.headers['x-forwarded-for']?.split(',')[0]?.trim()) || req.ip || '',
      userAgent: (req.headers['user-agent'] || '').slice(0, 500),
    });

    return res.json({
      success: true,
      message: 'Estás en la lista.',
      data: serializeWaitlist(doc.toObject()),
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ success: false, message: 'Este email ya está en la lista.' });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
