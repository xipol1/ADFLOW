/**
 * sanitizeChannelName — turns a poisoned Canal.nombreCanal into a clean
 * display name.
 *
 * Regression guard for the marketplace/rankings bug where WhatsApp channels
 * rendered raw "<img width=...>" markup as their title. The old wachannelsfinder
 * scraper read a lazy-load <noscript><img></noscript> as the channel name and
 * stored the literal tag; the scraper is now hardened but old rows persist, so
 * the API must sanitise on the way out and the cleanup migration must re-derive
 * a name from the slug. The values below mirror the real poisoned names seen in
 * production (e.g. @wa:unops-official, @wa:rahul-mann).
 */
const { sanitizeChannelName, looksPolluted, nameFromSlug } = require('../lib/channelName');

describe('sanitizeChannelName', () => {
  test('replaces a complete leaked <img> tag with the humanised slug', () => {
    const poisoned = '<img width="259" height="194" src="https://wachannelsfinder.com/avatar.png" alt="unops">';
    expect(sanitizeChannelName(poisoned, 'wa:unops-official')).toBe('Unops Official');
  });

  test('handles a TRUNCATED tag (120-char slice cut off before the closing ">")', () => {
    const truncated = '<img width="300" height="200" src="https://wachannelsfinder.com/very/long/avatar/path/that/got/cut';
    expect(sanitizeChannelName(truncated, 'wa:rahul-mann')).toBe('Rahul Mann');
  });

  test('strips the wa: prefix and leading @ from the slug fallback', () => {
    expect(sanitizeChannelName('<img>', '@wa:m-j-associates-bhiwadi')).toBe('M J Associates Bhiwadi');
  });

  test('keeps a clean human name untouched', () => {
    expect(sanitizeChannelName('Crypto Alpha Signals', 'tg:cryptoalpha')).toBe('Crypto Alpha Signals');
  });

  test('keeps a clean name even when no identifier is given', () => {
    expect(sanitizeChannelName('Finanzas Para Todos', '')).toBe('Finanzas Para Todos');
  });

  test('falls back to the slug for a bare URL name', () => {
    expect(sanitizeChannelName('https://wachannelsfinder.com/channels/foo', 'wa:shopping-loot-offers')).toBe('Shopping Loot Offers');
  });

  test('falls back to the slug for a bare image-filename name', () => {
    expect(sanitizeChannelName('avatar.png', 'wa:letsgrowmore')).toBe('Letsgrowmore');
  });

  test('does NOT treat a legit name containing "png" as an image filename', () => {
    expect(sanitizeChannelName('My PNG Design Group', 'wa:png-group')).toBe('My PNG Design Group');
  });

  test('returns the salvaged raw when both name and slug are unusable', () => {
    expect(sanitizeChannelName('Real Name', '')).toBe('Real Name');
  });

  test('returns empty string when nothing is usable', () => {
    expect(sanitizeChannelName('<img>', '')).toBe('');
    expect(sanitizeChannelName('', '')).toBe('');
    expect(sanitizeChannelName(null, null)).toBe('');
  });
});

describe('looksPolluted', () => {
  test('flags markup, urls and image filenames', () => {
    expect(looksPolluted('<img src="x">')).toBe(true);
    expect(looksPolluted('<img width="300"')).toBe(true); // truncated, no closing >
    expect(looksPolluted('https://example.com/a')).toBe(true);
    expect(looksPolluted('avatar.webp')).toBe(true);
  });

  test('does not flag clean names', () => {
    expect(looksPolluted('Crypto Alpha')).toBe(false);
    expect(looksPolluted('My PNG Channel')).toBe(false); // has a space → not a filename
    expect(looksPolluted('')).toBe(false);
  });
});

describe('nameFromSlug', () => {
  test('humanises a wa: slug', () => {
    expect(nameFromSlug('wa:led-tv-spares-sb')).toBe('Led Tv Spares Sb');
  });
  test('handles bare slugs and leading @', () => {
    expect(nameFromSlug('@beginners-group-notify')).toBe('Beginners Group Notify');
  });
  test('decodes percent-encoded emojis instead of mangling the hex', () => {
    // %f0%9f%92%af = 💯, %f0%9f%94%a5 = 🔥
    expect(nameFromSlug('wa:beginners-group-notifications-%f0%9f%92%af%f0%9f%94%a5'))
      .toBe('Beginners Group Notifications 💯🔥');
  });
  test('leaves a malformed lone % untouched (no throw)', () => {
    expect(nameFromSlug('wa:50%-off-deals')).toBe('50% Off Deals');
  });
});
