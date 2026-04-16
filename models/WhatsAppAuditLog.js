/**
 * WhatsAppAuditLog
 *
 * Append-only record of every query/action ChannelAd performs against a
 * linked WhatsApp session. Users can see this log in their dashboard and
 * export it. This is the "trust instrument" of the WhatsApp integration:
 * if we ever read something we shouldn't, it's visible here.
 *
 * Entries are immutable — never update or delete except via TTL (365 days).
 */

const mongoose = require('mongoose');

const ACTIONS = [
  'session.created',
  'session.qr_generated',
  'session.connected',
  'session.disconnected',
  'session.revoked',
  'session.error',
  'newsletter.list_fetched',
  'newsletter.metadata_fetched',
  'newsletter.subscribers_fetched',
  'newsletter.post_metrics_fetched',
  'newsletter.linked_to_canal',
  'newsletter.unlinked_from_canal',
  'post.published',
  'consent.accepted',
  'consent.withdrawn',
];

const WhatsAppAuditLogSchema = new mongoose.Schema(
  {
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      index: true,
    },

    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BaileysSession',
      default: null,
      index: true,
    },

    canalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Canal',
      default: null,
    },

    action: {
      type: String,
      enum: ACTIONS,
      required: true,
      index: true,
    },

    // Human-readable summary shown in the UI ("Leído 15.234 seguidores de 'Tech News ES'")
    summary: { type: String, default: '' },

    // Structured metadata — the specific values read/written.
    // Keep this small: target id, counts, flags — never message bodies or PII.
    data: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Whether this action succeeded or failed
    success: { type: Boolean, default: true, index: true },
    errorMessage: { type: String, default: '' },

    // Request context (who, from where)
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },

    // TTL — audit log entries auto-delete after 365 days
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

WhatsAppAuditLogSchema.index({ usuarioId: 1, createdAt: -1 });
WhatsAppAuditLogSchema.index({ sessionId: 1, createdAt: -1 });

/**
 * Create an audit log entry. Non-blocking — failures are logged but don't
 * throw, so the calling operation can always proceed.
 */
WhatsAppAuditLogSchema.statics.record = async function (entry) {
  try {
    const doc = await this.create({
      usuarioId: entry.usuarioId,
      sessionId: entry.sessionId || null,
      canalId: entry.canalId || null,
      action: entry.action,
      summary: entry.summary || '',
      data: entry.data || {},
      success: entry.success !== false,
      errorMessage: entry.errorMessage || '',
      ip: entry.ip || '',
      userAgent: entry.userAgent || '',
    });
    return doc;
  } catch (err) {
    console.error('[WhatsAppAuditLog] Failed to record:', err.message);
    return null;
  }
};

WhatsAppAuditLogSchema.statics.ACTIONS = ACTIONS;

module.exports =
  mongoose.models.WhatsAppAuditLog ||
  mongoose.model('WhatsAppAuditLog', WhatsAppAuditLogSchema);
