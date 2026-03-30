const express = require('express');
const { param, body } = require('express-validator');
const { autenticar } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const reviewController = require('../controllers/reviewController');

const router = express.Router();

// POST /api/reviews — create a review
router.post(
  '/',
  autenticar,
  [
    body('campaign').isMongoId().withMessage('campaign inválido'),
    body('channel').isMongoId().withMessage('channel inválido'),
    body('ratings.overall').isInt({ min: 1, max: 5 }).withMessage('ratings.overall debe ser entre 1 y 5'),
    body('ratings.communication').optional({ nullable: true }).isInt({ min: 1, max: 5 }),
    body('ratings.quality').optional({ nullable: true }).isInt({ min: 1, max: 5 }),
    body('ratings.timeliness').optional({ nullable: true }).isInt({ min: 1, max: 5 }),
    body('ratings.value').optional({ nullable: true }).isInt({ min: 1, max: 5 }),
    body('title').optional().isString().trim().isLength({ max: 120 }),
    body('comment').optional().isString().trim().isLength({ max: 2000 }),
  ],
  validarCampos,
  reviewController.createReview
);

// GET /api/reviews/channel/:channelId — public, paginated
router.get(
  '/channel/:channelId',
  [param('channelId').isMongoId().withMessage('channelId inválido')],
  validarCampos,
  reviewController.getChannelReviews
);

// GET /api/reviews/my — authenticated user's reviews
router.get('/my', autenticar, reviewController.getMyReviews);

// GET /api/reviews/:id — public
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  reviewController.getReviewById
);

// PUT /api/reviews/:id/respond — channel owner responds
router.put(
  '/:id/respond',
  autenticar,
  [
    param('id').isMongoId().withMessage('ID inválido'),
    body('text').isString().notEmpty().trim().isLength({ max: 1000 }),
  ],
  validarCampos,
  reviewController.respondToReview
);

// PUT /api/reviews/:id/helpful — mark as helpful
router.put(
  '/:id/helpful',
  autenticar,
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  reviewController.markHelpful
);

// PUT /api/reviews/:id/report — report a review
router.put(
  '/:id/report',
  autenticar,
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  reviewController.reportReview
);

// DELETE /api/reviews/:id — delete (author or admin)
router.delete(
  '/:id',
  autenticar,
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  reviewController.deleteReview
);

module.exports = router;
