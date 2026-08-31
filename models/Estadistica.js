const mongoose = require('mongoose');

const EstadisticaSchema = new mongoose.Schema(
  {
    entidadId: { type: mongoose.Schema.Types.ObjectId, index: true },
    tipoEntidad: { type: String, required: true, index: true },
    // `periodo` no lo escribe nadie: de los 889.064 documentos de la colección,
    // CERO tienen el campo (los escribe el pipeline de scrapers, que usa otra
    // forma). Los índices sobre periodo.* ocupaban 21 MB indexando la nada, y
    // en agosto de 2026 eso agotó la cuota de 512 MB de Atlas y bloqueó TODAS
    // las escrituras del cluster. Sin `index: true` para que no se recreen.
    periodo: {
      inicio: { type: Date },
      fin: { type: Date }
    },
    metricas: {
      alcance: { type: Number, default: 0 },
      impresiones: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      conversiones: { type: Number, default: 0 }
    },
    metricasSociales: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: true,
    // Mismo criterio que Canal.js: los índices se gestionan a mano (ver
    // scripts/prune-metrics-storage.js). Con autoIndex activo, un arranque en
    // frío recreaba los índices muertos justo después de haberlos borrado.
    autoIndex: false,
  }
);

// El compuesto terminaba en periodo.inicio/periodo.fin, que no existen: 12,4 MB
// para servir lo mismo que el índice de entidadId. Las consultas por
// entidadId + tipoEntidad siguen cubiertas por sus índices sueltos.

module.exports = mongoose.models.Estadistica || mongoose.model('Estadistica', EstadisticaSchema);

