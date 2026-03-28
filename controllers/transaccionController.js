const Transaccion = require('../models/Transaccion');
const Campaign = require('../models/Campaign');
const { ensureDb } = require('../lib/ensureDb');

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

// Lazy-load Stripe only if key is configured
const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !key.startsWith('sk_')) return null;
  return require('stripe')(key);
};

// ─── GET /api/transacciones ─────────────────────────────────────────────────
const obtenerMisTransacciones = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const items = await Transaccion.find({ advertiser: userId })
      .populate('campaign', 'content status targetUrl price createdAt channel')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: { items } });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/transacciones/:id ─────────────────────────────────────────────
const obtenerTransaccion = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const transaccion = await Transaccion.findById(req.params.id)
      .populate('campaign', 'content status targetUrl price createdAt')
      .lean();

    if (!transaccion) return next(httpError(404, 'Transacción no encontrada'));

    if (transaccion.advertiser?.toString?.() !== String(userId)) {
      return next(httpError(403, 'No autorizado'));
    }

    return res.json({ success: true, data: transaccion });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/transacciones (manual creation) ──────────────────────────────
const crearTransaccion = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const { campaignId, amount } = req.body || {};
    if (!campaignId || !amount) return next(httpError(400, 'campaignId y amount son requeridos'));

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return next(httpError(404, 'Campaña no encontrada'));
    if (campaign.advertiser?.toString?.() !== String(userId)) return next(httpError(403, 'No autorizado'));

    const tx = await Transaccion.create({
      campaign: campaign._id,
      advertiser: userId,
      amount: Number(amount),
      status: 'pending',
    });

    return res.status(201).json({ success: true, data: tx });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/transacciones/:id/pay (simulated payment) ────────────────────
const procesarPago = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const transaccion = await Transaccion.findById(req.params.id);
    if (!transaccion) return next(httpError(404, 'Transacción no encontrada'));

    if (transaccion.advertiser?.toString?.() !== String(userId)) {
      return next(httpError(403, 'No autorizado'));
    }

    if (transaccion.status !== 'pending') {
      return next(httpError(400, `La transacción ya está en estado ${transaccion.status}`));
    }

    transaccion.status = 'paid';
    transaccion.paidAt = new Date();
    await transaccion.save();

    await Campaign.findByIdAndUpdate(transaccion.campaign, { status: 'PAID' });

    return res.json({ success: true, data: transaccion });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/transacciones/create-checkout-session ────────────────────────
// Creates a Stripe Checkout Session for wallet top-up
const crearCheckoutSession = async (req, res, next) => {
  try {
    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount < 5) {
      return next(httpError(400, 'Importe mínimo: €5'));
    }

    const stripe = getStripe();
    if (!stripe) {
      // Stripe not configured — simulate success
      return res.json({ success: true, simulated: true, message: `Recarga de €${amount} simulada (Stripe no configurado)` });
    }

    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
    const currency = (process.env.STRIPE_CURRENCY || 'eur').toLowerCase();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency,
          product_data: { name: 'Recarga de saldo ADFLOW', description: `Añadir €${amount} a tu saldo` },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${FRONTEND_URL}/advertiser/finances?recharge=success&amount=${amount}`,
      cancel_url: `${FRONTEND_URL}/advertiser/finances?recharge=cancelled`,
      metadata: { userId: String(userId), type: 'recharge', amount: String(amount) },
    });

    return res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/transacciones/create-payment-intent ──────────────────────────
// Creates a Stripe PaymentIntent for campaign payment (escrow)
const crearPaymentIntent = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const { transaccionId } = req.body || {};
    if (!transaccionId) return next(httpError(400, 'transaccionId es requerido'));

    const tx = await Transaccion.findById(transaccionId);
    if (!tx) return next(httpError(404, 'Transacción no encontrada'));
    if (tx.advertiser?.toString?.() !== String(userId)) return next(httpError(403, 'No autorizado'));
    if (tx.status !== 'pending') return next(httpError(400, 'Esta transacción ya fue procesada'));

    const stripe = getStripe();
    if (!stripe) {
      // Simulate payment when Stripe not configured
      tx.status = 'paid';
      tx.paidAt = new Date();
      await tx.save();
      await Campaign.findByIdAndUpdate(tx.campaign, { status: 'PAID' });
      return res.json({ success: true, simulated: true, data: tx });
    }

    const currency = (process.env.STRIPE_CURRENCY || 'eur').toLowerCase();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(tx.amount * 100),
      currency,
      metadata: { transaccionId: String(tx._id), userId: String(userId), campaignId: String(tx.campaign) },
    });

    tx.stripePaymentIntentId = paymentIntent.id;
    tx.stripeClientSecret = paymentIntent.client_secret;
    await tx.save();

    return res.json({ success: true, clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/transacciones/webhook ────────────────────────────────────────
// Stripe webhook handler
const webhookPago = async (req, res) => {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  if (stripe && webhookSecret) {
    const sig = req.headers['stripe-signature'];
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('Stripe webhook signature verification failed:', err.message);
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }
  } else {
    // No Stripe configured — parse as regular JSON
    try {
      event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).json({ error: 'Invalid payload' });
    }
  }

  try {
    const ok = await ensureDb();
    if (!ok) return res.status(200).json({ received: true });

    if (event?.type === 'payment_intent.succeeded') {
      const pi = event.data?.object;
      const { transaccionId, userId, type, amount } = pi?.metadata || {};

      if (type === 'recharge') {
        // Wallet top-up — record as a credit transaction
        await Transaccion.create({
          advertiser: userId,
          amount: Number(amount),
          status: 'paid',
          paidAt: new Date(),
          stripePaymentIntentId: pi.id,
          tipo: 'recarga',
        });
      } else if (transaccionId) {
        await Transaccion.findByIdAndUpdate(transaccionId, { status: 'paid', paidAt: new Date() });
        const tx = await Transaccion.findById(transaccionId);
        if (tx?.campaign) {
          await Campaign.findByIdAndUpdate(tx.campaign, { status: 'PAID' });
        }
      }
    }

    if (event?.type === 'checkout.session.completed') {
      const session = event.data?.object;
      const { userId, type, amount } = session?.metadata || {};

      if (type === 'recharge' && userId && amount) {
        await Transaccion.create({
          advertiser: userId,
          amount: Number(amount),
          status: 'paid',
          paidAt: new Date(),
          stripePaymentIntentId: session.payment_intent,
          tipo: 'recarga',
        });
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return res.status(200).json({ received: true });
  }
};

// ─── GET /api/transacciones/estadisticas ────────────────────────────────────
const obtenerEstadisticasFinancieras = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const mongoose = require('mongoose');
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const [total, paidAgg, pending] = await Promise.all([
      Transaccion.countDocuments({ advertiser: userId }),
      Transaccion.aggregate([
        { $match: { advertiser: userObjectId, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaccion.countDocuments({ advertiser: userId, status: 'pending' }),
    ]);

    return res.json({
      success: true,
      data: { totalTransacciones: total, totalPagado: paidAgg[0]?.total || 0, pendientes: pending },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  obtenerMisTransacciones,
  obtenerTransaccion,
  crearTransaccion,
  procesarPago,
  crearCheckoutSession,
  crearPaymentIntent,
  webhookPago,
  obtenerEstadisticasFinancieras,
};
