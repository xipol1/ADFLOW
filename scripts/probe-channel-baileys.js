#!/usr/bin/env node
/**
 * scripts/probe-channel-baileys.js
 *
 * Capa 2 schema-discovery probe via Baileys (whatsapp-web.js doesn't expose
 * newsletters/channels at all, hence this parallel path).
 *
 * Self-contained: file-based auth at `data/baileys-probe-session/`, no Mongo,
 * no DB pollution. Uses a separate linked device from whatsapp-web.js — the
 * user keeps Chrome WA Web + whatsapp-web.js + this one active simultaneously
 * (WA allows 4 linked devices).
 *
 *   node scripts/probe-channel-baileys.js <inviteCode>
 *
 *   inviteCode = the tail of https://whatsapp.com/channel/<inviteCode>
 *                e.g. 0029Vb82Fo0I7BeLLtWLvh2B
 *
 * Output:
 *   - QR PNG at logs/baileys-qr.png (scan with phone on first run)
 *   - Full dump at logs/probe-baileys-<inviteCode>-<ts>.json
 *   - Summary printed to stdout
 */

'use strict';

const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const pino = require('pino');

const baileys = require('@whiskeysockets/baileys');
const makeWASocket = baileys.default;
const { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = baileys;

const LOG_DIR = path.join(__dirname, '..', 'logs');
const SESSION_DIR = path.join(__dirname, '..', 'data', 'baileys-probe-session');
const QR_PNG = path.join(LOG_DIR, 'baileys-qr.png');
const READY_TIMEOUT_MS = 240_000;

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function nowIso() { return new Date().toISOString(); }

async function saveQr(qr) {
  await qrcode.toFile(QR_PNG, qr, { width: 512, margin: 2 });
}

// Safely serialize unknown Baileys payloads — strips circular refs, functions,
// and depth-bombs. Buffers → base64-tagged. Long Uint8Array preserved as length.
function safeSerialize(value, seen = new WeakSet(), depth = 0) {
  if (depth > 8) return '[max-depth]';
  if (value === null || value === undefined) return value;
  const t = typeof value;
  if (t === 'function') return undefined;
  if (t !== 'object') {
    if (t === 'bigint') return value.toString() + 'n';
    return value;
  }
  if (Buffer.isBuffer(value)) return { __buffer_b64: value.toString('base64'), length: value.length };
  if (value instanceof Uint8Array) return { __uint8: value.length };
  if (value instanceof Date) return value.toISOString();
  if (seen.has(value)) return '[circular]';
  seen.add(value);
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((x) => safeSerialize(x, seen, depth + 1));
  }
  const out = {};
  for (const k of Object.keys(value)) {
    try {
      const v = safeSerialize(value[k], seen, depth + 1);
      if (v !== undefined) out[k] = v;
    } catch (e) {
      out[k] = `[error: ${e.message}]`;
    }
  }
  return out;
}

async function tryCall(label, fn) {
  const t0 = Date.now();
  try {
    const result = await fn();
    return { ok: true, ms: Date.now() - t0, result: safeSerialize(result) };
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, error: e.message, stack: e.stack?.split('\n').slice(0, 5) };
  }
}

// Build a socket with state, attach creds saver. Used both for first connection
// and for the post-515 restart that WhatsApp's protocol demands after a fresh
// pairing (isNewLogin → close 515 → must reopen).
function buildSocket(state, saveCreds, version) {
  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: ['ChannelAd Probe', 'Chrome', '1.0.0'],
    markOnlineOnConnect: false,
    syncFullHistory: false,
    logger: pino({ level: 'silent' }),
  });
  sock.ev.on('creds.update', saveCreds);
  return sock;
}

// Connection orchestrator: handles QR emission, isNewLogin → 515 restart loop,
// and transient closes. Resolves with the live socket once 'open' fires.
// Rejects on loggedOut (revocation from phone) or overall timeout.
function connectWithRetry(state, saveCreds, version, timeoutMs) {
  return new Promise((resolve, reject) => {
    let resolved = false;
    let currentSock = null;
    let attempts = 0;

    const overallT = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      try { currentSock?.end(); } catch (_) {}
      reject(new Error(`Baileys no llegó a 'open' tras ${timeoutMs / 1000}s`));
    }, timeoutMs);

    const onUpdate = async (update) => {
      const { connection, qr, lastDisconnect, isNewLogin, receivedPendingNotifications } = update;
      console.log(`[probe-baileys] connection.update: ${JSON.stringify({
        connection,
        hasQr: !!qr,
        isNewLogin,
        receivedPendingNotifications,
        disconnectReason: lastDisconnect?.error?.output?.statusCode,
        disconnectMsg: lastDisconnect?.error?.message,
      })}`);

      if (qr) {
        try {
          await saveQr(qr);
          console.log(`[probe-baileys] QR PNG saved at ${QR_PNG}`);
        } catch (e) {
          console.warn('[probe-baileys] QR save failed:', e.message);
        }
      }

      if (connection === 'open') {
        if (resolved) return;
        resolved = true;
        clearTimeout(overallT);
        resolve(currentSock);
        return;
      }

      if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode;
        // Permanent: phone unlinked us → no retry
        if (reason === DisconnectReason?.loggedOut) {
          if (resolved) return;
          resolved = true;
          clearTimeout(overallT);
          reject(new Error('Session loggedOut (revoked from phone)'));
          return;
        }
        // 515 = restart required after fresh pairing. Also other transients
        // (timeoutError, connectionLost, etc.) → rebuild socket. WhatsApp's
        // protocol does NOT auto-reopen — the client must spin a new socket.
        if (resolved) return;
        attempts += 1;
        if (attempts > 5) {
          resolved = true;
          clearTimeout(overallT);
          reject(new Error(`too many reconnects (last reason=${reason})`));
          return;
        }
        console.log(`[probe-baileys] reconnecting after close (reason=${reason}, attempt=${attempts})...`);
        setTimeout(() => {
          if (resolved) return;
          currentSock = buildSocket(state, saveCreds, version);
          currentSock.ev.on('connection.update', onUpdate);
        }, 1500);
      }
    };

    currentSock = buildSocket(state, saveCreds, version);
    currentSock.ev.on('connection.update', onUpdate);
  });
}

async function main() {
  const inviteCode = process.argv[2] || '0029Vb82Fo0I7BeLLtWLvh2B'; // sandbox default

  ensureDir(LOG_DIR);
  ensureDir(SESSION_DIR);

  console.log('[probe-baileys] sessionDir:', SESSION_DIR);
  console.log('[probe-baileys] inviteCode:', inviteCode);

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  let version;
  try {
    const v = await fetchLatestBaileysVersion();
    version = v.version;
    console.log('[probe-baileys] WA Web version:', version);
  } catch (e) {
    version = [2, 3000, 1015901307];
    console.warn('[probe-baileys] using fallback WA Web version (fetchLatest failed):', e.message);
  }

  let sock;
  console.log('[probe-baileys] Esperando conexión (handles isNewLogin → 515 restart)...');
  try {
    sock = await connectWithRetry(state, saveCreds, version, READY_TIMEOUT_MS);
  } catch (e) {
    console.error('[probe-baileys] FATAL:', e.message);
    process.exit(2);
  }

  console.log('[probe-baileys] ✓ Conectado como', sock.user?.id || '(unknown)');

  const findings = {
    inviteCode,
    startedAt: nowIso(),
    baileysVersion: require('@whiskeysockets/baileys/package.json').version,
    waWebVersion: version,
    user: safeSerialize(sock.user),
    steps: {},
    events: { messagesUpsert: [], newsletterReactions: [], droppedNonChannelEvents: 0 },
  };

  // ─── JID-scoped real-time capture ────────────────────────────────────────
  // The `messages.upsert` event is GLOBAL across the entire Baileys session
  // — it fires for every chat the user belongs to, including private DMs and
  // groups. We MUST filter to the target newsletter JID before persisting,
  // otherwise unrelated personal content leaks into the dump.
  //
  // We don't know the JID yet (it's resolved by metadataByInvite below), so
  // the filter starts as a no-op and is set once jid is resolved.
  let targetJid = null;
  sock.ev.on('messages.upsert', (m) => {
    if (!targetJid) {
      findings.events.droppedNonChannelEvents += (m.messages || []).length;
      return;
    }
    const channelMessages = (m.messages || []).filter(
      (msg) => msg?.key?.remoteJid === targetJid
    );
    if (channelMessages.length === 0) {
      findings.events.droppedNonChannelEvents += (m.messages || []).length;
      return;
    }
    findings.events.messagesUpsert.push({
      at: nowIso(),
      type: m.type,
      messages: channelMessages.slice(0, 10).map((msg) => safeSerialize(msg)),
    });
  });
  // Newsletter reactions event (may not exist in all versions)
  try {
    sock.ev.on('newsletter.reaction', (r) => {
      // Filter to target JID — `r` shape unverified; check common locations
      const reactionJid = r?.jid || r?.newsletter || r?.id;
      if (targetJid && reactionJid && reactionJid !== targetJid) return;
      findings.events.newsletterReactions.push({ at: nowIso(), data: safeSerialize(r) });
    });
  } catch (_) { /* ignore */ }

  // ─── Step 1: metadata by invite code (no admin required) ───
  console.log('[probe-baileys] ▶ newsletterMetadata(invite,...)');
  findings.steps.metadataByInvite = await tryCall('metadataByInvite', () =>
    sock.newsletterMetadata('invite', inviteCode)
  );
  if (findings.steps.metadataByInvite.ok) {
    console.log('[probe-baileys] ✓ metadata by invite OK');
  } else {
    console.error('[probe-baileys] ✗ metadata by invite:', findings.steps.metadataByInvite.error);
  }

  // Extract JID for subsequent calls
  const jid =
    findings.steps.metadataByInvite.result?.id ||
    findings.steps.metadataByInvite.result?.jid ||
    null;
  findings.jid = jid;
  targetJid = jid; // arm the messages.upsert filter so only channel events get captured
  console.log('[probe-baileys] jid resolved:', jid || '(NONE — subsequent steps will likely fail)');

  // ─── Step 2: metadata by JID ───
  if (jid) {
    console.log('[probe-baileys] ▶ newsletterMetadata(jid,...)');
    findings.steps.metadataByJid = await tryCall('metadataByJid', () =>
      sock.newsletterMetadata('jid', jid)
    );
  }

  // ─── Step 3: admin count ───
  if (jid && typeof sock.newsletterAdminCount === 'function') {
    console.log('[probe-baileys] ▶ newsletterAdminCount');
    findings.steps.adminCount = await tryCall('adminCount', () => sock.newsletterAdminCount(jid));
  }

  // ─── Step 4: subscribers (only available if admin) ───
  if (jid && typeof sock.newsletterSubscribers === 'function') {
    console.log('[probe-baileys] ▶ newsletterSubscribers');
    findings.steps.subscribers = await tryCall('subscribers', () => sock.newsletterSubscribers(jid));
  }

  // Note: newsletterFetchMessages SKIPPED on purpose.
  // In Baileys 7.0.0-rc.9 it issues an IQ that hits the default 60s timeout
  // without returning parsed messages — verified in earlier probe runs.
  // We rely on real-time capture below instead.
  // fetchMessageHistory also skipped because it needs an oldestMsgKey we
  // don't have (chicken-and-egg for empty cache).

  // ─── Step 5: subscribe to real-time updates + 90s capture window ───
  // The ONLY reliable way to read newsletter posts on Baileys 7.0.0-rc.9
  // is via the `messages.upsert` event AFTER subscribeNewsletterUpdates.
  // The user must publish posts INSIDE this 90s window — anything published
  // earlier won't propagate to the live_updates stream.
  if (jid && typeof sock.subscribeNewsletterUpdates === 'function') {
    console.log('[probe-baileys] ▶ subscribeNewsletterUpdates');
    findings.steps.subscribeUpdates = await tryCall('subscribeUpdates', () =>
      sock.subscribeNewsletterUpdates(jid)
    );
    console.log('[probe-baileys] ════════════════════════════════════════');
    console.log('[probe-baileys] 90s VENTANA REAL-TIME ABIERTA');
    console.log('[probe-baileys] PUBLICA AHORA los 9-10 posts en el canal');
    console.log('[probe-baileys] cada uno aparecerá filtrado por JID');
    console.log('[probe-baileys] ════════════════════════════════════════');
    // Optional periodic heartbeat so we know the script is alive
    const heartbeat = setInterval(() => {
      console.log(`[probe-baileys] real-time… ${findings.events.messagesUpsert.length} posts capturados, ${findings.events.droppedNonChannelEvents} eventos no-canal descartados`);
    }, 15000);
    await new Promise((r) => setTimeout(r, 90000));
    clearInterval(heartbeat);
  }

  // ─── Method inventory snapshot ───
  findings.sockMethods = Object.keys(sock)
    .filter((k) => typeof sock[k] === 'function')
    .filter((k) => /newsletter|subscrib|metadata|fetch|message|event/i.test(k))
    .sort();

  findings.finishedAt = nowIso();

  // ─── Write dump ───
  const cleanInvite = inviteCode.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
  const outPath = path.join(LOG_DIR, `probe-baileys-${cleanInvite}-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(findings, null, 2));

  // ─── Summary ───
  console.log('\n[probe-baileys] ═══════════════════════════════════════════════');
  console.log('[probe-baileys] SUMMARY');
  console.log('[probe-baileys] ───────────────────────────────────────────────');
  const summary = {
    jid: findings.jid,
    metadataByInviteOk: findings.steps.metadataByInvite?.ok,
    metadataByJidOk: findings.steps.metadataByJid?.ok,
    adminCountOk: findings.steps.adminCount?.ok,
    subscribersOk: findings.steps.subscribers?.ok,
    fetchMessagesWhichSigOk: ['fetchMessages_count20', 'fetchMessages_optsObj', 'fetchMessages_serverId']
      .find((k) => findings.steps[k]?.ok) || 'none',
    subscribeUpdatesOk: findings.steps.subscribeUpdates?.ok,
    realtimeMessagesCaptured: findings.events.messagesUpsert.length,
    newsletterReactionsCaptured: findings.events.newsletterReactions.length,
  };
  console.log(JSON.stringify(summary, null, 2));
  console.log('[probe-baileys] ───────────────────────────────────────────────');
  console.log(`[probe-baileys] Dump: ${outPath}`);
  console.log('[probe-baileys] ═══════════════════════════════════════════════\n');

  try { sock.end(); } catch (_) {}
  setTimeout(() => process.exit(0), 3000).unref();
}

main().catch((err) => {
  console.error('[probe-baileys] FATAL no manejado:', err);
  process.exit(1);
});
