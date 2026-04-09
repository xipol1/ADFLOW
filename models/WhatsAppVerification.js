const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * WhatsAppVerification
 *
 * Almacena códigos de verificación pendientes para el flujo de onboarding.
 * TTL de 15 minutos — se borran automáticamente.
 *
 * Flujo:
 *   1. Creator pide verificar su canal → se genera un código de 6 dígitos
 *   2. ChannelAd envía el código por WhatsApp al número del creator
 *   3. Creator responde con el código → webhook lo valida
 *   4. Si coincide: fase 1 completada (número verificado)
 *   5. Creator debe publicar un mensaje específico en su canal
 *   6. Creator confirma → canal verificado
 */

const WhatsAppVerificationSchema = new mongoose.Schema({
  // ─── Identificación ──────────────────────────────────────────────────────
  canalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Canal',
    index: true,
  },
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
    index: true,
  },

  // ─── Datos del canal de WhatsApp ─────────────────────────────────────────
  channelId: { type: String, required: true },       // ID o nombre del canal
  creatorPhone: { type: String, required: true },     // Número del creator (con +)

  // ─── Código de verificación ──────────────────────────────────────────────
  codigoOTP: { type: String, required: true },
  codigoCanal: { type: String, required: true },      // Código que debe publicar en el canal
  intentos: { type: Number, default: 0 },
  maxIntentos: { type: Number, default: 5 },

  // ─── Estado ──────────────────────────────────────────────────────────────
  fase: {
    type: String,
    enum: ['pendiente_otp', 'otp_verificado', 'pendiente_canal', 'completado', 'expirado', 'fallido'],
    default: 'pendiente_otp',
  },
  otpVerificadoEn: { type: Date },
  canalVerificadoEn: { type: Date },

  // ─── Datos recibidos por webhook ─────────────────────────────────────────
  webhookMessageId: { type: String },  // ID del mensaje de respuesta del creator

  // ─── TTL ─────────────────────────────────────────────────────────────────
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 15 * 60 * 1000), // 15 minutos
    index: { expireAfterSeconds: 0 },
  },
}, { timestamps: true });

// ─── Índices ──────────────────────────────────────────────────────────────────
WhatsAppVerificationSchema.index({ creatorPhone: 1, fase: 1 });
WhatsAppVerificationSchema.index({ codigoOTP: 1 });

// ─── Statics ──────────────────────────────────────────────────────────────────

/**
 * Genera un nuevo código de verificación de 6 dígitos.
 */
WhatsAppVerificationSchema.statics.generarCodigo = function() {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Genera un código de canal legible (CHANNELAD-XXXX).
 */
WhatsAppVerificationSchema.statics.generarCodigoCanal = function() {
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `CHANNELAD-${suffix}`;
};

/**
 * Busca una verificación pendiente por número de teléfono.
 */
WhatsAppVerificationSchema.statics.findPendingByPhone = function(phone) {
  const normalized = phone.replace(/\s+/g, '').replace(/^00/, '+');
  return this.findOne({
    creatorPhone: normalized,
    fase: 'pendiente_otp',
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
};

/**
 * Verifica el código OTP y avanza de fase.
 */
WhatsAppVerificationSchema.methods.verificarOTP = function(codigoIntroducido) {
  this.intentos += 1;

  if (this.intentos > this.maxIntentos) {
    this.fase = 'fallido';
    return { success: false, error: 'Máximo de intentos alcanzado' };
  }

  if (this.codigoOTP !== codigoIntroducido.trim()) {
    return { success: false, error: `Código incorrecto. Intentos restantes: ${this.maxIntentos - this.intentos}` };
  }

  this.fase = 'otp_verificado';
  this.otpVerificadoEn = new Date();
  // Extend expiry 30 more minutes for channel verification step
  this.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  return { success: true, fase: 'otp_verificado', codigoCanal: this.codigoCanal };
};

/**
 * Marca la verificación del canal como completada.
 */
WhatsAppVerificationSchema.methods.completarVerificacionCanal = function() {
  this.fase = 'completado';
  this.canalVerificadoEn = new Date();
  return { success: true };
};

module.exports = mongoose.models.WhatsAppVerification
  || mongoose.model('WhatsAppVerification', WhatsAppVerificationSchema);
