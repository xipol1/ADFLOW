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

module.exports = router;
