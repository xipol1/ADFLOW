const express = require('express');
const { param, body } = require('express-validator');
const { autenticar } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const transaccionController = require('../controllers/transaccionController');

const router = express.Router();

// Stripe webhook — raw body required for signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), transaccionController.webhookPago);

// Create Stripe Checkout Session for wallet top-up
router.post(
  '/create-checkout-session',
  autenticar,
  [body('amount').isFloat({ min: 5 }).withMessage('Importe mínimo: 5')],
  validarCampos,
  transaccionController.crearCheckoutSession
);

// Create Stripe PaymentIntent for campaign escrow
router.post(
  '/create-payment-intent',
  autenticar,
  [body('transaccionId').isMongoId().withMessage('ID de transacción inválido')],
  validarCampos,
  transaccionController.crearPaymentIntent
);

// Creator withdrawal request
router.post(
  '/retiro',
  autenticar,
  [
    body('amount').isFloat({ min: 10 }).withMessage('Importe mínimo de retiro: 10'),
    body('method').optional().isIn(['bank', 'paypal']).withMessage('Método inválido'),
  ],
  validarCampos,
  transaccionController.solicitarRetiro
);

// List creator's withdrawal history
router.get('/retiros', autenticar, transaccionController.obtenerMisRetiros);

// Manual transaction creation
router.post('/', autenticar, transaccionController.crearTransaccion);

// List user transactions
router.get('/', autenticar, transaccionController.obtenerMisTransacciones);

// Financial stats
router.get('/estadisticas', autenticar, transaccionController.obtenerEstadisticasFinancieras);

// Get single transaction
router.get(
  '/:id',
  autenticar,
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  transaccionController.obtenerTransaccion
);

// Simulate payment (when Stripe not configured)
router.post(
  '/:id/pay',
  autenticar,
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  transaccionController.procesarPago
);

module.exports = router;
