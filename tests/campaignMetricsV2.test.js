const mongoose = require('mongoose');
const CampaignMetricsV2 = require('../models/CampaignMetricsV2');

function buildDoc(overrides = {}) {
  return new CampaignMetricsV2({
    campaniaId: new mongoose.Types.ObjectId(),
    canalId: new mongoose.Types.ObjectId(),
    nicho: 'crypto',
    plataforma: 'telegram',
    ...overrides,
  });
}

describe('CampaignMetricsV2 — core shape', () => {
  test('valid minimal document passes validation', () => {
    expect(buildDoc().validateSync()).toBeUndefined();
  });

  test('campaniaId is required', () => {
    const doc = buildDoc({ campaniaId: undefined });
    expect(doc.validateSync().errors.campaniaId).toBeDefined();
  });

  test('canalId is required', () => {
    const doc = buildDoc({ canalId: undefined });
    expect(doc.validateSync().errors.canalId).toBeDefined();
  });

  test('campaniaId references the live Campaign model, not Anuncio', () => {
    const path = CampaignMetricsV2.schema.path('campaniaId');
    expect(path.options.ref).toBe('Campaign');
  });

  test('all five named snapshots plus final exist as subdocument paths', () => {
    for (const name of ['snapshot_1h', 'snapshot_6h', 'snapshot_24h', 'snapshot_72h', 'snapshot_7d', 'final']) {
      const p = CampaignMetricsV2.schema.path(name);
      expect(p).toBeDefined();
      // Ensure it's a subdocument path, not an array.
      expect(p.instance).toBe('Embedded');
    }
  });

  test('snapshots default to null until captured', () => {
    const doc = buildDoc();
    expect(doc.snapshot_1h).toBeNull();
    expect(doc.final).toBeNull();
  });
});

describe('CampaignMetricsV2 — MetricPoint CTR computation', () => {
  // Use async doc.validate() — that matches production (doc.save() calls
  // async validate internally). Mongoose pre('validate') hooks do not
  // fire on validateSync, only on validate().

  test('CTR is computed at save time from views and clicks', async () => {
    const doc = buildDoc({
      snapshot_24h: { views: 5000, clicksUnicos: 110 },
    });
    await doc.validate();
    expect(doc.snapshot_24h.CTR).toBeCloseTo(0.022, 6);
  });

  test('CTR is 0 (not NaN, not Infinity) when views = 0', async () => {
    const doc = buildDoc({
      snapshot_1h: { views: 0, clicksUnicos: 0 },
    });
    await doc.validate();
    expect(doc.snapshot_1h.CTR).toBe(0);
    expect(Number.isFinite(doc.snapshot_1h.CTR)).toBe(true);
  });

  test('CTR is 0 when views = 0 but clicks > 0 (never Infinity)', async () => {
    const doc = buildDoc({
      snapshot_1h: { views: 0, clicksUnicos: 50 },
    });
    await doc.validate();
    expect(doc.snapshot_1h.CTR).toBe(0);
  });

  test('CTR survives a subsequent mutation and recompute', async () => {
    const doc = buildDoc({ snapshot_6h: { views: 1000, clicksUnicos: 10 } });
    await doc.validate();
    expect(doc.snapshot_6h.CTR).toBeCloseTo(0.01, 6);

    doc.snapshot_6h.clicksUnicos = 25;
    await doc.validate();
    expect(doc.snapshot_6h.CTR).toBeCloseTo(0.025, 6);
  });

  test('CTRImplicito defaults to CTR when not explicitly provided', async () => {
    const doc = buildDoc({ snapshot_24h: { views: 4000, clicksUnicos: 80 } });
    await doc.validate();
    expect(doc.snapshot_24h.CTRImplicito).toBeCloseTo(0.02, 6);
  });
});

describe('CampaignMetricsV2 — per-snapshot anti-fraud metadata', () => {
  test('fuenteDatos enum accepts all six verification sources', () => {
    const sources = [
      'admin_directo', 'oauth_graph', 'bot_miembro',
      'tracking_url', 'screenshot_ocr', 'declarado',
    ];
    for (const s of sources) {
      const doc = buildDoc({ snapshot_1h: { views: 10, clicksUnicos: 1, fuenteDatos: s } });
      expect(doc.validateSync()).toBeUndefined();
    }
  });

  test('fuenteDatos enum rejects unknown sources', () => {
    const doc = buildDoc({ snapshot_1h: { views: 10, clicksUnicos: 1, fuenteDatos: 'telepatia' } });
    const err = doc.validateSync();
    expect(err).toBeDefined();
  });

  test('fuenteDatos is stored per snapshot, not per document', () => {
    const doc = buildDoc({
      snapshot_1h: { views: 10, clicksUnicos: 1, fuenteDatos: 'tracking_url' },
      snapshot_24h: { views: 10000, clicksUnicos: 220, fuenteDatos: 'screenshot_ocr' },
      final: { views: 15000, clicksUnicos: 330, fuenteDatos: 'admin_directo' },
    });
    expect(doc.validateSync()).toBeUndefined();
    expect(doc.snapshot_1h.fuenteDatos).toBe('tracking_url');
    expect(doc.snapshot_24h.fuenteDatos).toBe('screenshot_ocr');
    expect(doc.final.fuenteDatos).toBe('admin_directo');
  });

  test('tipoFlag accepts ctr_alto, ctr_bajo, and null', () => {
    const doc = buildDoc({
      snapshot_24h: { views: 1000, clicksUnicos: 10, flagFraude: true, tipoFlag: 'ctr_alto' },
      final: { views: 1000, clicksUnicos: 10, flagFraude: false, tipoFlag: null },
    });
    expect(doc.validateSync()).toBeUndefined();
  });
});

describe('CampaignMetricsV2 — indexes', () => {
  const indexes = CampaignMetricsV2.schema.indexes();

  test('has a unique index on campaniaId (prevents duplicate metrics docs)', () => {
    const match = indexes.find(
      ([spec, opts]) => spec.campaniaId === 1 && opts && opts.unique === true,
    );
    expect(match).toBeDefined();
  });

  test('has compound index { canalId: 1, "final.timestamp": -1 } for CAP query', () => {
    const match = indexes.find(
      ([spec]) => spec.canalId === 1 && spec['final.timestamp'] === -1,
    );
    expect(match).toBeDefined();
  });

  test('has one capture-cron index per snapshot window', () => {
    const windows = ['at_1h', 'at_6h', 'at_24h', 'at_72h', 'at_7d'];
    const snapshots = ['snapshot_1h', 'snapshot_6h', 'snapshot_24h', 'snapshot_72h', 'snapshot_7d'];
    for (let i = 0; i < windows.length; i++) {
      const schedKey = `snapshotSchedule.${windows[i]}`;
      const snapKey = snapshots[i];
      const match = indexes.find(
        ([spec]) => spec[schedKey] === 1 && spec[snapKey] === 1,
      );
      expect(match).toBeDefined();
    }
  });
});

describe('CampaignMetricsV2 — snapshot schedule', () => {
  test('publishedAt and snapshotSchedule.at_Xh paths exist', () => {
    for (const field of [
      'publishedAt',
      'snapshotSchedule.at_1h',
      'snapshotSchedule.at_6h',
      'snapshotSchedule.at_24h',
      'snapshotSchedule.at_72h',
      'snapshotSchedule.at_7d',
    ]) {
      expect(CampaignMetricsV2.schema.path(field)).toBeDefined();
    }
  });

  test('snapshotSchedule dates default to null', () => {
    const doc = buildDoc();
    expect(doc.snapshotSchedule.at_1h).toBeNull();
    expect(doc.snapshotSchedule.at_7d).toBeNull();
    expect(doc.publishedAt).toBeNull();
  });
});
