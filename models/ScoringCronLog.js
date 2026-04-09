/**
 * ScoringCronLog — one document per scoring cron run.
 *
 * Written by the daily scoring orchestrator (services/scoringOrchestrator.js)
 * and consumed by the admin dashboard to answer "when was the last scoring
 * run?" and "how long did it take?". Keep the shape small — if we ever need
 * per-channel diagnostics, they belong in CanalScoreSnapshot, not here.
 */

const mongoose = require('mongoose');

const ScoringCronLogSchema = new mongoose.Schema(
  {
    fechaInicio: { type: Date, required: true, default: Date.now },
    fechaFin:    { type: Date, default: null },
    duracionMs:  { type: Number, default: 0 },

    canalesProcesados: { type: Number, default: 0 },
    canalesActualizados: { type: Number, default: 0 },
    errores: { type: Number, default: 0 },

    // Truncated list of errors for quick admin diagnosis. Full stack traces
    // go to the standard logger, not here.
    erroresDetalle: {
      type: [{
        canalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Canal' },
        mensaje: { type: String },
      }],
      default: [],
    },

    // 'scheduled' for the nightly cron, 'manual' when triggered via admin
    // tooling, 'campaign_completed' for the immediate post-campaign trigger.
    trigger: {
      type: String,
      enum: ['scheduled', 'manual', 'campaign_completed'],
      default: 'scheduled',
    },

    engineVersion: { type: Number, default: 2, required: true },
  },
  { timestamps: true },
);

ScoringCronLogSchema.index({ fechaInicio: -1 });
ScoringCronLogSchema.index({ trigger: 1, fechaInicio: -1 });

module.exports =
  mongoose.models.ScoringCronLog ||
  mongoose.model('ScoringCronLog', ScoringCronLogSchema);
