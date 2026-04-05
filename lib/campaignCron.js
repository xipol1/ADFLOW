/**
 * Campaign lifecycle automation — runs periodically to:
 * 1. Expire campaigns past their deadline
 * 2. Auto-complete campaigns published > 7 days with no action
 * 3. Release escrow for completed campaigns
 */
const INTERVAL_MS = 10 * 60 * 1000; // every 10 minutes

let timer = null;

async function runCampaignAutomation() {
  try {
    const { ensureDb } = require('./ensureDb');
    const ok = await ensureDb();
    if (!ok) return;

    const Campaign = require('../models/Campaign');
    const Transaccion = require('../models/Transaccion');
    const now = new Date();

    // 1. Expire campaigns past deadline that are still PAID (not yet published)
    const expiredResult = await Campaign.updateMany(
      {
        status: 'PAID',
        deadline: { $ne: null, $lt: now }
      },
      {
        $set: { status: 'EXPIRED', expiredAt: now }
      }
    );
    if (expiredResult.modifiedCount > 0) {
      console.log(`[cron] Expired ${expiredResult.modifiedCount} campaigns past deadline`);
      // Notify and trigger refunds for expired campaigns
      try {
        const expiredCampaigns = await Campaign.find({ status: 'EXPIRED', expiredAt: now }).lean();
        const notificationService = require('../services/notificationService');
        for (const c of expiredCampaigns) {
          await notificationService.enviarNotificacion({
            usuarioId: c.advertiser,
            tipo: 'campana.expirada',
            titulo: 'Campaña expirada',
            mensaje: 'Tu campaña ha expirado porque no fue publicada antes de la fecha límite.',
            datos: { campaignId: c._id },
            canales: ['database', 'realtime'],
            prioridad: 'alta'
          }).catch(() => {});
        }
      } catch (_) { /* non-blocking */ }
    }

    // 2. Auto-complete published campaigns older than 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const autoCompleted = await Campaign.updateMany(
      {
        status: 'PUBLISHED',
        publishedAt: { $lt: sevenDaysAgo }
      },
      {
        $set: { status: 'COMPLETED', completedAt: now }
      }
    );
    if (autoCompleted.modifiedCount > 0) {
      console.log(`[cron] Auto-completed ${autoCompleted.modifiedCount} campaigns (published > 7d)`);
    }

    // 3. Release escrow: mark transactions as paid for newly completed campaigns
    const completedCampaigns = await Campaign.find({
      status: 'COMPLETED',
      completedAt: { $gte: new Date(now.getTime() - INTERVAL_MS - 60000) } // recently completed
    }).lean();

    for (const campaign of completedCampaigns) {
      // Ensure associated transaction is marked paid
      await Transaccion.updateMany(
        { campaign: campaign._id, status: 'pending' },
        { $set: { status: 'paid', paidAt: now } }
      );

      // Capture Stripe PaymentIntent if needed
      if (campaign.stripePaymentIntentId && process.env.STRIPE_SECRET_KEY) {
        try {
          const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
          const pi = await stripe.paymentIntents.retrieve(campaign.stripePaymentIntentId);
          if (pi.status === 'requires_capture') {
            await stripe.paymentIntents.capture(campaign.stripePaymentIntentId);
            console.log(`[cron] Captured PaymentIntent ${campaign.stripePaymentIntentId}`);
          }
        } catch (stripeErr) {
          console.error(`[cron] Stripe capture error for ${campaign._id}:`, stripeErr.message);
        }
      }
    }
    // 4. Retry failed ad deliveries
    try {
      const { retryFailedDeliveries } = require('../services/adDeliveryService');
      const retryResults = await retryFailedDeliveries();
      const retried = retryResults.filter(r => r.success).length;
      if (retryResults.length > 0) {
        console.log(`[cron] Ad delivery retry: ${retried}/${retryResults.length} succeeded`);
      }
    } catch (deliveryErr) {
      console.error('[cron] Ad delivery retry error:', deliveryErr.message);
    }
  } catch (error) {
    console.error('[cron] Campaign automation error:', error.message);
  }
}

function startCampaignCron() {
  if (timer) return;
  // Run once after a short delay, then periodically
  setTimeout(() => runCampaignAutomation(), 5000);
  timer = setInterval(runCampaignAutomation, INTERVAL_MS);
  console.log(`[cron] Campaign automation scheduled every ${INTERVAL_MS / 60000} minutes`);
}

function stopCampaignCron() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = { startCampaignCron, stopCampaignCron, runCampaignAutomation };
