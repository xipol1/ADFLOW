/**
 * Per-user withdrawal lease lock (SECURITY C-3).
 *
 * The two creator payout paths — POST /api/payouts/withdraw (instant Stripe
 * Connect transfer) and POST /api/transacciones/retiro (manual bank/paypal
 * queue) — both read the same derived availableBalance and then act on it.
 * Without serialization, two concurrent requests can both pass the balance
 * check before either debit row exists, paying out more than the creator has
 * earned (draining the platform Stripe account in the instant case).
 *
 * This lock is a single-document atomic compare-and-set on the user. The lease
 * carries an expiry so a request that crashes mid-flight can't lock a creator
 * out forever — once the lease is stale, the next caller can re-acquire it.
 */

const Usuario = require('../models/Usuario');

// Lease long enough to cover a Stripe transfer round-trip plus the surrounding
// balance aggregation, short enough that a crashed request frees up quickly.
const WITHDRAWAL_LEASE_MS = 30 * 1000;

/**
 * Atomically acquire the withdrawal lease for a user.
 * @returns {Promise<boolean>} true if acquired, false if another withdrawal
 *   is already in flight (lease still hot).
 */
async function acquireWithdrawalLock(userId) {
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + WITHDRAWAL_LEASE_MS);
  const updated = await Usuario.findOneAndUpdate(
    {
      _id: userId,
      $or: [
        { withdrawalLockUntil: null },
        { withdrawalLockUntil: { $exists: false } },
        { withdrawalLockUntil: { $lte: now } },
      ],
    },
    { $set: { withdrawalLockUntil: leaseUntil } },
    { new: true }
  );
  return Boolean(updated);
}

/**
 * Release the withdrawal lease. Best-effort: if it fails, the lease expires on
 * its own after WITHDRAWAL_LEASE_MS.
 */
async function releaseWithdrawalLock(userId) {
  await Usuario.updateOne(
    { _id: userId },
    { $set: { withdrawalLockUntil: null } }
  ).catch(() => { /* lease auto-expires */ });
}

module.exports = { acquireWithdrawalLock, releaseWithdrawalLock, WITHDRAWAL_LEASE_MS };
