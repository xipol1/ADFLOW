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
router.post('/discord/verificar',      authenticate, requiereEmailVerificado, (req, res) => onboarding.discordVerify(req, res));

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

// ─── Estado general ─────────────────────────────────────────────────────────
router.get('/estado/:canalId',         authenticate, (req, res) => onboarding.getChannelIntegrationStatus(req, res));

module.exports = router;
