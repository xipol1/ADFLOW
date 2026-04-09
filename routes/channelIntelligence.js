/**
 * Public channel intelligence endpoint.
 *
 *   GET /api/channels/:id/intelligence
 *
 * Public, no authentication. Rate-limited at two tiers:
 *   - Hourly: 100 req / IP / hour (normal crawlers)
 *   - Burst:  10 req / IP / 10 seconds (abuse control)
 *
 * Cached for one hour at the Vercel Edge layer via Cache-Control headers.
 * A popular channel only hits MongoDB once per hour regardless of how
 * many viewers open its page. No Redis required — this is standard
 * HTTP caching.
 *
 * Privacy: only fields in the public contract are returned. Owner
 * identity, contact info, advertiser history, and sensitive fraud flags
 * are filtered at the service layer.
 */

const express = require('express');
const { param } = require('express-validator');
const { validarCampos } = require('../middleware/validarCampos');
const { limitarIntentos } = require('../middleware/rateLimiter');
const { buildChannelIntelligence } = require('../services/channelIntelligenceService');

const router = express.Router();

// Hourly cap per IP: 100 requests / hour.
const hourlyLimiter = limitarIntentos({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Rate limit alcanzado: 100 req/hora' },
});

// Burst control per IP: 10 requests / 10 seconds. Runs BEFORE the hourly
// limit so sustained abuse hits the faster limiter first.
const burstLimiter = limitarIntentos({
  windowMs: 10 * 1000,
  max: 10,
  message: { success: false, message: 'Demasiadas solicitudes simultáneas' },
});

router.get(
  '/:id/intelligence',
  burstLimiter,
  hourlyLimiter,
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  async (req, res) => {
    try {
      const data = await buildChannelIntelligence(req.params.id);
      if (!data) {
        return res.status(404).json({ success: false, message: 'Canal no encontrado' });
      }
      // Vercel Edge + browser caching. The scoring cron runs nightly and
      // the data changes slowly, so a 1-hour public cache is safe.
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
      return res.json({ success: true, data });
    } catch (err) {
      console.error('channel intelligence error:', err?.message);
      return res.status(500).json({ success: false, message: 'Error interno' });
    }
  },
);

module.exports = router;
