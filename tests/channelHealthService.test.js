/**
 * channelHealthService tests — pure logic only.
 *
 * runHealthCheckBatch requires a DB and Canal.find/save mocking that's
 * exercised in the integration suite. Here we test:
 *   - classifyError mapping (the user-facing diagnostic)
 *   - applyHealthResult state transitions on a fake Canal doc
 */

jest.mock('../services/notificationService', () => ({
  enviarNotificacion: jest.fn().mockResolvedValue(null),
}));
jest.mock('../lib/platformConnectors', () => ({
  verifyChannelAccess: jest.fn(),
}));

const { verifyChannelAccess } = require('../lib/platformConnectors');
const notificationService = require('../services/notificationService');
const {
  classifyError,
  applyHealthResult,
  checkChannelHealth,
  REVERIFY_STATE,
  CONFIANZA_PENALTY,
} = require('../services/channelHealthService');

function makeCanal(overrides = {}) {
  return {
    _id: 'fake-id',
    propietario: 'owner-id',
    plataforma: 'telegram',
    identificadorCanal: 'testchan',
    nombreCanal: 'Test',
    estado: 'activo',
    verificacion: { confianzaScore: 80 },
    antifraude: { flags: [] },
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('classifyError', () => {
  test('detects token revocation', () => {
    expect(classifyError('OAuth access token expired')).toBe('TOKEN_REVOKED');
    expect(classifyError('token revoked by user')).toBe('TOKEN_REVOKED');
    expect(classifyError('Invalid OAuth access token')).toBe('TOKEN_REVOKED');
  });

  test('detects admin loss', () => {
    expect(classifyError('Bot is not admin in this chat')).toBe('ADMIN_LOST');
    expect(classifyError('forbidden: kicked from group')).toBe('ADMIN_LOST');
    expect(classifyError('403 Forbidden')).toBe('ADMIN_LOST');
  });

  test('detects rate limiting', () => {
    expect(classifyError('Rate limit exceeded')).toBe('RATE_LIMITED');
    expect(classifyError('429 Too Many Requests')).toBe('RATE_LIMITED');
  });

  test('detects platform outages', () => {
    expect(classifyError('Request timeout')).toBe('PLATFORM_DOWN');
    expect(classifyError('502 Bad Gateway')).toBe('PLATFORM_DOWN');
    expect(classifyError('ECONNREFUSED')).toBe('PLATFORM_DOWN');
  });

  test('falls back to UNKNOWN/VERIFY_FAILED', () => {
    expect(classifyError('')).toBe('UNKNOWN');
    expect(classifyError(null)).toBe('UNKNOWN');
    expect(classifyError('something weird happened')).toBe('VERIFY_FAILED');
  });
});

describe('checkChannelHealth', () => {
  test('returns ok when verifyChannelAccess says valid', async () => {
    verifyChannelAccess.mockResolvedValue({ valid: true });
    const result = await checkChannelHealth(makeCanal());
    expect(result.ok).toBe(true);
    expect(result.code).toBe('HEALTHY');
  });

  test('returns classified failure when verifyChannelAccess returns valid:false', async () => {
    verifyChannelAccess.mockResolvedValue({ valid: false, error: 'Bot is not admin' });
    const result = await checkChannelHealth(makeCanal());
    expect(result.ok).toBe(false);
    expect(result.code).toBe('ADMIN_LOST');
  });

  test('catches thrown errors and returns ok:false', async () => {
    verifyChannelAccess.mockRejectedValue(new Error('Network timeout'));
    const result = await checkChannelHealth(makeCanal());
    expect(result.ok).toBe(false);
    expect(result.code).toBe('PLATFORM_DOWN');
  });
});

describe('applyHealthResult — state transitions', () => {
  test('healthy active channel: noop', async () => {
    const canal = makeCanal();
    const transition = await applyHealthResult(canal, { ok: true, code: 'HEALTHY' });
    expect(transition).toBe('noop');
    expect(canal.save).not.toHaveBeenCalled();
    expect(canal.estado).toBe('activo');
  });

  test('healthy previously-degraded channel: restored to active', async () => {
    const canal = makeCanal({ estado: REVERIFY_STATE, verificacion: { confianzaScore: 20 } });
    const transition = await applyHealthResult(canal, { ok: true, code: 'HEALTHY' });
    expect(transition).toBe('restored');
    expect(canal.estado).toBe('activo');
    expect(canal.verificacion.confianzaScore).toBe(50);
    expect(canal.save).toHaveBeenCalled();
  });

  test('admin-lost active channel: degraded + penalty + notification', async () => {
    const canal = makeCanal({ verificacion: { confianzaScore: 80 } });
    const transition = await applyHealthResult(canal, { ok: false, code: 'ADMIN_LOST', message: 'Bot is not admin' });
    expect(transition).toBe('degraded');
    expect(canal.estado).toBe(REVERIFY_STATE);
    expect(canal.verificacion.confianzaScore).toBe(80 - CONFIANZA_PENALTY);
    expect(canal.antifraude.flags).toContain('health:ADMIN_LOST');
    expect(canal.save).toHaveBeenCalled();
    expect(notificationService.enviarNotificacion).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioId: 'owner-id',
        tipo: 'canal_requiere_reverificacion',
        prioridad: 'alta',
      })
    );
  });

  test('token-revoked channel: degraded with TOKEN_REVOKED flag', async () => {
    const canal = makeCanal();
    await applyHealthResult(canal, { ok: false, code: 'TOKEN_REVOKED', message: 'oauth revoked' });
    expect(canal.estado).toBe(REVERIFY_STATE);
    expect(canal.antifraude.flags).toContain('health:TOKEN_REVOKED');
  });

  test('transient failure (rate limited): no state change, no notification', async () => {
    const canal = makeCanal();
    const transition = await applyHealthResult(canal, { ok: false, code: 'RATE_LIMITED', message: '429' });
    expect(transition).toBe('transient');
    expect(canal.estado).toBe('activo');
    expect(canal.save).not.toHaveBeenCalled();
    expect(notificationService.enviarNotificacion).not.toHaveBeenCalled();
  });

  test('transient failure (platform down): no state change', async () => {
    const canal = makeCanal();
    const transition = await applyHealthResult(canal, { ok: false, code: 'PLATFORM_DOWN', message: '502' });
    expect(transition).toBe('transient');
    expect(canal.save).not.toHaveBeenCalled();
  });

  test('confianzaScore never goes negative', async () => {
    const canal = makeCanal({ verificacion: { confianzaScore: 5 } });
    await applyHealthResult(canal, { ok: false, code: 'ADMIN_LOST' });
    expect(canal.verificacion.confianzaScore).toBe(0);
  });

  test('notification failure does NOT roll back state change', async () => {
    notificationService.enviarNotificacion.mockRejectedValueOnce(new Error('email service down'));
    const canal = makeCanal();
    const transition = await applyHealthResult(canal, { ok: false, code: 'ADMIN_LOST' });
    expect(transition).toBe('degraded');
    expect(canal.estado).toBe(REVERIFY_STATE);
    expect(canal.save).toHaveBeenCalled();
  });

  test('does not duplicate flags on repeated failures', async () => {
    const canal = makeCanal({ antifraude: { flags: ['health:ADMIN_LOST'] } });
    await applyHealthResult(canal, { ok: false, code: 'ADMIN_LOST' });
    const count = canal.antifraude.flags.filter((f) => f === 'health:ADMIN_LOST').length;
    expect(count).toBe(1);
  });
});
