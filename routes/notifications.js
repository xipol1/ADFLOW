const express = require('express');
const { param } = require('express-validator');
const { autenticar } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const c = require('../controllers/notificationController');
const pushController = require('../controllers/pushController');

const router = express.Router();
const id = [param('id').isMongoId().withMessage('ID inválido'), validarCampos];

// Push notification subscription routes (before auth-gated block for clarity)
router.post('/push-subscribe', autenticar, pushController.subscribePush);
router.post('/push-unsubscribe', autenticar, pushController.unsubscribePush);

router.use(autenticar);
router.get('/',             c.obtenerNotificaciones);
router.get('/no-leidas',    c.contarNoLeidas);
router.put('/leer-todas',   c.marcarTodasComoLeidas);
router.get('/:id',          id, c.obtenerNotificacion);
router.put('/:id/leer',     id, c.marcarComoLeida);
router.put('/:id/archivar', id, c.archivarNotificacion);
router.delete('/:id',       id, c.eliminarNotificacion);

module.exports = router;
