const mongoose = require('mongoose');

// One document per rate-limit key (default key = req.ip). State lives in Mongo
// so the limit is shared across serverless instances (Vercel), unlike the
// in-memory store. This replaces the unmaintained `rate-limit-mongo`, which
// depended on a vulnerable, unpatched `underscore` (GHSA-qpx9-hpmf-5gmw).
//
// Fixed-window semantics, matching the previous store: a window opens on the
// first hit and `count` accumulates until it expires, then the next hit starts
// a fresh window. The logical reset is enforced ATOMICALLY in increment() via a
// $cond on expireAt, so correctness never depends on the TTL reaper's timing
// (the TTL index below is only opportunistic cleanup).
const schema = new mongoose.Schema(
  {
    _id: String, // the rate-limit key
    count: { type: Number, default: 0 },
    expireAt: { type: Date },
  },
  { versionKey: false }
);

// Mongo deletes the doc once expireAt < now (lazy, ~60s). Logical expiry is
// handled in increment(); this just stops the collection growing unbounded.
schema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

function getModel(collectionName) {
  const modelName = `__ratelimit_${collectionName}`;
  return mongoose.models[modelName] || mongoose.model(modelName, schema, collectionName);
}

/**
 * Minimal express-rate-limit v6 Store backed by the app's existing mongoose
 * connection.
 */
class MongoRateLimitStore {
  constructor({ collectionName = 'rateLimits' } = {}) {
    this.collectionName = collectionName;
    this.windowMs = 60 * 1000;
    this.Model = null;
  }

  // Called once by express-rate-limit with the resolved middleware options.
  init(options) {
    if (options && Number.isFinite(options.windowMs)) this.windowMs = options.windowMs;
  }

  _model() {
    if (!this.Model) this.Model = getModel(this.collectionName);
    return this.Model;
  }

  async increment(key) {
    const newExpire = new Date(Date.now() + this.windowMs);
    try {
      const doc = await this._model().findOneAndUpdate(
        { _id: key },
        [
          {
            $set: {
              // Window still open → +1; expired or new → reset to 1.
              count: {
                $cond: [
                  { $gt: ['$expireAt', '$$NOW'] },
                  { $add: [{ $ifNull: ['$count', 0] }, 1] },
                  1,
                ],
              },
              // Keep the open window's deadline; otherwise start a new window.
              expireAt: {
                $cond: [{ $gt: ['$expireAt', '$$NOW'] }, '$expireAt', newExpire],
              },
            },
          },
        ],
        { upsert: true, new: true }
      );
      return { totalHits: doc.count, resetTime: doc.expireAt };
    } catch (err) {
      // Fail-open: a degraded store must never block traffic (mirrors the old
      // errorHandler that fell back to memory). One hit, fresh window.
      console.error('MongoRateLimitStore increment error:', err?.message);
      return { totalHits: 1, resetTime: newExpire };
    }
  }

  async decrement(key) {
    try {
      await this._model().updateOne({ _id: key, count: { $gt: 0 } }, { $inc: { count: -1 } });
    } catch (err) {
      console.error('MongoRateLimitStore decrement error:', err?.message);
    }
  }

  async resetKey(key) {
    try {
      await this._model().deleteOne({ _id: key });
    } catch (err) {
      console.error('MongoRateLimitStore resetKey error:', err?.message);
    }
  }
}

module.exports = MongoRateLimitStore;
