/**
 * ChannelMetricsCollector
 *
 * Capa 2 Fase 1 — passive observation primitive for WhatsApp Channels.
 *
 * Two responsibilities:
 *
 *   1. collectSnapshot(canalId, sock)
 *      Calls Baileys' newsletterMetadata for a single canal and persists a
 *      CanalMetricsSnapshot row. Designed to be invoked from a scheduler
 *      (Capa 2 Fase 2, BullMQ) at a cadence driven by
 *      Canal.metricsIntelligence.pollPriority. Also updates the Canal doc's
 *      lastPollAt/Status counters.
 *
 *   2. ingestRealtimePost(canalId, baileysMsg)
 *      Maps a single `messages.upsert[i]` event (already filtered to the
 *      target newsletter JID by ChannelSubscriptionWorker) into a
 *      CanalPostObservation row. Idempotent via the unique index on
 *      (channelJid, serverId).
 *
 * IMPORTANT: this service does NOT own the Baileys socket. Its caller
 * (typically ChannelSubscriptionWorker or scripts/manual-poll.js) passes
 * a connected `sock` reference. Decoupling sockets from this service means
 * we can unit-test with a stub and we don't tangle session lifecycle with
 * snapshot logic.
 *
 * Historical backfill is intentionally absent. Baileys 7.0.0-rc.9's
 * newsletterFetchMessages doesn't return parsed messages — see the schema
 * docs in models/CanalPostObservation.js. Observation anchors at
 * Canal.metricsIntelligence.observationStartedAt.
 */

'use strict';

const Canal = require('../models/Canal');
const CanalMetricsSnapshot = require('../models/CanalMetricsSnapshot');
const CanalPostObservation = require('../models/CanalPostObservation');
const {
  mapBaileysToObservation,
  mapMetadataToSnapshot,
} = require('./baileys/channelMessageMapper');

class ChannelMetricsCollector {
  /**
   * Poll Baileys for current channel metadata and persist a snapshot.
   * Always updates Canal.metricsIntelligence.* counters, even on failure.
   *
   * @param {string} canalId
   * @param {object} sock  connected Baileys socket — must expose newsletterMetadata
   * @returns {Promise<{ ok: true, snapshot: object } | never>}  throws on failure
   */
  async collectSnapshot(canalId, sock) {
    const canal = await Canal.findById(canalId).select(
      '_id plataforma metricsIntelligence'
    );

    if (!canal) {
      throw new Error(`Canal ${canalId} not found`);
    }
    const mi = canal.metricsIntelligence;
    if (!mi?.enabled) {
      throw new Error(`metricsIntelligence not enabled for canal ${canalId}`);
    }
    if (!mi.channelJid) {
      throw new Error(`Canal ${canalId} has no metricsIntelligence.channelJid`);
    }

    if (!sock || typeof sock.newsletterMetadata !== 'function') {
      await this._markStatus(canalId, 'no_session', { increment: true });
      const err = new Error('No Baileys socket provided to collectSnapshot');
      err.code = 'NO_SESSION';
      throw err;
    }

    const t0 = Date.now();
    let metadata;
    try {
      metadata = await sock.newsletterMetadata('jid', mi.channelJid);
    } catch (err) {
      await this._markStatus(canalId, 'metadata_failed', {
        increment: true,
        errorMessage: err.message,
      });
      err.code = err.code || 'METADATA_FETCH_FAILED';
      throw err;
    }

    const snapshotDoc = mapMetadataToSnapshot({
      canalId,
      channelJid: mi.channelJid,
      metadata,
      source: 'passive_poll',
      pollStatus: 'ok',
      pollDurationMs: Date.now() - t0,
    });

    const persisted = await CanalMetricsSnapshot.create(snapshotDoc);
    await this._markStatus(canalId, 'ok', { increment: false });

    return { ok: true, snapshot: persisted };
  }

  /**
   * Ingest a single newsletter post observed via real-time stream.
   * Idempotent — duplicate (channelJid, serverId) returns the existing doc.
   *
   * @param {string} canalId
   * @param {object} baileysMsg  one element from `messages.upsert.messages`
   * @returns {Promise<{ created: boolean, doc: object } | null>}
   */
  async ingestRealtimePost(canalId, baileysMsg) {
    const canal = await Canal.findById(canalId)
      .select('_id metricsIntelligence')
      .lean();
    if (!canal) throw new Error(`Canal ${canalId} not found`);
    if (!canal.metricsIntelligence?.enabled) return null;
    if (!canal.metricsIntelligence?.channelJid) return null;

    const observation = mapBaileysToObservation({
      canalId,
      channelJid: canal.metricsIntelligence.channelJid,
      baileysMsg,
      source: 'realtime',
    });
    if (!observation) return null;

    try {
      const doc = await CanalPostObservation.create(observation);
      return { created: true, doc };
    } catch (err) {
      if (err && err.code === 11000) {
        // Duplicate (channelJid, serverId) — already ingested. Return existing.
        const existing = await CanalPostObservation.findOne({
          channelJid: observation.channelJid,
          serverId: observation.serverId,
        });
        return { created: false, doc: existing };
      }
      throw err;
    }
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  async _markStatus(canalId, status, { increment, errorMessage } = {}) {
    const update = {
      $set: {
        'metricsIntelligence.lastPollAt': new Date(),
        'metricsIntelligence.lastPollStatus': status,
      },
    };
    if (status === 'ok') {
      update.$set['metricsIntelligence.consecutiveFailures'] = 0;
    } else if (increment) {
      update.$inc = { 'metricsIntelligence.consecutiveFailures': 1 };
    }
    if (errorMessage) {
      // We don't persist the message itself on Canal (Canal isn't an error
      // log) — but we do log to console so VPS operators see the cause.
      console.warn(`[metrics-collector] canal=${canalId} status=${status} err="${errorMessage}"`);
    }
    await Canal.findByIdAndUpdate(canalId, update);
  }
}

module.exports = new ChannelMetricsCollector();
