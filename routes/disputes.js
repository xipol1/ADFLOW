const express = require('express');
const { param, body } = require('express-validator');
const { autenticar } = require('../middleware/auth');
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
  '/:id/resolve',
  autenticar,
  [
    param('id').isMongoId().withMessage('ID inválido'),
    body('resolution').isString().notEmpty().trim(),
    body('favoredParty').isIn(['advertiser', 'creator']).withMessage('favoredParty debe ser advertiser o creator')
  ],
  validarCampos,
  disputeController.resolveDispute
);

module.exports = router;
