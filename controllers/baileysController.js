/**
 * Baileys (WhatsApp Web) controller.
 *
 * Exposes HTTP endpoints for:
 *   - Starting a new linking flow (returns QR code)
 *   - Polling the session state (QR or connected)
 *   - Listing newsletters the user administers
 *   - Linking a newsletter to a Canal
 *   - Revoking a session
 *   - Reading the audit log
 *
 * All endpoints require authenticated users. The session manager runs
 * in-process, so on Vercel this endpoint is only useful for reading cached
 * state (newsletters previously fetched). To run full QR flows, deploy the
 * backend as a persistent Node process (VPS / Railway / Fly.io).
 */

'use strict';

const BaileysSession = require('../models/BaileysSession');
const WhatsAppAuditLog = require('../models/WhatsAppAuditLog');
const Canal = require('../models/Canal');

// Lazy-load the session manager because it requires baileys to be installed.
let _manager = null;
function getManager() {
  if (_manager) return _manager;
  try {
    _manager = require('../services/baileys/BaileysSessionManager');
  } catch (err) {
    throw new Error(`Baileys session manager unavailable: ${err.message}`);
  }
  return _manager;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    ''
  );
}

function clientUA(req) {
  return req.headers['user-agent'] || '';
}

async function assertOwnership(sessionId, userId) {
  const session = await BaileysSession.findById(sessionId);
  if (!session) {
    const err = new Error('Sesión no encontrada');
    err.status = 404;
    throw err;
  }
  if (String(session.usuarioId) !== String(userId)) {
    const err = new Error('No autorizado');
    err.status = 403;
    throw err;
  }
  return session;
}

// ─── Endpoints ───────────────────────────────────────────────────────────────

/**
 * POST /api/baileys/link/start
 * Body: { alias?, canalId?, consentVersion }
 *
 * Creates a new BaileysSession and spawns a socket. Returns the sessionId
 * immediately; the caller then polls GET /link/:sessionId for the QR.
 */
async function startLink(req, res) {
  try {
    const userId = req.usuario?.id || req.usuario?._id;
    if (!userId) return res.status(401).json({ success: false, message: 'No autorizado' });

    const { alias = '', canalId = null, consentAccepted } = req.body || {};

    if (consentAccepted !== true) {
      return res.status(400).json({
        success: false,
        message: 'Debes aceptar la política de acceso antes de vincular tu WhatsApp',
      });
    }

    const manager = getManager();
    const result = await manager.startLinking(userId, {
      alias: String(alias).slice(0, 80),
      canalId: canalId || null,
      consentIp: clientIp(req),
      consentUserAgent: clientUA(req),
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[baileys] startLink error:', err.message);
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/baileys/link/:sessionId
 * Returns the current state of the session (QR, connected, newsletters, etc.)
 */
async function getLinkState(req, res) {
  try {
    const userId = req.usuario?.id || req.usuario?._id;
    const { sessionId } = req.params;

    await assertOwnership(sessionId, userId);

    const manager = getManager();
    const state = await manager.getSessionState(sessionId);
    if (!state) return res.status(404).json({ success: false, message: 'Sesión no encontrada' });

    res.json({ success: true, ...state });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/baileys/sessions
 * List all sessions for the current user.
 */
async function listSessions(req, res) {
  try {
    const userId = req.usuario?.id || req.usuario?._id;
    const sessions = await BaileysSession.find({ usuarioId: userId })
      .select('-creds -keys')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/baileys/sessions/:sessionId/refresh-newsletters
 * Re-fetch the list of newsletters for a connected session.
 */
async function refreshNewsletters(req, res) {
  try {
    const userId = req.usuario?.id || req.usuario?._id;
    const { sessionId } = req.params;

    const session = await assertOwnership(sessionId, userId);
    if (session.status !== 'connected') {
      return res.status(409).json({
        success: false,
        message: `Sesión en estado ${session.status}. Debe estar conectada.`,
      });
    }

    const manager = getManager();
    const newsletters = await manager.listNewsletters(sessionId);
    res.json({ success: true, newsletters });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/baileys/sessions/:sessionId/refresh-groups
 * Re-fetch the WhatsApp groups for a connected session and evaluate which
 * ones are eligible for monetization.
 */
async function refreshGroups(req, res) {
  try {
    const userId = req.usuario?.id || req.usuario?._id;
    const { sessionId } = req.params;

    const session = await assertOwnership(sessionId, userId);
    if (session.status !== 'connected') {
      return res.status(409).json({
        success: false,
        message: `Sesión en estado ${session.status}. Debe estar conectada.`,
      });
    }

    const manager = getManager();
    const groups = await manager.listGroups(sessionId);
    res.json({
      success: true,
      groups,
      summary: {
        total: groups.length,
        apto: groups.filter((g) => g.apto).length,
        noApto: groups.filter((g) => !g.apto).length,
      },
    });
  } catch (err) {
    console.error('[baileys] refreshGroups error:', err);
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/baileys/sessions/:sessionId/link-canal
 * Body: { newsletterJid, canalId }
 *
 * Link a specific newsletter from this session to a Canal document, so
 * future metric polling knows which channel to read.
 */
async function linkNewsletterToCanal(req, res) {
  try {
    const userId = req.usuario?.id || req.usuario?._id;
    const { sessionId } = req.params;
    const { newsletterJid, canalId } = req.body || {};

    if (!newsletterJid || !canalId) {
      return res.status(400).json({ success: false, message: 'newsletterJid y canalId requeridos' });
    }

    const session = await assertOwnership(sessionId, userId);

    // Verify the newsletter is in this session's cached list
    const newsletter = (session.newsletters || []).find((n) => n.jid === newsletterJid);
    if (!newsletter) {
      return res.status(404).json({ success: false, message: 'Canal no encontrado en esta sesión' });
    }

    // Verify the canal belongs to the user
    const canal = await Canal.findById(canalId);
    if (!canal) return res.status(404).json({ success: false, message: 'Canal no encontrado' });
    if (String(canal.propietario) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'No autorizado sobre este canal' });
    }

    // Update the newsletter entry with the canal link
    await BaileysSession.updateOne(
      { _id: sessionId, 'newsletters.jid': newsletterJid },
      { $set: { 'newsletters.$.linkedToCanalId': canalId } }
    );

    const now = new Date();
    const isOwner = newsletter.role === 'OWNER';

    // ── Baileys ownership trust gate (BETA FREEZE — 2026-06-01) ─────────────
    // Invite/role-based WhatsApp ownership is NOT yet sound: `newsletter.role`
    // is resolved by matching the newsletter owner JID against the paired
    // account's number (BaileysSessionManager.js ~L142/L342), which breaks on
    // LID-vs-phone, and `viewer_metadata.role` is frequently absent. A public
    // invite + a wrong role read could therefore grant a channel the caller
    // does not actually administer full verified status (confianzaScore 95).
    //
    // Until the ownership redesign lands (see MANUAL_ACTIONS.md §B3) we still
    // link the newsletter for metric polling, but WITHHOLD the strong grant
    // (verified / admin_directo / 95 / oro·plata / auto-claim) unless an
    // operator explicitly opts back in via BAILEYS_TRUSTED_OWNERSHIP=true.
    const trustedOwnership = process.env.BAILEYS_TRUSTED_OWNERSHIP === 'true';

    // Always-applied: link the channel + refresh its metrics (harmless, and the
    // caller already owns the Canal doc — verified above at L229).
    canal.set({
      'botConfig.whatsapp.channelJid': newsletterJid,
      'botConfig.whatsapp.channelName': newsletter.name,
      'botConfig.whatsapp.verifiedByMeta': newsletter.verification === 'VERIFIED',
      'botConfig.whatsapp.baileysSessionId': sessionId,
      'botConfig.whatsapp.verificadoEn': now,
      'botConfig.whatsapp.seguidoresVerificados': newsletter.subscribers || 0,
      'estadisticas.seguidores': newsletter.subscribers || 0,
      'estadisticas.ultimaActualizacion': now,
      estado: 'activo',
    });

    if (trustedOwnership) {
      // Strong grant — opt-in only. OWNER → 'oro', ADMIN → 'plata'.
      canal.set({
        nivelVerificacion: isOwner ? 'oro' : 'plata',
        verificado: true,
        'verificacion.tipoAcceso': 'admin_directo',
        'verificacion.confianzaScore': 95,
      });
      // Claim is only set the first time — preserve the original claimer.
      if (!canal.claimed) {
        canal.claimed = true;
        canal.claimedBy = userId;
        canal.claimedAt = now;
        canal.claimToken = null;
      }
    } else if (!canal.verificado) {
      // BETA / FROZEN (default): soft-trust only, no verified ownership and no
      // auto-claim. Flags the channel for manual review via a low score. Never
      // DOWNGRADES a channel already verified by a stronger path (Telegram
      // MTProto, OAuth) — those keep their existing verification.
      canal.set({
        'verificacion.tipoAcceso': 'declarado',
        'verificacion.confianzaScore': 30,
      });
    }

    await canal.save();

    await WhatsAppAuditLog.record({
      usuarioId: userId,
      sessionId,
      canalId,
      action: 'newsletter.linked_to_canal',
      summary: `Canal "${newsletter.name}" vinculado a ChannelAd (${newsletter.subscribers || 0} seguidores)${trustedOwnership ? '' : ' [beta: sin verificación de propiedad]'}`,
      data: {
        newsletterJid,
        subscribers: newsletter.subscribers,
        role: newsletter.role,
        trustedOwnership,
      },
      ip: clientIp(req),
      userAgent: clientUA(req),
    });

    res.json({
      success: true,
      beta: !trustedOwnership,
      canal: { id: canal._id, nombre: canal.nombreCanal },
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/baileys/sessions/:sessionId/newsletter-by-invite
 * Body: { invite }  (raw code or full https://whatsapp.com/channel/<code> URL)
 *
 * Fallback for when the synced chat list doesn't surface the user's channel
 * (WhatsApp doesn't always deliver @newsletter chats with syncFullHistory off).
 * Resolves the channel by its public invite link via newsletterMetadata, and
 * if the connected user is its OWNER/ADMIN, adds it to the session so it can
 * be linked like an auto-detected one.
 */
async function addNewsletterByInvite(req, res) {
  try {
    const userId = req.usuario?.id || req.usuario?._id;
    const { sessionId } = req.params;
    const { invite } = req.body || {};

    if (!invite) {
      return res.status(400).json({ success: false, message: 'Falta el enlace del canal' });
    }

    const session = await assertOwnership(sessionId, userId);
    if (session.status !== 'connected') {
      return res.status(409).json({
        success: false,
        message: `Sesión en estado ${session.status}. Debe estar conectada.`,
      });
    }

    const manager = getManager();
    const { newsletter, administered } = await manager.getNewsletterMetadataByInvite(sessionId, invite);

    if (!administered) {
      return res.status(403).json({
        success: false,
        message: `Encontramos "${newsletter.name}" pero no figuras como administrador/propietario. Solo puedes vincular canales que administras.`,
        data: { newsletter },
      });
    }

    return res.json({ success: true, newsletter });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

/**
 * DELETE /api/baileys/sessions/:sessionId
 * Revoke a session and clear its credentials.
 */
async function revokeSession(req, res) {
  try {
    const userId = req.usuario?.id || req.usuario?._id;
    const { sessionId } = req.params;

    await assertOwnership(sessionId, userId);

    const manager = getManager();
    await manager.revokeSession(sessionId);

    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/baileys/audit
 * List audit log entries for the current user, optionally filtered.
 *
 * Query: ?sessionId=&canalId=&action=&limit=&offset=
 */
async function listAuditLog(req, res) {
  try {
    const userId = req.usuario?.id || req.usuario?._id;
    const { sessionId, canalId, action } = req.query;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const filter = { usuarioId: userId };
    if (sessionId) filter.sessionId = sessionId;
    if (canalId) filter.canalId = canalId;
    if (action) filter.action = action;

    const [entries, total] = await Promise.all([
      WhatsAppAuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      WhatsAppAuditLog.countDocuments(filter),
    ]);

    res.json({ success: true, entries, total, limit, offset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  startLink,
  getLinkState,
  listSessions,
  refreshNewsletters,
  refreshGroups,
  linkNewsletterToCanal,
  addNewsletterByInvite,
  revokeSession,
  listAuditLog,
};
