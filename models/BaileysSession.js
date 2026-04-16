/**
 * BaileysSession
 *
 * Stores per-user WhatsApp Web multi-device auth state.
 * Each document is one linked "device" (in WhatsApp's terms) for one user.
 *
 * Creds and keys are stored as Buffers (encoded to base64 for Mongo) because
 * Baileys uses raw cryptographic material that won't survive JSON coercion.
 *
 * Lifecycle:
 *   1. User requests link → document created with status='pending_qr'
 *   2. QR scanned → Baileys fires 'creds.update' → status='authenticated'
 *   3. WhatsApp confirms connection → status='connected' + deviceNumber populated
 *   4. User revokes from phone OR we unlink → status='revoked'
 *   5. Session expires (14 days phone offline) → status='expired'
 */

const mongoose = require('mongoose');

const BaileysSessionSchema = new mongoose.Schema(
  {
    // ─── Owner ────────────────────────────────────────────────────────────
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      index: true,
    },

    // Optional: if this session is bound to a specific canal (for creators).
    // Agencies use one session for many canales so this stays null for them.
    canalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Canal',
      default: null,
      index: true,
    },

    // Human-readable alias the user sets ("Cliente A — Tech News ES")
    alias: { type: String, default: '' },

    // ─── State ────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['pending_qr', 'authenticated', 'connected', 'disconnected', 'expired', 'revoked', 'error'],
      default: 'pending_qr',
      index: true,
    },

    // Which WhatsApp number this session represents (populated post-scan)
    deviceNumber: { type: String, default: '' },

    // WhatsApp JID of the logged-in account ("5493411234567@s.whatsapp.net")
    deviceJid: { type: String, default: '' },

    // Push name from WhatsApp
    deviceName: { type: String, default: '' },

    // Last error if status === 'error'
    lastError: { type: String, default: '' },

    // ─── Auth state (the sensitive part) ──────────────────────────────────
    // Baileys produces two structures: `creds` (small, one object) and `keys`
    // (many small objects keyed by type+id). We store both encoded as JSON
    // with Buffer → base64 conversion so Mongo can store them.
    //
    // Creds: the persistent credentials (identity key, signed pre-key, etc.)
    creds: { type: mongoose.Schema.Types.Mixed, default: null },

    // Keys: a map of { [type]: { [id]: Buffer } }
    // Stored as nested object with base64 values.
    keys: { type: mongoose.Schema.Types.Mixed, default: {} },

    // ─── Consent and audit ────────────────────────────────────────────────
    consentAcceptedAt: { type: Date, default: null },
    consentVersion: { type: String, default: 'v1.0' },
    consentIp: { type: String, default: '' },
    consentUserAgent: { type: String, default: '' },

    // ─── Timestamps ───────────────────────────────────────────────────────
    lastConnectedAt: { type: Date, default: null },
    lastActivityAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },

    // Newsletters (channels) this user administers, fetched after connection
    // Cached so the UI can render the picker without re-querying WhatsApp.
    newsletters: {
      type: [
        {
          jid: String,               // "120363282083849178@newsletter"
          name: String,
          description: String,
          subscribers: Number,
          verification: String,      // "VERIFIED" | "UNVERIFIED"
          inviteCode: String,
          picture: String,
          role: String,              // "OWNER" | "ADMIN" | "SUBSCRIBER"
          linkedToCanalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Canal',
            default: null,
          },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
BaileysSessionSchema.index({ usuarioId: 1, status: 1 });
BaileysSessionSchema.index({ deviceJid: 1 });

// ─── Instance methods ────────────────────────────────────────────────────────

/**
 * Mark the session as connected after a successful QR scan.
 */
BaileysSessionSchema.methods.markConnected = function (deviceInfo = {}) {
  this.status = 'connected';
  this.deviceNumber = deviceInfo.number || this.deviceNumber;
  this.deviceJid = deviceInfo.jid || this.deviceJid;
  this.deviceName = deviceInfo.name || this.deviceName;
  this.lastConnectedAt = new Date();
  this.lastActivityAt = new Date();
  this.lastError = '';
};

/**
 * Mark the session as revoked (by user or admin).
 */
BaileysSessionSchema.methods.markRevoked = function (reason = 'user_action') {
  this.status = 'revoked';
  this.revokedAt = new Date();
  this.lastError = reason;
  // Clear sensitive material
  this.creds = null;
  this.keys = {};
};

module.exports =
  mongoose.models.BaileysSession ||
  mongoose.model('BaileysSession', BaileysSessionSchema);
