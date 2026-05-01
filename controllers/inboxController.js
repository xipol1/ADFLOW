const Campaign = require('../models/Campaign');
const Notificacion = require('../models/Notificacion');
const Dispute = require('../models/Dispute');
const database = require('../config/database');

const HARD_LIMIT = 100;

/**
 * Aggregates everything that needs the user's attention into one feed:
 *
 *   - DRAFT campaigns waiting for payment (advertiser)
 *   - PUBLISHED campaigns ready to release escrow (advertiser)
 *   - Open disputes the user is involved in
 *   - Unread notifications
 *
 * Returns each item with a normalized shape so the frontend can render
 * them in a single timeline-style list.
 */
const getInbox = async (req, res) => {
  try {
    if (!database.estaConectado()) await database.conectar();
    const userId = req.usuario.id;
    const role = req.usuario.rol || 'advertiser';

    // The inbox is currently advertiser-only. Creators and admins get an
    // empty payload — never an unscoped Campaign.find() (would leak global
    // campaigns). When/if we build a creator inbox, we'll add a creator
    // branch that scopes by Channel.createdBy or similar.
    if (role !== 'advertiser') {
      return res.json({ success: true, data: { items: [], counts: { total: 0 } } });
    }

    // Fan out the queries in parallel — each fail-soft so a single broken
    // collection doesn't kill the whole inbox.
    const [campaigns, disputes, notifs] = await Promise.all([
      Campaign.find({ advertiser: userId, status: { $in: ['DRAFT', 'PUBLISHED', 'DISPUTED'] } })
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(40)
        .populate('channel', 'nombreCanal plataforma')
        .lean()
        .catch(err => { console.error('inbox.campaigns failed:', err.message); return [] }),

      Dispute.find({
        $or: [{ openedBy: userId }, { againstUser: userId }],
        status: { $in: ['open', 'under_review'] },
      })
        .sort({ updatedAt: -1 })
        .limit(20)
        .populate('campaign', 'content status')
        .lean()
        .catch(err => { console.error('inbox.disputes failed:', err.message); return [] }),

      Notificacion.find({
        usuario: userId,
        leida: false,
        archivada: false,
      })
        .sort({ createdAt: -1 })
        .limit(40)
        .lean()
        .catch(err => { console.error('inbox.notifications failed:', err.message); return [] }),
    ]);

    const items = [];

    // ── Draft campaigns ─ pending payment ────────────────────────────────────
    campaigns
      .filter(c => c.status === 'DRAFT')
      .forEach(c => items.push({
        id: `draft-${c._id}`,
        source: 'campaign',
        kind: 'payment_pending',
        severity: 'warn',
        title: 'Campaña pendiente de pago',
        description: c.content?.slice(0, 80) || 'Campaña sin contenido',
        channelName: c.channel?.nombreCanal || '',
        amount: c.price,
        ctaLabel: 'Pagar',
        ctaPath: `/advertiser/campaigns?tab=borrador&campaign=${c._id}`,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt || c.createdAt,
      }));

    // ── Published, awaiting confirmation to release escrow ───────────────────
    campaigns
      .filter(c => c.status === 'PUBLISHED')
      .forEach(c => items.push({
        id: `release-${c._id}`,
        source: 'campaign',
        kind: 'escrow_release',
        severity: 'info',
        title: 'Campaña lista para liberar pago',
        description: c.content?.slice(0, 80) || 'Campaña publicada',
        channelName: c.channel?.nombreCanal || '',
        amount: c.price,
        ctaLabel: 'Liberar',
        ctaPath: `/advertiser/campaigns?tab=publicada&campaign=${c._id}`,
        createdAt: c.publishedAt || c.updatedAt || c.createdAt,
        updatedAt: c.updatedAt || c.createdAt,
      }));

    // ── Disputed campaigns ──────────────────────────────────────────────────
    campaigns
      .filter(c => c.status === 'DISPUTED')
      .forEach(c => items.push({
        id: `disputed-${c._id}`,
        source: 'campaign',
        kind: 'campaign_disputed',
        severity: 'error',
        title: 'Campaña en disputa',
        description: c.content?.slice(0, 80) || 'Campaña en disputa',
        channelName: c.channel?.nombreCanal || '',
        amount: c.price,
        ctaLabel: 'Ver disputa',
        ctaPath: `/advertiser/campaigns?campaign=${c._id}`,
        createdAt: c.updatedAt || c.createdAt,
        updatedAt: c.updatedAt || c.createdAt,
      }));

    // ── Disputes where the user is involved ─────────────────────────────────
    disputes.forEach(d => items.push({
      id: `dispute-${d._id}`,
      source: 'dispute',
      kind: 'dispute_active',
      severity: d.status === 'under_review' ? 'warn' : 'error',
      title: d.status === 'under_review' ? 'Disputa en revisión' : 'Disputa abierta',
      description: d.description?.slice(0, 100) || `Razón: ${d.reason}`,
      ctaLabel: 'Ver detalle',
      ctaPath: `/advertiser/campaigns?dispute=${d._id}`,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt || d.createdAt,
    }));

    // ── Unread notifications ────────────────────────────────────────────────
    notifs.forEach(n => items.push({
      id: `notif-${n._id}`,
      source: 'notification',
      kind: n.tipo || 'notification',
      severity: n.prioridad === 'alta' ? 'warn' : 'info',
      title: n.titulo || 'Nueva notificación',
      description: n.mensaje || '',
      ctaLabel: 'Ver',
      ctaPath: n.metadata?.url || '/advertiser',
      createdAt: n.createdAt,
      updatedAt: n.updatedAt || n.createdAt,
      notificationId: String(n._id),
    }));

    // Sort by recency (most recent first), cap to HARD_LIMIT
    items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    const sliced = items.slice(0, HARD_LIMIT);

    // Group counts (for header bell badge / inbox tab counts)
    const counts = {
      total: sliced.length,
      payment_pending: sliced.filter(i => i.kind === 'payment_pending').length,
      escrow_release: sliced.filter(i => i.kind === 'escrow_release').length,
      disputes: sliced.filter(i => i.source === 'dispute' || i.kind === 'campaign_disputed').length,
      notifications: sliced.filter(i => i.source === 'notification').length,
    };

    return res.json({ success: true, data: { items: sliced, counts } });
  } catch (e) {
    console.error('inboxController.getInbox failed:', e);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

/**
 * Quick count endpoint for the header bell badge — much cheaper than full
 * aggregation. Counts campaigns + disputes + unread notifs.
 */
const getInboxCount = async (req, res) => {
  try {
    if (!database.estaConectado()) await database.conectar();
    const userId = req.usuario.id;
    const role = req.usuario.rol || 'advertiser';

    // Same scope as getInbox: advertiser-only feature.
    if (role !== 'advertiser') {
      return res.json({ success: true, data: { total: 0, payment_pending: 0, escrow_release: 0, disputes: 0, notifications: 0 } });
    }

    const [drafts, releases, disputes, unread] = await Promise.all([
      Campaign.countDocuments({ advertiser: userId, status: 'DRAFT' }).catch(() => 0),
      Campaign.countDocuments({ advertiser: userId, status: 'PUBLISHED' }).catch(() => 0),
      Dispute.countDocuments({
        $or: [{ openedBy: userId }, { againstUser: userId }],
        status: { $in: ['open', 'under_review'] },
      }).catch(() => 0),
      Notificacion.countDocuments({ usuario: userId, leida: false, archivada: false }).catch(() => 0),
    ]);

    const total = drafts + releases + disputes + unread;
    return res.json({
      success: true,
      data: { total, payment_pending: drafts, escrow_release: releases, disputes, notifications: unread },
    });
  } catch (e) {
    console.error('inboxController.getInboxCount failed:', e);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

module.exports = {
  getInbox,
  getInboxCount,
};
