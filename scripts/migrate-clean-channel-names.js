#!/usr/bin/env node
/**
 * Clean poisoned Canal display names.
 *
 * WhatsApp channels discovered before the scraper was hardened stored leaked
 * "<img ...>" markup (and the odd bare URL / image filename) in nombreCanal, so
 * the marketplace and rankings render raw HTML instead of a name. This re-derives
 * a clean name from the slug — the same fallback a fresh scrape now produces.
 *
 * The actual logic lives in lib/cleanChannelNames.js (shared with the admin
 * endpoint POST /api/channels/admin/clean-names).
 *
 * SAFETY:
 *  - DRY-RUN by default. Pass --apply to write.
 *  - Idempotent: only updates when the sanitised name differs. Re-runs no-op.
 *  - Must run from an environment with network access to the Mongo cluster.
 *
 * USAGE:
 *   node scripts/migrate-clean-channel-names.js            # dry-run
 *   node scripts/migrate-clean-channel-names.js --apply    # write fixes
 */
require('dotenv').config();

const mongoose = require('mongoose');
const databaseConfig = require('../config/database');
const { cleanChannelNames } = require('../lib/cleanChannelNames');

const APPLY = process.argv.includes('--apply');

async function run() {
  await databaseConfig.conectar();

  // conectar() logs and returns on failure instead of throwing, so guard here:
  // without a live connection mongoose.connection.db is undefined.
  if (!mongoose.connection.db || mongoose.connection.readyState !== 1) {
    throw new Error(
      'No hay conexión a MongoDB. Revisa MONGO_URI y el acceso de red al cluster ' +
      '(IP allowlist de Atlas). Ejecuta este script desde un entorno con acceso a la base de datos.'
    );
  }

  console.log(`[clean-names] mode=${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  const result = await cleanChannelNames({ apply: APPLY });

  const { samples, ...summary } = result;
  console.log('[clean-names] ' + JSON.stringify(summary));
  if (samples && samples.length) console.table(samples);

  if (result.matched === 0) {
    console.log('[clean-names] no se encontraron nombres con markup — nada que limpiar.');
  } else if (!APPLY) {
    console.log('[clean-names] DRY-RUN — re-ejecuta con --apply para escribir las correcciones.');
  }

  await databaseConfig.desconectar();
}

run().catch(async (error) => {
  console.error('[clean-names] error:', error.message);
  try { await databaseConfig.desconectar(); } catch { /* already down */ }
  process.exit(1);
});
