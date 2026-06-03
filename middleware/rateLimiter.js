const rateLimit = require('express-rate-limit');

// Use a MongoDB-backed store for distributed rate limiting (Vercel serverless).
// Custom store over the app's mongoose connection — replaces the unmaintained
// `rate-limit-mongo`, which pulled a vulnerable, unpatched `underscore`. The
// store itself is fail-open, so a Mongo outage degrades to "not blocked"
// rather than erroring requests.
let storeFactory = null;
try {
  const MongoRateLimitStore = require('./mongoRateLimitStore');
  if (process.env.MONGODB_URI) {
    storeFactory = () => new MongoRateLimitStore({ collectionName: 'rateLimits' });
  }
} catch {
  // Store unavailable, fall back to express-rate-limit's in-memory store.
}

const limitarIntentos = (options = {}) => {
  const windowMs = options.windowMs ?? 15 * 60 * 1000;
  const max = options.max ?? 100;

  // Bypass rate limiting in test (jest bursts many requests) and in local
  // development (so iterating on forms / wizards doesn't lock you out of
  // your own endpoints). Production behavior unchanged.
  const baseSkip = options.skip;
  const skip = (req, res) => {
    if (process.env.NODE_ENV === 'test') return true;
    if (process.env.NODE_ENV === 'development') return true;
    return baseSkip ? baseSkip(req, res) : false;
  };

  const config = {
    windowMs,
    max,
    standardHeaders: options.standardHeaders ?? true,
    legacyHeaders: options.legacyHeaders ?? false,
    message: options.message || { success: false, message: 'Demasiadas solicitudes' },
    skip,
  };

  // Pass through optional fields the caller may need (keyGenerator, skip,
  // requestPropertyName, statusCode, …). Forwarding only the documented
  // express-rate-limit options keeps rateLimit happy while still allowing
  // route-specific keying like (userId, resourceId) for chat / per-resource
  // limits that can't be safely keyed on req.ip alone.
  for (const k of ['keyGenerator', 'requestPropertyName', 'statusCode', 'handler']) {
    if (options[k] !== undefined) config[k] = options[k];
  }

  if (storeFactory) {
    config.store = storeFactory(windowMs);
  }

  return rateLimit(config);
};

const limitadorAPI = limitarIntentos({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Demasiadas solicitudes a la API. Intenta más tarde.' }
});

const limitadorGeneral = limitarIntentos({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: { success: false, message: 'Límite temporal alcanzado. Intenta nuevamente.' }
});

const limitadorEndpoint = {
  crearCanal: limitarIntentos({ windowMs: 60 * 60 * 1000, max: 20 }),
  crearAnuncio: limitarIntentos({ windowMs: 60 * 60 * 1000, max: 40 }),
  crearTransaccion: limitarIntentos({ windowMs: 60 * 60 * 1000, max: 30 })
};

module.exports = {
  limitarIntentos,
  limitadorAPI,
  limitadorGeneral,
  limitadorEndpoint
};
