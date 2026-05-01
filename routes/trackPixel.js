const express = require('express');
const { limitarIntentos } = require('../middleware/rateLimiter');
const conversionController = require('../controllers/conversionController');

const router = express.Router();

// 1x1 transparent gif used for both normal responses and rate-limited responses
// so the <img> tag on the advertiser's page never shows a broken image.
const PIXEL_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

// Rate limit for the public pixel — keyed per IP. A realistic ecommerce
// site fires ~1 pixel per checkout. 240/min/IP is generous for power users
// while still cutting off scripted abuse.
const pixelLimiter = limitarIntentos({
  windowMs: 60 * 1000,
  max: 240,
  // Custom handler: respond with the pixel anyway so the user's page doesn't
  // show a broken image. We just don't record the conversion.
  handler: (req, res) => {
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(PIXEL_GIF);
  },
});

/**
 * @route   GET /api/track/conversion
 * @desc    1x1 transparent pixel for closed-loop conversion tracking.
 *          Embed on advertiser's "thank you" page:
 *            <img src="https://channelad.io/api/track/conversion?cid=XXX&type=purchase&v=49.99" />
 *          Falls back to the _chad_cid cookie if cid is missing.
 * @access  Público + rate-limited (responds with gif even when throttled)
 */
router.get('/conversion', pixelLimiter, conversionController.recordConversionPixel);

module.exports = router;
