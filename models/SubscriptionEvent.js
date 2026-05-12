const mongoose = require('mongoose');

/**
 * Append-only log of subscription lifecycle changes. Every transition
 * (signup → trial → active → cancel → expire, plan upgrade/downgrade,
 * admin grant/revoke) writes one row here for audit and analytics.
 *
 * Never UPDATE these rows. If a write is wrong, add a corrective event.
 */
const SubscriptionEventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
    type: {
      type: String,
      enum: [
        'created',          // first subscription record on the user
        'trial_started',
        'trial_ended',
        'activated',        // first paid period started
        'renewed',
        'plan_changed',     // upgrade/downgrade between paid plans
        'payment_failed',
        'cancel_requested', // user clicked cancel; takes effect at period end
        'canceled',         // period ended after a cancel request
        'expired',          // forced downgrade to free
        'granted',          // admin manually granted plan
        'revoked',          // admin manually revoked plan
        'grandfathered',    // marked for grace period at launch
      ],
      required: true,
      index: true,
    },
    fromPlan: { type: String, default: null },
    toPlan: { type: String, default: null },
    fromStatus: { type: String, default: null },
    toStatus: { type: String, default: null },
    billingInterval: { type: String, enum: ['monthly', 'annual', null], default: null },
    actor: {
      // Who triggered the event. 'system' for webhooks/jobs, 'self' for the
      // user themselves, or an admin userId when grant/revoke.
      kind: { type: String, enum: ['self', 'admin', 'system', 'stripe'], default: 'system' },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
    },
    stripeEventId: { type: String, default: null, index: true, sparse: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

SubscriptionEventSchema.index({ user: 1, createdAt: -1 });

module.exports =
  mongoose.models.SubscriptionEvent ||
  mongoose.model('SubscriptionEvent', SubscriptionEventSchema);
