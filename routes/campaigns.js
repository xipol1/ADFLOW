const express = require('express');
const { body, param } = require('express-validator');
const { autenticar } = require('../middleware/auth');
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

router.post(
  '/',
  autenticar,
  [
    body('channel').isMongoId().withMessage('channel inválido'),
    body('content').isString().notEmpty().trim(),
    body('targetUrl').isString().notEmpty().trim(),
    body('price').isFloat({ min: 0 }).toFloat()
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

router.post(
  '/:id/messages',
  autenticar,
  [
    param('id').isMongoId().withMessage('ID inválido'),
    body('text').isString().notEmpty().trim().withMessage('text requerido')
  ],
  validarCampos,
  campaignController.sendCampaignMessage
);

module.exports = router;
