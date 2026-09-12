/**
 * Enrich WhatsApp ChannelCandidate rows with REAL metadata via Baileys.
 *
 * CHANNELS ONLY. Groups (chat.whatsapp.com/...) are out of scope for
 * ChannelAd — only newsletter-style channels (whatsapp.com/channel/...)
 * are enriched. Group candidates are left untouched here; see
 * scripts/reject-wa-groups.js to mark them as 'rejected' in bulk.
 *
 * Walks every WA candidate with kind='channel' and raw_metrics.channelCode,
 * calls sock.newsletterMetadata('invite', channelCode) for each, and writes
 * the result back to raw_metrics.baileys. Original scraped values are kept
 * untouched for audit.
 *
 * Schema:
 *   raw_metrics.baileys = {
 *     fetched_at: ISO date,
 *     ok: boolean,
 *     error: string,            // when ok=false
 *     jid, subscribers, verification, description, name, picture_url,
 *     last_message_at, invite, creation_time
 *   }
 *
 * Status transitions:
 *   - newsletterMetadata says "not_found" → status='rejected',
 *       rejection_reason='baileys: channel revoked'
 *   - Otherwise candidate stays in its current status; just gets enriched.
 *
 * Read-only by default. Pass --apply to write to DB.
 *
 * Usage:
 *   node scripts/enrich-wa-candidates.js                  # dry run, no DB writes
 *   node scripts/enrich-wa-candidates.js --apply          # full enrichment
 *   node scripts/enrich-wa-candidates.js --apply --limit 50
 *   node scripts/enrich-wa-candidates.js --apply --resume # skip already-enriched
 */
require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { openSystemSocket, getNewsletterMetadata } = require('../services/baileys/systemSocket');

const APPLY = process.argv.includes('--apply');
const RESUME = process.argv.includes('--resume');
const limitIdx = process.argv.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(process.argv[limitIdx + 1], 10) : 0;

// Conservative rate limit — Baileys/WhatsApp throttle aggressively.
// 2.5s avg → ~24 req/min → ~36 min for ~870 channels.
const RATE_LIMIT_MS = 2500;
const RETRY_BACKOFF_MS = 10000;
const MAX_CONSECUTIVE_FAILS = 8;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value).replace(/\r?\n/g, ' ').trim();
  if (/[",;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows, headers) {
  const lines = [headers.join(',')];
  for (const r of rows) lines.push(headers.map((h) => csvEscape(r[h])).join(','));
  return lines.join('\n');
}

/**
 * Normalize newsletter metadata into our schema. Baileys returns a fairly raw
 * shape with various optional fields depending on protocol version.
 */
function normalizeNewsletter(meta) {
  if (!meta || typeof meta !== 'object') return null;
  const subs = meta.subscribers_count ?? meta.subscribers ?? meta.size ?? 0;
  const lastTs = meta.last_msg_timestamp ?? meta.last_post_timestamp ?? meta.t ?? 0;
  return {
    jid: meta.id || meta.jid || '',
    subscribers: Number(subs) || 0,
    verification: String(meta.verification || 'UNVERIFIED').toUpperCase(),
    description: (meta.description || '').slice(0, 600),
    name: meta.name || '',
    picture_url: meta.preview || meta.picture || '',
    last_message_at: lastTs ? new Date(Number(lastTs) * 1000).toISOString() : '',
    invite: meta.invite || '',
    creation_time: meta.creation_time ? new Date(Number(meta.creation_time) * 1000).toISOString() : '',
  };
}

(async () => {
  const started = Date.now();
  console.log('═════════════════════════════════════════════════════════════');
  console.log('  Enrich WA channels via Baileys system session');
  console.log('═════════════════════════════════════════════════════════════');
  console.log(`  Mode:   ${APPLY ? 'APPLY (writes to DB)' : 'DRY RUN (no DB writes)'}`);
  console.log(`  Scope:  kind='channel' only (groups are skipped)`);
  if (LIMIT) console.log(`  Limit:  ${LIMIT}`);
  if (RESUME) console.log(`  Resume: skip already-enriched`);
  console.log('');

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is missing.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const ChannelCandidate = require('../models/ChannelCandidate');

  // ── Load channels to enrich ──────────────────────────────────────────
  const baseQuery = {
    plataforma: 'whatsapp',
    status: { $in: ['pending_review', 'approved'] },
    'raw_metrics.channelCode': { $exists: true, $ne: '' },
    'raw_metrics.kind': 'channel',
  };
  if (RESUME) baseQuery['raw_metrics.baileys.fetched_at'] = { $exists: false };

  let candidates = await ChannelCandidate.find(baseQuery, {
    username: 1,
    raw_metrics: 1,
    status: 1,
  }).lean();
  if (LIMIT > 0) candidates = candidates.slice(0, LIMIT);

  console.log(`  Channels to enrich: ${candidates.length}\n`);
  if (candidates.length === 0) {
    console.log('  Nothing to enrich. Exiting.');
    await mongoose.disconnect();
    process.exit(0);
  }

  // ── Open the system socket ───────────────────────────────────────────
  let session;
  try {
    session = await openSystemSocket({ printQrToTerminal: false });
  } catch (err) {
    console.error(`[Enrich] Failed to open socket: ${err.message}`);
    await mongoose.disconnect();
    process.exit(1);
  }
  try {
    await session.ready;
  } catch (err) {
    console.error(`[Enrich] Socket did not become ready: ${err.message}`);
    console.error('Did you run: node scripts/baileys-system-bootstrap.js ?');
    await session.end();
    await mongoose.disconnect();
    process.exit(1);
  }

  // Give Baileys a beat to settle after handshake
  await sleep(2000);

  // ── Walk candidates ──────────────────────────────────────────────────
  const stats = {
    total: candidates.length,
    enriched: 0,
    rejected_revoked: 0,
    soft_failed: 0,
    rate_limited: 0,
    write_errors: 0,
  };
  const recoveredRows = [];
  const failedRows = [];
  let consecutiveFails = 0;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const code = c.raw_metrics?.channelCode;
    if (!code) {
      stats.soft_failed++;
      continue;
    }

    let meta = null;
    try {
      const raw = await getNewsletterMetadata(session.sock, code);
      if (raw?._error) {
        meta = { ok: false, error: raw._error };
      } else {
        const n = normalizeNewsletter(raw);
        meta = n ? { ok: true, ...n } : { ok: false, error: 'normalize_failed' };
      }
    } catch (err) {
      meta = { ok: false, error: err.message?.slice(0, 200) || 'unknown' };
    }

    meta.fetched_at = new Date().toISOString();

    if (meta.ok) {
      stats.enriched++;
      consecutiveFails = 0;
      recoveredRows.push({
        candidate_id: c._id.toString(),
        username: c.username,
        channelCode: code,
        baileys_name: meta.name || '',
        subscribers: meta.subscribers || '',
        verification: meta.verification || '',
        last_message_at: meta.last_message_at || '',
      });
    } else {
      consecutiveFails++;
      const reason = meta.error || 'unknown';
      if (reason === 'rate_limited') {
        stats.rate_limited++;
        console.log(`  [${i + 1}/${candidates.length}] RATE LIMITED → backing off ${RETRY_BACKOFF_MS}ms`);
        await sleep(RETRY_BACKOFF_MS);
      } else if (reason === 'not_found') {
        stats.rejected_revoked++;
      } else {
        stats.soft_failed++;
      }
      failedRows.push({
        candidate_id: c._id.toString(),
        username: c.username,
        channelCode: code,
        reason,
      });
    }

    // ── Persist ──────────────────────────────────────────────────────
    if (APPLY) {
      try {
        const update = {
          $set: {
            'raw_metrics.baileys': meta,
            'raw_metrics.enriched_at': new Date().toISOString(),
          },
        };
        if (meta.ok === false && meta.error === 'not_found') {
          update.$set.status = 'rejected';
          update.$set.rejection_reason = 'baileys: channel invite revoked';
          update.$set.reviewed_at = new Date();
        }
        await ChannelCandidate.updateOne({ _id: c._id }, update);
      } catch (err) {
        stats.write_errors++;
        console.warn(`  ERR write ${c.username}: ${err.message}`);
      }
    }

    if ((i + 1) % 25 === 0) {
      console.log(
        `  [${i + 1}/${candidates.length}] enriched=${stats.enriched} revoked=${stats.rejected_revoked} soft=${stats.soft_failed} rl=${stats.rate_limited}`,
      );
    }

    if (consecutiveFails >= MAX_CONSECUTIVE_FAILS) {
      console.warn(`\n[Enrich] ${MAX_CONSECUTIVE_FAILS} consecutive failures — pausing 60s`);
      await sleep(60000);
      consecutiveFails = 0;
    }

    await sleep(RATE_LIMIT_MS);
  }

  // ── Close socket + summary ───────────────────────────────────────────
  await session.end();

  const duration_ms = Date.now() - started;
  console.log('\n═════════════════════════════════════════════════════════════');
  console.log('  Enrichment summary');
  console.log('═════════════════════════════════════════════════════════════');
  console.log(`  Total channels:        ${stats.total}`);
  console.log(`  Enriched (clean):      ${stats.enriched}`);
  console.log(`  Rejected (revoked):    ${stats.rejected_revoked}`);
  console.log(`  Soft failures:         ${stats.soft_failed}`);
  console.log(`  Rate-limit backoffs:   ${stats.rate_limited}`);
  console.log(`  Write errors:          ${stats.write_errors}`);
  console.log(`  Success rate:          ${((stats.enriched / stats.total) * 100).toFixed(1)}%`);
  console.log(`  Duration:              ${(duration_ms / 1000 / 60).toFixed(1)} min`);
  console.log(`  Mode:                  ${APPLY ? 'APPLY' : 'DRY RUN — no DB writes'}`);

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const logsDir = path.join(__dirname, '..', 'logs');
  try {
    fs.mkdirSync(logsDir, { recursive: true });
  } catch {
    // ignore
  }
  const okCsv = path.join(logsDir, `enrich-baileys-${ts}-ok.csv`);
  const failCsv = path.join(logsDir, `enrich-baileys-${ts}-fail.csv`);
  const summaryJson = path.join(logsDir, `enrich-baileys-${ts}.json`);

  fs.writeFileSync(
    okCsv,
    toCsv(recoveredRows, [
      'candidate_id',
      'username',
      'channelCode',
      'baileys_name',
      'subscribers',
      'verification',
      'last_message_at',
    ]),
  );
  fs.writeFileSync(failCsv, toCsv(failedRows, ['candidate_id', 'username', 'channelCode', 'reason']));
  fs.writeFileSync(
    summaryJson,
    JSON.stringify({ stats, duration_ms, apply: APPLY, started: new Date(started).toISOString() }, null, 2),
  );

  console.log(`\n  OK CSV:        ${okCsv}`);
  console.log(`  Fail CSV:      ${failCsv}`);
  console.log(`  Summary JSON:  ${summaryJson}`);

  await mongoose.disconnect();
  process.exit(0);
})().catch(async (err) => {
  console.error('[Enrich] FATAL:', err.message);
  console.error(err.stack);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
