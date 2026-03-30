const Canal = require('../models/Canal');
const { ensureDb } = require('../lib/ensureDb');

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const crearCanal = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const plataforma = String(req.body?.plataforma || '').trim().toLowerCase();
    const identificadorCanal = String(req.body?.identificadorCanal || '').trim();
    const nombreCanal = String(req.body?.nombreCanal || '').trim();
    const categoria = String(req.body?.categoria || '').trim().toLowerCase();
    const descripcion = String(req.body?.descripcion || '').trim();

    if (!plataforma || !identificadorCanal) {
      return next(httpError(400, 'plataforma e identificadorCanal son requeridos'));
    }

    const canal = await Canal.create({
      propietario: userId,
      plataforma,
      identificadorCanal,
      nombreCanal,
      categoria,
      descripcion,
      estado: 'pendiente_verificacion'
    });

    return res.status(201).json({ success: true, data: canal });
  } catch (error) {
    next(error);
  }
};

const obtenerMisCanales = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const items = await Canal.find({ propietario: userId }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: { items } });
  } catch (error) {
    next(error);
  }
};

const obtenerCanal = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const canal = await Canal.findById(req.params.id).lean();
    if (!canal) return next(httpError(404, 'Canal no encontrado'));

    return res.json({ success: true, data: canal });
  } catch (error) {
    next(error);
  }
};

const actualizarCanal = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const canal = await Canal.findById(req.params.id);
    if (!canal) return next(httpError(404, 'Canal no encontrado'));

    if (canal.propietario?.toString?.() !== String(userId)) {
      return next(httpError(403, 'No autorizado'));
    }

    const stringFields = ['nombreCanal', 'descripcion', 'categoria', 'identificadorCanal'];
    stringFields.forEach((field) => {
      if (req.body?.[field] !== undefined) canal[field] = String(req.body[field]).trim();
    });
    if (req.body?.precio !== undefined) canal.precio = Number(req.body.precio) || 0;
    if (req.body?.foto !== undefined) canal.foto = String(req.body.foto).trim();
    if (req.body?.banner !== undefined) canal.banner = String(req.body.banner).trim();
    if (req.body?.tags !== undefined && Array.isArray(req.body.tags)) canal.tags = req.body.tags.map(String);
    if (req.body?.idioma !== undefined) canal.idioma = String(req.body.idioma).trim();

    await canal.save();
    return res.json({ success: true, data: canal });
  } catch (error) {
    next(error);
  }
};

const eliminarCanal = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const canal = await Canal.findById(req.params.id);
    if (!canal) return next(httpError(404, 'Canal no encontrado'));

    if (canal.propietario?.toString?.() !== String(userId)) {
      return next(httpError(403, 'No autorizado'));
    }

    await canal.deleteOne();
    return res.json({ success: true, message: 'Canal eliminado' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  crearCanal,
  obtenerMisCanales,
  obtenerCanal,
  actualizarCanal,
  eliminarCanal
};
