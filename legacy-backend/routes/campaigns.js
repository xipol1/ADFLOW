const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { autenticar, autorizarRoles } = require('../middleware/auth');

/**
 * @route   POST /api/campaigns/optimize
 * @desc    Automatically optimize campaign allocation across channels
 * @access  Private (Advertiser only)
 */
router.post('/optimize',
  autenticar,
  autorizarRoles('advertiser'),
  campaignController.optimize
);

/**
 * @route   POST /api/campaigns/launch-auto
 * @desc    Automatically optimize and launch a campaign across channels
 * @access  Private (Advertiser only)
 */
router.post('/launch-auto',
  autenticar,
  autorizarRoles('advertiser'),
  campaignController.launchAutoCampaign
);

/**
 * @swagger
 * /campaigns:
 *   get:
 *     summary: Obtiene campañas del usuario actual
 *     tags: [Campaigns]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de campañas
 */
router.get('/',
  autenticar,
  campaignController.getCampaigns
);

/**
 * @swagger
 * /campaigns:
 *   post:
 *     summary: Crea una nueva campaña
 *     tags: [Campaigns]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               canalId:
 *                 type: string
 *               tipoAnuncio:
 *                 type: string
 *               presupuesto:
 *                 type: number
 *     responses:
 *       201:
 *         description: Campaña creada
 */
router.post('/',
  autenticar,
  campaignController.createCampaign
);

module.exports = router;
