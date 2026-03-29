/**
 * Stripe Webhook handler for Partner API.
 *
 * Mounted BEFORE express.json() in app.js so it receives the raw body
 * needed for stripe.webhooks.constructEvent() signature verification.
 *
 * Handles:
 *   - payment_intent.amount_capturable_updated → auto-confirms DRAFT → PAID
 *   - payment_intent.canceled → auto-cancels campaign
 *   - payment_intent.payment_failed → logs failure
 */
const express = require('express');
const { ensureDb } = require('../lib/ensureDb');

const router = express.Router();

// Raw body parser — Stripe needs the exact raw bytes for HMAC verification
router.use(express.raw({ type: 'application/json' }));

router.post('/', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured');
    return res.status(503).json({ error: 'Webhook not configured' });
  }

  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event;
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Acknowledge receipt immediately — process async
  res.status(200).json({ received: true });

  try {
    await ensureDb();
    const Campaign = require('../models/Campaign');
    const Transaccion = require('../models/Transaccion');
    const PartnerAuditLog = require('../models/PartnerAuditLog');

    const pi = event.data.object;
    const campaignId = pi.metadata?.campaignId;
    const partnerId = pi.metadata?.partnerId;

    if (!campaignId || pi.metadata?.platform !== 'adflow') return;

    const auditEntry = async (action, extra = {}) => {
      try {
        await PartnerAuditLog.create({
          partner: partnerId || null,
          action,
          method: 'WEBHOOK',
          path: '/api/partners/webhooks/stripe',
          statusCode: 200,
          ip: req.ip || '',
          campaignId: campaignId || null,
          metadata: { stripeEventId: event.id, stripeEventType: event.type, ...extra },
          error: null
        });
      } catch (_) { /* audit must never block */ }
    };

    switch (event.type) {
      // PaymentIntent authorized (manual capture) — funds are held in escrow
      case 'payment_intent.amount_capturable_updated': {
        const campaign = await Campaign.findById(campaignId);
        if (!campaign || campaign.status !== 'DRAFT') break;

        campaign.stripePaymentIntentId = pi.id;
        campaign.status = 'PAID';
        await campaign.save();

        await Transaccion.updateMany(
          { campaign: campaign._id, status: 'pending' },
          { $set: { status: 'paid' } }
        );

        await auditEntry('webhook.payment.authorized', {
          paymentIntentId: pi.id,
          amount: pi.amount
        });
        break;
      }

      // PaymentIntent cancelled
      case 'payment_intent.canceled': {
        const campaign = await Campaign.findById(campaignId);
        if (!campaign || ['COMPLETED', 'CANCELLED'].includes(campaign.status)) break;

        campaign.status = 'CANCELLED';
        campaign.cancelledAt = new Date();
        await campaign.save();

        await auditEntry('webhook.payment.canceled', { paymentIntentId: pi.id });
        break;
      }

      // Payment failed
      case 'payment_intent.payment_failed': {
        await auditEntry('webhook.payment.failed', {
          paymentIntentId: pi.id,
          failureMessage: pi.last_payment_error?.message || 'unknown'
        });
        break;
      }

      default:
        // Unhandled event type — no action needed
        break;
    }
  } catch (err) {
    console.error('[stripe-webhook] Processing error:', err.message);
  }
});

module.exports = router;
