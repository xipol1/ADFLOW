/**
 * Niche-level market intelligence.
 *
 * Provides aggregated, anonymized analytics per niche (leaderboard,
 * trends, supply vs demand). All queries hit indexed fields on Canal
 * and CanalScoreSnapshot — no full-table scans.
 *
 * Privacy: channel owner IDs, contact info, and internal fraud signals
 * are NEVER returned. Only public-safe aggregate data.
 */

const { ensureDb } = require('../lib/ensureDb');
const { NICHE_BENCHMARKS } = require('../config/nicheBenchmarks');

function models() {
  return {
    Canal: require('../models/Canal'),
    Campaign: require('../models/Campaign'),
    CanalScoreSnapshot: require('../models/CanalScoreSnapshot'),
  };
}

const VALID_NICHOS = new Set(Object.keys(NICHE_BENCHMARKS));

function isValidNicho(nicho) {
  return VALID_NICHOS.has(nicho);
}

/**
 * Top channels in a niche, sorted by CAS desc.
 * Returns anonymized summaries (no owner ID, no contact info).
 */
async function getNicheLeaderboard(nicho, { limit = 10 } = {}) {
  await ensureDb();
  const { Canal } = models();

  const channels = await Canal.find({
    categoria: nicho,
    estado: { $in: ['verificado', 'activo'] },
    CAS: { $gt: 0 },
  })
    .sort({ CAS: -1 })
    .limit(Math.min(limit, 50))
    .select(
      'nombreCanal plataforma CAS CAF CTF CER CVS CAP nivel CPMDinamico ' +
      'estadisticas.seguidores verificacion.confianzaScore -_id'
    )
    .lean();

  // Anonymize names: first 3 chars + "•••"
  return channels.map((ch, i) => ({
    rank: i + 1,
    nombre: (ch.nombreCanal || '').slice(0, 3) + '•••',
    plataforma: ch.plataforma,
    CAS: ch.CAS,
    nivel: ch.nivel,
    CPMDinamico: ch.CPMDinamico,
    seguidores: ch.estadisticas?.seguidores || 0,
    confianzaScore: ch.verificacion?.confianzaScore || 0,
  }));
}

/**
 * Daily aggregated trends for a niche over `days` days.
 * Returns { fecha, avgCAS, avgCPM, avgCTF, channelCount } per day.
 */
async function getNicheTrends(nicho, days = 30) {
  await ensureDb();
  const { CanalScoreSnapshot } = models();

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const pipeline = [
    { $match: { nicho, fecha: { $gte: cutoff } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$fecha' } },
        avgCAS: { $avg: '$CAS' },
        avgCPM: { $avg: '$CPMDinamico' },
        avgCTF: { $avg: '$CTF' },
        avgCAP: { $avg: '$CAP' },
        channelCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const results = await CanalScoreSnapshot.aggregate(pipeline);

  return results.map((r) => ({
    fecha: r._id,
    avgCAS: Math.round((r.avgCAS || 0) * 10) / 10,
    avgCPM: Math.round((r.avgCPM || 0) * 100) / 100,
    avgCTF: Math.round((r.avgCTF || 0) * 10) / 10,
    avgCAP: Math.round((r.avgCAP || 0) * 10) / 10,
    channelCount: r.channelCount,
  }));
}

/**
 * Supply vs demand snapshot for a niche.
 */
async function getNicheSupplyDemand(nicho) {
  await ensureDb();
  const { Canal, Campaign } = models();

  const activeFilter = {
    categoria: nicho,
    estado: { $in: ['verificado', 'activo'] },
  };

  // Run all queries in parallel
  const [totalChannels, busyChannels, demand30d, priceStats] = await Promise.all([
    // Total active channels in niche
    Canal.countDocuments(activeFilter),

    // Channels with active campaigns (PAID or PUBLISHED)
    Campaign.distinct('channel', {
      status: { $in: ['PAID', 'PUBLISHED'] },
    }).then(async (busyIds) => {
      if (busyIds.length === 0) return 0;
      return Canal.countDocuments({
        ...activeFilter,
        _id: { $in: busyIds },
      });
    }),

    // Campaigns created in last 30 days targeting this niche
    (async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      // Get channels in this niche
      const nicheChannelIds = await Canal.find(activeFilter)
        .select('_id')
        .lean()
        .then((chs) => chs.map((c) => c._id));
      if (nicheChannelIds.length === 0) return 0;
      return Campaign.countDocuments({
        channel: { $in: nicheChannelIds },
        createdAt: { $gte: since },
      });
    })(),

    // Price stats
    Canal.aggregate([
      { $match: { ...activeFilter, CPMDinamico: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          avgCPM: { $avg: '$CPMDinamico' },
          minPrecio: { $min: '$precio' },
          maxPrecio: { $max: '$precio' },
          avgCAS: { $avg: '$CAS' },
        },
      },
    ]).then((r) => r[0] || { avgCPM: 0, minPrecio: 0, maxPrecio: 0, avgCAS: 0 }),
  ]);

  const availableChannels = totalChannels - busyChannels;

  // Market sentiment
  let sentiment = 'equilibrado';
  if (totalChannels > 0 && demand30d > totalChannels * 0.5) {
    sentiment = 'alta_demanda';
  } else if (totalChannels > 0 && demand30d < totalChannels * 0.1) {
    sentiment = 'alta_oferta';
  }

  return {
    totalChannels,
    availableChannels,
    busyChannels,
    demandLast30d: demand30d,
    avgCPM: Math.round((priceStats.avgCPM || 0) * 100) / 100,
    avgCAS: Math.round((priceStats.avgCAS || 0) * 10) / 10,
    priceRange: {
      min: priceStats.minPrecio || 0,
      max: priceStats.maxPrecio || 0,
    },
    sentiment,
  };
}

module.exports = {
  getNicheLeaderboard,
  getNicheTrends,
  getNicheSupplyDemand,
  isValidNicho,
  VALID_NICHOS,
};
