const mongoose = require('mongoose');

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
      phoneNumber: { type: String, default: '' }
    },
    credenciales: {
      botToken: { type: String, default: '' },
      accessToken: { type: String, default: '' },
      phoneNumberId: { type: String, default: '' },
      webhookUrl: { type: String, default: '' }
    },
    configuracion: {
      publicacionAutomatica: { type: Boolean, default: false },
      whatsapp: {
        modo: { type: String, default: 'manual' }
      }
    }
  },
  { timestamps: true }
);

CanalSchema.index({ plataforma: 1, identificadorCanal: 1 }, { unique: false });

module.exports = mongoose.models.Canal || mongoose.model('Canal', CanalSchema);

