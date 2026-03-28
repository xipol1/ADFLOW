const Canal = require('../models/Canal');
const { ensureDb } = require('../lib/ensureDb');

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

// GET /api/lists/channels — public channel discovery
const getChannels = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const { categoria, tematica, minSeguidores, maxSeguidores, plataforma, pagina = 1, limite = 20 } = req.query;

    const filter = { estado: 'activo' };

    if (categoria || tematica) filter.categoria = (categoria || tematica).toLowerCase().trim();
    if (plataforma) filter.plataforma = plataforma.toLowerCase().trim();
    if (minSeguidores || maxSeguidores) {
      filter['estadisticas.seguidores'] = {};
      if (minSeguidores) filter['estadisticas.seguidores'].$gte = Number(minSeguidores);
      if (maxSeguidores) filter['estadisticas.seguidores'].$lte = Number(maxSeguidores);
    }

    const skip = (Number(pagina) - 1) * Number(limite);
    const [items, total] = await Promise.all([
      Canal.find(filter)
        .select('nombreCanal plataforma categoria descripcion estadisticas.seguidores identificadorCanal estado')
        .sort({ 'estadisticas.seguidores': -1 })
        .skip(skip)
        .limit(Number(limite))
        .lean(),
      Canal.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      data: {
        items,
        total,
        pagina: Number(pagina),
        totalPaginas: Math.ceil(total / Number(limite))
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getChannels };
