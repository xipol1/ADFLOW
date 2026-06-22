#!/usr/bin/env node
/**
 * Standalone background-job runner — runs ONE job to completion, then exits.
 *
 * WHY
 * ---
 * The heavy discovery / intel jobs (telegram-intel ≈22 min, multiplatform-intel
 * several min, tgstat-discover ≈3 min) can never finish inside Vercel's 60s
 * serverless cap, so the Vercel Crons that used to fire them were effectively
 * dead (see memory/project_metrics_scrapers_audit_2026-06.md and the header of
 * lib/jobScheduler.js). The intended cutover was the always-on Fly worker, but
 * that machine is suspended. This script lets a FREE GitHub Actions workflow
 * (.github/workflows/discovery-jobs.yml) play that role: it runs the EXACT same
 * job functions as the in-process scheduler and the /api/jobs/* routes — same
 * JobLog window/overlap lock, same persistence — just without any timeout.
 *
 * USAGE
 * -----
 *   node scripts/run-job.js telegram-intel
 *   node scripts/run-job.js tgstat-discover --force   # bypass the dedup window
 *   node scripts/run-job.js --list                    # show known job types
 *
 * EXIT CODES
 * ----------
 *   0  job completed, or was skipped by the dedup/overlap lock (expected)
 *   1  job ran but failed, or the DB connection failed
 *   2  bad usage (unknown / missing job type)
 *
 * Required env (provide as GitHub Secrets in CI): MONGODB_URI. Telegram jobs
 * also need TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_SESSION.
 */

require('dotenv').config();

// Atlas SRV lookups fail behind some networks / CI resolvers — pin public DNS,
// matching scripts/run-multiplatform-discovery.js and run-all-scrapers-now.js.
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const { runJobNow, JOBS } = require('../lib/jobScheduler');
const database = require('../config/database');

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const known = JOBS.map((j) => j.type);

  if (args.includes('--list') || args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node scripts/run-job.js <type> [--force]');
    console.log(`Known job types:\n  ${known.join('\n  ')}`);
    process.exit(0);
  }

  const type = args.find((a) => !a.startsWith('--'));
  if (!type || !known.includes(type)) {
    console.error(`✗ Unknown or missing job type: ${type || '(none)'}`);
    console.error(`  Known types: ${known.join(', ')}`);
    process.exit(2);
  }

  console.log(`[run-job] ${type}${force ? ' (force)' : ''} — starting ${new Date().toISOString()}`);
  const t0 = Date.now();

  const ok = await database.conectar();
  if (!ok) {
    console.error('[run-job] ✗ MongoDB connection failed (check MONGODB_URI).');
    process.exit(1);
  }

  let outcome;
  try {
    outcome = await runJobNow(type, { force });
  } catch (err) {
    console.error(`[run-job] ✗ ${type} threw:`, err?.message || err);
    await database.desconectar().catch(() => {});
    process.exit(1);
  }

  const secs = Math.round((Date.now() - t0) / 1000);
  console.log(`[run-job] ${type} → ${outcome?.status || 'unknown'} in ${secs}s`, JSON.stringify(outcome)?.slice(0, 500));

  await database.desconectar().catch(() => {});

  // 'completed' and 'skipped' (dedup/overlap lock did its job) are both success.
  // Only a real in-job failure is a non-zero exit so CI surfaces it.
  process.exit(outcome?.status === 'failed' ? 1 : 0);
}

main();
