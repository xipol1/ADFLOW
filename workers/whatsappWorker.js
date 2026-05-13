/**
 * WhatsApp Admin Worker
 *
 * Isolated child process running whatsapp-web.js with Puppeteer.
 * Communicates with parent (Express server) via IPC messages.
 *
 * Protocol:
 *   Parent → Worker: { action, payload, requestId }
 *   Worker → Parent: { requestId, result } | { requestId, error }
 *   Worker → Parent: { event, ... }  (lifecycle events)
 */

'use strict';

const path = require('path');
const fs = require('fs');

// ─── Logging ────────────────────────────────────────────────────────────────

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'whatsapp-admin.log');

try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch (_) {}

function log(level, msg, data = {}) {
  const ts = new Date().toISOString();
  const extra = Object.keys(data).length ? ' ' + JSON.stringify(data) : '';
  const line = `[${ts}] [${level.toUpperCase()}] ${msg}${extra}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch (_) {}
  if (level === 'error') console.error(line.trim());
  else console.log(line.trim());
}

// ─── WhatsApp Client Setup ──────────────────────────────────────────────────

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrTerminal = require('qrcode-terminal');

const SESSION_PATH = process.env.WHATSAPP_SESSION_PATH
  || path.join(__dirname, '..', 'data', 'whatsapp-session');

let client = null;
let isReady = false;
let reconnectAttempts = 0;
const MAX_RECONNECTS = 3;
const BACKOFF_BASE = 5000; // 5s, 15s, 45s

function createClient() {
  log('info', 'Creating WhatsApp client', { sessionPath: SESSION_PATH });

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: SESSION_PATH }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--single-process',
      ],
    },
  });

  client.on('qr', (qr) => {
    log('info', 'QR code received — scan with WhatsApp to authenticate');
    qrTerminal.generate(qr, { small: true });
    // Also save as PNG so the operator can scan from a browser/image viewer
    // when the terminal can't render the ASCII QR cleanly. The path is logged
    // at INFO level so it surfaces in the calling script's stdout.
    try {
      const QRCode = require('qrcode');
      const qrPath = path.join(LOG_DIR, 'whatsapp-qr.png');
      QRCode.toFile(qrPath, qr, { width: 512, margin: 2 })
        .then(() => log('info', `QR PNG saved at ${qrPath}`))
        .catch((e) => log('warn', `QR PNG save failed: ${e.message}`));
    } catch (e) {
      log('warn', `QR PNG generation skipped: ${e.message}`);
    }
    sendEvent('QR_RECEIVED', { qr });
  });

  client.on('ready', () => {
    isReady = true;
    reconnectAttempts = 0;
    log('info', 'WhatsApp client ready', { number: client.info?.wid?.user });
    sendEvent('READY', { number: client.info?.wid?.user });
  });

  client.on('authenticated', () => {
    log('info', 'WhatsApp client authenticated');
  });

  client.on('auth_failure', (msg) => {
    isReady = false;
    log('error', 'Authentication failure', { reason: msg });
    sendEvent('AUTH_FAILURE', { reason: msg });
  });

  client.on('disconnected', (reason) => {
    isReady = false;
    log('warn', 'WhatsApp client disconnected', { reason });
    sendEvent('DISCONNECTED', { reason });
    attemptReconnect();
  });

  client.initialize().catch((err) => {
    log('error', 'Client initialization failed', { error: err.message });
    attemptReconnect();
  });
}

function attemptReconnect() {
  if (reconnectAttempts >= MAX_RECONNECTS) {
    log('error', `Max reconnect attempts (${MAX_RECONNECTS}) reached. Giving up.`);
    sendEvent('RECONNECT_FAILED', { attempts: reconnectAttempts });
    return;
  }

  reconnectAttempts++;
  const delay = BACKOFF_BASE * Math.pow(3, reconnectAttempts - 1);
  log('info', `Reconnecting in ${delay / 1000}s`, { attempt: reconnectAttempts });
  sendEvent('RECONNECTING', { attempt: reconnectAttempts, delayMs: delay });

  setTimeout(() => {
    try {
      if (client) client.destroy().catch(() => {});
    } catch (_) {}
    createClient();
  }, delay);
}

function sendEvent(event, data = {}) {
  if (process.send) {
    process.send({ event, ...data });
  }
}

// ─── Action Handlers ────────────────────────────────────────────────────────

async function getChannelInfo({ channelId }) {
  ensureReady();
  log('info', 'getChannelInfo', { channelId });

  // WhatsApp Channels use Newsletter API in whatsapp-web.js
  const chat = await client.getChatById(channelId);
  if (!chat) throw new Error(`Canal no encontrado: ${channelId}`);

  return {
    id: chat.id._serialized,
    name: chat.name || chat.pushname || '',
    description: chat.description || '',
    isChannel: chat.isChannel || false,
    isGroup: chat.isGroup || false,
    participants: chat.participants?.length || 0,
    timestamp: new Date(),
  };
}

async function verifyAdminAccess({ channelId }) {
  ensureReady();
  log('info', 'verifyAdminAccess', { channelId });

  const chat = await client.getChatById(channelId);
  if (!chat) throw new Error(`Canal no encontrado: ${channelId}`);

  const myNumber = client.info.wid._serialized;

  // For channels (newsletters)
  if (chat.isChannel) {
    // Check if we have admin role in the channel
    const admins = chat.participants?.filter(p =>
      p.isAdmin || p.isSuperAdmin
    ) || [];
    const amIAdmin = admins.some(a => a.id._serialized === myNumber);
    return {
      isAdmin: amIAdmin,
      channelId,
      myNumber,
      permissions: amIAdmin ? ['post', 'read', 'manage'] : [],
      totalAdmins: admins.length,
    };
  }

  // For groups
  if (chat.isGroup) {
    const participant = chat.participants?.find(p => p.id._serialized === myNumber);
    const isAdmin = participant?.isAdmin || participant?.isSuperAdmin || false;
    return {
      isAdmin,
      channelId,
      myNumber,
      permissions: isAdmin ? ['post', 'read', 'manage'] : ['read'],
      totalAdmins: chat.participants?.filter(p => p.isAdmin || p.isSuperAdmin).length || 0,
    };
  }

  throw new Error('El chat no es un canal ni un grupo');
}

async function getChannelFollowers({ channelId }) {
  ensureReady();
  log('info', 'getChannelFollowers', { channelId });

  const chat = await client.getChatById(channelId);
  if (!chat) throw new Error(`Canal no encontrado: ${channelId}`);

  return {
    count: chat.participants?.length || chat.groupMetadata?.size || 0,
    channelId,
  };
}

async function readPostMetrics({ channelId, messageId }) {
  ensureReady();
  log('info', 'readPostMetrics', { channelId, messageId });

  const chat = await client.getChatById(channelId);
  if (!chat) throw new Error(`Canal no encontrado: ${channelId}`);

  // Fetch messages to find the specific one
  const messages = await chat.fetchMessages({ limit: 50 });
  const msg = messages.find(m =>
    m.id._serialized === messageId || m.id.id === messageId
  );

  if (!msg) {
    return { views: 0, reactions: {}, forwards: 0, found: false, messageId };
  }

  // Extract available metrics
  const reactions = {};
  if (msg.reactions) {
    for (const r of msg.reactions) {
      const emoji = r.id || 'unknown';
      reactions[emoji] = (reactions[emoji] || 0) + r.senders.length;
    }
  }

  return {
    views: msg.views || 0,
    reactions,
    totalReactions: Object.values(reactions).reduce((a, b) => a + b, 0),
    forwards: msg.forwardingScore || 0,
    found: true,
    messageId: msg.id._serialized,
    timestamp: msg.timestamp ? new Date(msg.timestamp * 1000) : null,
  };
}

async function publishToChannel({ channelId, content }) {
  ensureReady();
  log('info', 'publishToChannel', { channelId, hasMedia: !!content.mediaUrl });

  const chat = await client.getChatById(channelId);
  if (!chat) throw new Error(`Canal no encontrado: ${channelId}`);

  let sent;

  if (content.mediaUrl) {
    const media = await MessageMedia.fromUrl(content.mediaUrl, {
      unsafeMime: true,
    });
    sent = await chat.sendMessage(media, {
      caption: content.caption || content.text || '',
    });
  } else {
    sent = await chat.sendMessage(content.text || '');
  }

  log('info', 'Message published', { channelId, messageId: sent.id._serialized });

  return {
    messageId: sent.id._serialized,
    timestamp: new Date(),
  };
}

async function getRecentPosts({ channelId, limit = 10 }) {
  ensureReady();
  log('info', 'getRecentPosts', { channelId, limit });

  const chat = await client.getChatById(channelId);
  if (!chat) throw new Error(`Canal no encontrado: ${channelId}`);

  const messages = await chat.fetchMessages({ limit: Math.min(limit, 50) });

  return messages.map(m => ({
    id: m.id._serialized,
    body: (m.body || '').substring(0, 500),
    timestamp: m.timestamp ? new Date(m.timestamp * 1000) : null,
    hasMedia: m.hasMedia || false,
    type: m.type,
    views: m.views || 0,
    fromMe: m.fromMe || false,
  }));
}

async function healthCheck() {
  return {
    ready: isReady,
    number: client?.info?.wid?.user || null,
    reconnectAttempts,
    uptime: process.uptime(),
    memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
  };
}

// Discovery / diagnostic. Lists every chat that looks like a WhatsApp channel
// (newsletter), trying multiple criteria because the `isChannel` flag is
// unreliable across whatsapp-web.js versions. Also surfaces a diagnostic
// breakdown of unique id.server values + constructor names so we can see
// what whatsapp-web.js actually returns from getChats() on this account.
// Read-only. Hard cap 200.
async function listMyChannels() {
  ensureReady();
  log('info', 'listMyChannels');

  const myNumber = client.info?.wid?._serialized || null;
  const allChats = await client.getChats();

  // Diagnostic: count unique id.server values and chat constructor names.
  const serverCounts = {};
  const ctorCounts = {};
  for (const c of allChats) {
    const srv = c?.id?.server || '(none)';
    serverCounts[srv] = (serverCounts[srv] || 0) + 1;
    const ctor = c?.constructor?.name || '(unknown)';
    ctorCounts[ctor] = (ctorCounts[ctor] || 0) + 1;
  }

  // Multi-criteria filter: a chat is treated as a channel if ANY of these hit.
  function isChannelLike(c) {
    if (!c) return false;
    if (c.isChannel === true) return true;
    if (c.id?.server === 'newsletter') return true;
    if (typeof c.id?._serialized === 'string' && c.id._serialized.endsWith('@newsletter')) return true;
    if (c.constructor?.name === 'Channel') return true;
    if (c.constructor?.name === 'Newsletter') return true;
    return false;
  }

  const channels = allChats.filter(isChannelLike).slice(0, 200);

  // Probe a non-getChats path in case channels live behind a different API.
  // whatsapp-web.js exposes these on the underlying Store via PupPage.evaluate;
  // we try a few likely entrypoints and report which (if any) exist.
  let storeProbe = null;
  try {
    storeProbe = await client.pupPage.evaluate(() => {
      const out = {
        windowStoreExists: !!window.Store,
        chatCollectionLen: window.Store?.Chat?.getModelsArray?.()?.length ?? null,
        // Channels in WhatsApp Web's Store sometimes live in NewsletterCollection
        newsletterCollectionExists: !!window.Store?.NewsletterCollection,
        newsletterCollectionLen: window.Store?.NewsletterCollection?.getModelsArray?.()?.length ?? null,
        newsletterClassExists: !!window.Store?.Newsletter,
        // Sample first 5 newsletters' IDs and names if the collection exists
        newsletterSample: (() => {
          try {
            const coll = window.Store?.NewsletterCollection;
            if (!coll) return null;
            const arr = coll.getModelsArray?.() || [];
            return arr.slice(0, 10).map((n) => ({
              id: n?.id?._serialized || n?.id,
              name: n?.name || n?.displayName || '',
              role: n?.newsletterMetadata?.viewerMetadata?.role || n?.viewerMetadata?.role || null,
              subscribersCount: n?.newsletterMetadata?.subscribersCount ?? null,
            }));
          } catch (e) { return `err: ${e.message}`; }
        })(),
      };
      return out;
    });
  } catch (e) {
    storeProbe = { error: e.message };
  }

  return {
    capturedAt: new Date().toISOString(),
    myNumber,
    totalChats: allChats.length,
    totalChannels: channels.length,
    diagnostic: {
      serverCounts,
      ctorCounts,
      storeProbe,
    },
    channels: channels.map((chat) => {
      let role = 'unknown';
      try {
        const admins = (chat.participants || []).filter((p) => p?.isAdmin || p?.isSuperAdmin);
        if (myNumber && admins.some((a) => a?.id?._serialized === myNumber)) {
          role = 'admin';
        } else if (Array.isArray(chat.participants) && chat.participants.length > 0) {
          role = 'follower';
        }
      } catch (_) { /* leave as 'unknown' */ }

      const tsSec = chat.lastMessage?.timestamp ?? chat.timestamp ?? null;
      const lastMessageTimestamp = tsSec ? new Date(tsSec * 1000).toISOString() : null;

      return {
        jid: chat.id?._serialized || null,
        name: chat.name || chat.pushname || '',
        description: chat.description || '',
        role,
        followersCount: chat.participants?.length || chat.groupMetadata?.size || 0,
        isMuted: chat.isMuted || false,
        lastMessageTimestamp,
        _ctor: chat.constructor?.name,
        _idServer: chat.id?.server,
      };
    }),
  };
}

// Diagnostic-only handler. Returns Message objects with all enumerable fields
// captured (no curation, no truncation), plus _data, prototype keys, and a
// targeted probe of common whatsapp-web.js getters. Used exclusively by
// scripts/probe-channel.js to discover the real shape of channel messages
// before we design the Capa 2 schema. Hard cap of 20 to keep payload sane.
async function inspectChannelMessagesRaw({ channelId, limit = 20 }) {
  ensureReady();
  const cap = Math.min(Math.max(1, Number(limit) || 20), 20);
  log('info', 'inspectChannelMessagesRaw', { channelId, limit: cap });

  const chat = await client.getChatById(channelId);
  if (!chat) throw new Error(`Canal no encontrado: ${channelId}`);

  const messages = await chat.fetchMessages({ limit: cap });

  return {
    channelId,
    limit: cap,
    capturedAt: new Date().toISOString(),
    chat: {
      ownKeys: Object.keys(chat),
      protoKeys: collectPrototypeKeys(chat),
      raw: serializeRaw(chat),
    },
    messages: messages.map((m) => ({
      ownKeys: Object.keys(m),
      protoKeys: collectPrototypeKeys(m),
      raw: serializeRaw(m),
      probedGetters: probeMessageGetters(m),
      hasMethods: {
        getReactions: typeof m.getReactions === 'function',
        getContact: typeof m.getContact === 'function',
        getInfo: typeof m.getInfo === 'function',
        getOrder: typeof m.getOrder === 'function',
        getPayment: typeof m.getPayment === 'function',
        downloadMedia: typeof m.downloadMedia === 'function',
      },
    })),
  };
}

function collectPrototypeKeys(obj) {
  const keys = new Set();
  let p = Object.getPrototypeOf(obj);
  while (p && p !== Object.prototype) {
    for (const k of Object.getOwnPropertyNames(p)) {
      if (k !== 'constructor') keys.add(k);
    }
    p = Object.getPrototypeOf(p);
  }
  return [...keys];
}

// Walks an object up to depth 6, skipping functions, circular refs, and
// known back-references to the puppeteer/client to avoid pulling in the
// whole worker. Returns a plain serializable copy.
function serializeRaw(obj, seen = new WeakSet(), depth = 0) {
  if (depth > 6) return '[max-depth]';
  if (obj === null || obj === undefined) return obj;
  const t = typeof obj;
  if (t === 'function') return undefined;
  if (t !== 'object') return obj;
  if (seen.has(obj)) return '[circular]';
  seen.add(obj);
  if (Array.isArray(obj)) {
    return obj.slice(0, 100).map((x) => serializeRaw(x, seen, depth + 1));
  }
  if (obj instanceof Date) return obj.toISOString();
  const out = {};
  for (const k of Object.keys(obj)) {
    if (k === 'client' || k === '_client' || k === 'puppeteer' || k === 'page') continue;
    try {
      const v = serializeRaw(obj[k], seen, depth + 1);
      if (v !== undefined) out[k] = v;
    } catch (e) {
      out[k] = `[error: ${e.message}]`;
    }
  }
  return out;
}

// Explicitly probe getters that whatsapp-web.js defines on Message.prototype
// — these are NOT enumerable via Object.keys but are critical for the schema.
function probeMessageGetters(m) {
  const fields = [
    'id', 'body', 'type', 'timestamp', 'from', 'to', 'author', 'fromMe',
    'ack', 'hasMedia', 'hasReaction', 'hasQuotedMsg', 'isForwarded',
    'forwardingScore', 'isStarred', 'broadcast', 'isStatus', 'isEphemeral',
    'isGif', 'mentionedIds', 'groupMentions', 'links', 'vCards', 'location',
    'quotedMsgId', 'quotedStanzaID', 'reactions', 'views', 'viewedAt',
    'deviceType', 'duration', 'caption', 'pollName', 'pollOptions',
    'inviteV4', 'isEdited', 'isStatusV3', 'orderId', 'token',
    'mediaKey', 'mimetype', 'filename', 'size', 'pageCount',
    'newsletterServerTimestamp', 'channelServerTimestamp',
  ];
  const out = {};
  for (const f of fields) {
    try {
      const v = m[f];
      if (v !== undefined) {
        const s = serializeRaw(v);
        if (s !== undefined) out[f] = s;
      }
    } catch (e) {
      out[f] = `[error: ${e.message}]`;
    }
  }
  return out;
}

function ensureReady() {
  if (!isReady || !client?.info) {
    throw new Error('WhatsApp client not ready');
  }
}

// ─── IPC Message Dispatcher ─────────────────────────────────────────────────

const ACTIONS = {
  getChannelInfo,
  verifyAdminAccess,
  getChannelFollowers,
  readPostMetrics,
  publishToChannel,
  getRecentPosts,
  healthCheck,
  inspectChannelMessagesRaw,
  listMyChannels,
};

process.on('message', async (msg) => {
  const { action, payload, requestId } = msg || {};

  if (!action || !requestId) {
    log('warn', 'Invalid IPC message received', { msg });
    return;
  }

  const handler = ACTIONS[action];
  if (!handler) {
    process.send({ requestId, error: `Unknown action: ${action}` });
    return;
  }

  try {
    const result = await handler(payload || {});
    process.send({ requestId, result });
  } catch (err) {
    log('error', `Action ${action} failed`, { error: err.message, channelId: payload?.channelId });
    process.send({ requestId, error: err.message });
  }
});

// ─── Graceful Shutdown ──────────────────────────────────────────────────────

async function shutdown(signal) {
  log('info', `${signal} received — shutting down worker`);
  isReady = false;
  try {
    if (client) await client.destroy();
  } catch (_) {}
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ─── Start ──────────────────────────────────────────────────────────────────

log('info', 'WhatsApp admin worker starting...');
createClient();
