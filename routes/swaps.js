const express = require('express');
const { body, param, query } = require('express-validator');
const { autenticar } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const swapsController = require('../controllers/swapsController');
// Lazy-loaded so the cron job dependency tree isn't pulled into every
// authenticated swap request.
const loadMaintenanceJob = () => require('../jobs/swapsMaintenanceJob');

const router = express.Router();

// ── Cron: maintenance (expiration + closing). Mounted under /api/swaps so
// it shares the route file but uses its own auth (CRON_SECRET, not JWT).
function requireCronSecret(req, res, next) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ success: false, message: 'CRON_SECRET not configured' });
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  return next();
}

async function handleMaintenance(req, res) {
  try {
    const { runSwapsMaintenanceJob } = loadMaintenanceJob();
    const result = await runSwapsMaintenanceJob();
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('Swaps maintenance cron error:', err?.message);
    return res.status(500).json({
      success: false,
      message: 'Swaps maintenance failed',
      error: err?.message,
    });
  }
}

// Mounted both at /api/swaps/maintenance AND /api/jobs/swaps-maintenance
// (see app.js). GET for Vercel Cron, POST for manual trigger.
router.get('/maintenance', requireCronSecret, handleMaintenance);
router.post('/maintenance', requireCronSecret, handleMaintenance);

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
