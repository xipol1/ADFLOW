const mongoose = require('mongoose');

const TransaccionSchema = new mongoose.Schema(
  {
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', index: true },
    advertiser: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', index: true },
    amount: { type: Number, required: true },
    tipo: {
      type: String,
      enum: ['pago', 'recarga', 'reembolso', 'comision', 'retiro'],
      default: 'pago',
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'failed'],
      default: 'pending',
      index: true
    },
    paidAt: { type: Date, default: null },
    stripePaymentIntentId: { type: String, default: null, index: true },
    stripeClientSecret: { type: String, default: null },
    description: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Transaccion || mongoose.model('Transaccion', TransaccionSchema);
