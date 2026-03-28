const express = require('express');
const { body, param, query } = require('express-validator');
const { autenticarPartner, limitadorPartner, registrarActividadPartner } = require('../middleware/partnerAuth');
const { partnerRequestContext } = require('../middleware/partnerRequestContext');
const { partnerIdempotency } = require('../middleware/partnerIdempotency');
const { createApiError, sendSuccess, sendError } = require('../lib/partnerApiHttp');
const { validarCampos } = require('../middleware/validarCampos');
const partnerIntegrationService = require('../services/partnerIntegrationService');

const router = express.Router();

router.use(partnerRequestContext);
router.use(autenticarPartner);
router.use(limitadorPartner);
router.use(partnerIdempotency);
router.use(registrarActividadPartner);

router.get('/health', (req, res) => sendSuccess(res, {
  partner: req.partner.name,
  status: 'ok',
  auth: 'api-key'
}));

router.get(
  '/inventory',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1 }).toInt(),
    query('plataforma').optional().isString().trim(),
    query('categoria').optional().isString().trim()
  ],
  validarCampos,
  (req, res) => {
    const result = partnerIntegrationService.listInventory({
      plataforma: req.query.plataforma ? String(req.query.plataforma).toLowerCase() : '',
      categoria: req.query.categoria ? String(req.query.categoria).toLowerCase() : '',
      page: req.query.page,
      limit: req.query.limit
    });

    return sendSuccess(res, result.items, {
      meta: {
        pagination: result.pagination,
        usagePolicy: {
          maxPageSize: 20,
          exportAllowed: false,
          directChannelContactAllowed: false
        }
      }
    });
  }
);

router.get('/campaigns', (req, res) => sendSuccess(res, partnerIntegrationService.getCampaignsForPartner(req.partner.id)));

router.get(
  '/campaigns/:id',
  [param('id').isString().notEmpty().withMessage('ID invalido')],
  validarCampos,
  (req, res) => {
    const item = partnerIntegrationService.getCampaignForPartner(req.partner.id, req.params.id);
    if (!item) throw createApiError(404, 'CAMPAIGN_NOT_FOUND', 'Campana no encontrada');
    return sendSuccess(res, item);
  }
);

router.post(
  '/campaigns',
  [
    body('title').isString().trim().notEmpty().withMessage('title requerido'),
    body('description').optional().isString().trim(),
    body('targetUrl').isString().trim().notEmpty().withMessage('targetUrl requerido'),
    body('channelId').isString().trim().notEmpty().withMessage('channelId requerido'),
    body('budget').isFloat({ gt: 0 }).toFloat().withMessage('budget invalido'),
    body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('currency invalida'),
    body('externalReference').optional().isString().trim()
  ],
  validarCampos,
  (req, res, next) => {
    try {
      return sendSuccess(res, partnerIntegrationService.createCampaignForPartner(req.partner, req.body || {}), {
        status: 201,
        meta: { nextRequiredStep: 'create_payment_session' }
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  '/campaigns/:id/payment-session',
  [
    param('id').isString().notEmpty().withMessage('ID invalido'),
    body('provider').optional().isIn(['stripe']).withMessage('provider no soportado')
  ],
  validarCampos,
  (req, res, next) => {
    try {
      return sendSuccess(res, partnerIntegrationService.createPaymentSession(req.partner.id, req.params.id, req.body?.provider), {
        status: 201,
        meta: { nextRequiredStep: 'confirm_payment' }
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  '/campaigns/:id/confirm-payment',
  [
    param('id').isString().notEmpty().withMessage('ID invalido'),
    body('paymentReference').isString().trim().notEmpty().withMessage('paymentReference requerido')
  ],
  validarCampos,
  (req, res, next) => {
    try {
      return sendSuccess(res, partnerIntegrationService.confirmPayment(req.partner.id, req.params.id, req.body || {}), {
        meta: { nextRequiredStep: 'register_publication' }
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  '/campaigns/:id/register-publication',
  [
    param('id').isString().notEmpty().withMessage('ID invalido'),
    body('publicationId').isString().trim().notEmpty().withMessage('publicationId requerido'),
    body('publishedAt').isISO8601().withMessage('publishedAt debe ser ISO8601'),
    body('evidenceUrl').optional().isString().trim()
  ],
  validarCampos,
  (req, res, next) => {
    try {
      return sendSuccess(res, partnerIntegrationService.registerPublication(req.partner.id, req.params.id, req.body || {}), {
        meta: { nextRequiredStep: 'confirm_execution' }
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  '/campaigns/:id/confirm-execution',
  [
    param('id').isString().notEmpty().withMessage('ID invalido'),
    body('confirmedAt').optional().isISO8601().withMessage('confirmedAt debe ser ISO8601'),
    body('notes').optional().isString().trim()
  ],
  validarCampos,
  (req, res, next) => {
    try {
      return sendSuccess(res, partnerIntegrationService.confirmExecution(req.partner.id, req.params.id, req.body || {}), {
        meta: { nextRequiredStep: 'release_funds' }
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  '/campaigns/:id/release-funds',
  [param('id').isString().notEmpty().withMessage('ID invalido')],
  validarCampos,
  (req, res, next) => {
    try {
      return sendSuccess(res, partnerIntegrationService.releaseFunds(req.partner.id, req.params.id));
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  '/campaigns/:id/metrics',
  [param('id').isString().notEmpty().withMessage('ID invalido')],
  validarCampos,
  (req, res, next) => {
    try {
      return sendSuccess(res, partnerIntegrationService.getCampaignMetrics(req.partner.id, req.params.id));
    } catch (error) {
      return next(error);
    }
  }
);

router.use((error, req, res, next) => sendError(res, error));

module.exports = router;
