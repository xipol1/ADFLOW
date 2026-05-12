/**
 * One-shot migration: backfill subscription state on every existing user.
 *
 * Rules:
 *   - Users with NO subscription set → defaulted to <rol>_free, status='active'.
 *   - Users already on a subscription → left alone (idempotent).
 *   - Admin users → skipped (subscription doesn't apply).
 *
 * Run once after deploying Fase 1. Safe to re-run; only touches docs where
 * subscription.plan is null/missing.
 *
 *   node scripts/migrate-users-to-free-plan.js
 */

require('dotenv').config();

const databaseConfig = require('../config/database');
const Usuario = require('../models/Usuario');
const SubscriptionEvent = require('../models/SubscriptionEvent');
const { DEFAULT_PLAN_BY_ROLE } = require('../config/plans');

async function run() {
  await databaseConfig.conectar();

  const cursor = Usuario.find({
    rol: { $in: ['creator', 'advertiser'] },
    $or: [
      { 'subscription.plan': { $exists: false } },
      { 'subscription.plan': null },
    ],
  }).cursor();

  let touched = 0;
  let skipped = 0;
  const now = new Date();

  for await (const user of cursor) {
    const plan = DEFAULT_PLAN_BY_ROLE[user.rol];
    if (!plan) { skipped++; continue; }

    user.subscription = {
      plan,
      status: 'active',
      billingInterval: null,
      currentPeriodStart: now,
      currentPeriodEnd: null,
      trialEnd: null,
      cancelAtPeriodEnd: false,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      grantedBy: null,
      grantedReason: 'auto-migrated to free tier (Fase 1 backfill)',
      grandfatheredUntil: null,
    };
    await user.save();

    await SubscriptionEvent.create({
      user: user._id,
      type: 'created',
      fromPlan: null,
      toPlan: plan,
      fromStatus: null,
      toStatus: 'active',
      actor: { kind: 'system', userId: null },
      metadata: { source: 'migrate-users-to-free-plan' },
    });

    touched++;
    if (touched % 100 === 0) console.log(`  ...${touched} migrated`);
  }

  console.log('Migration complete', { touched, skipped });
  await databaseConfig.desconectar();
}

run().catch(async (err) => {
  console.error('Migration failed:', err);
  try { await databaseConfig.desconectar(); } catch {}
  process.exit(1);
});
