/**
 * Unverified Cleanup Job — daily cron that deletes user accounts that
 * never verified their email. Two reasons we want this:
 *
 *  1. Frees the email for legitimate re-registration. A typo'd signup
 *     otherwise locks the real email forever ("ya está registrado") even
 *     though the account is unreachable.
 *
 *  2. Reduces noise from bots: rate-limited signups still accumulate over
 *     time. Pruning them keeps `Usuario` lean and stats honest.
 *
 * Default TTL is 14 days, override with UNVERIFIED_USER_TTL_DAYS. We only
 * delete when the verification token has expired (or is missing) — never
 * delete a freshly-registered user whose token is still valid, even if
 * the absolute age has crossed the cutoff.
 *
 * Triggered via GET/POST /api/jobs/auth-cleanup, protected by CRON_SECRET.
 */

const Usuario = require('../models/Usuario');
const { ensureDb } = require('../lib/ensureDb');

async function runUnverifiedCleanupJob() {
  const t0 = Date.now();
  await ensureDb();

  const ttlDays = Number(process.env.UNVERIFIED_USER_TTL_DAYS) > 0
    ? Number(process.env.UNVERIFIED_USER_TTL_DAYS)
    : 14;
  const cutoff = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000);

  // Delete users who:
  //   - never verified their email
  //   - were created before the cutoff
  //   - have no still-valid verification token (so a fresh signup whose
  //     token happens to land near the cutoff is safe)
  const filter = {
    emailVerificado: false,
    createdAt: { $lt: cutoff },
    $or: [
      { emailVerificationExpires: { $exists: false } },
      { emailVerificationExpires: null },
      { emailVerificationExpires: { $lte: new Date() } },
    ],
    // Belt-and-suspenders: never touch admins, or accounts that managed
    // to accumulate credits/referrals (shouldn't happen pre-verification,
    // but if it did, manual review is safer than silent deletion).
    rol: { $ne: 'admin' },
    referralCount: { $in: [0, null, undefined] },
  };

  const result = await Usuario.deleteMany(filter);

  return {
    deleted: result.deletedCount || 0,
    ttlDays,
    cutoff: cutoff.toISOString(),
    duration_ms: Date.now() - t0,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { runUnverifiedCleanupJob };
