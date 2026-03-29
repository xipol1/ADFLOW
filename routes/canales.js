const express = require('express');
const { body, param } = require('express-validator');
const { autenticar } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const canalController = require('../controllers/canalController');

const router = express.Router();

router.get('/', autenticar, canalController.obtenerMisCanales);

router.get(
  '/:id',
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  canalController.obtenerCanal
);

router.post(
  '/',
  autenticar,
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

module.exports = router;
