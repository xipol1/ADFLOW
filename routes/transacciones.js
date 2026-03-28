const express = require('express');
const { param } = require('express-validator');
const { autenticar } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const transaccionController = require('../controllers/transaccionController');

const router = express.Router();

router.post('/', autenticar, transaccionController.crearTransaccion);
router.post('/webhook', transaccionController.webhookPago);

router.get('/', autenticar, transaccionController.obtenerMisTransacciones);

router.get('/estadisticas', autenticar, transaccionController.obtenerEstadisticasFinancieras);

router.get(
  '/:id',
  autenticar,
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  transaccionController.obtenerTransaccion
);

// POST /api/transacciones/:id/pay — simulated payment
router.post(
  '/:id/pay',
  autenticar,
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  transaccionController.procesarPago
);

module.exports = router;
