const mongoose = require('mongoose');

const ArchivoMultimediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true }
  },
  { _id: false }
);

const AnuncioSchema = new mongoose.Schema(
  {
    canal: { type: mongoose.Schema.Types.ObjectId, ref: 'Canal', index: true },
    creador: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', index: true },
    anunciante: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', index: true },
    titulo: { type: String, default: '', trim: true },
    descripcion: { type: String, default: '', trim: true },
    tipoAnuncio: { type: String, default: '', trim: true },
    estado: { type: String, default: 'borrador', index: true },
    contenido: {
      texto: { type: String, default: '' },
      archivosMultimedia: { type: [ArchivoMultimediaSchema], default: [] }
    },
    presupuesto: {
      montoTotal: { type: Number, default: 0 },
      moneda: { type: String, default: 'USD' }
    },
    tracking: {
      clicks: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Anuncio || mongoose.model('Anuncio', AnuncioSchema);

