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
    }]
  },
  { timestamps: true }
);

module.exports = mongoose.models.Usuario || mongoose.model('Usuario', UsuarioSchema);
