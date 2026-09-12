/**
 * Import a previously-generated harvest JSON into ChannelCandidate.
 *
 * Reads the JSON produced by scripts/harvest-canaleswpp-whts.js (no re-scrape)
 * and upserts each entry as a WhatsApp ChannelCandidate. Dedupes against:
 *   - existing ChannelCandidate.username
 *   - existing ChannelCandidate.raw_metrics.channelCode (covers the freshly
 *     repaired wachannelsfinder rows that are keyed by slug, not code)
 *   - existing Canal.identificadorCanal (live channels)
 *
 * Read-only by default. Pass --apply to persist.
 *
 * Usage:
 *   node scripts/import-harvest.js                          # dry-run (latest harvest JSON)
 *   node scripts/import-harvest.js --apply
 *   node scripts/import-harvest.js logs/harvest-foo.json --apply
 */
require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');
const pathArg = process.argv.slice(2).find((a) => a.endsWith('.json'));

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
  const inputPath = pathArg || findLatestHarvestJson();
  if (!inputPath || !fs.existsSync(inputPath)) {
    console.error('No harvest JSON found. Pass a path or run harvest first.');
    process.exit(1);
  }

  console.log('═════════════════════════════════════════════════════════');
  console.log('  Import harvest into ChannelCandidate');
  console.log('═════════════════════════════════════════════════════════');
  console.log(`  Input: ${inputPath}`);
  console.log(`  Mode:  ${APPLY ? 'APPLY (writes to DB)' : 'DRY RUN'}`);

  const harvest = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const rows = harvest.results || [];
  console.log(`  Harvest rows: ${rows.length}\n`);

  await mongoose.connect(process.env.MONGODB_URI);
  const ChannelCandidate = require('../models/ChannelCandidate');
  const Canal = require('../models/Canal');

  // ── Build dedup indices ──────────────────────────────────────────────
  const allWaCands = await ChannelCandidate.find(
    { plataforma: 'whatsapp' },
    { username: 1, source: 1, 'raw_metrics.channelCode': 1 },
  ).lean();
  const existingByCode = new Map();
  const existingByUsername = new Set();
  for (const c of allWaCands) {
    if (c.username) existingByUsername.add(c.username);
    const code = c.raw_metrics?.channelCode;
    if (code) existingByCode.set(code, { id: c._id, source: c.source, username: c.username });
  }

  const liveCanals = await Canal.find(
    { plataforma: 'whatsapp' },
    { identificadorCanal: 1, nombreCanal: 1 },
  ).lean();
  const canalByCode = new Map();
  for (const c of liveCanals) {
    const id = (c.identificadorCanal || '').replace(/^wa:/, '').replace(/^https?:\/\/whatsapp\.com\/channel\//, '');
    if (id) canalByCode.set(id, { id: c._id, name: c.nombreCanal });
  }
  console.log(`  Indexed: ${existingByUsername.size} candidate usernames`);
  console.log(`  Indexed: ${existingByCode.size} candidates by channelCode`);
  console.log(`  Indexed: ${canalByCode.size} live Canals\n`);

  // ── Walk harvest rows ────────────────────────────────────────────────
  const stats = { total: rows.length, inserted: 0, dupe_username: 0, dupe_code: 0, dupe_canal: 0, errors: 0 };
  const inserted = [];
  const dupes = [];
  const errors = [];

  for (const r of rows) {
    if (!r.channelCode) {
      stats.errors++;
      errors.push({ row: r, reason: 'missing channelCode' });
      continue;
    }
    const username = `wa:${r.channelCode}`;

    if (existingByUsername.has(username)) {
      stats.dupe_username++;
      dupes.push({ row: r, reason: 'username-collision', match: 'self-key' });
      continue;
    }
    if (canalByCode.has(r.channelCode)) {
      stats.dupe_canal++;
      const hit = canalByCode.get(r.channelCode);
      dupes.push({ row: r, reason: 'already in Canal', match: `${hit.id} (${hit.name || ''})` });
      continue;
    }
    if (existingByCode.has(r.channelCode)) {
      stats.dupe_code++;
      const hit = existingByCode.get(r.channelCode);
      dupes.push({ row: r, reason: 'dupe of candidate', match: `${hit.id} (${hit.source}, ${hit.username})` });
      continue;
    }

    if (!APPLY) {
      stats.inserted++;
      inserted.push(r);
      existingByUsername.add(username);
      existingByCode.set(r.channelCode, { id: 'dry-run', source: r.source, username });
      continue;
    }

    try {
      await ChannelCandidate.create({
        username,
        plataforma: 'whatsapp',
        source: r.source,
        status: 'pending_review',
        scraped_at: new Date(),
        raw_metrics: {
          title: r.name || '',
          description: r.description || '',
          subscribers: r.followers || 0,
          category: r.category || '',
          country: r.country || '',
          kind: r.kind || '',
          channelCode: r.channelCode,
          inviteLink: r.inviteLink || '',
          sourceUrl: r.sourceUrl || '',
          image: r.image || '',
          tags: r.tags || [],
          author: r.author || '',
          datePublished: r.datePublished || '',
          dateModified: r.dateModified || '',
          source_platform: 'whatsapp',
          discoveredVia: r.source,
          imported_at: new Date().toISOString(),
        },
      });
      stats.inserted++;
      inserted.push(r);
      existingByUsername.add(username);
      existingByCode.set(r.channelCode, { id: 'just-inserted', source: r.source, username });
    } catch (err) {
      if (err.code === 11000) {
        stats.dupe_username++;
        dupes.push({ row: r, reason: 'unique-index-collision' });
      } else {
        stats.errors++;
        errors.push({ row: r, reason: err.message });
      }
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────
  console.log('═════════════════════════════════════════════════════════');
  console.log('  Import summary');
  console.log('═════════════════════════════════════════════════════════');
  console.log(`  Total in harvest:      ${stats.total}`);
  console.log(`  Inserted:              ${stats.inserted}`);
  console.log(`  Dupe (username):       ${stats.dupe_username}`);
  console.log(`  Dupe (channelCode):    ${stats.dupe_code}`);
  console.log(`  Dupe (already Canal):  ${stats.dupe_canal}`);
  console.log(`  Errors:                ${stats.errors}`);
  console.log(`  Mode:                  ${APPLY ? 'APPLY' : 'DRY RUN'}`);

  // Save log
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const logPath = path.join(__dirname, '..', 'logs', `import-harvest-${ts}.json`);
  fs.writeFileSync(
    logPath,
    JSON.stringify(
      {
        input: inputPath,
        apply: APPLY,
        stats,
        dupes: dupes.slice(0, 50), // cap log size
        errors: errors.slice(0, 50),
      },
      null,
      2,
    ),
  );
  console.log(`\n  Log: ${logPath}`);

  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error('[Import] FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
