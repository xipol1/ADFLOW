const mongoose = require('mongoose');

const EstadisticaSchema = new mongoose.Schema(
  {
    entidadId: { type: mongoose.Schema.Types.ObjectId, index: true },
    tipoEntidad: { type: String, required: true, index: true },
    periodo: {
      inicio: { type: Date, required: true, index: true },
      fin: { type: Date, required: true, index: true }
    },
    metricas: {
      alcance: { type: Number, default: 0 },
      impresiones: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      conversiones: { type: Number, default: 0 }
    },
    metricasSociales: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

EstadisticaSchema.index({ entidadId: 1, tipoEntidad: 1, 'periodo.inicio': 1, 'periodo.fin': 1 });

module.exports = mongoose.models.Estadistica || mongoose.model('Estadistica', EstadisticaSchema);

