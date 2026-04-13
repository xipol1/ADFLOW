/**
 * Tests for channel claim flow (init → verify).
 */

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.TELEGRAM_API_ID = '12345';
process.env.TELEGRAM_API_HASH = 'testhash';
process.env.TELEGRAM_SESSION = 'test';

// ── Mock MTProto ────────────────────────────────────────────────────────
const mockGetEntity = jest.fn();
const mockInvoke = jest.fn();
const mockConnect = jest.fn().mockResolvedValue(true);
const mockDisconnect = jest.fn().mockResolvedValue(true);

jest.mock('telegram', () => ({
  TelegramClient: jest.fn().mockImplementation(() => ({
    connect: mockConnect,
    disconnect: mockDisconnect,
    connected: true,
    getEntity: mockGetEntity,
    invoke: mockInvoke,
  })),
}));

jest.mock('telegram/sessions', () => ({
  StringSession: jest.fn().mockImplementation(() => ({ save: () => '' })),
}));

jest.mock('telegram/tl', () => {
  class Channel {
    constructor(data) { Object.assign(this, data); this.className = 'Channel'; }
  }
  return {
    Api: {
      Channel,
      channels: {
        GetFullChannel: jest.fn().mockImplementation((p) => p),
      },
    },
  };
});

// ── Mock models ─────────────────────────────────────────────────────────
const mockCanal = {
  _id: '507f1f77bcf86cd799439011',
  nombreCanal: 'Test Channel',
  identificadorCanal: '@testchan',
  plataforma: 'telegram',
  claimed: false,
  claimedBy: null,
  claimToken: null,
  save: jest.fn().mockResolvedValue(true),
};

jest.mock('../models/Canal', () => {
  const findById = jest.fn();
  const find = jest.fn();
  const model = { findById, find };
  return model;
});

jest.mock('../lib/ensureDb', () => ({
  ensureDb: jest.fn().mockResolvedValue(true),
}));

const Canal = require('../models/Canal');
const { initClaim, verifyClaim, myClaimedChannels } = require('../controllers/claimController');

// ── Helpers ─────────────────────────────────────────────────────────────
function mockRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

function mockReq(params = {}, usuario = { id: 'user123' }) {
  return { params, usuario };
}

describe('claimController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initClaim', () => {
    test('generates claimToken for unclaimed telegram channel', async () => {
      const canal = { ...mockCanal, claimed: false, plataforma: 'telegram', save: jest.fn() };
      Canal.findById.mockResolvedValue(canal);

      const req = mockReq({ id: canal._id });
      const res = mockRes();

      await initClaim(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            claimCode: expect.stringContaining('channelad-verify-'),
          }),
        }),
      );
      expect(canal.save).toHaveBeenCalled();
      expect(canal.claimToken).toBeTruthy();
    });

    test('returns 409 for already claimed channel', async () => {
      Canal.findById.mockResolvedValue({ ...mockCanal, claimed: true });

      const req = mockReq({ id: mockCanal._id });
      const res = mockRes();

      await initClaim(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    test('returns 400 for non-telegram channel', async () => {
      Canal.findById.mockResolvedValue({ ...mockCanal, plataforma: 'discord', claimed: false });

      const req = mockReq({ id: mockCanal._id });
      const res = mockRes();

      await initClaim(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 404 for nonexistent channel', async () => {
      Canal.findById.mockResolvedValue(null);

      const req = mockReq({ id: 'nonexistent' });
      const res = mockRes();

      await initClaim(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('verifyClaim', () => {
    test('verifies claim when description contains token', async () => {
      const token = 'abc123test';
      const canal = {
        ...mockCanal,
        claimed: false,
        claimToken: token,
        identificadorCanal: '@testchan',
        plataforma: 'telegram',
        save: jest.fn(),
      };
      Canal.findById.mockResolvedValue(canal);

      // Mock MTProto: description contains the token
      const { Api } = require('telegram/tl');
      mockGetEntity.mockResolvedValue(new Api.Channel({ id: 1n, username: 'testchan', accessHash: 0n }));
      mockInvoke.mockResolvedValue({
        fullChat: { about: `Mi canal de finanzas channelad-verify-${token} bienvenidos` },
      });

      const req = mockReq({ id: canal._id }, { id: 'user123' });
      const res = mockRes();

      await verifyClaim(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          verified: true,
        }),
      );
      expect(canal.claimed).toBe(true);
      expect(canal.claimedBy).toBe('user123');
      expect(canal.claimToken).toBeNull();
      expect(canal.save).toHaveBeenCalled();
    });

    test('rejects when description does NOT contain token', async () => {
      const canal = {
        ...mockCanal,
        claimed: false,
        claimToken: 'xyz789',
        identificadorCanal: '@testchan',
        plataforma: 'telegram',
        save: jest.fn(),
      };
      Canal.findById.mockResolvedValue(canal);

      const { Api } = require('telegram/tl');
      mockGetEntity.mockResolvedValue(new Api.Channel({ id: 1n, username: 'testchan', accessHash: 0n }));
      mockInvoke.mockResolvedValue({
        fullChat: { about: 'Just a normal channel description' },
      });

      const req = mockReq({ id: canal._id }, { id: 'user456' });
      const res = mockRes();

      await verifyClaim(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          verified: false,
        }),
      );
      expect(canal.claimed).toBe(false);
    });

    test('rejects already claimed channel', async () => {
      Canal.findById.mockResolvedValue({ ...mockCanal, claimed: true, save: jest.fn() });

      const req = mockReq({ id: mockCanal._id }, { id: 'user789' });
      const res = mockRes();

      await verifyClaim(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    test('rejects when no claim process is active', async () => {
      Canal.findById.mockResolvedValue({ ...mockCanal, claimed: false, claimToken: null, save: jest.fn() });

      const req = mockReq({ id: mockCanal._id }, { id: 'user' });
      const res = mockRes();

      await verifyClaim(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('myClaimedChannels', () => {
    test('returns channels claimed by user', async () => {
      Canal.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { _id: '1', nombreCanal: 'Chan1', claimed: true },
          ]),
        }),
      });

      const req = mockReq({}, { id: 'user123' });
      const res = mockRes();

      await myClaimedChannels(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({ nombreCanal: 'Chan1' }),
          ]),
        }),
      );
    });
  });
});
