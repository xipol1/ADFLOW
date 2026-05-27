const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * CalculatorAnalysis — cache + audit trail de los análisis automáticos
 * desde link público (Telegram, Discord, Newsletter, etc).
 *
 * Cuando un usuario pega un link en la calculadora, el backend:
 *   1. Detecta la plataforma con regex.
 *   2. Hace lookup en esta colección por `fingerprint = sha256(platform:externalId)`.
 *   3. Si hay hit válido (no expirado) → devuelve sin tocar la fuente externa.
 *   4. Si no → llama al analyzer correspondiente, guarda aquí, devuelve.
 *
 * TTL: el campo `expiresAt` tiene índice TTL. Mongo borra el documento
 * automáticamente cuando vence. Default: 24h.
 */
const CalculatorAnalysisSchema = new mongoose.Schema(
  {
    // Input del usuario (normalizado)
    inputUrl:    { type: String, required: true, trim: true },
    platform:    {
      type: String,
      required: true,
      enum: ['telegram', 'whatsapp_channel', 'whatsapp_group', 'discord', 'newsletter'],
      index: true,
    },
    externalId:  { type: String, required: true, index: true }, // username, invite code, channel slug
    fingerprint: { type: String, required: true, unique: true }, // sha256(platform + ':' + externalId)

    // Status del análisis
    status: {
      type: String,
      enum: ['ok', 'partial', 'redirect_oauth', 'failed', 'not_found'],
      required: true,
      index: true,
    },

    // Datos parseados del canal
    data: {
      name:         { type: String, default: '' },
      description:  { type: String, default: '' },
      subscribers:  { type: Number, default: null }, // null si no se pudo leer
      verified:     { type: Boolean, default: false },
      lastActivity: { type: Date, default: null },
      profileImage: { type: String, default: '' },
      // Discord-only: presencia aproximada
      onlineCount:  { type: Number, default: null },
      // Free-form payload de la fuente, kept para reprocessing
      raw:          { type: mongoose.Schema.Types.Mixed, default: {} },
    },

    // De dónde sacamos los datos
    scrapedFrom: {
      type: String,
      enum: ['html_public', 'discord_api', 'tgstat', 'baileys', 'substack', 'beehiiv', 'cache'],
      default: 'html_public',
    },

    // Métricas operativas
    durationMs:   { type: Number, default: 0 },
    errorMessage: { type: String, default: '' },

    // Anti-spam / fraud detection — hash de IP, no la IP cruda
    ipHash:    { type: String, default: '', index: true },
    userAgent: { type: String, default: '' },

    // TTL — Mongo elimina el documento automáticamente tras esta fecha
    expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  },
  { timestamps: true }
);

// ─── Indices ────────────────────────────────────────────────────────────────
CalculatorAnalysisSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL
CalculatorAnalysisSchema.index({ ipHash: 1, createdAt: -1 });                // anti-abuse listings
CalculatorAnalysisSchema.index({ platform: 1, createdAt: -1 });              // analytics

// ─── Helpers estáticos ──────────────────────────────────────────────────────
CalculatorAnalysisSchema.statics.fingerprintOf = function (platform, externalId) {
  return crypto
    .createHash('sha256')
    .update(`${platform}:${(externalId || '').toLowerCase()}`)
    .digest('hex')
    .slice(0, 32);
};

CalculatorAnalysisSchema.statics.hashIp = function (ip) {
  if (!ip) return '';
  const salt = process.env.IP_HASH_SALT || 'channelad-analysis-salt';
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
};

module.exports =
  mongoose.models.CalculatorAnalysis ||
  mongoose.model('CalculatorAnalysis', CalculatorAnalysisSchema);
