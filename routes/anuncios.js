const express = require('express');
const { param } = require('express-validator');
const { autenticar } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const c = require('../controllers/anuncioController');

const router = express.Router();
const id = [param('id').isMongoId().withMessage('ID inválido'), validarCampos];

router.use(autenticar);
router.get('/',            c.obtenerMisAnuncios);
router.get('/estadisticas',c.obtenerEstadisticas);
router.get('/buscar',      c.buscarAnuncios);
router.get('/creador',     c.obtenerAnunciosParaCreador);
router.post('/',           c.crearAnuncio);
router.get('/:id',         id, c.obtenerAnuncio);
router.put('/:id',         id, c.actualizarAnuncio);
router.delete('/:id',      id, c.eliminarAnuncio);
router.post('/:id/aprobacion', id, c.enviarParaAprobacion);
router.put('/:id/responder',   id, c.responderAprobacion);
router.post('/:id/activar',    id, c.activarAnuncio);
router.post('/:id/completar',  id, c.completarAnuncio);
router.post('/:id/click',      id, c.trackClick);
router.post('/:id/conversion', id, c.trackConversion);

module.exports = router;
