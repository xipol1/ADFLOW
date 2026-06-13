#!/usr/bin/env node
/**
 * run-scheduled-jobs.js — one-shot runner for the background jobs in
 * lib/jobScheduler.js, for environments without the always-on Fly worker
 * (GitHub Actions scheduled workflow, or a manual run from a laptop).
 *
 * Runs the requested job types SEQUENTIALLY through runJobNow(), which keeps
 * every guarantee of the in-process scheduler: JobLog lock, dedup window
 * (a job that already completed in its window is silently skipped, so this is
 * safe to fire even when Vercel crons or the Fly worker also ran), and
 * stale-running detection.
 *
 * USAGE
 *   node scripts/run-scheduled-jobs.js                          # all 9 jobs
 *   node scripts/run-scheduled-jobs.js telegram-intel scoring   # subset
 *
 * EXIT CODES
 *   0  every requested job completed or was skipped by its dedup window
 *   1  at least one job's latest run failed
 *   2  could not connect to Mongo / unknown job type
 */

require('dotenv').config();

// Atlas SRV lookups fail behind some resolvers; force public DNS like the
// sibling check-*.js scripts do.
const dns = require('dns');
try { dns.setServers(['1.1.1.1', '8.8.8.8']); } catch { /* non-fatal */ }

const mongoose = require('mongoose');
const { runJobNow, JOBS } = require('../lib/jobScheduler');

(async () => {
  const requested = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const known = JOBS.map((j) => j.type);
  const types = requested.length ? requested : known;

  const unknown = types.filter((t) => !known.includes(t));
  if (unknown.length) {
    console.error(`Unknown job type(s): ${unknown.join(', ')}. Known: ${known.join(', ')}`);
    process.exit(2);
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGODB_URI not set.');
    process.exit(2);
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  } catch (err) {
    console.error('Mongo connect failed:', err.message);
    process.exit(2);
  }

  const JobLog = require('../models/JobLog');
  const startedAt = new Date();
  let anyFailed = false;

  for (const type of types) {
    console.log(`\n=== ${type} ===`);
    const t0 = Date.now();
    // runJobNow handles its own errors and records them in JobLog; it only
    // throws for unknown types, which we already validated.
    await runJobNow(type);
    const last = await JobLog.findOne({ type, startedAt: { $gte: startedAt } })
      .sort({ startedAt: -1 })
      .lean();
    if (!last) {
      console.log(`${type}: skipped (already completed inside its dedup window, or lock held)`);
    } else if (last.status === 'failed') {
      anyFailed = true;
      console.error(`${type}: FAILED in ${Math.round((Date.now() - t0) / 1000)}s — ${last.error}`);
    } else {
      console.log(`${type}: ${last.status} in ${Math.round((Date.now() - t0) / 1000)}s`);
    }
  }

  await mongoose.disconnect();
  process.exit(anyFailed ? 1 : 0);
})();
