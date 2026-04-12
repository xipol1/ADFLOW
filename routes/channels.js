const express = require('express');
const { query } = require('express-validator');
const { validarCampos } = require('../middleware/validarCampos');
const { limitadorAPI } = require('../middleware/rateLimiter');
const channelsController = require('../controllers/channelsController');

const router = express.Router();

router.get(
  '/',
  limitadorAPI,
  [
    query('pagina').optional().isInt({ min: 1 }).toInt(),
    query('limite').optional().isInt({ min: 1, max: 60 }).toInt(),
    query('plataforma').optional().isString().trim(),
    query('verificado').optional().isIn(['true', 'false'])
  ],
  validarCampos,
  channelsController.listChannels
);

// Rankings (public, cached) — must be before /:id to avoid matching
router.get('/rankings', limitadorAPI, channelsController.getRankings);

// Username lookup (public) — must be before /:id
router.get('/username/:username', limitadorAPI, channelsController.getChannelByUsername);

router.get('/:id', limitadorAPI, channelsController.getChannelById);

// Calendar / availability (public — no auth required for read)
router.get('/:id/availability', limitadorAPI, channelsController.getChannelAvailability);

// Score snapshots for charts (public, last 30 days)
router.get('/:id/snapshots', limitadorAPI, channelsController.getChannelSnapshots);

module.exports = router;
