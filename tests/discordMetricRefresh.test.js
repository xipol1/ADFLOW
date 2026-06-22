/**
 * Discord metric-refresh wiring (gap #3).
 *
 * `fetchDiscordApiMetrics` is the bridge that lets the daily multiplatform-intel
 * cron pull REAL guild metrics (members/online/boost) for onboarded Discord
 * channels via the bot API, instead of the fragile iGrupos name-match. These
 * tests lock in the guildId/token resolution and the fail-soft null fallback.
 */

const mockFetchGuildMetrics = jest.fn();

jest.mock('../integraciones/discord', () =>
  jest.fn().mockImplementation((token) => ({
    _token: token,
    fetchGuildMetrics: (guildId) => mockFetchGuildMetrics(guildId),
  })),
);

const { fetchDiscordApiMetrics } = require('../services/multiplatformIntelService');

describe('fetchDiscordApiMetrics', () => {
  beforeEach(() => {
    mockFetchGuildMetrics.mockReset();
    delete process.env.DISCORD_BOT_TOKEN;
  });

  test('returns null (and skips the API) when there is no guildId', async () => {
    const canal = { botConfig: { discord: { botToken: 't' } }, identificadores: {} };
    expect(await fetchDiscordApiMetrics(canal)).toBeNull();
    expect(mockFetchGuildMetrics).not.toHaveBeenCalled();
  });

  test('returns null when a guildId exists but no bot token is available', async () => {
    const canal = { botConfig: { discord: { guildId: 'g1' } }, identificadores: {} };
    expect(await fetchDiscordApiMetrics(canal)).toBeNull();
    expect(mockFetchGuildMetrics).not.toHaveBeenCalled();
  });

  test('uses the authoritative botConfig.discord.guildId and returns metrics', async () => {
    mockFetchGuildMetrics.mockResolvedValue({ seguidores: 1234, onlineAhora: 200 });
    const canal = { botConfig: { discord: { guildId: 'g1', botToken: 't' } } };

    const metrics = await fetchDiscordApiMetrics(canal);
    expect(mockFetchGuildMetrics).toHaveBeenCalledWith('g1');
    expect(metrics).toEqual({ seguidores: 1234, onlineAhora: 200 });
  });

  test('falls back to identificadores.serverId and the env bot token', async () => {
    process.env.DISCORD_BOT_TOKEN = 'env-token';
    mockFetchGuildMetrics.mockResolvedValue({ seguidores: 9 });
    const canal = { botConfig: { discord: {} }, identificadores: { serverId: 's2' } };

    const metrics = await fetchDiscordApiMetrics(canal);
    expect(mockFetchGuildMetrics).toHaveBeenCalledWith('s2');
    expect(metrics.seguidores).toBe(9);
  });

  test('propagates API errors so the caller can fall back (bot kicked / rate-limited)', async () => {
    mockFetchGuildMetrics.mockRejectedValue(new Error('Bot no está en el servidor'));
    const canal = { botConfig: { discord: { guildId: 'g1', botToken: 't' } } };
    await expect(fetchDiscordApiMetrics(canal)).rejects.toThrow('Bot no está en el servidor');
  });
});
