const express = require('express');
const { autenticar } = require('../middleware/auth');
const { limitarIntentos } = require('../middleware/rateLimiter');
const conversionController = require('../controllers/conversionController');

const router = express.Router();

// Rate limit for the public conversion endpoint. Tuned for the realistic
// upper bound of a busy storefront: ~120 conversions per minute per IP.
// The advertiser's backend will usually be the only caller so per-IP
// keying is appropriate here.
const conversionWriteLimiter = limitarIntentos({
  windowMs: 60 * 1000,
  max: 120,
  message: { success: false, message: 'Demasiadas conversiones desde esta IP. Intenta más tarde.' },
});

/**
 * @route   POST /api/conversions
 * @desc    Server-to-server conversion event from advertiser's backend.
 *          Public — but requires a valid clickId (64-bit unguessable token
 *          bound to a tracked click). Rate-limited per IP.
 *          Body: { clickId, type, value, currency, externalId, metadata }
 * @access  Público + rate-limited
 */
router.post('/', conversionWriteLimiter, conversionController.recordConversion);

/**
 * @route   GET /api/conversions/me
 * @desc    Advertiser-wide ROI summary (used by the dashboard KPI_ROI widget).
 * @access  Privado
 */
router.get('/me', autenticar, conversionController.getMyROI);

/**
 * @route   GET /api/conversions/campaigns/:id
 * @desc    ROI for a single campaign (revenue, conversions, CVR, ROAS).
 * @access  Privado (owner only)
 */
router.get('/campaigns/:id', autenticar, conversionController.getCampaignROI);

/**
 * @route   GET /api/conversions/campaigns/:id/list
 * @desc    Paginated raw conversion events for a campaign.
 * @access  Privado (owner only)
 */
router.get('/campaigns/:id/list', autenticar, conversionController.listCampaignConversions);

module.exports = router;
