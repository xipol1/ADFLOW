/**
 * FacturaCounter — Contador atómico para numeración secuencial de facturas.
 *
 * Una entrada por (serie, año). Se incrementa atómicamente con $inc para
 * garantizar que dos peticiones simultáneas nunca obtengan el mismo número.
 *
 * Hacienda exige que la numeración sea correlativa SIN huecos dentro de
 * cada serie. No usar este contador (p. ej. generando UUIDs o timestamps)
 * invalidaría la facturación legalmente.
 */

const mongoose = require('mongoose');

const FacturaCounterSchema = new mongoose.Schema(
  {
    serie: { type: String, required: true },
    anio: { type: Number, required: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

FacturaCounterSchema.index({ serie: 1, anio: 1 }, { unique: true });

/**
 * Reserva el siguiente número correlativo de la serie/año dada.
 * Usa findOneAndUpdate con upsert + $inc, lo que es atómico en MongoDB.
 * Devuelve el correlativo recién asignado (entero ≥ 1).
 */
FacturaCounterSchema.statics.next = async function nextCorrelativo(serie, anio) {
  const doc = await this.findOneAndUpdate(
    { serie, anio },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return doc.seq;
};

/**
 * Formatea numero completo: A-2026-0001
 */
FacturaCounterSchema.statics.formatNumero = function formatNumero(serie, anio, correlativo) {
  const padded = String(correlativo).padStart(4, '0');
  return `${serie}-${anio}-${padded}`;
};

module.exports = mongoose.models.FacturaCounter || mongoose.model('FacturaCounter', FacturaCounterSchema);
