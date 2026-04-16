const mongoose = require('mongoose');

const SesionSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    fechaCreacion: { type: Date, default: Date.now },
    fechaExpiracion: { type: Date, required: true },
    userAgent: { type: String, default: '' },
    ip: { type: String, default: '' }
  },
  { _id: false }
);

const UsuarioSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    nombre: { type: String, default: '' },
    apellido: { type: String, default: '' },
    rol: { type: String, enum: ['creator', 'advertiser', 'admin'], default: 'advertiser' },

    // Profile sub-type — used to tailor the onboarding and dashboard:
    //   - individual: a single creator managing their own channel(s)
    //   - agencia:   an agency / community manager handling channels of
    //                multiple clients. Unlocks multi-client features,
    //                multi-user access, and consolidated billing.
    tipoPerfil: {
      type: String,
      enum: ['individual', 'agencia', null],
      default: null,
      index: true,
    },
    // Agency-specific fields (populated only when tipoPerfil === 'agencia')
    agencia: {
      nombre: { type: String, default: '' },
      sitioWeb: { type: String, default: '' },
      cifNif: { type: String, default: '' },
      numClientesEstimados: { type: Number, default: 0 },
      numCanalesGestionados: { type: Number, default: 0 },
    },

    emailVerificado: { type: Boolean, default: false },
    activo: { type: Boolean, default: true },
    sesiones: { type: [SesionSchema], default: [] },
    ultimaActividad: { type: Date, default: null },
    emailVerificationToken: { type: String, default: null },
    emailVerificationExpires: { type: Date, default: null },
    pushSubscriptions: [{
      endpoint: String,
      keys: { p256dh: String, auth: String },
      createdAt: { type: Date, default: Date.now },
    }],

    // Password reset
    passwordResetToken: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },

    // Account lockout
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },

    // Stripe Connect (creator payouts)
    stripeConnectAccountId: { type: String, default: null },

    // 2FA / TOTP
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, default: null }, // encrypted TOTP secret
    twoFactorBackupCodes: [{ type: String }],         // hashed backup codes

    // Campaign credits (welcome bonus for referred users, spent on campaigns)
    campaignCreditsBalance: { type: Number, default: 0 },

    // Beta program — gates access to the /advertiser and /creator dashboards.
    // Admins are always beta. Normal users stay false until explicitly flipped
    // (via admin panel, seed script, or manual DB update).
    betaAccess: { type: Boolean, default: false, index: true },

    // Google OAuth
    googleId: { type: String, default: null, sparse: true, index: true },

    // Bot verification & Founder program
    botVerified: { type: Boolean, default: false },
    founderTier: { type: Boolean, default: false },
    telegramUserId: { type: String, default: null },
    channelUsername: { type: String, default: null },
    channelTier: { type: String, enum: ['super_canal', 'prometedor', 'pequeno', null], default: null },

    // Referral system
    referralCode: { type: String, unique: true, sparse: true, default: null },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
    referralCreditsBalance: { type: Number, default: 0 },
    referralCashBalance: { type: Number, default: 0 },
    referralTier: { type: String, enum: ['normal', 'power', 'partner'], default: 'normal' },
    referralGMVGenerated: { type: Number, default: 0 },
    referralCount: { type: Number, default: 0 },

    // Email reminders (used by scheduler to avoid re-sending)
    recordatorioPerfil: { type: Boolean, default: false },
    recordatorioPerfilAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Generate referral code on first save if not set.
// Uses crypto.randomBytes for collision-safe entropy (8 bytes = 16 hex chars,
// then sliced to 9 for a clean alphanumeric code like "CH-A3F9B2K").
UsuarioSchema.pre('save', function(next) {
  if (!this.referralCode) {
    const crypto = require('crypto')
    const random = crypto.randomBytes(6).toString('hex').toUpperCase().slice(0, 6)
    this.referralCode = 'CH' + random
  }
  next()
})

module.exports = mongoose.models.Usuario || mongoose.model('Usuario', UsuarioSchema);
