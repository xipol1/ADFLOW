/**
 * Discord health-check access resolution (gap #5).
 *
 * The channel-health cron calls verifyChannelAccess() on every active channel.
 * Wizard-onboarded Discord channels carry the shared bot token in
 * botConfig.discord (not credenciales); before the fix, verifyChannelAccess
 * read the token only from credenciales and returned "Credenciales incompletas"
 * for every healthy wizard channel, which the health check would then DEGRADE
 * to pendiente_reverificacion. These tests lock in the corrected resolution.
 */

const mockVerifyBotAccess = jest.fn();

jest.mock('../integraciones/discord', () =>
  jest.fn().mockImplementation(() => ({ verifyBotAccess: mockVerifyBotAccess })),
);

const { verifyChannelAccess } = require('../lib/platformConnectors');

describe('verifyChannelAccess — discord', () => {
  beforeEach(() => {
    mockVerifyBotAccess.mockReset();
    delete process.env.DISCORD_BOT_TOKEN;
  });

  test('wizard channel (token in botConfig.discord) verifies — not falsely incomplete', async () => {
    mockVerifyBotAccess.mockResolvedValue({ valid: true });
    const channel = {
      plataforma: 'discord',
      credenciales: {},
      botConfig: { discord: { botToken: 'shared-bot', guildId: 'g1' } },
      identificadores: { serverId: 'g1' },
    };

    const res = await verifyChannelAccess(channel);
    expect(mockVerifyBotAccess).toHaveBeenCalledWith('g1');
    expect(res.valid).toBe(true);
  });

  test('falls back to the env bot token when neither creds nor botConfig has one', async () => {
    process.env.DISCORD_BOT_TOKEN = 'env-bot';
    mockVerifyBotAccess.mockResolvedValue({ valid: true });
    const channel = {
      plataforma: 'discord',
      credenciales: {},
      identificadores: { serverId: 'g2' },
    };

    const res = await verifyChannelAccess(channel);
    expect(mockVerifyBotAccess).toHaveBeenCalledWith('g2');
    expect(res.valid).toBe(true);
  });

  test('missing shared bot token → transient PLATFORM_DOWN (does not degrade the owner)', async () => {
    const channel = { plataforma: 'discord', credenciales: {}, identificadores: { serverId: 'g3' } };
    const res = await verifyChannelAccess(channel);
    expect(res.valid).toBe(false);
    expect(res.code).toBe('PLATFORM_DOWN');
    expect(mockVerifyBotAccess).not.toHaveBeenCalled();
  });

  test('kicked bot propagates the rejection so the health check degrades + notifies', async () => {
    process.env.DISCORD_BOT_TOKEN = 'env-bot';
    mockVerifyBotAccess.mockResolvedValue({ valid: false, isPresent: false, error: 'El bot no es miembro del servidor.' });
    const channel = { plataforma: 'discord', credenciales: {}, botConfig: { discord: { guildId: 'g4' } } };

    const res = await verifyChannelAccess(channel);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/no es miembro/);
  });
});
