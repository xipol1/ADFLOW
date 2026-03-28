const mongoose = require('mongoose');

const NotificacionSchema = new mongoose.Schema(
  {
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', index: true },
    tipo: { type: String, default: '', index: true },
    titulo: { type: String, default: '' },
    mensaje: { type: String, default: '' },
    prioridad: { type: String, default: 'normal', index: true },
    leida: { type: Boolean, default: false, index: true },
    archivada: { type: Boolean, default: false, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    expiraEn: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Notificacion || mongoose.model('Notificacion', NotificacionSchema);

