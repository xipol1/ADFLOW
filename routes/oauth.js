const express = require('express');
const { body, param, query } = require('express-validator');
const { autenticar, requiereEmailVerificado } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const oauthController = require('../controllers/oauthController');
const platformConnect = require('../controllers/platformConnectController');
const { refreshExpiringTokens } = require('../services/tokenRefreshService');

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

// ── Cron endpoint for automatic token refresh (Vercel Cron or manual trigger) ──
router.get('/meta/cron-refresh', async (req, res) => {
  // Verify cron secret (Vercel sets this automatically for cron routes)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const results = await refreshExpiringTokens();
    return res.json({ success: true, data: results });
  } catch (err) {
    console.error('OAuth refresh cron error:', err.message);
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
