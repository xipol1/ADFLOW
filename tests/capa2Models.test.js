/**
 * Capa 2 schema tests — defaults, enums, required fields.
 *
 * Same pattern as tests/canalModel.v2.test.js: exercise Mongoose schemas
 * in-memory without a Mongo connection. Validates that the new Capa 2
 * models accept the shapes the rest of the code expects.
 */

const mongoose = require('mongoose');
const Canal = require('../models/Canal');
const CanalPostObservation = require('../models/CanalPostObservation');
const CanalMetricsSnapshot = require('../models/CanalMetricsSnapshot');

const FAKE_ID = new mongoose.Types.ObjectId().toString();
const SANDBOX_JID = '120363423838140981@newsletter';

describe('Canal.metricsIntelligence subdocument', () => {
  function build(over = {}) {
    return new Canal({
      plataforma: 'whatsapp',
      identificadorCanal: 'test-channel',
      ...over,
    });
  }

  test('defaults — disabled, unknown status, never subscribed', () => {
    const canal = build();
    expect(canal.metricsIntelligence.enabled).toBe(false);
    expect(canal.metricsIntelligence.channelJid).toBe('');
    expect(canal.metricsIntelligence.pollPriority).toBe('standard');
    expect(canal.metricsIntelligence.lastPollStatus).toBe('unknown');
    expect(canal.metricsIntelligence.consecutiveFailures).toBe(0);
    expect(canal.metricsIntelligence.subscriptionStatus).toBe('never');
    expect(canal.metricsIntelligence.baileysSessionId).toBeNull();
  });

  test('pollPriority enum rejects invalid values', () => {
    const canal = build({ metricsIntelligence: { pollPriority: 'critical' } });
    const err = canal.validateSync();
    expect(err?.errors?.['metricsIntelligence.pollPriority']).toBeDefined();
  });

  test('subscriptionStatus enum accepts active/expired/never/failed', () => {
    for (const s of ['active', 'expired', 'never', 'failed']) {
      const canal = build({ metricsIntelligence: { subscriptionStatus: s } });
      expect(canal.validateSync()?.errors?.['metricsIntelligence.subscriptionStatus']).toBeUndefined();
    }
  });

  test('accepts a fully populated metricsIntelligence subdoc', () => {
    const canal = build({
      metricsIntelligence: {
        enabled: true,
        channelJid: SANDBOX_JID,
        baileysSessionId: new mongoose.Types.ObjectId(),
        observationStartedAt: new Date(),
        pollPriority: 'high',
        lastPollAt: new Date(),
        lastPollStatus: 'ok',
        consecutiveFailures: 0,
        lastSubscriptionRenewedAt: new Date(),
        subscriptionStatus: 'active',
      },
    });
    expect(canal.validateSync()).toBeUndefined();
    expect(canal.metricsIntelligence.channelJid).toBe(SANDBOX_JID);
  });

  test('does NOT break existing botConfig.whatsapp fields', () => {
    const canal = build({
      botConfig: {
        whatsapp: {
          adminAccess: true,
          channelId: SANDBOX_JID,
          adminNumber: '+34674709388',
        },
      },
    });
    expect(canal.botConfig.whatsapp.adminAccess).toBe(true);
    expect(canal.botConfig.whatsapp.channelId).toBe(SANDBOX_JID);
    expect(canal.metricsIntelligence.enabled).toBe(false); // independent
  });
});

describe('CanalPostObservation schema', () => {
  function build(over = {}) {
    return new CanalPostObservation({
      canalId: FAKE_ID,
      channelJid: SANDBOX_JID,
      messageId: '3EB0E102B6B79B9D16AAF4',
      serverId: 110,
      publishedAt: new Date(),
      type: 'text',
      body: 'hello',
      ...over,
    });
  }

  test('minimal valid document', () => {
    const obs = build();
    expect(obs.validateSync()).toBeUndefined();
  });

  test('defaults — addressingMode, fromMe, source, reactions, isForwarded', () => {
    const obs = build();
    expect(obs.addressingMode).toBe('pn');
    expect(obs.fromMe).toBe(false);
    expect(obs.source).toBe('realtime');
    expect(obs.isForwarded).toBe(false);
    expect(obs.forwardingScore).toBe(0);
    expect(obs.reactions.total).toBe(0);
    expect(obs.reactions.byEmoji.size).toBe(0);
    expect(obs.nlp.categories).toEqual([]);
  });

  test('type enum rejects unknown variant', () => {
    const obs = build({ type: 'video-poll-hybrid' });
    expect(obs.validateSync()?.errors?.type).toBeDefined();
  });

  test('source enum accepts realtime/history_sync/manual/replay', () => {
    for (const s of ['realtime', 'history_sync', 'manual', 'replay']) {
      const obs = build({ source: s });
      expect(obs.validateSync()?.errors?.source).toBeUndefined();
    }
  });

  test('reactions.byEmoji is a Map of Number', () => {
    const obs = build();
    obs.reactions.byEmoji.set('🔥', 3);
    obs.reactions.byEmoji.set('👍', 1);
    obs.reactions.total = 4;
    obs.reactions.lastUpdate = new Date();
    expect(obs.validateSync()).toBeUndefined();
    expect(obs.reactions.byEmoji.get('🔥')).toBe(3);
    expect(obs.reactions.byEmoji.get('👍')).toBe(1);
  });

  test('links + media + poll are all optional', () => {
    const text = build();
    expect(text.links).toEqual([]);
    expect(text.media).toBeNull();
    expect(text.poll).toBeNull();
  });

  test('NLP subdoc structure', () => {
    const obs = build();
    obs.nlp.lang = 'es-ES';
    obs.nlp.categories = ['cripto', 'trading'];
    obs.nlp.sentiment = 0.4;
    obs.nlp.brandSafetyScore = 92;
    obs.nlp.isPromotional = true;
    obs.nlp.enrichedAt = new Date();
    expect(obs.validateSync()).toBeUndefined();
  });

  test('rawTtlExpiresAt is a Date for TTL index', () => {
    const obs = build({ rawTtlExpiresAt: new Date(Date.now() + 30 * 86400_000) });
    expect(obs.rawTtlExpiresAt).toBeInstanceOf(Date);
  });

  test('required fields rejected when missing', () => {
    const obs = new CanalPostObservation({});
    const err = obs.validateSync();
    expect(err?.errors?.canalId).toBeDefined();
    expect(err?.errors?.channelJid).toBeDefined();
    expect(err?.errors?.messageId).toBeDefined();
    expect(err?.errors?.serverId).toBeDefined();
    expect(err?.errors?.publishedAt).toBeDefined();
    expect(err?.errors?.type).toBeDefined();
  });
});

describe('CanalMetricsSnapshot schema', () => {
  function build(over = {}) {
    return new CanalMetricsSnapshot({
      timestamp: new Date(),
      channelJid: SANDBOX_JID,
      canalId: FAKE_ID,
      ...over,
    });
  }

  test('minimal valid document', () => {
    expect(build().validateSync()).toBeUndefined();
  });

  test('defaults — source, subscribersCount, verification, reactionCodes', () => {
    const s = build();
    expect(s.source).toBe('passive_poll');
    expect(s.subscribersCount).toBe(0);
    expect(s.adminCount).toBeNull();
    expect(s.verification).toBe('UNVERIFIED');
    expect(s.reactionCodesSetting).toBe('ALL');
    expect(s.pollStatus).toBe('ok');
    expect(s.pollDurationMs).toBe(0);
  });

  test('source enum', () => {
    expect(build({ source: 'realtime_metadata_update' }).validateSync()).toBeUndefined();
    expect(build({ source: 'manual' }).validateSync()).toBeUndefined();
    expect(build({ source: 'weird' }).validateSync()?.errors?.source).toBeDefined();
  });

  test('pollStatus enum covers all expected outcomes', () => {
    for (const s of ['ok', 'no_session', 'not_admin', 'metadata_failed', 'error']) {
      expect(build({ pollStatus: s }).validateSync()?.errors?.pollStatus).toBeUndefined();
    }
  });

  test('viewerRole + viewerMute enums allow null (passive poll)', () => {
    const s = build({ viewerRole: null, viewerMute: null });
    expect(s.validateSync()).toBeUndefined();
  });

  test('accepts populated snapshot', () => {
    const s = build({
      source: 'passive_poll',
      subscribersCount: 42,
      adminCount: 3,
      name: 'Channelad test',
      verification: 'VERIFIED',
      pictureId: 'pic_xyz',
      reactionCodesSetting: 'BASIC',
      viewerRole: 'ADMIN',
      viewerMute: 'OFF',
      pollDurationMs: 412,
    });
    expect(s.validateSync()).toBeUndefined();
    expect(s.viewerRole).toBe('ADMIN');
    expect(s.subscribersCount).toBe(42);
  });
});
