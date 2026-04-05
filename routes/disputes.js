const express = require('express');
const { param, body } = require('express-validator');
const { autenticar, requiereEmailVerificado } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const disputeController = require('../controllers/disputeController');

const router = express.Router();

router.get('/', autenticar, disputeController.getMyDisputes);

router.get(
  '/:id',
  autenticar,
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  disputeController.getDispute
);

router.post(
  '/',
  autenticar,
  requiereEmailVerificado,
  [
    body('campaignId').isMongoId().withMessage('campaignId inválido'),
    body('reason').isIn(['not_published', 'wrong_content', 'late_delivery', 'fraud', 'other']).withMessage('Razón inválida'),
    body('description').isString().notEmpty().trim().isLength({ max: 2000 })
  ],
  validarCampos,
  disputeController.createDispute
);

router.post(
  '/:id/message',
  autenticar,
  [
    param('id').isMongoId().withMessage('ID inválido'),
    body('text').isString().notEmpty().trim()
  ],
  validarCampos,
  disputeController.addMessage
);

router.post(
  '/:id/escalate',
  autenticar,
  [param('id').isMongoId().withMessage('ID invalido')],
  validarCampos,
  disputeController.escalateDispute
);

router.post(
  '/:id/resolve',
  autenticar,
  [
    param('id').isMongoId().withMessage('ID invalido'),
    body('resolution').isString().notEmpty().trim(),
    body('resolutionType').isIn(['favor_advertiser', 'favor_creator', 'partial', 'closed_no_action']).withMessage('resolutionType invalido'),
    body('refundPercent').optional().isFloat({ min: 0, max: 100 }),
    body('adminNotes').optional().isString().trim(),
  ],
  validarCampos,
  disputeController.resolveDispute
);

module.exports = router;
