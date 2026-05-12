/**
 * Seed / update the four test users used to exercise every plan permutation.
 *
 *   creator@channelad.io           → creator_pro       (status='granted')
 *   creator-free@channelad.io      → creator_free      (status='active')
 *   advertiser@channelad.io        → advertiser_pro    (status='granted')
 *   advertiser-free@channelad.io   → advertiser_free   (status='active')
 *
 * Behaviour:
 *   - If the user exists, leave password/profile alone and only update
 *     subscription state. Idempotent — safe to re-run.
 *   - If the user does not exist, create it with the default password listed
 *     in CREDENTIALS below.
 *
 * Each Pro user is marked as ADMIN-GRANTED (status='granted') so they have no
 * Stripe subscription to manage; the gate / commission logic treats granted
 * the same as active, exactly what we want for manual testing.
 *
 * Run:
 *   MONGODB_URI=<your-uri> node scripts/seed-test-plan-users.js
 */

require('dotenv').config();

const databaseConfig = require('../config/database');
const Usuario = require('../models/Usuario');
const SubscriptionEvent = require('../models/SubscriptionEvent');
const { isValidPlanKey } = require('../config/plans');
const bcrypt = require('bcryptjs');

const CREDENTIALS = [
  {
    email: 'creator@channelad.io',
    nombre: 'Creator Pro',
    password: 'Creator2026x',
    rol: 'creator',
    plan: 'creator_pro',
    status: 'granted',
  },
  {
    email: 'creator-free@channelad.io',
    nombre: 'Creator Free',
    password: 'CreatorFree2026x',
    rol: 'creator',
    plan: 'creator_free',
    status: 'active',
  },
  {
    email: 'advertiser@channelad.io',
    nombre: 'Advertiser Pro',
    password: 'Advert2026x',
    rol: 'advertiser',
    plan: 'advertiser_pro',
    status: 'granted',
  },
  {
    email: 'advertiser-free@channelad.io',
    nombre: 'Advertiser Free',
    password: 'AdvertFree2026x',
    rol: 'advertiser',
    plan: 'advertiser_free',
    status: 'active',
  },
];

async function upsertUser(spec) {
  if (!isValidPlanKey(spec.plan)) {
    throw new Error(`Invalid plan key: ${spec.plan}`);
  }
  const now = new Date();
  let user = await Usuario.findOne({ email: spec.email });
  let created = false;

  if (!user) {
    const hashed = await bcrypt.hash(spec.password, 12);
    user = new Usuario({
      email: spec.email,
      password: hashed,
      nombre: spec.nombre,
      rol: spec.rol,
      emailVerificado: true,
      betaAccess: true,
    });
    created = true;
  } else if (user.rol !== spec.rol) {
    // Defensive: if the existing user has a different role, refuse to clobber.
    console.warn(`⚠️  ${spec.email} exists with rol=${user.rol}, expected ${spec.rol}; skipping plan update.`);
    return { created: false, planChanged: false, user };
  }

  const fromPlan = user.subscription?.plan || null;
  const fromStatus = user.subscription?.status || null;
  const planChanged = fromPlan !== spec.plan || fromStatus !== spec.status;

  user.subscription = {
    plan: spec.plan,
    status: spec.status,
    billingInterval: null,
    currentPeriodStart: now,
    currentPeriodEnd: null,
    trialEnd: null,
    cancelAtPeriodEnd: false,
    stripeCustomerId: user.subscription?.stripeCustomerId || null,
    stripeSubscriptionId: null,
    grantedBy: null,
    grantedReason: 'seed-test-plan-users',
    grandfatheredUntil: null,
  };

  await user.save();

  if (planChanged) {
    await SubscriptionEvent.create({
      user: user._id,
      type: created ? 'created' : (fromPlan ? 'plan_changed' : 'granted'),
      fromPlan,
      toPlan: spec.plan,
      fromStatus,
      toStatus: spec.status,
      actor: { kind: 'system', userId: null },
      metadata: { source: 'seed-test-plan-users' },
    });
  }
  return { created, planChanged, user };
}

async function run() {
  await databaseConfig.conectar();

  const summary = [];
  for (const spec of CREDENTIALS) {
    const result = await upsertUser(spec);
    const action = result.created ? 'CREATE' : (result.planChanged ? 'UPDATE' : 'SKIP  ');
    console.log(`  ${action}  ${spec.email.padEnd(34)}  ${spec.plan}  (${spec.status})`);
    summary.push({ email: spec.email, password: spec.password, plan: spec.plan });
  }

  console.log('\nReady to use. Credentials:');
  for (const s of summary) {
    console.log(`  ${s.email.padEnd(34)}  ${s.password.padEnd(18)}  → ${s.plan}`);
  }

  await databaseConfig.desconectar();
}

run().catch(async (err) => {
  console.error('Seed failed:', err);
  try { await databaseConfig.desconectar(); } catch {}
  process.exit(1);
});
