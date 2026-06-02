const mongoose = require('mongoose');
const crypto = require('crypto');
const {
  NICHE_IDS,
  SIZE_IDS,
  PLATFORM_IDS,
} = require('../config/founderWaitlist');

/**
 * Founding cohort — pre-registration waitlist (cap 150).
 *
 * Public, no-auth signups from the /founding landing. Each record:
 *  - Identifies one channel admin who wants a founding slot (18% vitalicio).
 *  - Carries a referral token so the signup can share its own viral link.
 *  - Requires double opt-in (email confirm) before counting toward the
 *    public-facing "real confirmed" number.
 *
 * Distinct from EnterpriseLead (sales pipeline) and Usuario.founderTier
 * (the in-product flag that actually grants the 18% rate) — those are owned
 * by other systems. This is purely a pre-launch interest list.
 */
const FounderRegistrationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
      match: /.+@.+\..+/,
      maxlength: 200,
    },
    handle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    platform: {
      type: String,
      enum: PLATFORM_IDS,
      default: 'other',
    },
    nicho: {
      type: String,
      enum: NICHE_IDS,
      required: true,
      index: true,
    },
    size: {
      type: String,
      enum: SIZE_IDS,
      required: true,
    },

    // ── Referral mechanic ──
    referralToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => crypto.randomBytes(8).toString('hex'),
    },
    referredByToken: {
      type: String,
      default: null,
      index: true,
    },
    referralCount: {
      type: Number,
      default: 0,
    },

    // ── Double opt-in ──
    confirmed: {
      type: Boolean,
      default: false,
      index: true,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    confirmToken: {
      type: String,
      default: () => crypto.randomBytes(16).toString('hex'),
      index: true,
    },

    // ── Anti-abuse / observability ──
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '', maxlength: 500 },
    source: { type: String, default: 'direct', maxlength: 60 }, // utm_source mirror

    // Sequential position in the queue, assigned once confirmed.
    queuePosition: { type: Number, default: 0 },
  },
  { timestamps: true }
);

FounderRegistrationSchema.index({ createdAt: -1 });
FounderRegistrationSchema.index({ confirmed: 1, createdAt: -1 });

module.exports =
  mongoose.models.FounderRegistration ||
  mongoose.model('FounderRegistration', FounderRegistrationSchema);
