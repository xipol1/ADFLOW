/**
 * Idempotency middleware for Partner API — Mongo-backed.
 *
 * Pattern: atomic upsert acts as the lock.
 *   - First request: upsert inserts a `pending` doc; we proceed and on
 *     response store statusCode + responseBody + status='completed'.
 *   - Concurrent request with the same key: upsert finds the existing
 *     doc; if not yet completed → 409 (caller retries); if completed →
 *     replay the cached response.
 *   - Retry after completion: returns the cached response with the
 *     Idempotency-Replayed header.
 *
 * Best-effort if Mongo isn't reachable: we let the request through
 * rather than blocking the partner API. The partner side is supposed
 * to handle a missing replay anyway.
 */

const partnerIdempotency = async (req, res, next) => {
  if (req.method !== 'POST') return next();

  const idempotencyKey = String(req.headers['idempotency-key'] || '').trim();
  const partnerId = req.partner?._id?.toString() || req.partner?.id;
  if (!idempotencyKey || !partnerId) return next();

  // Lazy require so the middleware doesn't break the module graph when
  // Mongoose isn't yet connected (e.g. cold-start before ensureDb).
  let PartnerIdempotency;
  try { PartnerIdempotency = require('../models/PartnerIdempotency'); }
  catch (e) { return next(); }

  const fingerprint = `${partnerId}:${req.method}:${req.baseUrl}${req.path}:${idempotencyKey}`;

  let prev;
  try {
    prev = await PartnerIdempotency.findOneAndUpdate(
      { fingerprint },
      { $setOnInsert: { fingerprint, partnerId, status: 'pending', createdAt: new Date() } },
      { upsert: true, new: false, setDefaultsOnInsert: true }
    ).lean();
  } catch (err) {
    // Mongo unreachable or transient error — let the request through so
    // a transient DB blip doesn't take down the partner integration.
    console.warn('partnerIdempotency lookup failed:', err?.message);
    return next();
  }

  if (prev) {
    if (prev.status === 'completed' && prev.responseBody !== null) {
      res.setHeader('Idempotency-Replayed', 'true');
      return res.status(prev.statusCode || 200).json(prev.responseBody);
    }
    // pending — concurrent request. Tell partner to retry.
    res.setHeader('Idempotency-Pending', 'true');
    return res.status(409).json({
      success: false,
      message: 'Request with this Idempotency-Key is still in progress, retry shortly',
    });
  }

  // We hold the lock. Wrap res.json so the final response is persisted.
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    // Store only successful or business-known terminal responses so a 500
    // doesn't poison the slot. The partner can retry after a 5xx with the
    // same key and hit the controller again — that's the intended behavior.
    const sc = res.statusCode;
    const isFinal = sc >= 200 && sc < 500;
    if (isFinal) {
      PartnerIdempotency.updateOne(
        { fingerprint },
        { $set: { status: 'completed', statusCode: sc, responseBody: body, completedAt: new Date() } }
      ).catch(err => console.warn('partnerIdempotency persist failed:', err?.message));
    } else {
      // 5xx — release the lock so retries can re-enter.
      PartnerIdempotency.deleteOne({ fingerprint })
        .catch(err => console.warn('partnerIdempotency release failed:', err?.message));
    }
    return originalJson(body);
  };

  next();
};

module.exports = { partnerIdempotency };
