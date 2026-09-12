/**
 * Repair the 607 broken wachannelsfinder ChannelCandidate rows.
 *
 * Each row currently has:
 *   - username = "wa:{slug}"
 *   - raw_metrics.title = junk HTML (or sometimes a clean title)
 *   - no inviteLink, no channelCode, no followers, no description
 *
 * This script walks every wachannelsfinder candidate, fetches its detail page
 * via wachannelsfinderDetailScraperService, and writes the recovered data back
 * into raw_metrics. It also dedupes against existing Canal documents and other
 * ChannelCandidate rows that already have a channelCode.
 *
 * Status transitions:
 *   - already a live Canal with same channelCode → status='duplicate',
 *       rejection_reason='already in Canal {id}'
 *   - another ChannelCandidate with same channelCode → status='duplicate',
 *       rejection_reason='dupe of candidate {id}'
 *   - successful enrichment with no collision → status stays 'pending_review',
 *       raw_metrics enriched
 *   - 404 / no invite link on detail page → status='rejected',
 *       rejection_reason='detail-page invalid: {reason}'
 *
 * Read-only by default. Pass --apply to write changes to the DB.
 *
 * Usage:
 *   node scripts/repair-broken-wachannelsfinder.js               # dry-run, no DB writes
 *   node scripts/repair-broken-wachannelsfinder.js --apply       # actually update DB
 *   node scripts/repair-broken-wachannelsfinder.js --apply --limit 20  # first 20
 *   node scripts/repair-broken-wachannelsfinder.js --apply --resume    # skip ones already enriched
 */
require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');
const RESUME = process.argv.includes('--resume');
const limitIdx = process.argv.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(process.argv[limitIdx + 1], 10) : 0;

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

(async () => {
  const started = Date.now();
  console.log('═════════════════════════════════════════════════════════');
  console.log('  Repair broken wachannelsfinder candidates');
  console.log('═════════════════════════════════════════════════════════');
  console.log(`  Mode: ${APPLY ? 'APPLY (writes to DB)' : 'DRY RUN (no DB writes)'}`);
  if (RESUME) console.log('  Resume: skip already-enriched candidates');
  if (LIMIT) console.log(`  Limit: ${LIMIT}`);

  await mongoose.connect(process.env.MONGODB_URI);
  const ChannelCandidate = require('../models/ChannelCandidate');
  const Canal = require('../models/Canal');
  const detail = require('../services/scrapers/wachannelsfinderDetailScraperService');

  // ── Load the broken candidates ───────────────────────────────────────
  const query = { plataforma: 'whatsapp', source: 'wachannelsfinder' };
  if (RESUME) {
    // Skip those that already have a channelCode in raw_metrics
    query.$or = [
      { 'raw_metrics.channelCode': { $exists: false } },
      { 'raw_metrics.channelCode': '' },
    ];
  }
  let candidates = await ChannelCandidate.find(query, { username: 1, raw_metrics: 1, status: 1 }).lean();
  if (LIMIT > 0) candidates = candidates.slice(0, LIMIT);
  console.log(`  Candidates to repair: ${candidates.length}\n`);

  // ── Preload existing channelCode → Canal map for collision detection ─
  const liveCanals = await Canal.find(
    { plataforma: 'whatsapp' },
    { identificadorCanal: 1, nombreCanal: 1, estado: 1 },
  ).lean();
  const canalByCode = new Map();
  for (const c of liveCanals) {
    const id = (c.identificadorCanal || '').replace(/^wa:/, '').replace(/^https?:\/\/whatsapp\.com\/channel\//, '');
    if (id) canalByCode.set(id, c);
  }
  console.log(`  Live Canals indexed: ${canalByCode.size}`);

  const enrichedCandsWithCode = await ChannelCandidate.find(
    {
      plataforma: 'whatsapp',
      source: { $ne: 'wachannelsfinder' },
      'raw_metrics.channelCode': { $exists: true, $ne: '' },
    },
    { _id: 1, source: 1, 'raw_metrics.channelCode': 1 },
  ).lean();
  const otherCandByCode = new Map();
  for (const c of enrichedCandsWithCode) {
    const code = c.raw_metrics?.channelCode;
    if (code) otherCandByCode.set(code, c);
  }
  console.log(`  Other candidates with channelCode: ${otherCandByCode.size}\n`);

  // ── Walk candidates ──────────────────────────────────────────────────
  // Also build a Set of channelCodes claimed during THIS run so two broken
  // candidates that resolve to the same channel don't both stay pending.
  const claimedThisRun = new Map();

  const stats = {
    total: candidates.length,
    recovered: 0,
    rejected_404: 0,
    rejected_no_invite: 0,
    dupe_canal: 0,
    dupe_other_cand: 0,
    dupe_within_repair: 0,
    write_errors: 0,
  };
  const recoveredRows = [];
  const rejectedRows = [];
  const dupeRows = [];

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    let r = null;
    try {
      r = await detail.scrapeBySlug(c.username);
    } catch (err) {
      stats.write_errors++;
      rejectedRows.push({
        candidate_id: c._id.toString(),
        username: c.username,
        reason: `scrape-error: ${err.message}`,
      });
      await sleep(2000);
      continue;
    }

    // Hard failure: skip / reject
    if (!r || !r.ok) {
      const reason = r?.reason || 'unknown';
      if (reason === '404') stats.rejected_404++;
      else stats.rejected_no_invite++;
      rejectedRows.push({
        candidate_id: c._id.toString(),
        username: c.username,
        reason: `detail-page invalid: ${reason}`,
      });
      if (APPLY) {
        try {
          await ChannelCandidate.updateOne(
            { _id: c._id },
            {
              $set: {
                status: 'rejected',
                rejection_reason: `detail-page invalid: ${reason}`,
                reviewed_at: new Date(),
              },
            },
          );
        } catch (err) {
          stats.write_errors++;
        }
      }
      if ((i + 1) % 25 === 0) {
        console.log(`  [${i + 1}/${candidates.length}] recov=${stats.recovered} 404=${stats.rejected_404} noinv=${stats.rejected_no_invite} dup=${stats.dupe_canal + stats.dupe_other_cand + stats.dupe_within_repair}`);
      }
      await sleep(2000);
      continue;
    }

    // Successful recovery — check for dupes
    const code = r.channelCode;
    let newStatus = 'pending_review';
    let rejectionReason = '';
    let dupeType = null;

    if (canalByCode.has(code)) {
      newStatus = 'duplicate';
      const hit = canalByCode.get(code);
      rejectionReason = `already in Canal ${hit._id} ("${hit.nombreCanal || ''}")`;
      dupeType = 'canal';
      stats.dupe_canal++;
    } else if (otherCandByCode.has(code)) {
      newStatus = 'duplicate';
      const hit = otherCandByCode.get(code);
      rejectionReason = `dupe of candidate ${hit._id} (${hit.source})`;
      dupeType = 'other_cand';
      stats.dupe_other_cand++;
    } else if (claimedThisRun.has(code)) {
      newStatus = 'duplicate';
      rejectionReason = `dupe within repair (first claimed by ${claimedThisRun.get(code)})`;
      dupeType = 'within_repair';
      stats.dupe_within_repair++;
    } else {
      claimedThisRun.set(code, c.username);
      stats.recovered++;
    }

    const row = {
      candidate_id: c._id.toString(),
      username: c.username,
      channelCode: code,
      kind: r.kind,
      name: r.name,
      followers: r.followers,
      description: r.description,
      inviteLink: r.inviteLink,
      category: r.category,
      language: r.language,
      image: r.image,
      sourceUrl: r.sourceUrl,
      datePublished: r.datePublished,
      dateModified: r.dateModified,
      new_status: newStatus,
      dupe_type: dupeType || '',
      rejection_reason: rejectionReason,
    };
    if (dupeType) dupeRows.push(row);
    else recoveredRows.push(row);

    // Apply DB update
    if (APPLY) {
      try {
        const update = {
          $set: {
            'raw_metrics.title': r.name,
            'raw_metrics.description': r.description,
            'raw_metrics.subscribers': r.followers,
            'raw_metrics.inviteLink': r.inviteLink,
            'raw_metrics.channelCode': r.channelCode,
            'raw_metrics.kind': r.kind,
            'raw_metrics.image': r.image,
            'raw_metrics.language': r.language,
            'raw_metrics.sourceUrl': r.sourceUrl,
            'raw_metrics.datePublished': r.datePublished,
            'raw_metrics.dateModified': r.dateModified,
            'raw_metrics.repaired_at': new Date().toISOString(),
            status: newStatus,
            ...(newStatus === 'duplicate' && {
              rejection_reason: rejectionReason,
              reviewed_at: new Date(),
            }),
          },
        };
        await ChannelCandidate.updateOne({ _id: c._id }, update);
      } catch (err) {
        stats.write_errors++;
        console.warn(`  ERR ${c.username}: ${err.message}`);
      }
    }

    if ((i + 1) % 25 === 0) {
      console.log(
        `  [${i + 1}/${candidates.length}] recov=${stats.recovered} 404=${stats.rejected_404} noinv=${stats.rejected_no_invite} dup=${stats.dupe_canal + stats.dupe_other_cand + stats.dupe_within_repair}`,
      );
    }
    await sleep(2000);
  }

  // ── Summary ──────────────────────────────────────────────────────────
  const duration_ms = Date.now() - started;
  console.log('\n═════════════════════════════════════════════════════════');
  console.log('  Repair summary');
  console.log('═════════════════════════════════════════════════════════');
  console.log(`  Total candidates:     ${stats.total}`);
  console.log(`  Recovered (clean):    ${stats.recovered}`);
  console.log(`  Dupe of live Canal:   ${stats.dupe_canal}`);
  console.log(`  Dupe of other cand:   ${stats.dupe_other_cand}`);
  console.log(`  Dupe within repair:   ${stats.dupe_within_repair}`);
  console.log(`  Rejected (404):       ${stats.rejected_404}`);
  console.log(`  Rejected (no invite): ${stats.rejected_no_invite}`);
  console.log(`  Write errors:         ${stats.write_errors}`);
  console.log(`  Recovery rate:        ${((stats.recovered / stats.total) * 100).toFixed(1)}%`);
  console.log(`  Duration:             ${(duration_ms / 1000).toFixed(1)}s`);
  console.log(`  Mode:                 ${APPLY ? 'APPLY' : 'DRY RUN — no DB writes'}`);

  // Save outputs
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const logsDir = path.join(__dirname, '..', 'logs');
  const baseHeaders = [
    'candidate_id',
    'username',
    'channelCode',
    'kind',
    'name',
    'followers',
    'category',
    'language',
    'inviteLink',
    'sourceUrl',
    'new_status',
    'rejection_reason',
  ];
  const recoveredCsv = path.join(logsDir, `repair-wcf-${ts}-recovered.csv`);
  const dupesCsv = path.join(logsDir, `repair-wcf-${ts}-dupes.csv`);
  const rejectedCsv = path.join(logsDir, `repair-wcf-${ts}-rejected.csv`);
  const summaryJson = path.join(logsDir, `repair-wcf-${ts}.json`);

  fs.writeFileSync(recoveredCsv, toCsv(recoveredRows, baseHeaders));
  fs.writeFileSync(dupesCsv, toCsv(dupeRows, [...baseHeaders, 'dupe_type']));
  fs.writeFileSync(rejectedCsv, toCsv(rejectedRows, ['candidate_id', 'username', 'reason']));
  fs.writeFileSync(
    summaryJson,
    JSON.stringify({ stats, duration_ms, apply: APPLY, started: new Date(started).toISOString() }, null, 2),
  );

  console.log(`\n  Recovered CSV: ${recoveredCsv}`);
  console.log(`  Dupes CSV:     ${dupesCsv}`);
  console.log(`  Rejected CSV:  ${rejectedCsv}`);
  console.log(`  Summary JSON:  ${summaryJson}`);

  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error('[Repair] FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
