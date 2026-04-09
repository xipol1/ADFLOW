/**
 * campaignSnapshotService unit tests.
 *
 * We mock ensureDb + the model layer, then exercise the pure orchestration
 * paths (buildMetricPoint, capturarSnapshot idempotency, runSnapshotCapture
 * batching, captureFinalSnapshot idempotency).
 */

jest.mock('../lib/ensureDb', () => ({ ensureDb: jest.fn().mockResolvedValue(true) }));

// ── Helpers ─────────────────────────────────────────────────────────────────
function fakeMetricsDoc(overrides = {}) {
  return {
    _id: 'metrics-1',
    campaniaId: 'camp-1',
    canalId: 'canal-1',
    nicho: 'crypto',
    plataforma: 'telegram',
    snapshotSchedule: {},
    snapshot_1h: null, snapshot_6h: null, snapshot_24h: null,
    snapshot_72h: null, snapshot_7d: null, final: null,
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('campaignSnapshotService — buildMetricPoint & fraud detection', () => {
  let service;

  beforeEach(() => {
    jest.resetModules();
    jest.doMock('../models/Campaign', () => ({
      findById: jest.fn(() => ({ lean: async () => ({ _id: 'camp-1', channel: 'canal-1' }) })),
    }));
    jest.doMock('../models/Canal', () => ({
      findById: jest.fn(() => ({ select: () => ({ lean: async () => ({ plataforma: 'telegram', categoria: 'crypto' }) }) })),
    }));
    jest.doMock('../models/TrackingLink', () => ({
      findOne: jest.fn(() => ({ select: () => ({ lean: async () => ({ stats: { uniqueClicks: 88 } }) }) })),
    }));
    jest.doMock('../models/CampaignMetricsV2', () => ({
      findOne: jest.fn(),
      create: jest.fn(),
      find: jest.fn(() => ({ limit: async () => [] })),
    }));
    service = require('../services/campaignSnapshotService');
  });

  test('buildMetricPoint reads clicks from TrackingLink when admin bot is unavailable', async () => {
    const { point } = await service.buildMetricPoint({
      campaign: { _id: 'camp-1' },
      canal: { plataforma: 'telegram', categoria: 'crypto' },
      nicho: 'crypto',
    });
    expect(point.clicksUnicos).toBe(88);
    expect(point.fuenteDatos).toBe('tracking_url');
    expect(point.views).toBe(0); // no admin bot source in this phase
  });

  test('buildMetricPoint CTRImplicito is 0 when views=0 (no Infinity/NaN)', async () => {
    const { point, anomaly } = await service.buildMetricPoint({
      campaign: { _id: 'camp-1' },
      canal: { plataforma: 'telegram', categoria: 'crypto' },
      nicho: 'crypto',
    });
    expect(point.CTRImplicito).toBe(0);
    expect(Number.isFinite(point.CTRImplicito)).toBe(true);
    expect(anomaly.anomalia).toBe(false);
    expect(point.flagFraude).toBe(false);
  });
});

describe('campaignSnapshotService — capturarSnapshot idempotency', () => {
  let service;

  beforeEach(() => {
    jest.resetModules();
    jest.doMock('../models/Campaign', () => ({
      findById: jest.fn(() => ({ lean: async () => ({ _id: 'camp-1', channel: 'canal-1' }) })),
    }));
    jest.doMock('../models/Canal', () => ({
      findById: jest.fn(() => ({ select: () => ({ lean: async () => ({ plataforma: 'telegram', categoria: 'crypto' }) }) })),
    }));
    jest.doMock('../models/TrackingLink', () => ({
      findOne: jest.fn(() => ({ select: () => ({ lean: async () => ({ stats: { uniqueClicks: 10 } }) }) })),
    }));
    jest.doMock('../models/CampaignMetricsV2', () => ({
      findOne: jest.fn(), create: jest.fn(), find: jest.fn(() => ({ limit: async () => [] })),
    }));
    service = require('../services/campaignSnapshotService');
  });

  test('already-populated snapshot is skipped silently (no save)', async () => {
    const doc = fakeMetricsDoc({
      snapshot_1h: { views: 100, clicksUnicos: 5 }, // already captured
    });
    const result = await service.capturarSnapshot(doc, '1h');
    expect(result.status).toBe('skipped_exists');
    expect(result.window).toBe('1h');
    expect(doc.save).not.toHaveBeenCalled();
  });

  test('null snapshot is captured and persisted', async () => {
    const doc = fakeMetricsDoc();
    const result = await service.capturarSnapshot(doc, '24h');
    expect(result.status).toBe('captured');
    expect(result.window).toBe('24h');
    expect(doc.snapshot_24h).toBeDefined();
    expect(doc.snapshot_24h.clicksUnicos).toBe(10);
    expect(doc.save).toHaveBeenCalledTimes(1);
  });

  test('unknown window key throws', async () => {
    const doc = fakeMetricsDoc();
    await expect(service.capturarSnapshot(doc, '999h')).rejects.toThrow(/Unknown snapshot window/);
  });

  test('missing campaign yields skipped_no_campaign without crashing', async () => {
    jest.resetModules();
    jest.doMock('../lib/ensureDb', () => ({ ensureDb: jest.fn().mockResolvedValue(true) }));
    jest.doMock('../models/Campaign', () => ({
      findById: jest.fn(() => ({ lean: async () => null })),
    }));
    jest.doMock('../models/Canal', () => ({
      findById: jest.fn(() => ({ select: () => ({ lean: async () => null }) })),
    }));
    jest.doMock('../models/TrackingLink', () => ({
      findOne: jest.fn(() => ({ select: () => ({ lean: async () => null }) })),
    }));
    jest.doMock('../models/CampaignMetricsV2', () => ({ findOne: jest.fn(), create: jest.fn(), find: jest.fn() }));
    const svc = require('../services/campaignSnapshotService');
    const doc = fakeMetricsDoc();
    const result = await svc.capturarSnapshot(doc, '1h');
    expect(result.status).toBe('skipped_no_campaign');
    expect(doc.save).not.toHaveBeenCalled();
  });
});

describe('campaignSnapshotService — captureFinalSnapshot', () => {
  let service;
  let CampaignMetricsV2;

  beforeEach(() => {
    jest.resetModules();
    const doc = fakeMetricsDoc();
    jest.doMock('../models/Campaign', () => ({
      findById: jest.fn(() => ({ lean: async () => ({ _id: 'camp-1', channel: 'canal-1' }) })),
    }));
    jest.doMock('../models/Canal', () => ({
      findById: jest.fn(() => ({ select: () => ({ lean: async () => ({ plataforma: 'telegram', categoria: 'crypto' }) }) })),
    }));
    jest.doMock('../models/TrackingLink', () => ({
      findOne: jest.fn(() => ({ select: () => ({ lean: async () => ({ stats: { uniqueClicks: 42 } }) }) })),
    }));
    CampaignMetricsV2 = {
      _doc: doc,
      findOne: jest.fn().mockImplementation(() => Promise.resolve(doc)),
      create: jest.fn(),
      find: jest.fn(() => ({ limit: async () => [] })),
    };
    jest.doMock('../models/CampaignMetricsV2', () => CampaignMetricsV2);
    service = require('../services/campaignSnapshotService');
  });

  test('writes final snapshot when absent', async () => {
    const result = await service.captureFinalSnapshot('camp-1');
    expect(result.status).toBe('captured');
    expect(CampaignMetricsV2._doc.final).toBeDefined();
    expect(CampaignMetricsV2._doc.final.clicksUnicos).toBe(42);
    expect(CampaignMetricsV2._doc.save).toHaveBeenCalledTimes(1);
  });

  test('is idempotent — second call skips because final already exists', async () => {
    await service.captureFinalSnapshot('camp-1'); // populates final
    CampaignMetricsV2._doc.save.mockClear();
    const result = await service.captureFinalSnapshot('camp-1');
    expect(result.status).toBe('skipped_exists');
    expect(CampaignMetricsV2._doc.save).not.toHaveBeenCalled();
  });
});

describe('campaignSnapshotService — runSnapshotCapture query shape', () => {
  let service;
  let CampaignMetricsV2;
  let queries = [];

  beforeEach(() => {
    jest.resetModules();
    queries = [];
    jest.doMock('../models/Campaign', () => ({
      findById: jest.fn(() => ({ lean: async () => ({ _id: 'camp-1', channel: 'canal-1' }) })),
    }));
    jest.doMock('../models/Canal', () => ({
      findById: jest.fn(() => ({ select: () => ({ lean: async () => ({ plataforma: 'telegram', categoria: 'crypto' }) }) })),
    }));
    jest.doMock('../models/TrackingLink', () => ({
      findOne: jest.fn(() => ({ select: () => ({ lean: async () => ({ stats: { uniqueClicks: 1 } }) }) })),
    }));
    CampaignMetricsV2 = {
      findOne: jest.fn(),
      create: jest.fn(),
      find: jest.fn((q) => {
        queries.push(q);
        return { limit: async () => [] };
      }),
    };
    jest.doMock('../models/CampaignMetricsV2', () => CampaignMetricsV2);
    service = require('../services/campaignSnapshotService');
  });

  test('issues one filtered query per snapshot window, all with NULL-snapshot guard', async () => {
    await service.runSnapshotCapture({ now: new Date('2026-04-09T10:00:00Z') });
    expect(queries).toHaveLength(5); // 1h, 6h, 24h, 72h, 7d
    const windows = ['at_1h', 'at_6h', 'at_24h', 'at_72h', 'at_7d'];
    const snapshots = ['snapshot_1h', 'snapshot_6h', 'snapshot_24h', 'snapshot_72h', 'snapshot_7d'];
    for (let i = 0; i < 5; i++) {
      const q = queries[i];
      const schedKey = `snapshotSchedule.${windows[i]}`;
      expect(q[schedKey]).toBeDefined();
      expect(q[schedKey].$lte).toBeInstanceOf(Date);
      // Idempotency guard: only docs whose snapshot is still null.
      expect(q[snapshots[i]]).toBeNull();
    }
  });
});

describe('campaignSnapshotService — SNAPSHOT_WINDOWS ordering and offsets', () => {
  const { SNAPSHOT_WINDOWS } = require('../services/campaignSnapshotService');

  test('has exactly 5 windows in chronological order', () => {
    expect(SNAPSHOT_WINDOWS).toHaveLength(5);
    for (let i = 1; i < SNAPSHOT_WINDOWS.length; i++) {
      expect(SNAPSHOT_WINDOWS[i].offsetMs).toBeGreaterThan(SNAPSHOT_WINDOWS[i - 1].offsetMs);
    }
  });

  test('offsets match the 1h/6h/24h/72h/7d spec', () => {
    const ms = (h) => h * 60 * 60 * 1000;
    expect(SNAPSHOT_WINDOWS[0].offsetMs).toBe(ms(1));
    expect(SNAPSHOT_WINDOWS[1].offsetMs).toBe(ms(6));
    expect(SNAPSHOT_WINDOWS[2].offsetMs).toBe(ms(24));
    expect(SNAPSHOT_WINDOWS[3].offsetMs).toBe(ms(72));
    expect(SNAPSHOT_WINDOWS[4].offsetMs).toBe(ms(24 * 7));
  });
});
