const express = require('express');
const { body, param, query } = require('express-validator');
const { autenticarPartner, limitadorPartner, registrarActividadPartner } = require('../middleware/partnerAuth');
const { partnerRequestContext } = require('../middleware/partnerRequestContext');
const { partnerIdempotency } = require('../middleware/partnerIdempotency');
const { sendSuccess, sendError } = require('../lib/partnerApiHttp');
const { validarCampos } = require('../middleware/validarCampos');
const service = require('../services/partnerIntegrationService');

const router = express.Router();

// ── Middleware chain ───────────────────────────────────────────────────────────
router.use(partnerRequestContext);
router.use(autenticarPartner);
router.use(limitadorPartner);
router.use(partnerIdempotency);
router.use(registrarActividadPartner);

// ── Health ─────────────────────────────────────────────────────────────────────
router.get('/health', (req, res) => sendSuccess(res, {
  partner: req.partner.name,
  status: 'ok',
  auth: 'api-key'
}));

// ── Channels ───────────────────────────────────────────────────────────────────

// GET /api/partners/channels — list real channels from DB
router.get(
  '/channels',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('platform').optional().isString().trim(),
    query('category').optional().isString().trim(),
    query('search').optional().isString().trim()
  ],
  validarCampos,
  async (req, res, next) => {
    try {
      const result = await service.listChannels({
        plataforma: req.query.platform,
        categoria: req.query.category,
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search
      });
      return sendSuccess(res, result.items, {
        meta: {
          pagination: result.pagination,
          usagePolicy: { maxPageSize: 50, directChannelContactAllowed: false }
        }
      });
    } catch (error) { next(error); }
  }
);

// GET /api/partners/channels/:id — single channel detail
router.get(
  '/channels/:id',
  [param('id').isString().notEmpty()],
  validarCampos,
  async (req, res, next) => {
    try {
      const channel = await service.getChannel(req.params.id);
      if (!channel) return sendError(res, { status: 404, code: 'CHANNEL_NOT_FOUND', message: 'Canal no encontrado' });
      return sendSuccess(res, channel);
    } catch (error) { next(error); }
  }
);

// ── Campaigns ──────────────────────────────────────────────────────────────────

// POST /api/partners/campaigns — create campaign on a real channel
router.post(
  '/campaigns',
  [
    body('channelId').isString().trim().notEmpty().withMessage('channelId requerido'),
    body('content').optional().isString().trim(),
    body('title').optional().isString().trim(),
    body('targetUrl').isString().trim().notEmpty().withMessage('targetUrl requerido'),
    body('budget').isFloat({ gt: 0 }).toFloat().withMessage('budget invalido'),
    body('deadline').optional().isISO8601().withMessage('deadline debe ser ISO8601'),
    body('externalReference').optional().isString().trim()
  ],
  validarCampos,
  async (req, res, next) => {
    try {
      const campaign = await service.createCampaign(req.partner, req.body);
      return sendSuccess(res, campaign, {
        status: 201,
        meta: { nextRequiredStep: 'confirm_payment' }
      });
    } catch (error) { next(error); }
  }
);

// GET /api/partners/campaigns — list partner's campaigns
router.get(
  '/campaigns',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('status').optional().isString().trim()
  ],
  validarCampos,
  async (req, res, next) => {
    try {
      const result = await service.getPartnerCampaigns(req.partner._id, {
        page: req.query.page,
        limit: req.query.limit,
        status: req.query.status
      });
      return sendSuccess(res, result.items, { meta: { pagination: result.pagination } });
    } catch (error) { next(error); }
  }
);

// GET /api/partners/campaigns/:id — single campaign detail
router.get(
  '/campaigns/:id',
  [param('id').isString().notEmpty()],
  validarCampos,
  async (req, res, next) => {
    try {
      const campaign = await service.getPartnerCampaign(req.partner._id, req.params.id);
      if (!campaign) return sendError(res, { status: 404, code: 'CAMPAIGN_NOT_FOUND', message: 'Campana no encontrada' });
      return sendSuccess(res, campaign);
    } catch (error) { next(error); }
  }
);

// POST /api/partners/campaigns/:id/payment-session — create Stripe escrow session
router.post(
  '/campaigns/:id/payment-session',
  [param('id').isString().notEmpty()],
  validarCampos,
  async (req, res, next) => {
    try {
      const session = await service.createPaymentSession(req.partner._id, req.params.id);
      return sendSuccess(res, session, {
        status: 201,
        meta: {
          nextRequiredStep: 'complete_payment_on_stripe_then_confirm',
          captureMethod: 'manual (escrow — funds held until campaign completion)'
        }
      });
    } catch (error) { next(error); }
  }
);

// POST /api/partners/campaigns/:id/confirm-payment — DRAFT → PAID
router.post(
  '/campaigns/:id/confirm-payment',
  [
    param('id').isString().notEmpty(),
    body('paymentReference').isString().trim().notEmpty().withMessage('paymentReference requerido')
  ],
  validarCampos,
  async (req, res, next) => {
    try {
      const campaign = await service.confirmPayment(req.partner._id, req.params.id, req.body);
      return sendSuccess(res, campaign, { meta: { nextRequiredStep: 'publish' } });
    } catch (error) { next(error); }
  }
);

// POST /api/partners/campaigns/:id/publish — PAID → PUBLISHED
router.post(
  '/campaigns/:id/publish',
  [
    param('id').isString().notEmpty(),
    body('publishedAt').optional().isISO8601().withMessage('publishedAt debe ser ISO8601')
  ],
  validarCampos,
  async (req, res, next) => {
    try {
      const campaign = await service.publishCampaign(req.partner._id, req.params.id, req.body || {});
      return sendSuccess(res, campaign, { meta: { nextRequiredStep: 'complete' } });
    } catch (error) { next(error); }
  }
);

// POST /api/partners/campaigns/:id/complete — PUBLISHED → COMPLETED (releases escrow)
router.post(
  '/campaigns/:id/complete',
  [param('id').isString().notEmpty()],
  validarCampos,
  async (req, res, next) => {
    try {
      const campaign = await service.completeCampaign(req.partner._id, req.params.id);
      return sendSuccess(res, campaign);
    } catch (error) { next(error); }
  }
);

// POST /api/partners/campaigns/:id/cancel — cancel campaign
router.post(
  '/campaigns/:id/cancel',
  [param('id').isString().notEmpty()],
  validarCampos,
  async (req, res, next) => {
    try {
      const campaign = await service.cancelCampaign(req.partner._id, req.params.id, req.body || {});
      return sendSuccess(res, campaign);
    } catch (error) { next(error); }
  }
);

// GET /api/partners/campaigns/:id/metrics — real click tracking data
router.get(
  '/campaigns/:id/metrics',
  [param('id').isString().notEmpty()],
  validarCampos,
  async (req, res, next) => {
    try {
      const metrics = await service.getCampaignMetrics(req.partner._id, req.params.id);
      return sendSuccess(res, metrics);
    } catch (error) { next(error); }
  }
);

// ── Error handler ──────────────────────────────────────────────────────────────
router.use((error, req, res, next) => sendError(res, error));

module.exports = router;
