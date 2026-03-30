const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
  channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Canal', required: true, index: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
  reviewerRole: { type: String, enum: ['advertiser', 'creator'], required: true },
  // Ratings (1-5 stars)
  ratings: {
    overall: { type: Number, required: true, min: 1, max: 5 },
    communication: { type: Number, min: 1, max: 5, default: null },
    quality: { type: Number, min: 1, max: 5, default: null },
    timeliness: { type: Number, min: 1, max: 5, default: null },
    value: { type: Number, min: 1, max: 5, default: null },
  },
  title: { type: String, trim: true, maxlength: 120 },
  comment: { type: String, trim: true, maxlength: 2000 },
  // Response from channel owner
  response: {
    text: { type: String, trim: true, maxlength: 1000 },
    respondedAt: { type: Date },
  },
  // Moderation
  status: { type: String, enum: ['active', 'flagged', 'removed'], default: 'active', index: true },
  helpful: { type: Number, default: 0 },
  reported: { type: Number, default: 0 },
}, { timestamps: true });

// One review per campaign per reviewer
ReviewSchema.index({ campaign: 1, reviewer: 1 }, { unique: true });
// For channel aggregate queries
ReviewSchema.index({ channel: 1, status: 1, createdAt: -1 });

// Static: compute channel aggregate ratings
ReviewSchema.statics.getChannelRatings = async function(channelId) {
  const result = await this.aggregate([
    { $match: { channel: new mongoose.Types.ObjectId(channelId), status: 'active' } },
    { $group: {
      _id: '$channel',
      avgOverall: { $avg: '$ratings.overall' },
      avgCommunication: { $avg: '$ratings.communication' },
      avgQuality: { $avg: '$ratings.quality' },
      avgTimeliness: { $avg: '$ratings.timeliness' },
      avgValue: { $avg: '$ratings.value' },
      totalReviews: { $sum: 1 },
      distribution: { $push: '$ratings.overall' },
    }},
  ]);
  if (!result.length) return { avgOverall: 0, totalReviews: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  const r = result[0];
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  r.distribution.forEach(v => { dist[Math.round(v)] = (dist[Math.round(v)] || 0) + 1; });
  return {
    avgOverall: +r.avgOverall.toFixed(2),
    avgCommunication: r.avgCommunication ? +r.avgCommunication.toFixed(2) : null,
    avgQuality: r.avgQuality ? +r.avgQuality.toFixed(2) : null,
    avgTimeliness: r.avgTimeliness ? +r.avgTimeliness.toFixed(2) : null,
    avgValue: r.avgValue ? +r.avgValue.toFixed(2) : null,
    totalReviews: r.totalReviews,
    distribution: dist,
  };
};

module.exports = mongoose.models.Review || mongoose.model('Review', ReviewSchema);
