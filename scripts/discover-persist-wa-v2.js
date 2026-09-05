/**
 * discover-persist-wa-v2.js — Phase 1 mejorado: stub data para canales WA
 * de medios. Selectores específicos basados en DOM real de WA.
 *
 * Cambios vs v1 (discover-persist-wa.js):
 *   - Lista ampliada a ~35 outlets (incluye los de las screenshots WA dir)
 *   - Selectores precisos: h1>span._as2p (name), img._a93a (verified badge),
 *     h5._9vd5 (description), h5._9vd5._9scy (subs)
 *   - Fallback URLs si homepage no tiene WA link: /sigueme,
 *     /redes-sociales, /newsletter, /suscribete, /whatsapp
 *   - $set refresca nombreCanal/descripcion/verificado en cada run
 *     (no sólo en insert)
 *
 * Idempotente vs los 12 persistidos en v1. Errores no abortan batch.
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
// Outlets — extraídos de las screenshots del directorio oficial WA + dir ES
// Cobertura: ~35 medios ES con presencia confirmada de canal WA.
// ─────────────────────────────────────────────────────────────────────────────
const OUTLETS = [
  // Generalistas grandes
  { name: 'El País',                  url: 'https://elpais.com',                       country: 'ES' },
  { name: 'ABC',                      url: 'https://www.abc.es',                       country: 'ES' },
  { name: 'La Vanguardia',            url: 'https://www.lavanguardia.com',             country: 'ES' },
  { name: 'La Razón',                 url: 'https://www.larazon.es',                   country: 'ES' },
  { name: '20minutos',                url: 'https://www.20minutos.es',                 country: 'ES' },
  { name: 'eldiario.es',              url: 'https://www.eldiario.es',                  country: 'ES' },
  { name: 'OKDIARIO',                 url: 'https://okdiario.com',                     country: 'ES' },
  { name: 'Público',                  url: 'https://www.publico.es',                   country: 'ES' },
  { name: 'Libertad Digital',         url: 'https://www.libertaddigital.com',          country: 'ES' },
  { name: 'Newtral',                  url: 'https://www.newtral.es',                   country: 'ES' },
  { name: 'Infobae España',           url: 'https://www.infobae.com/espana',           country: 'ES' },

  // Radio
  { name: 'Cadena SER',               url: 'https://cadenaser.com',                    country: 'ES' },
  { name: 'Onda Cero',                url: 'https://www.ondacero.es',                  country: 'ES' },
  { name: 'Radio 3 (RTVE)',           url: 'https://www.rtve.es/play/audios/radio-3/', country: 'ES' },

  // TV / Mediaset
  { name: 'Informativos Telecinco',   url: 'https://www.telecinco.es/informativos/',   country: 'ES' },
  { name: 'Noticias Cuatro',          url: 'https://www.cuatro.com',                   country: 'ES' },

  // Agencias y verticales
  { name: 'EFE Noticias',             url: 'https://efe.com',                          country: 'ES' },
  { name: 'Europa Press',             url: 'https://www.europapress.es',               country: 'ES' },

  // Regionales / locales verified
  { name: 'La Voz de Galicia',        url: 'https://www.lavozdegalicia.es',            country: 'ES' },
  { name: '3Cat (3CatInfo)',          url: 'https://www.3cat.cat',                     country: 'ES' },
  { name: 'EL CORREO',                url: 'https://www.elcorreo.com',                 country: 'ES' },
  { name: 'INFORMACIÓN',              url: 'https://www.informacion.es',               country: 'ES' },
  { name: 'Levante-EMV',              url: 'https://www.levante-emv.com',              country: 'ES' },
  { name: 'La Provincia',             url: 'https://www.laprovincia.es',               country: 'ES' },
  { name: 'Diario SUR',               url: 'https://www.diariosur.es',                 country: 'ES' },
  { name: 'El Norte de Castilla',     url: 'https://www.elnortedecastilla.es',         country: 'ES' },
  { name: 'Canarias7',                url: 'https://www.canarias7.es',                 country: 'ES' },
  { name: 'Málaga Hoy',               url: 'https://www.malagahoy.es',                 country: 'ES' },
  { name: 'Diario de Cádiz',          url: 'https://www.diariodecadiz.es',             country: 'ES' },
  { name: 'Diario de León',           url: 'https://www.diariodeleon.es',              country: 'ES' },
  { name: 'Diario LA RIOJA',          url: 'https://www.larioja.com',                  country: 'ES' },
  { name: 'El Día (Tenerife)',        url: 'https://www.eldia.es',                     country: 'ES' },
  { name: 'ABC de Sevilla',           url: 'https://sevilla.abc.es',                   country: 'ES' },

  // Internacional con redacción ES
  { name: 'BBC Mundo',                url: 'https://www.bbc.com/mundo',                country: 'INT' },
  { name: 'France 24 Español',        url: 'https://www.france24.com/es',              country: 'INT' },
  { name: 'NYT en Español',           url: 'https://www.nytimes.com/es',               country: 'INT' },
];

// Fallback paths a probar si homepage no expone el link WA
const FALLBACK_PATHS = ['/sigueme', '/redes-sociales', '/whatsapp', '/canales', '/suscribete', '/newsletter'];

const HTTP_TIMEOUT_MS = 12_000;
const PUPPETEER_PAGE_TIMEOUT = 35_000;
const SLEEP_BETWEEN_WA_MS = 6_000; // un poco más que v1, anti-ratelimit
const SLEEP_BETWEEN_DISCOVERY_MS = 1_200;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// Logging
// ─────────────────────────────────────────────────────────────────────────────
const todayStr = new Date().toISOString().slice(0, 10);
const logFile = path.resolve(__dirname, '..', 'audit', `discover-wa-v2-${todayStr}.log`);
const jsonFile = path.resolve(__dirname, '..', 'audit', `discover-wa-v2-${todayStr}.json`);
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
// ─────────────────────────────────────────────────────────────────────────────
function parseSpanishNumber(input) {
  if (!input) return null;
  const m = input.match(/([\d.,]+)\s*(mil(?:lones?)?|M|K)?/i);
  if (!m) return null;
  let numStr = m[1];
  if (numStr.includes(',')) numStr = numStr.replace(/\./g, '').replace(',', '.');
  else if (/\.\d{3}$/.test(numStr)) numStr = numStr.replace(/\./g, '');
  const num = parseFloat(numStr);
  if (isNaN(num)) return null;
  const unit = (m[2] || '').toLowerCase();
  if (/^mil$/i.test(unit) || unit === 'k') return Math.round(num * 1000);
  if (/mill|^m$/i.test(unit)) return Math.round(num * 1_000_000);
  return Math.round(num);
}

// ─────────────────────────────────────────────────────────────────────────────
// Discovery: fetch HTML + regex para t.me/channel/<id>
// ─────────────────────────────────────────────────────────────────────────────
async function fetchHtml(url) {
  try {
    const res = await axios.get(url, {
      timeout: HTTP_TIMEOUT_MS,
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'es-ES,es;q=0.9' },
      maxRedirects: 5,
      validateStatus: (s) => s >= 200 && s < 400,
    });
    return res.data;
  } catch (err) {
    return null;
  }
}

function extractWaIdsFromHtml(html) {
  if (!html) return [];
  const regex = /https?:\/\/(?:www\.)?whatsapp\.com\/channel\/([A-Za-z0-9_-]{15,32})/g;
  const found = new Set();
  let m;
  while ((m = regex.exec(html)) !== null) found.add(m[1]);
  return [...found];
}

async function discoverWaUrlsForOutlet(outlet) {
  // 1) homepage
  const homepageHtml = await fetchHtml(outlet.url);
  let ids = extractWaIdsFromHtml(homepageHtml);
  if (ids.length > 0) return { ids, source: 'homepage' };

  // 2) fallback paths (siempre con un timeout corto, no retries)
  const baseUrl = new URL(outlet.url).origin;
  for (const fp of FALLBACK_PATHS) {
    const html = await fetchHtml(baseUrl + fp);
    if (!html) continue;
    ids = extractWaIdsFromHtml(html);
    if (ids.length > 0) return { ids, source: `fallback:${fp}` };
    await sleep(800);
  }
  return { ids: [], source: 'none' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Puppeteer scrape con selectores precisos
// ─────────────────────────────────────────────────────────────────────────────
async function scrapeWaChannelPage(browser, url) {
  const page = await browser.newPage();
  await page.setUserAgent(USER_AGENT);
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-ES,es;q=0.9' });
  await page.setViewport({ width: 1280, height: 1024 });
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: PUPPETEER_PAGE_TIMEOUT });
    await sleep(2500); // let JS settle

    return await page.evaluate(() => {
      // Name: h1 > span._as2p (primer span dentro del h1)
      const h1Span = document.querySelector('h1 > span._as2p, h1 span._as2p');
      const name = h1Span ? h1Span.innerText.trim() : (document.querySelector('h1')?.innerText.trim() || '');

      // Verified: presencia de img._a93a dentro del h1 (badge oficial Meta)
      const verified = !!document.querySelector('h1 img._a93a, h1 ._a932 img');

      // Description: primer h5._9vd5 que NO tenga _9scy (subs)
      const descH5 = [...document.querySelectorAll('h5._9vd5')].find((h) => !h.classList.contains('_9scy'));
      const description = descH5 ? descH5.innerText.trim() : '';

      // Subs: h5._9vd5._9scy
      const subsH5 = document.querySelector('h5._9vd5._9scy');
      const subsRaw = subsH5 ? subsH5.innerText.trim() : null;

      // Photo: img._9vx6 dentro del action-icon
      const photoEl = document.querySelector('a[id="action-icon"] img._9vx6, img._9vx6');
      const photoUrl = photoEl ? photoEl.src : null;

      return {
        name, verified, description, subsRaw, photoUrl,
        title: document.title,
        bodyExcerpt: (document.body.innerText || '').slice(0, 300),
      };
    });
  } finally {
    await page.close().catch(() => {});
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Persist
// ─────────────────────────────────────────────────────────────────────────────
async function upsertWaCanal({ id, url, name, subs, verified, description, photo, country, source, outletName }) {
  const setOnInsert = {
    plataforma: 'whatsapp',
    identificadorCanal: id,
    categoria: 'medios_comunicacion',
    idioma: 'es',
    estado: 'pendiente_verificacion',
    tags: ['discovered_wa', 'phase1_no_engagement', `country_${country}`, source ? `source_${source}` : null].filter(Boolean),
  };
  // En update refrescamos campos que pueden cambiar entre runs
  const $set = {
    nombreCanal: name || outletName || '',
    descripcion: description || '',
    'estadisticas.seguidores': subs ?? 0,
    'estadisticas.ultimaActualizacion': new Date(),
    'crawler.urlPublica': url,
    'crawler.ultimaActualizacion': new Date(),
    verificado: !!verified,
  };
  if (photo) $set.foto = photo;

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
  log(`discover-persist-wa-v2 — ${OUTLETS.length} outlets`);
  log('');

  await mongoose.connect(process.env.MONGODB_URI);
  log('✅ Mongo conectado');

  // ── Phase A: discovery ──
  log('');
  log('═══ PHASE A: DISCOVERY (homepage + fallback paths) ═══');
  const discovered = [];
  for (let i = 0; i < OUTLETS.length; i++) {
    const outlet = OUTLETS[i];
    process.stdout.write(`[${i + 1}/${OUTLETS.length}] ${outlet.name.padEnd(28)} ... `);
    const { ids, source } = await discoverWaUrlsForOutlet(outlet);
    if (ids.length === 0) {
      console.log('no WA link');
    } else {
      console.log(`${ids.length} found via ${source}: ${ids.map((i) => i.slice(0, 12) + '…').join(', ')}`);
      for (const id of ids) {
        discovered.push({ ...outlet, id, url: `https://whatsapp.com/channel/${id}`, source });
      }
    }
    log(`  ${outlet.name}: ${ids.length} via ${source}`);
    await sleep(SLEEP_BETWEEN_DISCOVERY_MS);
  }

  // dedup
  const unique = new Map();
  for (const d of discovered) if (!unique.has(d.id)) unique.set(d.id, d);
  const list = [...unique.values()];
  log('');
  log(`Total URLs únicas para scrape: ${list.size || list.length}`);
  if (list.length === 0) {
    log('Nada que scrapear.');
    await mongoose.disconnect();
    flushLog();
    process.exit(0);
  }

  // ── Phase B: scrape + persist ──
  log('');
  log('═══ PHASE B: SCRAPE WA PAGES (puppeteer, selectores precisos) ═══');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  log(`Puppeteer launched (${await browser.version()})`);

  const results = [];
  for (let i = 0; i < list.length; i++) {
    const d = list[i];
    log(`[${i + 1}/${list.length}] ${d.name} — ${d.url}`);
    try {
      const t0 = Date.now();
      const scraped = await scrapeWaChannelPage(browser, d.url);
      const subs = parseSpanishNumber(scraped.subsRaw);
      const elapsed = Date.now() - t0;
      log(`  scrape OK [${elapsed}ms] name="${scraped.name}" verified=${scraped.verified} subs=${subs} (raw="${scraped.subsRaw}") desc="${(scraped.description || '').slice(0, 60)}…"`);

      try {
        const { canal, isNew } = await upsertWaCanal({
          id: d.id, url: d.url,
          name: scraped.name, subs, verified: scraped.verified, description: scraped.description, photo: scraped.photoUrl,
          country: d.country, source: d.source, outletName: d.name,
        });
        log(`  ✓ Persisted ${isNew ? 'NEW' : 'UPDATED'} _id=${canal._id}`);
        results.push({
          outlet: d.name, id: d.id, url: d.url, country: d.country, source: d.source,
          scraped, subs, persisted: true, isNew, canalId: canal._id.toString(),
        });
      } catch (persistErr) {
        log(`  ✗ Persist FAIL: ${persistErr.message}`);
        results.push({ outlet: d.name, id: d.id, url: d.url, scraped, subs, persisted: false, error: persistErr.message });
      }
    } catch (err) {
      log(`  ✗ Scrape FAIL: ${err.message}`);
      results.push({ outlet: d.name, id: d.id, url: d.url, persisted: false, error: err.message });
    }
    if (i < list.length - 1) await sleep(SLEEP_BETWEEN_WA_MS);
  }

  await browser.close();

  // Summary
  const persisted = results.filter((r) => r.persisted);
  const failed = results.filter((r) => !r.persisted);
  const verified = persisted.filter((r) => r.scraped?.verified);
  log('');
  log('═══ RESUMEN ═══');
  log(`Outlets escaneados: ${OUTLETS.length}`);
  log(`URLs WA descubiertas: ${list.length}`);
  log(`Persistidas: ${persisted.length}`);
  log(`Verified detectados: ${verified.length}/${persisted.length}`);
  log(`Fallos: ${failed.length}`);
  log('');
  log('Detalle persistidos (ordenado por subs):');
  persisted.sort((a, b) => (b.subs || 0) - (a.subs || 0));
  for (const r of persisted) {
    const tick = r.scraped?.verified ? '✓' : ' ';
    log(`  ${tick} ${r.outlet.padEnd(28)} ${(r.subs || 0).toString().padStart(8)} subs  name="${r.scraped?.name}"`);
  }
  if (failed.length) {
    log('');
    log('Fallos:');
    for (const r of failed) log(`  ✗ ${r.outlet}: ${r.error}`);
  }
  log(`Duración: ${((Date.now() - start) / 1000).toFixed(1)}s`);

  fs.writeFileSync(jsonFile, JSON.stringify({ outlets: OUTLETS.length, discovered: list.length, results }, null, 2));
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
