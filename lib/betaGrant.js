/**
 * Beta access grants, and the courtesy Pro plan that rides along with them.
 *
 * Why the plan is part of the grant: `betaAccess` opens the dashboards, but
 * the plan is what decides whether the pages inside them are usable. On the
 * free tiers every feature behind a ProGate is false, so a freshly-approved
 * beta user opened the panel and found roughly 60% of the sidebar for sale —
 * for a plan they may not even be able to buy while `subscriptions` is off.
 * That is a demo with a paywall, not a beta.
 *
 * So a grant also writes a courtesy Pro subscription. `status: 'granted'` is
 * already an active status in lib/plans.js, and `grandfatheredUntil` is the
 * field the lifecycle scheduler reads to warn before a downgrade — this reuses
 * both rather than inventing a parallel "beta plan" concept.
 *
 * Set BETA_PRO_UNTIL (ISO date) to make the courtesy plan expire on its own.
 * Unset means it lasts until someone ends it explicitly, which is the right
 * default while there is no launch date to point at.
 */

const PLAN_CORTESIA = {
  creator: 'creator_pro',
  advertiser: 'advertiser_pro',
};

const MOTIVO_CORTESIA = 'beta';

function finDeCortesia() {
  const raw = process.env.BETA_PRO_UNTIL;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * True when this subscription was paid for, so a beta grant or revocation must
 * leave it alone. Anything carrying a Stripe subscription id, or sitting in an
 * active/trialing state we did not grant ourselves, counts as real.
 */
function esSuscripcionReal(sub) {
  if (!sub) return false;
  if (sub.stripeSubscriptionId) return true;
  return ['active', 'trialing'].includes(sub.status);
}

/**
 * Build the update object for granting beta access.
 *
 * @param {Object} user  - the target user (needs `rol` and `subscription`)
 * @param {Object} opts  - { grantedBy, motivo }
 * @returns {Object} a flat $set-style update
 */
function construirConcesion(user, { grantedBy = null, motivo = '' } = {}) {
  const updates = {
    betaAccess: true,
    betaGrantedAt: new Date(),
    betaGrantedBy: grantedBy,
    betaGrantReason: String(motivo || '').slice(0, 300),
  };

  // Never clobber a subscription the user actually pays for.
  if (esSuscripcionReal(user?.subscription)) return updates;

  const rol = user?.rol === 'creator' ? 'creator' : 'advertiser';
  const hasta = finDeCortesia();

  updates.subscription = {
    ...(user?.subscription || {}),
    plan: PLAN_CORTESIA[rol],
    status: 'granted',
    billingInterval: null,
    currentPeriodStart: new Date(),
    // getUserPlanKey treats a past currentPeriodEnd as expired, so this is
    // what actually ends the courtesy plan. Null = no expiry.
    currentPeriodEnd: hasta,
    grandfatheredUntil: hasta,
    grantedBy,
    grantedReason: MOTIVO_CORTESIA,
  };

  return updates;
}

/**
 * Build the update object for revoking beta access. Clears the courtesy plan,
 * but only if it is ours — a paid subscription survives losing beta access.
 */
function construirRevocacion(user) {
  const updates = {
    betaAccess: false,
    betaGrantedAt: null,
    betaGrantedBy: null,
    betaGrantReason: '',
  };

  const sub = user?.subscription;
  if (sub && sub.grantedReason === MOTIVO_CORTESIA && !esSuscripcionReal(sub)) {
    updates.subscription = {
      ...sub,
      plan: null,
      status: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      grandfatheredUntil: null,
      grantedBy: null,
      grantedReason: '',
    };
  }

  return updates;
}

/** True when this user's Pro comes from the beta programme, not from paying. */
function tieneProDeCortesia(user) {
  return user?.subscription?.grantedReason === MOTIVO_CORTESIA
    && user?.subscription?.status === 'granted';
}

module.exports = {
  construirConcesion,
  construirRevocacion,
  tieneProDeCortesia,
  esSuscripcionReal,
  finDeCortesia,
  PLAN_CORTESIA,
  MOTIVO_CORTESIA,
};
