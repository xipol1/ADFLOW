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

    // Update the canal with the verified data from WhatsApp
    canal.set({
      'botConfig.whatsapp.channelJid': newsletterJid,
      'botConfig.whatsapp.channelName': newsletter.name,
      'botConfig.whatsapp.verifiedByMeta': newsletter.verification === 'VERIFIED',
      'botConfig.whatsapp.baileysSessionId': sessionId,
      'botConfig.whatsapp.verificadoEn': new Date(),
      'estadisticas.seguidores': newsletter.subscribers || 0,
      'estadisticas.ultimaActualizacion': new Date(),
      nivelVerificacion: newsletter.role === 'OWNER' ? 'oro' : 'plata',
      estado: 'activo',
    });
    await canal.save();

    await WhatsAppAuditLog.record({
      usuarioId: userId,
      sessionId,
      canalId,
      action: 'newsletter.linked_to_canal',
      summary: `Canal "${newsletter.name}" vinculado a ChannelAd (${newsletter.subscribers || 0} seguidores)`,
      data: {
        newsletterJid,
        subscribers: newsletter.subscribers,
        role: newsletter.role,
      },
      ip: clientIp(req),
      userAgent: clientUA(req),
    });

    res.json({ success: true, canal: { id: canal._id, nombre: canal.nombreCanal } });
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
  linkNewsletterToCanal,
  revokeSession,
  listAuditLog,
};
