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
  const features = {
    // Stripe payments — sk_live_* or sk_test_* both count as configured.
    // Webhook secret is REQUIRED on top, otherwise payments don't confirm.
    payments: has('STRIPE_SECRET_KEY') && has('STRIPE_PUBLISHABLE_KEY') && has('STRIPE_WEBHOOK_SECRET'),
    // Telegram bot + intelligence
    telegram: has('TELEGRAM_BOT_TOKEN'),
    // WhatsApp Business linking (Baileys + Cloud API)
    whatsapp: has('WHATSAPP_TOKEN') && has('WHATSAPP_PHONE_NUMBER_ID') && has('META_APP_SECRET'),
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
