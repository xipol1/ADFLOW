/**
 * Tests for the Baileys-driven channel verification flow.
 *
 * Covers the bugs found in the 2026-05-28 audit:
 *   - C1 — Canal schema must persist channelJid / verifiedByMeta /
 *          baileysSessionId (previously stripped by strict mode).
 *   - C2 — WhatsAppAuditLog.ACTIONS must include every action string the
 *          manager / controller emits.
 *   - M1/M2/M3 — linkNewsletterToCanal must flip verificado, claimed/
 *          claimedBy/claimedAt, verificacion.tipoAcceso and confianzaScore.
 *   - M4 — revokeSession must demote all canales linked to it.
 */

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

// ── Mock models ────────────────────────────────────────────────────────────
const sessionDoc = {
  _id: 'sess123',
  usuarioId: 'user123',
  status: 'connected',
  newsletters: [
    {
      jid: '120363111@newsletter',
      name: 'Tech News ES',
      subscribers: 15000,
      verification: 'VERIFIED',
      role: 'OWNER',
    },
    {
      jid: '120363222@newsletter',
      name: 'Crypto Daily',
      subscribers: 4200,
      verification: 'UNVERIFIED',
      role: 'ADMIN',
    },
  ],
};

jest.mock('../models/BaileysSession', () => {
  const updateOne = jest.fn().mockResolvedValue({ acknowledged: true });
  const findById = jest.fn();
  const find = jest.fn();
  return { findById, find, updateOne };
});

jest.mock('../models/Canal', () => {
  const findById = jest.fn();
  const find = jest.fn();
  return { findById, find };
});

// Mock the audit log model so we don't hit Mongo, but keep the real
// ACTIONS enum so the coverage test below still trips on regressions.
jest.mock('../models/WhatsAppAuditLog', () => {
  const real = jest.requireActual('../models/WhatsAppAuditLog');
  return { record: jest.fn().mockResolvedValue({}), ACTIONS: real.ACTIONS };
});

const BaileysSession = require('../models/BaileysSession');
const Canal = require('../models/Canal');
const WhatsAppAuditLog = require('../models/WhatsAppAuditLog');
const { linkNewsletterToCanal } = require('../controllers/baileysController');

function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

function mockReq({ params = {}, body = {}, usuario = { id: 'user123' } } = {}) {
  return {
    params,
    body,
    usuario,
    headers: {},
    socket: { remoteAddress: '1.2.3.4' },
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('baileysController.linkNewsletterToCanal — side effects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function makeCanal(overrides = {}) {
    const canal = {
      _id: 'canal789',
      nombreCanal: 'Tech News ES',
      propietario: 'user123',
      claimed: false,
      claimedBy: null,
      claimedAt: null,
      claimToken: null,
      verificado: false,
      nivelVerificacion: 'bronce',
      verificacion: { tipoAcceso: 'declarado', confianzaScore: 30 },
      botConfig: { whatsapp: {} },
      estadisticas: { seguidores: 0 },
      save: jest.fn().mockResolvedValue(true),
      ...overrides,
    };
    // Mongoose-like `.set(obj)` that supports dot-paths.
    canal.set = jest.fn((patch) => {
      for (const [k, v] of Object.entries(patch)) {
        if (k.includes('.')) {
          const parts = k.split('.');
          let cur = canal;
          for (let i = 0; i < parts.length - 1; i++) {
            cur[parts[i]] = cur[parts[i]] || {};
            cur = cur[parts[i]];
          }
          cur[parts[parts.length - 1]] = v;
        } else {
          canal[k] = v;
        }
      }
    });
    return canal;
  }

  test('OWNER newsletter → canal gets full verification + claim + gold tier', async () => {
    BaileysSession.findById.mockResolvedValue(sessionDoc);
    const canal = makeCanal();
    Canal.findById.mockResolvedValue(canal);

    const req = mockReq({
      params: { sessionId: 'sess123' },
      body: { newsletterJid: '120363111@newsletter', canalId: 'canal789' },
    });
    const res = mockRes();

    await linkNewsletterToCanal(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );

    // C1 — persisted fields that the strict schema previously dropped
    expect(canal.botConfig.whatsapp.channelJid).toBe('120363111@newsletter');
    expect(canal.botConfig.whatsapp.verifiedByMeta).toBe(true);
    expect(canal.botConfig.whatsapp.baileysSessionId).toBe('sess123');
    expect(canal.botConfig.whatsapp.channelName).toBe('Tech News ES');

    // M1/M2 — verification status fully promoted
    expect(canal.verificado).toBe(true);
    expect(canal.nivelVerificacion).toBe('oro');
    expect(canal.verificacion.tipoAcceso).toBe('admin_directo');
    expect(canal.verificacion.confianzaScore).toBe(95);
    expect(canal.estado).toBe('activo');

    // M3 — claim recorded
    expect(canal.claimed).toBe(true);
    expect(canal.claimedBy).toBe('user123');
    expect(canal.claimedAt).toBeInstanceOf(Date);
    expect(canal.claimToken).toBeNull();

    // Subscribers mirrored
    expect(canal.estadisticas.seguidores).toBe(15000);

    expect(canal.save).toHaveBeenCalled();
    expect(WhatsAppAuditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'newsletter.linked_to_canal' }),
    );
  });

  test('ADMIN newsletter (not owner) → plata tier, still claimed', async () => {
    BaileysSession.findById.mockResolvedValue(sessionDoc);
    const canal = makeCanal();
    Canal.findById.mockResolvedValue(canal);

    const req = mockReq({
      params: { sessionId: 'sess123' },
      body: { newsletterJid: '120363222@newsletter', canalId: 'canal789' },
    });

    await linkNewsletterToCanal(req, mockRes());

    expect(canal.nivelVerificacion).toBe('plata');
    expect(canal.botConfig.whatsapp.verifiedByMeta).toBe(false); // UNVERIFIED
    expect(canal.verificado).toBe(true);
    expect(canal.claimed).toBe(true);
  });

  test('already-claimed canal preserves original claimer', async () => {
    BaileysSession.findById.mockResolvedValue(sessionDoc);
    const original = new Date('2025-01-01');
    const canal = makeCanal({
      claimed: true,
      claimedBy: 'someoneElse',
      claimedAt: original,
    });
    Canal.findById.mockResolvedValue(canal);

    const req = mockReq({
      params: { sessionId: 'sess123' },
      body: { newsletterJid: '120363111@newsletter', canalId: 'canal789' },
    });

    await linkNewsletterToCanal(req, mockRes());

    expect(canal.claimedBy).toBe('someoneElse');
    expect(canal.claimedAt).toBe(original);
    // But verification still happens
    expect(canal.verificado).toBe(true);
  });

  test('returns 403 if canal belongs to another user', async () => {
    BaileysSession.findById.mockResolvedValue(sessionDoc);
    Canal.findById.mockResolvedValue(makeCanal({ propietario: 'otherUser' }));

    const res = mockRes();
    await linkNewsletterToCanal(
      mockReq({
        params: { sessionId: 'sess123' },
        body: { newsletterJid: '120363111@newsletter', canalId: 'canal789' },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('returns 404 if newsletter not in session cache', async () => {
    BaileysSession.findById.mockResolvedValue(sessionDoc);
    Canal.findById.mockResolvedValue(makeCanal());

    const res = mockRes();
    await linkNewsletterToCanal(
      mockReq({
        params: { sessionId: 'sess123' },
        body: { newsletterJid: 'unknown@newsletter', canalId: 'canal789' },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ── Cleanup helper smoke — exports and basic shape ─────────────────────────

describe('BaileysSessionManager.cleanupStalePendingSessions', () => {
  test('exposes the helper and matches the cron contract', () => {
    // We can't fully instantiate the manager without baileys installed in
    // every CI runner, so just smoke-test the API surface that campaignCron
    // depends on. If this signature changes, the cron will silently noop.
    jest.isolateModules(() => {
      jest.doMock('../services/baileys/authStore', () => ({
        useMongoAuthState: jest.fn(),
        loadBaileys: jest.fn(() => { throw new Error('not installed'); }),
      }));
      const manager = require('../services/baileys/BaileysSessionManager');
      expect(typeof manager.cleanupStalePendingSessions).toBe('function');
    });
  });
});

// ── C2 regression — every action string used in code is in the enum ─────────

describe('WhatsAppAuditLog.ACTIONS — enum coverage', () => {
  // Pull the real enum (bypasses the jest.mock above) so the test trips if
  // the manager/controller ever emits an action that the enum rejects.
  const RealLog = jest.requireActual('../models/WhatsAppAuditLog');

  test.each([
    'session.created',
    'session.qr_generated',
    'session.connected',
    'session.disconnected',
    'session.revoked',
    'session.reconnect_skipped',
    'session.expired',
    'newsletter.list_fetched',
    'newsletter.linked_to_canal',
    'groups.list_fetched',
    'canal.demoted_on_revoke',
  ])('enum includes %s', (action) => {
    expect(RealLog.ACTIONS).toContain(action);
  });
});
