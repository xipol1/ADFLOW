const express = require('express');
const { param } = require('express-validator');
const { autenticar, requiereEmailVerificado } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const c = require('../controllers/anuncioController');

const router = express.Router();
const id = [param('id').isMongoId().withMessage('ID inválido'), validarCampos];

router.use(autenticar);
// Read operations — no email verification required
router.get('/',            c.obtenerMisAnuncios);
router.get('/estadisticas',c.obtenerEstadisticas);
router.get('/buscar',      c.buscarAnuncios);
router.get('/creador',     c.obtenerAnunciosParaCreador);
router.get('/:id',         id, c.obtenerAnuncio);
// Write operations — require verified email
router.post('/',           requiereEmailVerificado, c.crearAnuncio);
router.put('/:id',         id, requiereEmailVerificado, c.actualizarAnuncio);
router.delete('/:id',      id, requiereEmailVerificado, c.eliminarAnuncio);
router.post('/:id/aprobacion', id, requiereEmailVerificado, c.enviarParaAprobacion);
router.put('/:id/responder',   id, requiereEmailVerificado, c.responderAprobacion);
router.post('/:id/activar',    id, requiereEmailVerificado, c.activarAnuncio);
router.post('/:id/completar',  id, requiereEmailVerificado, c.completarAnuncio);
router.post('/:id/click',      id, c.trackClick);
router.post('/:id/conversion', id, c.trackConversion);

module.exports = router;
