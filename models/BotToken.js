const mongoose = require('mongoose');

const BotTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  telegramUserId: { type: String, required: true, index: true },
  channelUsername: { type: String, default: '' },
  channelTier: { type: String, enum: ['super_canal', 'prometedor', 'pequeno', null], default: null },
  precioPost: { type: Number, default: 0 },
  ingresoMensual: { type: Number, default: 0 },
  niche: { type: String, default: '' },
  used: { type: Boolean, default: false },
  usedAt: { type: Date, default: null },
  expiresAt: { type: Date, required: true, index: true },
}, { timestamps: true });

// TTL index — auto-delete expired tokens after 7 days
BotTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

module.exports = mongoose.models.BotToken || mongoose.model('BotToken', BotTokenSchema);
