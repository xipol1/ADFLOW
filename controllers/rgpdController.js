/**
 * SPEC-B1: controller RGPD (delete + export + admin).
 *
 * Skeleton — los cuerpos de cada handler se implementan en US1 (T019–T022,
 * T036–T038, T043) y Polish (T049–T053). Por ahora, cada handler responde
 * 501 Not Implemented con código identificable para que tests de Phase 2
 * (Foundational) puedan asertar que las rutas existen y están bien
 * cableadas antes de empezar la fase de implementación de US.
 *
 * Convención: cada handler usa el patrón estándar del repo:
 *   - req.usuario.id     → usuario actuante (puesto por middleware autenticar)
 *   - res.status(...).json({ success, code?, message, ... })
 *   - try/catch envuelve cualquier IO con devolución 500 sobria
 *
 * Contracts:
 *   - User API:  specs/001-rgpd-delete-export/contracts/rgpd-user-api.md
 *   - Admin API: specs/001-rgpd-delete-export/contracts/rgpd-admin-api.md
 */

function notImplemented(handlerName) {
  return (req, res) => res.status(501).json({
    success: false,
    code: 'not_implemented',
    message: `${handlerName} aún no implementado. SPEC-B1 Phase 2 foundation completada; implementación en US1/US2/US3.`,
  });
}

// ─── User API (mounted under /api/rgpd) ─────────────────────────────────
exports.requestDeletion = notImplemented('rgpdController.requestDeletion');         // T019 US1
exports.confirmDeletion = notImplemented('rgpdController.confirmDeletion');         // T020 US1
exports.cancelDeletion = notImplemented('rgpdController.cancelDeletion');           // T021 US1
exports.getDeletionStatus = notImplemented('rgpdController.getDeletionStatus');     // T022 US1

exports.requestExport = notImplemented('rgpdController.requestExport');             // T036 US2
exports.getExportStatus = notImplemented('rgpdController.getExportStatus');         // T037 US2
exports.downloadExport = notImplemented('rgpdController.downloadExport');           // T038 US2

exports.getRights = notImplemented('rgpdController.getRights');                     // T043 US3

// ─── Admin API (mounted under /api/admin/rgpd) ──────────────────────────
exports.adminListRequests = notImplemented('rgpdController.adminListRequests');               // T049 Polish
exports.adminForceExecuteDeletion = notImplemented('rgpdController.adminForceExecuteDeletion'); // T050 Polish
exports.adminCancelDeletion = notImplemented('rgpdController.adminCancelDeletion');           // T051 Polish
exports.adminAuditLog = notImplemented('rgpdController.adminAuditLog');                       // T052 Polish
exports.adminUserDossier = notImplemented('rgpdController.adminUserDossier');                 // T053 Polish
