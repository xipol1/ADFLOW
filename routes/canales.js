const express = require('express');
const { body, param } = require('express-validator');
const { autenticar, requiereEmailVerificado } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const canalController = require('../controllers/canalController');

const router = express.Router();

router.get('/', autenticar, canalController.obtenerMisCanales);

// ── Claim: my claimed channels (before /:id to avoid param matching) ──
const claimController = require('../controllers/claimController');
router.get('/claimed/mine', autenticar, claimController.myClaimedChannels);

router.get(
  '/:id',
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  canalController.obtenerCanal
);

router.post(
  '/',
  autenticar,
  requiereEmailVerificado,
  [
    body('plataforma').isString().notEmpty().trim().withMessage('plataforma requerida'),
    body('identificadorCanal').isString().notEmpty().trim().withMessage('identificadorCanal requerido'),
    body('nombreCanal').optional().isString().trim(),
    body('categoria').optional().isString().trim(),
    body('descripcion').optional().isString().trim()
  ],
  validarCampos,
  canalController.crearCanal
);

router.put(
  '/:id',
  autenticar,
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  canalController.actualizarCanal
);

router.delete(
  '/:id',
  autenticar,
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  canalController.eliminarCanal
);

// ── Availability (creator updates their publication calendar) ──
const channelsController = require('../controllers/channelsController');

router.put(
  '/:id/availability',
  autenticar,
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  channelsController.updateChannelAvailability
);

// ── Claim: init + verify ──
router.post(
  '/:id/claim/init',
  autenticar,
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  claimController.initClaim
);

router.post(
  '/:id/claim/verify',
  autenticar,
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  claimController.verifyClaim
);

router.get('/claimed/mine', autenticar, claimController.myClaimedChannels);

module.exports = router;
