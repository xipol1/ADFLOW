/**
 * Multi-Platform Intel Service — metrics refresh for WhatsApp & Discord channels.
 *
 * Mirrors telegramIntelService.syncAllMappedChannels() but for platforms
 * without native APIs. Refreshes follower/member counts by re-scraping
 * the same sources that discovered the channels (iGrupos, WaChannelsFinder).
 *
 * For each Canal with plataforma 'whatsapp' or 'discord':
 *   1. Attempt to re-fetch metrics from the original scraping source
 *   2. Update Canal.estadisticas.seguidores with the latest count
 *   3. Run calcularCAS() to update scores
 *   4. Create a CanalScoreSnapshot for progression tracking
 *
 * Exported:
 *   - syncAllMultiplatformChannels()  — full sync (used by cron)
 *   - createInitialSnapshots()        — one-time bootstrap for new channels
 */

const { ensureDb } = require('../lib/ensureDb');

const RATE_LIMIT_MS = 500; // local DB operations are fast
const ENGINE_VERSION = 2;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Re-scrape iGrupos for updated WhatsApp/Discord member counts.
 * Returns a Map of { name (lowercase) -> members }.
 */
async function fetchIgruposUpdates(platform) {
  const updates = new Map();
  try {
    const { scrapeTagPage } = require('./scrapers/igruposScraperService');
    const tags = platform === 'whatsapp'
      ? ['marketing', 'negocios', 'emprendimiento', 'finanzas', 'criptomonedas', 'ecommerce', 'tecnologia']
      : ['gaming', 'marketing', 'programacion', 'criptomonedas', 'comunidad'];

    for (const tag of tags) {
      const items = await scrapeTagPage(platform, tag);
      for (const item of items) {
        if (item.name && item.members > 0) {
          updates.set(item.name.toLowerCase().trim(), item.members);
        }
      }
      await sleep(3000);
    }
  } catch (err) {
    console.warn(`[MultiplatformIntel] iGrupos ${platform} refresh failed: ${err.message}`);
  }
  return updates;
}

/**
 * Re-scrape WaChannelsFinder for updated WhatsApp follower counts.
 * Returns a Map of { slug (lowercase) -> followers }.
 */
async function fetchWaChannelsFinderUpdates() {
  const updates = new Map();
  try {
    const { scrapeCategory } = require('./scrapers/wachannelsfinderScraperService');
    const categories = ['business', 'technology', 'news', 'education', 'entertainment', 'sports', 'health'];

    for (const cat of categories) {
      const channels = await scrapeCategory(cat, null, 2);
      for (const ch of channels) {
        if (ch.slug && ch.followers > 0) {
          updates.set(ch.slug.toLowerCase(), ch.followers);
        }
        if (ch.name) {
          updates.set(ch.name.toLowerCase().trim(), ch.followers || 0);
        }
      }
      await sleep(3000);
    }
  } catch (err) {
    console.warn(`[MultiplatformIntel] WaChannelsFinder refresh failed: ${err.message}`);
  }
  return updates;
}

/**
 * Score and snapshot a single canal. Pure DB operations (no network scraping).
 */
async function scoreAndSnapshot(canal, newFollowers) {
  const Canal = require('../models/Canal');
  const CanalScoreSnapshot = require('../models/CanalScoreSnapshot');
  const { calcularCAS } = require('./channelScoringV2');

  const seguidores = newFollowers ?? canal.estadisticas?.seguidores ?? 0;

  // Build enriched canal for the scoring engine
  const enrichedCanal = {
    ...canal,
    estadisticas: {
      ...canal.estadisticas,
      seguidores,
      promedioVisualizaciones: 0, // no views data for WA/Discord
    },
    verificacion: canal.verificacion || { tipoAcceso: 'declarado' },
    antifraude: canal.antifraude || { flags: [] },
    crawler: canal.crawler || {},
  };

  const scores = calcularCAS(enrichedCanal, [], canal.categoria || 'otros');

  // Update Canal document
  const updateData = {
    'estadisticas.seguidores': seguidores,
    'estadisticas.ultimaActualizacion': new Date(),
    CAF: scores.CAF,
    CTF: scores.CTF,
    CER: scores.CER,
    CVS: scores.CVS,
    CAS: scores.CAS,
    nivel: scores.nivel,
    CPMDinamico: scores.CPMDinamico,
    'verificacion.confianzaScore': scores.confianzaScore,
    'antifraude.ratioCTF_CAF': scores.ratioCTF_CAF,
    'antifraude.flags': scores.flags,
    'antifraude.ultimaRevision': new Date(),
  };

  await Canal.updateOne({ _id: canal._id }, { $set: updateData });

  // Create snapshot for progression tracking
  await CanalScoreSnapshot.create({
    canalId: canal._id,
    fecha: new Date(),
    CAF: scores.CAF,
    CTF: scores.CTF,
    CER: scores.CER,
    CVS: scores.CVS,
    CAP: canal.CAP ?? 50,
    CAS: scores.CAS,
    nivel: scores.nivel,
    CPMDinamico: scores.CPMDinamico,
    confianzaScore: scores.confianzaScore,
    ratioCTF_CAF: scores.ratioCTF_CAF,
    flags: scores.flags,
    seguidores,
    nicho: canal.categoria || 'otros',
    plataforma: canal.plataforma,
    version: ENGINE_VERSION,
  });

  return scores;
}

/**
 * Create initial snapshots for all Discord/WhatsApp channels that don't
 * have any snapshots yet. Call this once after importing new channels
 * so the progression chart shows data from day 1.
 */
async function createInitialSnapshots({ limit = 0 } = {}) {
  await ensureDb();
  const Canal = require('../models/Canal');
  const CanalScoreSnapshot = require('../models/CanalScoreSnapshot');

  // Find channels that don't have any snapshots yet
  const existingIds = await CanalScoreSnapshot.distinct('canalId');
  const query = {
    plataforma: { $in: ['whatsapp', 'discord'] },
    estado: { $in: ['activo', 'verificado'] },
    _id: { $nin: existingIds },
  };

  const findQuery = Canal.find(query).lean();
  if (limit > 0) findQuery.limit(limit);
  const canales = await findQuery;

  let created = 0;
  const errors = [];

  for (const canal of canales) {
    try {
      await scoreAndSnapshot(canal, null);
      created++;
    } catch (err) {
      errors.push(`${canal._id}: ${err.message}`);
    }

    if (created % 50 === 0 && created > 0) {
      console.log(`[MultiplatformIntel] Initial snapshots: ${created} created`);
    }
  }

  const remaining = limit > 0 ? Math.max(0, (await Canal.countDocuments(query)) - 0) : 0;
  console.log(`[MultiplatformIntel] Initial snapshots done: ${created} created, ${errors.length} errors`);
  return { created, errors, remaining };
}

/**
 * Full sync: refresh metrics for all WhatsApp + Discord channels.
 *
 * 1. Re-scrape sources for updated counts
 * 2. Match scraped data to existing Canal documents
 * 3. Update Canal.estadisticas.seguidores
 * 4. Score + snapshot each channel
 */
async function syncAllMultiplatformChannels() {
  await ensureDb();
  const Canal = require('../models/Canal');
  const start = Date.now();
  const errors = [];
  let processed = 0;
  let updated = 0;

  // ── Phase 1: Re-scrape for fresh counts ────────────────────────────
  console.log('[MultiplatformIntel] Phase 1: refreshing metrics from scrapers...');

  const [igruposWA, igruposDC, waChannelsFinder] = await Promise.all([
    fetchIgruposUpdates('whatsapp'),
    fetchIgruposUpdates('discord'),
    fetchWaChannelsFinderUpdates(),
  ]);

  console.log(`[MultiplatformIntel] Scraped: WA igrupos=${igruposWA.size}, WA finder=${waChannelsFinder.size}, DC igrupos=${igruposDC.size}`);

  // ── Phase 2: Load all WA/Discord channels ──────────────────────────
  const canales = await Canal.find({
    plataforma: { $in: ['whatsapp', 'discord'] },
    estado: { $in: ['activo', 'verificado'] },
  }).lean();

  console.log(`[MultiplatformIntel] Phase 2: scoring ${canales.length} channels`);

  // ── Phase 3: Match, update, score, snapshot ────────────────────────
  for (const canal of canales) {
    try {
      const name = (canal.nombreCanal || '').toLowerCase().trim();
      let newFollowers = null;

      if (canal.plataforma === 'whatsapp') {
        // Try matching by name against both sources
        newFollowers = waChannelsFinder.get(name) || igruposWA.get(name) || null;
        // Also try matching by slug from identificadorCanal
        if (!newFollowers) {
          const slug = (canal.identificadorCanal || '').replace(/^wa:/, '').toLowerCase();
          newFollowers = waChannelsFinder.get(slug) || null;
        }
      } else if (canal.plataforma === 'discord') {
        newFollowers = igruposDC.get(name) || null;
      }

      // If we got fresh data, use it. Otherwise keep existing count.
      const followers = newFollowers || canal.estadisticas?.seguidores || 0;

      await scoreAndSnapshot(canal, followers);
      processed++;

      if (newFollowers && newFollowers !== canal.estadisticas?.seguidores) {
        updated++;
      }
    } catch (err) {
      errors.push(`${canal._id} (${canal.nombreCanal}): ${err.message}`);
    }

    await sleep(RATE_LIMIT_MS);
  }

  const duration_ms = Date.now() - start;
  console.log(
    `[MultiplatformIntel] Done: ${processed} processed, ${updated} metrics updated, ${errors.length} errors, ${duration_ms}ms`,
  );

  return { processed, updated, errors, duration_ms };
}

module.exports = {
  syncAllMultiplatformChannels,
  createInitialSnapshots,
  scoreAndSnapshot,
  fetchIgruposUpdates,
  fetchWaChannelsFinderUpdates,
};
