const express = require('express');
const { body } = require('express-validator');
const { autenticar, requiereEmailVerificado, requiereDatosFacturacion } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const payout = require('../controllers/payoutController');

const router = express.Router();

router.post('/onboard', autenticar, requiereEmailVerificado, requiereDatosFacturacion, payout.onboard);
router.get('/status', autenticar, payout.getStatus);
router.get('/dashboard-link', autenticar, payout.getDashboardLink);
router.post(
  '/withdraw',
  autenticar,
  requiereEmailVerificado,
  requiereDatosFacturacion,
  [body('amount').isFloat({ min: 10 }).withMessage('Monto minimo: 10 EUR')],
  validarCampos,
  payout.withdraw
);
router.get('/history', autenticar, payout.getHistory);

module.exports = router;
