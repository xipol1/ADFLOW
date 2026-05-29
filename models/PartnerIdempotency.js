const mongoose = require('mongoose');

/**
 * PartnerIdempotency — durable replay protection for the Partner API.
 *
 * Why a collection instead of an in-memory Map: every Vercel serverless
 * invocation can hit a different instance, so an in-process Map drops keys
 * across cold starts and the partner gets charged twice on retries.
 *
 * Lifecycle:
 *   pending   — first request just took the lock (upsert succeeded);
 *               concurrent requests with the same key get 409 "in flight".
 *   completed — first request finished and stored statusCode + responseBody;
 *               subsequent requests get the cached response (replay).
 *
 * TTL: 24h. After that the key expires and the same idempotency-key can
 * be reused (rare on the partner side but harmless if it happens).
 */
const PartnerIdempotencySchema = new mongoose.Schema(
  {
    fingerprint: { type: String, required: true, unique: true, index: true },
    partnerId:   { type: String, required: true, index: true },
    status:      { type: String, enum: ['pending', 'completed'], default: 'pending' },
    statusCode:  { type: Number, default: null },
    responseBody:{ type: mongoose.Schema.Types.Mixed, default: null },
    completedAt: { type: Date, default: null },
    // TTL — Mongo auto-deletes after 24h.
    createdAt:   { type: Date, default: Date.now, expires: 60 * 60 * 24 },
  },
  { versionKey: false }
);

module.exports = mongoose.models.PartnerIdempotency
  || mongoose.model('PartnerIdempotency', PartnerIdempotencySchema);
