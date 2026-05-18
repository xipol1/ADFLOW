/**
 * SPEC-B1: endpoints RGPD para el usuario actuante.
 *
 * Mount: /api/rgpd (en app.js)
 *
 * Auth: todas requieren `autenticar` + `verificarCuentaActiva` EXCEPTO:
 *   - POST /deletion/confirm        — público pero requiere sesión activa para validar
 *   - GET  /export/download/:id     — público con JWT firmado (funciona desde otro dispositivo)
 *
 * Implementación de los handlers: ver controllers/rgpdController.js.
 * Contract completo: specs/001-rgpd-delete-export/contracts/rgpd-user-api.md
 */

const express = require('express');
const { autenticar, verificarCuentaActiva } = require('../middleware/auth');
const rgpdController = require('../controllers/rgpdController');

const router = express.Router();

// ─── Deletion flow ──────────────────────────────────────────────────────
router.post('/deletion', autenticar, verificarCuentaActiva, rgpdController.requestDeletion);
router.post('/deletion/confirm', autenticar, rgpdController.confirmDeletion);
router.delete('/deletion', autenticar, verificarCuentaActiva, rgpdController.cancelDeletion);
router.get('/deletion/status', autenticar, verificarCuentaActiva, rgpdController.getDeletionStatus);

// ─── Export flow ────────────────────────────────────────────────────────
router.post('/export', autenticar, verificarCuentaActiva, rgpdController.requestExport);
router.get('/export/status', autenticar, verificarCuentaActiva, rgpdController.getExportStatus);

// Público (sin sesión activa): JWT firmado en query string + DB validation.
router.get('/export/download/:requestId', rgpdController.downloadExport);

// ─── Rights catalogue ───────────────────────────────────────────────────
// Sirve la lista de los 6 derechos RGPD para renderizar PrivacySection (US3).
// Accesible sin auth — la información de derechos es pública.
router.get('/rights', rgpdController.getRights);

module.exports = router;
