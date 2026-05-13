/**
 * contentEnrichmentScheduler
 *
 * Capa 2 Fase 3 — BullMQ queue + worker that runs NLP enrichment on newly
 * ingested CanalPostObservations.
 *
 * Architecture:
 *   - Queue name: 'capa2-content-enrichment'
 *   - Producer: ChannelMetricsCollector.ingestRealtimePost calls enqueue()
 *     immediately after creating an observation document.
 *   - Worker: pulls one observation per job, calls
 *     ContentIntelligenceService.enrichObservation, concurrency 5.
 *
 * Why 1-per-job rather than batching:
 *   Real-time posts arrive at a rate of seconds-to-minutes per canal.
 *   Batching across canals introduces head-of-line blocking and breaks the
 *   "post → enriched within X seconds" UX promise. The Anthropic batch
 *   ceiling of 20 mostly benefits BACKFILL (when there's a queue depth of
 *   100s); for steady-state real-time, single-doc jobs are fine and the
 *   bodyHash cache (in ContentIntelligenceService) absorbs duplicates.
 *
 *   Backfill batching ships in Fase 4 alongside CategoryBenchmarkService —
 *   see `scripts/enrich-pending.js` (pending).
 *
 * Why concurrency 5: balances Anthropic rate limits (tier 1 = ~50 RPM ≈
 * ~5 concurrent at ~6s/call) with throughput. Tune via
 * CAPA2_ENRICHMENT_CONCURRENCY env var.
 *
 * Same Redis as the metrics scheduler (shared connection via the bullmq
 * default connection pool). Lazy bullmq + ioredis like ChannelPollScheduler.
 */

'use strict';

const contentIntelligenceService = require('./ContentIntelligenceService');

const QUEUE_NAME = 'capa2-content-enrichment';
const DEFAULT_CONCURRENCY = 5;

class ContentEnrichmentScheduler {
  constructor() {
    this.queue = null;
    this.queueEvents = null;
    this.worker = null;
    this.connection = null;
    this.running = false;
  }

  async start() {
    if (this.running) {
      console.warn('[content-enrichment] start() called while already running');
      return;
    }

    let bullmq, RedisCtor;
    try {
      bullmq = require('bullmq');
      RedisCtor = require('ioredis');
    } catch (err) {
      throw new Error(
        `contentEnrichmentScheduler requires bullmq + ioredis. Underlying: ${err.message}`
      );
    }
    const { Queue, Worker, QueueEvents } = bullmq;

    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    const concurrency = Number(process.env.CAPA2_ENRICHMENT_CONCURRENCY || DEFAULT_CONCURRENCY);

    this.connection = new RedisCtor(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    this.connection.on('error', (err) => {
      console.error('[content-enrichment] redis error:', err.message);
    });

    this.queue = new Queue(QUEUE_NAME, { connection: this.connection });
    this.queueEvents = new QueueEvents(QUEUE_NAME, { connection: this.connection.duplicate() });
    this.worker = new Worker(
      QUEUE_NAME,
      (job) => this._processJob(job),
      { connection: this.connection.duplicate(), concurrency }
    );

    this.worker.on('completed', (job) => {
      // Quiet on completed — these run frequently and the success path is
      // uninteresting. The interesting events are failures.
      if (process.env.CAPA2_LOG_ENRICHMENT_COMPLETIONS === '1') {
        console.log(`[content-enrichment] job ${job?.id} OK`);
      }
    });
    this.worker.on('failed', (job, err) => {
      console.error(
        `[content-enrichment] job ${job?.id} FAILED — obs=${job?.data?.observationId} err="${err?.message}"`
      );
    });

    this.running = true;
    console.log(
      `[content-enrichment] started (queue=${QUEUE_NAME}, concurrency=${concurrency}, redis=${redisUrl})`
    );
  }

  async stop() {
    if (!this.running) return;
    this.running = false;
    try { await this.worker?.close(); } catch (e) { console.warn('[content-enrichment] worker.close error:', e.message); }
    try { await this.queueEvents?.close(); } catch (e) { console.warn('[content-enrichment] queueEvents.close error:', e.message); }
    try { await this.queue?.close(); } catch (e) { console.warn('[content-enrichment] queue.close error:', e.message); }
    try { await this.connection?.quit(); } catch (e) { console.warn('[content-enrichment] redis.quit error:', e.message); }
    this.worker = null;
    this.queueEvents = null;
    this.queue = null;
    this.connection = null;
    console.log('[content-enrichment] stopped');
  }

  /**
   * Enqueue an observation for NLP enrichment. Safe to call before
   * start() — silently returns null with a warn (so unbooted environments
   * don't crash the ingest path).
   *
   * @param {string} observationId  Mongo ObjectId of CanalPostObservation
   * @returns {Promise<object|null>}
   */
  async enqueue(observationId) {
    if (!this.queue) {
      // The producer (ChannelMetricsCollector) may be running in a process
      // that doesn't start the scheduler (e.g. Vercel function path). It's
      // fine — just no-op. Eventually a backfill script will pick up the
      // observation (when implemented in Fase 4).
      return null;
    }
    try {
      return await this.queue.add(
        'enrich-observation',
        { observationId: String(observationId) },
        {
          // Dedup by observationId so a re-ingest of the same observation
          // (rare but possible with reconnects) doesn't enqueue twice.
          jobId: `enrich:${observationId}`,
          removeOnComplete: { count: 200, age: 24 * 3600 },
          removeOnFail: { count: 100, age: 7 * 24 * 3600 },
          attempts: 3,
          backoff: { type: 'exponential', delay: 30_000 },
        }
      );
    } catch (err) {
      // Common case: duplicate jobId because the same observation is
      // already pending. That's the intended dedup behavior — silent.
      if (!/already exists|Job is locked/i.test(err.message || '')) {
        console.warn(`[content-enrichment] enqueue failed for obs=${observationId}:`, err.message);
      }
      return null;
    }
  }

  async getHealthSnapshot() {
    if (!this.queue) return { running: false, reason: 'scheduler not started' };
    try {
      const counts = await this.queue.getJobCounts(
        'waiting',
        'active',
        'delayed',
        'failed',
        'completed',
        'paused'
      );
      return {
        running: this.running,
        queueName: QUEUE_NAME,
        counts,
        isPaused: await this.queue.isPaused(),
        workerConcurrency: Number(process.env.CAPA2_ENRICHMENT_CONCURRENCY || DEFAULT_CONCURRENCY),
      };
    } catch (err) {
      return { running: this.running, error: err.message };
    }
  }

  async pauseAll() { await this.queue?.pause(); }
  async resumeAll() { await this.queue?.resume(); }

  // ─── Internal ────────────────────────────────────────────────────────────

  async _processJob(job) {
    const { observationId } = job.data || {};
    if (!observationId) throw new Error('job missing observationId');
    const doc = await contentIntelligenceService.enrichObservation(observationId);
    if (!doc) throw new Error(`observation ${observationId} not found`);
    return {
      observationId,
      lang: doc.nlp?.lang,
      categories: doc.nlp?.categories,
      enrichmentVersion: doc.nlp?.enrichmentVersion,
    };
  }
}

module.exports = new ContentEnrichmentScheduler();
module.exports.ContentEnrichmentSchedulerClass = ContentEnrichmentScheduler;
module.exports.QUEUE_NAME = QUEUE_NAME;
