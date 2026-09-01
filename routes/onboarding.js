const express = require('express');
const router = express.Router();
const onboarding = require('../controllers/onboardingController');
const { autenticar: authenticate, requiereEmailVerificado } = require('../middleware/auth');
const { limitarIntentos } = require('../middleware/rateLimiter');

// Rate limit for WhatsApp verification polling. Frontend hits this on a timer
// while the user is on the verification screen — typical session does ~30
// polls (5s interval × 2-3 minutes). Cap at 60/min per IP to prevent abuse
// while leaving comfortable headroom for legitimate flows.
const limitarWhatsAppPoll = limitarIntentos({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, error: 'Demasiadas comprobaciones. Espera unos segundos antes de reintentar.' },
});

// ─── Telegram ───────────────────────────────────────────────────────────────
router.post('/telegram/instrucciones', authenticate, (req, res) => onboarding.telegramGetInstructions(req, res));
router.post('/telegram/verificar',     authenticate, requiereEmailVerificado, (req, res) => onboarding.telegramVerify(req, res));

// ─── Discord ────────────────────────────────────────────────────────────────
router.post('/discord/instrucciones',  authenticate, (req, res) => onboarding.discordGetInstructions(req, res));
router.get('/discord/auth-url',         authenticate, requiereEmailVerificado, (req, res) => onboarding.discordGetAuthUrl(req, res));
// Público: Discord redirige aquí tras el OAuth. La confianza vive en el state
// firmado y en el JWT de propiedad que emite, no en el header de auth.
router.get('/discord/callback',         (req, res) => onboarding.discordCallback(req, res));
router.post('/discord/verificar',      authenticate, requiereEmailVerificado, (req, res) => onboarding.discordVerify(req, res));
router.post('/discord/canal-publicacion', authenticate, requiereEmailVerificado, (req, res) => onboarding.discordSetPublishChannel(req, res));

// ─── Instagram ──────────────────────────────────────────────────────────────
router.get('/instagram/auth-url',      authenticate, requiereEmailVerificado, (req, res) => onboarding.instagramGetAuthUrl(req, res));
router.get('/instagram/callback',      (req, res) => onboarding.instagramCallback(req, res));

// ─── WhatsApp Business API (OTP fallback) ───────────────────────────────────
router.post('/whatsapp/instrucciones', authenticate, requiereEmailVerificado, (req, res) => onboarding.whatsappGetInstructions(req, res));
router.get('/whatsapp/check-otp/:verificacionId', authenticate, (req, res) => onboarding.whatsappCheckOTP(req, res));
router.post('/whatsapp/verificar-otp', authenticate, requiereEmailVerificado, (req, res) => onboarding.whatsappVerifyOTPManual(req, res));
router.post('/whatsapp/verificar',     authenticate, requiereEmailVerificado, (req, res) => onboarding.whatsappVerify(req, res));

// ─── WhatsApp Admin Client (whatsapp-web.js — VPS only) ─────────────────────
router.post('/whatsapp/iniciar',             authenticate, requiereEmailVerificado, (req, res) => onboarding.whatsappAdminIniciar(req, res));
router.post('/whatsapp/verificar-admin',     authenticate, requiereEmailVerificado, (req, res) => onboarding.whatsappAdminVerificar(req, res));
router.post('/whatsapp/poll',                authenticate, limitarWhatsAppPoll, (req, res) => onboarding.whatsappAdminPoll(req, res));
router.get('/whatsapp/admin-estado/:canalId', authenticate, (req, res) => onboarding.whatsappAdminEstado(req, res));
router.post('/whatsapp/publicar/:campaignMetricsId', authenticate, (req, res) => onboarding.whatsappPublicar(req, res));

// ─── Progreso del checklist ─────────────────────────────────────────────────
// Derivado del estado real (canales, datos fiscales, campanas, tracking), no de
// localStorage. Ver services/onboardingProgress.js para el porque.
const { ensureDb } = require('../lib/ensureDb');
const onboardingProgress = require('../services/onboardingProgress');

router.get('/progreso', authenticate, async (req, res) => {
  try {
    if (!(await ensureDb())) return res.status(503).json({ success: false, message: 'DB no disponible' });
    const Usuario = require('../models/Usuario');
    const user = await Usuario.findById(req.usuario.id)
      .select('rol datosFacturacion perfilCreador perfilAnunciante onboarding').lean();
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    return res.json({ success: true, data: await onboardingProgress.calcular(user) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Marca un paso que no deja rastro en la base de datos (hoy solo el objetivo de
// gasto). Cualquier otro id se rechaza: si fuese derivable, guardarlo a mano lo
// desincronizaria de la realidad, que es justo el bug del que venimos.
router.post('/progreso/paso', authenticate, async (req, res) => {
  try {
    if (!(await ensureDb())) return res.status(503).json({ success: false, message: 'DB no disponible' });
    const Usuario = require('../models/Usuario');
    const user = await Usuario.findById(req.usuario.id).select('rol onboarding').lean();
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const { paso } = req.body || {};
    const rol = user.rol === 'creator' ? 'creator' : 'advertiser';
    if (!onboardingProgress.esPasoManual(rol, paso)) {
      return res.status(400).json({
        success: false,
        message: 'Ese paso se deriva del estado real y no se puede marcar a mano.',
      });
    }

    await Usuario.updateOne({ _id: req.usuario.id }, { $addToSet: { 'onboarding.pasosCompletados': paso } });
    const fresco = await Usuario.findById(req.usuario.id)
      .select('rol datosFacturacion perfilCreador perfilAnunciante onboarding').lean();
    return res.json({ success: true, data: await onboardingProgress.calcular(fresco) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Ocultar el checklist. Se guarda en el usuario, no en localStorage, para que
// no reaparezca al cambiar de navegador.
router.post('/progreso/descartar', authenticate, async (req, res) => {
  try {
    if (!(await ensureDb())) return res.status(503).json({ success: false, message: 'DB no disponible' });
    const Usuario = require('../models/Usuario');
    const activo = req.body?.descartar !== false;
    await Usuario.updateOne(
      { _id: req.usuario.id },
      { $set: { 'onboarding.dismissedAt': activo ? new Date() : null } }
    );
    return res.json({ success: true, data: { dismissedAt: activo ? new Date() : null } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Estado general ─────────────────────────────────────────────────────────
router.get('/estado/:canalId',         authenticate, (req, res) => onboarding.getChannelIntegrationStatus(req, res));

module.exports = router;
