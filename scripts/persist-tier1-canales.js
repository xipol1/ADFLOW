/**
 * persist-tier1-canales.js — Upsert + sync inicial de los 4 canales Tier 1
 * confirmados (vertical fintech ES).
 *
 * Flujo:
 *   1) Upsert por (plataforma, identificadorCanal) — idempotente.
 *   2) Para cada uno de los 4 _id, replica el loop interno de
 *      syncAllMappedChannels: getChannelMetrics → calcularCAS →
 *      Canal.updateOne(scoring) → CanalScoreSnapshot.create.
 *      (Scope reducido para no procesar los otros 503 canales TG.)
 *
 * Constraints:
 *   - Idempotente: re-ejecutar no duplica Canal docs (upsert).
 *   - Errores por canal NO abortan el batch.
 *   - subVertical: el schema Canal es strict y no define este campo,
 *     se omite (instrucción explícita del spec).
 *
 * Run:   node scripts/persist-tier1-canales.js
 * Out:   audit/persist-tier1-YYYY-MM-DD.log
 */

require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const Canal = require('../models/Canal');
const CanalScoreSnapshot = require('../models/CanalScoreSnapshot');
const { getChannelMetrics } = require('../services/telegramIntelService');
const { calcularCAS } = require('../services/channelScoringV2');

// ─────────────────────────────────────────────────────────────────────────────
// Lista hardcoded
// ─────────────────────────────────────────────────────────────────────────────
const TARGETS = [
  { handle: '@LasInversionesDeJavi',       name: 'Las Inversiones de Javi Linares', subVertical: 'inversion_educativo' },
  { handle: '@invertirdesdecero_oficial',  name: 'Invertir Desde Cero Oficial',     subVertical: 'inversion_educativo' },
  { handle: '@Bit2Me_ES',                  name: 'Bit2Me Español (OFICIAL)',        subVertical: 'cripto_exchange' },
  { handle: '@bit2menews',                 name: 'Bit2Me News',                     subVertical: 'cripto_noticias' },
];

const RATE_LIMIT_MS = 2500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// Logging
// ─────────────────────────────────────────────────────────────────────────────
const todayStr = new Date().toISOString().slice(0, 10);
const logFile = path.resolve(__dirname, '..', 'audit', `persist-tier1-${todayStr}.log`);
if (!fs.existsSync(path.dirname(logFile))) fs.mkdirSync(path.dirname(logFile), { recursive: true });
const logLines = [];
function log(line) {
  const stamped = `[${new Date().toISOString()}] ${line}`;
  console.log(stamped);
  logLines.push(stamped);
}
function flushLog() {
  fs.writeFileSync(logFile, logLines.join('\n') + '\n', 'utf8');
}

// ─────────────────────────────────────────────────────────────────────────────
// Check campo subVertical en el schema
// ─────────────────────────────────────────────────────────────────────────────
const SCHEMA_HAS_SUBVERTICAL = !!Canal.schema.path('subVertical');

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
(async () => {
  if (!process.env.MONGODB_URI) {
    log('❌ MONGODB_URI no configurado. Aborto.');
    flushLog();
    process.exit(1);
  }

  const start = Date.now();
  log(`persist-tier1 — ${TARGETS.length} canales`);
  log(`subVertical campo en schema: ${SCHEMA_HAS_SUBVERTICAL ? 'sí, se setea' : 'no, se omite (instrucción del spec)'}`);
  log('');

  await mongoose.connect(process.env.MONGODB_URI);
  log('✅ Mongo conectado');

  // ── Step 1: upsert los 4 docs ──
  log('');
  log('═══ STEP 1: UPSERT Canal docs ═══');
  const upserted = [];
  for (const t of TARGETS) {
    try {
      const setOnInsert = {
        plataforma: 'telegram',
        identificadorCanal: t.handle,
        nombreCanal: t.name,
        categoria: 'fintech',
        idioma: 'es',
        estado: 'pendiente_verificacion',
      };
      if (SCHEMA_HAS_SUBVERTICAL) setOnInsert.subVertical = t.subVertical;

      const res = await Canal.findOneAndUpdate(
        { plataforma: 'telegram', identificadorCanal: t.handle },
        { $setOnInsert: setOnInsert },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      const isNew = res.createdAt && (Date.now() - new Date(res.createdAt).getTime()) < 60_000;
      log(`  ${t.handle} → ${isNew ? 'CREATED' : 'EXISTS'} _id=${res._id}`);
      upserted.push({ target: t, canal: res.toObject(), isNew });
    } catch (err) {
      log(`  ${t.handle} → UPSERT FAIL: ${err.message}`);
      upserted.push({ target: t, error: err.message });
    }
  }

  const upsertOk = upserted.filter((u) => u.canal);
  const upsertFail = upserted.filter((u) => u.error);
  log(`Upsert: ${upsertOk.length} OK, ${upsertFail.length} fallos`);

  // ── Step 2: sync por canal (scope reducido, no syncAllMappedChannels) ──
  log('');
  log('═══ STEP 2: SYNC METRICS (scope reducido a los 4) ═══');
  const syncResults = [];
  for (let i = 0; i < upsertOk.length; i++) {
    const { target, canal } = upsertOk[i];
    const stepStart = Date.now();
    log(`[${i + 1}/${upsertOk.length}] ${target.handle} — START sync`);

    try {
      const metrics = await getChannelMetrics(target.handle);
      if (!metrics) {
        log(`  → SKIP: entity null / not a Channel`);
        syncResults.push({ handle: target.handle, ok: false, error: 'entity null' });
        await sleep(RATE_LIMIT_MS);
        continue;
      }

      if (metrics.unscrapable) {
        log(`  → PARTIAL: unscrapable (sin participants_count). Update mínimo, sin snapshot.`);
        await Canal.updateOne(
          { _id: canal._id },
          { $set: { 'estadisticas.ultimaActualizacion': new Date(), 'crawler.ultimaActualizacion': new Date() } },
        );
        syncResults.push({ handle: target.handle, ok: false, error: 'unscrapable' });
        await sleep(RATE_LIMIT_MS);
        continue;
      }

      // Enriquecer Canal en memoria para scoring
      const enrichedCanal = {
        ...canal,
        estadisticas: {
          ...canal.estadisticas,
          seguidores: metrics.participants_count ?? canal.estadisticas?.seguidores ?? 0,
          promedioVisualizaciones: metrics.avg_views_last_20_posts ?? 0,
        },
        verificacion: canal.verificacion || { tipoAcceso: 'declarado' },
        antifraude: canal.antifraude || { flags: [] },
        crawler: {
          ...canal.crawler,
          ultimoPostNum: null,
          ultimaActualizacion: new Date(),
          urlPublica: `https://t.me/${metrics.username}`,
        },
        _mtprotoIntel: {
          engagement_rate: metrics.engagement_rate,
          views_trend: metrics.views_trend,
          post_frequency_per_week: metrics.post_frequency_per_week,
          verified: metrics.verified,
        },
      };

      const scores = calcularCAS(enrichedCanal, [], canal.categoria || 'fintech');

      const updateData = {
        'estadisticas.seguidores': metrics.participants_count ?? 0,
        'estadisticas.ultimaActualizacion': new Date(),
        'crawler.ultimaActualizacion': new Date(),
        'crawler.urlPublica': `https://t.me/${metrics.username}`,
        CAF: scores.CAF,
        CTF: scores.CTF,
        CER: scores.CER,
        CVS: scores.CVS,
        // CAP intocado — viene de campañas reales
        CAS: scores.CAS,
        nivel: scores.nivel,
        CPMDinamico: scores.CPMDinamico,
        'verificacion.confianzaScore': scores.confianzaScore,
        'antifraude.ratioCTF_CAF': scores.ratioCTF_CAF,
        'antifraude.flags': scores.flags,
        'antifraude.ultimaRevision': new Date(),
      };

      await Canal.updateOne({ _id: canal._id }, { $set: updateData });

      const snap = await CanalScoreSnapshot.create({
        canalId: canal._id,
        fecha: new Date(),
        CAF: scores.CAF,
        CTF: scores.CTF,
        CER: scores.CER,
        CVS: scores.CVS,
        CAP: canal.CAP ?? 50,
        CAS: scores.CAS,
        nivel: scores.nivel,
        CPMDinamico: scores.CPMDinamico,
        confianzaScore: scores.confianzaScore,
        ratioCTF_CAF: scores.ratioCTF_CAF,
        flags: scores.flags,
        seguidores: metrics.participants_count ?? 0,
        nicho: canal.categoria || 'fintech',
        plataforma: 'telegram',
        version: 2,
        telegramIntel: {
          avg_views_last_20_posts: metrics.avg_views_last_20_posts,
          engagement_rate: metrics.engagement_rate,
          post_frequency_per_week: metrics.post_frequency_per_week,
          views_trend: metrics.views_trend,
          last_post_date: metrics.last_post_date,
          verified: metrics.verified,
        },
      });

      const elapsed = Date.now() - stepStart;
      log(
        `  → OK subs=${metrics.participants_count} ` +
        `CAS=${scores.CAS} nivel=${scores.nivel} CPM=${scores.CPMDinamico} ` +
        `snapshot=${snap._id} [${elapsed}ms]`,
      );
      syncResults.push({
        handle: target.handle,
        ok: true,
        canalId: canal._id,
        snapshotId: snap._id,
        subs: metrics.participants_count,
        CAS: scores.CAS,
        nivel: scores.nivel,
        CPMDinamico: scores.CPMDinamico,
        elapsed_ms: elapsed,
      });
    } catch (err) {
      const elapsed = Date.now() - stepStart;
      log(`  → SYNC FAIL "${err.message}" [${elapsed}ms]`);
      syncResults.push({ handle: target.handle, ok: false, error: err.message });
    }

    if (i < upsertOk.length - 1) {
      log(`  ↳ sleeping ${RATE_LIMIT_MS}ms (rate limit)...`);
      await sleep(RATE_LIMIT_MS);
    }
  }

  // ── Resumen ──
  const syncOk = syncResults.filter((r) => r.ok);
  const syncFail = syncResults.filter((r) => !r.ok);
  const totalMs = Date.now() - start;

  log('');
  log('═══ RESUMEN ═══');
  log(`Upserted Canal docs: ${upsertOk.length}/${TARGETS.length} (${upsertOk.filter((u) => u.isNew).length} nuevos, ${upsertOk.filter((u) => !u.isNew).length} existían)`);
  log(`Snapshots creados: ${syncOk.length}/${upsertOk.length}`);
  log(`Sync fallos: ${syncFail.length}`);
  for (const f of syncFail) log(`  - ${f.handle}: ${f.error}`);
  for (const r of syncOk) {
    log(`  - ${r.handle}: CAS=${r.CAS} (${r.nivel}), CPM=${r.CPMDinamico}, subs=${r.subs}`);
  }
  log(`Duración total: ${totalMs}ms (${(totalMs / 1000).toFixed(1)}s)`);

  await mongoose.disconnect();
  flushLog();

  log(`✅ Log: ${logFile}`);
  flushLog();
  process.exit(0);
})().catch((err) => {
  log(`💥 Fatal: ${err.message}`);
  log(err.stack || '');
  flushLog();
  process.exit(2);
});
