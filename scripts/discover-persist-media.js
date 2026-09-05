/**
 * discover-persist-media.js — Discover + probe + persist canales TG de
 * medios/periódicos en español.
 *
 * Por cada outlet de la lista:
 *   1) Fetch homepage HTML
 *   2) Extrae links t.me/* (ignora share/join/joinchat/+)
 *   3) Si encuentra ≥1 handle "canónico" → MTProto probe via
 *      getChannelMetrics
 *   4) Si scrapeable → upsert Canal + snapshot (mismo pattern que Tier 1)
 *
 * Idempotente: upsert por (plataforma, identificadorCanal).
 * Errores por outlet NO abortan el batch.
 *
 * Run:   node scripts/discover-persist-media.js
 * Out:   audit/discover-media-YYYY-MM-DD.log
 *        audit/discover-media-YYYY-MM-DD.json (datos crudos)
 */

require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');

const Canal = require('../models/Canal');
const CanalScoreSnapshot = require('../models/CanalScoreSnapshot');
const { getChannelMetrics } = require('../services/telegramIntelService');
const { calcularCAS } = require('../services/channelScoringV2');

// ─────────────────────────────────────────────────────────────────────────────
// Outlets — priority subset fintech-aligned + generalistas + cripto + LatAm
// ─────────────────────────────────────────────────────────────────────────────
const OUTLETS = [
  // ES — generalistas con presencia TG conocida
  { name: 'El Confidencial',                url: 'https://www.elconfidencial.com',         subVertical: 'medio_generalista' },
  { name: 'eldiario.es',                    url: 'https://www.eldiario.es',                subVertical: 'medio_generalista' },
  { name: 'Público',                        url: 'https://www.publico.es',                 subVertical: 'medio_generalista' },
  { name: 'HuffPost España',                url: 'https://www.huffingtonpost.es',          subVertical: 'medio_generalista' },

  // ES — económicos / financieros
  { name: 'Expansión',                      url: 'https://www.expansion.com',              subVertical: 'medio_economico' },
  { name: 'Cinco Días',                     url: 'https://cincodias.elpais.com',           subVertical: 'medio_economico' },
  { name: 'El Economista',                  url: 'https://www.eleconomista.es',            subVertical: 'medio_economico' },
  { name: 'Bolsamanía',                     url: 'https://www.bolsamania.com',             subVertical: 'medio_economico' },
  { name: 'Estrategias de Inversión',       url: 'https://www.estrategiasdeinversion.com', subVertical: 'medio_economico' },

  // ES — tech
  { name: 'Xataka',                         url: 'https://www.xataka.com',                 subVertical: 'medio_tech' },
  { name: 'Hipertextual',                   url: 'https://hipertextual.com',               subVertical: 'medio_tech' },

  // Cripto verticales en español
  { name: 'Cointelegraph en Español',       url: 'https://es.cointelegraph.com',           subVertical: 'medio_cripto' },
  { name: 'CriptoNoticias',                 url: 'https://www.criptonoticias.com',         subVertical: 'medio_cripto' },
  { name: 'DiarioBitcoin',                  url: 'https://www.diariobitcoin.com',          subVertical: 'medio_cripto' },

  // LatAm — generalistas + económicos
  { name: 'Infobae',                        url: 'https://www.infobae.com',                subVertical: 'medio_generalista_latam' },
  { name: 'iProfesional',                   url: 'https://www.iprofesional.com',           subVertical: 'medio_economico_latam' },

  // Internacional con redacción ES
  { name: 'BBC Mundo',                      url: 'https://www.bbc.com/mundo',              subVertical: 'medio_internacional_es' },
  { name: 'DW Español',                     url: 'https://www.dw.com/es',                  subVertical: 'medio_internacional_es' },
];

const HTTP_TIMEOUT_MS = 15_000;
const SLEEP_BETWEEN_MS = 3_000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// Logging
// ─────────────────────────────────────────────────────────────────────────────
const todayStr = new Date().toISOString().slice(0, 10);
const logFile = path.resolve(__dirname, '..', 'audit', `discover-media-${todayStr}.log`);
const jsonFile = path.resolve(__dirname, '..', 'audit', `discover-media-${todayStr}.json`);
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
// Handle extraction
// ─────────────────────────────────────────────────────────────────────────────
const EXCLUDED_PATHS = /^(share|join|joinchat|addstickers|setlanguage|proxy|joinchannel|c)\//i;

function extractTelegramHandles(html, baseUrl) {
  const $ = cheerio.load(html);
  const found = new Map(); // handle -> count

  // 1) anchor hrefs
  $('a[href*="t.me/"], a[href*="telegram.me/"]').each((_, el) => {
    const href = $(el).attr('href');
    const h = parseHandleFromUrl(href);
    if (h) found.set(h, (found.get(h) || 0) + 1);
  });

  // 2) meta tags + script content (sometimes TG is in og:see_also or JSON-LD)
  const fullText = $.html();
  const regex = /https?:\/\/(?:t\.me|telegram\.me)\/([A-Za-z0-9_]{4,32})/g;
  let m;
  while ((m = regex.exec(fullText)) !== null) {
    const candidate = m[1];
    if (!EXCLUDED_PATHS.test(candidate)) {
      found.set(candidate, (found.get(candidate) || 0) + 1);
    }
  }

  // Rank by count
  return [...found.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([handle, count]) => ({ handle, count }));
}

function parseHandleFromUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url, 'https://t.me');
    if (!/t\.me|telegram\.me/.test(u.hostname)) return null;
    const segment = u.pathname.replace(/^\/+/, '').split('/')[0];
    if (!segment) return null;
    if (segment.startsWith('+')) return null; // private invite link
    if (EXCLUDED_PATHS.test(segment + '/')) return null;
    if (!/^[A-Za-z0-9_]{4,32}$/.test(segment)) return null;
    return segment;
  } catch {
    return null;
  }
}

async function fetchHomepage(url) {
  const res = await axios.get(url, {
    timeout: HTTP_TIMEOUT_MS,
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html,application/xhtml+xml' },
    maxRedirects: 5,
    validateStatus: (s) => s >= 200 && s < 400,
  });
  return res.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Persist (mismo pattern que persist-tier1)
// ─────────────────────────────────────────────────────────────────────────────
async function upsertCanal({ handle, name, subVertical }) {
  const setOnInsert = {
    plataforma: 'telegram',
    identificadorCanal: `@${handle}`,
    nombreCanal: name,
    categoria: 'medios_comunicacion',
    idioma: 'es',
    estado: 'pendiente_verificacion',
    tags: [subVertical],
  };
  const res = await Canal.findOneAndUpdate(
    { plataforma: 'telegram', identificadorCanal: { $in: [`@${handle}`, handle, `@${handle.toLowerCase()}`] } },
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
      seguidores: metrics.participants_count ?? canal.estadisticas?.seguidores ?? 0,
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
  const scores = calcularCAS(enriched, [], canal.categoria || 'medios_comunicacion');

  await Canal.updateOne(
    { _id: canal._id },
    {
      $set: {
        'estadisticas.seguidores': metrics.participants_count ?? 0,
        'estadisticas.ultimaActualizacion': new Date(),
        'crawler.ultimaActualizacion': new Date(),
        'crawler.urlPublica': `https://t.me/${metrics.username}`,
        CAF: scores.CAF,
        CTF: scores.CTF,
        CER: scores.CER,
        CVS: scores.CVS,
        CAS: scores.CAS,
        nivel: scores.nivel,
        CPMDinamico: scores.CPMDinamico,
        'verificacion.confianzaScore': scores.confianzaScore,
        'antifraude.ratioCTF_CAF': scores.ratioCTF_CAF,
        'antifraude.flags': scores.flags,
        'antifraude.ultimaRevision': new Date(),
      },
    },
  );

  const snap = await CanalScoreSnapshot.create({
    canalId: canal._id,
    fecha: new Date(),
    CAF: scores.CAF, CTF: scores.CTF, CER: scores.CER, CVS: scores.CVS,
    CAP: canal.CAP ?? 50, CAS: scores.CAS,
    nivel: scores.nivel, CPMDinamico: scores.CPMDinamico,
    confianzaScore: scores.confianzaScore,
    ratioCTF_CAF: scores.ratioCTF_CAF, flags: scores.flags,
    seguidores: metrics.participants_count ?? 0,
    nicho: canal.categoria || 'medios_comunicacion',
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

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
(async () => {
  if (!process.env.MONGODB_URI) { log('❌ MONGODB_URI missing'); flushLog(); process.exit(1); }
  if (!process.env.TELEGRAM_API_ID) { log('❌ TELEGRAM_API_ID missing'); flushLog(); process.exit(1); }

  const start = Date.now();
  log(`discover-persist-media — ${OUTLETS.length} outlets`);
  log('');

  await mongoose.connect(process.env.MONGODB_URI);
  log('✅ Mongo conectado');
  log('');

  const summary = [];

  for (let i = 0; i < OUTLETS.length; i++) {
    const outlet = OUTLETS[i];
    const idx = `[${i + 1}/${OUTLETS.length}]`;
    log(`${idx} ${outlet.name} — ${outlet.url}`);

    const record = { outlet: outlet.name, url: outlet.url, subVertical: outlet.subVertical };

    // ── Discovery ──
    let html;
    try {
      html = await fetchHomepage(outlet.url);
    } catch (err) {
      log(`  ✗ HTTP fetch failed: ${err.message}`);
      record.status = 'http_failed';
      record.error = err.message;
      summary.push(record);
      await sleep(SLEEP_BETWEEN_MS);
      continue;
    }

    const candidates = extractTelegramHandles(html, outlet.url);
    record.candidates = candidates;
    if (candidates.length === 0) {
      log(`  ✗ Ningún link t.me/* encontrado`);
      record.status = 'no_tg_link';
      summary.push(record);
      await sleep(SLEEP_BETWEEN_MS);
      continue;
    }

    const chosen = candidates[0];
    log(`  → ${candidates.length} candidatos. Top: @${chosen.handle} (×${chosen.count}). Otros: ${candidates.slice(1, 4).map((c) => `@${c.handle}(${c.count})`).join(', ') || 'none'}`);
    record.chosen = chosen.handle;

    // ── Probe ──
    let metrics;
    try {
      metrics = await getChannelMetrics(chosen.handle);
    } catch (err) {
      log(`  ✗ MTProto probe falló: ${err.message}`);
      record.status = 'probe_failed';
      record.error = err.message;
      summary.push(record);
      await sleep(SLEEP_BETWEEN_MS);
      continue;
    }
    if (!metrics) {
      log(`  ✗ Probe devolvió null (entity no es Channel)`);
      record.status = 'not_a_channel';
      summary.push(record);
      await sleep(SLEEP_BETWEEN_MS);
      continue;
    }
    if (metrics.unscrapable) {
      log(`  ⚠ Probe OK pero unscrapable (canal privado/restringido)`);
      record.status = 'unscrapable';
      record.metrics = metrics;
      summary.push(record);
      await sleep(SLEEP_BETWEEN_MS);
      continue;
    }
    log(`  ✓ Probe OK: ${metrics.participants_count} subs, ${metrics.avg_views_last_20_posts} avg views, ER=${metrics.engagement_rate}, lastPost=${metrics.last_post_date?.toISOString().slice(0, 10)}`);

    // ── Persist ──
    try {
      const { canal, isNew } = await upsertCanal({ handle: chosen.handle, name: outlet.name, subVertical: outlet.subVertical });
      const { scores, snapshotId } = await syncOne(canal, metrics);
      log(`  ✓ Persisted: ${isNew ? 'NEW' : 'UPDATED'} _id=${canal._id} CAS=${scores.CAS} (${scores.nivel}) CPM=${scores.CPMDinamico} snapshot=${snapshotId}`);
      record.status = 'persisted';
      record.canalId = canal._id.toString();
      record.snapshotId = snapshotId.toString();
      record.metrics = metrics;
      record.scores = scores;
      record.isNew = isNew;
    } catch (err) {
      log(`  ✗ Persist falló: ${err.message}`);
      record.status = 'persist_failed';
      record.error = err.message;
    }

    summary.push(record);
    await sleep(SLEEP_BETWEEN_MS);
  }

  // ── Resumen ──
  const byStatus = summary.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
  log('');
  log('═══ RESUMEN ═══');
  log(`Total outlets: ${summary.length}`);
  for (const [s, n] of Object.entries(byStatus)) log(`  ${s}: ${n}`);
  log(`Duración: ${((Date.now() - start) / 1000).toFixed(1)}s`);

  const persisted = summary.filter((r) => r.status === 'persisted');
  if (persisted.length > 0) {
    log('');
    log('Persistidos:');
    for (const r of persisted) {
      log(`  - ${r.outlet} (@${r.chosen}): ${r.metrics.participants_count} subs, CAS=${r.scores.CAS} (${r.scores.nivel}), CPM=${r.scores.CPMDinamico}`);
    }
  }

  await mongoose.disconnect();
  fs.writeFileSync(jsonFile, JSON.stringify(summary, null, 2), 'utf8');
  log(`✅ JSON: ${jsonFile}`);
  log(`✅ Log:  ${logFile}`);
  flushLog();
  process.exit(0);
})().catch((err) => {
  log(`💥 Fatal: ${err.message}`);
  log(err.stack || '');
  flushLog();
  process.exit(2);
});
