/**
 * ChannelSubscriptionWorker
 *
 * Capa 2 Fase 1 — persistent worker that maintains real-time newsletter
 * subscriptions for every Canal where metricsIntelligence.enabled=true.
 *
 * Why a separate worker (not just polling on a schedule):
 *   The only way to observe newsletter posts in Baileys 7.0.0-rc.9 is the
 *   `messages.upsert` event after `subscribeNewsletterUpdates(jid)`. Each
 *   subscription expires after 90s (server-side lease) and must be renewed
 *   to keep the live_updates flowing. A poll-based architecture cannot
 *   substitute for this — historical fetch is broken upstream.
 *
 * Lifecycle:
 *   start()
 *     → _refreshCanals()  → load enabled canals, group by baileysSessionId
 *     → for each session, attach ONE messages.upsert listener that routes
 *       events to the correct canal by remoteJid match
 *     → subscribeNewsletterUpdates for every tracked jid
 *     → schedule renew every 30s (each sub lasts 90s — 3x safety margin)
 *     → schedule canal refresh every 5min (picks up newly-enabled canals)
 *
 * stop()
 *     → detach all listeners, clear timers, release in-memory state
 *
 * Privacy: the `messages.upsert` event fires for EVERY chat on the Baileys
 * session, including private DMs and groups. We filter at the listener
 * level using `this.jidToCanalId` — events for untracked JIDs are dropped
 * with no logging, no persistence. Worker only acts on JIDs that have a
 * Canal document with metricsIntelligence.enabled=true.
 *
 * Failure modes handled:
 *   - Session offline           → mark canal subscriptionStatus='failed', skip
 *   - subscribeNewsletterUpdates throws → mark 'failed', try again next renew
 *   - Socket reconnect          → next _refreshCanals() picks up the new sock
 *   - Mongo unavailable          → renew loop catches and waits for next tick
 *
 * Not yet handled (Fase 2):
 *   - Per-canal poll for CanalMetricsSnapshot (delegated to ChannelMetricsCollector
 *     via BullMQ — see services/ChannelPollScheduler.js in Fase 2)
 *   - Reactions event (Baileys event shape TBD — needs new probe round)
 */

'use strict';

const baileysSessionManager = require('./baileys/BaileysSessionManager');
const channelMetricsCollector = require('./ChannelMetricsCollector');
const Canal = require('../models/Canal');

const RENEW_INTERVAL_MS = 30_000;      // resubscribe every 30s (lease is 90s)
const CANAL_REFRESH_MS = 5 * 60_000;   // re-read Canal list every 5 minutes

class ChannelSubscriptionWorker {
  constructor() {
    this.running = false;
    /** @type {Map<string, string>} channelJid → canalId */
    this.jidToCanalId = new Map();
    /** @type {Map<string, { sock: object, jids: Set<string>, handler: Function }>} sessionId → entry */
    this.sessionEntries = new Map();
    this.renewTimer = null;
    this.refreshTimer = null;
  }

  async start() {
    if (this.running) {
      console.warn('[subscription-worker] start() called while already running');
      return;
    }
    this.running = true;
    console.log('[subscription-worker] starting');

    await this._refreshCanals();

    this.renewTimer = setInterval(() => {
      this._renewAllSubscriptions().catch((err) =>
        console.error('[subscription-worker] renew loop crashed:', err.message)
      );
    }, RENEW_INTERVAL_MS);

    this.refreshTimer = setInterval(() => {
      this._refreshCanals().catch((err) =>
        console.error('[subscription-worker] canal refresh crashed:', err.message)
      );
    }, CANAL_REFRESH_MS);
  }

  async stop() {
    if (!this.running) return;
    console.log('[subscription-worker] stopping');
    this.running = false;
    if (this.renewTimer) clearInterval(this.renewTimer);
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.renewTimer = null;
    this.refreshTimer = null;

    for (const entry of this.sessionEntries.values()) {
      try {
        entry.sock?.ev?.off?.('messages.upsert', entry.handler);
      } catch (_) { /* ignore */ }
    }
    this.sessionEntries.clear();
    this.jidToCanalId.clear();
  }

  /**
   * Re-read the Canal collection and reconcile in-memory subscription state.
   * Safe to call repeatedly — idempotent.
   */
  async _refreshCanals() {
    if (!this.running && this.renewTimer === null) return; // stop() was called

    const enabled = await Canal.find({
      'metricsIntelligence.enabled': true,
      'metricsIntelligence.channelJid': { $nin: ['', null] },
      'metricsIntelligence.baileysSessionId': { $ne: null },
    })
      .select('_id metricsIntelligence')
      .lean();

    // Rebuild JID → canalId index atomically
    const newJidMap = new Map();
    for (const c of enabled) {
      newJidMap.set(c.metricsIntelligence.channelJid, String(c._id));
    }
    this.jidToCanalId = newJidMap;

    // Group canals by sessionId
    /** @type {Map<string, object[]>} */
    const bySession = new Map();
    for (const c of enabled) {
      const sid = String(c.metricsIntelligence.baileysSessionId);
      if (!bySession.has(sid)) bySession.set(sid, []);
      bySession.get(sid).push(c);
    }

    // Detach listeners for sessions no longer in scope
    for (const sid of [...this.sessionEntries.keys()]) {
      if (!bySession.has(sid)) {
        const entry = this.sessionEntries.get(sid);
        try { entry.sock?.ev?.off?.('messages.upsert', entry.handler); } catch (_) {}
        this.sessionEntries.delete(sid);
      }
    }

    // Attach / refresh per-session state
    for (const [sid, canals] of bySession) {
      await this._ensureSessionAttached(sid, canals);
    }

    console.log(`[subscription-worker] refreshed — ${enabled.length} canals across ${bySession.size} sessions`);
  }

  async _ensureSessionAttached(sessionId, canals) {
    let entry = this.sessionEntries.get(sessionId);

    // Resolve live socket from BaileysSessionManager. We deliberately reach
    // into its internal `sockets` Map — it's a singleton with public access
    // patterns despite the private-looking name. If you change the manager's
    // internals, update this access here.
    const managerEntry = baileysSessionManager.sockets?.get(sessionId);
    const sock = managerEntry?.sock || null;

    if (!sock) {
      // Mark all canals in this session as having no available socket
      for (const c of canals) {
        await Canal.findByIdAndUpdate(c._id, {
          $set: { 'metricsIntelligence.subscriptionStatus': 'failed' },
        });
      }
      // Drop stale entry, if any
      if (entry) {
        try { entry.sock?.ev?.off?.('messages.upsert', entry.handler); } catch (_) {}
        this.sessionEntries.delete(sessionId);
      }
      return;
    }

    // If the live sock instance has changed (reconnect), recreate listener
    if (entry && entry.sock !== sock) {
      try { entry.sock?.ev?.off?.('messages.upsert', entry.handler); } catch (_) {}
      this.sessionEntries.delete(sessionId);
      entry = undefined;
    }

    if (!entry) {
      const handler = (m) => this._onMessagesUpsert(m, sessionId);
      sock.ev.on('messages.upsert', handler);
      entry = { sock, jids: new Set(), handler };
      this.sessionEntries.set(sessionId, entry);
    }

    // Update tracked jid set + subscribe
    entry.jids = new Set(canals.map((c) => c.metricsIntelligence.channelJid));
    for (const c of canals) {
      await this._subscribeOne(sock, c);
    }
  }

  async _subscribeOne(sock, canal) {
    const jid = canal.metricsIntelligence.channelJid;
    if (!jid || typeof sock.subscribeNewsletterUpdates !== 'function') return;

    try {
      await sock.subscribeNewsletterUpdates(jid);
      await Canal.findByIdAndUpdate(canal._id, {
        $set: {
          'metricsIntelligence.lastSubscriptionRenewedAt': new Date(),
          'metricsIntelligence.subscriptionStatus': 'active',
        },
      });
    } catch (err) {
      console.error(`[subscription-worker] subscribe failed jid=${jid} canal=${canal._id} err=${err.message}`);
      await Canal.findByIdAndUpdate(canal._id, {
        $set: { 'metricsIntelligence.subscriptionStatus': 'failed' },
      });
    }
  }

  async _renewAllSubscriptions() {
    if (!this.running) return;
    for (const [sessionId, entry] of this.sessionEntries) {
      // If the sock changed underneath us (reconnect), the next _refreshCanals
      // will rewire. For now just attempt with the current ref.
      for (const jid of entry.jids) {
        const canalId = this.jidToCanalId.get(jid);
        if (!canalId) continue;
        try {
          await entry.sock.subscribeNewsletterUpdates(jid);
          await Canal.findByIdAndUpdate(canalId, {
            $set: {
              'metricsIntelligence.lastSubscriptionRenewedAt': new Date(),
              'metricsIntelligence.subscriptionStatus': 'active',
            },
          });
        } catch (err) {
          console.error(`[subscription-worker] renew failed jid=${jid} session=${sessionId} err=${err.message}`);
          await Canal.findByIdAndUpdate(canalId, {
            $set: { 'metricsIntelligence.subscriptionStatus': 'failed' },
          });
        }
      }
    }
  }

  /**
   * Global per-session messages.upsert handler. Filters to tracked JIDs
   * (privacy guarantee) and delegates ingest to ChannelMetricsCollector.
   */
  async _onMessagesUpsert(eventData, sessionId) {
    const messages = eventData?.messages || [];
    for (const msg of messages) {
      const remoteJid = msg?.key?.remoteJid;
      if (!remoteJid) continue;

      const canalId = this.jidToCanalId.get(remoteJid);
      if (!canalId) continue; // NOT a tracked channel — drop silently

      try {
        const result = await channelMetricsCollector.ingestRealtimePost(canalId, msg);
        if (result?.created) {
          console.log(
            `[subscription-worker] post ingested canal=${canalId} serverId=${msg.key.server_id || '?'} type=${result.doc.type}`
          );
        }
      } catch (err) {
        console.error(`[subscription-worker] ingest failed canal=${canalId} err=${err.message}`);
      }
    }
  }

  // ─── Introspection (for /api/admin/metrics/health, Fase 2) ───────────────
  status() {
    return {
      running: this.running,
      trackedJids: this.jidToCanalId.size,
      sessions: this.sessionEntries.size,
      sessionDetails: [...this.sessionEntries.entries()].map(([sid, e]) => ({
        sessionId: sid,
        jids: [...e.jids],
        sockReady: !!e.sock,
      })),
    };
  }
}

module.exports = new ChannelSubscriptionWorker();
