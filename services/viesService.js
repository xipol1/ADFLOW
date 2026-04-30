/**
 * VIES Service — Validación de VAT intra-comunitario contra el sistema
 * VIES (VAT Information Exchange System) de la Comisión Europea.
 *
 * VIES es la única fuente oficial para confirmar que un VAT number
 * intra-comunitario está activo en la AEAT/equivalente del país. Sin
 * esta validación, no se puede aplicar reverse charge legalmente —
 * la operación se trata como B2C con IVA español.
 *
 * Endpoint REST público (gratuito, sin clave): https://ec.europa.eu/taxation_customs/vies/rest-api/
 *   GET /ms/check-vat-number?countryCode=DE&vatNumber=123456789
 *
 * Política operacional: la API VIES tiene SLA pobre (downtime frecuente
 * y rate-limit no documentado). Si la petición falla por timeout o 5xx,
 * NO marcamos el VAT como validado (mejor falsear B2C-con-IVA que
 * aplicar reverse charge sin confirmación).
 */

const https = require('https');
const Usuario = require('../models/Usuario');
const { stripVatPrefix, requiresVIES, vatPrefixForCountry, EU_COUNTRIES } = require('../lib/fiscalValidation');
const logger = require('../lib/logger');

const VIES_HOST = 'ec.europa.eu';
const VIES_PATH_BASE = '/taxation_customs/vies/rest-api/ms/check-vat-number';
const REQUEST_TIMEOUT_MS = 8000;

/**
 * Llama a VIES y devuelve la respuesta cruda. No persiste nada.
 * @returns {Promise<{valid: boolean, name?: string, address?: string, raw: any}>}
 */
function checkVatViaVIES(countryCode, vatNumber) {
  return new Promise((resolve, reject) => {
    // VIES uses the VAT prefix code (EL for Greece). The country code
    // in the URL is the same prefix.
    const code = vatPrefixForCountry(countryCode);
    const number = stripVatPrefix(vatNumber, countryCode);
    const path = `${VIES_PATH_BASE}?countryCode=${encodeURIComponent(code)}&vatNumber=${encodeURIComponent(number)}`;

    const req = https.request({
      host: VIES_HOST,
      path,
      method: 'GET',
      headers: { 'Accept': 'application/json', 'User-Agent': 'channelad-vies/1.0' },
      timeout: REQUEST_TIMEOUT_MS,
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode >= 500) {
            return reject(new Error(`VIES upstream ${res.statusCode}`));
          }
          const json = JSON.parse(body || '{}');
          // VIES response shape:
          //   { valid: boolean, name: string, address: string, ... }
          //   or { errorWrappers: [{ error: 'INVALID_INPUT' | 'MS_UNAVAILABLE' | ... }] }
          if (json.errorWrappers?.length) {
            const code = json.errorWrappers[0]?.error || 'unknown';
            // INVALID_INPUT means malformed VAT (treat as not valid).
            // MS_UNAVAILABLE/TIMEOUT means we can't tell — propagate.
            if (code === 'INVALID_INPUT' || code === 'INVALID_REQUESTER_INFO') {
              return resolve({ valid: false, raw: json });
            }
            return reject(new Error(`VIES error: ${code}`));
          }
          resolve({
            valid: !!json.valid,
            name: json.name,
            address: json.address,
            raw: json,
          });
        } catch (parseErr) {
          reject(new Error(`VIES parse error: ${parseErr.message}`));
        }
      });
    });
    req.on('error', (err) => reject(err));
    req.on('timeout', () => { req.destroy(new Error('VIES timeout')); });
    req.end();
  });
}

/**
 * Valida VIES para un usuario y persiste el resultado en su datosFacturacion.
 * Solo opera en países UE (no-ES). Para España devuelve { skipped: true }.
 *
 * Usar con precaución desde flujos críticos: la latencia puede ser de
 * varios segundos y la API es propensa a fallar. Idealmente, llamar
 * desde un job en background tras el guardado del NIF.
 */
async function validateUserVIES(userId) {
  const user = await Usuario.findById(userId);
  if (!user) throw new Error('Usuario no encontrado');
  const df = user.datosFacturacion || {};

  if (!requiresVIES(df.pais)) {
    return { skipped: true, reason: 'país no requiere VIES' };
  }
  if (!df.nif) {
    return { skipped: true, reason: 'sin NIF' };
  }
  if (!df.esEmpresa) {
    return { skipped: true, reason: 'no es empresa' };
  }

  let result;
  try {
    result = await checkVatViaVIES(df.pais, df.nif);
  } catch (err) {
    logger.warn?.('vies.lookup_failed', { userId: String(userId), msg: err?.message });
    // No persistimos cambios — viesValidado se queda como estaba.
    return { error: err.message };
  }

  user.datosFacturacion.viesValidado = !!result.valid;
  user.datosFacturacion.viesValidadoAt = result.valid ? new Date() : null;
  await user.save();

  return { valid: result.valid, name: result.name };
}

module.exports = {
  checkVatViaVIES,
  validateUserVIES,
  EU_COUNTRIES,
};
