const express = require('express');
const router = express.Router();
const onboarding = require('../controllers/onboardingController');
const { autenticar: authenticate } = require('../middleware/auth');

// ─── Telegram ───────────────────────────────────────────────────────────────
router.post('/telegram/instrucciones', authenticate, (req, res) => onboarding.telegramGetInstructions(req, res));
router.post('/telegram/verificar',     authenticate, (req, res) => onboarding.telegramVerify(req, res));

// ─── Discord ────────────────────────────────────────────────────────────────
router.post('/discord/instrucciones',  authenticate, (req, res) => onboarding.discordGetInstructions(req, res));
router.post('/discord/verificar',      authenticate, (req, res) => onboarding.discordVerify(req, res));

// ─── Instagram ──────────────────────────────────────────────────────────────
router.get('/instagram/auth-url',      authenticate, (req, res) => onboarding.instagramGetAuthUrl(req, res));
router.get('/instagram/callback',      (req, res) => onboarding.instagramCallback(req, res));

// ─── WhatsApp Business API (OTP fallback) ───────────────────────────────────
router.post('/whatsapp/instrucciones', authenticate, (req, res) => onboarding.whatsappGetInstructions(req, res));
router.get('/whatsapp/check-otp/:verificacionId', authenticate, (req, res) => onboarding.whatsappCheckOTP(req, res));
router.post('/whatsapp/verificar-otp', authenticate, (req, res) => onboarding.whatsappVerifyOTPManual(req, res));
router.post('/whatsapp/verificar',     authenticate, (req, res) => onboarding.whatsappVerify(req, res));

// ─── WhatsApp Admin Client (whatsapp-web.js — VPS only) ─────────────────────
router.post('/whatsapp/iniciar',             authenticate, (req, res) => onboarding.whatsappAdminIniciar(req, res));
router.post('/whatsapp/verificar-admin',     authenticate, (req, res) => onboarding.whatsappAdminVerificar(req, res));
router.get('/whatsapp/admin-estado/:canalId', authenticate, (req, res) => onboarding.whatsappAdminEstado(req, res));
router.post('/whatsapp/publicar/:campaignMetricsId', authenticate, (req, res) => onboarding.whatsappPublicar(req, res));

// ─── Estado general ─────────────────────────────────────────────────────────
router.get('/estado/:canalId',         authenticate, (req, res) => onboarding.getChannelIntegrationStatus(req, res));

module.exports = router;
