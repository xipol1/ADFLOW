const express = require('express');
const { body, param, query } = require('express-validator');
const { autenticar, requiereEmailVerificado } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const oauthController = require('../controllers/oauthController');
const platformConnect = require('../controllers/platformConnectController');
const { refreshExpiringTokens } = require('../services/tokenRefreshService');
const { runHealthCheckBatch } = require('../services/channelHealthService');
const newsletterDomain = require('../controllers/newsletterDomainController');

const router = express.Router();

// ── Meta OAuth flow ──

// Step 1: Get authorization URL (requires auth)
router.get('/meta/authorize', autenticar, oauthController.authorize);

// Step 2: Meta redirects here after user grants permissions (public — no auth)
router.get('/meta/callback', oauthController.callback);

// Step 3: List discovered accounts from OAuth session
router.get(
  '/meta/accounts',
  autenticar,
  [query('session').isString().notEmpty().withMessage('session requerido')],
  validarCampos,
  oauthController.listAccounts
);

// Step 4: Create channels from selected accounts
router.post(
  '/meta/connect',
  autenticar,
  [
    body('session').isString().notEmpty().withMessage('session requerido'),
    body('accounts').isArray({ min: 1 }).withMessage('accounts debe ser un array con al menos 1 elemento'),
    body('accounts.*.type').isIn(['facebook', 'instagram', 'whatsapp']).withMessage('type inválido'),
  ],
  validarCampos,
  oauthController.connectAccounts
);

// Disconnect a channel from Meta OAuth
router.post(
  '/meta/disconnect/:id',
  autenticar,
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  oauthController.disconnect
);

// Force-refresh token for a specific channel
router.post(
  '/meta/refresh/:id',
  autenticar,
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  oauthController.refreshToken
);

// Shared guard for cron endpoints. The earlier pattern
//   if (cronSecret && authHeader !== Bearer cronSecret) → 401
// was unsafe: if CRON_SECRET was unset (env wiped, typo, preview deploy),
// the endpoints became fully public. We now refuse to run when the secret
// isn't configured — the rest of the cron routes (scoring, intel) follow
// the same pattern.
const requireCronSecret = (req, res, next) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return res.status(503).json({ success: false, message: 'CRON_SECRET no configurado' });
  }
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};

// ── Cron endpoint for automatic token refresh (Vercel Cron or manual trigger) ──
router.get('/meta/cron-refresh', requireCronSecret, async (req, res) => {
  try {
    const results = await refreshExpiringTokens();
    return res.json({ success: true, data: results });
  } catch (err) {
    console.error('OAuth refresh cron error:', err.message);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// ── Cron endpoint for channel health check (admin-loss / token-revoked detection) ──
// Complements /meta/cron-refresh: that service rotates tokens *before* they
// expire, this one catches the cases token refresh can't (bot demoted, user
// revoked grant via platform UI, WhatsApp System User token died). Should be
// scheduled hourly or every few hours; the service paginates internally via
// batchSize to stay under serverless time limits.
router.get('/channels/cron-health', requireCronSecret, async (req, res) => {
  try {
    const batchSize = Number(req.query.batchSize) || undefined;
    const results = await runHealthCheckBatch({ batchSize });
    return res.json({ success: true, data: results });
  } catch (err) {
    console.error('Channel health cron error:', err.message);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// ── Telegram ──

router.post(
  '/telegram/connect',
  autenticar,
  requiereEmailVerificado,
  [
    body('botToken').isString().notEmpty().withMessage('botToken requerido'),
    body('chatId').isString().notEmpty().withMessage('chatId requerido'),
  ],
  validarCampos,
  platformConnect.connectTelegram
);

router.post(
  '/telegram/verify/:id',
  autenticar,
  [param('id').isMongoId().withMessage('ID invalido')],
  validarCampos,
  platformConnect.verifyTelegram
);

router.post(
  '/telegram/disconnect/:id',
  autenticar,
  [param('id').isMongoId().withMessage('ID invalido')],
  validarCampos,
  platformConnect.disconnectTelegram
);

// ── Discord ──

router.post(
  '/discord/connect',
  autenticar,
  requiereEmailVerificado,
  [
    body('botToken').isString().notEmpty().withMessage('botToken requerido'),
    body('serverId').isString().notEmpty().withMessage('serverId requerido'),
  ],
  validarCampos,
  platformConnect.connectDiscord
);

router.post(
  '/discord/verify/:id',
  autenticar,
  [param('id').isMongoId().withMessage('ID invalido')],
  validarCampos,
  platformConnect.verifyDiscord
);

router.post(
  '/discord/disconnect/:id',
  autenticar,
  [param('id').isMongoId().withMessage('ID invalido')],
  validarCampos,
  platformConnect.disconnectDiscord
);

// ── WhatsApp (Manual — Business API) ──

router.post(
  '/whatsapp/connect-manual',
  autenticar,
  requiereEmailVerificado,
  [
    body('accessToken').isString().notEmpty().withMessage('accessToken requerido'),
    body('phoneNumberId').isString().notEmpty().withMessage('phoneNumberId requerido'),
  ],
  validarCampos,
  platformConnect.connectWhatsAppManual
);

// ── Newsletter ──

router.post(
  '/newsletter/connect',
  autenticar,
  requiereEmailVerificado,
  [
    body('apiKey').isString().notEmpty().withMessage('apiKey requerida'),
    body('provider').isIn(['mailchimp', 'beehiiv', 'substack']).withMessage('provider invalido (mailchimp, beehiiv, substack)'),
  ],
  validarCampos,
  platformConnect.connectNewsletter
);

router.post(
  '/newsletter/verify/:id',
  autenticar,
  [param('id').isMongoId().withMessage('ID invalido')],
  validarCampos,
  platformConnect.verifyNewsletter
);

router.post(
  '/newsletter/disconnect/:id',
  autenticar,
  [param('id').isMongoId().withMessage('ID invalido')],
  validarCampos,
  platformConnect.disconnectNewsletter
);

// ── Newsletter domain verification (Phase 4 — promotes verificado:true) ──
//
// Newsletter channels can't prove ownership via OAuth. The /connect flow
// above leaves them at verificado:false. These four endpoints implement
// either DNS TXT or email-confirmation proof; on success the canal is
// promoted to verificado:true with tipoAcceso='admin_directo'.

router.post(
  '/newsletter/verify-domain/start/:id',
  autenticar,
  [
    param('id').isMongoId().withMessage('ID invalido'),
    body('domain').isString().notEmpty().withMessage('domain requerido'),
    body('method').isIn(['dns', 'email']).withMessage('method debe ser dns o email'),
  ],
  validarCampos,
  newsletterDomain.startChallenge
);

router.post(
  '/newsletter/verify-domain/dns-check/:id',
  autenticar,
  [param('id').isMongoId().withMessage('ID invalido')],
  validarCampos,
  newsletterDomain.checkDns
);

router.post(
  '/newsletter/verify-domain/email-send/:id',
  autenticar,
  [
    param('id').isMongoId().withMessage('ID invalido'),
    body('mailbox').optional().isString().isLength({ max: 32 }),
  ],
  validarCampos,
  newsletterDomain.sendEmail
);

// Public — the JWT in :token is the authorization. No auth middleware.
router.get(
  '/newsletter/verify/email-confirm/:token',
  [param('token').isString().isLength({ min: 16, max: 2048 })],
  validarCampos,
  newsletterDomain.confirmEmail
);

// ── LinkedIn OAuth flow ──

router.get('/linkedin/authorize', autenticar, oauthController.authorizeLinkedin);

router.get('/linkedin/callback', oauthController.callbackLinkedin);

router.get(
  '/linkedin/accounts',
  autenticar,
  [query('session').isString().notEmpty().withMessage('session requerido')],
  validarCampos,
  oauthController.listLinkedinAccounts
);

router.post(
  '/linkedin/connect',
  autenticar,
  [
    body('session').isString().notEmpty().withMessage('session requerido'),
    body('accounts').isArray({ min: 1 }).withMessage('accounts debe ser un array con al menos 1 elemento'),
    body('accounts.*.type').isIn(['profile', 'organization']).withMessage('type invalido (profile o organization)'),
  ],
  validarCampos,
  oauthController.connectLinkedinAccounts
);

router.post(
  '/linkedin/disconnect/:id',
  autenticar,
  [param('id').isMongoId().withMessage('ID invalido')],
  validarCampos,
  oauthController.disconnectLinkedin
);

router.post(
  '/linkedin/refresh/:id',
  autenticar,
  [param('id').isMongoId().withMessage('ID invalido')],
  validarCampos,
  oauthController.refreshLinkedinToken
);

module.exports = router;
