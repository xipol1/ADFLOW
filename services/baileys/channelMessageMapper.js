/**
 * channelMessageMapper
 *
 * Pure functions to translate a Baileys newsletter envelope into the
 * CanalPostObservation document shape. Lives in services/baileys/ because
 * it's tightly coupled to Baileys' protobuf message variants — and because
 * we want to swap libraries (or upgrade Baileys) without touching the
 * downstream code (collector, worker, NLP enrichment).
 *
 * Empirical reference: the shape this mapper accepts has been validated
 * against scripts/probe-channel-baileys.js dumps on Baileys 7.0.0-rc.9.
 * If the upstream changes, update the variant detectors below and add a
 * regression test fixture.
 *
 * No side effects. No Mongoose. No async. All functions take a plain JS
 * object (the Baileys event payload's `messages[i]` element) and return
 * plain values. Database writes happen at the caller.
 */

'use strict';

const crypto = require('crypto');

// Variants we recognize on `message.*`. Order matters only insofar as a single
// envelope can technically contain multiple keys (rare but possible — e.g. an
// extendedTextMessage carrying a poll-like preview). We detect in order of
// specificity: pollCreationMessage before extendedTextMessage, etc.
const MESSAGE_VARIANTS = [
  { key: 'pollCreationMessageV3', type: 'poll' },
  { key: 'pollCreationMessage', type: 'poll' },
  { key: 'imageMessage', type: 'image' },
  { key: 'videoMessage', type: 'video' },
  { key: 'audioMessage', type: 'audio' },
  { key: 'documentMessage', type: 'document' },
  { key: 'documentWithCaptionMessage', type: 'document' },
  { key: 'stickerMessage', type: 'sticker' },
  { key: 'extendedTextMessage', type: 'text' },
  { key: 'conversation', type: 'text' }, // plain string, not an object
];

const URL_REGEX = /https?:\/\/[^\s<>"]+/gi;

function detectType(message) {
  if (!message || typeof message !== 'object') return { type: 'unknown', variantKey: null, body: null };

  for (const v of MESSAGE_VARIANTS) {
    if (message[v.key] !== undefined && message[v.key] !== null) {
      return { type: v.type, variantKey: v.key, body: message[v.key] };
    }
  }
  return { type: 'unknown', variantKey: null, body: null };
}

function extractBody(variantKey, variantBody) {
  if (variantBody == null) return '';
  switch (variantKey) {
    case 'conversation':
      return String(variantBody || '');
    case 'extendedTextMessage':
      return String(variantBody.text || '');
    case 'imageMessage':
    case 'videoMessage':
    case 'documentMessage':
    case 'documentWithCaptionMessage':
      return String(variantBody.caption || '');
    case 'pollCreationMessageV3':
    case 'pollCreationMessage':
      return String(variantBody.name || '');
    case 'audioMessage':
    case 'stickerMessage':
      return ''; // no body
    default:
      return '';
  }
}

function safeHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function extractLinks(variantKey, variantBody, body) {
  const links = [];
  const seen = new Set();

  // Primary: Baileys' own extracted preview (only one link, the "main" one).
  if (variantKey === 'extendedTextMessage' && variantBody?.matchedText) {
    const url = String(variantBody.matchedText);
    if (!seen.has(url)) {
      seen.add(url);
      links.push({
        url,
        domain: safeHostname(url),
        title: String(variantBody.title || ''),
        description: String(variantBody.description || ''),
        previewType: Number(variantBody.previewType || 0),
      });
    }
  }

  // Secondary: regex over the body to catch additional URLs without preview.
  if (body) {
    const matches = body.match(URL_REGEX) || [];
    for (const url of matches) {
      const clean = url.replace(/[.,;:!?)\]}>'"]+$/, ''); // strip trailing punctuation
      if (!seen.has(clean)) {
        seen.add(clean);
        links.push({
          url: clean,
          domain: safeHostname(clean),
          title: '',
          description: '',
          previewType: 0,
        });
      }
    }
  }

  return links;
}

function bufferLength(value) {
  if (!value) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return value.length;
  if (Buffer.isBuffer(value)) return value.length;
  if (value.length !== undefined) return Number(value.length);
  // Baileys' protobuf Long (low/high) — we don't reconstruct, just skip
  return undefined;
}

function bufferToB64(value) {
  if (!value) return undefined;
  if (Buffer.isBuffer(value)) return value.toString('base64');
  if (value instanceof Uint8Array) return Buffer.from(value).toString('base64');
  // Already base64 in serialized dumps
  if (typeof value === 'string') return value;
  return undefined;
}

function extractMedia(variantKey, variantBody) {
  if (!['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'documentWithCaptionMessage', 'stickerMessage'].includes(variantKey)) {
    return null;
  }
  // documentWithCaptionMessage wraps the actual document inside .message
  if (variantKey === 'documentWithCaptionMessage' && variantBody?.message?.documentMessage) {
    return extractMedia('documentMessage', variantBody.message.documentMessage);
  }
  const v = variantBody || {};
  return {
    mimeType: v.mimetype || undefined,
    directPath: v.directPath || undefined,
    sha256: bufferToB64(v.fileSha256),
    fileLength: bufferLength(v.fileLength),
    width: v.width || undefined,
    height: v.height || undefined,
    duration: v.seconds || v.duration || undefined,
    pageCount: v.pageCount || undefined,
    caption: v.caption || undefined,
    thumbnailB64: bufferToB64(v.jpegThumbnail),
    thumbnailSha256: bufferToB64(v.thumbnailSha256),
  };
}

function extractPoll(variantKey, variantBody) {
  if (variantKey !== 'pollCreationMessage' && variantKey !== 'pollCreationMessageV3') return null;
  const v = variantBody || {};
  return {
    name: v.name || '',
    options: (v.options || []).map((opt) => ({
      name: String(opt?.optionName || opt?.name || ''),
      optionHash: bufferToB64(opt?.optionHash),
    })),
    selectableOptionsCount: Number(v.selectableOptionsCount || 1),
  };
}

function extractContextInfo(variantBody) {
  // contextInfo lives on extendedTextMessage and on every mediaMessage.
  const ctx = variantBody?.contextInfo;
  if (!ctx) return { isForwarded: false, forwardingScore: 0 };
  return {
    isForwarded: Boolean(ctx.isForwarded),
    forwardingScore: Number(ctx.forwardingScore || 0),
  };
}

// Normalize text for content-hashing. Goal: identical-looking posts on
// different channels produce the same hash even if whitespace differs.
// We intentionally DON'T strip emojis or punctuation — those are part of
// the brand voice and removing them creates false positives (e.g. all
// "follow us" CTAs would hash to the same value).
function normalizeBodyForHash(body) {
  if (!body) return '';
  return String(body)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function computeBodyHash(body) {
  const normalized = normalizeBodyForHash(body);
  if (!normalized) return null;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Build a CanalPostObservation-shaped plain object from a Baileys envelope.
 *
 * @param {object} args
 * @param {string} args.canalId      Mongo ObjectId string of the Canal
 * @param {string} args.channelJid   '120363...@newsletter'
 * @param {object} args.baileysMsg   messages[i] from a `messages.upsert` event
 * @param {string} [args.source]     'realtime' | 'manual' | 'replay'
 * @param {boolean} [args.storeRaw]  attach raw Baileys envelope (truncated by Mongo) — default true
 * @param {number} [args.rawTtlDays] days until raw is auto-purged (default 30)
 * @returns {object|null}            null if the envelope is unusable
 */
function mapBaileysToObservation({ canalId, channelJid, baileysMsg, source = 'realtime', storeRaw = true, rawTtlDays = 30 }) {
  if (!baileysMsg || !baileysMsg.key || baileysMsg.key.remoteJid !== channelJid) {
    return null;
  }
  const message = baileysMsg.message;
  if (!message) return null;

  const { type, variantKey, body: variantBody } = detectType(message);
  const body = extractBody(variantKey, variantBody);
  const links = extractLinks(variantKey, variantBody, body);
  const media = extractMedia(variantKey, variantBody);
  const poll = extractPoll(variantKey, variantBody);
  const { isForwarded, forwardingScore } = extractContextInfo(variantBody);
  const bodyHash = computeBodyHash(body);

  const messageTimestampSec =
    typeof baileysMsg.messageTimestamp === 'number'
      ? baileysMsg.messageTimestamp
      : Number(baileysMsg.messageTimestamp?.low || baileysMsg.messageTimestamp || 0);

  return {
    canalId,
    channelJid,
    messageId: String(baileysMsg.key.id || ''),
    serverId: Number(baileysMsg.key.server_id || baileysMsg.key.serverId || 0),
    addressingMode: String(baileysMsg.key.addressingMode || 'pn'),
    fromMe: Boolean(baileysMsg.key.fromMe),
    participant: String(baileysMsg.key.participant || ''),

    publishedAt: messageTimestampSec ? new Date(messageTimestampSec * 1000) : new Date(),
    observedAt: new Date(),
    source,

    type,
    body,
    bodyLength: body.length,
    bodyHash,
    links,
    media,
    poll,
    isForwarded,
    forwardingScore,

    // reactions intentionally not set — they arrive via separate events.
    // nlp intentionally not set — populated asynchronously by Fase 3.

    raw: storeRaw ? baileysMsg : null,
    rawTtlExpiresAt: storeRaw
      ? new Date(Date.now() + rawTtlDays * 24 * 60 * 60 * 1000)
      : null,
  };
}

/**
 * Build the metadata snapshot doc from Baileys' newsletterMetadata result.
 *
 * @param {object} args
 * @param {string} args.canalId
 * @param {string} args.channelJid
 * @param {object} args.metadata  return of sock.newsletterMetadata('jid', jid)
 * @param {string} [args.source]  'passive_poll' | 'realtime_metadata_update' | 'manual'
 * @param {string} [args.pollStatus]
 * @param {number} [args.pollDurationMs]
 * @returns {object}              CanalMetricsSnapshot-shaped doc
 */
function mapMetadataToSnapshot({ canalId, channelJid, metadata, source = 'passive_poll', pollStatus = 'ok', pollDurationMs = 0 }) {
  const tm = metadata?.thread_metadata || {};
  const vm = metadata?.viewer_metadata || null;
  return {
    timestamp: new Date(),
    canalId,
    channelJid,
    source,
    subscribersCount: Number(tm.subscribers_count || 0),
    adminCount: null,                          // Baileys 7.0.0-rc.9 quirk
    name: tm.name?.text || '',
    nameUpdateTime: tm.name?.update_time || '',
    description: tm.description?.text || '',
    descriptionUpdateTime: tm.description?.update_time || '',
    handle: tm.handle || null,
    verification: tm.verification || 'UNVERIFIED',
    pictureId: tm.picture?.id || '',
    previewId: tm.preview?.id || '',
    reactionCodesSetting: tm.settings?.reaction_codes?.value || 'ALL',
    viewerRole: vm?.role || null,
    viewerMute: vm?.mute || null,
    pollStatus,
    pollErrorMessage: '',
    pollDurationMs,
  };
}

module.exports = {
  detectType,
  extractBody,
  extractLinks,
  extractMedia,
  extractPoll,
  extractContextInfo,
  normalizeBodyForHash,
  computeBodyHash,
  mapBaileysToObservation,
  mapMetadataToSnapshot,
};
