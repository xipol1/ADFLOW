/**
 * probe-noticias-batch.js — Probe (read-only, no persist) los 59 handles
 * de la categoría NOTICIAS del export @canalestelegram (2018).
 *
 * Objetivo: ver qué sobrevive 8 años después + qué pinta tiene
 * (subs, last_post, ER) antes de decidir cuáles persistir.
 *
 * No escribe en Mongo. Sólo llama MTProto y dumpea JSON + tabla.
 */

require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const fs = require('fs');
const path = require('path');
const { getChannelMetrics } = require('../services/telegramIntelService');

const HANDLES = [
  'informe360', 'sigloxxiinfo', 'info288_nacional', 'info288', 'bestnoticias',
  'buenas_noticias', 'AlmeriaNoticias', 'canaldiariolvj', 'CanalVientoSur',
  'cronicasjudiciales1', 'titularesprensa', 'geoestrategia1', 'globovision_oficial',
  'NOTMEX', 'LaPatilla', 'latina', 'naciodigital', 'laquintacolumna',
  'noticiaschile', 'agenciaelvigia', 'nuevojujuy', 'reporte171', 'rtnoticias',
  'runrunes', 'siriaenespanol', 'sondeos', 'Diario2001Online', 'susogg',
  'awaken0904', 'noticiasequilibrio', 'guilhotinainfo', 'eldiarioes',
  'AlertaHonduras', 'rtenespanol', 'noticiasCol', 'estebanconcia',
  'elsaltodiario', 'NoticiasDeChina', 'teletipo', 'indefencechanel',
  'ElNotiWeb', 'MiguelDiazOK1', 'meneame_tops', 'communia', 'boschmagazine',
  'PlanBBunker', 'elindividual', 'newsonline24', 'nedvizha', 'nytimes',
  'CanalNoticiasglobo', 'SpiegelOnline', 'sputnik_fr', 'BBCBreaking',
  'wired_media', 'googlefactss', 'WIREDch', 'clickordie', 'worldnews',
];

const SLEEP_MS = 3000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const todayStr = new Date().toISOString().slice(0, 10);
const outFile = path.resolve(__dirname, '..', 'audit', `probe-noticias-${todayStr}.json`);
const logFile = path.resolve(__dirname, '..', 'audit', `probe-noticias-${todayStr}.log`);
if (!fs.existsSync(path.dirname(outFile))) fs.mkdirSync(path.dirname(outFile), { recursive: true });

const logLines = [];
function log(line) {
  const stamped = `[${new Date().toISOString()}] ${line}`;
  console.log(stamped);
  logLines.push(stamped);
}

(async () => {
  log(`probe-noticias: ${HANDLES.length} handles, sleep ${SLEEP_MS}ms`);
  const results = [];
  for (let i = 0; i < HANDLES.length; i++) {
    const handle = HANDLES[i];
    const start = Date.now();
    process.stdout.write(`[${i + 1}/${HANDLES.length}] @${handle.padEnd(25)} ... `);
    try {
      const m = await getChannelMetrics(handle);
      const elapsed = Date.now() - start;
      if (!m) {
        console.log('DEAD (entity null)');
        log(`  @${handle} → DEAD`);
        results.push({ handle, ok: false, error: 'entity null', elapsed_ms: elapsed });
      } else if (m.unscrapable) {
        console.log('PARTIAL (unscrapable)');
        log(`  @${handle} → PARTIAL: ${m.description?.slice(0, 60) || ''}`);
        results.push({ handle, ok: false, partial: true, metrics: m, elapsed_ms: elapsed });
      } else {
        const lastPost = m.last_post_date ? new Date(m.last_post_date).toISOString().slice(0, 10) : '—';
        const ageDays = m.last_post_date ? Math.floor((Date.now() - new Date(m.last_post_date)) / 86400000) : null;
        const status = ageDays === null ? 'ZOMBIE' : ageDays > 90 ? 'STALE' : ageDays > 30 ? 'SLOW' : 'ALIVE';
        console.log(`OK ${m.participants_count} subs, last=${lastPost} (${ageDays}d) → ${status}`);
        log(`  @${handle} → ${status} subs=${m.participants_count} ER=${m.engagement_rate} lastPost=${lastPost} verified=${m.verified}`);
        results.push({ handle, ok: true, status, metrics: m, elapsed_ms: elapsed });
      }
    } catch (err) {
      const elapsed = Date.now() - start;
      console.log(`FAIL: ${err.message}`);
      log(`  @${handle} → FAIL: ${err.message}`);
      results.push({ handle, ok: false, error: err.message, elapsed_ms: elapsed });
    }
    if (i < HANDLES.length - 1) await sleep(SLEEP_MS);
  }

  // ── Summary ──
  const alive = results.filter((r) => r.ok && r.status === 'ALIVE');
  const slow = results.filter((r) => r.ok && r.status === 'SLOW');
  const stale = results.filter((r) => r.ok && r.status === 'STALE');
  const zombie = results.filter((r) => r.ok && r.status === 'ZOMBIE');
  const dead = results.filter((r) => !r.ok && !r.partial);
  const partial = results.filter((r) => r.partial);

  log('');
  log('═══ RESUMEN ═══');
  log(`ALIVE  (último post ≤30d): ${alive.length}`);
  log(`SLOW   (último post 31-90d): ${slow.length}`);
  log(`STALE  (último post >90d):  ${stale.length}`);
  log(`ZOMBIE (sin posts visibles): ${zombie.length}`);
  log(`PARTIAL (unscrapable):       ${partial.length}`);
  log(`DEAD/FAIL:                   ${dead.length}`);
  log(`Survival rate: ${((alive.length + slow.length) / HANDLES.length * 100).toFixed(1)}%`);

  fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
  fs.writeFileSync(logFile, logLines.join('\n') + '\n');
  log(`✅ JSON: ${outFile}`);
  log(`✅ Log:  ${logFile}`);
  fs.writeFileSync(logFile, logLines.join('\n') + '\n');
  process.exit(0);
})().catch((e) => {
  log(`💥 Fatal: ${e.message}`);
  fs.writeFileSync(logFile, logLines.join('\n') + '\n');
  process.exit(2);
});
