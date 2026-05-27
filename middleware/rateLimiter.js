const rateLimit = require('express-rate-limit');

// Use MongoDB store for distributed rate limiting (Vercel serverless)
let storeFactory = null;
try {
  const MongoStore = require('rate-limit-mongo');
  if (process.env.MONGODB_URI) {
    storeFactory = (windowMs) => new MongoStore({
      uri: process.env.MONGODB_URI,
      collectionName: 'rateLimits',
      expireTimeMs: windowMs,
      errorHandler: (err) => {
        // Fall back to memory if Mongo fails — don't block requests
        console.error('Rate limit MongoDB store error:', err?.message);
      },
    });
  }
} catch {
  // rate-limit-mongo not available, fall back to in-memory
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
