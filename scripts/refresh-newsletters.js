#!/usr/bin/env node
/**
 * Refresh newsletter metrics by probing each publication URL.
 *
 * Uses substackPublicApiService.enrichFromSubstack(seed): fetches the public
 * page and extracts the subscriber_count from the preloaded state (Substack
 * exposes it; most "other" platforms don't, so the seed value is kept). Also
 * verifies liveness — a 404/410 marks the URL dead.
 *
 * Updates estadisticas.seguidores (when a fresh count is found) + ultima-
 * Actualizacion, recomputes CAS, writes a snapshot. Dead unclaimed URLs are
 * soft-deleted (estado=eliminado) only on hard 404/410.
 *
 *   node scripts/refresh-newsletters.js             # live
 *   node scripts/refresh-newsletters.js --dry-run
 *   node scripts/refresh-newsletters.js --limit 20
 */
require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const mongoose = require('mongoose');

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const LIMIT = (() => { const i = args.indexOf('--limit'); return i >= 0 ? Number(args[i + 1]) : Infinity; })();
const CONCURRENCY = 4;

async function pool(items, n, worker) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const idx = i++; await worker(items[idx]); }
  }));
}

(async () => {
  console.log(`\n=== refresh-newsletters ${DRY ? 'DRY-RUN' : 'LIVE'} ${LIMIT !== Infinity ? 'limit ' + LIMIT : ''} ===\n`);
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 25000 });
  const Canal = require('../models/Canal');
  const CanalScoreSnapshot = require('../models/CanalScoreSnapshot');
  const { enrichFromSubstack } = require('../services/newsletter/substackPublicApiService');
  const { calcularCAS } = require('../services/channelScoringV2');

  let canales = await Canal.find({ plataforma: 'newsletter', estado: { $ne: 'eliminado' } })
    .select('identificadorCanal nombreCanal categoria descripcion idioma identificadores estadisticas verificacion antifraude crawler claimed').lean();
  if (LIMIT !== Infinity) canales = canales.slice(0, LIMIT);
  console.log(`Target newsletters: ${canales.length}\n`);

  const stat = { subs_updated: 0, checked_alive: 0, dead: 0, soft_deleted: 0, errors: 0 };
  const samples = [];

  await pool(canales, CONCURRENCY, async (canal) => {
    const url = canal.crawler?.urlPublica || '';
    if (!url) { stat.errors++; return; }
    try {
      const seed = {
        url,
        title: canal.nombreCanal,
        subscribers: canal.estadisticas?.seguidores || 0,
        provider: canal.identificadores?.provider,
        idioma: canal.idioma,
      };
      const r = await enrichFromSubstack(seed);
      const oldSubs = canal.estadisticas?.seguidores || 0;

      // Hard-dead URL (404/410) + unclaimed → soft delete
      if (r._urlDead && [404, 410].includes(r._probeStatus) && !canal.claimed) {
        stat.dead++;
        if (samples.length < 15) samples.push(`DEAD(${r._probeStatus}) ${url}`);
        if (!DRY) { await Canal.updateOne({ _id: canal._id }, { $set: { estado: 'eliminado', 'crawler.ultimaActualizacion': new Date() } }); stat.soft_deleted++; }
        return;
      }
      if (r._urlDead) { stat.dead++; return; } // transient/4xx-5xx other than 404/410 → leave alone

      stat.checked_alive++;
      const newSubs = r.subscribers > 0 ? r.subscribers : oldSubs;
      const enriched = {
        ...canal,
        estadisticas: { ...canal.estadisticas, seguidores: newSubs },
        verificacion: canal.verificacion || { tipoAcceso: 'declarado' },
        antifraude: canal.antifraude || { flags: [] },
      };
      let scores = null;
      try { scores = calcularCAS(enriched, [], canal.categoria || 'otros'); } catch (e) { /* keep */ }
      if (newSubs !== oldSubs && samples.length < 15) samples.push(`${(canal.identificadorCanal||'').padEnd(22)} ${String(oldSubs).padStart(7)} → ${String(newSubs).padStart(7)} [${r.provider}]`);
      if (newSubs !== oldSubs) stat.subs_updated++;
      if (DRY) return;

      const update = { 'estadisticas.seguidores': newSubs, 'estadisticas.ultimaActualizacion': new Date(), 'crawler.ultimaActualizacion': new Date() };
      if (r.description && r.description.length > (canal.descripcion || '').length) update.descripcion = r.description.slice(0, 500);
      if (scores) Object.assign(update, { CAF: scores.CAF, CTF: scores.CTF, CER: scores.CER, CVS: scores.CVS, CAS: scores.CAS, nivel: scores.nivel, CPMDinamico: scores.CPMDinamico });
      await Canal.updateOne({ _id: canal._id }, { $set: update });
      if (scores) {
        await CanalScoreSnapshot.create({
          canalId: canal._id, fecha: new Date(),
          CAF: scores.CAF, CTF: scores.CTF, CER: scores.CER, CVS: scores.CVS, CAP: scores.CAP, CAS: scores.CAS,
          nivel: scores.nivel, CPMDinamico: scores.CPMDinamico, confianzaScore: scores.confianzaScore || 30,
          ratioCTF_CAF: scores.ratioCTF_CAF, flags: scores.flags || [], seguidores: newSubs,
          nicho: canal.categoria || 'otros', plataforma: 'newsletter', version: 2,
        }).catch(() => {});
      }
    } catch (e) { stat.errors++; }
  });

  console.log('Result:');
  console.log(`  checked alive    : ${stat.checked_alive}`);
  console.log(`  subs updated     : ${stat.subs_updated}`);
  console.log(`  dead URLs        : ${stat.dead}  (soft-deleted: ${stat.soft_deleted})`);
  console.log(`  errors           : ${stat.errors}`);
  console.log('\nSamples:');
  samples.forEach(s => console.log('  ' + s));
  console.log(`\nNOW: ${new Date().toISOString()} mode=${DRY ? 'DRY' : 'APPLIED'}`);
  await mongoose.disconnect();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
