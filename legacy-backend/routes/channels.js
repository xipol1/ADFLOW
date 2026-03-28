const express = require('express');
const { query } = require('express-validator');
const router = express.Router();

const channelsController = require('../controllers/channelsController');
const { validarCampos } = require('../middleware/validarCampos');
const { limitadorAPI } = require('../middleware/rateLimiter');

/**
 * @swagger
 * /channels:
 *   get:
 *     summary: Lista canales disponibles
 *     tags: [Channels]
 *     responses:
 *       200:
 *         description: Lista de canales
 */
router.get(
  '/',
  limitadorAPI,
  [
    query('pagina').optional().isInt({ min: 1 }).toInt(),
    query('limite').optional().isInt({ min: 1, max: 60 }).toInt(),
    query('verificado').optional().isIn(['true', 'false']),
  ],
  validarCampos,
  channelsController.listChannels
);

/**
 * @swagger
 * /channels/{id}:
 *   get:
 *     summary: Obtiene un canal por ID
 *     tags: [Channels]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Datos del canal
 */
router.get('/:id', channelsController.getChannelById);

module.exports = router;

