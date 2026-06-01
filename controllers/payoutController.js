/**
 * Payout Controller — Stripe Connect onboarding & creator withdrawals
 */

const Usuario = require('../models/Usuario');
const Transaccion = require('../models/Transaccion');
const { ensureDb } = require('../lib/ensureDb');

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

// POST /api/payouts/onboard — Create Stripe Express account + return onboarding URL
const onboard = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const stripeConnect = require('../services/stripeConnectService');
    const user = await Usuario.findById(userId);
    if (!user) return next(httpError(404, 'Usuario no encontrado'));

    // If already has account, return onboarding link for that account
    if (user.stripeConnectAccountId) {
      try {
        const status = await stripeConnect.getAccountStatus(user.stripeConnectAccountId);
        if (status.detailsSubmitted) {
          return res.json({ success: true, data: { alreadyOnboarded: true, status } });
        }
        // Re-generate onboarding link for incomplete setup
        const link = await stripeConnect.createOnboardingLink(user.stripeConnectAccountId);
        return res.json({ success: true, data: { url: link.url } });
      } catch {
        // Account might be invalid, create new one
      }
    }

    const account = await stripeConnect.createExpressAccount(user);
    user.stripeConnectAccountId = account.id;
    await user.save();

    const link = await stripeConnect.createOnboardingLink(account.id);
    return res.json({ success: true, data: { url: link.url, accountId: account.id } });
  } catch (error) {
    next(error);
  }
};

// GET /api/payouts/status — Check Connect account status
const getStatus = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const user = await Usuario.findById(userId).lean();
    if (!user) return next(httpError(404, 'Usuario no encontrado'));
    if (!user.stripeConnectAccountId) {
      return res.json({ success: true, data: { connected: false } });
    }

    const stripeConnect = require('../services/stripeConnectService');
    const status = await stripeConnect.getAccountStatus(user.stripeConnectAccountId);
    return res.json({ success: true, data: { connected: true, ...status } });
  } catch (error) {
    next(error);
  }
};

// GET /api/payouts/dashboard-link — Stripe Express dashboard login
const getDashboardLink = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    const user = await Usuario.findById(userId).lean();
    if (!user?.stripeConnectAccountId) return next(httpError(400, 'No hay cuenta de Stripe conectada'));

    const stripeConnect = require('../services/stripeConnectService');
    const link = await stripeConnect.createDashboardLink(user.stripeConnectAccountId);
    return res.json({ success: true, data: { url: link.url } });
  } catch (error) {
    next(error);
  }
};

// POST /api/payouts/withdraw — Instant Stripe Connect transfer.
// SECURITY: must verify the creator actually has the requested amount as
// available balance before calling Stripe, otherwise any authenticated user
// with Connect onboarded would be able to drain the platform account.
const withdraw = async (req, res, next) => {
  const { acquireWithdrawalLock, releaseWithdrawalLock } = require('../lib/withdrawalLock');
  let lockedUserId = null;
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount < 10) return next(httpError(400, 'Monto minimo: 10 EUR'));

    const user = await Usuario.findById(userId);
    if (!user) return next(httpError(404, 'Usuario no encontrado'));
    if (!user.stripeConnectAccountId) return next(httpError(400, 'Debes conectar tu cuenta de Stripe primero'));

    // SECURITY (C-3): serialize withdrawals per user. Without this, two
    // concurrent requests both read the same availableBalance, both pass the
    // check, and both fire a Stripe transfer before either debit row is
    // written — draining the platform account. The same lock guards the manual
    // queue path (transaccionController.solicitarRetiro) so the two can't race.
    if (!(await acquireWithdrawalLock(userId))) {
      return next(httpError(409, 'Ya tienes un retiro en proceso. Espera unos segundos e inténtalo de nuevo.'));
    }
    lockedUserId = userId;

    // ─── Balance check (mirrors transaccionController.solicitarRetiro) ───
    // Sum creator's completed campaign earnings, then subtract anything
    // already transferred or reserved across the three payout paths:
    //   - PayoutAttempt: auto Stripe Connect transfers fired on campaign completion
    //   - Retiro (pending/processing): manual bank/paypal queue
    //   - Transaccion tipo='retiro' paid|processing: /api/payouts/withdraw calls
    //     (this endpoint). 'processing' = an in-flight/crashed-after-transfer
    //     reservation, which must still reduce the available balance.
    const mongoose = require('mongoose');
    const creatorId = new mongoose.Types.ObjectId(userId);
    const Canal = require('../models/Canal');
    const Campaign = require('../models/Campaign');
    const PayoutAttempt = require('../models/PayoutAttempt');
    const Retiro = require('../models/Retiro');

    const myChannelIds = (await Canal.find({ propietario: userId }).select('_id').lean()).map((c) => c._id);

    const [completedEarnings, autoPaid, pendingRetiros, manualWithdrawals] = await Promise.all([
      Campaign.aggregate([
        { $match: { channel: { $in: myChannelIds }, status: 'COMPLETED' } },
        // Proportional payout: count the creator's share of money actually
        // captured, not of the full price. Promo-credit-funded value is a
        // discount, never withdrawable cash. Legacy campaigns (no creatorPayable
        // recorded) fall back to netAmount — correct for real-money campaigns.
        { $group: { _id: null, total: { $sum: { $ifNull: ['$creatorPayable', '$netAmount'] } } } },
      ]),
      PayoutAttempt.aggregate([
        { $match: { creator: creatorId, status: { $in: ['pending', 'processing', 'succeeded'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Retiro.aggregate([
        { $match: { creator: creatorId, status: { $in: ['pending', 'processing'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaccion.aggregate([
        { $match: { creator: creatorId, tipo: 'retiro', status: { $in: ['paid', 'processing'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const totalEarned = completedEarnings[0]?.total || 0;
    const alreadyTransferred = autoPaid[0]?.total || 0;
    const reservedForRetiro = pendingRetiros[0]?.total || 0;
    const priorManual = manualWithdrawals[0]?.total || 0;
    const availableBalance = +(totalEarned - alreadyTransferred - reservedForRetiro - priorManual).toFixed(2);

    if (availableBalance < amount) {
      return next(httpError(400, `Saldo insuficiente. Disponible: ${availableBalance.toFixed(2)} EUR`));
    }

    // Verify Stripe account is active
    const stripeConnect = require('../services/stripeConnectService');
    const status = await stripeConnect.getAccountStatus(user.stripeConnectAccountId);
    if (!status.payoutsEnabled) {
      return next(httpError(400, 'Tu cuenta de Stripe aun no puede recibir pagos. Completa el onboarding.'));
    }

    // SECURITY (C-3): persist the debit row BEFORE the network call and key the
    // Stripe transfer on its id. This makes the transfer idempotent (a retry
    // reuses the same key instead of paying twice) and crash-durable (a process
    // that dies after the transfer still leaves a 'processing' row that reduces
    // the balance, instead of silently allowing a re-withdrawal).
    const debit = await Transaccion.create({
      advertiser: userId, // self-transfer
      creator: userId,
      amount,
      tipo: 'retiro',
      status: 'processing',
      description: `Retiro manual: ${amount} EUR`,
    });

    let transfer;
    try {
      transfer = await stripeConnect.transferToCreator(
        amount,
        user.stripeConnectAccountId,
        { userId: String(user._id), type: 'manual_withdrawal' },
        { idempotencyKey: `withdraw:${debit._id}` }
      );
    } catch (transferErr) {
      debit.status = 'failed';
      debit.description = `Retiro manual fallido: ${transferErr?.message || transferErr}`;
      await debit.save().catch(() => { /* best-effort */ });
      throw transferErr;
    }

    debit.status = 'paid';
    debit.paidAt = new Date();
    debit.stripePaymentIntentId = transfer.id;
    await debit.save();

    return res.json({ success: true, message: `Retiro de ${amount} EUR procesado`, data: { transferId: transfer.id } });
  } catch (error) {
    next(error);
  } finally {
    if (lockedUserId) await releaseWithdrawalLock(lockedUserId);
  }
};

// GET /api/payouts/history — Withdrawal history
const getHistory = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const withdrawals = await Transaccion.find({
      creator: userId,
      tipo: { $in: ['retiro', 'comision'] },
    }).sort({ createdAt: -1 }).limit(50).lean();

    return res.json({ success: true, data: { items: withdrawals } });
  } catch (error) {
    next(error);
  }
};

module.exports = { onboard, getStatus, getDashboardLink, withdraw, getHistory };
