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
CanalSchema.pre('save', function (next) {
  try {
    if (!process.env.ENCRYPTION_KEY) return next(); // skip if no key configured

    const sensitiveFields = ['botToken', 'accessToken', 'phoneNumberId', 'refreshToken', 'pageAccessToken'];
    for (const field of sensitiveFields) {
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
  } catch (err) {
    console.error('Error encrypting credentials on save:', err.message);
  }
  next();
});

module.exports = mongoose.models.Canal || mongoose.model('Canal', CanalSchema);

