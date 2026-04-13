/**
 * JobLog — tracks background job execution state.
 *
 * Used by long-running jobs (massive-seed, etc.) that exceed
 * Vercel's 60s timeout. The endpoint returns immediately with
 * a jobId, and the caller polls GET /api/jobs/:jobId/status.
 */

const mongoose = require('mongoose');

const JobLogSchema = new mongoose.Schema(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true }, // 'massive-seed', etc.
    status: {
      type: String,
      default: 'started',
      enum: ['started', 'running', 'completed', 'failed'],
    },
    progress: {
      phase: { type: String, default: '' },
      current: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      discovered: { type: Number, default: 0 },
      saved: { type: Number, default: 0 },
    },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    error: { type: String, default: '' },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.JobLog || mongoose.model('JobLog', JobLogSchema);
