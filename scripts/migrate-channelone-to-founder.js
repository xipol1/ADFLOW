#!/usr/bin/env node
/**
 * Migrate the orphaned Channel One waitlist into the founding-cohort waitlist.
 *
 * Channel One was merged into the founding cohort (2026-06-02): the model
 * rename moves the Mongo collection `channeloneregistrations` →
 * `founderregistrations`. This copies any pre-launch signups over so they are
 * not orphaned (the public counter reads only the new collection).
 *
 * The actual copy logic lives in lib/migrateLegacyWaitlist.js (shared with the
 * admin endpoint POST /api/founder-waitlist/admin/migrate-legacy).
 *
 * SAFETY:
 *  - DRY-RUN by default. Pass --apply to write.
 *  - Idempotent: skips source docs whose email/referralToken already exist.
 *  - Never drops the source unless you ALSO pass --drop-old (after --apply).
 *  - No-ops cleanly if the old collection does not exist.
 *  - Must run from an environment with network access to the Mongo cluster.
 *
 * USAGE:
 *   node scripts/migrate-channelone-to-founder.js                    # dry-run
 *   node scripts/migrate-channelone-to-founder.js --apply            # copy docs
 *   node scripts/migrate-channelone-to-founder.js --apply --drop-old # copy, then drop old
 */
require('dotenv').config();

const mongoose = require('mongoose');
const databaseConfig = require('../config/database');
const { migrateLegacyWaitlist } = require('../lib/migrateLegacyWaitlist');

const APPLY = process.argv.includes('--apply');
const DROP_OLD = process.argv.includes('--drop-old');

async function run() {
  await databaseConfig.conectar();

  // conectar() logs and returns on failure instead of throwing, so guard here:
  // without a live connection mongoose.connection.db is undefined.
  const db = mongoose.connection.db;
  if (!db || mongoose.connection.readyState !== 1) {
    throw new Error(
      'No hay conexión a MongoDB. Revisa MONGO_URI y el acceso de red al cluster ' +
      '(IP allowlist de Atlas). Ejecuta este script desde un entorno con acceso a la base de datos.'
    );
  }

  console.log(`[migrate-c1] mode=${APPLY ? 'APPLY' : 'DRY-RUN'}${DROP_OLD ? ' (+drop-old)' : ''}`);
  const result = await migrateLegacyWaitlist(db, { apply: APPLY, dropOld: DROP_OLD });

  const { samples, ...summary } = result;
  console.log('[migrate-c1] ' + JSON.stringify(summary));
  if (samples && samples.length) console.table(samples);

  if (!result.sourceExists) {
    console.log('[migrate-c1] la colección origen no existe — nada que migrar.');
  } else if (!APPLY) {
    console.log('[migrate-c1] DRY-RUN — re-ejecuta con --apply para escribir (añade --drop-old para borrar la colección vieja después).');
  } else if (!DROP_OLD) {
    console.log('[migrate-c1] colección origen intacta como backup. Re-ejecuta con --drop-old cuando verifiques el destino.');
  }

  await databaseConfig.desconectar();
}

run().catch(async (error) => {
  console.error('[migrate-c1] error:', error.message);
  try { await databaseConfig.desconectar(); } catch { /* already down */ }
  process.exit(1);
});
