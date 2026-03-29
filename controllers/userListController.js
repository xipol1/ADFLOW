const UserList = require('../models/UserList');
const Canal = require('../models/Canal');
const { ensureDb } = require('../lib/ensureDb');

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

// GET /api/lists — user's own lists
const getMyLists = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const items = await UserList.find({ owner: userId })
      .populate('channels', 'nombreCanal plataforma categoria estadisticas.seguidores identificadorCanal')
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({ success: true, data: { items } });
  } catch (error) {
    next(error);
  }
};

// POST /api/lists — create a new list
const createList = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const { name, description } = req.body || {};
    if (!name?.trim()) return next(httpError(400, 'El nombre es requerido'));

    const list = await UserList.create({
      owner: userId,
      name: name.trim(),
      description: (description || '').trim(),
      channels: []
    });

    return res.status(201).json({ success: true, data: list });
  } catch (error) {
    if (error.code === 11000) {
      return next(httpError(400, 'Ya tienes una lista con ese nombre'));
    }
    next(error);
  }
};

// POST /api/lists/:id/add-channel
const addChannelToList = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const { channelId } = req.body || {};
    if (!channelId) return next(httpError(400, 'channelId es requerido'));

    const list = await UserList.findOne({ _id: req.params.id, owner: userId });
    if (!list) return next(httpError(404, 'Lista no encontrada'));

    const canal = await Canal.findById(channelId).select('_id').lean();
    if (!canal) return next(httpError(404, 'Canal no encontrado'));

    if (list.channels.some(c => c.toString() === channelId)) {
      return next(httpError(400, 'El canal ya está en la lista'));
    }

    list.channels.push(channelId);
    await list.save();

    const populated = await UserList.findById(list._id)
      .populate('channels', 'nombreCanal plataforma categoria estadisticas.seguidores identificadorCanal')
      .lean();

    return res.json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/lists/:id/remove-channel/:channelId
const removeChannelFromList = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const list = await UserList.findOne({ _id: req.params.id, owner: userId });
    if (!list) return next(httpError(404, 'Lista no encontrada'));

    list.channels = list.channels.filter(c => c.toString() !== req.params.channelId);
    await list.save();

    return res.json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/lists/:id
const deleteList = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const result = await UserList.findOneAndDelete({ _id: req.params.id, owner: userId });
    if (!result) return next(httpError(404, 'Lista no encontrada'));

    return res.json({ success: true, message: 'Lista eliminada' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyLists, createList, addChannelToList, removeChannelFromList, deleteList };
