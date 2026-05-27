/**
 * Unit tests para los analyzers de la calculadora.
 *
 * NO pegan a redes externas — usan global fetch mockeado. Los HTMLs de muestra
 * son recortes mínimos pero realistas del shape que devuelven Telegram /
 * Substack en producción.
 */

// El platformDetector es pure, sin I/O — test directo.
const { detectPlatform, normalizeUrl } = require('../services/calculatorAnalyzer/platformDetector');
const telegramAnalyzer  = require('../services/calculatorAnalyzer/telegramAnalyzer');
const discordAnalyzer   = require('../services/calculatorAnalyzer/discordAnalyzer');
const newsletterAnalyzer = require('../services/calculatorAnalyzer/newsletterAnalyzer');

// ─── platformDetector ───────────────────────────────────────────────────────
describe('platformDetector', () => {
  test('detects telegram public channel', () => {
    expect(detectPlatform('https://t.me/durov')).toMatchObject({
      platform: 'telegram',
      externalId: 'durov',
    });
    expect(detectPlatform('https://www.t.me/cool_channel')).toMatchObject({
      platform: 'telegram',
      externalId: 'cool_channel',
    });
  });

  test('detects telegram invite (private)', () => {
    expect(detectPlatform('https://t.me/+abc123xyz')).toMatchObject({
      platform: 'telegram_invite',
      externalId: 'abc123xyz',
    });
  });

  test('detects whatsapp channel newsletter', () => {
    expect(detectPlatform('https://whatsapp.com/channel/0029Va123456')).toMatchObject({
      platform: 'whatsapp_channel',
      externalId: '0029Va123456',
    });
  });

  test('detects whatsapp group', () => {
    expect(detectPlatform('https://chat.whatsapp.com/AbCdEf012345')).toMatchObject({
      platform: 'whatsapp_group',
      externalId: 'AbCdEf012345',
    });
  });

  test('detects discord invite', () => {
    expect(detectPlatform('https://discord.gg/python')).toMatchObject({
      platform: 'discord',
      externalId: 'python',
    });
    expect(detectPlatform('https://discord.com/invite/python')).toMatchObject({
      platform: 'discord',
      externalId: 'python',
    });
  });

  test('detects substack', () => {
    expect(detectPlatform('https://example.substack.com')).toMatchObject({
      platform: 'newsletter',
      subtype: 'substack',
      externalId: 'example',
    });
  });

  test('detects beehiiv', () => {
    expect(detectPlatform('https://example.beehiiv.com/p/post-slug')).toMatchObject({
      platform: 'newsletter',
      subtype: 'beehiiv',
      externalId: 'example',
    });
  });

  test('returns null for unsupported url (instagram)', () => {
    expect(detectPlatform('https://instagram.com/whatever')).toBeNull();
  });

  test('returns null for invalid url', () => {
    expect(detectPlatform('not-a-url')).toBeNull();
    expect(detectPlatform('')).toBeNull();
    expect(detectPlatform(null)).toBeNull();
  });

  test('normalizeUrl strips UTM and tracking params', () => {
    const out = normalizeUrl('https://t.me/durov?utm_source=facebook&utm_medium=cpc&fbclid=abc123');
    expect(out).toBe('https://t.me/durov');
  });

  test('normalizeUrl lowercases hostname', () => {
    const out = normalizeUrl('https://T.ME/Durov');
    expect(out).toMatch(/^https:\/\/t\.me/);
  });
});

// ─── telegramAnalyzer (mocking global fetch) ────────────────────────────────
describe('telegramAnalyzer', () => {
  let originalFetch;
  beforeEach(() => { originalFetch = global.fetch; });
  afterEach(()  => { global.fetch = originalFetch; });

  test('parses public channel HTML with subscribers', async () => {
    const html = `<html><head>
      <meta property="og:title" content="Pavel Durov" />
      <meta property="og:description" content="Founder of Telegram" />
      <meta property="og:image" content="https://cdn.cdn-telegram.org/photo.jpg" />
      </head><body>
      <div class="tgme_page_extra">8 542 subscribers, 24 photos, 102 videos</div>
      </body></html>`;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => html,
    });

    const res = await telegramAnalyzer.analyze({ externalId: 'durov' });
    expect(res.status).toBe('ok');
    expect(res.data.name).toBe('Pavel Durov');
    expect(res.data.subscribers).toBe(8542);
    expect(res.data.description).toMatch(/Telegram/);
    expect(res.data.profileImage).toMatch(/photo\.jpg/);
  });

  test('returns partial when subscribers cannot be parsed', async () => {
    const html = '<html><head><meta property="og:title" content="Some Bot"></head><body></body></html>';
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => html });

    const res = await telegramAnalyzer.analyze({ externalId: 'somebot' });
    expect(res.status).toBe('partial');
    expect(res.data.subscribers).toBeNull();
  });

  test('returns not_found when HTTP 404', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, text: async () => '' });
    const res = await telegramAnalyzer.analyze({ externalId: 'nonexistent' });
    expect(res.status).toBe('not_found');
  });

  test('returns failed when network throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNRESET'));
    const res = await telegramAnalyzer.analyze({ externalId: 'durov' });
    expect(res.status).toBe('failed');
  });

  test('handles HTML with NBSP separator in subscriber count', () => {
    // Telegram usa NBSP ( ) entre dígitos para miles
    const html = '<div class="tgme_page_extra">12 345 subscribers</div>';
    const subs = telegramAnalyzer._extractSubscribers(html);
    expect(subs).toBe(12345);
  });

  test('rejects empty externalId', async () => {
    const res = await telegramAnalyzer.analyze({ externalId: '' });
    expect(res.status).toBe('failed');
  });
});

// ─── discordAnalyzer ────────────────────────────────────────────────────────
describe('discordAnalyzer', () => {
  let originalFetch;
  beforeEach(() => { originalFetch = global.fetch; });
  afterEach(()  => { global.fetch = originalFetch; });

  test('parses Discord invite API response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        approximate_member_count:   12345,
        approximate_presence_count: 1234,
        guild: {
          id: '123456',
          name: 'Python Discord',
          description: 'The biggest Python community',
          icon: 'iconhash',
          features: ['VERIFIED', 'COMMUNITY'],
          premium_tier: 3,
          verification_level: 4,
        },
      }),
    });

    const res = await discordAnalyzer.analyze({ externalId: 'python' });
    expect(res.status).toBe('ok');
    expect(res.data.name).toBe('Python Discord');
    expect(res.data.subscribers).toBe(12345);
    expect(res.data.onlineCount).toBe(1234);
    expect(res.data.verified).toBe(true);
    expect(res.data.profileImage).toMatch(/cdn\.discordapp\.com\/icons\/123456/);
  });

  test('marks PARTNERED as verified', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        approximate_member_count: 100,
        guild: { id: '1', name: 'Partner Server', features: ['PARTNERED'] },
      }),
    });
    const res = await discordAnalyzer.analyze({ externalId: 'abc' });
    expect(res.data.verified).toBe(true);
  });

  test('returns not_found on 404 (expired invite)', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });
    const res = await discordAnalyzer.analyze({ externalId: 'expired' });
    expect(res.status).toBe('not_found');
  });

  test('returns failed on other HTTP errors', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });
    const res = await discordAnalyzer.analyze({ externalId: 'whatever' });
    expect(res.status).toBe('failed');
  });

  test('handles missing guild gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ approximate_member_count: 100 }), // no guild key
    });
    const res = await discordAnalyzer.analyze({ externalId: 'no-guild' });
    expect(res.status).toBe('partial');
  });
});

// ─── newsletterAnalyzer ─────────────────────────────────────────────────────
describe('newsletterAnalyzer', () => {
  let originalFetch;
  beforeEach(() => { originalFetch = global.fetch; });
  afterEach(()  => { global.fetch = originalFetch; });

  test('extracts substack subscribers from preloaded JSON', () => {
    const html = '<html>...<script>"free_subscriber_count":12345</script>...</html>';
    expect(newsletterAnalyzer._extractSubstackSubs(html)).toBe(12345);
  });

  test('extracts substack subscribers from "Join N subscribers"', () => {
    const html = '<p>Join 8,420 subscribers</p>';
    expect(newsletterAnalyzer._extractSubstackSubs(html)).toBe(8420);
  });

  test('returns null when substack does not expose subs', () => {
    const html = '<html><body>Random content with no numbers.</body></html>';
    expect(newsletterAnalyzer._extractSubstackSubs(html)).toBeNull();
  });

  test('parses substack HTML end-to-end', async () => {
    const html = `<html><head>
      <meta property="og:title" content="The Pragmatic Engineer" />
      <meta property="og:description" content="Software engineering at scale" />
      <meta property="og:image" content="https://substackcdn.com/cover.jpg" />
      </head><body>
      <script>"free_subscriber_count":650000</script>
      </body></html>`;
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => html });

    const res = await newsletterAnalyzer.analyze({
      externalId: 'pragmaticengineer',
      normalizedUrl: 'https://pragmaticengineer.substack.com',
      subtype: 'substack',
    });
    expect(res.status).toBe('ok');
    expect(res.data.subscribers).toBe(650000);
    expect(res.data.name).toBe('The Pragmatic Engineer');
  });

  test('returns partial for Beehiiv (subs usually not public)', async () => {
    const html = '<html><head><meta property="og:title" content="Some Beehiiv" /></head><body>No counts here.</body></html>';
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => html });

    const res = await newsletterAnalyzer.analyze({
      externalId: 'somebeehiiv',
      normalizedUrl: 'https://somebeehiiv.beehiiv.com',
      subtype: 'beehiiv',
    });
    expect(res.status).toBe('partial');
    expect(res.data.subscribers).toBeNull();
  });
});
