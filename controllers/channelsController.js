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
      ];
    }

    const sortMap = { precio: { precio: -1 }, audiencia: { 'estadisticas.seguidores': -1 }, score: { 'score': -1 }, createdAt: { createdAt: -1 } };
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
        score: m?.scores?.total || null,
        engagement: m?.engagementRate ? (m.engagementRate * 100).toFixed(1) : null,
        propietario: c.propietario,
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
        score: metrics?.scores?.total || null,
        engagement: metrics?.engagementRate ? (metrics.engagementRate * 100).toFixed(1) : null,
      },
    });
  } catch {
    if (demo) return res.json({ success: true, data: demo });
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

module.exports = { listChannels, getChannelById };
