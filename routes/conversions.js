const express = require('express');
const { autenticar } = require('../middleware/auth');
const conversionController = require('../controllers/conversionController');

const router = express.Router();

/**
 * @route   POST /api/conversions
 * @desc    Server-to-server conversion event from advertiser's backend.
 *          Body: { clickId, type, value, currency, externalId, metadata }
 * @access  Público (recommended: gated by an Advertiser API key in a future iteration)
 */
router.post('/', conversionController.recordConversion);

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
