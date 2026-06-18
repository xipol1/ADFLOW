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
 *   - getSessionState(sessionId)      → { status, qr, deviceNumber, newsletters, groups }
 *   - listNewsletters(sessionId)      → [{ jid, name, subscribers, ... }]
 *   - listGroups(sessionId)           → [{ jid, name, participantsCount, isAdmin, apto, ... }]
 *   - getNewsletterMetadata(sessionId, jid)
 *   - revokeSession(sessionId)
 *   - shutdown()
 */

'use strict';

const qrcode = require('qrcode');
const { useMongoAuthState, loadBaileys } = require('./authStore');
const BaileysSession = require('../../models/BaileysSession');
const WhatsAppAuditLog = require('../../models/WhatsAppAuditLog');
const Canal = require('../../models/Canal');
const { asDisplayName, asDisplayText } = require('./displayName');
const { resolveNewsletterRole } = require('./newsletterRole');

// Pending QR sessions older than this with no successful scan are swept by
// cleanupStalePendingSessions() — see the wired-up cron in app.js.
const PENDING_QR_MAX_AGE_MS = 30 * 60 * 1000; // 30 min

// Aptitude thresholds — channels must clear these to be considered
// monetizable. Tuned conservatively; revisit with sales data.
const APTO_MIN_PARTICIPANTS = 200;

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
      groups: session.groups || [],
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

    // Baileys 7.x has NO "list my newsletters" RPC (the old
    // sock.newsletterSubscribed() never existed in this version — that was
    // the bug that made every scan report 0 channels). Instead we resolve
    // each @newsletter JID discovered from the synced chat list
    // (entry.newsletterJids, populated by the messaging-history.set handler)
    // via newsletterMetadata('jid', jid), which returns name, subscribers,
    // verification and the owner JID.
    const userJid = String(sock.user?.id || '');
    const userNum = userJid.split('@')[0].split(':')[0]; // phone, no device/server
    const userLidNum = String(sock.user?.lid || '').split('@')[0].split(':')[0];
    const jids = Array.from(entry.newsletterJids || []);

    for (const jid of jids) {
      try {
        const meta = await sock.newsletterMetadata('jid', jid);
        if (!meta) continue;

        // The by-JID payload carries the viewer's role in viewer_metadata.role.
        // Prefer it; only if absent, infer OWNER by matching the newsletter
        // owner JID against the connected account — checked against BOTH the
        // phone number and the LID (WhatsApp may expose either). Anything else
        // stays SUBSCRIBER and is filtered out (can't claim a channel you don't
        // administer).
        const tm = meta.thread_metadata || {};
        const role = resolveNewsletterRole(meta, null, { userNum, userLidNum });

        newsletters.push({
          jid: meta.id || jid,
          name: asDisplayName(tm.name, meta.name, meta.thread_metadata?.name),
          description: asDisplayText(tm.description, meta.description, meta.thread_metadata?.description),
          subscribers: Number(tm.subscribers_count ?? meta.subscribers ?? meta.subscribers_count ?? 0) || 0,
          verification: tm.verification || meta.verification || 'UNVERIFIED',
          inviteCode: tm.invite || meta.invite || '',
          picture: meta.picture?.url || '',
          role,
        });
      } catch (err) {
        console.warn(`[baileys] newsletterMetadata failed for ${jid}:`, err.message);
      }
    }

    // Filter to only ones where the user is OWNER or ADMIN
    const administered = newsletters.filter(
      (n) => n.role === 'OWNER' || n.role === 'ADMIN'
    );

    // Verbose log so a live re-scan tells us exactly what was found vs kept.
    console.log(`[baileys] listNewsletters session=${sessionId}: ${jids.length} jids → ${newsletters.length} resolved → ${administered.length} administered`,
      newsletters.map(n => ({ name: n.name, role: n.role, subs: n.subscribers })));

    const session = await BaileysSession.findByIdAndUpdate(
      sessionId,
      { $set: { newsletters: administered } },
      { new: true }
    );

    await WhatsAppAuditLog.record({
      usuarioId: session.usuarioId,
      sessionId,
      action: 'newsletter.list_fetched',
      summary: `Leídos ${administered.length}/${newsletters.length} canales de WhatsApp (${jids.length} jids)`,
      data: { administered: administered.length, resolved: newsletters.length, jids: jids.length },
    });

    return administered;
  }

  /**
   * Fetch the WhatsApp groups (community chats) the user participates in.
   * Each group is evaluated against monetization criteria so the UI can
   * surface an "apto / no apto" verdict next to it.
   *
   * Eligibility (apto = true) requires:
   *   - user is admin or superadmin in the group
   *   - participantsCount >= APTO_MIN_PARTICIPANTS
   *   - not an announcement-only group (those should be Newsletters instead)
   */
  async listGroups(sessionId) {
    const entry = this.sockets.get(sessionId);
    if (!entry || !entry.sock) {
      throw new Error('Session not connected');
    }

    const sock = entry.sock;
    const groups = [];

    let raw = {};
    try {
      if (typeof sock.groupFetchAllParticipating === 'function') {
        raw = (await sock.groupFetchAllParticipating()) || {};
      }
    } catch (err) {
      console.warn('[baileys] groupFetchAllParticipating failed:', err.message);
      raw = {};
    }

    const meJid = (sock.user?.id || '').split(':')[0] + '@s.whatsapp.net';
    const meLid = sock.user?.lid || '';

    for (const jid of Object.keys(raw)) {
      const g = raw[jid] || {};
      const participants = Array.isArray(g.participants) ? g.participants : [];
      const me = participants.find(
        (p) => p.id === meJid || (meLid && p.id === meLid) || p.id === sock.user?.id
      );
      const isAdmin = !!me && (me.admin === 'admin' || me.admin === 'superadmin');
      const isAnnounce = !!g.announce;
      const count = participants.length || g.size || 0;

      const { apto, reasons } = this._evaluateGroupAptitude({
        isAdmin,
        isAnnounce,
        count,
      });

      groups.push({
        jid,
        name: asDisplayText(g.subject),
        description: asDisplayText(g.desc),
        participantsCount: count,
        isAdmin,
        isAnnounce,
        creationDate: g.creation ? new Date(g.creation * 1000) : null,
        picture: '',
        apto,
        aptoReasons: reasons,
      });
    }

    groups.sort((a, b) => {
      if (a.apto !== b.apto) return a.apto ? -1 : 1;
      return (b.participantsCount || 0) - (a.participantsCount || 0);
    });

    const session = await BaileysSession.findByIdAndUpdate(
      sessionId,
      { $set: { groups } },
      { new: true }
    );

    await WhatsAppAuditLog.record({
      usuarioId: session.usuarioId,
      sessionId,
      action: 'groups.list_fetched',
      summary: `Leídos ${groups.length} grupos (${groups.filter((g) => g.apto).length} aptos)`,
      data: {
        total: groups.length,
        apto: groups.filter((g) => g.apto).length,
      },
    });

    return groups;
  }

  /**
   * Pure helper — apply the aptitude rules without side effects so it's
   * easy to unit-test and to tweak the thresholds in one place.
   */
  _evaluateGroupAptitude({ isAdmin, isAnnounce, count }) {
    const reasons = [];
    if (!isAdmin) reasons.push('No eres administrador del grupo');
    if (count < APTO_MIN_PARTICIPANTS) {
      reasons.push(`Tiene ${count} miembros — mínimo ${APTO_MIN_PARTICIPANTS} para monetizar`);
    }
    if (isAnnounce) {
      reasons.push('Grupo solo-anuncios — conviértelo en Canal (Newsletter) para Channelad');
    }

    const apto = isAdmin && count >= APTO_MIN_PARTICIPANTS && !isAnnounce;
    if (apto) reasons.push(`Cumple criterios: eres admin y tiene ${count} miembros`);

    return { apto, reasons };
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

    // Accept a raw code or a full invite URL
    //   https://whatsapp.com/channel/<code>  →  <code>
    const code = String(inviteCode || '').trim().split('?')[0].split('/').filter(Boolean).pop();
    if (!code) throw new Error('Código de invitación inválido');

    const meta = await sock.newsletterMetadata('invite', code);
    if (!meta) throw new Error('No se encontró ningún canal con ese enlace');

    // Resolving by INVITE returns public metadata with `viewer_metadata: null`,
    // so the viewer's role is absent and a naive read mislabels OWNERs as
    // SUBSCRIBERs (the root cause of the ownership beta-freeze). Re-query the
    // SAME channel by its JID, which DOES carry `viewer_metadata.role`
    // (OWNER / ADMIN / SUBSCRIBER), and use that payload as the authoritative
    // source for both the role and the metadata fields.
    const jid = meta.id || meta.jid;
    const byJid = jid
      ? await sock.newsletterMetadata('jid', jid).catch((e) => {
          console.warn(`[baileys] byJid metadata failed for ${jid}:`, e.message);
          return null;
        })
      : null;
    const src = byJid || meta;
    const tm = src.thread_metadata || meta.thread_metadata || {};

    // Determine the viewer's role. Prefer the explicit viewer role from the
    // by-JID payload; only if absent, fall back to matching the owner JID
    // against the connected account — checked against BOTH the phone number
    // and the LID, since WhatsApp may expose the owner by either identity
    // (the LID-vs-phone mismatch that previously broke this).
    const userNum = String(sock.user?.id || '').split('@')[0].split(':')[0];
    const userLidNum = String(sock.user?.lid || '').split('@')[0].split(':')[0];
    const role = resolveNewsletterRole(src, meta, { userNum, userLidNum });
    const ownerJid = src.owner || meta.owner;

    const newsletter = {
      jid: src.id || meta.id,
      name: asDisplayName(tm.name, meta.name, meta.thread_metadata?.name),
      description: asDisplayText(tm.description, meta.description, meta.thread_metadata?.description),
      subscribers: Number(tm.subscribers_count ?? src.subscribers ?? meta.subscribers ?? meta.subscribers_count ?? 0) || 0,
      verification: tm.verification || src.verification || meta.verification || 'UNVERIFIED',
      inviteCode: tm.invite || meta.invite || code,
      picture: src.picture?.url || meta.picture?.url || '',
      role,
    };

    const session = await BaileysSession.findById(sessionId);

    // If the user administers it, upsert into session.newsletters so the
    // picker shows it and link-canal will accept it. Dedupe by jid.
    const administered = role === 'OWNER' || role === 'ADMIN';
    if (administered) {
      const existing = (session.newsletters || []).filter((n) => n.jid !== newsletter.jid);
      session.newsletters = [...existing, newsletter];
      await session.save();
    }

    await WhatsAppAuditLog.record({
      usuarioId: session.usuarioId,
      sessionId,
      action: 'newsletter.metadata_fetched',
      summary: `Leído canal "${newsletter.name}" (${newsletter.subscribers} seguidores, rol ${role})`,
      data: { jid: newsletter.jid, name: newsletter.name, subscribers: newsletter.subscribers, role, administered },
    });

    console.log(`[baileys] getNewsletterMetadataByInvite session=${sessionId}: name="${newsletter.name}" role=${role} administered=${administered} subs=${newsletter.subscribers} | byJidRole=${byJid?.viewer_metadata?.role || '?'} inviteRole=${meta.viewer_metadata?.role || '?'} owner=${ownerJid || '?'} userNum=${userNum} userLid=${userLidNum}`);

    return { newsletter, administered };
  }

  /**
   * Revoke a session. Clears credentials from DB and kills the socket.
   *
   * Cascade: any Canal whose `botConfig.whatsapp.baileysSessionId` points at
   * this session is demoted back to a non-verified state — keeping a canal
   * marked as `verificado` with a dead session breaks the trust contract
   * with advertisers ("can the seller still post here?"). We log one audit
   * entry per affected canal so the user has a paper trail.
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

    // Demote any canales that were trusting this session.
    try {
      const affected = await Canal.find({
        'botConfig.whatsapp.baileysSessionId': sessionId,
      }).select('_id nombreCanal verificado nivelVerificacion');

      for (const canal of affected) {
        canal.set({
          verificado: false,
          nivelVerificacion: 'bronce',
          'verificacion.tipoAcceso': 'declarado',
          'verificacion.confianzaScore': 30,
          'botConfig.whatsapp.verifiedByMeta': false,
          'botConfig.whatsapp.baileysSessionId': null,
        });
        await canal.save();

        await WhatsAppAuditLog.record({
          usuarioId: session.usuarioId,
          sessionId,
          canalId: canal._id,
          action: 'canal.demoted_on_revoke',
          summary: `Canal "${canal.nombreCanal}" degradado tras revocar sesión WhatsApp`,
          data: { previousLevel: canal.nivelVerificacion },
        });
      }
    } catch (err) {
      console.error('[baileys] revokeSession cascade failed:', err.message);
    }
  }

  /**
   * Sweep abandoned pending_qr sessions. Returns the number of sessions
   * marked as expired. Safe to call repeatedly (idempotent).
   *
   * Intended to be wired to a cron — e.g. every 10 minutes. Without this,
   * sockets opened by users who never scan accumulate forever.
   */
  async cleanupStalePendingSessions(maxAgeMs = PENDING_QR_MAX_AGE_MS) {
    const cutoff = new Date(Date.now() - maxAgeMs);
    const stale = await BaileysSession.find({
      status: 'pending_qr',
      createdAt: { $lt: cutoff },
    }).select('_id usuarioId');

    let expired = 0;
    for (const s of stale) {
      const sessionId = String(s._id);
      const entry = this.sockets.get(sessionId);
      if (entry?.sock) {
        try { entry.sock.end(); } catch (_) {}
      }
      this.sockets.delete(sessionId);

      await BaileysSession.findByIdAndUpdate(sessionId, {
        $set: { status: 'expired', lastError: 'pending_qr_timeout' },
      });

      await WhatsAppAuditLog.record({
        usuarioId: s.usuarioId,
        sessionId,
        action: 'session.expired',
        summary: 'Sesión expirada — QR no escaneado a tiempo',
      });
      expired++;
    }
    return expired;
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  async _spawnSocket(sessionId) {
    if (this.sockets.has(sessionId)) {
      return this.sockets.get(sessionId);
    }

    // Defensive guard — never reopen a socket for a session that the user
    // already revoked, that was forcibly expired, or that doesn't exist.
    // This closes a race where a `connection.close` reconnect timeout fires
    // after `revokeSession()` ran in the same 5s window.
    const guard = await BaileysSession.findById(sessionId)
      .select('status usuarioId')
      .lean();
    if (!guard) {
      return null;
    }
    if (guard.status === 'revoked' || guard.status === 'expired') {
      await WhatsAppAuditLog.record({
        usuarioId: guard.usuarioId,
        sessionId,
        action: 'session.reconnect_skipped',
        summary: `Reconexión abortada — sesión ${guard.status}`,
      });
      return null;
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
      // Newsletter JIDs discovered from the synced chat list. Baileys 7.x has
      // no "list my newsletters" RPC — the only way to enumerate them is to
      // read the @newsletter chats delivered in messaging-history.set, then
      // resolve each via newsletterMetadata(). Collected here as they arrive.
      newsletterJids: new Set(),
    };
    this.sockets.set(sessionId, entry);

    // ─── Events ─────────────────────────────────────────────────────────────

    sock.ev.on('creds.update', saveCreds);

    // The initial app-state sync delivers the user's chat list (even with
    // syncFullHistory:false). Newsletter chats have JIDs ending in
    // '@newsletter'. We stash them so listNewsletters() can resolve metadata.
    sock.ev.on('messaging-history.set', ({ chats }) => {
      try {
        let added = 0;
        for (const c of chats || []) {
          const id = c?.id;
          if (typeof id === 'string' && id.endsWith('@newsletter')) {
            if (!entry.newsletterJids.has(id)) { entry.newsletterJids.add(id); added++; }
          }
        }
        if (added > 0) {
          console.log(`[baileys] messaging-history.set: +${added} newsletter jids (total ${entry.newsletterJids.size}) session=${sessionId}`);
        }
      } catch (err) {
        console.warn('[baileys] messaging-history.set handler error:', err.message);
      }
    });

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

          // Fetch newsletters AND groups in background — don't block.
          // messaging-history.set (which feeds entry.newsletterJids) arrives
          // a few seconds AFTER 'open', so retry listNewsletters a few times
          // with backoff until JIDs show up, instead of running it once too
          // early and reporting 0.
          (async () => {
            for (let attempt = 1; attempt <= 5; attempt++) {
              await new Promise((r) => setTimeout(r, attempt * 2000)); // 2s,4s,6s,8s,10s
              const e = this.sockets.get(sessionId);
              if (!e) return; // session gone
              try {
                const found = await this.listNewsletters(sessionId);
                // Stop early once we have at least one administered newsletter,
                // or after the chat list has clearly finished syncing (we saw
                // jids but none administered → no point retrying).
                if (found.length > 0) break;
                if (e.newsletterJids.size > 0 && attempt >= 2) break;
              } catch (err) {
                console.warn(`[baileys] auto listNewsletters attempt ${attempt} failed:`, err.message);
              }
            }
          })();
          this.listGroups(sessionId).catch((err) => {
            console.warn('[baileys] auto listGroups failed:', err.message);
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
    for (const [, entry] of this.sockets) {
      try {
        entry.sock?.end();
      } catch (_) {}
    }
    this.sockets.clear();
  }
}

module.exports = new BaileysSessionManager();
