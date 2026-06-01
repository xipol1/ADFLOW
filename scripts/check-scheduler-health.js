#!/usr/bin/env node
/**
 * check-scheduler-health.js — early-warning monitor for the always-on Fly worker.
 *
 * WHY
 * ---
 * The payout / escrow-release loop (lib/campaignCron.js) and the 9 heavy
 * background jobs (lib/jobScheduler.js) run ONLY in the single Fly worker that
 * has ENABLE_BACKGROUND_JOBS=true. That box is a single point of failure: if it
 * stops (auto_stop, OOM, crash, a deploy that drops the flag) then creators stop
 * getting paid and campaigns stop auto-completing — silently.
 *
 * campaignCron does not write JobLog, but it lives in the SAME process as the
 * scheduler. So the freshest scheduler JobLog is a reliable proxy for "the
 * worker is alive and the payout cron is ticking". The lightest, most reliable
 * daily job is `scoring`; if its last completed run is fresh, the worker is up.
 *
 * USAGE
 * -----
 *   node scripts/check-scheduler-health.js          # human-readable table
 *   node scripts/check-scheduler-health.js --json    # machine output (for alerts)
 *
 * EXIT CODES (so this can drive an alert / cron / uptime check)
 *   0  all daily jobs have a fresh completed run
 *   1  at least one daily job is STALE or MISSING, or the latest run FAILED
 *   2  could not connect to Mongo / unexpected error
 *
 * Wire it from a machine with Atlas access, e.g. a cron:
 *   node scripts/check-scheduler-health.js --json || curl -fsS "$ALERT_WEBHOOK" -d @-
 */

require('dotenv').config();

// Atlas SRV lookups fail behind some resolvers; force public DNS like the
// sibling check-last-jobs.js script does.
const dns = require('dns');
try { dns.setServers(['1.1.1.1', '8.8.8.8']); } catch { /* non-fatal */ }

const mongoose = require('mongoose');

const HOUR = 60 * 60 * 1000;

/**
 * Expected jobs and their freshness budget. Thresholds = schedule cadence + a
 * generous grace margin (downtime / tick drift / a long-running prior job).
 *   daily   → must have completed within ~26h
 *   weekly  → must have completed within ~8 days
 * `daily:true` jobs gate the exit code; weekly jobs are reported but advisory.
 */
const EXPECTED = [
  { type: 'scoring', label: 'scoring (payout-alive proxy)', maxAgeMs: 26 * HOUR, daily: true },
  { type: 'telegram-intel', label: 'telegram-intel', maxAgeMs: 26 * HOUR, daily: true },
  { type: 'meta-refresh', label: 'meta-refresh (OAuth tokens)', maxAgeMs: 26 * HOUR, daily: true },
  { type: 'channels-health', label: 'channels-health', maxAgeMs: 26 * HOUR, daily: true },
  { type: 'metrics-capture', label: 'metrics-capture', maxAgeMs: 26 * HOUR, daily: true },
  { type: 'multiplatform-intel', label: 'multiplatform-intel', maxAgeMs: 26 * HOUR, daily: true },
  { type: 'swaps-maintenance', label: 'swaps-maintenance', maxAgeMs: 26 * HOUR, daily: true },
  { type: 'auth-cleanup', label: 'auth-cleanup', maxAgeMs: 26 * HOUR, daily: true },
  { type: 'tgstat-discover', label: 'tgstat-discover (weekly)', maxAgeMs: 8 * 24 * HOUR, daily: false },
];

function fmtAge(ms) {
  if (ms == null) return 'never';
  const h = ms / HOUR;
  if (h < 48) return `${h.toFixed(1)}h ago`;
  return `${(h / 24).toFixed(1)}d ago`;
}

(async () => {
  const json = process.argv.includes('--json');
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGODB_URI not set — cannot check scheduler health.');
    process.exit(2);
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    const JobLog = require('../models/JobLog');
    const now = Date.now();
    const rows = [];

    for (const job of EXPECTED) {
      // Latest run of any status (to surface a recent failure), plus the latest
      // *completed* run (to measure freshness).
      const [latest, lastOk] = await Promise.all([
        JobLog.findOne({ type: job.type }).sort({ startedAt: -1 }).lean(),
        JobLog.findOne({ type: job.type, status: 'completed' }).sort({ completedAt: -1 }).lean(),
      ]);

      const okAt = lastOk?.completedAt ? new Date(lastOk.completedAt).getTime() : null;
      const ageMs = okAt != null ? now - okAt : null;

      let verdict;
      if (okAt == null) verdict = 'MISSING';
      else if (ageMs > job.maxAgeMs) verdict = 'STALE';
      else verdict = 'OK';

      // A fresh OK run supersedes an older failure; only flag FAILED when the
      // most recent run failed AND there is no fresh success after it.
      const latestFailed =
        latest?.status === 'failed' &&
        (okAt == null || new Date(latest.startedAt).getTime() > okAt);
      if (latestFailed && verdict !== 'STALE') verdict = 'FAILED';

      rows.push({
        type: job.type,
        label: job.label,
        daily: job.daily,
        verdict,
        lastCompletedAt: lastOk?.completedAt || null,
        ageMs,
        latestStatus: latest?.status || 'none',
        latestError: latestFailed ? (latest.error || '').slice(0, 200) : '',
      });
    }

    const failing = rows.filter((r) => r.daily && r.verdict !== 'OK');
    const healthy = failing.length === 0;

    if (json) {
      console.log(JSON.stringify({ healthy, checkedAt: new Date(now).toISOString(), rows }, null, 2));
    } else {
      console.log('\n=== SCHEDULER / PAYOUT-WORKER HEALTH ===');
      console.log(`Checked at ${new Date(now).toISOString()}\n`);
      for (const r of rows) {
        const mark = r.verdict === 'OK' ? '✅' : r.verdict === 'STALE' ? '⚠️ ' : '❌';
        console.log(`${mark} ${r.label.padEnd(32)} ${r.verdict.padEnd(8)} last ok: ${fmtAge(r.ageMs)}`);
        if (r.latestError) console.log(`     └─ latest run failed: ${r.latestError}`);
      }
      console.log('');
      if (healthy) {
        console.log('✅ HEALTHY — the Fly worker is alive; payout/escrow cron is ticking.');
      } else {
        console.log('❌ DEGRADED — the following DAILY jobs are not fresh:');
        failing.forEach((r) => console.log(`   - ${r.type} (${r.verdict})`));
        console.log('\n   Likely the Fly worker is stopped or ENABLE_BACKGROUND_JOBS is off.');
        console.log('   Check: flyctl status -a channelad-api-test  &&  flyctl logs -a channelad-api-test');
      }
    }

    await mongoose.disconnect();
    process.exit(healthy ? 0 : 1);
  } catch (err) {
    console.error('check-scheduler-health ERROR:', err.message);
    try { await mongoose.disconnect(); } catch { /* noop */ }
    process.exit(2);
  }
})();
