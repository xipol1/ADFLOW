/**
 * Discord publish-target selection (gap #4).
 *
 * Onboarding now stores a real TEXT channel id (identificadores.channelId) so
 * ad delivery has a valid target. These tests cover the channel filtering and
 * the default-pick heuristic that seeds it.
 */

const DiscordBot = require('../integraciones/discord');

describe('DiscordBot.pickDefaultPublishChannel', () => {
  test('prefers an announcements/promo channel', () => {
    const channels = [
      { id: '1', name: 'general', position: 0 },
      { id: '2', name: 'anuncios', position: 5 },
    ];
    expect(DiscordBot.pickDefaultPublishChannel(channels).id).toBe('2');
  });

  test('falls back to #general when there is no announcements channel', () => {
    const channels = [
      { id: '1', name: 'random', position: 2 },
      { id: '2', name: 'general', position: 1 },
    ];
    expect(DiscordBot.pickDefaultPublishChannel(channels).id).toBe('2');
  });

  test('falls back to the first (top) channel otherwise', () => {
    const channels = [
      { id: '1', name: 'random', position: 0 },
      { id: '2', name: 'misc', position: 1 },
    ];
    expect(DiscordBot.pickDefaultPublishChannel(channels).id).toBe('1');
  });

  test('returns null for empty / invalid input', () => {
    expect(DiscordBot.pickDefaultPublishChannel([])).toBeNull();
    expect(DiscordBot.pickDefaultPublishChannel(null)).toBeNull();
  });
});

describe('DiscordBot#getPublishableChannels', () => {
  test('keeps only text (0) + announcement (5), sorted by position', async () => {
    const bot = new DiscordBot('token');
    bot.getGuildChannels = async () => ([
      { id: 'a', name: 'voz', type: 2, position: 0 },       // voice — drop
      { id: 'b', name: 'anuncios', type: 5, position: 3 },  // announcement — keep
      { id: 'c', name: 'general', type: 0, position: 1 },   // text — keep
      { id: 'd', name: 'categoria', type: 4, position: 2 }, // category — drop
      { id: 'e', name: 'foro', type: 15, position: 4 },     // forum — drop
    ]);

    const res = await bot.getPublishableChannels('g1');
    expect(res.map((c) => c.id)).toEqual(['c', 'b']);
    expect(res.every((c) => c.type === 0 || c.type === 5)).toBe(true);
  });
});
