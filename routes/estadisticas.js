const express = require('express');
const { param } = require('express-validator');
const { autenticar } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const estadisticaController = require('../controllers/estadisticaController');

const router = express.Router();

// Dashboard stats (role-aware: creator/advertiser/admin)
router.get('/dashboard', autenticar, estadisticaController.getDashboardStats);

// General platform stats (public)
router.get('/generales', estadisticaController.getGeneralStats);

// Campaign-specific click stats
router.get(
  '/campaign/:id',
  autenticar,
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  estadisticaController.getCampaignStats
);

module.exports = router;
