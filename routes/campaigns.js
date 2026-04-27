const express = require('express');
const { body, param } = require('express-validator');
const { autenticar, requiereEmailVerificado } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const campaignController = require('../controllers/campaignController');

const router = express.Router();

const allowedStatus = ['DRAFT', 'PAID', 'PUBLISHED', 'COMPLETED', 'CANCELLED'];

router.get('/', autenticar, campaignController.getCampaigns);

router.get(
  '/:id',
  autenticar,
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  campaignController.getCampaignById
);

// Auto-buy: batch-create campaigns across channels
router.post(
  '/launch-auto',
  autenticar,
  requiereEmailVerificado,
  [
    body('budget').isFloat({ min: 50 }).withMessage('Presupuesto mínimo: €50'),
    body('content').isString().notEmpty().trim().isLength({ max: 5000 }).withMessage('Contenido requerido (max 5000 caracteres)'),
    body('targetUrl').isString().notEmpty().trim().isURL().withMessage('URL de destino inválida'),
    body('mode').optional().isIn(['auto', 'fav', 'manual']).withMessage('Modo inválido'),
  ],
  validarCampos,
  campaignController.launchAutoCampaign
);

router.post(
  '/',
  autenticar,
  requiereEmailVerificado,
  [
    body('channel').isMongoId().withMessage('channel inválido'),
    body('content').isString().notEmpty().trim().isLength({ max: 5000 }).withMessage('Contenido demasiado largo (max 5000 caracteres)'),
    body('targetUrl').isString().notEmpty().trim().isURL().withMessage('URL de destino inválida'),
  ],
  validarCampos,
  campaignController.createCampaign
);

router.patch(
  '/:id/status',
  autenticar,
  [
    param('id').isMongoId().withMessage('ID inválido'),
    body('status').isIn(allowedStatus).withMessage('status inválido')
  ],
  validarCampos,
  campaignController.updateCampaignStatus
);

// Action-based state transitions
router.post(
  '/:id/pay',
  autenticar,
  requiereEmailVerificado,
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  campaignController.payCampaign
);

router.post(
  '/:id/confirm',
  autenticar,
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  campaignController.confirmCampaign
);

router.post(
  '/:id/complete',
  autenticar,
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  campaignController.completeCampaign
);

router.post(
  '/:id/cancel',
  autenticar,
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  campaignController.cancelCampaign
);

// ── Chat / messages ──
router.get(
  '/:id/messages',
  autenticar,
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  campaignController.getCampaignMessages
);

// Per-(user, campaign) rate limits. Backed by the mongo-store helper so the
// counters survive Vercel cold starts and are shared across instances —
// the previous in-memory Map reset on every deploy and didn't span workers.
const { limitarIntentos } = require('../middleware/rateLimiter');
const _msgKey = (req) => `chat:${req.usuario?.id || req.ip}:${req.params.id}`;
const limitarChatBurst = limitarIntentos({
  windowMs: 3 * 1000,
  max: 1,
  keyGenerator: _msgKey,
  message: { success: false, message: 'Espera unos segundos antes de enviar otro mensaje' },
});
const limitarChatHora = limitarIntentos({
  windowMs: 60 * 60 * 1000,
  max: 60,
  keyGenerator: _msgKey,
  message: { success: false, message: 'Has alcanzado el limite de mensajes por hora' },
});

router.post(
  '/:id/messages',
  autenticar,
  limitarChatBurst,
  limitarChatHora,
  [
    param('id').isMongoId().withMessage('ID inválido'),
    body('text').isString().notEmpty().trim().isLength({ max: 2000 }).withMessage('Mensaje demasiado largo (max 2000 caracteres)')
  ],
  validarCampos,
  campaignController.sendCampaignMessage
);

module.exports = router;
