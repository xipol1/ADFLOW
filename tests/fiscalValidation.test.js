const {
  validateSpanishNIF,
  validateSpanishNIE,
  validateSpanishCIF,
  isValidFiscalId,
  requiresVIES,
  determineIvaTreatment,
  computeInvoiceTotals,
  IVA_RATE,
} = require('../lib/fiscalValidation');

describe('fiscalValidation — Spanish NIF/NIE/CIF', () => {
  // Known valid identifiers used in test fixtures published by Hacienda.
  describe('validateSpanishNIF', () => {
    test('accepts valid NIF', () => {
      expect(validateSpanishNIF('00000000T')).toBe(true);
      expect(validateSpanishNIF('12345678Z')).toBe(true);
      expect(validateSpanishNIF('99999999R')).toBe(true);
    });

    test('rejects invalid checksum letter', () => {
      expect(validateSpanishNIF('12345678A')).toBe(false);
      expect(validateSpanishNIF('00000000A')).toBe(false);
    });

    test('rejects malformed input', () => {
      expect(validateSpanishNIF('1234567Z')).toBe(false);   // too short
      expect(validateSpanishNIF('123456789')).toBe(false);  // no letter
      expect(validateSpanishNIF('')).toBe(false);
    });
  });

  describe('validateSpanishNIE', () => {
    test('accepts valid NIE', () => {
      expect(validateSpanishNIE('X0000000T')).toBe(true);
      expect(validateSpanishNIE('Y1234567X')).toBe(true);
    });

    test('rejects invalid checksum', () => {
      expect(validateSpanishNIE('X0000000A')).toBe(false);
    });

    test('rejects wrong prefix', () => {
      expect(validateSpanishNIE('A0000000T')).toBe(false);
    });
  });

  describe('validateSpanishCIF', () => {
    test('accepts valid CIF (digit control)', () => {
      // B-letter society with valid checksum
      expect(validateSpanishCIF('B58378431')).toBe(true);
    });

    test('rejects invalid checksum', () => {
      expect(validateSpanishCIF('B58378432')).toBe(false);
    });

    test('rejects malformed CIF', () => {
      expect(validateSpanishCIF('Z12345678')).toBe(false);   // wrong letter
      expect(validateSpanishCIF('B1234567')).toBe(false);    // too short
    });
  });
});

describe('fiscalValidation — isValidFiscalId', () => {
  test('Spain accepts NIF, NIE, CIF', () => {
    expect(isValidFiscalId('00000000T', 'ES')).toBe(true);
    expect(isValidFiscalId('X0000000T', 'ES')).toBe(true);
    expect(isValidFiscalId('B58378431', 'ES')).toBe(true);
  });

  test('Spain rejects invalid checksum', () => {
    expect(isValidFiscalId('00000000A', 'ES')).toBe(false);
  });

  test('strips VAT prefix when validating', () => {
    expect(isValidFiscalId('ES00000000T', 'ES')).toBe(true);
    expect(isValidFiscalId('ESB58378431', 'ES')).toBe(true);
  });

  test('Germany accepts 9-digit VAT', () => {
    expect(isValidFiscalId('DE123456789', 'DE')).toBe(true);
    expect(isValidFiscalId('123456789', 'DE')).toBe(true);
  });

  test('France accepts FR pattern', () => {
    expect(isValidFiscalId('FR12345678901', 'FR')).toBe(true);
  });

  test('non-EU country falls back to lenient check', () => {
    expect(isValidFiscalId('TAX123456', 'US')).toBe(true);
    expect(isValidFiscalId('a', 'US')).toBe(false);
  });

  test('empty input always invalid', () => {
    expect(isValidFiscalId('', 'ES')).toBe(false);
    expect(isValidFiscalId(null, 'ES')).toBe(false);
  });
});

describe('fiscalValidation — IVA treatment', () => {
  test('Spain → standard IVA', () => {
    expect(determineIvaTreatment({ pais: 'ES', esEmpresa: true })).toBe('iva_normal');
    expect(determineIvaTreatment({ pais: 'ES', esEmpresa: false })).toBe('iva_normal');
  });

  test('Intra-EU B2B with VIES validated → reverse charge', () => {
    expect(determineIvaTreatment({ pais: 'DE', esEmpresa: true, viesValidado: true })).toBe('iva_reverse_charge');
    expect(determineIvaTreatment({ pais: 'FR', esEmpresa: true, viesValidado: true })).toBe('iva_reverse_charge');
  });

  test('Intra-EU without VIES → treated as B2C with IVA', () => {
    expect(determineIvaTreatment({ pais: 'DE', esEmpresa: true, viesValidado: false })).toBe('iva_normal_eu');
    expect(determineIvaTreatment({ pais: 'DE', esEmpresa: false })).toBe('iva_normal_eu');
  });

  test('Non-EU → export, IVA exempt', () => {
    expect(determineIvaTreatment({ pais: 'US', esEmpresa: true })).toBe('iva_exento_export');
    expect(determineIvaTreatment({ pais: 'GB', esEmpresa: true })).toBe('iva_exento_export');
    expect(determineIvaTreatment({ pais: 'CH' })).toBe('iva_exento_export');
  });

  test('requiresVIES is true only for non-Spain EU countries', () => {
    expect(requiresVIES('ES')).toBe(false);
    expect(requiresVIES('DE')).toBe(true);
    expect(requiresVIES('FR')).toBe(true);
    expect(requiresVIES('US')).toBe(false);
    expect(requiresVIES('')).toBe(false);
  });
});

describe('fiscalValidation — computeInvoiceTotals', () => {
  test('iva_normal → 21% IVA', () => {
    const r = computeInvoiceTotals(100, 'iva_normal');
    expect(r.base).toBe(100);
    expect(r.iva).toBe(21);
    expect(r.total).toBe(121);
    expect(r.rate).toBe(IVA_RATE);
  });

  test('iva_reverse_charge → 0%', () => {
    const r = computeInvoiceTotals(100, 'iva_reverse_charge');
    expect(r.iva).toBe(0);
    expect(r.total).toBe(100);
    expect(r.rate).toBe(0);
  });

  test('iva_exento_export → 0%', () => {
    const r = computeInvoiceTotals(100, 'iva_exento_export');
    expect(r.iva).toBe(0);
    expect(r.total).toBe(100);
  });

  test('rounds to 2 decimals', () => {
    const r = computeInvoiceTotals(33.33, 'iva_normal');
    expect(r.iva).toBe(7);          // 33.33 * 0.21 = 6.9993 → 7.00
    expect(r.total).toBe(40.33);
  });

  test('zero / NaN safe', () => {
    expect(computeInvoiceTotals(0, 'iva_normal').total).toBe(0);
    expect(computeInvoiceTotals(undefined, 'iva_normal').total).toBe(0);
  });
});
