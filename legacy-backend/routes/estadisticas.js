const express = require('express');
const router = express.Router();
const estadisticaController = require('../controllers/estadisticaController');
const { autenticar } = require('../middleware/auth');

// Middleware para verificar autenticación en todas las rutas
router.use(autenticar);

// Rutas para estadísticas generales
router.get('/generales', estadisticaController.getEstadisticasGenerales);

// Rutas para dashboard
router.get('/dashboard', estadisticaController.getDashboardStats);

// Rutas para estadísticas de canales
router.route('/canales/:id')
  .get(estadisticaController.getEstadisticasCanal)
  .post(estadisticaController.registrarEstadisticasCanal);

// Rutas para estadísticas de anuncios
router.route('/anuncios/:id')
  .get(estadisticaController.getEstadisticasAnuncio)
  .post(estadisticaController.registrarEstadisticasAnuncio);

module.exports = router;
