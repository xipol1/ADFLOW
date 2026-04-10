/**
 * Public niche intelligence endpoints.
 *
 *   GET /api/niche/:nicho/leaderboard?limit=10
 *   GET /api/niche/:nicho/trends?days=30
 *   GET /api/niche/:nicho/supply-demand
 *
 * All public, no authentication. Rate-limited + edge-cached.
 */

const express = require('express');
const { param, query } = require('express-validator');
const { validarCampos } = require('../middleware/validarCampos');
const { limitarIntentos } = require('../middleware/rateLimiter');
const {
  getNicheLeaderboard,
  getNicheTrends,
  getNicheSupplyDemand,
  isValidNicho,
} = require('../services/nicheIntelligenceService');

const router = express.Router();

const CACHE_HEADER = 'public, max-age=3600, s-maxage=3600';

// Rate limits (shared across all niche endpoints)
const hourlyLimiter = limitarIntentos({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Rate limit: 100 req/hora' },
});
const burstLimiter = limitarIntentos({
  windowMs: 10 * 1000,
  max: 10,
  message: { success: false, message: 'Demasiadas solicitudes' },
});

// Shared nicho validator
const nichoValidator = param('nicho')
  .isString()
  .trim()
  .toLowerCase()
  .custom((v) => {
    if (!isValidNicho(v)) throw new Error('Nicho no válido');
    return true;
  });

// ── Leaderboard ──────────────────────────────────────────────────────────────
router.get(
  '/:nicho/leaderboard',
  burstLimiter,
  hourlyLimiter,
  [nichoValidator, query('limit').optional().isInt({ min: 1, max: 50 })],
  validarCampos,
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const data = await getNicheLeaderboard(req.params.nicho, { limit });
      res.setHeader('Cache-Control', CACHE_HEADER);
      return res.json({ success: true, data, nicho: req.params.nicho });
    } catch (err) {
      console.error('niche leaderboard error:', err?.message);
      return res.status(500).json({ success: false, message: 'Error interno' });
    }
  },
);

// ── Trends ───────────────────────────────────────────────────────────────────
router.get(
  '/:nicho/trends',
  burstLimiter,
  hourlyLimiter,
  [nichoValidator, query('days').optional().isInt({ min: 7, max: 90 })],
  validarCampos,
  async (req, res) => {
    try {
      const days = parseInt(req.query.days) || 30;
      const data = await getNicheTrends(req.params.nicho, days);
      res.setHeader('Cache-Control', CACHE_HEADER);
      return res.json({ success: true, data, nicho: req.params.nicho, days });
    } catch (err) {
      console.error('niche trends error:', err?.message);
      return res.status(500).json({ success: false, message: 'Error interno' });
    }
  },
);

// ── Supply vs Demand ─────────────────────────────────────────────────────────
router.get(
  '/:nicho/supply-demand',
  burstLimiter,
  hourlyLimiter,
  [nichoValidator],
  validarCampos,
  async (req, res) => {
    try {
      const data = await getNicheSupplyDemand(req.params.nicho);
      res.setHeader('Cache-Control', CACHE_HEADER);
      return res.json({ success: true, data, nicho: req.params.nicho });
    } catch (err) {
      console.error('niche supply-demand error:', err?.message);
      return res.status(500).json({ success: false, message: 'Error interno' });
    }
  },
);

module.exports = router;
