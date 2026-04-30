/**
 * Factura — Documento legal correlativo emitido por Channelad.
 *
 * Diseño deliberadamente inmutable: una vez creada, los campos fiscales
 * (numero, datosEmisor, datosReceptor, base, iva, total) NO deben cambiar.
 * Si hay un error fiscal, se emite una factura rectificativa nueva, no
 * se modifica la original. Esto cumple con el RD 1619/2012 art. 13.
 *
 * Numeración: serie + año + correlativo. Cada serie/año tiene su propio
 * contador atómico vía $inc en `FacturaCounter`. Con esto:
 *   - Series múltiples permiten separar emitidas vs rectificativas vs recibidas.
 *   - El correlativo NUNCA tiene huecos dentro de una serie/año.
 *   - El primer día de cada año el contador se reinicia automáticamente.
 *
 * Snapshot inmutable de datos fiscales: copiamos los datos fiscales
 * tanto del emisor como del receptor en el momento de la emisión. Si
 * el usuario cambia su razón social después, las facturas antiguas
 * conservan los datos válidos en el momento de la emisión (requisito
 * de Hacienda).
 */

const mongoose = require('mongoose');

// Subdocumento inmutable con datos fiscales en el momento de la emisión.
// Marcamos los campos como required para fallar pronto si alguien intenta
// crear una factura sin datos completos.
const DatosFiscalesSnapshotSchema = new mongoose.Schema(
  {
    razonSocial: { type: String, required: true },
    nif: { type: String, required: true, uppercase: true },
    direccion: { type: String, required: true },
    cp: { type: String, required: true },
    ciudad: { type: String, required: true },
    provincia: { type: String, default: '' },
    pais: { type: String, required: true, uppercase: true },
    emailFacturacion: { type: String, default: '' },
    esEmpresa: { type: Boolean, default: true },
  },
  { _id: false }
);

const LineaFacturaSchema = new mongoose.Schema(
  {
    concepto: { type: String, required: true },
    cantidad: { type: Number, default: 1, min: 0 },
    precioUnitario: { type: Number, required: true, min: 0 },
    importe: { type: Number, required: true, min: 0 }, // cantidad * precioUnitario
  },
  { _id: false }
);

const FacturaSchema = new mongoose.Schema(
  {
    // Numeración correlativa — generada server-side por FacturaCounter.
    // Formato: ${serie}-${año}-${correlativo:0000}, ej: A-2026-0001
    numero: { type: String, required: true, unique: true, index: true },
    serie: { type: String, required: true, default: 'A', index: true },
    anio: { type: Number, required: true, index: true },
    correlativo: { type: Number, required: true },

    // Tipo: 'emitida' = factura que emite Channelad al cliente.
    //       'recibida' = factura recibida del creator (o autofactura).
    //       'rectificativa' = corrige una factura previa.
    tipo: {
      type: String,
      enum: ['emitida', 'recibida', 'rectificativa'],
      default: 'emitida',
      index: true,
    },
    facturaRectificada: { type: mongoose.Schema.Types.ObjectId, ref: 'Factura', default: null },

    // Origen del cargo
    transaccion: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaccion', required: true, index: true },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },

    // Snapshot inmutable de las dos partes
    datosEmisor: { type: DatosFiscalesSnapshotSchema, required: true },
    datosReceptor: { type: DatosFiscalesSnapshotSchema, required: true },

    // Conceptos facturados
    lineas: { type: [LineaFacturaSchema], default: [] },

    // Importes — todos en EUR.
    base: { type: Number, required: true },
    ivaRate: { type: Number, required: true, default: 0.21 },
    iva: { type: Number, required: true },
    total: { type: Number, required: true },

    // Tratamiento IVA aplicado, copiado de fiscalValidation.determineIvaTreatment.
    ivaTreatment: {
      type: String,
      enum: ['iva_normal', 'iva_normal_eu', 'iva_reverse_charge', 'iva_exento_export'],
      required: true,
    },

    // Fechas legales
    fechaEmision: { type: Date, required: true, default: Date.now, index: true },
    fechaVencimiento: { type: Date, default: null },

    // Almacenamiento del PDF/HTML — opcional. Si está vacío, se regenera on-demand
    // desde los datos del documento (que son inmutables, así que el output es estable).
    pdfUrl: { type: String, default: '' },
    htmlSnapshot: { type: String, default: '' },

    // Notas legales (ej: "Operación con inversión del sujeto pasivo")
    notas: { type: String, default: '' },
  },
  { timestamps: true }
);

// Bloquea reescrituras de los campos clave después de la emisión.
// Solo permitimos actualizar pdfUrl, htmlSnapshot y notas (datos no fiscales).
FacturaSchema.pre('save', function(next) {
  if (this.isNew) return next();
  const lockedPaths = [
    'numero', 'serie', 'anio', 'correlativo', 'tipo',
    'datosEmisor', 'datosReceptor', 'lineas',
    'base', 'iva', 'ivaRate', 'total', 'ivaTreatment',
    'fechaEmision', 'transaccion', 'usuario',
  ];
  for (const p of lockedPaths) {
    if (this.isModified(p)) {
      return next(new Error(`Factura: campo "${p}" es inmutable después de la emisión`));
    }
  }
  next();
});

module.exports = mongoose.models.Factura || mongoose.model('Factura', FacturaSchema);
