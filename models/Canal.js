const mongoose = require('mongoose');
const { encryptIfNeeded } = require('../lib/encryption');

const CanalSchema = new mongoose.Schema(
  {
    propietario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', index: true },
    plataforma: { type: String, required: true, lowercase: true, trim: true, index: true },
    identificadorCanal: { type: String, required: true, trim: true, index: true },
    nombreCanal: { type: String, default: '', trim: true },
    descripcion: { type: String, default: '', trim: true },
    categoria: { type: String, default: '', trim: true, index: true },
    estado: { type: String, default: 'pendiente_verificacion', index: true },
    estadisticas: {
      seguidores: { type: Number, default: 0 },
      ultimaActualizacion: { type: Date, default: null }
    },
    identificadores: {
      chatId: { type: String, default: '' },
      serverId: { type: String, default: '' },
      phoneNumber: { type: String, default: '' },
      provider: { type: String, default: '' },       // newsletter provider (mailchimp/beehiiv/substack)
      linkedinUrn: { type: String, default: '' },     // urn:li:person:xxx or urn:li:organization:xxx
    },
    credenciales: {
      botToken: { type: String, default: '' },
      accessToken: { type: String, default: '' },
      phoneNumberId: { type: String, default: '' },
      webhookUrl: { type: String, default: '' },
      refreshToken: { type: String, default: '' },
      pageAccessToken: { type: String, default: '' },
      tokenExpiresAt: { type: Date, default: null },
      tokenType: { type: String, default: 'manual', enum: ['manual', 'oauth_meta', 'oauth_linkedin'] },
    },
    // ── Meta OAuth data (populated after Facebook Login) ──
    metaOAuth: {
      metaUserId: { type: String, default: '' },
      connectedPages: [{
        pageId: { type: String },
        pageName: { type: String },
        pageAccessToken: { type: String }, // encrypted
        instagramBusinessId: { type: String, default: '' },
        whatsappBusinessId: { type: String, default: '' },
      }],
      scopes: [{ type: String }],
      oauthConnectedAt: { type: Date, default: null },
    },
    // ── LinkedIn OAuth data (populated after LinkedIn Login) ──
    linkedinOAuth: {
      linkedinUserId: { type: String, default: '' },
      organizationId: { type: String, default: '' },
      scopes: [{ type: String }],
      oauthConnectedAt: { type: Date, default: null },
    },
    configuracion: {
      publicacionAutomatica: { type: Boolean, default: false },
      whatsapp: {
        modo: { type: String, default: 'manual' }
      }
    },
    // ── Pricing & availability (publication calendar) ──
    precio: { type: Number, default: 0 },
    disponibilidad: {
      maxPublicacionesMes: { type: Number, default: 10 },
      diasSemana: [{ type: Number }], // 0=Sun..6=Sat
      preciosPorDia: [{
        day: { type: Number }, // 0-6
        price: { type: Number, default: 0 },
        enabled: { type: Boolean, default: true }
      }],
      diasBloqueados: [{ type: String }], // 'YYYY-MM-DD'
      horarioPreferido: {
        desde: { type: String, default: '09:00' },
        hasta: { type: String, default: '21:00' }
      },
      antelacionMinima: { type: Number, default: 2 }, // days
      antelacionMaxima: { type: Number, default: 60 },
      aceptaUrgentes: { type: Boolean, default: false },
      precioUrgente: { type: Number, default: 0 }
    },
    // ── Pack opt-in ──
    allowPacks: { type: Boolean, default: true },

    // ── Profile extras ──
    tags: [{ type: String }],
    foto: { type: String, default: '' },
    banner: { type: String, default: '' },
    idioma: { type: String, default: 'es' },
    verificado: { type: Boolean, default: false, index: true },

    // ── Claim system (unclaimed → claimed by channel admin) ──
    claimed: { type: Boolean, default: false, index: true },
    claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
    claimedAt: { type: Date, default: null },
    claimToken: { type: String, default: null },

    // ── Bot admin config (auto-onboarding) ──
    botConfig: {
      ultimaSync: Date,
      telegram: {
        botToken: String,
        chatId: String,
        isAdmin: { type: Boolean, default: false },
        canPostMessages: { type: Boolean, default: false },
        botUsername: String,
        verificadoEn: Date,
      },
      discord: {
        botToken: String,
        guildId: String,
        isPresent: { type: Boolean, default: false },
        permissions: mongoose.Schema.Types.Mixed,
        verificadoEn: Date,
      },
      instagram: {
        accessToken: String,
        igUserId: String,
        username: String,
        tokenExpiresAt: Date,
        verificadoEn: Date,
      },
      whatsapp: {
        adminNumber: String,
        channelId: String,
        channelName: String,
        adminAccess: { type: Boolean, default: false },
        seguidoresVerificados: { type: Number, default: 0 },
        verificadoEn: Date,
        ultimaLectura: Date,
      },
    },
    nivelVerificacion: {
      type: String,
      enum: ['platino', 'oro', 'plata', 'bronce'],
      default: 'bronce',
    },

    // ── Scoring v2.0 (channelScoringV2.js) ──────────────────────────────────
    // Propietary scores updated nightly by the scoring cron and immediately
    // after a campaign transitions to COMPLETED. All default to 50 (neutral)
    // so existing channels remain valid without a migration.
    CAF: { type: Number, default: 50, min: 0, max: 100 }, // Channel Attention Flow
    CTF: { type: Number, default: 50, min: 0, max: 100 }, // Channel Trust Flow
    CER: { type: Number, default: 50, min: 0, max: 100 }, // Channel Engagement Rate
    CVS: { type: Number, default: 50, min: 0, max: 100 }, // Channel Velocity Score
    CAP: { type: Number, default: 50, min: 0, max: 100 }, // Channel Ad Performance
    CAS: { type: Number, default: 50, min: 0, max: 100 }, // Composite (final) score
    nivel: {
      type: String,
      enum: ['BRONZE', 'SILVER', 'GOLD', 'ELITE'],
      default: 'BRONZE',
      index: true,
    },
    CPMDinamico: { type: Number, default: 0 },

    // ── Verification enrichment ─────────────────────────────────────────────
    verificacion: {
      tipoAcceso: {
        type: String,
        enum: ['admin_directo', 'oauth_graph', 'bot_miembro', 'tracking_url', 'declarado'],
        default: 'declarado',
      },
      confianzaScore: { type: Number, default: 30, min: 0, max: 100 },
    },

    // ── Anti-fraud signals ──────────────────────────────────────────────────
    antifraude: {
      ratioCTF_CAF: { type: Number, default: null },
      flags: { type: [String], default: [] },
      ultimaRevision: { type: Date, default: null },
    },

    // ── Public crawler data (WhatsApp channels, Telegram public channels) ──
    crawler: {
      ultimoPostNum: { type: Number, default: null },   // latest post number on the public URL
      ultimaActualizacion: { type: Date, default: null },
      urlPublica: { type: String, default: '' },        // whatsapp.com/channel/... or t.me/...
    },
  },
  { timestamps: true, strict: true }
);

// Compound index for the daily scoring cron (status + last score date).
CanalSchema.index({ estado: 1, nivel: 1 });

CanalSchema.index({ plataforma: 1, identificadorCanal: 1 }, { unique: false });

// Channel Explorer: filter by category + sort by CAS
CanalSchema.index({ categoria: 1, CAS: 1 });

// ── Encrypt sensitive credential fields before saving ──
//
// Without ENCRYPTION_KEY the pre-save hook used to silently skip encryption,
// which meant any environment that forgot to set the env var would write bot
// tokens and OAuth access tokens to MongoDB in plaintext. We now refuse to
// persist credentials in production when the key is missing — better a 500
// at write time than a silent leak. In dev we still allow saves so tests that
// don't exercise the credential paths aren't forced to set the key.
const SENSITIVE_CRED_FIELDS = ['botToken', 'accessToken', 'phoneNumberId', 'refreshToken', 'pageAccessToken'];

const _hasSensitiveCredsModified = (doc) =>
  SENSITIVE_CRED_FIELDS.some((f) => doc.credenciales?.[f] && doc.isModified(`credenciales.${f}`)) ||
  doc.metaOAuth?.connectedPages?.some((p) => p?.pageAccessToken);

CanalSchema.pre('save', function (next) {
  try {
    if (!process.env.ENCRYPTION_KEY) {
      const env = process.env.NODE_ENV || 'development';
      // In production refuse to persist credentials in the clear.
      if (env === 'production' && _hasSensitiveCredsModified(this)) {
        return next(new Error(
          'ENCRYPTION_KEY no configurado: rechazado el guardado de credenciales sin cifrar.'
        ));
      }
      // Dev/test without key + with credentials → warn loudly so it's visible.
      if (_hasSensitiveCredsModified(this)) {
        console.warn('⚠️ ENCRYPTION_KEY ausente — credenciales se guardarán SIN CIFRAR (solo dev/test).');
      }
      return next();
    }

    for (const field of SENSITIVE_CRED_FIELDS) {
      if (this.credenciales?.[field] && this.isModified(`credenciales.${field}`)) {
        this.credenciales[field] = encryptIfNeeded(this.credenciales[field]);
      }
    }

    // Encrypt page access tokens in metaOAuth.connectedPages
    if (this.metaOAuth?.connectedPages?.length) {
      for (const page of this.metaOAuth.connectedPages) {
        if (page.pageAccessToken) {
          page.pageAccessToken = encryptIfNeeded(page.pageAccessToken);
        }
      }
    }
    return next();
  } catch (err) {
    // Encryption failure must NOT silently fall through to a plaintext write.
    return next(err);
  }
});

module.exports = mongoose.models.Canal || mongoose.model('Canal', CanalSchema);

