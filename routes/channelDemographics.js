/**
 * GET /api/channels/:id/demographics
 *
 * Authenticated. Returns real audience demographics for a Canal pulled from
 * its OAuth-connected platform (Instagram Business, LinkedIn Org). Falls back
 * to `{ source: null }` when no real data is available, so the frontend can
 * show client-side estimates with a clear "estimated" badge.
 *
 * Why authenticated and not public like /intelligence: demographic breakdowns
 * are PII-adjacent (city-level geo for an audience) and only the channel
 * owner — and admins — should see them.
 *
 * Cache: not aggressive at HTTP layer because the response is keyed to the
 * caller (owner/admin). The service layer caches 6h on the Canal document.
 */

const express = require('express');
const { param, query } = require('express-validator');
const { validarCampos } = require('../middleware/validarCampos');
const { autenticar } = require('../middleware/auth');
const { limitadorAPI } = require('../middleware/rateLimiter');
const Canal = require('../models/Canal');
const demographicsService = require('../services/demographicsService');
const copyBenchmarksService = require('../services/copyBenchmarksService');

const router = express.Router();

router.get(
  '/:id/demographics',
  autenticar,
  limitadorAPI,
  [
    param('id').isMongoId().withMessage('ID inválido'),
    query('refresh').optional().isIn(['true', 'false']),
  ],
  validarCampos,
  async (req, res) => {
    try {
      const canal = await Canal.findById(req.params.id).select('propietario');
      if (!canal) {
        return res.status(404).json({ success: false, message: 'Canal no encontrado' });
      }

      // Owner-or-admin only.
      const isOwner = canal.propietario?.toString() === req.usuario?._id?.toString();
      const isAdmin = req.usuario?.rol === 'admin';
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, message: 'No autorizado' });
      }

      const force = req.query.refresh === 'true';
      const data = await demographicsService.getDemographics(req.params.id, { force });

      // No HTTP cache — service-level cache is enough and the response is
      // user-specific.
      res.setHeader('Cache-Control', 'private, no-store');
      return res.json({ success: true, data });
    } catch (err) {
      console.error('demographics endpoint error:', err?.message);
      return res.status(500).json({ success: false, message: 'Error interno' });
    }
  },
);

/**
 * GET /api/channels/:id/copy-benchmarks
 *
 * Aggregated ad-copy performance stats for the channel (length/word/emoji
 * distribution, top-quartile-by-CTR patterns). Powers the channel-aware
 * copy analyzer so a creator can see "in your channel, posts of 90-150
 * chars get 2.3× CTR".
 *
 * Authenticated. Less PII-sensitive than demographics (it's aggregated
 * across the channel's own posts, no audience info), but we still gate
 * to (a) the channel owner — to see their own performance — and
 * (b) any authenticated user who has an active campaign or swap with
 * this channel — so an advertiser proposing a campaign can see it too.
 * Admins always allowed.
 *
 * Cache: 24h on the Canal document. ?refresh=true forces recomputation.
 */
router.get(
  '/:id/copy-benchmarks',
  autenticar,
  limitadorAPI,
  [
    param('id').isMongoId().withMessage('ID inválido'),
    query('refresh').optional().isIn(['true', 'false']),
  ],
  validarCampos,
  async (req, res) => {
    try {
      const canal = await Canal.findById(req.params.id).select('propietario');
      if (!canal) {
        return res.status(404).json({ success: false, message: 'Canal no encontrado' });
      }

      const userId = req.usuario?._id?.toString() || req.usuario?.id?.toString();
      const isOwner = canal.propietario?.toString() === userId;
      const isAdmin = req.usuario?.rol === 'admin';

      // Advertisers who have an active campaign with this channel can also
      // read benchmarks — so they can use them while drafting/negotiating.
      let isCampaignParty = false;
      if (!isOwner && !isAdmin) {
        const Campaign = require('../models/Campaign');
        const exists = await Campaign.exists({
          channel: canal._id,
          advertiser: userId,
          status: { $in: ['DRAFT', 'PAID', 'PUBLISHED'] },
        });
        isCampaignParty = !!exists;
      }

      if (!isOwner && !isAdmin && !isCampaignParty) {
        return res.status(403).json({ success: false, message: 'No autorizado' });
      }

      const force = req.query.refresh === 'true';
      const data = await copyBenchmarksService.getBenchmarks(req.params.id, { force });

      res.setHeader('Cache-Control', 'private, max-age=300'); // 5min client cache
      return res.json({ success: true, data });
    } catch (err) {
      console.error('copy-benchmarks endpoint error:', err?.message);
      return res.status(500).json({ success: false, message: 'Error interno' });
    }
  },
);

module.exports = router;
