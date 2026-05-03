const ChannelSwap = require('../models/ChannelSwap');
const Canal = require('../models/Canal');
const Usuario = require('../models/Usuario');
const { ensureDb } = require('../lib/ensureDb');

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

// Helper: ¿este userId es propietario de este canal? (acepta ObjectId o string)
const userOwnsChannel = (canal, userId) =>
  canal && String(canal.propietario) === String(userId);

// Score 0-100 que mide cuán buen match son dos canales para un swap.
// Penaliza fuerte la asimetría de tamaño y premia mismo nicho/idioma.
const matchScore = (mio, otro) => {
  const sigA = mio.estadisticas?.seguidores || 0;
  const sigB = otro.estadisticas?.seguidores || 0;
  if (!sigA || !sigB) return 30; // insuficiente data → score base bajo

  const ratio = Math.min(sigA, sigB) / Math.max(sigA, sigB);
  // ratio 1.0 (mismo tamaño) = 50pts, 0.5 = 25pts, 0.1 = 5pts
  let score = ratio * 50;

  // Mismo nicho: +30
  if (mio.categoria && otro.categoria && mio.categoria.toLowerCase() === otro.categoria.toLowerCase()) {
    score += 30;
  }

  // Misma plataforma: +10 (más fácil colaborar — formato compatible)
  if (mio.plataforma && otro.plataforma && mio.plataforma === otro.plataforma) {
    score += 10;
  }

  // Verificado: +10
  if (otro.verificado) score += 10;

  return Math.min(100, Math.round(score));
};

// ── GET /api/swaps/discover?canalId=xxx
// Devuelve canales candidatos para hacer swap, ordenados por matchScore.
const discoverPartners = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const { canalId } = req.query;
    if (!canalId) return next(httpError(400, 'canalId es requerido'));

    const miCanal = await Canal.findById(canalId).lean();
    if (!miCanal) return next(httpError(404, 'Canal no encontrado'));
    if (!userOwnsChannel(miCanal, userId)) return next(httpError(403, 'No eres dueño de este canal'));

    // Buscar candidatos: cualquier canal verificado que NO sea mío y con seguidores > 0
    const candidatos = await Canal.find({
      _id: { $ne: miCanal._id },
      propietario: { $ne: userId },
      'estadisticas.seguidores': { $gt: 0 },
      estado: { $in: ['activo', 'verificado'] },
    })
      .select('nombreCanal plataforma categoria estadisticas.seguidores CAS verificado propietario perfil.foto perfil.bio')
      .limit(200)
      .lean();

    // Filtrar canales con swap activo en curso con miCanal
    const swapsActivos = await ChannelSwap.find({
      $or: [
        { requesterChannel: miCanal._id },
        { recipientChannel: miCanal._id },
      ],
      status: { $in: ['propuesto', 'aceptado', 'publicado_a', 'publicado_b', 'publicado_ambos'] },
    }).select('requesterChannel recipientChannel').lean();

    const bloqueados = new Set();
    swapsActivos.forEach(s => {
      bloqueados.add(String(s.requesterChannel));
      bloqueados.add(String(s.recipientChannel));
    });

    const conScore = candidatos
      .filter(c => !bloqueados.has(String(c._id)))
      .map(c => ({
        _id: c._id,
        nombreCanal: c.nombreCanal,
        plataforma: c.plataforma,
        categoria: c.categoria,
        seguidores: c.estadisticas?.seguidores || 0,
        CAS: c.CAS,
        verificado: !!c.verificado,
        foto: c.perfil?.foto || '',
        bio: c.perfil?.bio || '',
        matchScore: matchScore(miCanal, c),
      }))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 50);

    return res.json({ success: true, data: conScore });
  } catch (err) {
    return next(err);
  }
};

// ── POST /api/swaps — crear propuesta
const createSwap = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const { requesterChannel, recipientChannel, propuesta = {} } = req.body || {};
    if (!requesterChannel || !recipientChannel) {
      return next(httpError(400, 'requesterChannel y recipientChannel son requeridos'));
    }
    if (String(requesterChannel) === String(recipientChannel)) {
      return next(httpError(400, 'No puedes hacer swap con tu propio canal'));
    }

    const [miCanal, suCanal] = await Promise.all([
      Canal.findById(requesterChannel).lean(),
      Canal.findById(recipientChannel).lean(),
    ]);
    if (!miCanal || !suCanal) return next(httpError(404, 'Canal no encontrado'));
    if (!userOwnsChannel(miCanal, userId)) return next(httpError(403, 'No eres dueño del canal solicitante'));
    if (userOwnsChannel(suCanal, userId)) return next(httpError(400, 'Ambos canales son tuyos'));

    // ¿Ya hay un swap activo entre estos canales?
    const yaExiste = await ChannelSwap.findOne({
      $or: [
        { requesterChannel: miCanal._id, recipientChannel: suCanal._id },
        { requesterChannel: suCanal._id, recipientChannel: miCanal._id },
      ],
      status: { $in: ['propuesto', 'aceptado', 'publicado_a', 'publicado_b', 'publicado_ambos'] },
    }).lean();
    if (yaExiste) return next(httpError(409, 'Ya existe un swap activo entre estos canales'));

    const swap = await ChannelSwap.create({
      requester: userId,
      recipient: suCanal.propietario,
      requesterChannel: miCanal._id,
      recipientChannel: suCanal._id,
      propuesta: {
        mensaje: propuesta.mensaje || '',
        fechaPublicacion: propuesta.fechaPublicacion || null,
        formato: propuesta.formato || 'post_simple',
        duracionHoras: propuesta.duracionHoras || 24,
      },
    });

    return res.status(201).json({ success: true, data: swap });
  } catch (err) {
    if (err.code === 11000) {
      return next(httpError(409, 'Ya existe un swap activo entre estos canales'));
    }
    return next(err);
  }
};

// ── GET /api/swaps/mine?role=incoming|outgoing|active|completed
const listMySwaps = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const { role = 'all' } = req.query;
    let filter = {};
    if (role === 'incoming') {
      filter = { recipient: userId, status: 'propuesto' };
    } else if (role === 'outgoing') {
      filter = { requester: userId, status: 'propuesto' };
    } else if (role === 'active') {
      filter = {
        $or: [{ requester: userId }, { recipient: userId }],
        status: { $in: ['aceptado', 'publicado_a', 'publicado_b', 'publicado_ambos'] },
      };
    } else if (role === 'completed') {
      filter = {
        $or: [{ requester: userId }, { recipient: userId }],
        status: 'completado',
      };
    } else {
      filter = { $or: [{ requester: userId }, { recipient: userId }] };
    }

    const swaps = await ChannelSwap.find(filter)
      .populate('requesterChannel', 'nombreCanal plataforma estadisticas.seguidores perfil.foto')
      .populate('recipientChannel', 'nombreCanal plataforma estadisticas.seguidores perfil.foto')
      .populate('requester', 'nombre email')
      .populate('recipient', 'nombre email')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({ success: true, data: swaps });
  } catch (err) {
    return next(err);
  }
};

// ── GET /api/swaps/:id
const getSwapById = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const swap = await ChannelSwap.findById(req.params.id)
      .populate('requesterChannel', 'nombreCanal plataforma estadisticas.seguidores perfil.foto categoria')
      .populate('recipientChannel', 'nombreCanal plataforma estadisticas.seguidores perfil.foto categoria')
      .populate('requester', 'nombre email')
      .populate('recipient', 'nombre email')
      .lean();
    if (!swap) return next(httpError(404, 'Swap no encontrado'));

    const esParte = String(swap.requester._id || swap.requester) === String(userId)
                 || String(swap.recipient._id || swap.recipient) === String(userId);
    if (!esParte) return next(httpError(403, 'No formas parte de este swap'));

    return res.json({ success: true, data: swap });
  } catch (err) {
    return next(err);
  }
};

// ── POST /api/swaps/:id/accept
const acceptSwap = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const swap = await ChannelSwap.findById(req.params.id);
    if (!swap) return next(httpError(404, 'Swap no encontrado'));
    if (String(swap.recipient) !== String(userId)) {
      return next(httpError(403, 'Solo el destinatario puede aceptar'));
    }
    if (swap.status !== 'propuesto') {
      return next(httpError(400, `No se puede aceptar un swap en estado ${swap.status}`));
    }

    swap.status = 'aceptado';
    await swap.save();

    return res.json({ success: true, data: swap });
  } catch (err) {
    return next(err);
  }
};

// ── POST /api/swaps/:id/reject
const rejectSwap = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const swap = await ChannelSwap.findById(req.params.id);
    if (!swap) return next(httpError(404, 'Swap no encontrado'));
    if (String(swap.recipient) !== String(userId)) {
      return next(httpError(403, 'Solo el destinatario puede rechazar'));
    }
    if (swap.status !== 'propuesto') {
      return next(httpError(400, `No se puede rechazar un swap en estado ${swap.status}`));
    }

    swap.status = 'rechazado';
    swap.motivoRechazo = (req.body?.motivo || '').slice(0, 500);
    await swap.save();

    return res.json({ success: true, data: swap });
  } catch (err) {
    return next(err);
  }
};

// ── POST /api/swaps/:id/cancel
const cancelSwap = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const swap = await ChannelSwap.findById(req.params.id);
    if (!swap) return next(httpError(404, 'Swap no encontrado'));
    const esParte = String(swap.requester) === String(userId) || String(swap.recipient) === String(userId);
    if (!esParte) return next(httpError(403, 'No formas parte de este swap'));
    if (!['propuesto', 'aceptado'].includes(swap.status)) {
      return next(httpError(400, 'Solo se puede cancelar antes de publicar'));
    }

    swap.status = 'cancelado';
    swap.motivoCancelacion = (req.body?.motivo || '').slice(0, 500);
    await swap.save();

    return res.json({ success: true, data: swap });
  } catch (err) {
    return next(err);
  }
};

// ── POST /api/swaps/:id/mark-published
// El creator marca que ya publicó su parte. Avanza el estado.
const markPublished = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const { messageId = '', texto = '', mediaUrl = '' } = req.body || {};

    const swap = await ChannelSwap.findById(req.params.id);
    if (!swap) return next(httpError(404, 'Swap no encontrado'));

    const esRequester = String(swap.requester) === String(userId);
    const esRecipient = String(swap.recipient) === String(userId);
    if (!esRequester && !esRecipient) return next(httpError(403, 'No formas parte de este swap'));

    if (!['aceptado', 'publicado_a', 'publicado_b'].includes(swap.status)) {
      return next(httpError(400, `No se puede marcar como publicado en estado ${swap.status}`));
    }

    const ahora = new Date();
    if (esRequester) {
      swap.contenidoRequester.publicadoEn = ahora;
      swap.contenidoRequester.messageId = String(messageId).slice(0, 200);
      if (texto) swap.contenidoRequester.texto = String(texto).slice(0, 4000);
      if (mediaUrl) swap.contenidoRequester.mediaUrl = String(mediaUrl).slice(0, 500);
    } else {
      swap.contenidoRecipient.publicadoEn = ahora;
      swap.contenidoRecipient.messageId = String(messageId).slice(0, 200);
      if (texto) swap.contenidoRecipient.texto = String(texto).slice(0, 4000);
      if (mediaUrl) swap.contenidoRecipient.mediaUrl = String(mediaUrl).slice(0, 500);
    }

    // Avanzar estado
    const reqPub = !!swap.contenidoRequester.publicadoEn;
    const recPub = !!swap.contenidoRecipient.publicadoEn;
    if (reqPub && recPub) swap.status = 'publicado_ambos';
    else if (reqPub) swap.status = 'publicado_a';
    else if (recPub) swap.status = 'publicado_b';

    await swap.save();
    return res.json({ success: true, data: swap });
  } catch (err) {
    return next(err);
  }
};

// ── POST /api/swaps/:id/rate
const rateSwap = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const { rating, comentario = '' } = req.body || {};
    const r = Number(rating);
    if (!r || r < 1 || r > 5) return next(httpError(400, 'rating debe ser entre 1 y 5'));

    const swap = await ChannelSwap.findById(req.params.id);
    if (!swap) return next(httpError(404, 'Swap no encontrado'));

    if (!['publicado_ambos', 'completado'].includes(swap.status)) {
      return next(httpError(400, 'Solo se puede valorar tras publicación de ambas partes'));
    }

    if (String(swap.requester) === String(userId)) {
      swap.ratingDeRequester = r;
      swap.comentarioDeRequester = String(comentario).slice(0, 500);
    } else if (String(swap.recipient) === String(userId)) {
      swap.ratingDeRecipient = r;
      swap.comentarioDeRecipient = String(comentario).slice(0, 500);
    } else {
      return next(httpError(403, 'No formas parte de este swap'));
    }

    // Si ambas partes valoraron → completado
    if (swap.ratingDeRequester && swap.ratingDeRecipient && swap.status !== 'completado') {
      swap.status = 'completado';
      swap.resultados.cerradoEn = new Date();
    }

    await swap.save();
    return res.json({ success: true, data: swap });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  discoverPartners,
  createSwap,
  listMySwaps,
  getSwapById,
  acceptSwap,
  rejectSwap,
  cancelSwap,
  markPublished,
  rateSwap,
};
