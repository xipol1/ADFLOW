/**
 * channelIntelligenceBootstrap
 *
 * Capa 2 Fase 2 — single entry point that boots the channel intelligence
 * stack on the VPS:
 *
 *   1. ChannelSubscriptionWorker — real-time post ingestion via Baileys
 *      subscribeNewsletterUpdates + filtered messages.upsert.
 *   2. ChannelPollScheduler — BullMQ-backed periodic metadata snapshot
 *      enqueueing + processing.
 *   3. Pause-on-disconnect hook — when ANY Baileys session emits a
 *      'connection.update' close that isn't a recoverable transient, we
 *      pause the scheduler queue so jobs don't fail in a loop. On
 *      reconnect we resume.
 *
 * This module is INTENTIONALLY NOT auto-required from server.js. Capa 2 is
 * VPS-only — Vercel functions must never start this. Wire it explicitly
 * from your VPS entry point:
 *
 *     // worker.js (your VPS entrypoint)
 *     require('dotenv').config();
 *     require('./config/database').conectar();
 *     require('./services/channelIntelligenceBootstrap').start();
 *
 * Or guard it inside server.js with an env flag:
 *
 *     if (process.env.CHANNEL_INTELLIGENCE_ENABLED === 'true') {
 *       require('./services/channelIntelligenceBootstrap').start();
 *     }
 */

'use strict';

const subscriptionWorker = require('./ChannelSubscriptionWorker');
const pollScheduler = require('./ChannelPollScheduler');
const enrichmentScheduler = require('./contentEnrichmentScheduler');
const llmBudgetGuard = require('./nlp/LLMBudgetGuard');
const baileysSessionManager = require('./baileys/BaileysSessionManager');

class ChannelIntelligenceBootstrap {
  constructor() {
    this.started = false;
    this._pauseHookInstalled = false;
  }

  async start() {
    if (this.started) {
      console.warn('[ci-bootstrap] start() called while already running');
      return;
    }
    this.started = true;
    console.log('[ci-bootstrap] starting channel intelligence stack');

    // 1. Subscription worker first — it manages the real-time stream which
    //    is the only way to capture posts. Schema integrity depends on it
    //    being live before any polls fire.
    await subscriptionWorker.start();

    // 2. Metadata poll scheduler — periodic newsletterMetadata snapshots.
    //    Errors here shouldn't take down the subscription worker.
    try {
      await pollScheduler.start();
    } catch (err) {
      console.error('[ci-bootstrap] poll scheduler start failed (continuing without it):', err.message);
    }

    // 3. Content enrichment scheduler (Fase 3) — BullMQ worker that runs
    //    NLP on each new observation. Independent from the poll scheduler:
    //    if it fails to start, real-time ingestion + metadata polling
    //    keep working, just without NLP. The partial index on
    //    nlp.enrichedAt lets a later backfill pick up unenriched docs.
    try {
      await enrichmentScheduler.start();
    } catch (err) {
      console.error('[ci-bootstrap] enrichment scheduler start failed (continuing without NLP):', err.message);
    }

    // 4. Pause-on-disconnect hook. We watch BaileysSessionManager for any
    //    session that drops; if no sessions are alive, the schedulers
    //    can't do useful work, so we pause them.
    this._installPauseHook();

    console.log('[ci-bootstrap] stack started');
  }

  async stop() {
    if (!this.started) return;
    this.started = false;
    console.log('[ci-bootstrap] stopping channel intelligence stack');
    try { await subscriptionWorker.stop(); } catch (e) { console.warn('[ci-bootstrap] subscriptionWorker stop error:', e.message); }
    try { await pollScheduler.stop(); } catch (e) { console.warn('[ci-bootstrap] pollScheduler stop error:', e.message); }
    try { await enrichmentScheduler.stop(); } catch (e) { console.warn('[ci-bootstrap] enrichmentScheduler stop error:', e.message); }
    console.log('[ci-bootstrap] stopped');
  }

  /**
   * Hook into the global Baileys session pool. We monkey-patch the
   * existing _spawnSocket function to chain our pause/resume logic onto
   * connection.update events.
   *
   * Cleaner alternative for the future: BaileysSessionManager emits its
   * own event bus. For now this minimal patch avoids touching the manager.
   */
  _installPauseHook() {
    if (this._pauseHookInstalled) return;
    this._pauseHookInstalled = true;

    // For every existing socket, attach a connection.update listener.
    for (const [, entry] of baileysSessionManager.sockets) {
      this._attachConnectionWatcher(entry?.sock);
    }

    // Capture future sockets too. Wrap _spawnSocket to install the watcher
    // on every new socket the manager creates.
    const originalSpawn = baileysSessionManager._spawnSocket?.bind(baileysSessionManager);
    if (originalSpawn) {
      baileysSessionManager._spawnSocket = async (...args) => {
        const entry = await originalSpawn(...args);
        this._attachConnectionWatcher(entry?.sock);
        return entry;
      };
    }
  }

  _attachConnectionWatcher(sock) {
    if (!sock?.ev?.on) return;
    sock.ev.on('connection.update', async (update) => {
      const { connection } = update || {};
      if (connection === 'close') {
        // Check whether ANY session is still alive — if not, pause both queues.
        const stillAlive = [...baileysSessionManager.sockets.values()].some(
          (e) => e?.sock && e.sock !== sock
        );
        if (!stillAlive) {
          await Promise.all([
            pollScheduler.pauseAll().catch((e) => console.warn('[ci-bootstrap] poll pauseAll error:', e.message)),
            // NB: we DO NOT pause the enrichment queue on Baileys disconnect.
            // Enrichment doesn't need the WhatsApp session — it processes
            // already-persisted observations against Anthropic. Pausing it
            // here would slow recovery without preventing failures.
          ]);
        }
      } else if (connection === 'open') {
        await pollScheduler.resumeAll().catch((e) =>
          console.warn('[ci-bootstrap] poll resumeAll error:', e.message)
        );
      }
    });
  }

  /**
   * Aggregated health snapshot. Used by the admin endpoint.
   */
  async getHealth() {
    const sessionStates = [...baileysSessionManager.sockets.entries()].map(([sid, e]) => ({
      sessionId: sid,
      sockReady: !!e?.sock?.user,
      number: e?.sock?.user?.id || null,
    }));

    let pollSchedulerHealth = null;
    try { pollSchedulerHealth = await pollScheduler.getHealthSnapshot(); }
    catch (e) { pollSchedulerHealth = { error: e.message }; }

    let enrichmentSchedulerHealth = null;
    try { enrichmentSchedulerHealth = await enrichmentScheduler.getHealthSnapshot(); }
    catch (e) { enrichmentSchedulerHealth = { error: e.message }; }

    let budget = null;
    try { budget = await llmBudgetGuard.getHealthSnapshot(); }
    catch (e) { budget = { error: e.message }; }

    return {
      started: this.started,
      subscriptionWorker: subscriptionWorker.status?.() || { error: 'status() missing' },
      sessions: {
        count: sessionStates.length,
        details: sessionStates,
      },
      pollScheduler: pollSchedulerHealth,
      enrichmentScheduler: enrichmentSchedulerHealth,
      llmBudget: budget,
    };
  }
}

module.exports = new ChannelIntelligenceBootstrap();
