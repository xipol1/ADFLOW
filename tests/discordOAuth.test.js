/**
 * Discord OAuth2 ownership-proof helpers.
 *
 * Covers the pure functions behind the "prove the user is admin/owner of the
 * guild" flow added to the onboarding wizard:
 *   - generateOAuthUrl  → builds the `identify guilds` authorize URL
 *   - userControlsGuild → owner OR ADMINISTRATOR/MANAGE_GUILD permission bit
 *
 * The signed-token verification in onboardingController.discordVerify is the
 * real security gate; these helpers feed it the candidate guild set.
 */

const DiscordBot = require('../integraciones/discord');

describe('DiscordBot.generateOAuthUrl', () => {
  const base = {
    clientId: '123456789',
    redirectUri: 'https://api.example.com/api/onboarding/discord/callback',
    state: 'abc.state.token',
  };

  test('targets the Discord authorize endpoint', () => {
    const url = new URL(DiscordBot.generateOAuthUrl(base));
    expect(url.origin + url.pathname).toBe('https://discord.com/api/oauth2/authorize');
  });

  test('requests exactly the identify + guilds scopes (read-only)', () => {
    const url = new URL(DiscordBot.generateOAuthUrl(base));
    expect(url.searchParams.get('scope')).toBe('identify guilds');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe(base.clientId);
    expect(url.searchParams.get('redirect_uri')).toBe(base.redirectUri);
    expect(url.searchParams.get('state')).toBe(base.state);
  });

  test('does NOT request a bot scope (no extra grants to the bot)', () => {
    const url = new URL(DiscordBot.generateOAuthUrl(base));
    expect(url.searchParams.get('scope')).not.toMatch(/bot/);
  });
});

describe('DiscordBot.userControlsGuild', () => {
  const ADMINISTRATOR = (BigInt(1) << BigInt(3)).toString(); // 0x8
  const MANAGE_GUILD = (BigInt(1) << BigInt(5)).toString();  // 0x20
  const SEND_MESSAGES = (BigInt(1) << BigInt(11)).toString(); // unrelated

  test('true when the user owns the guild', () => {
    expect(DiscordBot.userControlsGuild({ owner: true, permissions: '0' })).toBe(true);
  });

  test('true when the user has ADMINISTRATOR', () => {
    expect(DiscordBot.userControlsGuild({ owner: false, permissions: ADMINISTRATOR })).toBe(true);
  });

  test('true when the user has MANAGE_GUILD', () => {
    expect(DiscordBot.userControlsGuild({ owner: false, permissions: MANAGE_GUILD })).toBe(true);
  });

  test('false for a plain member without admin/manage perms', () => {
    expect(DiscordBot.userControlsGuild({ owner: false, permissions: SEND_MESSAGES })).toBe(false);
  });

  test('false for malformed / missing input (fail-closed)', () => {
    expect(DiscordBot.userControlsGuild(null)).toBe(false);
    expect(DiscordBot.userControlsGuild({})).toBe(false);
    expect(DiscordBot.userControlsGuild({ owner: false, permissions: 'not-a-number' })).toBe(false);
  });
});
