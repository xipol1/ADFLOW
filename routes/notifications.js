const express = require('express');
const { param } = require('express-validator');
const { autenticar } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const c = require('../controllers/notificationController');

const router = express.Router();
const id = [param('id').isMongoId().withMessage('ID inválido'), validarCampos];

router.use(autenticar);
router.get('/',             c.obtenerNotificaciones);
router.get('/no-leidas',    c.contarNoLeidas);
router.put('/leer-todas',   c.marcarTodasComoLeidas);
router.get('/:id',          id, c.obtenerNotificacion);
router.put('/:id/leer',     id, c.marcarComoLeida);
router.put('/:id/archivar', id, c.archivarNotificacion);
router.delete('/:id',       id, c.eliminarNotificacion);

module.exports = router;
