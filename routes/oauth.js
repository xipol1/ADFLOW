const express = require('express');
const { body, param, query } = require('express-validator');
const { autenticar } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const oauthController = require('../controllers/oauthController');
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
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
