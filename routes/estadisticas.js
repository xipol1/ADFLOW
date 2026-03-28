const express = require('express');
const { param } = require('express-validator');
const { autenticar } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const estadisticaController = require('../controllers/estadisticaController');

const router = express.Router();

router.get(
  '/campaign/:id',
  autenticar,
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  estadisticaController.getCampaignStats
);

module.exports = router;
