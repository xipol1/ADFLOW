const mongoose = require('mongoose');

const ArchivoSchema = new mongoose.Schema(
  {
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', index: true },
    categoria: { type: String, default: 'general', index: true },
    nombreOriginal: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    tamano: { type: Number, default: 0 },
    url: { type: String, default: '' },
    ruta: { type: String, default: '' },
    publico: { type: Boolean, default: false, index: true },
    estadisticas: {
      vistas: { type: Number, default: 0 },
      descargas: { type: Number, default: 0 }
    },
    expiraEn: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Archivo || mongoose.model('Archivo', ArchivoSchema);

