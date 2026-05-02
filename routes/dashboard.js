const express = require('express');
const { autenticar } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

/**
 * @route   GET /api/dashboard/views
 * @desc    Obtiene todas las vistas del dashboard del usuario actual
 * @access  Privado
 */
router.get('/views', autenticar, dashboardController.getViews);

/**
 * @route   PUT /api/dashboard/views
 * @desc    Reemplaza todas las vistas del usuario (bulk save)
 * @access  Privado
 * @body    { views: [{ id, name, items, isDefault }], activeViewId }
 */
router.put('/views', autenticar, dashboardController.saveViews);

/**
 * @route   PATCH /api/dashboard/views/:viewId
 * @desc    Actualiza una vista individual (auto-save de items o renombrado)
 * @access  Privado
 * @body    { items?, name?, isDefault? }
 */
router.patch('/views/:viewId', autenticar, dashboardController.updateView);

/**
 * @route   PUT /api/dashboard/active-view
 * @desc    Cambia la vista activa del usuario
 * @access  Privado
 * @body    { viewId }
 */
router.put('/active-view', autenticar, dashboardController.setActiveView);

/**
 * @route   GET /api/dashboard/attribution
 * @desc    Devuelve el modelo de atribución actual del usuario
 * @access  Privado
 */
router.get('/attribution', autenticar, dashboardController.getAttributionSettings);

/**
 * @route   PUT /api/dashboard/attribution
 * @desc    Cambia el modelo de atribución multi-touch
 * @access  Privado
 * @body    { model: 'last_touch' | 'linear' | 'time_decay', lookbackDays: 1-90 }
 */
router.put('/attribution', autenticar, dashboardController.setAttributionSettings);

module.exports = router;
