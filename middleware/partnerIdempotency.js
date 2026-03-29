/**
 * Idempotency middleware for Partner API.
 * Uses in-memory cache (survives within a single process lifecycle).
 * For serverless, idempotency keys are best-effort.
 */

const cache = new Map();
const MAX_CACHE_SIZE = 5000;
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

const partnerIdempotency = (req, res, next) => {
  if (req.method !== 'POST') return next();

  const idempotencyKey = String(req.headers['idempotency-key'] || '').trim();
  const partnerId = req.partner?._id?.toString() || req.partner?.id;
  if (!idempotencyKey || !partnerId) return next();

  const fingerprint = `${partnerId}:${req.method}:${req.baseUrl}${req.path}:${idempotencyKey}`;
  const existing = cache.get(fingerprint);

  if (existing && (Date.now() - existing.at) < TTL_MS) {
    res.setHeader('Idempotency-Replayed', 'true');
    return res.status(existing.statusCode).json(existing.responseBody);
  }

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Evict oldest entries if cache is full
      if (cache.size >= MAX_CACHE_SIZE) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      cache.set(fingerprint, {
        statusCode: res.statusCode,
        responseBody: body,
        at: Date.now()
      });
    }
    return originalJson(body);
  };

  next();
};

module.exports = { partnerIdempotency };
