/**
 * ScrapingRotation — persistent rotation state for keyword-based discovery.
 *
 * Each document represents a cursor into a keyword pool for a given source
 * ('mtproto_keywords' or 'lyzem_keywords'). Consecutive massive-seed runs
 * advance the cursor so they query different keyword slices, preventing
 * rediscovering the same channels over and over.
 *
 * If the keyword pool grows (new keywords added to ALL_KEYWORDS), the cursor
 * continues advancing — eventually wrapping around to hit the new keywords.
 */

const mongoose = require('mongoose');

const ScrapingRotationSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      required: true,
      unique: true,
      enum: ['mtproto_keywords', 'lyzem_keywords'],
      index: true,
    },

    // Cursor into the keyword pool. On the next run, slice
    // [offset, offset + sliceSize) is used, then offset is advanced.
    offset: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Size of ALL_KEYWORDS at the time of the last run, for wrap-around logic.
    totalKeywords: {
      type: Number,
      default: 0,
    },

    lastRunAt: { type: Date, default: null },

    // Debug/audit: the keywords actually picked on the last run.
    lastSlice: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

module.exports =
  mongoose.models.ScrapingRotation ||
  mongoose.model('ScrapingRotation', ScrapingRotationSchema);
