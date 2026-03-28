const Transaccion = require('../models/Transaccion');
const Campaign = require('../models/Campaign');
const { ensureDb } = require('../lib/ensureDb');

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const obtenerMisTransacciones = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const items = await Transaccion.find({ advertiser: userId })
      .populate('campaign', 'content status targetUrl price createdAt')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: { items } });
  } catch (error) {
    next(error);
  }
};

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

// POST /api/transacciones/:id/pay — simulates payment when Stripe is not active
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

const obtenerEstadisticasFinancieras = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const [total, paid, pending] = await Promise.all([
      Transaccion.countDocuments({ advertiser: userId }),
      Transaccion.aggregate([
        { $match: { advertiser: require('mongoose').Types.ObjectId.createFromHexString ? undefined : userId } },
        { $match: { advertiser: new (require('mongoose').Types.ObjectId)(userId), status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaccion.countDocuments({ advertiser: userId, status: 'pending' })
    ]);

    const totalPaid = paid[0]?.total || 0;

    return res.json({
      success: true,
      data: { totalTransacciones: total, totalPagado: totalPaid, pendientes: pending }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  obtenerMisTransacciones,
  obtenerTransaccion,
  procesarPago,
  obtenerEstadisticasFinancieras
};
