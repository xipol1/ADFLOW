const mongoose = require('mongoose');

/**
 * RGPD audit log — append-only por convención de capa de aplicación.
 *
 * Registra todas las acciones RGPD: solicitudes de borrado y export,
 * confirmaciones, cancelaciones, anonimizaciones, accesos admin/DPO.
 *
 * Inmutabilidad: el servicio `rgpdAuditService` expone solo `log` y `find*`;
 * NO expone update ni delete. No reutilizar AuthAuditLog — los requisitos
 * legales son distintos (Art. 30 RGPD vs forensia de auth). Ver
 * `specs/001-rgpd-delete-export/data-model.md` E-3.
 *
 * Retención: permanente. No hay TTL — el log debe sobrevivir a la
 * anonimización del propio usuario para servir como prueba ante AEPD.
 */
const RGPDAuditLogSchema = new mongoose.Schema(
  {
    // ObjectId del usuario afectado por la acción.
    // NO se declara `ref: 'Usuario'` deliberadamente: el log debe seguir
    // siendo legible aunque el Usuario se anonimice; populate devolvería
    // el Usuario anonimizado, lo cual es correcto (la PII del original
    // ya no existe, pero la traza del evento se preserva).
    usuarioId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    action: {
      type: String,
      required: true,
      index: true,
      enum: [
        // Deletion flow
        'deletion.requested',
        'deletion.confirmed',
        'deletion.cancelled',
        'deletion.cancelled_by_admin',
        'deletion.grace_warning_sent',
        'deletion.liquidation_started',
        'deletion.liquidation_paused',
        'deletion.anonymized',
        'deletion.expired',
        'deletion.force_executed',
        // Export flow
        'export.requested',
        'export.processing_started',
        'export.ready',
        'export.downloaded',
        'export.expired',
        'export.failed',
        // Admin/DPO accesses
        'admin.audit_viewed',
        'admin.dossier_viewed',
      ],
    },

    timestamp: { type: Date, default: Date.now, index: true },

    // IP y user agent del actor en el momento del evento.
    // Para acciones del sistema (cron), ip y userAgent son null.
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },

    // Quién originó la acción.
    actor: {
      type: String,
      required: true,
      enum: ['system', 'user', 'admin', 'dpo'],
      index: true,
    },

    // Si actor ∈ {admin, dpo}, qué admin/DPO específico (para
    // trazabilidad de quién aprobó o rechazó manualmente).
    actorUserId: { type: mongoose.Schema.Types.ObjectId, default: null },

    // JSON específico por tipo de acción. Ejemplos:
    //   deletion.requested:    { motivo, requestId }
    //   deletion.anonymized:   { categoriesAnonymized: ['personal', 'oauth', ...], stepsCompleted }
    //   export.downloaded:     { requestId, packageSize }
    //   admin.audit_viewed:    { filter: { usuarioId, action, from, to } }
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: false, // tenemos `timestamp` propio; createdAt/updatedAt no aportan
    // Deshabilitar `versionKey` para reducir tamaño del doc y subrayar inmutabilidad
    // (no se versiona porque no se actualiza).
    versionKey: false,
  },
);

// Índice compuesto para query "todo lo de este usuario en orden cronológico".
RGPDAuditLogSchema.index({ usuarioId: 1, timestamp: -1 });

// Índice compuesto para reportes admin por tipo de acción y rango temporal.
RGPDAuditLogSchema.index({ action: 1, timestamp: -1 });

// Reutiliza el modelo si ya está registrado (pattern consistente con resto del repo).
module.exports =
  mongoose.models.RGPDAuditLog || mongoose.model('RGPDAuditLog', RGPDAuditLogSchema);
