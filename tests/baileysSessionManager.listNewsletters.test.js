/**
 * BaileysSessionManager.listNewsletters — unit tests.
 *
 * Verifies graceful behaviour on Baileys 7.0+ (no `newsletterSubscribed`)
 * and the legacy 6.x path. Models are mocked so no Mongo is touched.
 */

jest.mock('../models/BaileysSession', () => ({
  findByIdAndUpdate: jest.fn(),
}));
jest.mock('../models/WhatsAppAuditLog', () => ({
  record: jest.fn().mockResolvedValue(true),
}));

const BaileysSession = require('../models/BaileysSession');
const WhatsAppAuditLog = require('../models/WhatsAppAuditLog');
const manager = require('../services/baileys/BaileysSessionManager');

beforeEach(() => {
  manager.sockets.clear();
  BaileysSession.findByIdAndUpdate.mockReset();
  WhatsAppAuditLog.record.mockReset();
  WhatsAppAuditLog.record.mockResolvedValue(true);
});

describe('listNewsletters — Baileys 7.0+ (no enumeration endpoint)', () => {
  test('returns [] when sock.newsletterSubscribed is missing', async () => {
    BaileysSession.findByIdAndUpdate.mockResolvedValue({ usuarioId: 'user-1' });
    manager.sockets.set('session-7', { sock: { /* no newsletterSubscribed */ } });

    const result = await manager.listNewsletters('session-7');

    expect(result).toEqual([]);
  });

  test('persists empty list to the session doc', async () => {
    BaileysSession.findByIdAndUpdate.mockResolvedValue({ usuarioId: 'user-1' });
    manager.sockets.set('session-7', { sock: {} });

    await manager.listNewsletters('session-7');

    expect(BaileysSession.findByIdAndUpdate).toHaveBeenCalledWith(
      'session-7',
      { $set: { newsletters: [] } },
      { new: true }
    );
  });

  test('emits a list_unavailable audit log entry (not list_fetched)', async () => {
    BaileysSession.findByIdAndUpdate.mockResolvedValue({ usuarioId: 'user-1' });
    manager.sockets.set('session-7', { sock: {} });

    await manager.listNewsletters('session-7');

    expect(WhatsAppAuditLog.record).toHaveBeenCalledTimes(1);
    const args = WhatsAppAuditLog.record.mock.calls[0][0];
    expect(args.action).toBe('newsletter.list_unavailable');
    expect(args.usuarioId).toBe('user-1');
    expect(args.sessionId).toBe('session-7');
    expect(args.data?.baileysVersion).toBeDefined();
  });

  test('does NOT throw when audit log fails (best-effort)', async () => {
    BaileysSession.findByIdAndUpdate.mockResolvedValue({ usuarioId: 'user-1' });
    WhatsAppAuditLog.record.mockRejectedValue(new Error('mongo down'));
    manager.sockets.set('session-7', { sock: {} });

    await expect(manager.listNewsletters('session-7')).resolves.toEqual([]);
  });

  test('does NOT throw when session doc is missing', async () => {
    BaileysSession.findByIdAndUpdate.mockResolvedValue(null);
    manager.sockets.set('session-7', { sock: {} });

    await expect(manager.listNewsletters('session-7')).resolves.toEqual([]);
    expect(WhatsAppAuditLog.record).not.toHaveBeenCalled();
  });
});

describe('listNewsletters — Baileys 6.x (legacy path)', () => {
  test('enumerates subscribers and filters to ADMIN/OWNER', async () => {
    BaileysSession.findByIdAndUpdate.mockResolvedValue({ usuarioId: 'user-2' });
    const fakeSock = {
      newsletterSubscribed: jest.fn().mockResolvedValue([
        { id: 'a@newsletter', name: 'Admin chan', role: 'ADMIN', subscribers_count: 100 },
        { id: 'b@newsletter', name: 'Follower chan', role: 'SUBSCRIBER', subscribers_count: 50 },
        { id: 'c@newsletter', name: 'Owner chan', role: 'OWNER', subscribers_count: 200 },
      ]),
    };
    manager.sockets.set('session-6', { sock: fakeSock });

    const result = await manager.listNewsletters('session-6');

    expect(result).toHaveLength(2);
    expect(result.map((n) => n.role).sort()).toEqual(['ADMIN', 'OWNER']);
    expect(result.find((n) => n.role === 'ADMIN')).toMatchObject({
      jid: 'a@newsletter',
      name: 'Admin chan',
      subscribers: 100,
    });
  });

  test('emits list_fetched audit log with count', async () => {
    BaileysSession.findByIdAndUpdate.mockResolvedValue({ usuarioId: 'user-2' });
    manager.sockets.set('session-6', {
      sock: {
        newsletterSubscribed: jest.fn().mockResolvedValue([
          { id: 'x@newsletter', role: 'ADMIN' },
        ]),
      },
    });

    await manager.listNewsletters('session-6');

    expect(WhatsAppAuditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'newsletter.list_fetched',
        data: { count: 1 },
      })
    );
  });

  test('swallows newsletterSubscribed errors and returns empty list', async () => {
    BaileysSession.findByIdAndUpdate.mockResolvedValue({ usuarioId: 'user-2' });
    manager.sockets.set('session-6', {
      sock: {
        newsletterSubscribed: jest.fn().mockRejectedValue(new Error('upstream broke')),
      },
    });

    const result = await manager.listNewsletters('session-6');
    expect(result).toEqual([]);
    // Still calls findByIdAndUpdate (with empty list) — preserves contract
    expect(BaileysSession.findByIdAndUpdate).toHaveBeenCalledWith(
      'session-6',
      { $set: { newsletters: [] } },
      { new: true }
    );
  });
});

describe('listNewsletters — guard rails', () => {
  test('throws when sessionId has no entry in the sockets map', async () => {
    await expect(manager.listNewsletters('nonexistent')).rejects.toThrow(/not connected/);
  });

  test('throws when sock is missing on the entry', async () => {
    manager.sockets.set('half-baked', { sock: null });
    await expect(manager.listNewsletters('half-baked')).rejects.toThrow(/not connected/);
  });
});
