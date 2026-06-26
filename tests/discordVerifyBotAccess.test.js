/**
 * Regression for the bot-access verification endpoint (code 50035).
 *
 * verifyBotAccessNew used `GET /guilds/{id}/members/@me`, which Discord rejects
 * for bots ("Invalid Form Body", 50035). The alternative
 * `/users/@me/guilds/{id}/member` refuses bots (20001). The bot's own member
 * must be fetched by its REAL user id: `/guilds/{id}/members/{botUserId}`.
 *
 * This bug silently broke Discord onboarding activation (onboardingController
 * discordVerify) and the daily health check (channelHealthService) against the
 * live API — the pre-existing tests never caught it because they mock _req /
 * verifyBotAccess wholesale.
 */

const DiscordBot = require('../integraciones/discord');

const VIEW = BigInt(1) << BigInt(10);
const SEND = BigInt(1) << BigInt(11);

describe('DiscordBot.verifyBotAccessNew — endpoint correctness', () => {
  test('fetches the bot member via /guilds/{id}/members/{botUserId}, never @me', async () => {
    const bot = new DiscordBot('fake.token.value');
    const calls = [];

    bot._req = jest.fn(async (method, p) => {
      calls.push(p);
      if (p === '/users/@me') return { id: 'BOTID123' };
      if (p.includes('?with_counts')) {
        return { name: 'G', approximate_member_count: 10, approximate_presence_count: 5 };
      }
      if (/\/guilds\/[^/]+\/members\//.test(p)) return { roles: ['role-1'] };
      if (/\/guilds\/[^/]+\/roles$/.test(p)) {
        return [
          { id: 'GUILD', permissions: '0' },
          { id: 'role-1', permissions: (VIEW | SEND).toString() },
        ];
      }
      return {};
    });

    const res = await bot.verifyBotAccessNew('GUILD');

    expect(calls).toContain('/guilds/GUILD/members/BOTID123');
    expect(calls.some((p) => p.includes('/members/@me'))).toBe(false);
    expect(res.isPresent).toBe(true);
    expect(res.canViewChannels).toBe(true);
    expect(res.canSendMessages).toBe(true);
  });

  test('resolves the bot user id only once (cached on the instance)', async () => {
    const bot = new DiscordBot('fake.token');
    let meCalls = 0;
    bot._req = jest.fn(async (method, p) => {
      if (p === '/users/@me') { meCalls += 1; return { id: 'BID' }; }
      if (p.includes('?with_counts')) return { name: 'G' };
      if (/\/members\//.test(p)) return { roles: [] };
      if (/\/roles$/.test(p)) return [{ id: 'G', permissions: '0' }];
      return {};
    });

    await bot.verifyBotAccessNew('G');
    await bot.verifyBotAccessNew('G');
    expect(meCalls).toBe(1);
  });
});
