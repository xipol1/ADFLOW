const express = require('express');
const { param, body } = require('express-validator');
const { autenticar } = require('../middleware/auth');
const { requiereSubscription } = require('../middleware/requiereSubscription');
const { validarCampos } = require('../middleware/validarCampos');
const autoBuyController = require('../controllers/autoBuyController');

const router = express.Router();

// AutoBuy = Advertiser Pro feature (bulkLauncher). Reads are open so the
// dashboard can still show empty state and existing rules to Free users.
router.get('/', autenticar, autoBuyController.getMyRules);

router.post(
  '/',
  autenticar,
  requiereSubscription({ feature: 'bulkLauncher' }),
  [
    body('name').isString().notEmpty().trim(),
    body('content').isString().notEmpty().trim(),
    body('targetUrl').isString().notEmpty().trim()
  ],
  validarCampos,
  autoBuyController.createRule
);

router.put(
  '/:id',
  autenticar,
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  autoBuyController.updateRule
);

router.delete(
  '/:id',
  autenticar,
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  autoBuyController.deleteRule
);

router.post(
  '/:id/trigger',
  autenticar,
  requiereSubscription({ feature: 'bulkLauncher' }),
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  autoBuyController.triggerRule
);

module.exports = router;
