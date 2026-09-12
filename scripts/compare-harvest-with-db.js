/**
 * Compare a harvest JSON against the existing DB (ChannelCandidate + Canal).
 *
 * Read-only. Reports which harvest entries are already known (as candidates
 * or as live Canals) and which are genuinely new.
 *
 * Matches WhatsApp channels/groups by the invite code:
 *   - ChannelCandidate.username === "wa:{channelCode}"
 *   - Canal.identificadorCanal matches "{channelCode}" or "wa:{channelCode}"
 *   - Canal.identificadorCanal contains "{channelCode}" as substring
 *
 * Outputs:
 *   logs/harvest-compare-{ts}.json      — full classification
 *   logs/harvest-compare-{ts}-new.csv   — only the rows that are NEW
 *   logs/harvest-compare-{ts}-dupes.csv — only the rows that are dupes
 *
 * Usage:
 *   node scripts/compare-harvest-with-db.js                          # auto-picks latest harvest JSON
 *   node scripts/compare-harvest-with-db.js logs/harvest-foo.json    # specific harvest file
 */
require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value).replace(/\r?\n/g, ' ').trim();
  if (/[",;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows, headers) {
  if (rows.length === 0) return headers.join(',') + '\n';
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map((h) => csvEscape(r[h])).join(','));
  }
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
  const inputPath = process.argv[2] || findLatestHarvestJson();
  if (!inputPath || !fs.existsSync(inputPath)) {
    console.error('No harvest JSON found. Run scripts/harvest-canaleswpp-whts.js first or pass a path.');
    process.exit(1);
  }

  console.log(`[Compare] Input: ${inputPath}`);
  const harvest = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const rows = harvest.results || [];
  console.log(`[Compare] Harvest rows: ${rows.length}`);

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Configure .env (or copy from the main repo).');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const ChannelCandidate = require('../models/ChannelCandidate');
  const Canal = require('../models/Canal');

  // ── Build the known-codes index from ChannelCandidate ─────────────────
  // username format: "wa:{channelCode}" for WA candidates
  const waCandidates = await ChannelCandidate.find(
    { plataforma: 'whatsapp' },
    { username: 1, source: 1, status: 1, raw_metrics: 1 },
  ).lean();
  console.log(`[Compare] ChannelCandidate WA: ${waCandidates.length}`);

  const candidateByCode = new Map();
  for (const c of waCandidates) {
    const code = (c.username || '').replace(/^wa:/, '');
    if (code) candidateByCode.set(code, c);
    // Also try the raw channelCode field (some entries store the slug as username)
    const rawCode = c.raw_metrics?.channelCode;
    if (rawCode && !candidateByCode.has(rawCode)) candidateByCode.set(rawCode, c);
  }

  // ── Build the known-codes index from Canal (live channels) ────────────
  const waCanales = await Canal.find(
    { plataforma: 'whatsapp' },
    { identificadorCanal: 1, nombreCanal: 1, estado: 1, 'estadisticas.seguidores': 1 },
  ).lean();
  console.log(`[Compare] Canal WA: ${waCanales.length}`);

  const canalByCode = new Map();
  for (const c of waCanales) {
    const id = c.identificadorCanal || '';
    const code = id.replace(/^wa:/, '');
    if (code) canalByCode.set(code, c);
  }

  // For Canal we also use a "contains" pass since some identifiers are
  // phoneNumberId or arbitrary strings — match by substring of the full ID.
  const canalIds = waCanales.map((c) => ({
    full: c.identificadorCanal || '',
    canal: c,
  }));

  // ── Classify each harvest row ─────────────────────────────────────────
  const classified = {
    new: [],
    dupe_candidate: [],
    dupe_canal: [],
  };

  for (const r of rows) {
    const code = r.channelCode;
    if (!code) {
      classified.new.push({ ...r, _match: 'no-code' });
      continue;
    }

    // 1) Exact match against Canal (live) — strongest signal
    const canalHit = canalByCode.get(code);
    if (canalHit) {
      classified.dupe_canal.push({
        ...r,
        _match_id: canalHit._id?.toString(),
        _match_name: canalHit.nombreCanal,
        _match_estado: canalHit.estado,
        _match_followers: canalHit.estadisticas?.seguidores ?? 0,
      });
      continue;
    }

    // 2) Substring match against Canal identifiers (handles phoneNumberId etc.)
    const canalSubstring = canalIds.find((c) => c.full.includes(code) || code.includes(c.full));
    if (canalSubstring) {
      classified.dupe_canal.push({
        ...r,
        _match_id: canalSubstring.canal._id?.toString(),
        _match_name: canalSubstring.canal.nombreCanal,
        _match_estado: canalSubstring.canal.estado,
        _match_followers: canalSubstring.canal.estadisticas?.seguidores ?? 0,
        _match_via: 'substring',
      });
      continue;
    }

    // 3) Match against ChannelCandidate
    const candHit = candidateByCode.get(code);
    if (candHit) {
      classified.dupe_candidate.push({
        ...r,
        _match_source: candHit.source,
        _match_status: candHit.status,
      });
      continue;
    }

    classified.new.push(r);
  }

  // ── Summary ───────────────────────────────────────────────────────────
  const summary = {
    input: inputPath,
    harvest_total: rows.length,
    db_candidates_wa: waCandidates.length,
    db_canales_wa: waCanales.length,
    classified: {
      new: classified.new.length,
      dupe_in_candidate: classified.dupe_candidate.length,
      dupe_in_canal: classified.dupe_canal.length,
    },
    new_by_source: {},
    new_by_kind: { channel: 0, group: 0, unknown: 0 },
    dupe_candidate_by_source: {},
    dupe_canal_by_state: {},
  };
  for (const r of classified.new) {
    summary.new_by_source[r.source] = (summary.new_by_source[r.source] || 0) + 1;
    summary.new_by_kind[r.kind || 'unknown']++;
  }
  for (const r of classified.dupe_candidate) {
    summary.dupe_candidate_by_source[r._match_source] = (summary.dupe_candidate_by_source[r._match_source] || 0) + 1;
  }
  for (const r of classified.dupe_canal) {
    const k = r._match_estado || 'unknown';
    summary.dupe_canal_by_state[k] = (summary.dupe_canal_by_state[k] || 0) + 1;
  }

  console.log('\n═════════════════════════════════════════════════════════');
  console.log('  Compare summary');
  console.log('═════════════════════════════════════════════════════════');
  console.log(`  Harvest rows:           ${summary.harvest_total}`);
  console.log(`  DB Canals (WA):         ${summary.db_canales_wa}`);
  console.log(`  DB Candidates (WA):     ${summary.db_candidates_wa}`);
  console.log('');
  console.log(`  NEW (not in DB):        ${summary.classified.new}`);
  console.log(`  Dupes in Candidates:    ${summary.classified.dupe_in_candidate}`);
  console.log(`  Dupes in Canal (live):  ${summary.classified.dupe_in_canal}`);
  console.log('');
  console.log(`  NEW by source: ${JSON.stringify(summary.new_by_source)}`);
  console.log(`  NEW by kind:   ${JSON.stringify(summary.new_by_kind)}`);
  if (Object.keys(summary.dupe_candidate_by_source).length) {
    console.log(`  Candidate-dupe by source: ${JSON.stringify(summary.dupe_candidate_by_source)}`);
  }
  if (Object.keys(summary.dupe_canal_by_state).length) {
    console.log(`  Canal-dupe by estado: ${JSON.stringify(summary.dupe_canal_by_state)}`);
  }

  // ── Outputs ───────────────────────────────────────────────────────────
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const logsDir = path.join(__dirname, '..', 'logs');
  const newCsv = path.join(logsDir, `harvest-compare-${ts}-new.csv`);
  const dupesCsv = path.join(logsDir, `harvest-compare-${ts}-dupes.csv`);
  const fullJson = path.join(logsDir, `harvest-compare-${ts}.json`);

  const baseHeaders = [
    'source',
    'kind',
    'channelCode',
    'name',
    'followers',
    'category',
    'country',
    'inviteLink',
    'sourceUrl',
  ];

  fs.writeFileSync(newCsv, toCsv(classified.new, baseHeaders));
  fs.writeFileSync(
    dupesCsv,
    toCsv(
      [...classified.dupe_candidate, ...classified.dupe_canal],
      [...baseHeaders, '_match_source', '_match_status', '_match_id', '_match_name', '_match_estado', '_match_followers', '_match_via'],
    ),
  );
  fs.writeFileSync(fullJson, JSON.stringify({ summary, classified }, null, 2));

  console.log(`\n  NEW CSV:    ${newCsv}`);
  console.log(`  Dupes CSV:  ${dupesCsv}`);
  console.log(`  Full JSON:  ${fullJson}`);

  await mongoose.disconnect();
  console.log('\n[Compare] Done.');
  process.exit(0);
})().catch((err) => {
  console.error('[Compare] FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
