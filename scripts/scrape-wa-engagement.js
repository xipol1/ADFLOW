/**
 * scrape-wa-engagement.js — Phase 2A: extracción de engagement para canales
 * WhatsApp ya persistidos (plataforma:'whatsapp').
 *
 * Sin auth. Scrape de la landing pública whatsapp.com/channel/<id>, que
 * expone los últimos N mensajes con texto, timestamp y reactions.
 *
 * Por cada canal:
 *   1) Puppeteer abre la URL pública
 *   2) Extrae mensajes (multi-strategy: DOM selectors + regex fallback)
 *   3) Calcula avg_reactions, post_frequency_per_week, last_post_date,
 *      reactions_trend (últimos 10 vs 10 anteriores)
 *   4) Mapea a _mtprotoIntel-equivalent y llama calcularCAS
 *   5) Update Canal + crea CanalScoreSnapshot(version:3) con
 *      telegramIntel poblado (sí, reaprovecho el campo — su shape sirve
 *      perfectamente como envelope genérico de plataforma-intel)
 *
 * Rate limit: 10s entre canales para no encender alarmas en WA edge.
 * Sin proxy rotation — apropiado para nuestra escala (decenas/semana).
 */

require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const puppeteer = require('puppeteer');

const Canal = require('../models/Canal');
const CanalScoreSnapshot = require('../models/CanalScoreSnapshot');
const { calcularCAS } = require('../services/channelScoringV2');

const PAGE_TIMEOUT_MS = 35_000;
const RENDER_WAIT_MS = 4_000;
const SLEEP_BETWEEN_MS = 10_000;
const SCRAPE_ENGINE_VERSION = 3; // version tag para diferenciar de MTProto v2

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// Logging
// ─────────────────────────────────────────────────────────────────────────────
const todayStr = new Date().toISOString().slice(0, 10);
const logFile = path.resolve(__dirname, '..', 'audit', `scrape-wa-engagement-${todayStr}.log`);
const jsonFile = path.resolve(__dirname, '..', 'audit', `scrape-wa-engagement-${todayStr}.json`);
if (!fs.existsSync(path.dirname(logFile))) fs.mkdirSync(path.dirname(logFile), { recursive: true });
const logLines = [];
function log(line) {
  const stamped = `[${new Date().toISOString()}] ${line}`;
  console.log(stamped);
  logLines.push(stamped);
}
function flushLog() { fs.writeFileSync(logFile, logLines.join('\n') + '\n', 'utf8'); }

// ─────────────────────────────────────────────────────────────────────────────
// Spanish/English relative-time parser
// "hace 5 horas" / "5 hours ago" / "ayer" / "12 may" / "12/05/2025"
// ─────────────────────────────────────────────────────────────────────────────
const SP_MONTHS = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11 };
function parseTimestamp(str, refDate = new Date()) {
  if (!str) return null;
  const s = str.trim().toLowerCase();
  // Relative: "hace X min/hora(s)/día(s)/semana(s)" or "X minutes/hours/days ago"
  const rel = s.match(/(?:hace\s+)?(\d+)\s*(min|minuto|hora|hour|día|day|semana|week|mes|month)(?:s|es)?(?:\s+ago)?/);
  if (rel) {
    const n = parseInt(rel[1], 10);
    const unit = rel[2];
    const ms = /min/.test(unit) ? n * 60_000
             : /hora|hour/.test(unit) ? n * 3_600_000
             : /día|day/.test(unit) ? n * 86_400_000
             : /semana|week/.test(unit) ? n * 7 * 86_400_000
             : /mes|month/.test(unit) ? n * 30 * 86_400_000
             : 0;
    return new Date(refDate.getTime() - ms);
  }
  if (/ayer|yesterday/.test(s)) return new Date(refDate.getTime() - 86_400_000);
  if (/hoy|today/.test(s)) return refDate;
  // Date format DD/MM/YYYY or DD/MM/YY
  const dmy = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (dmy) {
    const y = dmy[3].length === 2 ? 2000 + parseInt(dmy[3], 10) : parseInt(dmy[3], 10);
    return new Date(y, parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10));
  }
  // "12 may" / "12 may 2024"
  const month = s.match(/(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)(?:\s+(\d{4}))?/);
  if (month) {
    const day = parseInt(month[1], 10);
    const mo = SP_MONTHS[month[2]];
    const y = month[3] ? parseInt(month[3], 10) : refDate.getFullYear();
    return new Date(y, mo, day);
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Extracción dentro del browser context
// ─────────────────────────────────────────────────────────────────────────────
async function extractFromPage(page) {
  return page.evaluate(() => {
    // Multi-strategy: try several patterns, return whichever yields data
    const out = { strategy: null, messages: [], debug: {} };

    // Strategy 1: look for div containers with role="row" or article tags
    const rows = document.querySelectorAll('div[role="row"], article, [data-testid*="message"]');
    if (rows.length > 0) {
      out.strategy = 'role-row';
      rows.forEach((r) => {
        const text = (r.innerText || '').trim();
        if (!text || text.length < 3) return;
        // Reactions: look for emoji + adjacent number pattern inside this row
        const reactionsMatch = [...r.innerText.matchAll(/([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}])\s*(\d+)/gu)];
        const reactions = reactionsMatch.map((m) => ({ emoji: m[1], count: parseInt(m[2], 10) }));
        // Timestamp: look for <time> or short relative-time strings
        const timeEl = r.querySelector('time');
        const timeStr = timeEl ? (timeEl.getAttribute('datetime') || timeEl.innerText) : null;
        out.messages.push({ text: text.slice(0, 800), timeStr, reactions });
      });
    }

    // Strategy 2: if nothing, regex on entire body for "emoji + number" + nearby time hints
    if (out.messages.length === 0) {
      out.strategy = 'body-regex';
      const text = document.body.innerText || '';
      // Split by likely message boundaries (double newlines, time-stamps lines)
      const blocks = text.split(/\n{2,}/).filter((b) => b.trim().length > 20);
      blocks.forEach((b) => {
        const reactionsMatch = [...b.matchAll(/([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}])\s*(\d+)/gu)];
        const reactions = reactionsMatch.map((m) => ({ emoji: m[1], count: parseInt(m[2], 10) }));
        if (reactions.length === 0) return; // probably not a message
        // Try to find timestamp near the start of the block
        const timeMatch = b.match(/(hace\s+\d+\s*\w+|ayer|hoy|\d+\s+(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)|\d{1,2}\/\d{1,2}\/\d{2,4}|\d+\s*(?:min|hour|day|week|month)s?\s+ago)/i);
        out.messages.push({ text: b.slice(0, 800), timeStr: timeMatch ? timeMatch[1] : null, reactions });
      });
    }

    // Header info (re-extract, defense in depth)
    const bodyText = document.body.innerText || '';
    const subsMatch = bodyText.match(/([\d.,]+)\s*(mil(?:lones?)?|M|K)?\s*(seguidores|followers)/i);
    out.subsRaw = subsMatch ? subsMatch[0] : null;
    out.title = document.title;
    out.h1 = document.querySelector('h1')?.innerText || null;
    out.debug.bodyTextLength = bodyText.length;
    out.debug.bodyExcerpt = bodyText.slice(0, 600);
    return out;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Spanish number parser (same as Phase 1)
// ─────────────────────────────────────────────────────────────────────────────
function parseSpanishNumber(input) {
  if (!input) return null;
  const m = input.match(/([\d.,]+)\s*(mil(?:lones?)?|millones?|M|K)?/i);
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
// Compute engagement metrics from extracted messages
// ─────────────────────────────────────────────────────────────────────────────
function computeMetrics(messages, refDate = new Date()) {
  const parsed = messages.map((m) => ({
    ...m,
    date: parseTimestamp(m.timeStr, refDate),
    reactionsTotal: (m.reactions || []).reduce((acc, r) => acc + (r.count || 0), 0),
  })).filter((m) => m.date && m.reactionsTotal >= 0);

  if (parsed.length === 0) {
    return {
      message_count: 0,
      avg_reactions: 0,
      reactions_trend: null,
      post_frequency_per_week: null,
      last_post_date: null,
    };
  }

  parsed.sort((a, b) => b.date - a.date); // newest first
  const reactionsCounts = parsed.map((m) => m.reactionsTotal);
  const avg = reactionsCounts.reduce((a, b) => a + b, 0) / reactionsCounts.length;

  let trend = null;
  if (parsed.length >= 20) {
    const recent10 = reactionsCounts.slice(0, 10);
    const older10 = reactionsCounts.slice(10, 20);
    const avgRec = recent10.reduce((a, b) => a + b, 0) / recent10.length;
    const avgOld = older10.reduce((a, b) => a + b, 0) / older10.length;
    trend = avgOld > 0 ? parseFloat(((avgRec - avgOld) / avgOld).toFixed(4)) : null;
  }

  let freq = null;
  if (parsed.length >= 2) {
    const newest = parsed[0].date;
    const oldest = parsed[parsed.length - 1].date;
    const spanWeeks = (newest - oldest) / (7 * 86_400_000);
    if (spanWeeks > 0) freq = parseFloat((parsed.length / spanWeeks).toFixed(2));
  }

  return {
    message_count: parsed.length,
    avg_reactions: Math.round(avg),
    reactions_trend: trend,
    post_frequency_per_week: freq,
    last_post_date: parsed[0].date,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
(async () => {
  if (!process.env.MONGODB_URI) { log('❌ MONGODB_URI missing'); flushLog(); process.exit(1); }

  const start = Date.now();
  await mongoose.connect(process.env.MONGODB_URI);
  log('✅ Mongo conectado');

  const canales = await Canal.find({ plataforma: 'whatsapp' }).lean();
  log(`Canales WA en DB: ${canales.length}`);
  if (canales.length === 0) {
    log('Nada que scrapear.');
    await mongoose.disconnect();
    flushLog();
    process.exit(0);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  log(`Puppeteer: ${await browser.version()}`);
  log('');

  const results = [];
  for (let i = 0; i < canales.length; i++) {
    const canal = canales[i];
    const url = canal.crawler?.urlPublica;
    log(`[${i + 1}/${canales.length}] ${canal.nombreCanal} (${canal._id}) — ${url}`);
    if (!url) {
      log(`  ✗ Sin crawler.urlPublica, skip`);
      results.push({ canalId: canal._id.toString(), name: canal.nombreCanal, status: 'no_url' });
      continue;
    }

    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-ES,es;q=0.9' });
    await page.setViewport({ width: 1280, height: 1600 }); // tall viewport para coger más mensajes

    let scrapeData;
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: PAGE_TIMEOUT_MS });
      await sleep(RENDER_WAIT_MS);
      // Try to scroll for more messages
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(1500);
      scrapeData = await extractFromPage(page);
    } catch (err) {
      log(`  ✗ Scrape FAIL: ${err.message}`);
      results.push({ canalId: canal._id.toString(), name: canal.nombreCanal, status: 'scrape_fail', error: err.message });
      await page.close();
      if (i < canales.length - 1) await sleep(SLEEP_BETWEEN_MS);
      continue;
    } finally {
      await page.close().catch(() => {});
    }

    const subs = parseSpanishNumber(scrapeData.subsRaw) ?? canal.estadisticas?.seguidores ?? 0;
    const metrics = computeMetrics(scrapeData.messages);
    log(`  ✓ strategy="${scrapeData.strategy}" msgs=${scrapeData.messages.length} parsed=${metrics.message_count} subs=${subs} avgReact=${metrics.avg_reactions} freq/w=${metrics.post_frequency_per_week} lastPost=${metrics.last_post_date?.toISOString().slice(0, 10)} trend=${metrics.reactions_trend}`);

    // Compute scoring via existing calcularCAS by mapping WA → MTProto-shaped fields
    const engagementRate = subs > 0 && metrics.avg_reactions > 0
      ? parseFloat((metrics.avg_reactions / subs).toFixed(4))
      : 0;

    // Use avg_reactions×10 as proxy for "promedioVisualizaciones" — on the WA
    // public page we never see views; reactions tend to be ~10% of views on
    // similar platforms, so ×10 gives a calcularCAS-comparable input.
    const enriched = {
      ...canal,
      estadisticas: {
        ...canal.estadisticas,
        seguidores: subs,
        promedioVisualizaciones: metrics.avg_reactions * 10,
      },
      verificacion: canal.verificacion || { tipoAcceso: 'declarado' },
      antifraude: canal.antifraude || { flags: [] },
      crawler: {
        ...canal.crawler,
        ultimaActualizacion: new Date(),
        urlPublica: url,
        ultimoPostNum: metrics.last_post_date ? Math.floor(metrics.last_post_date.getTime() / 1000) : null,
      },
      _mtprotoIntel: {
        engagement_rate: engagementRate,
        views_trend: metrics.reactions_trend, // proxy
        post_frequency_per_week: metrics.post_frequency_per_week,
        verified: !!canal.verificado,
      },
    };

    const scores = calcularCAS(enriched, [], 'medios_comunicacion');

    try {
      await Canal.updateOne({ _id: canal._id }, {
        $set: {
          'estadisticas.seguidores': subs,
          'estadisticas.ultimaActualizacion': new Date(),
          'estadisticas.promedioVisualizaciones': metrics.avg_reactions * 10,
          'crawler.ultimaActualizacion': new Date(),
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
        seguidores: subs,
        nicho: 'medios_comunicacion',
        plataforma: 'whatsapp',
        version: SCRAPE_ENGINE_VERSION,
        telegramIntel: {
          // El campo se llama `telegramIntel` pero su shape (avg_views, ER,
          // post_freq, trend, last_post, verified) es genérico — lo usamos
          // como envelope para data WA también. Comentado en este script.
          avg_views_last_20_posts: metrics.avg_reactions * 10, // proxy
          engagement_rate: engagementRate,
          post_frequency_per_week: metrics.post_frequency_per_week,
          views_trend: metrics.reactions_trend,
          last_post_date: metrics.last_post_date,
          verified: !!canal.verificado,
        },
      });

      log(`  ✓ Persisted: CAS=${scores.CAS} (${scores.nivel}) CPM=${scores.CPMDinamico} snap=${snap._id}`);
      results.push({
        canalId: canal._id.toString(), name: canal.nombreCanal,
        status: 'ok', subs, scrapeStrategy: scrapeData.strategy,
        metrics, scores, snapshotId: snap._id.toString(),
      });
    } catch (err) {
      log(`  ✗ Persist FAIL: ${err.message}`);
      results.push({ canalId: canal._id.toString(), name: canal.nombreCanal, status: 'persist_fail', error: err.message });
    }

    if (i < canales.length - 1) {
      log(`  ↳ sleeping ${SLEEP_BETWEEN_MS}ms (anti-rate-limit)...`);
      await sleep(SLEEP_BETWEEN_MS);
    }
  }

  await browser.close();

  log('');
  log('═══ RESUMEN ═══');
  const ok = results.filter((r) => r.status === 'ok');
  const fail = results.filter((r) => r.status !== 'ok');
  log(`OK: ${ok.length}/${canales.length}`);
  for (const r of ok) {
    log(`  - ${r.name}: subs=${r.subs}, avg_react=${r.metrics.avg_reactions}, freq/w=${r.metrics.post_frequency_per_week}, CAS=${r.scores.CAS} (${r.scores.nivel}), CPM=€${r.scores.CPMDinamico}`);
  }
  for (const r of fail) log(`  ✗ ${r.name}: ${r.status} ${r.error || ''}`);
  log(`Duración: ${((Date.now() - start) / 1000).toFixed(1)}s`);

  fs.writeFileSync(jsonFile, JSON.stringify(results, null, 2));
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
