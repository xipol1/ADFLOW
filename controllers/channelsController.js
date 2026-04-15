const Canal = require('../models/Canal');
const ChannelMetrics = require('../models/ChannelMetrics');
const { ensureDb } = require('../lib/ensureDb');

// Fallback demo channels shown before real data is in DB
const DEMO_CHANNELS = [
  { id: 'demo-crypto-alpha', nombre: 'Crypto Alpha Signals', plataforma: 'telegram', categoria: 'cripto', audiencia: 120000, precio: 450, moneda: 'EUR', verificado: true, url: 'https://t.me/cryptoalphasignals' },
  { id: 'demo-gaming-deals', nombre: 'Gaming Deals Hub', plataforma: 'discord', categoria: 'gaming', audiencia: 150000, precio: 650, moneda: 'EUR', verificado: false, url: 'https://discord.gg/gamingdeals' },
  { id: 'demo-ecom-growth', nombre: 'Ecom Growth ES', plataforma: 'whatsapp', categoria: 'negocios', audiencia: 80000, precio: 390, moneda: 'EUR', verificado: true, url: 'https://wa.me/00000000000' },
  { id: 'demo-dev-code', nombre: 'Dev & Code ES', plataforma: 'telegram', categoria: 'tecnologia', audiencia: 38900, precio: 380, moneda: 'EUR', verificado: true, url: 'https://t.me/devcodeES' },
  { id: 'demo-finanzas', nombre: 'Finanzas Para Todos', plataforma: 'telegram', categoria: 'finanzas', audiencia: 52100, precio: 520, moneda: 'EUR', verificado: true, url: 'https://t.me/finanzasparatodos' },
  { id: 'demo-marketing', nombre: 'Marketing Pro WA', plataforma: 'whatsapp', categoria: 'marketing', audiencia: 15200, precio: 180, moneda: 'EUR', verificado: true, url: 'https://wa.me/marketing' },
];

const normalizeBool = (value) => {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return null;
};

const listChannels = async (req, res) => {
  const pagina = Math.max(1, Number(req.query?.pagina || 1));
  const limite = Math.min(100, Math.max(1, Number(req.query?.limite || 20)));
  const plataforma = req.query?.plataforma ? String(req.query.plataforma).toLowerCase() : '';
  const categoria = req.query?.categoria ? String(req.query.categoria).toLowerCase() : '';
  const busqueda = req.query?.busqueda ? String(req.query.busqueda).toLowerCase() : '';
  const verificado = normalizeBool(req.query?.verificado);
  const ordenPor = req.query?.ordenPor || 'createdAt';
  const minScore = Number(req.query?.minScore) || 0;
  const minSubs = Number(req.query?.minSubs) || 0;
  const maxSubs = Number(req.query?.maxSubs) || 0;

  const dbOk = await ensureDb();
  if (!dbOk) {
    // Return demo data when DB unavailable
    let items = DEMO_CHANNELS.slice();
    if (plataforma) items = items.filter(c => c.plataforma === plataforma);
    if (verificado !== null) items = items.filter(c => c.verificado === verificado);
    const total = items.length;
    const start = (pagina - 1) * limite;
    return res.json({ success: true, data: items.slice(start, start + limite), pagination: { pagina, limite, total, totalPaginas: Math.ceil(total / limite) } });
  }

  try {
    const filter = { estado: { $in: ['activo', 'verificado'] } };
    if (plataforma) filter.plataforma = plataforma;
    if (categoria) filter.categoria = categoria;
    if (verificado !== null) filter.estado = verificado ? 'verificado' : 'activo';
    if (busqueda) {
      filter.$or = [
        { nombreCanal: { $regex: busqueda, $options: 'i' } },
        { descripcion: { $regex: busqueda, $options: 'i' } },
        { categoria: { $regex: busqueda, $options: 'i' } },
        { identificadorCanal: { $regex: busqueda, $options: 'i' } },
      ];
    }
    if (minScore > 0) filter.CAS = { ...(filter.CAS || {}), $gte: minScore };
    if (minSubs > 0 || maxSubs > 0) {
      filter['estadisticas.seguidores'] = {};
      if (minSubs > 0) filter['estadisticas.seguidores'].$gte = minSubs;
      if (maxSubs > 0) filter['estadisticas.seguidores'].$lte = maxSubs;
    }

    const sortMap = { precio: { precio: -1 }, audiencia: { 'estadisticas.seguidores': -1 }, score: { CAS: -1 }, createdAt: { createdAt: -1 }, engagement: { CER: -1 } };
    const sort = sortMap[ordenPor] || { createdAt: -1 };

    const total = await Canal.countDocuments(filter);
    const items = await Canal.find(filter)
      .sort(sort)
      .skip((pagina - 1) * limite)
      .limit(limite)
      .lean();

    // Enrich with scoring data
    const channelIds = items.map(c => c._id);
    const metricsMap = {};
    if (channelIds.length > 0) {
      const metrics = await ChannelMetrics.find({ channel: { $in: channelIds } }).lean();
      metrics.forEach(m => { metricsMap[String(m.channel)] = m; });
    }

    const normalized = items.map(c => {
      const m = metricsMap[String(c._id)];
      const CAS = c.CAS ?? 50;
      return {
        id: c._id,
        nombre: c.nombreCanal || '',
        plataforma: c.plataforma || '',
        categoria: c.categoria || '',
        audiencia: c.estadisticas?.seguidores || 0,
        precio: c.precio || m?.recommendedPrice || 0,
        moneda: 'EUR',
        verificado: c.estado === 'verificado',
        descripcion: c.descripcion || '',
        url: c.url || '',
        // v2 scores (direct from Canal document)
        CAS,
        CAF: c.CAF ?? 50,
        CTF: c.CTF ?? 50,
        CER: c.CER ?? 50,
        CVS: c.CVS ?? 50,
        CAP: c.CAP ?? 50,
        nivel: c.nivel || 'BRONZE',
        CPMDinamico: c.CPMDinamico || 0,
        confianzaScore: c.verificacion?.confianzaScore ?? 0,
        // Legacy alias — ExplorePage.jsx still reads ch.score. Maps to CAS.
        score: CAS,
        engagement: m?.engagementRate ? (m.engagementRate * 100).toFixed(1) : null,
        // propietario omitted from public response for security
      };
    });

    // If no real channels yet, augment with demo data
    const result = normalized.length > 0 ? normalized : DEMO_CHANNELS.slice((pagina - 1) * limite, pagina * limite);
    const resultTotal = normalized.length > 0 ? total : DEMO_CHANNELS.length;

    return res.json({
      success: true,
      data: result,
      pagination: { pagina, limite, total: resultTotal, totalPaginas: Math.max(1, Math.ceil(resultTotal / limite)) },
    });
  } catch (err) {
    // Fallback to demo data on error
    return res.json({ success: true, data: DEMO_CHANNELS, pagination: { pagina: 1, limite: DEMO_CHANNELS.length, total: DEMO_CHANNELS.length, totalPaginas: 1 } });
  }
};

const getChannelById = async (req, res) => {
  const { id } = req.params;

  // Check demo fallback
  const demo = DEMO_CHANNELS.find(c => c.id === id);

  const dbOk = await ensureDb();
  if (!dbOk) {
    if (demo) return res.json({ success: true, data: demo });
    return res.status(404).json({ success: false, message: 'Canal no encontrado' });
  }

  try {
    const canal = await Canal.findById(id).lean();
    if (!canal) {
      if (demo) return res.json({ success: true, data: demo });
      return res.status(404).json({ success: false, message: 'Canal no encontrado' });
    }

    const metrics = await ChannelMetrics.findOne({ channel: canal._id }).lean();
    const CAS = canal.CAS ?? 50;
    return res.json({
      success: true,
      data: {
        id: canal._id,
        nombre: canal.nombreCanal || '',
        plataforma: canal.plataforma || '',
        categoria: canal.categoria || '',
        audiencia: canal.estadisticas?.seguidores || 0,
        precio: canal.precio || metrics?.recommendedPrice || 0,
        moneda: 'EUR',
        verificado: canal.estado === 'verificado',
        descripcion: canal.descripcion || '',
        url: canal.url || '',
        // v2 scores (direct from Canal document)
        CAS,
        CAF: canal.CAF ?? 50,
        CTF: canal.CTF ?? 50,
        CER: canal.CER ?? 50,
        CVS: canal.CVS ?? 50,
        CAP: canal.CAP ?? 50,
        nivel: canal.nivel || 'BRONZE',
        CPMDinamico: canal.CPMDinamico || 0,
        confianzaScore: canal.verificacion?.confianzaScore ?? 0,
        // Legacy alias — ExplorePage.jsx still reads ch.score. Maps to CAS.
        score: CAS,
        engagement: metrics?.engagementRate ? (metrics.engagementRate * 100).toFixed(1) : null,
      },
    });
  } catch {
    if (demo) return res.json({ success: true, data: demo });
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

// GET /api/channels/:id/availability?year=2026&month=3
const getChannelAvailability = async (req, res) => {
  const dbOk = await ensureDb();
  if (!dbOk) return res.status(503).json({ success: false, message: 'DB unavailable' });

  try {
    const canal = await Canal.findById(req.params.id)
      .select('precio disponibilidad nombreCanal')
      .lean();
    if (!canal) return res.status(404).json({ success: false, message: 'Canal no encontrado' });

    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month); // 0-based from frontend
    const monthIdx = Number.isFinite(month) ? month : new Date().getMonth();

    const dispo = canal.disponibilidad || {};
    const basePrice = canal.precio || 0;
    const enabledDays = new Set(dispo.diasSemana || [0, 1, 2, 3, 4, 5, 6]);
    const blockedDates = new Set(dispo.diasBloqueados || []);
    const dayPricing = {};
    (dispo.preciosPorDia || []).forEach(p => { dayPricing[p.day] = p; });

    const minAdvance = dispo.antelacionMinima || 2;
    const maxAdvance = dispo.antelacionMaxima || 60;
    const maxPub = dispo.maxPublicacionesMes || 10;

    // Count existing bookings this month
    const Campaign = require('../models/Campaign');
    const monthStart = new Date(year, monthIdx, 1);
    const monthEnd = new Date(year, monthIdx + 1, 0, 23, 59, 59);
    const bookings = await Campaign.find({
      channel: canal._id,
      status: { $in: ['PAID', 'PUBLISHED', 'COMPLETED'] },
      createdAt: { $gte: monthStart, $lte: monthEnd }
    }).select('createdAt').lean();
    const bookedCount = bookings.length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(year, monthIdx, d);
      const dow = dateObj.getDay();
      const diffDays = Math.ceil((dateObj - today) / (1000 * 60 * 60 * 24));

      let status = 'available';
      if (dateObj < today) status = 'past';
      else if (blockedDates.has(dateStr)) status = 'blocked';
      else if (!enabledDays.has(dow)) status = 'disabled';
      else if (diffDays < minAdvance) status = 'too_soon';
      else if (diffDays > maxAdvance) status = 'disabled';
      else if (bookedCount >= maxPub) status = 'full';

      const dp = dayPricing[dow];
      const price = (dp && dp.enabled) ? dp.price : basePrice;

      days.push({ d, date: dateStr, dayOfWeek: dow, price, status });
    }

    return res.json({
      success: true,
      data: {
        channelId: canal._id,
        channelName: canal.nombreCanal,
        year,
        month: monthIdx,
        basePrice,
        days,
        slotsRemaining: Math.max(0, maxPub - bookedCount),
        maxPublicacionesMes: maxPub,
        antelacionMinima: minAdvance,
        horarioPreferido: dispo.horarioPreferido || { desde: '09:00', hasta: '21:00' },
        aceptaUrgentes: dispo.aceptaUrgentes || false,
        precioUrgente: dispo.precioUrgente || 0
      }
    });
  } catch (err) {
    console.error('getChannelAvailability error:', err.message);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// PUT /api/channels/:id/availability (creator updates their availability)
const updateChannelAvailability = async (req, res) => {
  const dbOk = await ensureDb();
  if (!dbOk) return res.status(503).json({ success: false, message: 'DB unavailable' });

  try {
    const userId = req.usuario?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'No autorizado' });

    const canal = await Canal.findById(req.params.id);
    if (!canal) return res.status(404).json({ success: false, message: 'Canal no encontrado' });
    if (canal.propietario?.toString() !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Solo el propietario puede actualizar' });
    }

    const b = req.body;
    if (b.maxPublicacionesMes != null) canal.disponibilidad.maxPublicacionesMes = Number(b.maxPublicacionesMes);
    if (Array.isArray(b.diasSemana)) canal.disponibilidad.diasSemana = b.diasSemana.map(Number);
    if (Array.isArray(b.preciosPorDia)) canal.disponibilidad.preciosPorDia = b.preciosPorDia;
    if (Array.isArray(b.diasBloqueados)) canal.disponibilidad.diasBloqueados = b.diasBloqueados;
    if (b.horarioPreferido) canal.disponibilidad.horarioPreferido = b.horarioPreferido;
    if (b.antelacionMinima != null) canal.disponibilidad.antelacionMinima = Number(b.antelacionMinima);
    if (b.antelacionMaxima != null) canal.disponibilidad.antelacionMaxima = Number(b.antelacionMaxima);
    if (b.aceptaUrgentes != null) canal.disponibilidad.aceptaUrgentes = Boolean(b.aceptaUrgentes);
    if (b.precioUrgente != null) canal.disponibilidad.precioUrgente = Number(b.precioUrgente);
    if (b.allowPacks != null) canal.allowPacks = Boolean(b.allowPacks);

    await canal.save();
    return res.json({ success: true, data: { ...canal.disponibilidad.toObject(), allowPacks: canal.allowPacks } });
  } catch (err) {
    console.error('updateChannelAvailability error:', err.message);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// GET /api/channels/:id/snapshots?days=30
const getChannelSnapshots = async (req, res) => {
  const dbOk = await ensureDb();
  if (!dbOk) return res.status(503).json({ success: false, message: 'DB unavailable' });

  try {
    const CanalScoreSnapshot = require('../models/CanalScoreSnapshot');
    const days = Math.min(90, Math.max(1, Number(req.query.days) || 30));
    const since = new Date();
    since.setDate(since.getDate() - days);

    const snapshots = await CanalScoreSnapshot.find({
      canalId: req.params.id,
      fecha: { $gte: since },
    })
      .sort({ fecha: 1 })
      .select('fecha seguidores CAF CTF CER CVS CAP CAS nivel telegramIntel')
      .lean();

    const data = snapshots.map((s) => ({
      date: s.fecha,
      subscribers: s.seguidores || 0,
      avg_views: s.telegramIntel?.avg_views_last_20_posts ?? null,
      engagement_rate: s.telegramIntel?.engagement_rate ?? null,
      // MTProto intel fields — previously missing from the response, which
      // is why ChannelExplorerPage always showed "—"/"Estable" even when
      // these fields existed in CanalScoreSnapshot.telegramIntel.*
      last_post_date: s.telegramIntel?.last_post_date ?? null,
      post_frequency: s.telegramIntel?.post_frequency_per_week ?? null,
      views_trend: s.telegramIntel?.views_trend ?? null,
      verified: s.telegramIntel?.verified ?? false,
      scores: {
        CAF: s.CAF,
        CTF: s.CTF,
        CER: s.CER,
        CVS: s.CVS,
        CAS: s.CAS,
      },
      // Flat aliases for backward-compat with ChannelExplorerPage
      fecha: s.fecha,
      seguidores: s.seguidores || 0,
      CAF: s.CAF,
      CTF: s.CTF,
      CER: s.CER,
      CVS: s.CVS,
      CAP: s.CAP,
      CAS: s.CAS,
      nivel: s.nivel,
    }));

    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.json({ success: true, data });
  } catch (err) {
    console.error('getChannelSnapshots error:', err.message);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

// GET /api/channels/rankings?categoria=finanzas&limit=20
const getRankings = async (req, res) => {
  const dbOk = await ensureDb();
  if (!dbOk) {
    return res.json({ success: true, data: { rankings: [], deltas: {} } });
  }

  try {
    const CanalScoreSnapshot = require('../models/CanalScoreSnapshot');
    const categoria = req.query?.categoria ? String(req.query.categoria).toLowerCase() : '';
    const limit = Math.min(50, Math.max(1, Number(req.query?.limit) || 20));

    // Build filter: only active/verified channels
    const filter = { estado: { $in: ['activo', 'verificado'] }, CAS: { $gt: 0 } };
    if (categoria && categoria !== 'all') filter.categoria = categoria;

    // Fetch top channels sorted by CAS
    const items = await Canal.find(filter)
      .sort({ CAS: -1 })
      .limit(limit)
      .lean();

    if (items.length === 0) {
      res.setHeader('Cache-Control', 'public, max-age=1800');
      return res.json({ success: true, data: { rankings: [], deltas: {} } });
    }

    // Build current rankings
    const rankings = items.map((c, idx) => ({
      position: idx + 1,
      id: c._id,
      nombre: c.nombreCanal || '',
      username: c.identificadorCanal || '',
      plataforma: c.plataforma || '',
      categoria: c.categoria || '',
      seguidores: c.estadisticas?.seguidores || 0,
      CAS: c.CAS ?? 0,
      CAF: c.CAF ?? 50,
      CTF: c.CTF ?? 50,
      CER: c.CER ?? 50,
      CVS: c.CVS ?? 50,
      CAP: c.CAP ?? 50,
      nivel: c.nivel || 'BRONZE',
      CPMDinamico: c.CPMDinamico || 0,
      precio: c.precio || 0,
      verificado: c.estado === 'verificado',
      engagement: c.CER ?? 0,
    }));

    // Calculate Δ 7 days: fetch snapshots from ~7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dayAfter = new Date(sevenDaysAgo);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const channelIds = items.map((c) => c._id);

    // Get one snapshot per channel from ~7 days ago
    const oldSnapshots = await CanalScoreSnapshot.aggregate([
      {
        $match: {
          canalId: { $in: channelIds },
          fecha: { $gte: sevenDaysAgo, $lte: dayAfter },
        },
      },
      { $sort: { fecha: -1 } },
      {
        $group: {
          _id: '$canalId',
          CAS: { $first: '$CAS' },
        },
      },
    ]);

    // Build old scores map and compute old ranking order
    const oldScores = {};
    oldSnapshots.forEach((s) => { oldScores[String(s._id)] = s.CAS; });

    // Sort old scores to determine old positions
    const oldRanked = channelIds
      .map((id) => ({ id: String(id), cas: oldScores[String(id)] ?? null }))
      .filter((e) => e.cas != null)
      .sort((a, b) => b.cas - a.cas);

    const oldPositionMap = {};
    oldRanked.forEach((e, i) => { oldPositionMap[e.id] = i + 1; });

    // Compute deltas
    const deltas = {};
    rankings.forEach((r) => {
      const oldPos = oldPositionMap[String(r.id)];
      if (oldPos != null) {
        deltas[String(r.id)] = oldPos - r.position; // positive = moved up
      }
    });

    res.setHeader('Cache-Control', 'public, max-age=1800');
    return res.json({ success: true, data: { rankings, deltas } });
  } catch (err) {
    console.error('getRankings error:', err.message);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

// GET /api/channels/username/:username
const getChannelByUsername = async (req, res) => {
  const dbOk = await ensureDb();
  if (!dbOk) return res.status(503).json({ success: false, message: 'DB unavailable' });

  try {
    const username = String(req.params.username).replace(/^@/, '').trim().toLowerCase();
    if (!username) return res.status(400).json({ success: false, message: 'Username requerido' });

    const canal = await Canal.findOne({
      identificadorCanal: { $regex: new RegExp(`^@?${username}$`, 'i') },
    }).lean();

    if (!canal) return res.status(404).json({ success: false, message: 'Canal no encontrado' });

    const metrics = await ChannelMetrics.findOne({ channel: canal._id }).lean().catch(() => null);
    const CAS = canal.CAS ?? 50;

    res.setHeader('Cache-Control', 'public, max-age=1800');
    return res.json({
      success: true,
      data: {
        id: canal._id,
        nombre: canal.nombreCanal || '',
        plataforma: canal.plataforma || '',
        categoria: canal.categoria || '',
        descripcion: canal.descripcion || '',
        audiencia: canal.estadisticas?.seguidores || 0,
        precio: canal.precio || 0,
        verificado: canal.estado === 'verificado',
        CAS,
        CAF: canal.CAF ?? 50,
        CTF: canal.CTF ?? 50,
        CER: canal.CER ?? 50,
        CVS: canal.CVS ?? 50,
        CAP: canal.CAP ?? 50,
        nivel: canal.nivel || 'BRONZE',
        CPMDinamico: canal.CPMDinamico || 0,
        confianzaScore: canal.verificacion?.confianzaScore ?? 0,
        score: CAS,
        engagement: metrics?.engagementRate ? (metrics.engagementRate * 100).toFixed(1) : null,
        username: canal.identificadorCanal || '',
        createdAt: canal.createdAt,
        views_trend: canal.crawler?.ultimaActualizacion ? 'estable' : null,
        post_frequency: null,
        last_post_date: null,
      },
    });
  } catch (err) {
    console.error('getChannelByUsername error:', err.message);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

module.exports = { listChannels, getChannelById, getChannelByUsername, getChannelAvailability, updateChannelAvailability, getChannelSnapshots, getRankings };
