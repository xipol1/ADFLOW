/**
 * Try to recover invite codes for the broken wachannelsfinder candidates
 * (no inviteLink, junk title) by name-matching against other directory sources.
 *
 * Strategy:
 *   1. Build a normalized-name index from every WhatsApp source we know:
 *      - The recent canaleswpp + whts.club harvest JSON
 *      - cheetahgroups + igrupos (re-run on demand via --run-extra)
 *      - Existing clean ChannelCandidate WA rows (from any source) that have
 *        a real channelCode/inviteLink in raw_metrics
 *   2. For each broken candidate, generate match keys:
 *      - deslugified username
 *      - clean title (if present and not HTML)
 *   3. Lookup against the index. Exact match first, then a normalized
 *      "alpha-only" fallback (strips punctuation, emojis, whitespace).
 *   4. Output recovered set + miss set.
 *
 * Usage:
 *   node scripts/recover-broken-candidates.js
 *   node scripts/recover-broken-candidates.js --run-extra   # also run cheetah + igrupos
 *   node scripts/recover-broken-candidates.js --harvest logs/harvest-foo.json
 */
require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const RUN_EXTRA = process.argv.includes('--run-extra');
const harvestArgIdx = process.argv.indexOf('--harvest');
const harvestArgPath = harvestArgIdx >= 0 ? process.argv[harvestArgIdx + 1] : null;

// ── Name normalization ────────────────────────────────────────────────
function deslugify(username) {
  if (!username) return '';
  let raw = username.replace(/^wa:/, '');
  // decodeURIComponent throws on truncated/invalid escapes — be tolerant.
  try {
    raw = decodeURIComponent(raw);
  } catch {
    raw = raw.replace(/%[0-9a-f]{2}/gi, ' ');
  }
  return raw.replace(/-+/g, ' ').replace(/\s+/g, ' ').trim();
}

function isHtmlGarbage(text) {
  return !!text && /<[a-z]/i.test(text);
}

function normName(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function alphaOnly(text) {
  if (!text) return '';
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
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

function findLatestHarvestJson() {
  const dir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^harvest-canaleswpp-whts-.*\.json$/.test(f))
    .map((f) => ({ f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files[0] ? path.join(dir, files[0].f) : null;
}

(async () => {
  const startedAt = Date.now();
  await mongoose.connect(process.env.MONGODB_URI);
  const ChannelCandidate = require('../models/ChannelCandidate');

  // ── 1. Load broken wachannelsfinder candidates ───────────────────────
  const broken = await ChannelCandidate.find(
    { plataforma: 'whatsapp', source: 'wachannelsfinder' },
    { username: 1, raw_metrics: 1 },
  ).lean();
  console.log(`[Recover] Broken wachannelsfinder candidates: ${broken.length}`);

  // ── 2. Build the candidate index of "known good" rows ────────────────
  // Each entry: { sourceName, sourceCategory, channelCode, inviteLink, source, kind, followers }
  const indexByExact = new Map(); // normName(name) → array of entries
  const indexByAlpha = new Map(); // alphaOnly(name) → array of entries

  function addToIndex(entry) {
    if (!entry.channelCode || !entry.name) return;
    const key = normName(entry.name);
    if (!key) return;
    const arr = indexByExact.get(key) || [];
    arr.push(entry);
    indexByExact.set(key, arr);
    const alpha = alphaOnly(entry.name);
    if (alpha && alpha.length >= 3) {
      const arr2 = indexByAlpha.get(alpha) || [];
      arr2.push(entry);
      indexByAlpha.set(alpha, arr2);
    }
  }

  // 2a. From harvest JSON
  const harvestPath = harvestArgPath || findLatestHarvestJson();
  if (harvestPath && fs.existsSync(harvestPath)) {
    const harvest = JSON.parse(fs.readFileSync(harvestPath, 'utf-8'));
    for (const r of harvest.results || []) {
      addToIndex({
        name: r.name,
        channelCode: r.channelCode,
        inviteLink: r.inviteLink,
        source: r.source,
        kind: r.kind,
        followers: r.followers,
        category: r.category,
        country: r.country,
      });
    }
    console.log(`[Recover] Indexed harvest (${harvestPath}): ${harvest.results?.length || 0} entries`);
  } else {
    console.warn(`[Recover] No harvest JSON found.`);
  }

  // 2b. From existing clean ChannelCandidate rows with a real channelCode
  const cleanCands = await ChannelCandidate.find(
    {
      plataforma: 'whatsapp',
      'raw_metrics.channelCode': { $exists: true, $ne: '' },
    },
    { username: 1, source: 1, raw_metrics: 1 },
  ).lean();
  let indexedFromDb = 0;
  for (const c of cleanCands) {
    const rm = c.raw_metrics || {};
    if (!rm.channelCode || !rm.title) continue;
    if (isHtmlGarbage(rm.title)) continue;
    addToIndex({
      name: rm.title,
      channelCode: rm.channelCode,
      inviteLink: rm.inviteLink || '',
      source: `db:${c.source}`,
      kind: rm.kind || 'channel',
      followers: rm.subscribers || 0,
      category: rm.category || '',
    });
    indexedFromDb++;
  }
  console.log(`[Recover] Indexed clean DB candidates with channelCode: ${indexedFromDb}`);

  // 2c. Optionally run cheetahgroups + igrupos
  if (RUN_EXTRA) {
    console.log(`\n[Recover] --run-extra: running cheetahgroups + igrupos...`);
    try {
      const cheetah = require('../services/scrapers/cheetahGroupsScraperService');
      const { results } = await cheetah.scrapeAll();
      console.log(`[Recover] cheetahgroups: +${results.length} items`);
      for (const r of results) {
        addToIndex({
          name: r.name,
          channelCode: r.channelCode,
          inviteLink: r.inviteLink,
          source: 'cheetah_groups',
          kind: 'group',
          followers: r.followers || 0,
          category: r.category || '',
        });
      }
    } catch (err) {
      console.warn(`[Recover] cheetahgroups failed: ${err.message}`);
    }
    try {
      const igrupos = require('../services/scrapers/igruposScraperService');
      const { results } = await igrupos.scrapeAll();
      const waOnly = results.filter((r) => r.platform === 'whatsapp');
      console.log(`[Recover] igrupos (WhatsApp): +${waOnly.length} items`);
      for (const r of waOnly) {
        const code = r.channelCode || r.slug || '';
        addToIndex({
          name: r.name,
          channelCode: code,
          inviteLink: r.inviteLink || '',
          source: 'igrupos_whatsapp',
          kind: r.kind || 'group',
          followers: r.members || 0,
          category: r.category || '',
        });
      }
    } catch (err) {
      console.warn(`[Recover] igrupos failed: ${err.message}`);
    }
  }

  console.log(`\n[Recover] Total unique exact-name keys: ${indexByExact.size}`);
  console.log(`[Recover] Total unique alpha-only keys:  ${indexByAlpha.size}`);

  // ── 3. Match the broken candidates ────────────────────────────────────
  const recovered = [];
  const misses = [];

  for (const c of broken) {
    const slugName = deslugify(c.username);
    const titleRaw = c.raw_metrics?.title || '';
    const cleanTitle = isHtmlGarbage(titleRaw) ? '' : titleRaw;

    const candidatesToTry = [];
    if (cleanTitle) candidatesToTry.push({ key: normName(cleanTitle), alpha: alphaOnly(cleanTitle), source: 'title' });
    if (slugName) candidatesToTry.push({ key: normName(slugName), alpha: alphaOnly(slugName), source: 'slug' });

    let hit = null;
    let hitVia = '';
    for (const c2 of candidatesToTry) {
      if (c2.key && indexByExact.has(c2.key)) {
        hit = indexByExact.get(c2.key)[0];
        hitVia = `exact:${c2.source}`;
        break;
      }
    }
    if (!hit) {
      for (const c2 of candidatesToTry) {
        if (c2.alpha && c2.alpha.length >= 4 && indexByAlpha.has(c2.alpha)) {
          hit = indexByAlpha.get(c2.alpha)[0];
          hitVia = `alpha:${c2.source}`;
          break;
        }
      }
    }

    if (hit) {
      recovered.push({
        candidate_id: c._id.toString(),
        username: c.username,
        slugName,
        cleanTitle: cleanTitle || '',
        matched_via: hitVia,
        matched_name: hit.name,
        matched_channelCode: hit.channelCode,
        matched_inviteLink: hit.inviteLink,
        matched_source: hit.source,
        matched_kind: hit.kind,
        matched_followers: hit.followers,
        matched_category: hit.category || '',
      });
    } else {
      misses.push({
        candidate_id: c._id.toString(),
        username: c.username,
        slugName,
        cleanTitle: cleanTitle || '',
        category: c.raw_metrics?.category || '',
      });
    }
  }

  // ── 4. Summary + outputs ──────────────────────────────────────────────
  const recoveryRate = ((recovered.length / broken.length) * 100).toFixed(1);
  const recoveredBySource = {};
  const recoveredByVia = {};
  for (const r of recovered) {
    recoveredBySource[r.matched_source] = (recoveredBySource[r.matched_source] || 0) + 1;
    recoveredByVia[r.matched_via] = (recoveredByVia[r.matched_via] || 0) + 1;
  }

  console.log(`\n═════════════════════════════════════════════════════════`);
  console.log(`  Recovery summary`);
  console.log(`═════════════════════════════════════════════════════════`);
  console.log(`  Broken candidates:   ${broken.length}`);
  console.log(`  Recovered:           ${recovered.length} (${recoveryRate}%)`);
  console.log(`  Misses:              ${misses.length}`);
  console.log(`  By source: ${JSON.stringify(recoveredBySource)}`);
  console.log(`  By via:    ${JSON.stringify(recoveredByVia)}`);

  // Save outputs
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const logsDir = path.join(__dirname, '..', 'logs');
  const recoveredCsv = path.join(logsDir, `recover-broken-${ts}-recovered.csv`);
  const missesCsv = path.join(logsDir, `recover-broken-${ts}-misses.csv`);
  const fullJson = path.join(logsDir, `recover-broken-${ts}.json`);

  fs.writeFileSync(
    recoveredCsv,
    toCsv(recovered, [
      'candidate_id',
      'username',
      'slugName',
      'cleanTitle',
      'matched_via',
      'matched_name',
      'matched_channelCode',
      'matched_inviteLink',
      'matched_source',
      'matched_kind',
      'matched_followers',
      'matched_category',
    ]),
  );
  fs.writeFileSync(missesCsv, toCsv(misses, ['candidate_id', 'username', 'slugName', 'cleanTitle', 'category']));
  fs.writeFileSync(
    fullJson,
    JSON.stringify(
      {
        broken_total: broken.length,
        recovered_count: recovered.length,
        recovery_rate_pct: parseFloat(recoveryRate),
        misses_count: misses.length,
        recoveredBySource,
        recoveredByVia,
        index_sizes: { exact: indexByExact.size, alpha: indexByAlpha.size },
        run_extra: RUN_EXTRA,
        harvest_used: harvestPath,
        duration_ms: Date.now() - startedAt,
      },
      null,
      2,
    ),
  );

  console.log(`\n  Recovered CSV: ${recoveredCsv}`);
  console.log(`  Misses CSV:    ${missesCsv}`);
  console.log(`  Summary JSON:  ${fullJson}`);
  if (recovered.length > 0) {
    console.log(`\n  First 5 recoveries:`);
    for (const r of recovered.slice(0, 5)) {
      console.log(`    [${r.matched_via}] ${r.username} → "${r.matched_name}" (${r.matched_channelCode}) from ${r.matched_source}`);
    }
  }

  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error('[Recover] FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
