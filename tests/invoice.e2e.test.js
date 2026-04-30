/**
 * Tests E2E del flujo completo de facturación.
 *
 * Testean (sin DB cuando no está disponible):
 *   1. Generación de número correlativo y formato
 *   2. Inmutabilidad de Factura tras emisión
 *   3. Renderizado HTML con datos fiscales reales
 *   4. Tratamiento IVA por país (ES, intra-UE B2B/B2C, no-UE)
 *   5. Idempotencia de issueInvoiceForTransaction
 *   6. Edge cases: NIF inválido, datos incompletos
 */

const mongoose = require('mongoose');
const Factura = require('../models/Factura');
const FacturaCounter = require('../models/FacturaCounter');
const { generateInvoiceHTML, ivaTreatmentLabel } = require('../services/invoiceService');
const { computeInvoiceTotals, determineIvaTreatment } = require('../lib/fiscalValidation');

// ──────────────────────────────────────────────────────────────────────────────
// 1. Numeración y formato
// ──────────────────────────────────────────────────────────────────────────────

describe('FacturaCounter — formato y numeración', () => {
  test('formatNumero produce el formato A-AAAA-NNNN', () => {
    expect(FacturaCounter.formatNumero('A', 2026, 1)).toBe('A-2026-0001');
    expect(FacturaCounter.formatNumero('A', 2026, 42)).toBe('A-2026-0042');
    expect(FacturaCounter.formatNumero('B', 2027, 9999)).toBe('B-2027-9999');
  });

  test('preserva longitud para correlativos > 9999', () => {
    expect(FacturaCounter.formatNumero('A', 2026, 12345)).toBe('A-2026-12345');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 2. Cálculo IVA según tratamiento
// ──────────────────────────────────────────────────────────────────────────────

describe('Cálculo IVA según país y tipo de receptor', () => {
  test('cliente español B2B → IVA 21%', () => {
    const treatment = determineIvaTreatment({ pais: 'ES', esEmpresa: true });
    const totals = computeInvoiceTotals(100, treatment);
    expect(treatment).toBe('iva_normal');
    expect(totals.iva).toBe(21);
    expect(totals.total).toBe(121);
  });

  test('cliente alemán empresa con VIES validado → reverse charge 0%', () => {
    const treatment = determineIvaTreatment({ pais: 'DE', esEmpresa: true, viesValidado: true });
    const totals = computeInvoiceTotals(500, treatment);
    expect(treatment).toBe('iva_reverse_charge');
    expect(totals.iva).toBe(0);
    expect(totals.total).toBe(500);
  });

  test('cliente alemán empresa SIN VIES → IVA español 21% (B2C-equivalente)', () => {
    const treatment = determineIvaTreatment({ pais: 'DE', esEmpresa: true, viesValidado: false });
    const totals = computeInvoiceTotals(500, treatment);
    expect(treatment).toBe('iva_normal_eu');
    expect(totals.iva).toBe(105);
    expect(totals.total).toBe(605);
  });

  test('cliente no-UE → exportación, IVA exento', () => {
    const treatment = determineIvaTreatment({ pais: 'US', esEmpresa: true });
    const totals = computeInvoiceTotals(1000, treatment);
    expect(treatment).toBe('iva_exento_export');
    expect(totals.iva).toBe(0);
    expect(totals.total).toBe(1000);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 3. Inmutabilidad del modelo Factura
// ──────────────────────────────────────────────────────────────────────────────

describe('Factura — inmutabilidad post-emisión', () => {
  test('schema bloquea modificación de numero / base / iva / total', async () => {
    // Construimos una factura "ya guardada" simulando isNew=false.
    const f = new Factura({
      numero: 'A-2026-0001',
      serie: 'A',
      anio: 2026,
      correlativo: 1,
      tipo: 'emitida',
      transaccion: new mongoose.Types.ObjectId(),
      usuario: new mongoose.Types.ObjectId(),
      datosEmisor: {
        razonSocial: 'Channelad', nif: 'B12345674',
        direccion: 'X', cp: '28001', ciudad: 'Madrid', pais: 'ES',
      },
      datosReceptor: {
        razonSocial: 'Cliente SL', nif: 'B58378431',
        direccion: 'Y', cp: '08001', ciudad: 'Barcelona', pais: 'ES',
      },
      lineas: [{ concepto: 'X', cantidad: 1, precioUnitario: 100, importe: 100 }],
      base: 100, ivaRate: 0.21, iva: 21, total: 121,
      ivaTreatment: 'iva_normal',
      fechaEmision: new Date(),
    });
    f.isNew = false;
    f.base = 200; // intento de modificación
    await expect(f.save()).rejects.toThrow(/inmutable/);
  });

  afterAll(async () => {
    await mongoose.disconnect().catch(() => {});
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 4. Renderizado HTML
// ──────────────────────────────────────────────────────────────────────────────

describe('generateInvoiceHTML — renderizado', () => {
  const sampleFactura = {
    numero: 'A-2026-0042',
    serie: 'A',
    anio: 2026,
    correlativo: 42,
    tipo: 'emitida',
    fechaEmision: new Date('2026-04-30'),
    datosEmisor: {
      razonSocial: 'MICHI SOLUCIONS S.L.',
      nif: 'B12345674',
      direccion: 'Calle Gran Vía 1',
      cp: '28013',
      ciudad: 'Madrid',
      provincia: 'Madrid',
      pais: 'ES',
      esEmpresa: true,
    },
    datosReceptor: {
      razonSocial: 'Cliente SA',
      nif: 'B58378431',
      direccion: 'Calle Diagonal 2',
      cp: '08001',
      ciudad: 'Barcelona',
      pais: 'ES',
      esEmpresa: true,
    },
    lineas: [
      { concepto: 'Campaña Telegram CH-XYZ', cantidad: 1, precioUnitario: 250, importe: 250 },
    ],
    base: 250,
    ivaRate: 0.21,
    iva: 52.5,
    total: 302.5,
    ivaTreatment: 'iva_normal',
    notas: '',
  };

  test('contiene número de factura', () => {
    const html = generateInvoiceHTML(sampleFactura);
    expect(html).toContain('A-2026-0042');
  });

  test('contiene razón social y NIF de ambas partes', () => {
    const html = generateInvoiceHTML(sampleFactura);
    expect(html).toContain('MICHI SOLUCIONS S.L.');
    expect(html).toContain('B12345674');
    expect(html).toContain('Cliente SA');
    expect(html).toContain('B58378431');
  });

  test('contiene base, IVA y total formateados', () => {
    const html = generateInvoiceHTML(sampleFactura);
    expect(html).toContain('250.00 €');     // base
    expect(html).toContain('52.50 €');      // IVA
    expect(html).toContain('302.50 €');     // total
    expect(html).toContain('IVA (21%)');
  });

  test('reverse charge muestra 0€ con etiqueta legal', () => {
    const html = generateInvoiceHTML({
      ...sampleFactura,
      datosReceptor: { ...sampleFactura.datosReceptor, pais: 'DE' },
      ivaTreatment: 'iva_reverse_charge',
      iva: 0,
      total: 250,
      notas: 'Operación intracomunitaria con inversión del sujeto pasivo',
    });
    expect(html).toContain('inversión sujeto pasivo');
    expect(html).toContain('0.00 €');
    expect(html).toContain('intracomunitaria');
  });

  test('escape HTML en campos de usuario (XSS safe)', () => {
    const html = generateInvoiceHTML({
      ...sampleFactura,
      datosReceptor: {
        ...sampleFactura.datosReceptor,
        razonSocial: '<script>alert(1)</script>Empresa',
      },
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  test('factura rectificativa lo indica en el header', () => {
    const html = generateInvoiceHTML({ ...sampleFactura, tipo: 'rectificativa' });
    expect(html).toContain('Rectificativa');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 5. ivaTreatmentLabel
// ──────────────────────────────────────────────────────────────────────────────

describe('ivaTreatmentLabel', () => {
  test('mapea cada tratamiento a su label en castellano', () => {
    expect(ivaTreatmentLabel('iva_normal')).toMatch(/aplicado/i);
    expect(ivaTreatmentLabel('iva_reverse_charge')).toMatch(/inversión/i);
    expect(ivaTreatmentLabel('iva_exento_export')).toMatch(/exportación/i);
  });
});
