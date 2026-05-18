/**
 * SPEC-B1 migration — backfill Usuario.deletionStatus on existing users.
 *
 * Sin esta migración, los Usuarios creados antes de la feature RGPD
 * quedan con deletionStatus === undefined, lo cual:
 *   - Hace que el middleware/auth.js no encuentre el campo y caiga al
 *     comportamiento legacy (login normal sin banner ni bloqueo).
 *   - Rompe queries del worker que filtra por
 *     `deletionStatus: { $in: ['pending_deletion', ...] }`.
 *
 * El script es idempotente: solo actualiza docs cuyo campo no existe.
 * Re-ejecutar después de un restore de DB es seguro.
 *
 * Uso:
 *   npm run migrate:rgpd
 *
 * O directamente:
 *   node scripts/migrate-rgpd-deletionStatus.js
 */

require('dotenv').config();

const databaseConfig = require('../config/database');
const Usuario = require('../models/Usuario');

async function run() {
  console.log('[migrate:rgpd] connecting to Mongo...');
  await databaseConfig.conectar();

  console.log('[migrate:rgpd] backfilling Usuario.deletionStatus = "active" donde no existe...');
  const result = await Usuario.updateMany(
    { deletionStatus: { $exists: false } },
    { $set: { deletionStatus: 'active' } },
  );

  const updated = result.modifiedCount ?? result.nModified ?? 0;
  const matched = result.matchedCount ?? result.n ?? 0;
  console.log('[migrate:rgpd] done', { matched, updated });

  await databaseConfig.desconectar();
}

run().catch(async (error) => {
  console.error('[migrate:rgpd] failed:', error?.message || error);
  try {
    await databaseConfig.desconectar();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
