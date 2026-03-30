const express = require('express');
const { param } = require('express-validator');
const { autenticar } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const estadisticaController = require('../controllers/estadisticaController');
const analyticsController = require('../controllers/analyticsController');

const router = express.Router();

// ── Advanced Analytics ──

// Creator analytics (time-series for dashboard charts)
router.get('/creator/analytics', autenticar, analyticsController.getCreatorAnalytics);

// Advertiser analytics (spend, CPC, ROI charts)
router.get('/advertiser/analytics', autenticar, analyticsController.getAdvertiserAnalytics);

// Channel-specific analytics (deep-dive)
router.get(
  '/channels/:channelId/analytics',
  autenticar,
  [param('channelId').isMongoId().withMessage('ID de canal inválido')],
  validarCampos,
  analyticsController.getChannelAnalytics
);

// Campaign-specific analytics (click deep-dive)
router.get(
  '/campaigns/:campaignId/analytics',
  autenticar,
  [param('campaignId').isMongoId().withMessage('ID de campaña inválido')],
  validarCampos,
  analyticsController.getCampaignAnalytics
);

// Export CSV report
router.get('/export', autenticar, analyticsController.exportReport);

// ── Existing Endpoints ──

// Dashboard stats (role-aware: creator/advertiser/admin)
router.get('/dashboard', autenticar, estadisticaController.getDashboardStats);

// General platform stats (public)
router.get('/generales', estadisticaController.getGeneralStats);

// Campaign-specific click stats
router.get(
  '/campaign/:id',
  autenticar,
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  estadisticaController.getCampaignStats
);

module.exports = router;
