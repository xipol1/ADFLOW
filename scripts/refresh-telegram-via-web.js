#!/usr/bin/env node
/**
 * Refresh Telegram channel metrics via the PUBLIC t.me preview page (HTTP).
 *
 * WHY: the MTProto refresh (telegramIntelService) resolves every username via
 * contacts.ResolveUsername, which hits a hard ~24h FLOOD_WAIT after a few
 * hundred calls. The public page https://t.me/<username> exposes the live
 * subscriber count in `.tgme_page_extra` over plain HTTP — no auth, no MTProto,
 * no flood. This refreshes the channels the MTProto pass couldn't reach.
 *
 * Scope: by default only TG channels whose metrics are STALE (not refreshed
 * since --since, default = start of today's run). Pass --all for every TG chan.
 * Updates seguidores + ultimaActualizacion, recomputes CAS (mirrors the MTProto
 * job), writes a CanalScoreSnapshot.
 *
 *   node scripts/refresh-telegram-via-web.js                 # stale only
 *   node scripts/refresh-telegram-via-web.js --all
 *   node scripts/refresh-telegram-via-web.js --limit 20      # cap (testing)
 *   node scripts/refresh-telegram-via-web.js --dry-run
 */
require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');

const args = process.argv.slice(2);
const ALL = args.includes('--all');
const DRY = args.includes('--dry-run');
const LIMIT = (() => { const i = args.indexOf('--limit'); return i >= 0 ? Number(args[i + 1]) : Infinity; })();
const SINCE = (() => { const i = args.indexOf('--since'); return i >= 0 ? new Date(args[i + 1]) : new Date('2026-06-17T11:30:00Z'); })();
const CONCURRENCY = 5;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

function humanToInt(raw) {
  if (!raw) return null;
  const m = String(raw).match(/([\d.,\s]+)\s*([KMkm])?/);
  if (!m) return null;
  let num = parseFloat(m[1].replace(/\s/g, '').replace(/,/g, m[1].includes('.') ? '' : '.'));
  if (!Number.isFinite(num)) { const d = m[1].replace(/[^\d]/g, ''); num = d ? parseInt(d, 10) : NaN; }
  if (!Number.isFinite(num)) return null;
  const suf = (m[2] || '').toUpperCase();
  if (suf === 'K') num *= 1000; else if (suf === 'M') num *= 1000000;
  return Math.round(num);
}

async function fetchSubs(username) {
  const url = `https://t.me/${username}`;
  const res = await axios.get(url, { timeout: 12000, headers: { 'User-Agent': UA }, validateStatus: () => true });
  if (res.status !== 200) return { ok: false, reason: `http_${res.status}` };
  const $ = cheerio.load(res.data);
  const extra = $('.tgme_page_extra').first().text() || '';
  const em = extra.match(/([\d.,\s KMkm]+?)\s*(subscriber|member)/i);
  const subs = em ? humanToInt(em[1]) : null;
  if (subs == null) return { ok: false, reason: 'no_counter' };
  const title = $('.tgme_page_title span, .tgme_page_title').first().text().trim() || null;
  return { ok: true, subs, title };
}

async function pool(items, n, worker) {
  const out = []; let i = 0;
  const runners = Array.from({ length: n }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await worker(items[idx], idx); }
  });
  await Promise.all(runners);
  return out;
}

(async () => {
  console.log(`\n=== refresh-telegram-via-web ${DRY ? 'DRY-RUN' : 'LIVE'} ${ALL ? '(ALL)' : `(stale<${SINCE.toISOString()})`} ${LIMIT !== Infinity ? 'limit ' + LIMIT : ''} ===\n`);
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 25000 });
  const Canal = require('../models/Canal');
  const CanalScoreSnapshot = require('../models/CanalScoreSnapshot');
  const { calcularCAS } = require('../services/channelScoringV2');

  const q = { plataforma: 'telegram', estado: { $ne: 'eliminado' } };
  if (!ALL) q.$or = [{ 'estadisticas.ultimaActualizacion': { $lt: SINCE } }, { 'estadisticas.ultimaActualizacion': null }];
  let canales = await Canal.find(q).select('identificadorCanal nombreCanal categoria estadisticas verificacion antifraude crawler').lean();
  if (LIMIT !== Infinity) canales = canales.slice(0, LIMIT);
  console.log(`Target TG channels: ${canales.length}\n`);

  const stat = { updated: 0, not_found: 0, errors: 0, skipped_no_username: 0 };
  const samples = [];

  await pool(canales, CONCURRENCY, async (canal) => {
    const username = (canal.identificadorCanal || '').replace(/^@/, '').trim();
    if (!username || /[^a-zA-Z0-9_]/.test(username)) { stat.skipped_no_username++; return; }
    try {
      const r = await fetchSubs(username);
      if (!r.ok) { stat.not_found++; return; }
      const oldSubs = canal.estadisticas?.seguidores ?? 0;
      const enriched = {
        ...canal,
        estadisticas: { ...canal.estadisticas, seguidores: r.subs },
        verificacion: canal.verificacion || { tipoAcceso: 'declarado' },
        antifraude: canal.antifraude || { flags: [] },
        crawler: { ...canal.crawler, urlPublica: `https://t.me/${username}` },
      };
      let scores = null;
      try { scores = calcularCAS(enriched, [], canal.categoria || 'otros'); } catch (e) { /* keep prior scores */ }
      if (samples.length < 15) samples.push(`@${username.padEnd(22)} ${String(oldSubs).padStart(8)} → ${String(r.subs).padStart(8)}${scores ? `  CAS ${scores.CAS} ${scores.nivel}` : ''}`);
      if (DRY) { stat.updated++; return; }

      const update = {
        'estadisticas.seguidores': r.subs,
        'estadisticas.ultimaActualizacion': new Date(),
        'crawler.ultimaActualizacion': new Date(),
        'crawler.urlPublica': `https://t.me/${username}`,
      };
      if (scores) {
        Object.assign(update, {
          CAF: scores.CAF, CTF: scores.CTF, CER: scores.CER, CVS: scores.CVS,
          CAS: scores.CAS, nivel: scores.nivel, CPMDinamico: scores.CPMDinamico,
        });
      }
      await Canal.updateOne({ _id: canal._id }, { $set: update });
      if (scores) {
        await CanalScoreSnapshot.create({
          canalId: canal._id, fecha: new Date(),
          CAF: scores.CAF, CTF: scores.CTF, CER: scores.CER, CVS: scores.CVS, CAP: scores.CAP, CAS: scores.CAS,
          nivel: scores.nivel, CPMDinamico: scores.CPMDinamico,
          confianzaScore: scores.confianzaScore || 30, ratioCTF_CAF: scores.ratioCTF_CAF, flags: scores.flags || [],
          seguidores: r.subs, nicho: canal.categoria || 'otros', plataforma: 'telegram', version: 2,
        }).catch(() => {});
      }
      stat.updated++;
    } catch (e) { stat.errors++; }
  });

  console.log('Result:');
  console.log(`  updated          : ${stat.updated}`);
  console.log(`  not_found/private: ${stat.not_found}`);
  console.log(`  bad_username     : ${stat.skipped_no_username}`);
  console.log(`  errors           : ${stat.errors}`);
  console.log('\nSample updates (old → new subs):');
  samples.forEach(s => console.log('  ' + s));
  console.log(`\nNOW: ${new Date().toISOString()} mode=${DRY ? 'DRY' : 'APPLIED'}`);
  await mongoose.disconnect();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
