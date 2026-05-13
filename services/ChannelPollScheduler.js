/**
 * ChannelPollScheduler
 *
 * Capa 2 Fase 2 — BullMQ-backed scheduler that periodically enqueues
 * metadata snapshot jobs for every Canal where metricsIntelligence.enabled
 * is true. Lives in the SAME Node process as Baileys (VPS) because the job
 * processor needs a live socket from BaileysSessionManager.
 *
 * Why BullMQ rather than setInterval:
 *   - Priority queues (high/standard/low/cold) map naturally onto BullMQ's
 *     job priority field.
 *   - Per-canal job deduplication via jobId so we never enqueue twice if
 *     one tick overlaps the next.
 *   - Retries with exponential backoff on transient failures.
 *   - Observable via `getJobCounts()` for the admin health endpoint.
 *   - Restart-safe: pending jobs survive process restarts (in Redis).
 *
 * Why NOT use Vercel Cron (the codebase pattern elsewhere):
 *   - Vercel serverless can't hold a live Baileys WebSocket.
 *   - The scheduler MUST run on the VPS where Baileys is connected.
 *
 * Lazy dependencies: `bullmq` and `ioredis` are required() inside start()
 * so the module can be imported in environments without them (e.g. Vercel
 * cold path) without crashing. start() throws if they're missing.
 *
 * Operational model:
 *   start()  → opens Redis connection, instantiates Queue + Worker,
 *              kicks off a 60s "enqueue due polls" tick loop.
 *   stop()   → drains worker, closes Queue + Redis.
 *   pauseAll() / resumeAll()  → external hook for "Baileys session is
 *              down, don't process anything until reconnect".
 *   getHealthSnapshot()  → returns job counts + worker state for
 *              GET /api/admin/metrics/channel-intelligence/health.
 *
 * Job processor reads Canal + corresponding Baileys sock and calls
 * ChannelMetricsCollector.collectSnapshot. On success, recalculates the
 * canal's pollPriority based on observed activity recency. Full priority
 * recalculation that factors active Campaigns + growth rate lands in
 * Fase 4 — for now this is a simple heuristic.
 */

'use strict';

const Canal = require('../models/Canal');
const CanalPostObservation = require('../models/CanalPostObservation');
const baileysSessionManager = require('./baileys/BaileysSessionManager');
const channelMetricsCollector = require('./ChannelMetricsCollector');

const QUEUE_NAME = 'capa2-channel-metrics';
const ENQUEUE_TICK_MS = 60_000;          // re-evaluate due canals every 60s
const WORKER_CONCURRENCY = 3;            // 3 simultaneous snapshots (Baileys throughput cap)

// Priority → poll interval map. The plan committed in Fase 1 documentation.
const POLL_INTERVALS_MS = {
  high: 2 * 3600 * 1000,            // 2h
  standard: 12 * 3600 * 1000,       // 12h
  low: 24 * 3600 * 1000,            // 24h
  cold: 7 * 24 * 3600 * 1000,       // 7d
};

// Lower BullMQ numeric priority = higher actual priority. We invert the
// semantic priority to BullMQ's scale.
const BULLMQ_PRIORITIES = {
  high: 1,
  standard: 5,
  low: 10,
  cold: 20,
};

class ChannelPollScheduler {
  constructor() {
    this.queue = null;
    this.queueEvents = null;
    this.worker = null;
    this.connection = null;
    this.enqueueTimer = null;
    this.running = false;
  }

  /**
   * Start the scheduler. Requires REDIS_URL in the environment (or defaults
   * to redis://127.0.0.1:6379). Idempotent — calling twice is a no-op after
   * the first.
   */
  async start() {
    if (this.running) {
      console.warn('[poll-scheduler] start() called while already running');
      return;
    }

    // Lazy-load BullMQ + ioredis. Missing deps surface a clear error here
    // instead of at module-load time (so the rest of the app stays usable).
    let bullmq;
    let RedisCtor;
    try {
      bullmq = require('bullmq');
      RedisCtor = require('ioredis');
    } catch (err) {
      throw new Error(
        `ChannelPollScheduler requires bullmq + ioredis. Install with: npm i bullmq ioredis. Underlying error: ${err.message}`
      );
    }
    const { Queue, Worker, QueueEvents } = bullmq;

    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    this.connection = new RedisCtor(redisUrl, {
      // BullMQ requires this — keeps the connection alive for blocking ops.
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    this.connection.on('error', (err) => {
      console.error('[poll-scheduler] redis error:', err.message);
    });

    this.queue = new Queue(QUEUE_NAME, { connection: this.connection });
    this.queueEvents = new QueueEvents(QUEUE_NAME, { connection: this.connection.duplicate() });

    this.worker = new Worker(
      QUEUE_NAME,
      (job) => this._processPollJob(job),
      { connection: this.connection.duplicate(), concurrency: WORKER_CONCURRENCY }
    );

    this.worker.on('completed', (job, result) => {
      console.log(`[poll-scheduler] job ${job?.id} OK — subscribers=${result?.subscribersCount ?? '?'}`);
    });
    this.worker.on('failed', (job, err) => {
      console.error(`[poll-scheduler] job ${job?.id} FAILED — canal=${job?.data?.canalId} err="${err?.message}"`);
    });

    this.running = true;

    // Kick off the enqueue loop. Run once immediately so a fresh process
    // doesn't wait 60s before doing anything.
    this._scheduleEnqueueTick();
    await this._enqueueDuePolls().catch((e) =>
      console.error('[poll-scheduler] initial enqueue crashed:', e.message)
    );

    console.log(`[poll-scheduler] started (queue=${QUEUE_NAME}, concurrency=${WORKER_CONCURRENCY}, redis=${redisUrl})`);
  }

  async stop() {
    if (!this.running) return;
    this.running = false;
    if (this.enqueueTimer) clearInterval(this.enqueueTimer);
    this.enqueueTimer = null;

    try { await this.worker?.close(); } catch (e) { console.warn('[poll-scheduler] worker.close error:', e.message); }
    try { await this.queueEvents?.close(); } catch (e) { console.warn('[poll-scheduler] queueEvents.close error:', e.message); }
    try { await this.queue?.close(); } catch (e) { console.warn('[poll-scheduler] queue.close error:', e.message); }
    try { await this.connection?.quit(); } catch (e) { console.warn('[poll-scheduler] redis.quit error:', e.message); }

    this.worker = null;
    this.queueEvents = null;
    this.queue = null;
    this.connection = null;
    console.log('[poll-scheduler] stopped');
  }

  /**
   * Pause the queue. Used by the channelIntelligenceBootstrap hook when a
   * Baileys session disconnects — no point processing jobs that will all
   * fail with "no live socket".
   */
  async pauseAll() {
    if (!this.queue) return;
    await this.queue.pause();
    console.warn('[poll-scheduler] queue PAUSED');
  }

  async resumeAll() {
    if (!this.queue) return;
    await this.queue.resume();
    console.log('[poll-scheduler] queue RESUMED');
  }

  /**
   * Health snapshot for the admin endpoint.
   */
  async getHealthSnapshot() {
    if (!this.queue) {
      return { running: false, reason: 'scheduler not started' };
    }
    let counts = null;
    let isPaused = null;
    try {
      counts = await this.queue.getJobCounts(
        'waiting',
        'active',
        'delayed',
        'failed',
        'completed',
        'paused'
      );
      isPaused = await this.queue.isPaused();
    } catch (err) {
      return { running: this.running, error: err.message };
    }
    return {
      running: this.running,
      queueName: QUEUE_NAME,
      counts,
      isPaused,
      workerConcurrency: WORKER_CONCURRENCY,
      pollIntervalsMs: POLL_INTERVALS_MS,
    };
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  _scheduleEnqueueTick() {
    this.enqueueTimer = setInterval(() => {
      if (!this.running) return;
      this._enqueueDuePolls().catch((e) =>
        console.error('[poll-scheduler] enqueue tick crashed:', e.message)
      );
    }, ENQUEUE_TICK_MS);
  }

  async _enqueueDuePolls() {
    if (!this.queue) return { enqueued: 0, skipped: 0 };

    const candidates = await Canal.find({
      'metricsIntelligence.enabled': true,
      'metricsIntelligence.channelJid': { $nin: ['', null] },
    })
      .select('_id metricsIntelligence')
      .lean();

    const now = Date.now();
    let enqueued = 0;
    let skipped = 0;

    for (const c of candidates) {
      const mi = c.metricsIntelligence || {};
      const priority = mi.pollPriority || 'standard';
      const interval = POLL_INTERVALS_MS[priority] || POLL_INTERVALS_MS.standard;
      const lastPollMs = mi.lastPollAt ? new Date(mi.lastPollAt).getTime() : 0;
      if (now - lastPollMs < interval) {
        skipped++;
        continue;
      }

      // Dedup by per-canal jobId. BullMQ will reject the add if the same
      // jobId is still in waiting/active/delayed. This means even if our
      // tick loop runs faster than the worker, we never enqueue twice.
      const jobId = `poll:${c._id}`;
      try {
        await this.queue.add(
          'poll-canal',
          { canalId: String(c._id), enqueuedAt: now },
          {
            jobId,
            priority: BULLMQ_PRIORITIES[priority] || BULLMQ_PRIORITIES.standard,
            attempts: 3,
            backoff: { type: 'exponential', delay: 30_000 },
            removeOnComplete: { count: 100, age: 24 * 3600 },
            removeOnFail: { count: 50, age: 7 * 24 * 3600 },
          }
        );
        enqueued++;
      } catch (err) {
        // Common case: duplicate jobId because previous run still pending.
        // That's fine — it's the dedup behavior we want.
        if (!/already exists|Job is locked/i.test(err.message || '')) {
          console.warn(`[poll-scheduler] enqueue failed for canal=${c._id}:`, err.message);
        }
      }
    }

    if (enqueued > 0 || skipped > 0) {
      console.log(
        `[poll-scheduler] tick — ${candidates.length} tracked, ${enqueued} enqueued, ${skipped} not-yet-due`
      );
    }
    return { enqueued, skipped, total: candidates.length };
  }

  async _processPollJob(job) {
    const { canalId } = job.data || {};
    if (!canalId) throw new Error('job missing canalId');

    const canal = await Canal.findById(canalId)
      .select('_id metricsIntelligence')
      .lean();
    if (!canal) throw new Error(`canal ${canalId} not found`);
    const mi = canal.metricsIntelligence || {};
    if (!mi.enabled) throw new Error(`metricsIntelligence not enabled for canal ${canalId}`);

    const sessionId = mi.baileysSessionId ? String(mi.baileysSessionId) : null;
    const sockEntry = sessionId
      ? baileysSessionManager.sockets?.get(sessionId)
      : null;
    const sock = sockEntry?.sock;

    if (!sock) {
      // Mark and throw — BullMQ retry mechanism will back off
      const err = new Error(`no live Baileys socket for session ${sessionId}`);
      err.code = 'NO_SESSION';
      throw err;
    }

    const result = await channelMetricsCollector.collectSnapshot(canalId, sock);

    // Recalculate priority based on observed activity. Cheap query — done
    // inside the worker so the worker process owns the priority state.
    await this._recalcPriority(canalId).catch((e) =>
      console.warn(`[poll-scheduler] recalcPriority failed canal=${canalId}:`, e.message)
    );

    return {
      canalId,
      subscribersCount: result.snapshot.subscribersCount,
      snapshotId: String(result.snapshot._id),
    };
  }

  /**
   * Lightweight priority recalculation. Full version (Capa 2 Fase 4) factors
   * in active Campaigns, growth rate, and engagement. For now we use post
   * recency + consecutive-failures as the only signals.
   */
  async _recalcPriority(canalId) {
    const canal = await Canal.findById(canalId)
      .select('metricsIntelligence')
      .lean();
    if (!canal) return;

    const failures = canal.metricsIntelligence?.consecutiveFailures || 0;

    const lastPost = await CanalPostObservation.findOne({ canalId })
      .sort({ publishedAt: -1 })
      .select('publishedAt')
      .lean();

    const daysSinceLastPost = lastPost
      ? (Date.now() - new Date(lastPost.publishedAt).getTime()) / 86400000
      : Infinity;

    let priority;
    if (daysSinceLastPost > 30) priority = 'cold';
    else if (daysSinceLastPost > 7) priority = 'low';
    else if (daysSinceLastPost > 1) priority = 'standard';
    else priority = 'high';

    // Don't downgrade failing canals — keep them in 'low' so we keep
    // probing every 24h until either it recovers or operator disables it.
    if (failures > 3 && priority === 'cold') priority = 'low';

    await Canal.findByIdAndUpdate(canalId, {
      $set: { 'metricsIntelligence.pollPriority': priority },
    });
  }

  // ─── Static helpers (pure, exposed for testing) ──────────────────────────
  static intervalForPriority(priority) {
    return POLL_INTERVALS_MS[priority] || POLL_INTERVALS_MS.standard;
  }

  static recommendPriority({ daysSinceLastPost, consecutiveFailures = 0 }) {
    let priority;
    if (daysSinceLastPost > 30) priority = 'cold';
    else if (daysSinceLastPost > 7) priority = 'low';
    else if (daysSinceLastPost > 1) priority = 'standard';
    else priority = 'high';
    if (consecutiveFailures > 3 && priority === 'cold') priority = 'low';
    return priority;
  }
}

module.exports = new ChannelPollScheduler();
module.exports.ChannelPollSchedulerClass = ChannelPollScheduler; // exposed for tests
module.exports.QUEUE_NAME = QUEUE_NAME;
module.exports.POLL_INTERVALS_MS = POLL_INTERVALS_MS;
module.exports.BULLMQ_PRIORITIES = BULLMQ_PRIORITIES;
