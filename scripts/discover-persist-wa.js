/**
 * discover-persist-wa.js — Phase 1 WhatsApp Channels ingestion.
 *
 * Flujo:
 *   1) Para cada outlet en OUTLETS: HTTP fetch homepage, regex
 *      `whatsapp.com/channel/<id>` para descubrir la URL del canal WA.
 *   2) Para cada URL encontrada (+ las hardcoded en MANUAL_URLS):
 *      lanza puppeteer, navega a la página, extrae: nombre del canal,
 *      sub count (parseando "X mil seguidores"), verified, descripción.
 *   3) Persiste Canal con plataforma='whatsapp'.
 *
 * Phase 1 limitations:
 *   - NO engagement data: WA Channels public page no expone views/post,
 *     reactions ni post frequency sin auth.
 *   - NO snapshot generado: scoring v2.0 requiere las 6 métricas, sin
 *     engagement no se puede computar CAS realista. Snapshot queda para
 *     Phase 2 (WA Web session via Baileys).
 *   - Verified flag: best-effort, basado en presencia de check visual
 *     en el rendering. Puede dar falsos negativos.
 *
 * Idempotente: upsert por (plataforma, identificadorCanal). Errores per-
 * outlet/URL no abortan el batch.
 *
 * Run: node scripts/discover-persist-wa.js
 * Out: audit/discover-wa-YYYY-MM-DD.json + .log
 */

require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const mongoose = require('mongoose');
const puppeteer = require('puppeteer');

const Canal = require('../models/Canal');

// ─────────────────────────────────────────────────────────────────────────────
// Outlets — websites donde buscar el enlace al canal WA
// ─────────────────────────────────────────────────────────────────────────────
const OUTLETS = [
  { name: 'El País',                     url: 'https://elpais.com',              country: 'ES' },
  { name: 'ABC',                         url: 'https://www.abc.es',              country: 'ES' },
  { name: 'La Vanguardia',               url: 'https://www.lavanguardia.com',    country: 'ES' },
  { name: '20minutos',                   url: 'https://www.20minutos.es',        country: 'ES' },
  { name: 'eldiario.es',                 url: 'https://www.eldiario.es',         country: 'ES' },
  { name: 'OKDIARIO',                    url: 'https://okdiario.com',            country: 'ES' },
  { name: 'Cadena SER',                  url: 'https://cadenaser.com',           country: 'ES' },
  { name: 'Onda Cero',                   url: 'https://www.ondacero.es',         country: 'ES' },
  { name: 'La Razón',                    url: 'https://www.larazon.es',          country: 'ES' },
  { name: 'Europa Press',                url: 'https://www.europapress.es',      country: 'ES' },
  { name: 'EFE Noticias',                url: 'https://efe.com',                 country: 'ES' },
  { name: 'BBC Mundo',                   url: 'https://www.bbc.com/mundo',       country: 'INT' },
  { name: 'France 24 Español',           url: 'https://www.france24.com/es',     country: 'INT' },
  { name: 'Telecinco (Informativos)',    url: 'https://www.telecinco.es',        country: 'ES' },
  { name: 'Cuatro (Noticias)',           url: 'https://www.cuatro.com',          country: 'ES' },
  { name: 'Newtral',                     url: 'https://www.newtral.es',          country: 'ES' },
  { name: 'Infobae España',              url: 'https://www.infobae.com/espana',  country: 'ES' },
  { name: 'Libertad Digital',            url: 'https://www.libertaddigital.com', country: 'ES' },
  { name: 'Público',                     url: 'https://www.publico.es',          country: 'ES' },
];

// ─────────────────────────────────────────────────────────────────────────────
// MANUAL_URLS: pegar aquí URLs whatsapp.com/channel/... si la discovery
// automática no las encuentra. Formato: { name, url, country }.
// ─────────────────────────────────────────────────────────────────────────────
const MANUAL_URLS = [
  // (vacío por defecto — añadir cuando se conozcan)
];

const HTTP_TIMEOUT_MS = 15_000;
const PUPPETEER_PAGE_TIMEOUT = 30_000;
const SLEEP_BETWEEN_MS = 4_000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// Logging
// ─────────────────────────────────────────────────────────────────────────────
const todayStr = new Date().toISOString().slice(0, 10);
const logFile = path.resolve(__dirname, '..', 'audit', `discover-wa-${todayStr}.log`);
const jsonFile = path.resolve(__dirname, '..', 'audit', `discover-wa-${todayStr}.json`);
if (!fs.existsSync(path.dirname(logFile))) fs.mkdirSync(path.dirname(logFile), { recursive: true });
const logLines = [];
function log(line) {
  const stamped = `[${new Date().toISOString()}] ${line}`;
  console.log(stamped);
  logLines.push(stamped);
}
function flushLog() { fs.writeFileSync(logFile, logLines.join('\n') + '\n', 'utf8'); }

// ─────────────────────────────────────────────────────────────────────────────
// Spanish number parser
// "565 mil seguidores" → 565000
// "12,6 M" → 12_600_000
// "8,7 mil"  → 8700
// "999"     → 999
// ─────────────────────────────────────────────────────────────────────────────
function parseSpanishNumber(input) {
  if (!input) return null;
  const s = input.trim();
  const m = s.match(/([\d.,]+)\s*(mil(?:lones?)?|millones?|M|K)?/i);
  if (!m) return null;
  // Spanish decimal: "," is decimal, "." is thousands. Normalize:
  // - If has comma → comma is decimal: "12,6" → "12.6"; remove thousands dots.
  // - If only dots and number has dot in last 1-2 chars from end → could be decimal or thousands.
  // Heuristic: if there's a comma, drop all dots (thousands) and replace comma with dot.
  let numStr = m[1];
  if (numStr.includes(',')) {
    numStr = numStr.replace(/\./g, '').replace(',', '.');
  } else if (/\.\d{3}$/.test(numStr)) {
    // "12.300" = 12300 (Spanish thousands)
    numStr = numStr.replace(/\./g, '');
  }
  const num = parseFloat(numStr);
  if (isNaN(num)) return null;
  const unit = (m[2] || '').toLowerCase();
  if (/^mil$/i.test(unit) || unit === 'k') return Math.round(num * 1000);
  if (/mill|^m$/i.test(unit)) return Math.round(num * 1_000_000);
  return Math.round(num);
}

// ─────────────────────────────────────────────────────────────────────────────
// Discovery: scan outlet homepage for whatsapp.com/channel/<id>
// ─────────────────────────────────────────────────────────────────────────────
async function discoverWaUrl(outletUrl) {
  try {
    const res = await axios.get(outletUrl, {
      timeout: HTTP_TIMEOUT_MS,
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'es-ES,es;q=0.9' },
      maxRedirects: 5,
      validateStatus: (s) => s >= 200 && s < 400,
    });
    const html = res.data;
    // WA channel IDs are 22-24 char base64-like
    const regex = /https?:\/\/(?:www\.)?whatsapp\.com\/channel\/([A-Za-z0-9_-]{15,32})/g;
    const found = new Set();
    let m;
    while ((m = regex.exec(html)) !== null) found.add(m[1]);
    return [...found].map((id) => ({ id, url: `https://whatsapp.com/channel/${id}` }));
  } catch (err) {
    return { error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Puppeteer scrape of WA channel landing page
// ─────────────────────────────────────────────────────────────────────────────
async function scrapeWaChannel(browser, url) {
  const page = await browser.newPage();
  await page.setUserAgent(USER_AGENT);
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-ES,es;q=0.9' });
  await page.setViewport({ width: 1280, height: 1024 });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: PUPPETEER_PAGE_TIMEOUT });
    // Let JS settle
    await new Promise((r) => setTimeout(r, 1500));

    const data = await page.evaluate(() => {
      const text = (document.body.innerText || '').trim();
      // Name: usually h1 or h3 with the channel title
      const nameEl = document.querySelector('h1, h2, h3');
      const name = nameEl ? nameEl.innerText.trim() : (document.title || '').replace(' | WhatsApp', '').trim();
      // Sub count: regex on body text
      const subsMatch = text.match(/([\d.,]+)\s*(mil(?:lones?)?|M|K)?\s*(seguidores|followers|subscribers)/i);
      // Description / about
      const descMatch = text.match(/(?:About|Acerca de|Descripción)[\s:\n]+([^\n]{20,500})/i);
      // Verified: best-effort. WA puts a verified badge as svg/img near the name.
      // Check for textual "Verified" / "Verificado" hints, or aria-label.
      const hasVerifiedAria = !!document.querySelector('[aria-label*="verified" i], [aria-label*="verificado" i]');
      const hasVerifiedText = /\bverificad[oa]\b|\bverified\b/i.test(text);
      return {
        title: document.title,
        name,
        subsRaw: subsMatch ? subsMatch[0] : null,
        description: descMatch ? descMatch[1].trim() : '',
        verified: hasVerifiedAria || hasVerifiedText,
        bodyExcerpt: text.slice(0, 500),
      };
    });

    return data;
  } finally {
    await page.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Persist
// ─────────────────────────────────────────────────────────────────────────────
async function upsertWaCanal({ id, url, name, subs, verified, description, country, source }) {
  const setOnInsert = {
    plataforma: 'whatsapp',
    identificadorCanal: id,
    nombreCanal: name || '',
    descripcion: description || '',
    categoria: 'medios_comunicacion',
    idioma: 'es',
    estado: 'pendiente_verificacion',
    tags: ['discovered_wa', 'phase1_no_engagement', `country_${country}`, source ? `source_${source}` : null].filter(Boolean),
  };
  // Update path: refresh subs + verified + crawler.urlPublica
  const $set = {
    'estadisticas.seguidores': subs ?? 0,
    'estadisticas.ultimaActualizacion': new Date(),
    'crawler.urlPublica': url,
    'crawler.ultimaActualizacion': new Date(),
    verificado: !!verified,
  };
  if (description) $set.descripcion = description;

  const res = await Canal.findOneAndUpdate(
    { plataforma: 'whatsapp', identificadorCanal: id },
    { $setOnInsert: setOnInsert, $set },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const isNew = res.createdAt && (Date.now() - new Date(res.createdAt).getTime()) < 60_000;
  return { canal: res.toObject(), isNew };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
(async () => {
  if (!process.env.MONGODB_URI) { log('❌ MONGODB_URI missing'); flushLog(); process.exit(1); }

  const start = Date.now();
  log(`discover-persist-wa — ${OUTLETS.length} outlets + ${MANUAL_URLS.length} manual URLs`);
  log('');

  await mongoose.connect(process.env.MONGODB_URI);
  log('✅ Mongo conectado');

  // Phase A: discover WA URLs from outlet websites
  log('');
  log('═══ PHASE A: DISCOVERY (axios + regex) ═══');
  const discovered = [];
  for (let i = 0; i < OUTLETS.length; i++) {
    const outlet = OUTLETS[i];
    process.stdout.write(`[${i + 1}/${OUTLETS.length}] ${outlet.name.padEnd(30)} ... `);
    const result = await discoverWaUrl(outlet.url);
    if (Array.isArray(result)) {
      if (result.length === 0) {
        console.log('no WA link');
        log(`  ${outlet.name}: no WA link en homepage`);
      } else {
        console.log(`found ${result.length}: ${result.map((r) => r.id.slice(0, 12) + '…').join(', ')}`);
        log(`  ${outlet.name}: ${result.length} WA URL(s) found`);
        for (const r of result) discovered.push({ ...outlet, ...r, source: 'discovery' });
      }
    } else {
      console.log(`HTTP fail: ${result.error}`);
      log(`  ${outlet.name}: HTTP fail: ${result.error}`);
    }
    await sleep(1500); // light rate limit on outlet fetches
  }

  for (const m of MANUAL_URLS) {
    const idMatch = m.url.match(/channel\/([A-Za-z0-9_-]+)/);
    if (idMatch) discovered.push({ ...m, id: idMatch[1], source: 'manual' });
  }

  const unique = new Map();
  for (const d of discovered) {
    if (!unique.has(d.id)) unique.set(d.id, d);
  }
  log('');
  log(`Total URLs únicas para scrape: ${unique.size}`);

  if (unique.size === 0) {
    log('⚠ No hay nada que scrapear. Saliendo.');
    await mongoose.disconnect();
    fs.writeFileSync(jsonFile, JSON.stringify({ outlets: OUTLETS.length, discovered: 0 }, null, 2));
    flushLog();
    process.exit(0);
  }

  // Phase B: scrape each WA URL with puppeteer
  log('');
  log('═══ PHASE B: SCRAPE WA PAGES (puppeteer) ═══');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  log(`Puppeteer launched (${await browser.version()})`);

  const results = [];
  const list = [...unique.values()];
  for (let i = 0; i < list.length; i++) {
    const d = list[i];
    log(`[${i + 1}/${list.length}] ${d.name || '?'} — ${d.url}`);
    try {
      const t0 = Date.now();
      const scraped = await scrapeWaChannel(browser, d.url);
      const elapsed = Date.now() - t0;
      const subs = parseSpanishNumber(scraped.subsRaw);
      log(`  ✓ name="${scraped.name}" subs=${subs} (raw: "${scraped.subsRaw}") verified=${scraped.verified} [${elapsed}ms]`);

      // Persist
      try {
        const { canal, isNew } = await upsertWaCanal({
          id: d.id, url: d.url, name: scraped.name || d.name,
          subs, verified: scraped.verified, description: scraped.description,
          country: d.country, source: d.source,
        });
        log(`  ✓ Persisted: ${isNew ? 'NEW' : 'UPDATED'} _id=${canal._id}`);
        results.push({
          outlet: d.name, id: d.id, url: d.url, source: d.source, country: d.country,
          scraped, subs, persisted: true, isNew, canalId: canal._id.toString(),
        });
      } catch (persistErr) {
        log(`  ✗ Persist FAIL: ${persistErr.message}`);
        results.push({ outlet: d.name, id: d.id, url: d.url, scraped, subs, persisted: false, error: persistErr.message });
      }
    } catch (err) {
      log(`  ✗ Scrape FAIL: ${err.message}`);
      results.push({ outlet: d.name, id: d.id, url: d.url, scraped: null, persisted: false, error: err.message });
    }
    if (i < list.length - 1) await sleep(SLEEP_BETWEEN_MS);
  }

  await browser.close();

  // Summary
  const persisted = results.filter((r) => r.persisted);
  const failed = results.filter((r) => !r.persisted);
  log('');
  log('═══ RESUMEN ═══');
  log(`Outlets escaneados: ${OUTLETS.length}`);
  log(`URLs WA descubiertas: ${unique.size}`);
  log(`Persistidas OK: ${persisted.length}`);
  log(`Fallos: ${failed.length}`);
  for (const r of persisted) {
    log(`  - ${r.outlet} (${r.country}): ${r.subs ?? '?'} subs, verified=${r.scraped?.verified}, name="${r.scraped?.name}"`);
  }
  for (const r of failed) log(`  ✗ ${r.outlet}: ${r.error}`);
  log(`Duración: ${((Date.now() - start) / 1000).toFixed(1)}s`);

  fs.writeFileSync(jsonFile, JSON.stringify({ outlets: OUTLETS.length, discovered: unique.size, results }, null, 2));
  log(`✅ JSON: ${jsonFile}`);
  log(`✅ Log:  ${logFile}`);

  await mongoose.disconnect();
  flushLog();
  process.exit(0);
})().catch((err) => {
  log(`💥 Fatal: ${err.message}`);
  log(err.stack || '');
  flushLog();
  process.exit(2);
});
