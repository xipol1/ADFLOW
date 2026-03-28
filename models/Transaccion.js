const mongoose = require('mongoose');

const TransaccionSchema = new mongoose.Schema(
  {
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    advertiser: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending',
      index: true
    },
    paidAt: { type: Date, default: null },
    stripePaymentIntentId: { type: String, default: null, index: true },
    stripeClientSecret: { type: String, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Transaccion || mongoose.model('Transaccion', TransaccionSchema);
