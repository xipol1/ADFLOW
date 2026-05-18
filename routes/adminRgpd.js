/**
 * SPEC-B1: endpoints RGPD para admin / DPO.
 *
 * Mount: /api/admin/rgpd (en app.js)
 *
 * Auth: todas requieren `autenticar` + `autorizarRoles('admin')`.
 *
 * Nota: en MVP, el rol DPO se sirve con 'admin' (no hay rol dedicado en
 * Usuario.rol enum). Si en el futuro se añade rol 'dpo', ampliar el
 * autorizarRoles a `('admin', 'dpo')`.
 *
 * Implementación de los handlers: ver controllers/rgpdController.js.
 * Contract completo: specs/001-rgpd-delete-export/contracts/rgpd-admin-api.md
 */

const express = require('express');
const { autenticar, autorizarRoles } = require('../middleware/auth');
const rgpdController = require('../controllers/rgpdController');

const router = express.Router();

// Guard global para todo el router admin.
router.use(autenticar, autorizarRoles('admin'));

router.get('/requests', rgpdController.adminListRequests);
router.post('/requests/:id/force-execute', rgpdController.adminForceExecuteDeletion);
router.post('/requests/:id/cancel', rgpdController.adminCancelDeletion);
router.get('/audit-log', rgpdController.adminAuditLog);
router.get('/users/:id/dossier', rgpdController.adminUserDossier);

module.exports = router;
