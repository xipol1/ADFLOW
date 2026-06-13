const express = require('express');
const { limitarIntentos } = require('../middleware/rateLimiter');
const c = require('../controllers/affiliateClickController');

const router = express.Router();

// Public beacon — generous per-IP cap. A single visitor fires at most a handful
// of outbound clicks; 600/min/IP absorbs power users while cutting scripted abuse.
// On throttle we still 204 so the page's navigation logic never sees an error.
const beaconLimiter = limitarIntentos({
  windowMs: 60 * 1000,
  max: 600,
  handler: (req, res) => res.status(204).end(),
});

// Body parser scoped to this route: the global express.json() runs AFTER this
// router is mounted (we sit in front of the restrictive global CORS), so we
// parse the raw body ourselves. Accept text/plain (sendBeacon / simple request)
// and application/json (fetch) — both surface as a string in the controller.
const parseBeacon = express.text({
  type: ['text/plain', 'application/json', 'application/*+json'],
  limit: '4kb',
});

/**
 * @route   POST /api/track/outbound-click
 * @desc    Records an affiliate bridge-page click-out (channel attribution).
 * @access  Público + rate-limited (always 204, write-only, no PII)
 */
router.post('/outbound-click', parseBeacon, beaconLimiter, c.recordOutboundClick);

module.exports = router;
