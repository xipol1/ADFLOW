const express = require('express');
const { body, param, query } = require('express-validator');
const { autenticar } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const swapsController = require('../controllers/swapsController');

const router = express.Router();

// Note: the maintenance cron lives in routes/swapsCron.js mounted at
// /api/jobs/swaps-maintenance — keeping it in a dedicated file isolates
// the cron-secret middleware from authenticated user routes.

// GET /api/swaps/discover?canalId=xxx
router.get(
  '/discover',
  autenticar,
  [query('canalId').isMongoId().withMessage('canalId inválido')],
  validarCampos,
  swapsController.discoverPartners
);

// GET /api/swaps/mine?role=incoming|outgoing|active|completed|all
router.get(
  '/mine',
  autenticar,
  [query('role').optional().isIn(['incoming', 'outgoing', 'active', 'completed', 'all'])],
  validarCampos,
  swapsController.listMySwaps
);

// GET /api/swaps/:id
router.get(
  '/:id',
  autenticar,
  [param('id').isMongoId().withMessage('id inválido')],
  validarCampos,
  swapsController.getSwapById
);

// POST /api/swaps — propose a swap
router.post(
  '/',
  autenticar,
  [
    body('requesterChannel').isMongoId().withMessage('requesterChannel inválido'),
    body('recipientChannel').isMongoId().withMessage('recipientChannel inválido'),
    body('propuesta.mensaje').optional().isString().trim().isLength({ max: 1000 }),
    body('propuesta.fechaPublicacion').optional({ nullable: true }).isISO8601(),
    body('propuesta.formato').optional().isIn(['post_simple', 'post_anclado', 'historia', 'mencion_inline']),
    body('propuesta.duracionHoras').optional().isInt({ min: 1, max: 168 }),
  ],
  validarCampos,
  swapsController.createSwap
);

// POST /api/swaps/:id/accept
router.post(
  '/:id/accept',
  autenticar,
  [param('id').isMongoId()],
  validarCampos,
  swapsController.acceptSwap
);

// POST /api/swaps/:id/reject
router.post(
  '/:id/reject',
  autenticar,
  [
    param('id').isMongoId(),
    body('motivo').optional().isString().trim().isLength({ max: 500 }),
  ],
  validarCampos,
  swapsController.rejectSwap
);

// POST /api/swaps/:id/cancel
router.post(
  '/:id/cancel',
  autenticar,
  [
    param('id').isMongoId(),
    body('motivo').optional().isString().trim().isLength({ max: 500 }),
  ],
  validarCampos,
  swapsController.cancelSwap
);

// POST /api/swaps/:id/mark-published
router.post(
  '/:id/mark-published',
  autenticar,
  [
    param('id').isMongoId(),
    body('messageId').optional().isString().trim().isLength({ max: 200 }),
    body('texto').optional().isString().isLength({ max: 4000 }),
    body('mediaUrl').optional().isString().isLength({ max: 500 }),
  ],
  validarCampos,
  swapsController.markPublished
);

// POST /api/swaps/:id/rate
router.post(
  '/:id/rate',
  autenticar,
  [
    param('id').isMongoId(),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('rating debe ser entre 1 y 5'),
    body('comentario').optional().isString().trim().isLength({ max: 500 }),
  ],
  validarCampos,
  swapsController.rateSwap
);

module.exports = router;
