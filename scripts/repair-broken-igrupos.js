/**
 * Repair the 185 broken iGrupos WhatsApp candidates that lack a channelCode.
 *
 * The original iGrupos scrape captured channel names + descriptions from
 * /tag/{platform}/{category} listings but didn't follow each /grupo/{id}
 * detail page where the real WhatsApp invite link lives.
 *
 * Strategy:
 *   1. Re-scrape every WhatsApp category index → build a name→igruposId map.
 *   2. For each broken candidate, look up by normalized name (raw_metrics.title).
 *      Use exact match first, fuzzy (token Jaccard) as fallback.
 *   3. Fetch the detail page for the matched igruposId, extract the invite
 *      link (chat.whatsapp.com/... or whatsapp.com/channel/...).
 *   4. Update raw_metrics; mark dupes against Canal / other candidates by
 *      channelCode; mark unfound as 'rejected'.
 *
 * Read-only by default. Pass --apply to persist.
 *
 * Usage:
 *   node scripts/repair-broken-igrupos.js
 *   node scripts/repair-broken-igrupos.js --apply
 *   node scripts/repair-broken-igrupos.js --apply --limit 20
 */
require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');
const limitIdx = process.argv.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(process.argv[limitIdx + 1], 10) : 0;

// Coverage of WhatsApp category indices — broader than the default scraper
// to maximize the chance we hit every broken candidate's home category.
const WA_CATEGORIES = [
  'marketing',
  'negocios',
  'emprendimiento',
  'finanzas',
  'criptomonedas',
  'ecommerce',
  'tecnologia',
  'inversiones',
  'amistad',
  'amor',
  'salud',
  'educacion',
  'gaming',
  'deportes',
  'humor',
  'noticias',
  'musica',
];

const RATE_LIMIT_MS = 2000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normName(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function similarity(a, b) {
  const na = normName(a);
  const nb = normName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const sa = new Set(na.split(' ').filter((w) => w.length >= 2));
  const sb = new Set(nb.split(' ').filter((w) => w.length >= 2));
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter++;
  return inter / (sa.size + sb.size - inter);
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

(async () => {
  const started = Date.now();
  console.log('═════════════════════════════════════════════════════════');
  console.log('  Repair broken iGrupos WhatsApp candidates');
  console.log('═════════════════════════════════════════════════════════');
  console.log(`  Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);
  if (LIMIT) console.log(`  Limit: ${LIMIT}`);

  await mongoose.connect(process.env.MONGODB_URI);
  const ChannelCandidate = require('../models/ChannelCandidate');
  const Canal = require('../models/Canal');
  const tagScraper = require('../services/scrapers/igruposScraperService');
  const detailScraper = require('../services/scrapers/igruposDetailScraperService');

  // ── Load broken iGrupos candidates ────────────────────────────────────
  const query = {
    plataforma: 'whatsapp',
    source: 'igrupos_whatsapp',
    $or: [{ 'raw_metrics.channelCode': { $exists: false } }, { 'raw_metrics.channelCode': '' }],
  };
  let broken = await ChannelCandidate.find(query, { username: 1, raw_metrics: 1 }).lean();
  if (LIMIT > 0) broken = broken.slice(0, LIMIT);
  console.log(`  Broken candidates: ${broken.length}\n`);

  if (broken.length === 0) {
    console.log('  Nothing to repair.');
    await mongoose.disconnect();
    process.exit(0);
  }

  // ── Step 1: scrape every WA category, build name → {igruposId, ...} index
  console.log(`── Scraping ${WA_CATEGORIES.length} WA categories...`);
  const idxByExact = new Map(); // normName → [{ igruposId, name, members, category, country }]
  let listingHits = 0;
  for (const cat of WA_CATEGORIES) {
    try {
      const items = await tagScraper.scrapeTagPage('whatsapp', cat);
      for (const it of items) {
        if (!it.igruposId || !it.name) continue;
        const key = normName(it.name);
        if (!key) continue;
        const arr = idxByExact.get(key) || [];
        arr.push({
          igruposId: it.igruposId,
          name: it.name,
          members: it.members,
          country: it.country,
          category: cat,
        });
        idxByExact.set(key, arr);
        listingHits++;
      }
      console.log(`  /tag/whatsapp/${cat}: ${items.length} items`);
    } catch (err) {
      console.warn(`  /tag/whatsapp/${cat}: ${err.message}`);
    }
    await sleep(RATE_LIMIT_MS);
  }
  console.log(`  Total indexed: ${listingHits} listing hits, ${idxByExact.size} unique names\n`);

  // Flat array form for fuzzy search
  const allListings = [];
  for (const arr of idxByExact.values()) for (const it of arr) allListings.push(it);

  // ── Preload dedup indices ─────────────────────────────────────────────
  const liveCanals = await Canal.find({ plataforma: 'whatsapp' }, { identificadorCanal: 1, nombreCanal: 1 }).lean();
  const canalByCode = new Map();
  for (const c of liveCanals) {
    const id = (c.identificadorCanal || '').replace(/^wa:/, '').replace(/^https?:\/\/whatsapp\.com\/channel\//, '');
    if (id) canalByCode.set(id, { id: c._id, name: c.nombreCanal });
  }
  const otherCandsWithCode = await ChannelCandidate.find(
    {
      plataforma: 'whatsapp',
      source: { $ne: 'igrupos_whatsapp' },
      'raw_metrics.channelCode': { $exists: true, $ne: '' },
    },
    { _id: 1, source: 1, 'raw_metrics.channelCode': 1 },
  ).lean();
  const otherCandByCode = new Map();
  for (const c of otherCandsWithCode) {
    const code = c.raw_metrics?.channelCode;
    if (code) otherCandByCode.set(code, { id: c._id, source: c.source });
  }
  console.log(`  Canals indexed: ${canalByCode.size}  | other candidates with code: ${otherCandByCode.size}\n`);

  // ── Step 2-3: match + detail fetch + dedupe ──────────────────────────
  const stats = {
    total: broken.length,
    recovered: 0,
    dupe_canal: 0,
    dupe_other_cand: 0,
    dupe_within_repair: 0,
    rejected_no_match: 0,
    rejected_low_sim: 0,
    rejected_no_invite: 0,
    rejected_404: 0,
    write_errors: 0,
  };
  const recoveredRows = [];
  const rejectedRows = [];
  const dupeRows = [];
  const claimedThisRun = new Map();

  for (let i = 0; i < broken.length; i++) {
    const c = broken[i];
    const candidateName = c.raw_metrics?.title || c.username.replace(/^wa:/, '').replace(/-/g, ' ');
    const key = normName(candidateName);

    // Exact match first
    let match = null;
    let matchVia = '';
    if (idxByExact.has(key)) {
      match = idxByExact.get(key)[0];
      matchVia = 'exact';
    } else {
      // Fuzzy fallback — only if reasonably similar
      let best = null;
      let bestSim = 0;
      for (const it of allListings) {
        const s = similarity(candidateName, it.name);
        if (s > bestSim) {
          bestSim = s;
          best = it;
        }
      }
      if (best && bestSim >= 0.7) {
        match = best;
        matchVia = `fuzzy(${bestSim.toFixed(2)})`;
      } else if (best) {
        rejectedRows.push({
          candidate_id: c._id.toString(),
          username: c.username,
          name: candidateName,
          reason: `low-sim(${bestSim.toFixed(2)}) — best="${best.name}"`,
        });
        stats.rejected_low_sim++;
        continue;
      }
    }

    if (!match) {
      rejectedRows.push({
        candidate_id: c._id.toString(),
        username: c.username,
        name: candidateName,
        reason: 'no-match in listings',
      });
      stats.rejected_no_match++;
      continue;
    }

    // Fetch detail page
    let detail = null;
    try {
      detail = await detailScraper.getDetail(match.igruposId);
    } catch (err) {
      rejectedRows.push({
        candidate_id: c._id.toString(),
        username: c.username,
        name: candidateName,
        reason: `detail-error: ${err.message}`,
      });
      stats.write_errors++;
      await sleep(RATE_LIMIT_MS);
      continue;
    }

    if (!detail || !detail.ok) {
      const reason = detail?.reason || 'unknown';
      if (reason === '404') stats.rejected_404++;
      else stats.rejected_no_invite++;
      rejectedRows.push({
        candidate_id: c._id.toString(),
        username: c.username,
        name: candidateName,
        reason: `detail-invalid: ${reason}`,
      });
      if (APPLY) {
        try {
          await ChannelCandidate.updateOne(
            { _id: c._id },
            {
              $set: {
                status: 'rejected',
                rejection_reason: `detail-invalid: ${reason}`,
                reviewed_at: new Date(),
              },
            },
          );
        } catch (err) {
          stats.write_errors++;
        }
      }
      await sleep(RATE_LIMIT_MS);
      continue;
    }

    // Got detail → check dupes
    const code = detail.channelCode;
    let newStatus = 'pending_review';
    let rejectionReason = '';
    let dupeType = null;

    if (canalByCode.has(code)) {
      newStatus = 'duplicate';
      const hit = canalByCode.get(code);
      rejectionReason = `already in Canal ${hit.id} ("${hit.name || ''}")`;
      dupeType = 'canal';
      stats.dupe_canal++;
    } else if (otherCandByCode.has(code)) {
      newStatus = 'duplicate';
      const hit = otherCandByCode.get(code);
      rejectionReason = `dupe of candidate ${hit.id} (${hit.source})`;
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
      candidate_name: candidateName,
      matched_name: detail.name || match.name,
      match_via: matchVia,
      igruposId: match.igruposId,
      channelCode: code,
      kind: detail.kind,
      followers: match.members || 0,
      country: match.country || '',
      category: match.category,
      inviteLink: detail.inviteLink,
      sourceUrl: detail.sourceUrl,
      new_status: newStatus,
      dupe_type: dupeType || '',
      rejection_reason: rejectionReason,
    };
    if (dupeType) dupeRows.push(row);
    else recoveredRows.push(row);

    if (APPLY) {
      try {
        await ChannelCandidate.updateOne(
          { _id: c._id },
          {
            $set: {
              'raw_metrics.title': detail.name || match.name,
              'raw_metrics.description': detail.description || c.raw_metrics?.description || '',
              'raw_metrics.subscribers': match.members || c.raw_metrics?.subscribers || 0,
              'raw_metrics.inviteLink': detail.inviteLink,
              'raw_metrics.channelCode': code,
              'raw_metrics.kind': detail.kind,
              'raw_metrics.image': detail.image || '',
              'raw_metrics.sourceUrl': detail.sourceUrl,
              'raw_metrics.igruposId': match.igruposId,
              'raw_metrics.country': match.country || c.raw_metrics?.country || '',
              'raw_metrics.repaired_at': new Date().toISOString(),
              status: newStatus,
              ...(newStatus === 'duplicate' && {
                rejection_reason: rejectionReason,
                reviewed_at: new Date(),
              }),
            },
          },
        );
      } catch (err) {
        stats.write_errors++;
        console.warn(`  ERR ${c.username}: ${err.message}`);
      }
    }

    if ((i + 1) % 20 === 0) {
      const dup = stats.dupe_canal + stats.dupe_other_cand + stats.dupe_within_repair;
      const rej = stats.rejected_no_match + stats.rejected_low_sim + stats.rejected_no_invite + stats.rejected_404;
      console.log(`  [${i + 1}/${broken.length}] recov=${stats.recovered} dup=${dup} rej=${rej}`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  // ── Summary ──────────────────────────────────────────────────────────
  const duration_ms = Date.now() - started;
  console.log('\n═════════════════════════════════════════════════════════');
  console.log('  Repair summary');
  console.log('═════════════════════════════════════════════════════════');
  console.log(`  Total candidates:      ${stats.total}`);
  console.log(`  Recovered (clean):     ${stats.recovered}`);
  console.log(`  Dupe of live Canal:    ${stats.dupe_canal}`);
  console.log(`  Dupe of other cand:    ${stats.dupe_other_cand}`);
  console.log(`  Dupe within repair:    ${stats.dupe_within_repair}`);
  console.log(`  Rejected (no-match):   ${stats.rejected_no_match}`);
  console.log(`  Rejected (low-sim):    ${stats.rejected_low_sim}`);
  console.log(`  Rejected (no invite):  ${stats.rejected_no_invite}`);
  console.log(`  Rejected (404):        ${stats.rejected_404}`);
  console.log(`  Write errors:          ${stats.write_errors}`);
  console.log(`  Recovery rate:         ${((stats.recovered / stats.total) * 100).toFixed(1)}%`);
  console.log(`  Duration:              ${(duration_ms / 1000).toFixed(1)}s`);
  console.log(`  Mode:                  ${APPLY ? 'APPLY' : 'DRY RUN'}`);

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const logsDir = path.join(__dirname, '..', 'logs');
  const baseHeaders = [
    'candidate_id',
    'username',
    'candidate_name',
    'matched_name',
    'match_via',
    'igruposId',
    'channelCode',
    'kind',
    'followers',
    'country',
    'category',
    'inviteLink',
    'sourceUrl',
    'new_status',
    'rejection_reason',
  ];
  fs.writeFileSync(path.join(logsDir, `repair-igrupos-${ts}-recovered.csv`), toCsv(recoveredRows, baseHeaders));
  fs.writeFileSync(
    path.join(logsDir, `repair-igrupos-${ts}-dupes.csv`),
    toCsv(dupeRows, [...baseHeaders, 'dupe_type']),
  );
  fs.writeFileSync(
    path.join(logsDir, `repair-igrupos-${ts}-rejected.csv`),
    toCsv(rejectedRows, ['candidate_id', 'username', 'name', 'reason']),
  );
  fs.writeFileSync(
    path.join(logsDir, `repair-igrupos-${ts}.json`),
    JSON.stringify({ stats, duration_ms, apply: APPLY }, null, 2),
  );
  console.log(`\n  Logs written to: logs/repair-igrupos-${ts}-*.{csv,json}`);

  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error('[Repair iGrupos] FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
