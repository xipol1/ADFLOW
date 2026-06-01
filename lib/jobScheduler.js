/**
 * In-process job scheduler for the always-on Fly backend.
 *
 * WHY THIS EXISTS
 * ---------------
 * The 9 background jobs are scheduled in vercel.json as Vercel Crons, which run
 * on serverless functions capped at 60s (Hobby plan). That is fine for the
 * scoring recompute (~1s) but the heavy jobs never finish in 60s and so were
 * effectively dead in production:
 *   - telegram-intel     527 channels × 2.5s MTProto rate-limit  ≈ 22 min
 *   - multiplatform-intel cheerio re-scrape + score 760+ channels ≈ several min
 *   - tgstat-discover     MTProto + Telemetr discovery            ≈ 2.6 min+
 * (See memory/project_metrics_scrapers_audit_2026-06.md.)
 *
 * On Fly the container is always up (auto_stop_machines="off", min=1), so we
 * schedule the SAME job functions the HTTP routes call, in-process, with no
 * timeout.
 *
 * GUARANTEES
 * ----------
 *  - Single runner: startJobScheduler() is a no-op unless
 *    ENABLE_BACKGROUND_JOBS === 'true'. Set that on exactly ONE Fly machine.
 *    Importing this module on Vercel / a second machine never schedules.
 *  - At-most-once-per-window + no overlap: each run is gated by a JobLog-backed
 *    lock. We skip if the same job already completed within its window, or if a
 *    previous run is still `running`. This makes the scheduler crash-safe across
 *    Fly redeploys (which are frequent) and tolerant of tick drift / downtime
 *    (a job missed at 03:00 because the box was down still runs when it comes
 *    back up, as long as we are still inside the window).
 *  - Bounded load: at most MAX_CONCURRENT jobs dispatch at once, so a cold boot
 *    past every scheduled time doesn't start all 9 simultaneously.
 *  - Observability: every run writes a JobLog (running → completed/failed) so
 *    scripts/check-last-jobs.js and the admin dashboard can see job health.
 *
 * CUTOVER (operator steps — see MIGRATION_FLY.md §6)
 * --------------------------------------------------
 *  1. Deploy to Fly with ENABLE_BACKGROUND_JOBS=true and confirm via JobLog /
 *     scripts/check-scraping-state.js that the heavy jobs complete.
 *  2. THEN remove the `crons` block from vercel.json so the heavy, flood-
 *     sensitive jobs (telegram-intel especially) aren't also fired by Vercel.
 *     Until step 2 the Vercel route can still run a job the scheduler also ran,
 *     so don't leave the gap open longer than needed.
 */

const TICK_MS = 60 * 1000; // evaluate schedules every minute
const FIRST_TICK_DELAY_MS = 90 * 1000; // let the DB connection settle after boot
const MAX_CONCURRENT = 2; // cap simultaneous job dispatches (shared-cpu-1x)
const STALE_RUNNING_MS = 3 * 60 * 60 * 1000; // a `running` JobLog older than this is treated as dead

const DAY_MIN = 20 * 60; // daily jobs: skip if a completed run exists in the last 20h
const WEEK_MIN = 6 * 24 * 60; // weekly jobs: skip if completed in the last 6 days

/**
 * Job registry. Times are UTC (matches the old vercel.json crons exactly).
 *   hour/minute — scheduled time of day
 *   dow         — optional day-of-week (0=Sun..6=Sat); omit for daily
 *   windowMin   — dedup window; a run is skipped if one already completed inside it
 *   run         — thunk returning a Promise; uses lazy require so one broken
 *                 module never blocks scheduler startup or the other jobs.
 */
const JOBS = [
  {
    type: 'telegram-intel',
    hour: 2, minute: 30, windowMin: DAY_MIN,
    run: () => require('../jobs/telegramIntelJob').runTelegramIntelJob(),
  },
  {
    type: 'scoring',
    hour: 3, minute: 0, windowMin: DAY_MIN,
    run: () => runScoringAll(),
  },
  {
    type: 'meta-refresh',
    hour: 3, minute: 0, windowMin: DAY_MIN,
    run: () => require('../services/tokenRefreshService').refreshExpiringTokens(),
  },
  {
    type: 'channels-health',
    hour: 3, minute: 15, windowMin: DAY_MIN,
    run: () => require('../services/channelHealthService').runHealthCheckBatch({ batchSize: 1000 }),
  },
  {
    type: 'metrics-capture',
    hour: 3, minute: 30, windowMin: DAY_MIN,
    run: () => require('../services/campaignSnapshotService').runSnapshotCapture({ batchSize: 500 }),
  },
  {
    type: 'multiplatform-intel',
    hour: 4, minute: 0, windowMin: DAY_MIN,
    run: () => require('../jobs/multiplatformIntelJob').runMultiplatformIntelJob(),
  },
  {
    type: 'swaps-maintenance',
    hour: 4, minute: 15, windowMin: DAY_MIN,
    run: () => require('../jobs/swapsMaintenanceJob').runSwapsMaintenanceJob(),
  },
  {
    type: 'auth-cleanup',
    hour: 4, minute: 30, windowMin: DAY_MIN,
    run: () => require('../jobs/unverifiedCleanupJob').runUnverifiedCleanupJob(),
  },
  {
    type: 'tgstat-discover',
    hour: 5, minute: 0, dow: 1, windowMin: WEEK_MIN, // Mondays
    run: () => require('../services/tgstatScraperService').batchDiscoverChannels({}),
  },
];

let timer = null;
let firstTimer = null;
const runningTypes = new Set(); // in-memory overlap guard (fast path)

/**
 * Drive the full scoring pass without the serverless 60s budget cap that
 * routes/adminScoring.js has to respect. Loops runScoringBatch until the
 * cursor is exhausted.
 */
async function runScoringAll() {
  const { runScoringBatch } = require('../services/scoringOrchestrator');
  const totals = { canalesProcesados: 0, canalesActualizados: 0, errores: 0, batches: 0 };
  let cursor = null;
  do {
    const page = await runScoringBatch({ cursor, trigger: 'scheduled' });
    totals.canalesProcesados += page.canalesProcesados || 0;
    totals.canalesActualizados += page.canalesActualizados || 0;
    totals.errores += page.errores || 0;
    totals.batches += 1;
    cursor = page.nextCursor;
  } while (cursor);
  return totals;
}

/**
 * Has this job's scheduled time for today (UTC) already passed, on the right
 * weekday? The JobLog window guard (in runJob) is what prevents re-runs — this
 * only decides whether we are past the trigger point, which makes the scheduler
 * robust to downtime and tick drift (a missed 03:00 still fires at 03:07).
 */
function isDue(job, now) {
  if (typeof job.dow === 'number' && now.getUTCDay() !== job.dow) return false;
  const minutesNow = now.getUTCHours() * 60 + now.getUTCMinutes();
  const minutesSched = job.hour * 60 + job.minute;
  return minutesNow >= minutesSched;
}

/**
 * Keep JobLog.result small — telegram-intel can return 500+ error strings.
 */
function summarize(result) {
  if (!result || typeof result !== 'object') return result ?? null;
  const out = {};
  for (const [k, v] of Object.entries(result)) {
    if (Array.isArray(v)) out[k] = v.slice(0, 25);
    else out[k] = v;
  }
  return out;
}

/**
 * Acquire the DB lock, run the job, record the outcome. Idempotent: the
 * window/in-flight guards make a double dispatch (tick drift, or a Vercel cron
 * firing the same job) a no-op as long as both share this Mongo.
 */
async function runJob(job) {
  const { ensureDb } = require('./ensureDb');
  const JobLog = require('../models/JobLog');

  if (!(await ensureDb())) return;

  // Window guard: already completed inside the dedup window? skip.
  const since = new Date(Date.now() - job.windowMin * 60 * 1000);
  const recent = await JobLog.findOne({
    type: job.type,
    status: 'completed',
    completedAt: { $gte: since },
  }).select('_id').lean();
  if (recent) return;

  // Overlap guard: a non-stale run already in flight? skip.
  const inflight = await JobLog.findOne({
    type: job.type,
    status: 'running',
    startedAt: { $gte: new Date(Date.now() - STALE_RUNNING_MS) },
  }).select('_id').lean();
  if (inflight) return;

  const startedAt = new Date();
  const jobId = `${job.type}-${startedAt.toISOString()}`;
  let log;
  try {
    log = await JobLog.create({ jobId, type: job.type, status: 'running', startedAt });
  } catch (err) {
    // Unique jobId collision == another tick beat us to it. Bail quietly.
    if (err.code === 11000) return;
    console.error(`[scheduler] ${job.type}: could not create JobLog:`, err.message);
    return;
  }

  console.log(`[scheduler] ${job.type} starting (jobId=${jobId})`);
  try {
    const result = await job.run();
    await JobLog.updateOne(
      { _id: log._id },
      { $set: { status: 'completed', completedAt: new Date(), result: summarize(result) } },
    );
    const ms = Date.now() - startedAt.getTime();
    console.log(`[scheduler] ${job.type} completed in ${Math.round(ms / 1000)}s`, JSON.stringify(summarize(result))?.slice(0, 300));
  } catch (err) {
    await JobLog.updateOne(
      { _id: log._id },
      { $set: { status: 'failed', completedAt: new Date(), error: String(err?.message || err).slice(0, 500) } },
    ).catch(() => {});
    console.error(`[scheduler] ${job.type} FAILED:`, err?.message || err);
  }
}

/**
 * One scheduler tick: dispatch due jobs, bounded by MAX_CONCURRENT.
 */
async function tick() {
  const now = new Date();
  for (const job of JOBS) {
    if (runningTypes.size >= MAX_CONCURRENT) break;
    if (runningTypes.has(job.type)) continue;
    if (!isDue(job, now)) continue;

    runningTypes.add(job.type);
    // Fire-and-forget so a 22-minute job never blocks the tick loop.
    runJob(job)
      .catch((err) => console.error(`[scheduler] ${job.type} dispatch error:`, err?.message || err))
      .finally(() => runningTypes.delete(job.type));
  }
}

/**
 * Start the scheduler. No-op unless ENABLE_BACKGROUND_JOBS === 'true'.
 */
function startJobScheduler() {
  if (process.env.ENABLE_BACKGROUND_JOBS !== 'true') {
    console.log('[scheduler] disabled (set ENABLE_BACKGROUND_JOBS=true on the Fly worker to enable)');
    return;
  }
  if (timer) return;
  firstTimer = setTimeout(() => {
    tick().catch((e) => console.error('[scheduler] tick error:', e?.message));
    timer = setInterval(() => {
      tick().catch((e) => console.error('[scheduler] tick error:', e?.message));
    }, TICK_MS);
  }, FIRST_TICK_DELAY_MS);
  console.log(`[scheduler] enabled — ${JOBS.length} jobs, first tick in ${FIRST_TICK_DELAY_MS / 1000}s`);
}

function stopJobScheduler() {
  if (firstTimer) { clearTimeout(firstTimer); firstTimer = null; }
  if (timer) { clearInterval(timer); timer = null; }
}

/**
 * Run a single job immediately by type, bypassing the schedule (still honours
 * the lock). Handy for manual ops / tests: require('./lib/jobScheduler').runJobNow('telegram-intel').
 */
async function runJobNow(type) {
  const job = JOBS.find((j) => j.type === type);
  if (!job) throw new Error(`Unknown job type: ${type}`);
  return runJob(job);
}

module.exports = { startJobScheduler, stopJobScheduler, runJobNow, JOBS };
