const mongoose = require('mongoose');

const TrackingSchema = new mongoose.Schema(
  {
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    ip: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  { timestamps: false }
);

TrackingSchema.index({ campaign: 1, ip: 1, timestamp: 1 });

module.exports = mongoose.models.Tracking || mongoose.model('Tracking', TrackingSchema);
