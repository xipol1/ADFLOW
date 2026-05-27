const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Lead capturado desde la calculadora de tarifa pública. Se rellena cuando el
 * creador completa el wizard (4 pasos) y deja su email para recibir el análisis
 * detallado de su canal. Distinto de EnterpriseLead — ese es B2B sales, este
 * es marketing/captación de creadores.
 *
 * El snapshot guarda los inputs y los outputs calculados en ese momento para:
 *   1. Poder reproducir el reporte aunque la fórmula cambie.
 *   2. Mostrar al equipo de growth qué tipo de canal genera más leads.
 *   3. Pre-rellenar el flujo de alta cuando el lead se registra después.
 */
const CalculatorLeadSchema = new mongoose.Schema(
  {
    // Identidad del lead — único por email (lowercase).
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // Opcional: si el lead ya estaba logueado, lo enlazamos.
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null, index: true },

    // Snapshot completo del análisis. Mongoose.Mixed = lo aceptamos tal cual
    // viene del frontend, validamos arriba (longitud, números, enum).
    snapshot: {
      platform:         { type: String, default: null }, // telegram|whatsapp|discord|newsletter
      niche:            { type: String, default: null },
      followers:        { type: Number, default: 0 },
      reactionsPerPost: { type: Number, default: 0 },
      postsPerMonth:    { type: Number, default: 0 },
      format:           { type: String, default: null },

      // Outputs calculados, ya formateados para el reporte
      featuredFormatPrice: { type: Number, default: 0 },
      monthlyEarnings:     { type: Number, default: 0 },
      yearlyEarnings:      { type: Number, default: 0 },
      effectiveCpm:        { type: Number, default: 0 },
      reachPerPost:        { type: Number, default: 0 },

      // WhatsApp questionnaire fields (cuando aplica)
      whatsappType:     { type: String, default: null }, // channel|group|unsure
      whatsappBucket:   { type: String, default: null }, // xs|sm|md|lg|xl
    },

    // Para futuras campañas — de qué página entró este lead.
    source: {
      type: String,
      default: 'calculator',
      enum: ['calculator', 'calculator_whatsapp', 'blog_calculator'],
      index: true,
    },

    utm: {
      source:   { type: String, default: '' },
      medium:   { type: String, default: '' },
      campaign: { type: String, default: '' },
      term:     { type: String, default: '' },
      content:  { type: String, default: '' },
    },

    referrer:  { type: String, default: '' },
    userAgent: { type: String, default: '' },
    locale:    { type: String, default: '' },

    // GDPR — guardamos el texto literal del checkbox al momento del consent
    // para poder demostrar consentimiento si nos lo piden.
    consentAt:   { type: Date, default: null },
    consentText: { type: String, default: '' },

    // IP hash, no IP cruda — Art. 4 GDPR pseudonimización
    ipHash: { type: String, default: '' },

    // Status del lead en el funnel
    status: {
      type: String,
      default: 'new',
      enum: ['new', 'emailed', 'opened', 'clicked', 'registered', 'unsubscribed'],
      index: true,
    },

    // Cuándo se le envió el reporte (si se envía). Por ahora el envío es
    // fase 2 — capturamos primero, enviamos después.
    reportSentAt:    { type: Date, default: null },
    unsubscribedAt:  { type: Date, default: null },

    // Cuando el lead se registra en Channelad, enlazamos
    registeredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ─── Helper estático: hash determinístico de IP ─────────────────────────────
CalculatorLeadSchema.statics.hashIp = function hashIp(ip) {
  if (!ip) return '';
  const salt = process.env.IP_HASH_SALT || 'channelad-lead-salt';
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
};

// Índice compuesto para listing por status + recencia
CalculatorLeadSchema.index({ status: 1, createdAt: -1 });
CalculatorLeadSchema.index({ source: 1, createdAt: -1 });

module.exports =
  mongoose.models.CalculatorLead ||
  mongoose.model('CalculatorLead', CalculatorLeadSchema);
