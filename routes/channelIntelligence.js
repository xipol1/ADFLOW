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

// Hourly cap per IP: 1000 requests / hour. This is a PUBLIC read endpoint hit
// on every channel-detail view and cached for 1h at the CDN, so the origin
// mostly sees cache-misses; a tight cap (was 100/hr) made normal browsing —
// and any cache-invalidation wave (new/refreshed channels) — trip into 429s,
// which the SPA rendered as "Canal no encontrado".
const hourlyLimiter = limitarIntentos({
  windowMs: 60 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Rate limit alcanzado: 1000 req/hora' },
});

// Burst control per IP: 60 requests / 10 seconds (was 10). Runs BEFORE the
// hourly limit so sustained abuse hits the faster limiter first, while leaving
// ample headroom for a real visitor opening several channels in a row.
const burstLimiter = limitarIntentos({
  windowMs: 10 * 1000,
  max: 60,
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
