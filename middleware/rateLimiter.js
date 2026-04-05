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

  const config = {
    windowMs,
    max,
    standardHeaders: options.standardHeaders ?? true,
    legacyHeaders: options.legacyHeaders ?? false,
    message: options.message || { success: false, message: 'Demasiadas solicitudes' },
  };

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
