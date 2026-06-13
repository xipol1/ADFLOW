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
    // Channels expose no participants — the real follower count + role live in metadata.
    subscribersCount:
      chat.channelMetadata?.subscribersCount ??
      chat.channelMetadata?.size ??
      null,
    role: chat.channelMetadata?.membershipType || null,
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
    // A wweb Channel exposes NO `participants` array (that field only exists on
    // groups via groupMetadata). The viewer's own role lives in
    // channelMetadata.membershipType — 'owner' | 'admin' | 'subscriber', and it
    // comes back LOWERCASE. Owning OR admin-ing the channel both grant posting.
    const role = String(chat.channelMetadata?.membershipType || '').toLowerCase();
    const amIAdmin = role === 'owner' || role === 'admin';
    return {
      isAdmin: amIAdmin,
      channelId,
      myNumber,
      role,
      permissions: amIAdmin ? ['post', 'read', 'manage'] : [],
      totalAdmins: null, // not exposed by WhatsApp for channels
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
    // Channels keep the count in newsletter metadata, not in participants.
    count:
      chat.channelMetadata?.subscribersCount ??
      chat.channelMetadata?.size ??
      chat.participants?.length ??
      chat.groupMetadata?.size ??
      0,
    source: chat.channelMetadata ? 'channelMetadata' : 'participants',
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

// ─── Diagnostic / channel-resolution actions (added for local validation) ─────

/**
 * Lists every channel (newsletter) the logged-in account can see.
 * NOTE: channels live in WAWebNewsletterCollection, NOT in the Chat collection,
 * so getChats() does NOT include them — we must use getChannels().
 */
async function listChannels() {
  ensureReady();
  log('info', 'listChannels');

  const channels = await client.getChannels();
  return (channels || []).map(c => ({
    id: c.id?._serialized || null,
    name: c.name || '',
    isChannel: c.isChannel || false,
    isReadOnly: c.isReadOnly || false,
    role: c.channelMetadata?.membershipType || null,
    // expose raw metadata keys so we can see exactly what WA gives us per channel
    channelMetadataKeys: c.channelMetadata ? Object.keys(c.channelMetadata) : [],
    subscribersCount:
      c.channelMetadata?.subscribersCount ??
      c.channelMetadata?.size ??
      null,
  }));
}

/**
 * Resolves an invite code (the part after /channel/) to a full Channel +
 * the clean metadata WA returns (id JID, subscribersCount, isVerified...).
 */
async function getChannelByInvite({ inviteCode }) {
  ensureReady();
  log('info', 'getChannelByInvite', { inviteCode });

  const channel = await client.getChannelByInviteCode(inviteCode);
  if (!channel) throw new Error(`No se pudo resolver el invite: ${inviteCode}`);

  return {
    id: channel.id?._serialized || null,
    name: channel.name || '',
    description: channel.description || '',
    isChannel: channel.isChannel || false,
    isReadOnly: channel.isReadOnly || false,
    channelMetadata: channel.channelMetadata || null,
  };
}

/**
 * Returns the clean newsletter metadata WA serves for an invite code,
 * including subscribersCount + isVerified (the real follower count).
 */
async function rawInviteMetadata({ inviteCode }) {
  ensureReady();
  log('info', 'rawInviteMetadata', { inviteCode });

  return await client.pupPage.evaluate(
    (code) => window.WWebJS.getChannelMetadata(code),
    inviteCode,
  );
}

/**
 * Dumps the RAW internal message model (_data) for recent posts so we can
 * empirically inspect which metric fields WA actually exposes (views, reactions,
 * forwards) before whatsapp-web.js strips them in its Message getter.
 */
async function debugRawPosts({ channelId, limit = 5 }) {
  ensureReady();
  log('info', 'debugRawPosts', { channelId, limit });

  const chat = await client.getChatById(channelId);
  if (!chat) throw new Error(`Canal no encontrado: ${channelId}`);

  const messages = await chat.fetchMessages({ limit: Math.min(limit, 50) });

  return messages.map(m => {
    const raw = m._data || {};
    // surface anything that looks like a metric without guessing exact names
    const metricLike = {};
    for (const k of Object.keys(raw)) {
      if (/view|seen|read|react|forward|count|stat|recipient/i.test(k)) {
        metricLike[k] = raw[k];
      }
    }
    return {
      id: m.id?._serialized || null,
      type: m.type,
      fromMe: m.fromMe || false,
      timestamp: m.timestamp ? new Date(m.timestamp * 1000) : null,
      bodyPreview: (m.body || '').substring(0, 60),
      hasReaction: m.hasReaction || false,
      forwardingScore: m.forwardingScore || 0,
      rawKeys: Object.keys(raw),
      metricLike,
    };
  });
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
  // diagnostic / channel-resolution
  listChannels,
  getChannelByInvite,
  rawInviteMetadata,
  debugRawPosts,
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
