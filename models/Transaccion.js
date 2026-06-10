const mongoose = require('mongoose');

const TransaccionSchema = new mongoose.Schema(
  {
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', index: true },
    advertiser: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', index: true },
    amount: { type: Number, required: true },
    tipo: {
      type: String,
      enum: ['pago', 'recarga', 'reembolso', 'comision', 'retiro', 'referral'],
      default: 'pago',
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'escrow', 'paid', 'refunded', 'failed'],
      default: 'pending',
      index: true
    },
    paidAt: { type: Date, default: null },
    stripePaymentIntentId: { type: String, default: null, index: true },
    stripeClientSecret: { type: String, default: null },
    // Stripe refund id (re_...) backing a tipo:'reembolso' row. Null when the
    // money went back without a refund object: uncaptured-PI cancel/partial
    // capture, wallet-credit restitution, or legacy/simulated payments.
    stripeRefundId: { type: String, default: null },
    description: { type: String, default: '' },
    referralCreditGenerated: { type: Number, default: 0 },
    referralUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
  },
  { timestamps: true }
);

// SECURITY (A-4): enforce at the DB level what the recharge webhook upsert
// assumes — at most one transaction per (Stripe id, tipo). The upsert alone is
// only safe for SEQUENTIAL webhook replays; two genuinely concurrent deliveries
// of the same event could both miss-and-insert and double-credit a wallet. With
// this index the second insert fails and Stripe's retry re-finds the row
// (self-healing, no double credit). Partial on $type:'string' so the many rows
// that keep the null default don't collide on null. NOTE: if pre-existing
// duplicate rows exist (created before the A-4 fix), the build fails — logged by
// the connection 'error' handler, non-fatal — until those rows are deduped.
TransaccionSchema.index(
  { stripePaymentIntentId: 1, tipo: 1 },
  { unique: true, partialFilterExpression: { stripePaymentIntentId: { $type: 'string' } } }
);

module.exports = mongoose.models.Transaccion || mongoose.model('Transaccion', TransaccionSchema);
