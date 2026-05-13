/**
 * FraudDetectionService — orchestrator + persistence tests with mocked
 * Mongoose models.
 *
 * Validates:
 *   - runRules() short-circuits when observation window is too short
 *   - candidates from rules are persisted via findOneAndUpdate (upsert)
 *   - critical alerts trigger Canal.estado update
 *   - resolveAlert + dismissAlert helpers update the right fields
 */

// Mock models BEFORE requiring the service.
jest.mock('../models/CanalAlert', () => {
  const mock = {
    findOneAndUpdate: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    find: jest.fn(),
    ALERT_TYPES: [],
    SEVERITIES: [],
    STATUSES: [],
    AUTO_ACTIONS: [],
  };
  return mock;
});
jest.mock('../models/Canal', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

const CanalAlert = require('../models/CanalAlert');
const Canal = require('../models/Canal');
const fraud = require('../services/FraudDetectionService');

function makeIntel(over = {}) {
  return {
    sampleWindowDays: 30,
    inputCounts: { snapshots30d: 30, snapshots90d: 90, posts30d: 30, posts90d: 90 },
    cadence: {},
    growth: {},
    engagement: {},
    contentMix: {},
    trust: {},
    ...over,
  };
}
function makeCanal(over = {}) {
  return {
    _id: 'canal-1',
    categoria: 'cripto',
    estadisticas: { seguidores: 1000 },
    estado: 'activo',
    verificado: true,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: findOneAndUpdate returns a fake alert doc
  CanalAlert.findOneAndUpdate.mockResolvedValue({ _id: 'alert-1', type: 'BOT_ADMIN_SUSPICION' });
  CanalAlert.findByIdAndUpdate.mockResolvedValue({ _id: 'alert-1' });
  CanalAlert.find.mockImplementation(() => ({
    sort: () => ({ limit: () => ({ lean: () => Promise.resolve([]) }) }),
  }));
  Canal.findById.mockImplementation((id) => ({
    select: () => ({ lean: () => Promise.resolve({ _id: id, estado: 'activo' }) }),
  }));
  Canal.findByIdAndUpdate.mockResolvedValue({});
});

describe('FraudDetectionService.runRules', () => {
  test('skips when intelligence is missing', async () => {
    const r = await fraud.runRules({ intelligence: null, canal: makeCanal() });
    expect(r.candidates).toEqual([]);
    expect(r.applied).toEqual([]);
    expect(r.skipped).toMatch(/missing inputs/);
    expect(CanalAlert.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('skips when observation window too short (<3 posts)', async () => {
    const intel = makeIntel({
      inputCounts: { snapshots30d: 0, snapshots90d: 0, posts30d: 0, posts90d: 0 },
      trust: { botAdminSuspicionScore: 0.99 },
    });
    const r = await fraud.runRules({ intelligence: intel, canal: makeCanal() });
    expect(r.skipped).toMatch(/observation window/);
    expect(CanalAlert.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('persists every triggered rule via upsert', async () => {
    const intel = makeIntel({
      growth: { followersCurrent: 500 }, // declared 1000, off by 50% → FOLLOWER_INCOHERENCE
      trust: { botAdminSuspicionScore: 0.9 }, // → BOT_ADMIN_SUSPICION (critical)
      contentMix: { uniqueContentRatio: 0.1 }, // → DUPLICATE_CONTENT_FARM (critical)
    });
    const r = await fraud.runRules({ intelligence: intel, canal: makeCanal() });
    expect(r.candidates.length).toBeGreaterThanOrEqual(3);
    expect(CanalAlert.findOneAndUpdate).toHaveBeenCalledTimes(r.candidates.length);
    // Each call uses upsert: true
    for (const call of CanalAlert.findOneAndUpdate.mock.calls) {
      expect(call[2]).toMatchObject({ upsert: true, new: true });
    }
  });

  test('passes evidence into the upsert payload', async () => {
    const intel = makeIntel({ trust: { botAdminSuspicionScore: 0.85 } });
    await fraud.runRules({ intelligence: intel, canal: makeCanal() });
    const call = CanalAlert.findOneAndUpdate.mock.calls.find(
      (c) => c[0].type === 'BOT_ADMIN_SUSPICION'
    );
    expect(call).toBeTruthy();
    expect(call[1].$set.evidence).toMatchObject({ score: 0.85 });
    expect(call[1].$inc).toEqual({ reTriggerCount: 1 });
  });

  test('critical rule triggers Canal estado update to paused_review', async () => {
    const intel = makeIntel({ contentMix: { uniqueContentRatio: 0.1 } });
    await fraud.runRules({ intelligence: intel, canal: makeCanal() });
    expect(Canal.findByIdAndUpdate).toHaveBeenCalledWith(
      'canal-1',
      { $set: { estado: 'paused_review' } }
    );
  });

  test('does NOT re-pause an already paused canal', async () => {
    Canal.findById.mockImplementation((id) => ({
      select: () => ({ lean: () => Promise.resolve({ _id: id, estado: 'paused_review' }) }),
    }));
    const intel = makeIntel({ contentMix: { uniqueContentRatio: 0.1 } });
    await fraud.runRules({ intelligence: intel, canal: makeCanal({ estado: 'paused_review' }) });
    expect(Canal.findByIdAndUpdate).not.toHaveBeenCalledWith(
      'canal-1',
      expect.objectContaining({ $set: expect.objectContaining({ estado: 'paused_review' }) })
    );
  });

  test('warning rule does NOT pause the canal', async () => {
    const intel = makeIntel({
      growth: { followersCurrent: 500 }, // FOLLOWER_INCOHERENCE warning
    });
    await fraud.runRules({ intelligence: intel, canal: makeCanal() });
    expect(Canal.findByIdAndUpdate).not.toHaveBeenCalledWith(
      'canal-1',
      expect.objectContaining({ $set: expect.objectContaining({ estado: 'paused_review' }) })
    );
  });

  test('info rule does NOT pause and does NOT flag', async () => {
    const intel = makeIntel({
      engagement: { engagementRate30d: 0.00001 }, // ENGAGEMENT_ANOMALY_LOW info
    });
    const r = await fraud.runRules({ intelligence: intel, canal: makeCanal() });
    const candidate = r.candidates.find((c) => c.type === 'ENGAGEMENT_ANOMALY_LOW');
    expect(candidate.autoAction).toBe('none');
    expect(Canal.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});

describe('FraudDetectionService admin helpers', () => {
  test('resolveAlert marks status=resolved and sets resolvedBy', async () => {
    CanalAlert.findByIdAndUpdate.mockResolvedValue({ _id: 'a1', status: 'resolved' });
    await fraud.resolveAlert('a1', { userId: 'user-42', note: 'manual ack' });
    const call = CanalAlert.findByIdAndUpdate.mock.calls[0];
    expect(call[0]).toBe('a1');
    expect(call[1].$set.status).toBe('resolved');
    expect(call[1].$set.resolvedBy).toBe('user-42');
    expect(call[1].$set.resolutionNote).toBe('manual ack');
  });

  test('dismissAlert marks status=dismissed', async () => {
    await fraud.dismissAlert('a2', { userId: 'admin-9', note: 'false positive' });
    const call = CanalAlert.findByIdAndUpdate.mock.calls[0];
    expect(call[1].$set.status).toBe('dismissed');
  });

  test('listAlertsForCanal defaults to active only', async () => {
    await fraud.listAlertsForCanal('canal-1');
    const filter = CanalAlert.find.mock.calls[0][0];
    expect(filter).toEqual({ canalId: 'canal-1', status: 'active' });
  });

  test('listAlertsForCanal with includeResolved=true skips status filter', async () => {
    await fraud.listAlertsForCanal('canal-1', { includeResolved: true });
    const filter = CanalAlert.find.mock.calls[0][0];
    expect(filter).toEqual({ canalId: 'canal-1' });
  });
});
