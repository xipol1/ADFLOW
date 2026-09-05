/**
 * persist-noticias-batch.js — Upsert + sync de los 13 canales NOTICIAS
 * filtrados del export @canalestelegram (probe del 2026-05-12).
 *
 * Reusa el pattern de persist-tier1: upsert idempotente +
 * getChannelMetrics + calcularCAS + CanalScoreSnapshot.create.
 * Errores per-canal no abortan el batch.
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

const TARGETS = [
  { handle: 'latina',              name: 'Latina TV (Perú)',     subVertical: 'medio_tv_latam',           country: 'PE' },
  { handle: 'elsaltodiario',       name: 'El Salto Diario',      subVertical: 'medio_generalista',        country: 'ES' },
  { handle: 'runrunes',            name: 'Runrunes',             subVertical: 'medio_generalista_latam',  country: 'VE' },
  { handle: 'globovision_oficial', name: 'Globovisión',          subVertical: 'medio_tv_latam',           country: 'VE' },
  { handle: 'Diario2001Online',    name: 'Diario 2001',          subVertical: 'medio_generalista_latam',  country: 'VE' },
  { handle: 'info288_nacional',    name: 'Info288 Nacional',     subVertical: 'medio_generalista_latam',  country: 'HN' },
  { handle: 'naciodigital',        name: 'Nació Digital',        subVertical: 'medio_generalista',        country: 'ES' },
  { handle: 'NOTMEX',              name: 'NOTMEX',               subVertical: 'medio_generalista_latam',  country: 'MX' },
  { handle: 'geoestrategia1',      name: 'Geoestrategia',        subVertical: 'medio_analisis',           country: 'ES' },
  { handle: 'noticiaschile',       name: 'Noticias Chile',       subVertical: 'medio_generalista_latam',  country: 'CL' },
  { handle: 'agenciaelvigia',      name: 'Agencia El Vigía',     subVertical: 'medio_generalista_latam',  country: 'AR' },
  { handle: 'CanalVientoSur',      name: 'Canal Viento Sur',     subVertical: 'medio_regional',           country: 'ES' },
  { handle: 'info288',             name: 'Info288',              subVertical: 'medio_generalista_latam',  country: 'HN' },
];

const RATE_LIMIT_MS = 3000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const todayStr = new Date().toISOString().slice(0, 10);
const logFile = path.resolve(__dirname, '..', 'audit', `persist-noticias-${todayStr}.log`);
if (!fs.existsSync(path.dirname(logFile))) fs.mkdirSync(path.dirname(logFile), { recursive: true });
const logLines = [];
function log(line) {
  const stamped = `[${new Date().toISOString()}] ${line}`;
  console.log(stamped);
  logLines.push(stamped);
}
function flushLog() { fs.writeFileSync(logFile, logLines.join('\n') + '\n', 'utf8'); }

async function upsertCanal(t) {
  const setOnInsert = {
    plataforma: 'telegram',
    identificadorCanal: `@${t.handle}`,
    nombreCanal: t.name,
    categoria: 'medios_comunicacion',
    idioma: 'es',
    estado: 'pendiente_verificacion',
    tags: [t.subVertical, `country_${t.country}`, 'discovered_canalestelegram_2018'],
  };
  const res = await Canal.findOneAndUpdate(
    { plataforma: 'telegram', identificadorCanal: { $regex: new RegExp(`^@?${t.handle}$`, 'i') } },
    { $setOnInsert: setOnInsert },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const isNew = res.createdAt && (Date.now() - new Date(res.createdAt).getTime()) < 60_000;
  return { canal: res.toObject(), isNew };
}

async function syncOne(canal, metrics) {
  const enriched = {
    ...canal,
    estadisticas: {
      ...canal.estadisticas,
      seguidores: metrics.participants_count ?? 0,
      promedioVisualizaciones: metrics.avg_views_last_20_posts ?? 0,
    },
    verificacion: canal.verificacion || { tipoAcceso: 'declarado' },
    antifraude: canal.antifraude || { flags: [] },
    crawler: {
      ...canal.crawler,
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
  const scores = calcularCAS(enriched, [], 'medios_comunicacion');

  await Canal.updateOne({ _id: canal._id }, {
    $set: {
      'estadisticas.seguidores': metrics.participants_count ?? 0,
      'estadisticas.ultimaActualizacion': new Date(),
      'crawler.ultimaActualizacion': new Date(),
      'crawler.urlPublica': `https://t.me/${metrics.username}`,
      CAF: scores.CAF, CTF: scores.CTF, CER: scores.CER, CVS: scores.CVS,
      CAS: scores.CAS, nivel: scores.nivel, CPMDinamico: scores.CPMDinamico,
      'verificacion.confianzaScore': scores.confianzaScore,
      'antifraude.ratioCTF_CAF': scores.ratioCTF_CAF,
      'antifraude.flags': scores.flags,
      'antifraude.ultimaRevision': new Date(),
    },
  });

  const snap = await CanalScoreSnapshot.create({
    canalId: canal._id, fecha: new Date(),
    CAF: scores.CAF, CTF: scores.CTF, CER: scores.CER, CVS: scores.CVS,
    CAP: canal.CAP ?? 50, CAS: scores.CAS,
    nivel: scores.nivel, CPMDinamico: scores.CPMDinamico,
    confianzaScore: scores.confianzaScore,
    ratioCTF_CAF: scores.ratioCTF_CAF, flags: scores.flags,
    seguidores: metrics.participants_count ?? 0,
    nicho: 'medios_comunicacion',
    plataforma: 'telegram', version: 2,
    telegramIntel: {
      avg_views_last_20_posts: metrics.avg_views_last_20_posts,
      engagement_rate: metrics.engagement_rate,
      post_frequency_per_week: metrics.post_frequency_per_week,
      views_trend: metrics.views_trend,
      last_post_date: metrics.last_post_date,
      verified: metrics.verified,
    },
  });

  return { scores, snapshotId: snap._id };
}

(async () => {
  if (!process.env.MONGODB_URI) { log('❌ MONGODB_URI missing'); flushLog(); process.exit(1); }
  const start = Date.now();
  log(`persist-noticias — ${TARGETS.length} canales`);

  await mongoose.connect(process.env.MONGODB_URI);
  log('✅ Mongo conectado');
  log('');

  const results = [];
  for (let i = 0; i < TARGETS.length; i++) {
    const t = TARGETS[i];
    const idx = `[${i + 1}/${TARGETS.length}]`;
    log(`${idx} @${t.handle} (${t.name}, ${t.country})`);
    try {
      const { canal, isNew } = await upsertCanal(t);
      log(`  upsert: ${isNew ? 'NEW' : 'EXISTS'} _id=${canal._id}`);

      const metrics = await getChannelMetrics(t.handle);
      if (!metrics) {
        log(`  ✗ MTProto: entity null`);
        results.push({ ...t, status: 'mtproto_null', canalId: canal._id });
        await sleep(RATE_LIMIT_MS);
        continue;
      }
      if (metrics.unscrapable) {
        log(`  ⚠ MTProto: unscrapable`);
        results.push({ ...t, status: 'unscrapable', canalId: canal._id });
        await sleep(RATE_LIMIT_MS);
        continue;
      }

      const { scores, snapshotId } = await syncOne(canal, metrics);
      log(`  ✓ subs=${metrics.participants_count} CAS=${scores.CAS} (${scores.nivel}) CPM=${scores.CPMDinamico} snap=${snapshotId}`);
      results.push({
        ...t, status: isNew ? 'new' : 'updated',
        canalId: canal._id.toString(), snapshotId: snapshotId.toString(),
        subs: metrics.participants_count, CAS: scores.CAS,
        nivel: scores.nivel, CPMDinamico: scores.CPMDinamico,
      });
    } catch (err) {
      log(`  ✗ FAIL: ${err.message}`);
      results.push({ ...t, status: 'fail', error: err.message });
    }
    if (i < TARGETS.length - 1) await sleep(RATE_LIMIT_MS);
  }

  log('');
  log('═══ RESUMEN ═══');
  const ok = results.filter((r) => r.status === 'new' || r.status === 'updated');
  const fail = results.filter((r) => !['new', 'updated'].includes(r.status));
  log(`OK persisted: ${ok.length}/${TARGETS.length}`);
  log(`Fallos: ${fail.length}`);
  for (const r of fail) log(`  - @${r.handle}: ${r.status} ${r.error || ''}`);
  log('');
  log('Persistidos:');
  for (const r of ok) {
    log(`  - @${r.handle} (${r.country}): ${r.subs} subs, CAS=${r.CAS} (${r.nivel}), CPM=€${r.CPMDinamico}`);
  }
  log(`Duración: ${((Date.now() - start) / 1000).toFixed(1)}s`);

  await mongoose.disconnect();
  flushLog();
  log(`✅ Log: ${logFile}`);
  flushLog();
  process.exit(0);
})().catch((e) => {
  log(`💥 Fatal: ${e.message}`);
  log(e.stack || '');
  flushLog();
  process.exit(2);
});
