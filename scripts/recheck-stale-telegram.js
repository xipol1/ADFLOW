#!/usr/bin/env node
/**
 * Re-check the Telegram channels that the fast (concurrency-5) web refresh
 * left stale. Many were FALSE NEGATIVES — t.me rate-limited the burst and
 * returned empty pages for channels that are actually alive. This pass is
 * GENTLE (low concurrency + retry + delay) so it:
 *   1. RESCUES alive channels → updates subscribers + CAS + snapshot.
 *   2. CLEANS UP only the genuinely dead:
 *        - synthetic / non-@-valid usernames (telegram-manual-*, gibberish)  → eliminado
 *        - HTTP 404                                                          → eliminado
 *        - 200 but no counter after retry, currently 'activo'               → pendiente_reverificacion
 *      (only `claimed:false` channels are ever touched; all moves reversible)
 *
 *   node scripts/recheck-stale-telegram.js --dry-run
 *   node scripts/recheck-stale-telegram.js              # live
 */
require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const SINCE = new Date('2026-06-17T11:30:00Z');
const CONCURRENCY = 2;          // gentle — the rate-limit is what caused false negatives
const RETRY_DELAY = 2000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function humanToInt(raw) {
  if (!raw) return null;
  const m = String(raw).match(/([\d.,\s]+)\s*([KMkm])?/);
  if (!m) return null;
  let num = parseFloat(m[1].replace(/\s/g, '').replace(/,/g, m[1].includes('.') ? '' : '.'));
  if (!Number.isFinite(num)) { const d = m[1].replace(/[^\d]/g, ''); num = d ? parseInt(d, 10) : NaN; }
  if (!Number.isFinite(num)) return null;
  const s = (m[2] || '').toUpperCase();
  if (s === 'K') num *= 1000; else if (s === 'M') num *= 1000000;
  return Math.round(num);
}

// → { kind: 'alive'|'empty'|'dead404'|'transient', subs, status }
async function classify(username) {
  let last = { kind: 'transient', status: 0 };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await axios.get(`https://t.me/${username}`, { timeout: 15000, headers: { 'User-Agent': UA }, validateStatus: () => true });
      if (res.status === 404) return { kind: 'dead404', status: 404 };
      if (res.status !== 200) { last = { kind: 'transient', status: res.status }; await sleep(RETRY_DELAY); continue; }
      const $ = cheerio.load(res.data || '');
      const extra = $('.tgme_page_extra').first().text() || '';
      const m = extra.match(/([\d.,\s KMkm]+?)\s*(subscriber|member)/i);
      const subs = m ? humanToInt(m[1]) : null;
      if (subs != null) return { kind: 'alive', subs, status: 200 };
      last = { kind: 'empty', status: 200 };
      await sleep(RETRY_DELAY); // retry once — empty is often a transient rate-limit
    } catch (e) { last = { kind: 'transient', status: e.code || 'ERR' }; await sleep(RETRY_DELAY); }
  }
  return last;
}

async function pool(items, n, worker) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const idx = i++; await worker(items[idx]); } }));
}

(async () => {
  console.log(`\n=== recheck-stale-telegram ${DRY ? 'DRY-RUN' : 'LIVE'} ===\n`);
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 25000 });
  const Canal = require('../models/Canal');
  const CanalScoreSnapshot = require('../models/CanalScoreSnapshot');
  const { calcularCAS } = require('../services/channelScoringV2');

  const canales = await Canal.find({
    plataforma: 'telegram',
    $or: [{ 'estadisticas.ultimaActualizacion': { $lt: SINCE } }, { 'estadisticas.ultimaActualizacion': null }],
  }).select('identificadorCanal nombreCanal categoria estadisticas verificacion antifraude crawler claimed estado').lean();
  console.log(`Stale TG to re-check: ${canales.length}\n`);

  const stat = { rescued: 0, dead_synthetic: 0, dead_404: 0, demoted_empty: 0, left_empty: 0, transient: 0, claimed_skipped: 0 };
  const samples = { rescued: [], dead: [], empty: [] };

  await pool(canales, CONCURRENCY, async (canal) => {
    const username = (canal.identificadorCanal || '').replace(/^@/, '').trim();
    const synthetic = !username || /[^a-zA-Z0-9_]/.test(username) || /^telegram[-_]/i.test(username);

    if (synthetic) {
      stat.dead_synthetic++;
      if (samples.dead.length < 8) samples.dead.push(`synthetic: ${canal.identificadorCanal}`);
      if (!DRY && !canal.claimed) await Canal.updateOne({ _id: canal._id }, { $set: { estado: 'eliminado' } });
      else if (canal.claimed) stat.claimed_skipped++;
      return;
    }

    const r = await classify(username);

    if (r.kind === 'alive') {
      stat.rescued++;
      const enriched = {
        ...canal, estadisticas: { ...canal.estadisticas, seguidores: r.subs },
        verificacion: canal.verificacion || { tipoAcceso: 'declarado' },
        antifraude: canal.antifraude || { flags: [] },
        crawler: { ...canal.crawler, urlPublica: `https://t.me/${username}` },
      };
      let scores = null;
      try { scores = calcularCAS(enriched, [], canal.categoria || 'otros'); } catch (e) {}
      if (samples.rescued.length < 8) samples.rescued.push(`@${username} → ${r.subs}`);
      if (DRY) return;
      const upd = { 'estadisticas.seguidores': r.subs, 'estadisticas.ultimaActualizacion': new Date(), 'crawler.ultimaActualizacion': new Date(), 'crawler.urlPublica': `https://t.me/${username}` };
      if (scores) Object.assign(upd, { CAF: scores.CAF, CTF: scores.CTF, CER: scores.CER, CVS: scores.CVS, CAS: scores.CAS, nivel: scores.nivel, CPMDinamico: scores.CPMDinamico });
      await Canal.updateOne({ _id: canal._id }, { $set: upd });
      if (scores) await CanalScoreSnapshot.create({ canalId: canal._id, fecha: new Date(), CAF: scores.CAF, CTF: scores.CTF, CER: scores.CER, CVS: scores.CVS, CAP: scores.CAP, CAS: scores.CAS, nivel: scores.nivel, CPMDinamico: scores.CPMDinamico, confianzaScore: scores.confianzaScore || 30, ratioCTF_CAF: scores.ratioCTF_CAF, flags: scores.flags || [], seguidores: r.subs, nicho: canal.categoria || 'otros', plataforma: 'telegram', version: 2 }).catch(() => {});
      return;
    }
    if (r.kind === 'dead404') {
      stat.dead_404++;
      if (samples.dead.length < 8) samples.dead.push(`404: @${username}`);
      if (canal.claimed) { stat.claimed_skipped++; return; }
      if (!DRY) await Canal.updateOne({ _id: canal._id }, { $set: { estado: 'eliminado' } });
      return;
    }
    if (r.kind === 'empty') {
      if (canal.claimed) { stat.claimed_skipped++; return; }
      if (canal.estado === 'activo') {
        stat.demoted_empty++;
        if (samples.empty.length < 8) samples.empty.push(`empty(activo→reverif): @${username}`);
        if (!DRY) await Canal.updateOne({ _id: canal._id }, { $set: { estado: 'pendiente_reverificacion' } });
      } else { stat.left_empty++; }
      return;
    }
    stat.transient++; // leave alone
  });

  console.log('Result:');
  Object.entries(stat).forEach(([k, v]) => console.log(`  ${k.padEnd(16)}: ${v}`));
  console.log('\nRescued samples:'); samples.rescued.forEach(s => console.log('  ' + s));
  console.log('Dead samples:'); samples.dead.forEach(s => console.log('  ' + s));
  console.log('Empty samples:'); samples.empty.forEach(s => console.log('  ' + s));
  console.log(`\nNOW: ${new Date().toISOString()} mode=${DRY ? 'DRY' : 'APPLIED'}`);
  await mongoose.disconnect();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
