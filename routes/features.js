/**
 * GET /api/features — Public feature-flag endpoint.
 *
 * Used by the frontend to decide whether to render a feature surface or
 * an "Próximamente" overlay. The flags are derived from env presence so
 * the truth lives in the deploy config, not in code.
 *
 * Public on purpose: the flags are not secret (anyone can probe whether
 * Stripe is wired by trying to checkout). Cache 60s on the CDN to absorb
 * traffic without hitting the function for every page load.
 */
const express = require('express');
const router = express.Router();

const has = (envName) => Boolean(process.env[envName] && String(process.env[envName]).trim());

router.get('/', (req, res) => {
  // Baileys (the QR-pairing WhatsApp Web library used to verify creator
  // newsletters) cannot run on Vercel — it needs a persistent Node process
  // with WebSockets. In production a Fly sidecar hosts it, signalled by
  // BAILEYS_SIDECAR_URL. Off-Vercel (local dev, persistent host) Baileys
  // runs in-process so the flag is always true.
  // Frontend also needs VITE_BAILEYS_API_URL set to the same host so that
  // client/src/services/api.js routes /baileys/* there — ops must set both
  // envs together. We can't see VITE_* from the backend, so trust the ops
  // convention and key the flag off the backend env only.
  const runsOnVercel = process.env.VERCEL === '1' || process.env.RUNTIME_PLATFORM === 'vercel';
  const baileysAvailable = runsOnVercel ? has('BAILEYS_SIDECAR_URL') : true;

  const features = {
    // Stripe payments — sk_live_* or sk_test_* both count as configured.
    // Webhook secret is REQUIRED on top, otherwise payments don't confirm.
    payments: has('STRIPE_SECRET_KEY') && has('STRIPE_PUBLISHABLE_KEY') && has('STRIPE_WEBHOOK_SECRET'),
    // Telegram bot + intelligence
    telegram: has('TELEGRAM_BOT_TOKEN'),
    // WhatsApp newsletter LINKING — uses Baileys. This is the gate for the
    // /creator/channels/link-whatsapp page. Decoupled from Cloud API envs
    // because those are a different integration (publishing ads from a
    // Channelad business number).
    whatsapp: baileysAvailable,
    // WhatsApp Cloud API — Channelad publishing ads from its own business
    // number. Currently used by webhooks (OTP verification) and ad publish.
    whatsappPublishing: has('WHATSAPP_TOKEN') && has('WHATSAPP_PHONE_NUMBER_ID') && has('META_APP_SECRET'),
    // Cloudflare R2 — required for campaign media uploads
    r2Storage: has('R2_ACCESS_KEY_ID') && has('R2_SECRET_ACCESS_KEY') && has('R2_BUCKET'),
    // Subscription billing (Phase 2)
    subscriptions: has('STRIPE_SUBSCRIPTION_WEBHOOK_SECRET'),
    // Google OAuth sign-in
    googleAuth: has('GOOGLE_CLIENT_ID'),
    // Push notifications (web-push)
    pushNotifications: has('VAPID_PUBLIC_KEY') && has('VAPID_PRIVATE_KEY'),
    // Sentry error tracking
    sentry: has('SENTRY_DSN'),
  };

  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  res.json({ success: true, features });
});

module.exports = router;
