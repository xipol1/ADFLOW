/**
 * BaileysSessionManager
 *
 * Manages multiple concurrent Baileys sessions, one per linked WhatsApp
 * account. Each session is identified by a Mongo BaileysSession document.
 *
 * Design:
 *   - Sessions live in-memory (Map<sessionId, SocketEntry>)
 *   - Creds persist to MongoDB via authStore
 *   - QR codes are stored in the entry and exposed via getSessionState()
 *   - On disconnect, we auto-reconnect unless status is 'revoked'
 *
 * IMPORTANT: this service requires a persistent Node process. It does NOT
 * work on Vercel serverless because each request is a cold start and the
 * WebSocket connection dies between invocations. Deploy as a separate
 * worker on a VPS (Railway, Fly.io, Hetzner) and call it via HTTP from the
 * Vercel frontend.
 *
 * Public API:
 *   - startLinking(usuarioId, opts)   → { sessionId, status }
 *   - getSessionState(sessionId)      → { status, qr, deviceNumber, newsletters }
 *   - listNewsletters(sessionId)      → [{ jid, name, subscribers, ... }]
 *   - getNewsletterMetadata(sessionId, jid)
 *   - revokeSession(sessionId)
 *   - shutdown()
 */

'use strict';

const qrcode = require('qrcode');
const { useMongoAuthState, loadBaileys } = require('./authStore');
const BaileysSession = require('../../models/BaileysSession');
const WhatsAppAuditLog = require('../../models/WhatsAppAuditLog');

class BaileysSessionManager {
  constructor() {
    /** @type {Map<string, SocketEntry>} */
    this.sockets = new Map();
    this._shutdownHooked = false;
  }

  /**
   * Start a new linking flow. Creates a BaileysSession document and opens
   * a Baileys socket. The socket emits a QR code which is stored on the
   * entry and returned via getSessionState().
   *
   * @param {string} usuarioId
   * @param {object} opts { alias, canalId, consentIp, consentUserAgent }
   * @returns {Promise<{ sessionId: string, status: string }>}
   */
  async startLinking(usuarioId, opts = {}) {
    const session = await BaileysSession.create({
      usuarioId,
      canalId: opts.canalId || null,
      alias: opts.alias || '',
      status: 'pending_qr',
      consentAcceptedAt: new Date(),
      consentIp: opts.consentIp || '',
      consentUserAgent: opts.consentUserAgent || '',
    });

    await WhatsAppAuditLog.record({
      usuarioId,
      sessionId: session._id,
      action: 'session.created',
      summary: `Sesión iniciada${opts.alias ? ` — ${opts.alias}` : ''}`,
      ip: opts.consentIp,
      userAgent: opts.consentUserAgent,
    });

    await this._spawnSocket(String(session._id));

    return { sessionId: String(session._id), status: 'pending_qr' };
  }

  /**
   * Return the current state of a session. UI polls this while awaiting QR scan.
   */
  async getSessionState(sessionId) {
    const entry = this.sockets.get(sessionId);
    const session = await BaileysSession.findById(sessionId).lean();
    if (!session) return null;

    return {
      sessionId,
      status: session.status,
      qr: entry?.lastQr || null,
      qrDataUrl: entry?.lastQrDataUrl || null,
      deviceNumber: session.deviceNumber,
      deviceName: session.deviceName,
      newsletters: session.newsletters || [],
      lastError: session.lastError,
      lastConnectedAt: session.lastConnectedAt,
    };
  }

  /**
   * Fetch the newsletters (channels) this session administers and cache
   * them on the session document. Called automatically after a successful
   * connection; can be called again to refresh.
   */
  async listNewsletters(sessionId) {
    const entry = this.sockets.get(sessionId);
    if (!entry || !entry.sock) {
      throw new Error('Session not connected');
    }

    const sock = entry.sock;
    const newsletters = [];

    // Baileys exposes newsletters via sock.newsletterSubscribed() or via
    // querying the user's own newsletter list. The exact method varies
    // by version — we try both.
    try {
      if (typeof sock.newsletterSubscribed === 'function') {
        const subs = await sock.newsletterSubscribed();
        for (const n of subs || []) {
          newsletters.push({
            jid: n.id || n.jid,
            name: n.name || '',
            description: n.description || '',
            subscribers: n.subscribers_count || n.subscribers || 0,
            verification: n.verification || 'UNVERIFIED',
            inviteCode: n.invite || '',
            picture: n.preview || '',
            role: n.role || 'SUBSCRIBER',
          });
        }
      }
    } catch (err) {
      console.warn('[baileys] newsletterSubscribed failed:', err.message);
    }

    // Filter to only ones where the user is OWNER or ADMIN
    const administered = newsletters.filter(
      (n) => n.role === 'OWNER' || n.role === 'ADMIN'
    );

    const session = await BaileysSession.findByIdAndUpdate(
      sessionId,
      { $set: { newsletters: administered } },
      { new: true }
    );

    await WhatsAppAuditLog.record({
      usuarioId: session.usuarioId,
      sessionId,
      action: 'newsletter.list_fetched',
      summary: `Leídos ${administered.length} canales de WhatsApp`,
      data: { count: administered.length },
    });

    return administered;
  }

  /**
   * Fetch metadata for a specific newsletter by invite code. Works WITHOUT
   * the user being admin — the invite code is public-facing. Used by the
   * Tier 1 basic verification flow.
   */
  async getNewsletterMetadataByInvite(sessionId, inviteCode) {
    const entry = this.sockets.get(sessionId);
    if (!entry || !entry.sock) throw new Error('Session not connected');

    const sock = entry.sock;

    if (typeof sock.newsletterMetadata !== 'function') {
      throw new Error('newsletterMetadata not supported in this Baileys version');
    }

    const meta = await sock.newsletterMetadata('invite', inviteCode);

    const session = await BaileysSession.findById(sessionId);
    await WhatsAppAuditLog.record({
      usuarioId: session.usuarioId,
      sessionId,
      action: 'newsletter.metadata_fetched',
      summary: `Leído canal "${meta.name}" (${meta.subscribers_count || 0} seguidores)`,
      data: {
        jid: meta.id,
        name: meta.name,
        subscribers: meta.subscribers_count || 0,
        verification: meta.verification,
      },
    });

    return meta;
  }

  /**
   * Revoke a session. Clears credentials from DB and kills the socket.
   */
  async revokeSession(sessionId) {
    const session = await BaileysSession.findById(sessionId);
    if (!session) return;

    const entry = this.sockets.get(sessionId);
    if (entry?.sock) {
      try {
        await entry.sock.logout();
      } catch (_) {}
      try {
        entry.sock.end();
      } catch (_) {}
    }
    this.sockets.delete(sessionId);

    session.markRevoked('user_action');
    await session.save();

    await WhatsAppAuditLog.record({
      usuarioId: session.usuarioId,
      sessionId,
      action: 'session.revoked',
      summary: 'Sesión revocada por el usuario',
    });
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  async _spawnSocket(sessionId) {
    if (this.sockets.has(sessionId)) {
      return this.sockets.get(sessionId);
    }

    const baileys = loadBaileys();
    const {
      default: makeWASocket,
      fetchLatestBaileysVersion,
      DisconnectReason,
    } = baileys;

    const { state, saveCreds } = await useMongoAuthState(sessionId);

    // Get latest WA Web version (Baileys needs this to match the protocol)
    let version;
    try {
      const v = await fetchLatestBaileysVersion();
      version = v.version;
    } catch (_) {
      version = [2, 3000, 1015901307]; // fallback
    }

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ['ChannelAd Dashboard', 'Chrome', '1.0.0'],
      markOnlineOnConnect: false, // don't mess with the user's "online" status
      syncFullHistory: false,     // we don't need chat history
    });

    const entry = {
      sock,
      sessionId,
      lastQr: null,
      lastQrDataUrl: null,
    };
    this.sockets.set(sessionId, entry);

    // ─── Events ─────────────────────────────────────────────────────────────

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        entry.lastQr = qr;
        try {
          entry.lastQrDataUrl = await qrcode.toDataURL(qr, {
            margin: 1,
            width: 320,
            color: { dark: '#0D1117', light: '#FFFFFF' },
          });
        } catch (_) {
          entry.lastQrDataUrl = null;
        }

        const session = await BaileysSession.findById(sessionId);
        if (session) {
          await WhatsAppAuditLog.record({
            usuarioId: session.usuarioId,
            sessionId,
            action: 'session.qr_generated',
            summary: 'QR generado — esperando escaneo',
          });
        }
      }

      if (connection === 'open') {
        const session = await BaileysSession.findById(sessionId);
        if (session) {
          const user = sock.user || {};
          session.markConnected({
            number: (user.id || '').split(':')[0].split('@')[0],
            jid: user.id || '',
            name: user.name || user.verifiedName || '',
          });
          await session.save();

          await WhatsAppAuditLog.record({
            usuarioId: session.usuarioId,
            sessionId,
            action: 'session.connected',
            summary: `Conectado como ${user.name || user.id}`,
            data: { jid: user.id, name: user.name },
          });

          // Fetch newsletters in background — don't block
          this.listNewsletters(sessionId).catch((err) => {
            console.warn('[baileys] auto listNewsletters failed:', err.message);
          });
        }
      }

      if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode;
        const session = await BaileysSession.findById(sessionId);

        // If the user logged out from their phone OR we hit loggedOut,
        // mark as revoked and don't reconnect.
        if (reason === DisconnectReason?.loggedOut) {
          if (session && session.status !== 'revoked') {
            session.markRevoked('logged_out_from_phone');
            await session.save();
          }
          this.sockets.delete(sessionId);
          await WhatsAppAuditLog.record({
            usuarioId: session?.usuarioId,
            sessionId,
            action: 'session.disconnected',
            summary: 'Sesión cerrada desde el teléfono',
            success: false,
          });
          return;
        }

        // Otherwise, try to reconnect unless already revoked
        if (session && session.status !== 'revoked') {
          session.status = 'disconnected';
          await session.save();
          // Reconnect after a short delay
          setTimeout(() => {
            this.sockets.delete(sessionId);
            this._spawnSocket(sessionId).catch((err) => {
              console.error('[baileys] reconnect failed:', err.message);
            });
          }, 5000);
        }
      }
    });

    this._installShutdownHook();

    return entry;
  }

  _installShutdownHook() {
    if (this._shutdownHooked) return;
    this._shutdownHooked = true;

    const cleanup = () => {
      for (const [, entry] of this.sockets) {
        try {
          entry.sock?.end();
        } catch (_) {}
      }
      this.sockets.clear();
    };

    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
  }

  async shutdown() {
    for (const [id, entry] of this.sockets) {
      try {
        entry.sock?.end();
      } catch (_) {}
    }
    this.sockets.clear();
  }
}

module.exports = new BaileysSessionManager();
