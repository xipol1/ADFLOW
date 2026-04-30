/**
 * Invoice Service — Genera facturas legales con numeración correlativa,
 * datos fiscales reales del emisor y receptor, e IVA correcto según
 * tratamiento (doméstico, intra-UE reverse charge, exportación).
 *
 * Diseño:
 *   - issueInvoiceForTransaction()  →  Crea (idempotente) un documento
 *     Factura con numeración correlativa para una Transaccion.
 *   - generateInvoiceHTML(factura)  →  Renderiza una Factura como HTML
 *     legalmente válido (datos del emisor/receptor, base, IVA, total,
 *     número correlativo, leyenda fiscal aplicable).
 *
 * La separación entre "issue" y "render" es deliberada: la emisión es
 * un side-effect que reserva un número correlativo en el contador y
 * crea un documento inmutable. La renderización es pura y puede
 * regenerarse on-demand sin riesgo de perder consistencia legal.
 */

const config = require('../config/config');
const Factura = require('../models/Factura');
const FacturaCounter = require('../models/FacturaCounter');
const Usuario = require('../models/Usuario');
const Transaccion = require('../models/Transaccion');
const { determineIvaTreatment, computeInvoiceTotals } = require('../lib/fiscalValidation');
const { DEFAULT_COMMISSION_RATE } = require('../config/commissions');
const logger = require('../lib/logger');

// ──────────────────────────────────────────────────────────────────────────────
// LEGAL TEXT helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Texto legal a incluir en la factura según el tratamiento de IVA aplicado.
 * Estos textos cumplen con los requisitos del RD 1619/2012 (Reglamento de
 * Facturación) y la Directiva 2006/112/CE del IVA en la UE.
 */
const IVA_LEGAL_NOTES = {
  iva_normal: '',
  iva_normal_eu: 'Operación interior. IVA español aplicable.',
  iva_reverse_charge:
    'Operación intracomunitaria con inversión del sujeto pasivo (Art. 84.1.2.º Ley IVA / Reverse charge — Article 196 Directive 2006/112/EC).',
  iva_exento_export:
    'Operación de exportación exenta de IVA (Art. 21 Ley 37/1992 IVA).',
};

const CIF_PENDING_NOTE =
  'NIF pendiente de asignación tras inscripción en Registro Mercantil. ' +
  'Esta es una factura proforma — la factura legal será emitida cuando ' +
  'se complete la constitución de la sociedad.';

// ──────────────────────────────────────────────────────────────────────────────
// EMISSION
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Crea (de forma idempotente) una Factura para una Transaccion.
 *
 * Idempotencia: si ya existe una Factura para la transacción, se devuelve
 * directamente sin reservar un nuevo número correlativo. Esto es importante
 * porque Stripe webhooks pueden disparar múltiples eventos por un mismo
 * cobro (idempotency key garantiza el cobro único, pero no la idempotencia
 * de procesamiento downstream).
 *
 * @param {Object} options
 * @param {string|ObjectId} options.transactionId
 * @param {string} [options.tipo] - 'emitida' | 'recibida' | 'rectificativa'
 * @returns {Promise<Factura>}
 */
async function issueInvoiceForTransaction({ transactionId, tipo = 'emitida' } = {}) {
  if (!transactionId) throw new Error('transactionId requerido');

  // Idempotencia: si ya hay factura para esta transacción y tipo, devolverla.
  const existing = await Factura.findOne({ transaccion: transactionId, tipo });
  if (existing) return existing;

  const tx = await Transaccion.findById(transactionId)
    .populate('advertiser')
    .populate('creator');
  if (!tx) throw new Error(`Transaccion ${transactionId} no encontrada`);

  // El "usuario" de la factura depende del tipo:
  //   - emitida → factura que Channelad emite al advertiser (cargo)
  //   - recibida → factura que Channelad recibe del creator (pago)
  const usuario =
    tipo === 'recibida' ? tx.creator : tx.advertiser;

  if (!usuario) {
    throw new Error(`Transaccion ${transactionId} sin ${tipo === 'recibida' ? 'creator' : 'advertiser'}`);
  }

  // Cargar el usuario fresco para tener los datos fiscales actualizados.
  const userFull = await Usuario.findById(usuario._id || usuario);
  if (!userFull) throw new Error('Usuario no encontrado');
  const df = userFull.datosFacturacion || {};
  if (!df.completado) {
    throw new Error('Usuario sin datos fiscales completos — no se puede emitir factura');
  }

  // Snapshot del emisor (Channelad). Si el NIF está vacío (sociedad sin
  // constituir aún), se permite emitir una "factura proforma" identificable
  // por el campo `notas`. Esto es deliberado: bloquear la emisión por
  // completo paralizaría la operativa hasta tener CIF, lo que no es viable.
  const emisor = config.emisor;
  const datosEmisor = {
    razonSocial: emisor.razonSocial,
    nif: emisor.nif || 'PENDIENTE',
    direccion: emisor.direccion || 'Pendiente',
    cp: emisor.cp || '00000',
    ciudad: emisor.ciudad || 'Pendiente',
    provincia: emisor.provincia || '',
    pais: emisor.pais || 'ES',
    emailFacturacion: emisor.emailFacturacion,
    esEmpresa: true,
  };

  const datosReceptor = {
    razonSocial: df.razonSocial,
    nif: df.nif,
    direccion: df.direccion,
    cp: df.cp,
    ciudad: df.ciudad,
    provincia: df.provincia || '',
    pais: df.pais || 'ES',
    emailFacturacion: df.emailFacturacion || userFull.email,
    esEmpresa: !!df.esEmpresa,
  };

  // Determinar tratamiento IVA según el receptor.
  const ivaTreatment = determineIvaTreatment({
    pais: datosReceptor.pais,
    esEmpresa: datosReceptor.esEmpresa,
    viesValidado: !!df.viesValidado,
  });

  // Calcular base/iva/total. Para 'pago' y 'recarga', amount es bruto = base
  // (sin IVA). Stripe cobra el bruto + IVA por separado en el checkout (line
  // items con tax_behavior='exclusive') o lo veremos como inclusive según
  // configuración. Aquí asumimos amount = base (sin IVA) — el cron de Stripe
  // sync se encargará de reconciliar.
  const baseAmount = Number(tx.amount) || 0;
  const totals = computeInvoiceTotals(baseAmount, ivaTreatment);

  // Conceptos según tipo de transacción
  const conceptos = buildConceptos(tx, totals);

  // Reservar número correlativo (atómico)
  const serie = emisor.serie || 'A';
  const anio = new Date().getFullYear();
  const correlativo = await FacturaCounter.next(serie, anio);
  const numero = FacturaCounter.formatNumero(serie, anio, correlativo);

  // Notas legales aplicables
  const notasArr = [];
  if (!emisor.nif) notasArr.push(CIF_PENDING_NOTE);
  if (IVA_LEGAL_NOTES[ivaTreatment]) notasArr.push(IVA_LEGAL_NOTES[ivaTreatment]);

  const factura = await Factura.create({
    numero,
    serie,
    anio,
    correlativo,
    tipo,
    transaccion: tx._id,
    usuario: userFull._id,
    datosEmisor,
    datosReceptor,
    lineas: conceptos,
    base: totals.base,
    ivaRate: totals.rate,
    iva: totals.iva,
    total: totals.total,
    ivaTreatment,
    fechaEmision: tx.paidAt || tx.createdAt || new Date(),
    notas: notasArr.join(' '),
  });

  return factura;
}

function buildConceptos(tx, totals) {
  const tipo = tx.tipo || 'pago';
  const baseAmount = totals.base;

  if (tipo === 'recarga') {
    return [{
      concepto: 'Recarga de saldo Channelad',
      cantidad: 1,
      precioUnitario: baseAmount,
      importe: baseAmount,
    }];
  }
  if (tipo === 'retiro') {
    return [{
      concepto: 'Servicios de creador (retiro de ganancias)',
      cantidad: 1,
      precioUnitario: baseAmount,
      importe: baseAmount,
    }];
  }
  if (tipo === 'comision') {
    const rate = DEFAULT_COMMISSION_RATE;
    return [{
      concepto: `Comisión Channelad (${(rate * 100).toFixed(0)}%)`,
      cantidad: 1,
      precioUnitario: baseAmount,
      importe: baseAmount,
    }];
  }
  // pago de campaña (default)
  return [{
    concepto: tx.description || `Campaña Channelad #${String(tx._id).slice(-6).toUpperCase()}`,
    cantidad: 1,
    precioUnitario: baseAmount,
    importe: baseAmount,
  }];
}

// ──────────────────────────────────────────────────────────────────────────────
// RENDERING
// ──────────────────────────────────────────────────────────────────────────────

const escapeHtml = (str) => String(str || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

/**
 * Renderiza una Factura como HTML imprimible. Pure function — no toca DB.
 * @param {Factura} factura
 * @returns {string}
 */
function generateInvoiceHTML(factura) {
  if (!factura) throw new Error('Factura requerida');
  const f = factura.toObject ? factura.toObject() : factura;

  const fechaStr = new Date(f.fechaEmision).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const e = f.datosEmisor || {};
  const r = f.datosReceptor || {};

  const ivaPct = (f.ivaRate * 100).toFixed(0);
  const lineasHtml = (f.lineas || []).map(l => `
    <tr>
      <td>${escapeHtml(l.concepto)}</td>
      <td style="text-align:center">${l.cantidad}</td>
      <td style="text-align:right">${l.precioUnitario.toFixed(2)} €</td>
      <td style="text-align:right">${l.importe.toFixed(2)} €</td>
    </tr>
  `).join('');

  const ivaRowHtml = f.iva > 0
    ? `<div class="totals-row"><span>IVA (${ivaPct}%)</span><span>${f.iva.toFixed(2)} €</span></div>`
    : `<div class="totals-row" style="color:#64748b;font-style:italic"><span>IVA (${escapeHtml(ivaTreatmentLabel(f.ivaTreatment))})</span><span>0.00 €</span></div>`;

  const notas = f.notas
    ? `<div class="notas"><strong>Notas legales:</strong> ${escapeHtml(f.notas)}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Factura ${escapeHtml(f.numero)} — ${escapeHtml(e.razonSocial)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background: #fff; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 18px; border-bottom: 2px solid #e2e8f0; }
    .logo { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; } .logo span { color: #7c3aed; }
    .invoice-num { text-align: right; }
    .invoice-num h2 { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .invoice-num p { font-size: 22px; font-weight: 800; margin-top: 4px; font-family: 'JetBrains Mono', ui-monospace, monospace; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 28px; gap: 32px; }
    .party { flex: 1; }
    .party h3 { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .party p { font-size: 13px; line-height: 1.55; }
    .party .name { font-weight: 700; color: #1e293b; }
    .party .nif { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px; }
    .meta { display: flex; gap: 32px; margin-bottom: 28px; padding: 14px 18px; background: #f8fafc; border-radius: 8px; }
    .meta-item h3 { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .meta-item p { font-size: 13px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; text-align: left; padding: 11px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    th:nth-child(2) { text-align: center; } th:nth-child(3), th:nth-child(4) { text-align: right; }
    td { padding: 13px 14px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .totals { display: flex; justify-content: flex-end; }
    .totals-box { width: 320px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; }
    .totals-row.total { font-size: 18px; font-weight: 800; padding-top: 12px; border-top: 2px solid #1e293b; }
    .notas { margin-top: 24px; padding: 14px 18px; background: #fef3c7; border-left: 3px solid #f59e0b; border-radius: 4px; font-size: 12px; line-height: 1.5; color: #78350f; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:right;margin-bottom:18px">
    <button onclick="window.print()" style="background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:10px 22px;font-size:14px;font-weight:600;cursor:pointer">Imprimir / Guardar como PDF</button>
  </div>

  <div class="header">
    <div class="logo">Channel<span>ad</span></div>
    <div class="invoice-num">
      <h2>Factura ${f.tipo === 'rectificativa' ? '(Rectificativa)' : ''}</h2>
      <p>${escapeHtml(f.numero)}</p>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>Emisor</h3>
      <p>
        <span class="name">${escapeHtml(e.razonSocial)}</span><br>
        <span class="nif">NIF: ${escapeHtml(e.nif)}</span><br>
        ${escapeHtml(e.direccion)}<br>
        ${escapeHtml(e.cp)} ${escapeHtml(e.ciudad)}${e.provincia ? `, ${escapeHtml(e.provincia)}` : ''}<br>
        ${escapeHtml(e.pais)}
      </p>
    </div>
    <div class="party">
      <h3>Receptor</h3>
      <p>
        <span class="name">${escapeHtml(r.razonSocial)}</span><br>
        <span class="nif">${r.esEmpresa ? 'CIF/VAT' : 'NIF'}: ${escapeHtml(r.nif)}</span><br>
        ${escapeHtml(r.direccion)}<br>
        ${escapeHtml(r.cp)} ${escapeHtml(r.ciudad)}${r.provincia ? `, ${escapeHtml(r.provincia)}` : ''}<br>
        ${escapeHtml(r.pais)}
      </p>
    </div>
  </div>

  <div class="meta">
    <div class="meta-item"><h3>Fecha emisión</h3><p>${fechaStr}</p></div>
    <div class="meta-item"><h3>Número</h3><p style="font-family:'JetBrains Mono',ui-monospace,monospace">${escapeHtml(f.numero)}</p></div>
    <div class="meta-item"><h3>Tipo</h3><p>${escapeHtml(tipoLabel(f.tipo))}</p></div>
  </div>

  <table>
    <thead>
      <tr><th>Concepto</th><th>Cant.</th><th>P. unit.</th><th>Importe</th></tr>
    </thead>
    <tbody>
      ${lineasHtml}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="totals-row"><span>Base imponible</span><span>${f.base.toFixed(2)} €</span></div>
      ${ivaRowHtml}
      <div class="totals-row total"><span>Total</span><span>${f.total.toFixed(2)} €</span></div>
    </div>
  </div>

  ${notas}

  <div class="footer">
    <p>Channelad — channelad.io</p>
    <p>Factura ${escapeHtml(f.numero)} emitida el ${fechaStr}. Conserve este documento durante el plazo legal de prescripción fiscal (4 años).</p>
  </div>
</body>
</html>`;
}

function ivaTreatmentLabel(t) {
  return ({
    iva_normal: 'IVA aplicado',
    iva_normal_eu: 'IVA aplicado (UE)',
    iva_reverse_charge: 'inversión sujeto pasivo',
    iva_exento_export: 'exportación exenta',
  })[t] || t;
}

function tipoLabel(t) {
  return ({ emitida: 'Factura emitida', recibida: 'Factura recibida', rectificativa: 'Factura rectificativa' })[t] || t;
}

module.exports = {
  issueInvoiceForTransaction,
  generateInvoiceHTML,
  // Exposed for tests / admin tooling
  ivaTreatmentLabel,
  IVA_LEGAL_NOTES,
};
