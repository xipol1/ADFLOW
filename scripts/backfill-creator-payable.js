#!/usr/bin/env node
/**
 * Backfill Campaign.capturedAmount + creatorPayable for campaigns that were
 * PAID before the proportional-payout change (PR #76) landed.
 *
 * WHY: payCampaign now persists capturedAmount (real EUR charged = price minus
 * promo credits applied) and creatorPayable = capturedAmount * (1 - rate). Both
 * withdrawal paths and the completion auto-transfer read creatorPayable, falling
 * back to netAmount (full-price share) when it's absent. For legacy campaigns
 * that fallback OVER-counts credit-funded earnings — re-opening the credits→cash
 * money-loss for already-paid campaigns. This script records the real captured
 * amount for those campaigns so their payout is proportional too.
 *
 * SOURCE OF TRUTH: each campaign has exactly one Transaccion {tipo:'pago'}. It
 * is created with amount=price (status 'pending') and updated by payCampaign to
 * amount=amountCharged once charged (status 'escrow', later 'paid'). So a paid
 * campaign's captured amount is its 'pago' tx amount in status escrow|paid.
 *
 * SAFETY:
 *  - DRY-RUN by default. Pass --apply to write.
 *  - Idempotent: only touches campaigns whose creatorPayable is still null, and
 *    the write re-asserts that filter, so re-runs and concurrent payments can't
 *    clobber a value already set by the live app.
 *  - Skips campaigns with no charged 'pago' tx (never really paid → not
 *    withdrawable anyway; left null).
 *
 * USAGE:
 *   node scripts/backfill-creator-payable.js            # dry-run, prints scope
 *   node scripts/backfill-creator-payable.js --apply    # writes the fields
 *
 * Run this AFTER deploying PR #76 to every host that pays creators (Vercel AND
 * the Fly worker that runs the completion cron), so new payments already set
 * the fields and this only fills the historical gap.
 */
require('dotenv').config();

const databaseConfig = require('../config/database');
const Campaign = require('../models/Campaign');
const Transaccion = require('../models/Transaccion');
const { computeCreatorPayable } = require('../lib/creatorPayout');

const APPLY = process.argv.includes('--apply');

// Campaign states in which a payout can have happened or is pending. DRAFT was
// never paid; CANCELLED/EXPIRED are refunded — neither pays the creator.
const PAID_STATES = ['PAID', 'PUBLISHED', 'COMPLETED', 'DISPUTED'];

const notSet = { $or: [{ creatorPayable: null }, { creatorPayable: { $exists: false } }] };

async function run() {
  await databaseConfig.conectar();

  const filter = { status: { $in: PAID_STATES }, ...notSet };
  const total = await Campaign.countDocuments(filter);
  console.log(`[backfill] mode=${APPLY ? 'APPLY' : 'DRY-RUN'} — ${total} paid campaign(s) missing creatorPayable`);

  const cursor = Campaign.find(filter)
    .select('_id price commissionRate netAmount status')
    .lean()
    .cursor();

  let scanned = 0, updated = 0, skipped = 0, creditFunded = 0, deltaTotal = 0;
  const samples = [];

  for (let c = await cursor.next(); c != null; c = await cursor.next()) {
    scanned++;

    const pago = await Transaccion.findOne({
      campaign: c._id,
      tipo: 'pago',
      status: { $in: ['escrow', 'paid'] },
    }).select('amount').lean();

    if (!pago || !Number.isFinite(pago.amount)) {
      skipped++;
      continue;
    }

    const capturedAmount = +Number(pago.amount).toFixed(2);
    const creatorPayable = computeCreatorPayable(capturedAmount, c.commissionRate);

    // What the (buggy) fallback would have paid, for reporting the exposure.
    const fullNet = Number.isFinite(c.netAmount) && c.netAmount > 0
      ? c.netAmount
      : computeCreatorPayable(c.price, c.commissionRate);
    const reduced = creatorPayable < fullNet - 0.005;
    if (reduced) { creditFunded++; deltaTotal += +(fullNet - creatorPayable).toFixed(2); }

    if (samples.length < 12) {
      samples.push({
        id: String(c._id), status: c.status, price: c.price,
        captured: capturedAmount, fallbackWouldPay: fullNet, proportional: creatorPayable,
        creditFunded: reduced,
      });
    }

    if (APPLY) {
      await Campaign.updateOne(
        { _id: c._id, ...notSet },
        { $set: { capturedAmount, creatorPayable } }
      );
    }
    updated++;
  }

  console.log('[backfill] ' + JSON.stringify({
    scanned,
    [APPLY ? 'updated' : 'wouldUpdate']: updated,
    skippedNoPaidPagoTx: skipped,
    creditFundedReduced: creditFunded,
    eurRemovedFromWithdrawable: +deltaTotal.toFixed(2),
  }));
  if (samples.length) console.table(samples);
  if (!APPLY) console.log('[backfill] DRY-RUN only — re-run with --apply to write.');

  await databaseConfig.desconectar();
}

run().catch(async (error) => {
  console.error('[backfill] error:', error);
  try { await databaseConfig.desconectar(); } catch { /* already down */ }
  process.exit(1);
});
