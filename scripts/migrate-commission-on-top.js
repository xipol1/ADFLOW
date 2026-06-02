#!/usr/bin/env node
/**
 * Re-price unpaid DRAFT campaigns to the advertiser-paid commission model
 * (pricing v2).
 *
 * WHY: the platform fee used to be DEDUCTED from the price (advertiser charged
 * `price`, creator got price*(1-rate)). It now sits ON TOP: the advertiser pays
 * `price*(1+rate)` and the creator receives their full listed price. New
 * campaigns are created at pricingVersion 2. This script migrates the only
 * in-flight campaigns that haven't been charged yet — DRAFTs — so their price
 * reflects what the advertiser will actually pay. PAID/PUBLISHED/COMPLETED
 * campaigns are intentionally LEFT on v1: they keep the exact amounts already
 * charged and paid out (no retroactive billing changes).
 *
 * WHAT IT DOES, per DRAFT with pricingVersion != 2:
 *   oldPrice (creator base) → price = round(oldPrice * (1 + rate))   (gross)
 *                              netAmount = round(price / (1 + rate))  (creator base)
 *                              pricingVersion = 2
 *   and bumps the pending 'pago' Transaccion amount to the new gross.
 *
 * SAFETY:
 *  - DRY-RUN by default. Pass --apply to write.
 *  - Idempotent: only DRAFTs with pricingVersion != 2; the write re-asserts the
 *    filter so re-runs / concurrent edits can't double-apply.
 *  - Only touches status DRAFT (never charged) and pending payment txs.
 *
 * USAGE:
 *   node scripts/migrate-commission-on-top.js            # dry-run, prints scope
 *   node scripts/migrate-commission-on-top.js --apply    # writes
 */
require('dotenv').config();

const databaseConfig = require('../config/database');
const Campaign = require('../models/Campaign');
const Transaccion = require('../models/Transaccion');
const { DEFAULT_COMMISSION_RATE } = require('../config/commissions');

const APPLY = process.argv.includes('--apply');

// v1 = legacy (or unset). v2 = already on the advertiser-paid model.
const notV2 = { $or: [{ pricingVersion: { $exists: false } }, { pricingVersion: { $ne: 2 } }] };

const round2 = (n) => +Number(n).toFixed(2);

async function run() {
  await databaseConfig.conectar();

  const filter = { status: 'DRAFT', ...notV2 };
  const total = await Campaign.countDocuments(filter);
  console.log(`[migrate-on-top] mode=${APPLY ? 'APPLY' : 'DRY-RUN'} — ${total} unpaid DRAFT(s) to re-price`);

  const cursor = Campaign.find(filter)
    .select('_id price commissionRate netAmount status pricingVersion')
    .lean()
    .cursor();

  let scanned = 0, updated = 0, txUpdated = 0, addedRevenueExposure = 0;
  const samples = [];

  for (let c = await cursor.next(); c != null; c = await cursor.next()) {
    scanned++;
    const rate = Number.isFinite(c.commissionRate) ? c.commissionRate : DEFAULT_COMMISSION_RATE;
    const oldPrice = Number(c.price) || 0;            // creator base under v1
    const newGross = round2(oldPrice * (1 + rate));   // what the advertiser now pays
    const newNet = round2(newGross / (1 + rate));     // creator's full base (matches the pre-save hook)

    addedRevenueExposure += round2(newGross - oldPrice);

    if (samples.length < 12) {
      samples.push({
        id: String(c._id), rate, oldPrice, newGross, creatorGets: newNet,
      });
    }

    if (APPLY) {
      await Campaign.updateOne(
        { _id: c._id, ...notV2 },
        { $set: { price: newGross, netAmount: newNet, pricingVersion: 2 } }
      );
      const txRes = await Transaccion.updateOne(
        { campaign: c._id, tipo: 'pago', status: 'pending' },
        { $set: { amount: newGross } }
      );
      if (txRes.modifiedCount > 0) txUpdated++;
    }
    updated++;
  }

  console.log('[migrate-on-top] ' + JSON.stringify({
    scanned,
    [APPLY ? 'repriced' : 'wouldReprice']: updated,
    pendingTxsBumped: APPLY ? txUpdated : undefined,
    extraAdvertiserChargeTotal: round2(addedRevenueExposure),
  }));
  if (samples.length) console.table(samples);
  if (!APPLY) console.log('[migrate-on-top] DRY-RUN only — re-run with --apply to write.');

  await databaseConfig.desconectar();
}

run().catch(async (error) => {
  console.error('[migrate-on-top] error:', error);
  try { await databaseConfig.desconectar(); } catch { /* already down */ }
  process.exit(1);
});
