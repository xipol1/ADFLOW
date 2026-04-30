/**
 * Validación fiscal — NIF/CIF español + VAT intra-UE.
 *
 * Spanish ID validation (NIF/NIE/CIF) implements the official letter-checksum
 * algorithm published by the Agencia Tributaria. EU VAT format validation
 * follows the regex patterns published by the European Commission (VIES).
 *
 * Esta capa solo valida formato. La verificación VIES contra la base
 * de datos en línea de la Comisión Europea vive en services/viesService.js.
 */

// Países UE (ISO 3166-1 alpha-2). Usado para decidir si aplicar VIES.
// IMPORTANT: VAT prefix uses 'EL' for Greece (not 'GR') — Greece is the
// only EU country whose VAT prefix differs from its ISO code.
const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR',
  'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL',
  'PT', 'RO', 'SE', 'SI', 'SK',
];

// VAT-number country prefix. Greece uses 'EL', everything else matches ISO.
const VAT_PREFIX_BY_COUNTRY = { GR: 'EL' };
const vatPrefixForCountry = (iso) => VAT_PREFIX_BY_COUNTRY[iso] || iso;

// Per-country VAT regex (excluding the 2-letter prefix). Sourced from
// https://ec.europa.eu/taxation_customs/vies/faqvies.do (annex).
const EU_VAT_REGEX = {
  AT: /^U\d{8}$/,
  BE: /^[01]\d{9}$/,
  BG: /^\d{9,10}$/,
  CY: /^\d{8}[A-Z]$/,
  CZ: /^\d{8,10}$/,
  DE: /^\d{9}$/,
  DK: /^\d{8}$/,
  EE: /^\d{9}$/,
  ES: /^[A-Z0-9]\d{7}[A-Z0-9]$/,
  FI: /^\d{8}$/,
  FR: /^[A-Z0-9]{2}\d{9}$/,
  EL: /^\d{9}$/,           // Greece
  HR: /^\d{11}$/,
  HU: /^\d{8}$/,
  IE: /^\d{7}[A-Z]{1,2}$|^\d[A-Z]\d{5}[A-Z]$/,
  IT: /^\d{11}$/,
  LT: /^(\d{9}|\d{12})$/,
  LU: /^\d{8}$/,
  LV: /^\d{11}$/,
  MT: /^\d{8}$/,
  NL: /^\d{9}B\d{2}$/,
  PL: /^\d{10}$/,
  PT: /^\d{9}$/,
  RO: /^\d{2,10}$/,
  SE: /^\d{12}$/,
  SI: /^\d{8}$/,
  SK: /^\d{10}$/,
};

const NIF_LETTER = 'TRWAGMYFPDXBNJZSQVHLCKE';
// CIF check character (digit or letter) per Hacienda algorithm.
const CIF_CONTROL_LETTERS = 'JABCDEFGHI';

const stripVatPrefix = (value, country) => {
  if (!value) return '';
  const v = String(value).toUpperCase().replace(/[\s\-.]/g, '');
  const prefix = vatPrefixForCountry(country);
  if (prefix && v.startsWith(prefix)) return v.slice(prefix.length);
  return v;
};

/**
 * Validate a Spanish NIF (citizen ID, 8 digits + control letter).
 * Algorithm: control letter = NIF_LETTER[number mod 23].
 */
function validateSpanishNIF(value) {
  if (!/^\d{8}[A-Z]$/.test(value)) return false;
  const number = parseInt(value.slice(0, 8), 10);
  const expected = NIF_LETTER[number % 23];
  return value[8] === expected;
}

/**
 * Validate a Spanish NIE (foreign resident ID, X/Y/Z + 7 digits + letter).
 * X→0, Y→1, Z→2 are substituted before applying the NIF algorithm.
 */
function validateSpanishNIE(value) {
  if (!/^[XYZ]\d{7}[A-Z]$/.test(value)) return false;
  const map = { X: '0', Y: '1', Z: '2' };
  const replaced = map[value[0]] + value.slice(1, 8);
  const number = parseInt(replaced, 10);
  const expected = NIF_LETTER[number % 23];
  return value[8] === expected;
}

/**
 * Validate a Spanish CIF (legal entity / sociedad).
 * Format: letter + 7 digits + control char (digit or letter).
 * Letter codes A,B,C,D,E,F,G,H,J,N,P,Q,R,S,U,V,W (Hacienda CIF letters).
 */
function validateSpanishCIF(value) {
  if (!/^[ABCDEFGHJKLMNPQRSUVW]\d{7}[A-J0-9]$/.test(value)) return false;
  const letter = value[0];
  const digits = value.slice(1, 8);
  const control = value[8];
  let evenSum = 0, oddSum = 0;
  for (let i = 0; i < 7; i++) {
    const d = parseInt(digits[i], 10);
    if (i % 2 === 0) {
      // odd position (1st, 3rd, ...) — multiply by 2 then sum digits
      const doubled = d * 2;
      oddSum += Math.floor(doubled / 10) + (doubled % 10);
    } else {
      evenSum += d;
    }
  }
  const total = evenSum + oddSum;
  const checkDigit = (10 - (total % 10)) % 10;
  // P, Q, R, S, W, N → must use letter; K, L → letter; rest can use digit or letter.
  // For tolerance we accept either digit or matching letter.
  const expectedDigit = String(checkDigit);
  const expectedLetter = CIF_CONTROL_LETTERS[checkDigit];
  return control === expectedDigit || control === expectedLetter;
}

/**
 * Top-level validator: given a fiscal id and country, returns whether it
 * passes format + checksum validation for that jurisdiction.
 */
function isValidFiscalId(rawValue, country = 'ES') {
  if (!rawValue) return false;
  const iso = String(country).toUpperCase();
  const value = stripVatPrefix(rawValue, iso);

  if (iso === 'ES') {
    return validateSpanishNIF(value) || validateSpanishNIE(value) || validateSpanishCIF(value);
  }

  // EU country: regex format check only — full validation requires VIES.
  if (EU_COUNTRIES.includes(iso)) {
    const re = EU_VAT_REGEX[vatPrefixForCountry(iso)] || EU_VAT_REGEX[iso];
    if (!re) return value.length >= 4; // unknown EU member: lenient
    return re.test(value);
  }

  // Non-EU: require at least 4 alphanumeric characters.
  return /^[A-Z0-9]{4,}$/i.test(value);
}

/**
 * Returns true if the country requires VIES validation for B2B reverse-charge.
 * VIES does not apply to:
 *  - Spain (domestic — IVA charged)
 *  - Non-EU countries (export — IVA exempt without VIES)
 */
function requiresVIES(country) {
  const iso = String(country || '').toUpperCase();
  return EU_COUNTRIES.includes(iso) && iso !== 'ES';
}

/**
 * Returns IVA treatment for a transaction given the customer fiscal data.
 *  - 'iva_normal'         → 21% standard IVA (Spain domestic)
 *  - 'iva_reverse_charge' → 0% (intra-EU B2B with valid VIES)
 *  - 'iva_exento_export'  → 0% (export outside EU)
 *  - 'iva_normal_eu'      → 21% (intra-EU but customer not VIES-validated, treated as B2C)
 */
function determineIvaTreatment({ pais, esEmpresa, viesValidado } = {}) {
  const iso = String(pais || 'ES').toUpperCase();
  if (iso === 'ES') return 'iva_normal';
  if (!EU_COUNTRIES.includes(iso)) return 'iva_exento_export';
  // Intra-EU
  if (esEmpresa && viesValidado) return 'iva_reverse_charge';
  return 'iva_normal_eu';
}

const IVA_RATE = 0.21;

/**
 * Compute IVA amount and total given a base + treatment.
 * Returns { base, iva, total, rate, treatment }.
 */
function computeInvoiceTotals(baseAmount, treatment) {
  const base = Number(baseAmount) || 0;
  const applyIva = treatment === 'iva_normal' || treatment === 'iva_normal_eu';
  const rate = applyIva ? IVA_RATE : 0;
  const iva = +(base * rate).toFixed(2);
  const total = +(base + iva).toFixed(2);
  return { base: +base.toFixed(2), iva, total, rate, treatment };
}

module.exports = {
  EU_COUNTRIES,
  vatPrefixForCountry,
  stripVatPrefix,
  validateSpanishNIF,
  validateSpanishNIE,
  validateSpanishCIF,
  isValidFiscalId,
  requiresVIES,
  determineIvaTreatment,
  computeInvoiceTotals,
  IVA_RATE,
};
