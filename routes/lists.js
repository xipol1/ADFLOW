const express = require('express');
const { query } = require('express-validator');
const { validarCampos } = require('../middleware/validarCampos');
const channelListController = require('../controllers/channelListController');

const router = express.Router();

router.get(
  '/channels',
  [
    query('pagina').optional().isInt({ min: 1 }).toInt(),
    query('limite').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('categoria').optional().isString().trim(),
    query('tematica').optional().isString().trim(),
    query('plataforma').optional().isString().trim(),
    query('minSeguidores').optional().isInt({ min: 0 }).toInt(),
    query('maxSeguidores').optional().isInt({ min: 0 }).toInt()
  ],
  validarCampos,
  channelListController.getChannels
);

module.exports = router;
