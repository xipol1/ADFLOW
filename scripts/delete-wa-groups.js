/**
 * Delete WhatsApp ChannelCandidate documents with kind='group'.
 *
 * Groups (chat.whatsapp.com/...) are out of scope for ChannelAd. This script
 * permanently removes them from the staging collection so admin queries and
 * the enrichment pipeline only see channels (kind='channel').
 *
 * Reversible only by re-running whts.club / cheetah / igrupos scrapers.
 *
 * Read-only by default. Pass --apply to actually delete.
 *
 * Usage:
 *   node scripts/delete-wa-groups.js              # dry-run (counts only)
 *   node scripts/delete-wa-groups.js --apply      # actually delete
 *   node scripts/delete-wa-groups.js --apply --limit 10  # delete first 10 only
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

(async () => {
  const started = Date.now();
  console.log('═════════════════════════════════════════════════════════');
  console.log('  Delete WA group candidates (out of scope)');
  console.log('═════════════════════════════════════════════════════════');
  console.log(`  Mode: ${APPLY ? 'APPLY (deletes from DB)' : 'DRY RUN (no deletes)'}`);
  if (LIMIT) console.log(`  Limit: ${LIMIT}`);
  console.log('');

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is missing.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const ChannelCandidate = require('../models/ChannelCandidate');

  const query = { plataforma: 'whatsapp', 'raw_metrics.kind': 'group' };

  // Pre-flight: count + breakdown
  const totalCount = await ChannelCandidate.countDocuments(query);
  const bySource = await ChannelCandidate.aggregate([
    { $match: query },
    { $group: { _id: '$source', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  const byStatus = await ChannelCandidate.aggregate([
    { $match: query },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  console.log(`  Group candidates matched: ${totalCount}`);
  console.log(`  By source:`);
  for (const r of bySource) console.log(`     ${String(r._id).padEnd(20)} ${String(r.count).padStart(6)}`);
  console.log(`  By status:`);
  for (const r of byStatus) console.log(`     ${String(r._id).padEnd(20)} ${String(r.count).padStart(6)}`);

  // Snapshot a backup CSV before deletion — recoverable seed list
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const logsDir = path.join(__dirname, '..', 'logs');
  try {
    fs.mkdirSync(logsDir, { recursive: true });
  } catch {
    // ignore
  }
  const backupCsv = path.join(logsDir, `delete-wa-groups-${ts}-backup.csv`);

  const snapshotQuery = ChannelCandidate.find(
    query,
    {
      _id: 1,
      username: 1,
      source: 1,
      status: 1,
      'raw_metrics.title': 1,
      'raw_metrics.channelCode': 1,
      'raw_metrics.inviteLink': 1,
      'raw_metrics.category': 1,
      'raw_metrics.country': 1,
    },
  ).lean();
  if (LIMIT > 0) snapshotQuery.limit(LIMIT);
  const docs = await snapshotQuery;

  const lines = ['id,username,source,status,channelCode,inviteLink,category,country,title'];
  for (const d of docs) {
    const rm = d.raw_metrics || {};
    const esc = (v) => {
      const s = String(v ?? '').replace(/\r?\n/g, ' ');
      return /[",;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    lines.push(
      [d._id, d.username, d.source, d.status, rm.channelCode || '', rm.inviteLink || '', rm.category || '', rm.country || '', rm.title || '']
        .map(esc)
        .join(','),
    );
  }
  fs.writeFileSync(backupCsv, lines.join('\n'));
  console.log(`\n  Backup CSV written: ${backupCsv}  (${docs.length} rows)`);

  // ── Delete ──────────────────────────────────────────────────────────
  let deleted = 0;
  if (APPLY) {
    if (LIMIT > 0) {
      const ids = docs.map((d) => d._id);
      const r = await ChannelCandidate.deleteMany({ _id: { $in: ids } });
      deleted = r.deletedCount;
    } else {
      const r = await ChannelCandidate.deleteMany(query);
      deleted = r.deletedCount;
    }
    console.log(`\n  Deleted: ${deleted} document(s).`);
  } else {
    console.log(`\n  DRY RUN — nothing deleted. Pass --apply to actually delete.`);
  }

  console.log(`\n  Duration: ${((Date.now() - started) / 1000).toFixed(1)}s`);

  await mongoose.disconnect();
  process.exit(0);
})().catch(async (err) => {
  console.error('[Delete] FATAL:', err.message);
  console.error(err.stack);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
