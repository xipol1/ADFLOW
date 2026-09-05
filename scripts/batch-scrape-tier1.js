/**
 * batch-scrape-tier1.js — Probe MTProto sobre la lista hardcoded de handles
 * confirmados del Tier 1 outreach fintech ES.
 *
 * Llama a telegramIntelService.getChannelMetrics(handle) para cada uno.
 * getChannelMetrics es read-only (MTProto fetch) — NO persiste en Mongo.
 * Este script es por tanto una probe: verifica que el canal existe, es
 * scrapeable, y devuelve las métricas. Para persistirlas hace falta un
 * paso posterior (crear el Canal doc + syncAllMappedChannels).
 *
 * Necesita .env con TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_SESSION.
 *
 * Run:   node scripts/batch-scrape-tier1.js
 * Out:   audit/batch-scrape-tier1-YYYY-MM-DD.log  (resumen)
 *        stdout: log línea-a-línea
 */

require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const fs = require('fs');
const path = require('path');

const HANDLES = [
  '@LasInversionesDeJavi',
  '@invertirdesdecero_oficial',
  '@Bit2Me_ES',
  '@bit2menews',
];

const SLEEP_MS = 5000; // rate limit entre llamadas
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const todayStr = new Date().toISOString().slice(0, 10);
const logFile = path.resolve(__dirname, '..', 'audit', `batch-scrape-tier1-${todayStr}.log`);
const auditDir = path.dirname(logFile);
if (!fs.existsSync(auditDir)) fs.mkdirSync(auditDir, { recursive: true });

const logLines = [];
function log(line) {
  const stamped = `[${new Date().toISOString()}] ${line}`;
  console.log(stamped);
  logLines.push(stamped);
}

(async () => {
  log(`Batch scrape Tier 1 — ${HANDLES.length} handles`);
  log(`Rate limit: ${SLEEP_MS}ms entre llamadas`);
  log('');

  // Lazy require para que el script no rompa si las deps fallan antes del primer scrape
  const { getChannelMetrics } = require('../services/telegramIntelService');

  const results = [];
  for (let i = 0; i < HANDLES.length; i++) {
    const handle = HANDLES[i];
    const startedAt = new Date();
    log(`[${i + 1}/${HANDLES.length}] ${handle} — START`);

    try {
      const metrics = await getChannelMetrics(handle);
      const elapsed = Date.now() - startedAt.getTime();

      if (!metrics) {
        log(`[${i + 1}/${HANDLES.length}] ${handle} — FAIL (entity null, no es Channel) [${elapsed}ms]`);
        results.push({ handle, ok: false, error: 'entity null / not a Channel', elapsed_ms: elapsed });
      } else if (metrics.unscrapable) {
        log(`[${i + 1}/${HANDLES.length}] ${handle} — PARTIAL (unscrapable, sin participants_count) [${elapsed}ms]`);
        results.push({ handle, ok: false, error: 'unscrapable (canal privado/restringido)', metrics, elapsed_ms: elapsed });
      } else {
        log(
          `[${i + 1}/${HANDLES.length}] ${handle} — OK ` +
          `subs=${metrics.participants_count} ` +
          `avgViews=${metrics.avg_views_last_20_posts} ` +
          `engagement=${metrics.engagement_rate} ` +
          `lastPost=${metrics.last_post_date ? metrics.last_post_date.toISOString().slice(0, 10) : '—'} ` +
          `freq/w=${metrics.post_frequency_per_week} ` +
          `verified=${metrics.verified} ` +
          `[${elapsed}ms]`
        );
        results.push({ handle, ok: true, metrics, elapsed_ms: elapsed });
      }
    } catch (err) {
      const elapsed = Date.now() - startedAt.getTime();
      log(`[${i + 1}/${HANDLES.length}] ${handle} — FAIL "${err.message}" [${elapsed}ms]`);
      results.push({ handle, ok: false, error: err.message, elapsed_ms: elapsed });
    }

    if (i < HANDLES.length - 1) {
      log(`  ↳ sleeping ${SLEEP_MS}ms...`);
      await sleep(SLEEP_MS);
    }
  }

  // ── Resumen final ──
  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  log('');
  log('═══ RESUMEN ═══');
  log(`Total: ${results.length}`);
  log(`OK: ${ok.length}`);
  log(`Fallos: ${failed.length}`);
  if (failed.length > 0) {
    log('Detalle de fallos:');
    for (const f of failed) log(`  - ${f.handle}: ${f.error}`);
  }
  if (ok.length > 0) {
    log('Detalle de éxitos:');
    for (const r of ok) {
      const m = r.metrics;
      log(`  - ${r.handle}: ${m.participants_count} subs, ${m.avg_views_last_20_posts} avg views, ER=${m.engagement_rate}`);
    }
  }

  // Cleanup del cliente MTProto
  try {
    const { _client } = require('../services/telegramIntelService');
    // disconnectClient no está exportado, pero el proceso terminará igual.
  } catch (_) { /* no-op */ }

  // Volcar log al archivo
  fs.writeFileSync(logFile, logLines.join('\n') + '\n', 'utf8');
  log(`✅ Log escrito: ${logFile}`);

  // El cliente MTProto puede mantener el proceso abierto — forzamos exit.
  process.exit(failed.length === 0 ? 0 : 1);
})().catch((err) => {
  log(`💥 Batch failed (fatal): ${err.message}`);
  fs.writeFileSync(logFile, logLines.join('\n') + '\n', 'utf8');
  process.exit(2);
});
