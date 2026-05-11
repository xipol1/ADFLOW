/**
 * Platform whitelist enforcement tests.
 *
 * Three layers of defense are tested:
 *   1. lib/platformWhitelist.assertAllowed — pure function
 *   2. models/Canal enum — schema-level validation
 *   3. lib/platformConnectors dispatcher — runtime rejection in verify/fetch/publish
 */

const {
  ALLOWED_PLATFORMS,
  REJECTED_PLATFORMS,
  assertAllowed,
  isAllowed,
  isExplicitlyRejected,
  normalizePlatform,
} = require('../lib/platformWhitelist');

const Canal = require('../models/Canal');
const {
  verifyChannelAccess,
  publishAdToChannel,
  fetchPlatformData,
} = require('../lib/platformConnectors');

describe('platformWhitelist — pure module', () => {
  test('exposes the 7 supported platforms in lowercase', () => {
    expect(ALLOWED_PLATFORMS).toEqual([
      'telegram',
      'discord',
      'whatsapp',
      'instagram',
      'facebook',
      'linkedin',
      'newsletter',
    ]);
  });

  test('youtube/tiktok/twitch are explicitly rejected', () => {
    expect(REJECTED_PLATFORMS).toEqual(['youtube', 'tiktok', 'twitch']);
    expect(isExplicitlyRejected('YouTube')).toBe(true);
    expect(isExplicitlyRejected('tiktok')).toBe(true);
    expect(isExplicitlyRejected(' TWITCH ')).toBe(true);
  });

  test('isAllowed normalises case/whitespace', () => {
    expect(isAllowed('Telegram')).toBe(true);
    expect(isAllowed('  whatsapp  ')).toBe(true);
    expect(isAllowed('TIKTOK')).toBe(false);
    expect(isAllowed('')).toBe(false);
    expect(isAllowed(undefined)).toBe(false);
  });

  test('normalizePlatform trims and lowercases', () => {
    expect(normalizePlatform('  Telegram  ')).toBe('telegram');
    expect(normalizePlatform(null)).toBe('');
  });

  test('assertAllowed returns canonical platform for valid input', () => {
    expect(assertAllowed('Discord')).toBe('discord');
  });

  test('assertAllowed throws PLATFORM_NOT_SUPPORTED for YT/TikTok/Twitch', () => {
    for (const p of ['youtube', 'tiktok', 'twitch']) {
      try {
        assertAllowed(p);
        throw new Error(`expected throw for ${p}`);
      } catch (err) {
        expect(err.code).toBe('PLATFORM_NOT_SUPPORTED');
        expect(err.status).toBe(400);
        expect(err.platform).toBe(p);
      }
    }
  });

  test('assertAllowed throws PLATFORM_UNKNOWN for unknown strings', () => {
    try {
      assertAllowed('myspace');
      throw new Error('expected throw');
    } catch (err) {
      expect(err.code).toBe('PLATFORM_UNKNOWN');
      expect(err.status).toBe(400);
    }
  });
});

describe('Canal schema — plataforma enum', () => {
  test('accepts each whitelisted platform', () => {
    for (const p of ALLOWED_PLATFORMS) {
      const canal = new Canal({ plataforma: p, identificadorCanal: 'x' });
      const err = canal.validateSync();
      // No error on plataforma; other paths may have defaults but shouldn't fail
      expect(err?.errors?.plataforma).toBeUndefined();
    }
  });

  test('rejects youtube/tiktok/twitch', () => {
    for (const p of ['youtube', 'tiktok', 'twitch']) {
      const canal = new Canal({ plataforma: p, identificadorCanal: 'x' });
      const err = canal.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.plataforma).toBeDefined();
    }
  });

  test('rejects arbitrary garbage strings', () => {
    const canal = new Canal({ plataforma: 'pinterest', identificadorCanal: 'x' });
    const err = canal.validateSync();
    expect(err?.errors?.plataforma).toBeDefined();
  });
});

describe('platformConnectors dispatcher — rejection envelopes', () => {
  test('verifyChannelAccess returns PLATFORM_NOT_SUPPORTED for youtube', async () => {
    const result = await verifyChannelAccess({ plataforma: 'youtube', identificadorCanal: 'x' });
    expect(result.valid).toBe(false);
    expect(result.code).toBe('PLATFORM_NOT_SUPPORTED');
  });

  test('verifyChannelAccess returns PLATFORM_NOT_SUPPORTED for unknown platform', async () => {
    const result = await verifyChannelAccess({ plataforma: 'myspace', identificadorCanal: 'x' });
    expect(result.valid).toBe(false);
    expect(result.code).toBe('PLATFORM_NOT_SUPPORTED');
  });

  test('publishAdToChannel throws for tiktok', async () => {
    await expect(
      publishAdToChannel({ plataforma: 'tiktok', identificadorCanal: 'x' }, 'content', 'https://x')
    ).rejects.toThrow(/no soportada/i);
  });

  test('fetchPlatformData throws (no silent estimator fallback) for twitch', async () => {
    await expect(
      fetchPlatformData({ plataforma: 'twitch', identificadorCanal: 'x', estadisticas: { seguidores: 1000 } })
    ).rejects.toMatchObject({ code: 'PLATFORM_NOT_SUPPORTED' });
  });
});
