const express = require('express');
const { param } = require('express-validator');
const { autenticar } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const scoringController = require('../controllers/scoringController');

const router = express.Router();

const idValidation = [param('channelId').isMongoId().withMessage('ID invalido')];

// Public — get channel score + recommended price
router.get('/:channelId', idValidation, validarCampos, scoringController.getChannelScore);

// Public — get price history
router.get('/:channelId/history', idValidation, validarCampos, scoringController.getScoreHistory);

// Auth — recalculate score (fetches live platform data)
router.post('/:channelId/calculate', autenticar, idValidation, validarCampos, scoringController.recalculateScore);

// Auth — connect platform credentials & fetch initial data
router.post('/:channelId/connect', autenticar, idValidation, validarCampos, scoringController.connectPlatform);

// Auth — manually update performance metrics
router.post('/:channelId/metrics', autenticar, idValidation, validarCampos, scoringController.updateMetrics);

module.exports = router;
