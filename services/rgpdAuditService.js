/**
 * RGPD audit service.
 *
 * Interfaz mínima sobre el modelo `RGPDAuditLog`. Por diseño NO expone
 * funciones de update ni delete — la inmutabilidad del log se garantiza
 * a nivel de capa de aplicación (Mongo no la enforza nativamente sin
 * change-streams + Atlas trigger, que es sobre-ingeniería para nuestro
 * tamaño actual).
 *
 * **Regla de PR**: ningún módulo de la app debe importar el modelo
 * `RGPDAuditLog` directamente y llamar a `.updateOne` / `.deleteOne` /
 * `.findOneAndUpdate` / etc. Toda escritura pasa por `log()`.
 *
 * Ver `specs/001-rgpd-delete-export/data-model.md` E-3 y research.md R-2.
 */

const RGPDAuditLog = require('../models/RGPDAuditLog');

/**
 * Registra una acción RGPD en el log inmutable.
 *
 * @param {string} action      Una de las acciones del enum de RGPDAuditLogSchema.
 * @param {object} opts
 * @param {string|ObjectId} opts.usuarioId  Usuario afectado por la acción.
 * @param {string} [opts.actor='system']    'system' | 'user' | 'admin' | 'dpo'.
 * @param {string|ObjectId} [opts.actorUserId]  Si actor != 'system', id del actor.
 * @param {string} [opts.ip]
 * @param {string} [opts.userAgent]
 * @param {object} [opts.metadata={}]       JSON estructurado por tipo de acción.
 * @returns {Promise<RGPDAuditLog>}
 *
 * Errores: el caller NO debe propagar fallos de auditoría a flujo de
 * negocio (no romper un borrado porque el log fallara). En su lugar,
 * loguear a console y considerar incidente operativo. Sentry capturará.
 */
async function log(action, opts = {}) {
  const {
    usuarioId,
    actor = 'system',
    actorUserId = null,
    ip = null,
    userAgent = null,
    metadata = {},
  } = opts;

  if (!usuarioId) {
    throw new Error('rgpdAuditService.log: usuarioId is required');
  }
  if (!action) {
    throw new Error('rgpdAuditService.log: action is required');
  }

  try {
    return await RGPDAuditLog.create({
      usuarioId,
      action,
      actor,
      actorUserId,
      ip,
      userAgent,
      metadata,
      timestamp: new Date(),
    });
  } catch (err) {
    // Defensive: no romper flujo de negocio. El operador verá esto en logs.
    // Sentry (si está wired) capturará el throw original.
    console.error('[rgpdAuditService] log failed', { action, usuarioId, err: err.message });
    throw err;
  }
}

/**
 * Devuelve todas las entradas del audit log para un usuario, en orden
 * cronológico descendente. Para uso en endpoint admin
 * `GET /api/admin/rgpd/users/:id/dossier`.
 */
async function findByUser(usuarioId, { limit = 100, skip = 0 } = {}) {
  return RGPDAuditLog.find({ usuarioId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
}

/**
 * Devuelve entradas filtradas por acción (y opcionalmente rango temporal).
 * Para uso en endpoint admin `GET /api/admin/rgpd/audit-log`.
 *
 * @param {string} action
 * @param {object} [range]
 * @param {Date} [range.from]
 * @param {Date} [range.to]
 * @param {number} [limit=100]
 * @param {number} [skip=0]
 */
async function findByAction(action, range = {}, { limit = 100, skip = 0 } = {}) {
  const query = { action };
  if (range.from || range.to) {
    query.timestamp = {};
    if (range.from) query.timestamp.$gte = range.from;
    if (range.to) query.timestamp.$lte = range.to;
  }
  return RGPDAuditLog.find(query).sort({ timestamp: -1 }).limit(limit).skip(skip).lean();
}

/**
 * Query libre con filtros combinables para el panel admin.
 * Acepta usuarioId, action, from, to y aplica los mismos límites.
 */
async function query({ usuarioId, action, from, to, limit = 100, skip = 0 } = {}) {
  const q = {};
  if (usuarioId) q.usuarioId = usuarioId;
  if (action) q.action = action;
  if (from || to) {
    q.timestamp = {};
    if (from) q.timestamp.$gte = from;
    if (to) q.timestamp.$lte = to;
  }
  const [items, total] = await Promise.all([
    RGPDAuditLog.find(q).sort({ timestamp: -1 }).limit(limit).skip(skip).lean(),
    RGPDAuditLog.countDocuments(q),
  ]);
  return { items, total, limit, skip };
}

module.exports = {
  log,
  findByUser,
  findByAction,
  query,
  // Intencionalmente NO exportamos update/delete. NO añadir sin justificación
  // documentada en data-model y aprobación de revisor de seguridad.
};
