/**
 * Harvest seeds — canaleswpp.com + whts.club discovery dump.
 *
 * Read-only cosecha: scrapes both directories and writes the deduplicated
 * seed list to logs/harvest-canaleswpp-whts-{timestamp}.{json,csv}.
 *
 * No DB writes by default. Pass --save to also upsert into ChannelCandidate
 * (status='pending_review', source='canaleswpp' or 'whts_club').
 *
 * Usage:
 *   node scripts/harvest-canaleswpp-whts.js
 *   node scripts/harvest-canaleswpp-whts.js --max-canaleswpp 10 --max-whts 50
 *   node scripts/harvest-canaleswpp-whts.js --only canaleswpp
 *   node scripts/harvest-canaleswpp-whts.js --only whts
 *   node scripts/harvest-canaleswpp-whts.js --save
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

function parseArg(name, fallback = null) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  const val = process.argv[idx + 1];
  if (!val || val.startsWith('--')) return true;
  return val;
}

const ONLY = parseArg('only'); // 'canaleswpp' | 'whts' | null
const MAX_CANALESWPP = parseInt(parseArg('max-canaleswpp', 0), 10) || 0;
const MAX_WHTS = parseInt(parseArg('max-whts', 0), 10) || 0;
const SAVE = parseArg('save') === true;

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value).replace(/\r?\n/g, ' ').trim();
  if (/[",;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows) {
  if (rows.length === 0) return '';
  const headers = [
    'source',
    'kind',
    'channelCode',
    'name',
    'followers',
    'category',
    'country',
    'inviteLink',
    'sourceUrl',
    'description',
  ];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map((h) => csvEscape(r[h])).join(','));
  }
  return lines.join('\n');
}

async function saveToDb(rows) {
  const mongoose = require('mongoose');
  if (!process.env.MONGODB_URI) {
    console.warn('[Harvest] --save requested but MONGODB_URI is not set; skipping');
    return { saved: 0, dupes: 0, errors: ['MONGODB_URI missing'] };
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const ChannelCandidate = require('../models/ChannelCandidate');
  let saved = 0;
  let dupes = 0;
  const errors = [];

  for (const r of rows) {
    const username = `wa:${r.channelCode}`;
    try {
      const exists = await ChannelCandidate.findOne({ username }).lean();
      if (exists) {
        dupes++;
        continue;
      }
      await ChannelCandidate.create({
        username,
        plataforma: 'whatsapp',
        source: r.source,
        status: 'pending_review',
        scraped_at: new Date(),
        raw_metrics: {
          title: r.name,
          description: r.description,
          subscribers: r.followers || 0,
          category: r.category || '',
          country: r.country || '',
          kind: r.kind, // 'channel' | 'group'
          channelCode: r.channelCode,
          inviteLink: r.inviteLink,
          sourceUrl: r.sourceUrl,
          image: r.image || '',
          tags: r.tags || [],
          author: r.author || '',
          datePublished: r.datePublished || '',
          dateModified: r.dateModified || '',
          source_platform: 'whatsapp',
          discoveredVia: r.source,
        },
      });
      saved++;
    } catch (err) {
      if (err.code === 11000) dupes++;
      else errors.push(`${r.source}/${username}: ${err.message}`);
    }
  }

  await mongoose.disconnect();
  return { saved, dupes, errors };
}

(async () => {
  const startedAt = Date.now();
  console.log('═════════════════════════════════════════════════════════');
  console.log('  Harvest — canaleswpp + whts.club seeds (read-only)');
  console.log('═════════════════════════════════════════════════════════');
  if (ONLY) console.log(`  Filter: --only ${ONLY}`);
  if (MAX_CANALESWPP) console.log(`  Limit canaleswpp: ${MAX_CANALESWPP}`);
  if (MAX_WHTS) console.log(`  Limit whts.club: ${MAX_WHTS}`);
  if (SAVE) console.log('  Mode: SAVE to ChannelCandidate (status=pending_review)');
  console.log('');

  const rows = [];
  const allErrors = [];

  // ── Canaleswpp ────────────────────────────────────────────────────────
  if (!ONLY || ONLY === 'canaleswpp') {
    console.log('── canaleswpp ──');
    try {
      const svc = require('../services/scrapers/canaleswppScraperService');
      const { results, errors } = await svc.scrapeAll({ maxChannels: MAX_CANALESWPP });
      for (const r of results) {
        rows.push({
          source: 'canaleswpp',
          kind: r.kind,
          channelCode: r.channelCode,
          name: r.name,
          followers: r.followers,
          category: r.category,
          country: '',
          inviteLink: r.inviteLink,
          sourceUrl: r.sourceUrl,
          description: r.description,
          image: r.image,
          tags: [],
        });
      }
      allErrors.push(...errors);
    } catch (err) {
      console.error(`[Canaleswpp] FAILED: ${err.message}`);
      allErrors.push(`Canaleswpp: ${err.message}`);
    }
  }

  // ── Whts.club ─────────────────────────────────────────────────────────
  if (!ONLY || ONLY === 'whts') {
    console.log('\n── whts.club ──');
    try {
      const svc = require('../services/scrapers/whtsClubScraperService');
      const { results, errors } = await svc.scrapeAll({ maxListings: MAX_WHTS });
      for (const r of results) {
        rows.push({
          source: 'whts_club',
          kind: r.kind,
          channelCode: r.channelCode,
          name: r.name,
          followers: 0,
          category: r.category,
          country: r.country,
          inviteLink: r.inviteLink,
          sourceUrl: r.sourceUrl,
          description: r.description,
          image: r.image,
          tags: r.tags || [],
          author: r.author,
          datePublished: r.datePublished,
          dateModified: r.dateModified,
        });
      }
      allErrors.push(...errors);
    } catch (err) {
      console.error(`[WhtsClub] FAILED: ${err.message}`);
      allErrors.push(`WhtsClub: ${err.message}`);
    }
  }

  // ── Deduplicate cross-source on channelCode (canaleswpp wins) ─────────
  const byCode = new Map();
  for (const r of rows) {
    const existing = byCode.get(r.channelCode);
    if (!existing || (existing.source === 'whts_club' && r.source === 'canaleswpp')) {
      byCode.set(r.channelCode, r);
    }
  }
  const deduped = Array.from(byCode.values());

  // ── Summary ───────────────────────────────────────────────────────────
  const stats = {
    total_raw: rows.length,
    total_deduped: deduped.length,
    by_source: { canaleswpp: 0, whts_club: 0 },
    by_kind: { channel: 0, group: 0, unknown: 0 },
    by_country: {},
    with_followers: 0,
  };
  for (const r of deduped) {
    stats.by_source[r.source]++;
    stats.by_kind[r.kind || 'unknown']++;
    if (r.country) stats.by_country[r.country] = (stats.by_country[r.country] || 0) + 1;
    if (r.followers > 0) stats.with_followers++;
  }

  console.log('\n═════════════════════════════════════════════════════════');
  console.log('  Harvest summary');
  console.log('═════════════════════════════════════════════════════════');
  console.log(`  Total scraped: ${stats.total_raw}`);
  console.log(`  After cross-source dedup: ${stats.total_deduped}`);
  console.log(`  By source: canaleswpp=${stats.by_source.canaleswpp}, whts_club=${stats.by_source.whts_club}`);
  console.log(`  By kind: channels=${stats.by_kind.channel}, groups=${stats.by_kind.group}, unknown=${stats.by_kind.unknown}`);
  console.log(`  With follower counts: ${stats.with_followers}`);
  if (Object.keys(stats.by_country).length) {
    const top = Object.entries(stats.by_country).sort((a, b) => b[1] - a[1]).slice(0, 10);
    console.log(`  Top countries: ${top.map(([c, n]) => `${c}=${n}`).join(', ')}`);
  }
  console.log(`  Errors: ${allErrors.length}`);
  if (allErrors.length) {
    console.log('  First 5 errors:');
    allErrors.slice(0, 5).forEach((e) => console.log(`    - ${e}`));
  }

  // ── Write outputs ─────────────────────────────────────────────────────
  const logsDir = path.join(__dirname, '..', 'logs');
  try {
    fs.mkdirSync(logsDir, { recursive: true });
  } catch {
    // ignore EEXIST
  }
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(logsDir, `harvest-canaleswpp-whts-${ts}.json`);
  const csvPath = path.join(logsDir, `harvest-canaleswpp-whts-${ts}.csv`);

  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        startedAt: new Date(startedAt).toISOString(),
        finishedAt: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
        stats,
        errors: allErrors,
        results: deduped,
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(csvPath, toCsv(deduped));

  console.log(`\n  JSON: ${jsonPath}`);
  console.log(`  CSV:  ${csvPath}`);

  // ── Optional DB persist ───────────────────────────────────────────────
  if (SAVE) {
    console.log('\n── Persisting to ChannelCandidate ──');
    try {
      const { saved, dupes, errors } = await saveToDb(deduped);
      console.log(`  Saved: ${saved}, Dupes: ${dupes}, Errors: ${errors.length}`);
      if (errors.length) errors.slice(0, 5).forEach((e) => console.log(`    - ${e}`));
    } catch (err) {
      console.error(`  DB persist failed: ${err.message}`);
    }
  }

  console.log(`\n  Runtime: ${((Date.now() - startedAt) / 1000).toFixed(1)}s\n`);
  process.exit(0);
})().catch((err) => {
  console.error('[Harvest] FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
