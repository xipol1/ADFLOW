const express = require('express');
const conversionController = require('../controllers/conversionController');

const router = express.Router();

/**
 * @route   GET /api/track/conversion
 * @desc    1x1 transparent pixel for closed-loop conversion tracking.
 *          Embed on advertiser's "thank you" page:
 *            <img src="https://channelad.io/api/track/conversion?cid=XXX&type=purchase&v=49.99" />
 *          Falls back to the _chad_cid cookie if cid is missing.
 * @access  Público (no auth — must be reachable from advertiser's frontend)
 */
router.get('/conversion', conversionController.recordConversionPixel);

module.exports = router;
