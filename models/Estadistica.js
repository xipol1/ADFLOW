const mongoose = require('mongoose');

const EstadisticaSchema = new mongoose.Schema(
  {
    entidadId: { type: mongoose.Schema.Types.ObjectId, index: true },
    tipoEntidad: { type: String, required: true, index: true },
    // De los 889.064 documentos que habia en la coleccion, CERO tenian
    // `periodo`: el upsert de SocialSyncService.updateEstadisticaGlobal
    // filtraba por rango, Mongo no copia operadores al doc que inserta y cada
    // sync creaba un documento nuevo. Los indices sobre periodo.* ocupaban
    // 21 MB indexando la nada y en agosto de 2026 agotaron la cuota de 512 MB
    // de Atlas, bloqueando TODAS las escrituras del cluster.
    //
    // El escritor ya esta arreglado (filtro por valor exacto), asi que los
    // documentos nuevos si traen `periodo`. Siguen sin `index: true` a
    // proposito: la busqueda va por entidadId, que ya tiene su indice, y a un
    // documento por entidad y dia no hace falta nada mas.
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

