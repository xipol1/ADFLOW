/**
 * channelMessageMapper tests.
 *
 * Pure unit tests — no DB, no socket, no network. Fixtures are derived
 * from real Baileys 7.0.0-rc.9 envelopes captured by scripts/probe-channel-baileys.js
 * plus synthetic ones for variants we haven't observed live yet.
 */

const {
  detectType,
  extractBody,
  extractLinks,
  extractContextInfo,
  normalizeBodyForHash,
  computeBodyHash,
  mapBaileysToObservation,
  mapMetadataToSnapshot,
} = require('../services/baileys/channelMessageMapper');

const SANDBOX_JID = '120363423838140981@newsletter';

// ─── Fixtures ─────────────────────────────────────────────────────────────
// Real envelope captured live (text + link). server_id=110 was observed.
function textPostFixture() {
  return {
    key: {
      remoteJid: SANDBOX_JID,
      fromMe: false,
      id: '3EB0E102B6B79B9D16AAF4',
      participant: '',
      addressingMode: 'pn',
      server_id: '110',
    },
    messageTimestamp: 1778677968,
    broadcast: false,
    message: {
      extendedTextMessage: {
        text: '*Análisis técnico — EURUSD diario* 📈\n\nEstructura alcista intacta tras el rebote de ayer en 1,0820 🔥\nNiveles: https://channelad.io',
        matchedText: 'https://channelad.io',
        description: '',
        title: 'Channelad — Publicidad en comunidades',
        previewType: 0,
        jpegThumbnail: Buffer.from([0xff, 0xd8, 0xff, 0xe0]), // tiny JPEG header
        thumbnailHeight: 1024,
        thumbnailWidth: 1024,
      },
      messageContextInfo: { threadId: [] },
    },
  };
}

function imagePostFixture() {
  return {
    key: {
      remoteJid: SANDBOX_JID,
      fromMe: false,
      id: 'AAAA1111BBBB2222CCCC3333',
      participant: '',
      addressingMode: 'pn',
      server_id: '111',
    },
    messageTimestamp: 1778678100,
    broadcast: false,
    message: {
      imageMessage: {
        mimetype: 'image/jpeg',
        directPath: '/v/t62.../enc?...',
        fileSha256: Buffer.alloc(32, 1),
        fileLength: 145823,
        width: 1080,
        height: 1350,
        caption: 'Setup del día 📈 entrada 1,0820',
        jpegThumbnail: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
        contextInfo: { isForwarded: false },
      },
    },
  };
}

function pollPostFixture() {
  return {
    key: {
      remoteJid: SANDBOX_JID,
      fromMe: false,
      id: 'POLL1111POLL2222',
      participant: '',
      addressingMode: 'pn',
      server_id: '112',
    },
    messageTimestamp: 1778678200,
    message: {
      pollCreationMessageV3: {
        name: '¿Mejor entrada hoy?',
        options: [
          { optionName: 'Long EURUSD' },
          { optionName: 'Short USDJPY' },
          { optionName: 'Espero confirmación' },
        ],
        selectableOptionsCount: 1,
      },
    },
  };
}

function forwardedTextFixture() {
  return {
    key: {
      remoteJid: SANDBOX_JID,
      fromMe: false,
      id: 'FWD1111',
      addressingMode: 'pn',
      server_id: '113',
    },
    messageTimestamp: 1778678300,
    message: {
      extendedTextMessage: {
        text: 'Mira esta noticia que circula',
        contextInfo: { isForwarded: true, forwardingScore: 5 },
      },
    },
  };
}

function plainConversationFixture() {
  return {
    key: { remoteJid: SANDBOX_JID, fromMe: false, id: 'PLAIN1', server_id: '114' },
    messageTimestamp: 1778678400,
    message: { conversation: 'Buenos días' },
  };
}

// ─── detectType ───────────────────────────────────────────────────────────
describe('detectType', () => {
  test('extendedTextMessage → text', () => {
    const r = detectType(textPostFixture().message);
    expect(r.type).toBe('text');
    expect(r.variantKey).toBe('extendedTextMessage');
  });

  test('conversation → text', () => {
    const r = detectType(plainConversationFixture().message);
    expect(r.type).toBe('text');
    expect(r.variantKey).toBe('conversation');
  });

  test('imageMessage → image', () => {
    expect(detectType(imagePostFixture().message).type).toBe('image');
  });

  test('pollCreationMessageV3 → poll', () => {
    expect(detectType(pollPostFixture().message).type).toBe('poll');
  });

  test('empty message → unknown', () => {
    expect(detectType({}).type).toBe('unknown');
    expect(detectType(null).type).toBe('unknown');
  });
});

// ─── extractBody ──────────────────────────────────────────────────────────
describe('extractBody', () => {
  test('extendedTextMessage uses .text', () => {
    const m = textPostFixture().message;
    expect(extractBody('extendedTextMessage', m.extendedTextMessage)).toContain('Análisis técnico');
  });

  test('conversation uses string directly', () => {
    expect(extractBody('conversation', 'Hola')).toBe('Hola');
  });

  test('imageMessage uses .caption', () => {
    const m = imagePostFixture().message;
    expect(extractBody('imageMessage', m.imageMessage)).toBe('Setup del día 📈 entrada 1,0820');
  });

  test('pollCreationMessage uses .name', () => {
    const m = pollPostFixture().message;
    expect(extractBody('pollCreationMessageV3', m.pollCreationMessageV3)).toBe('¿Mejor entrada hoy?');
  });

  test('audioMessage returns empty (no body)', () => {
    expect(extractBody('audioMessage', { seconds: 30 })).toBe('');
  });
});

// ─── extractLinks ─────────────────────────────────────────────────────────
describe('extractLinks', () => {
  test('captures Baileys matchedText with full preview metadata', () => {
    const m = textPostFixture().message;
    const links = extractLinks('extendedTextMessage', m.extendedTextMessage, m.extendedTextMessage.text);
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      url: 'https://channelad.io',
      domain: 'channelad.io',
      title: 'Channelad — Publicidad en comunidades',
      previewType: 0,
    });
  });

  test('regex catches additional URLs beyond the previewed one', () => {
    const body = 'Mirá https://example.com/a y https://example.com/b';
    const links = extractLinks('extendedTextMessage', { matchedText: 'https://example.com/a', title: 'A' }, body);
    expect(links).toHaveLength(2);
    expect(links.map((l) => l.url)).toEqual([
      'https://example.com/a',
      'https://example.com/b',
    ]);
  });

  test('strips trailing punctuation from URL', () => {
    const body = 'Lee esto: https://example.com/articulo.';
    const links = extractLinks('conversation', 'Lee esto: ...', body);
    expect(links[0].url).toBe('https://example.com/articulo');
  });

  test('returns empty for body without URLs', () => {
    expect(extractLinks('conversation', 'Hola', 'Hola')).toEqual([]);
  });
});

// ─── extractContextInfo ───────────────────────────────────────────────────
describe('extractContextInfo', () => {
  test('isForwarded + forwardingScore from contextInfo', () => {
    const m = forwardedTextFixture().message.extendedTextMessage;
    expect(extractContextInfo(m)).toEqual({ isForwarded: true, forwardingScore: 5 });
  });

  test('defaults when no contextInfo', () => {
    expect(extractContextInfo({})).toEqual({ isForwarded: false, forwardingScore: 0 });
  });
});

// ─── normalizeBodyForHash + computeBodyHash ───────────────────────────────
describe('body hashing', () => {
  test('whitespace normalization', () => {
    expect(normalizeBodyForHash('  Hello   World  ')).toBe('hello world');
    expect(normalizeBodyForHash('Hello\n\nWorld')).toBe('hello world');
  });

  test('case insensitive', () => {
    expect(normalizeBodyForHash('HELLO')).toBe(normalizeBodyForHash('hello'));
  });

  test('emoji preserved in hash (brand voice signal)', () => {
    const a = computeBodyHash('Buenos días 📈');
    const b = computeBodyHash('Buenos días');
    expect(a).not.toBe(b);
  });

  test('empty body returns null hash', () => {
    expect(computeBodyHash('')).toBeNull();
    expect(computeBodyHash(null)).toBeNull();
  });

  test('identical normalized content produces identical hash', () => {
    const a = computeBodyHash('  Hello   World  ');
    const b = computeBodyHash('hello world');
    expect(a).toBe(b);
  });
});

// ─── mapBaileysToObservation ──────────────────────────────────────────────
describe('mapBaileysToObservation', () => {
  const canalId = '507f1f77bcf86cd799439011';

  test('maps a text+link envelope to a complete observation', () => {
    const obs = mapBaileysToObservation({
      canalId,
      channelJid: SANDBOX_JID,
      baileysMsg: textPostFixture(),
    });
    expect(obs).toMatchObject({
      canalId,
      channelJid: SANDBOX_JID,
      messageId: '3EB0E102B6B79B9D16AAF4',
      serverId: 110,
      addressingMode: 'pn',
      fromMe: false,
      type: 'text',
      isForwarded: false,
      forwardingScore: 0,
      source: 'realtime',
    });
    expect(obs.bodyLength).toBeGreaterThan(0);
    expect(obs.bodyHash).toMatch(/^[0-9a-f]{64}$/);
    expect(obs.links).toHaveLength(1);
    expect(obs.publishedAt).toBeInstanceOf(Date);
    expect(obs.publishedAt.getTime()).toBe(1778677968 * 1000);
    expect(obs.rawTtlExpiresAt).toBeInstanceOf(Date);
  });

  test('privacy guard — drops envelopes from wrong jid', () => {
    const wrong = textPostFixture();
    wrong.key.remoteJid = '34674709388@s.whatsapp.net'; // private DM
    const obs = mapBaileysToObservation({
      canalId,
      channelJid: SANDBOX_JID,
      baileysMsg: wrong,
    });
    expect(obs).toBeNull();
  });

  test('image post produces media subdoc', () => {
    const obs = mapBaileysToObservation({
      canalId,
      channelJid: SANDBOX_JID,
      baileysMsg: imagePostFixture(),
    });
    expect(obs.type).toBe('image');
    expect(obs.media).toMatchObject({
      mimeType: 'image/jpeg',
      width: 1080,
      height: 1350,
      caption: 'Setup del día 📈 entrada 1,0820',
      fileLength: 145823,
    });
    expect(obs.body).toBe('Setup del día 📈 entrada 1,0820'); // body == caption
    expect(obs.media.thumbnailB64).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  test('poll envelope produces poll subdoc with options', () => {
    const obs = mapBaileysToObservation({
      canalId,
      channelJid: SANDBOX_JID,
      baileysMsg: pollPostFixture(),
    });
    expect(obs.type).toBe('poll');
    expect(obs.poll.name).toBe('¿Mejor entrada hoy?');
    expect(obs.poll.options).toHaveLength(3);
    expect(obs.poll.options[0].name).toBe('Long EURUSD');
    expect(obs.poll.selectableOptionsCount).toBe(1);
  });

  test('forwarded flag is propagated', () => {
    const obs = mapBaileysToObservation({
      canalId,
      channelJid: SANDBOX_JID,
      baileysMsg: forwardedTextFixture(),
    });
    expect(obs.isForwarded).toBe(true);
    expect(obs.forwardingScore).toBe(5);
  });

  test('storeRaw=false omits raw payload', () => {
    const obs = mapBaileysToObservation({
      canalId,
      channelJid: SANDBOX_JID,
      baileysMsg: textPostFixture(),
      storeRaw: false,
    });
    expect(obs.raw).toBeNull();
    expect(obs.rawTtlExpiresAt).toBeNull();
  });

  test('null baileysMsg returns null', () => {
    expect(mapBaileysToObservation({ canalId, channelJid: SANDBOX_JID, baileysMsg: null })).toBeNull();
  });

  test('envelope with no .message returns null (e.g. tombstone events)', () => {
    expect(
      mapBaileysToObservation({
        canalId,
        channelJid: SANDBOX_JID,
        baileysMsg: { key: { remoteJid: SANDBOX_JID, id: 'X', server_id: '1' } },
      })
    ).toBeNull();
  });
});

// ─── mapMetadataToSnapshot ────────────────────────────────────────────────
describe('mapMetadataToSnapshot', () => {
  test('maps a Baileys newsletter metadata response', () => {
    const metadata = {
      id: SANDBOX_JID,
      state: { type: 'ACTIVE' },
      thread_metadata: {
        creation_time: '1773932750',
        description: { id: 'd1', text: 'Test channel', update_time: 'd1' },
        handle: null,
        name: { id: 'n1', text: 'Channelad test', update_time: 'n1' },
        picture: { id: 'pic1', direct_path: '', type: 'IMAGE' },
        preview: { id: 'prev1', direct_path: '', type: 'PREVIEW' },
        settings: { reaction_codes: { value: 'ALL' } },
        subscribers_count: '42', // string in wire format
        verification: 'UNVERIFIED',
      },
      viewer_metadata: { mute: 'ON', role: 'ADMIN' },
    };
    const snap = mapMetadataToSnapshot({
      canalId: '507f1f77bcf86cd799439011',
      channelJid: SANDBOX_JID,
      metadata,
      pollDurationMs: 250,
    });
    expect(snap).toMatchObject({
      channelJid: SANDBOX_JID,
      subscribersCount: 42, // converted to number
      name: 'Channelad test',
      description: 'Test channel',
      handle: null,
      verification: 'UNVERIFIED',
      pictureId: 'pic1',
      previewId: 'prev1',
      reactionCodesSetting: 'ALL',
      viewerRole: 'ADMIN',
      viewerMute: 'ON',
      pollStatus: 'ok',
      pollDurationMs: 250,
      source: 'passive_poll',
    });
    expect(snap.timestamp).toBeInstanceOf(Date);
  });

  test('handles missing viewer_metadata (passive poll without admin access)', () => {
    const snap = mapMetadataToSnapshot({
      canalId: '507f1f77bcf86cd799439011',
      channelJid: SANDBOX_JID,
      metadata: { thread_metadata: { subscribers_count: '5' } },
    });
    expect(snap.viewerRole).toBeNull();
    expect(snap.viewerMute).toBeNull();
    expect(snap.subscribersCount).toBe(5);
  });
});
