const mongoose = require('mongoose');

/**
 * PayoutAttempt — durable record of every Stripe Connect transfer the
 * platform tries to make to a creator after a campaign moves to COMPLETED.
 *
 * Why this exists: previously the transfer was fired from a setImmediate()
 * inside completeCampaign and only logged with console.error on failure.
 * If Stripe rejected the transfer (creator account not enabled, capability
 * pending, requirements due), nobody noticed until the creator complained.
 * Now every attempt is recorded; admin can list pending/failed ones and
 * retry them explicitly.
 *
 * Lifecycle:
 *   pending     — row created, transfer not yet attempted
 *   processing  — transferToCreator() in flight (set right before the call)
 *   succeeded   — Stripe accepted the transfer; stripeTransferId set
 *   failed      — Stripe returned an error; lastError populated, attempts++
 *
 * Idempotency: stripeIdempotencyKey is the same key passed to Stripe
 * (transfer:<campaignId>) so a retry of the same row never produces a
 * second transfer on Stripe's side.
 */
const PayoutAttemptSchema = new mongoose.Schema(
  {
    campaign:           { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    creator:            { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario',  required: true, index: true },
    stripeAccountId:    { type: String, required: true },
    amount:             { type: Number, required: true, min: 0 }, // EUR (not cents)
    currency:           { type: String, default: 'eur' },
    status: {
      type: String,
      enum: ['pending', 'processing', 'succeeded', 'failed'],
      default: 'pending',
      index: true,
    },
    attempts:           { type: Number, default: 0 },
    lastError:          { type: String, default: null },
    lastAttemptedAt:    { type: Date,   default: null },
    succeededAt:        { type: Date,   default: null },
    stripeTransferId:   { type: String, default: null, index: true },
    stripeIdempotencyKey: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

// One attempt row per campaign — completing a campaign twice should reuse
// the existing row instead of duplicating the bookkeeping.
PayoutAttemptSchema.index({ campaign: 1 }, { unique: true });

module.exports = mongoose.models.PayoutAttempt
  || mongoose.model('PayoutAttempt', PayoutAttemptSchema);
