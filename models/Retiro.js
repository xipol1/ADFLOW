const mongoose = require('mongoose');

const RetiroSchema = new mongoose.Schema(
  {
    creator:   { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
    amount:    { type: Number, required: true, min: 10 },
    method:    { type: String, enum: ['bank', 'paypal'], default: 'bank' },
    status:    { type: String, enum: ['pending', 'processing', 'completed', 'rejected'], default: 'pending', index: true },
    // Payment details (stored optionally — creator can provide these in their settings)
    paypalEmail:  { type: String, default: null },
    bankAccount:  { type: String, default: null }, // last 4 digits or masked IBAN
    // Admin actions
    processedAt:  { type: Date, default: null },
    rejectedAt:   { type: Date, default: null },
    notes:        { type: String, default: null }, // admin note on rejection or processing
  },
  { timestamps: true }
);

module.exports = mongoose.models.Retiro || mongoose.model('Retiro', RetiroSchema);
