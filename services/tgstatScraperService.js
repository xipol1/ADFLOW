/**
 * Channel Discovery Service — multi-source channel discovery orchestrator.
 *
 * Combines 3 free sources to discover Spanish-language Telegram channels:
 *   1. MTProto contacts.Search (keyword discovery)
 *   2. MTProto social graph (forwards + mentions from known channels)
 *   3. Telemetr.io HTML scraping (category listings)
 *
 * Replaces the original TGStat API dependency (which required paid plan).
 * Maintains the same output interface: { discovered, duplicates, saved, errors }
 */

const MIN_SUBSCRIBERS = 500;

/**
 * Main orchestrator: discover channels from all 3 sources,
 * deduplicate, filter, and save as ChannelCandidates.
 *
 * @param {object} options
 * @param {boolean} options.skipMtproto — skip MTProto sources (for testing)
 * @param {boolean} options.skipTelemetr — skip Telemetr source
 * @returns {{ discovered, duplicates, saved, errors[], sources }}
 */
async function batchDiscoverChannels(options = {}) {
  const ChannelCandidate = require('../models/ChannelCandidate');
  const Canal = require('../models/Canal');

  const errors = [];
  const allCandidates = new Map(); // username -> { ...data, source }
  const sourceCounts = { mtproto: 0, social_graph: 0, telemetr: 0 };

  // ── Source 1: MTProto keyword search ──────────────────────────────────
  if (!options.skipMtproto) {
    try {
      const { discoverByKeywords } = require('./telegramIntelService');
      const kwResult = await discoverByKeywords();

      for (const ch of kwResult.results) {
        if (!ch.username) continue;
        if (!allCandidates.has(ch.username)) {
          allCandidates.set(ch.username, { ...ch, _source: 'mtproto' });
          sourceCounts.mtproto++;
        }
      }

      if (kwResult.errors.length > 0) {
        errors.push(...kwResult.errors.map((e) => `[MTProto] ${e}`));
      }
    } catch (err) {
      errors.push(`[MTProto keywords] ${err.message}`);
    }
  }

  // ── Source 2: Social graph from existing channels ─────────────────────
  if (!options.skipMtproto) {
    try {
      const { discoverFromSocialGraph, disconnectClient } = require('./telegramIntelService');

      // Get seed channels: approved Telegram channels in our DB
      const seedCanals = await Canal.find({
        plataforma: 'telegram',
        estado: { $in: ['activo', 'verificado'] },
      })
        .select('identificadorCanal')
        .lean();

      const seedUsernames = seedCanals
        .map((c) => c.identificadorCanal)
        .filter(Boolean);

      if (seedUsernames.length > 0) {
        const sgResult = await discoverFromSocialGraph(seedUsernames);

        for (const ch of sgResult.results) {
          if (!ch.username) continue;
          if (!allCandidates.has(ch.username)) {
            allCandidates.set(ch.username, { ...ch, _source: 'social_graph' });
            sourceCounts.social_graph++;
          }
        }

        if (sgResult.errors.length > 0) {
          errors.push(...sgResult.errors.map((e) => `[SocialGraph] ${e}`));
        }
      }

      // Disconnect MTProto client after both MTProto sources are done
      await disconnectClient();
    } catch (err) {
      errors.push(`[SocialGraph] ${err.message}`);
    }
  }

  // ── Source 3: Telemetr.io scraping ─────────────────────────────────────
  if (!options.skipTelemetr) {
    try {
      const { scrapeAllCategories } = require('./telemetrScraperService');
      const telResult = await scrapeAllCategories();

      for (const ch of telResult.results) {
        if (!ch.username) continue;
        if (!allCandidates.has(ch.username)) {
          allCandidates.set(ch.username, { ...ch, _source: 'telemetr' });
          sourceCounts.telemetr++;
        }
      }

      if (telResult.errors.length > 0) {
        errors.push(...telResult.errors.map((e) => `[Telemetr] ${e}`));
      }
    } catch (err) {
      errors.push(`[Telemetr] ${err.message}`);
    }
  }

  // ── Filter: min subscribers + public username ─────────────────────────
  const filtered = [];
  for (const [, candidate] of allCandidates) {
    if ((candidate.subscribers || 0) >= MIN_SUBSCRIBERS) {
      filtered.push(candidate);
    }
  }

  const discovered = allCandidates.size;
  const duplicates = discovered - filtered.length;

  // ── Save to ChannelCandidates ─────────────────────────────────────────
  let saved = 0;
  for (const candidate of filtered) {
    try {
      // Skip if already a registered Canal
      const existingCanal = await Canal.findOne({
        plataforma: 'telegram',
        identificadorCanal: { $regex: new RegExp(`^@?${candidate.username}$`, 'i') },
      }).lean();

      if (existingCanal) continue;

      // Map _source to ChannelCandidate.source enum
      const sourceMap = { mtproto: 'tgstat', social_graph: 'social_graph', telemetr: 'telemetr' };
      const source = sourceMap[candidate._source] || 'manual';

      await ChannelCandidate.findOneAndUpdate(
        { username: candidate.username },
        {
          $setOnInsert: {
            username: candidate.username,
            source,
            status: 'pending_review',
            scraped_at: new Date(),
          },
          $set: {
            raw_metrics: {
              title: candidate.title || '',
              description: candidate.description || '',
              subscribers: candidate.subscribers || 0,
              category: candidate.category || '',
              discoveredVia: candidate._source,
            },
          },
        },
        { upsert: true, new: true },
      );

      saved++;
    } catch (err) {
      if (err.code === 11000) continue; // duplicate key — fine
      errors.push(`Save ${candidate.username}: ${err.message}`);
    }
  }

  return {
    discovered,
    duplicates,
    saved,
    errors,
    sources: sourceCounts,
  };
}

// ── Legacy alias — keeps backward compat with existing callers ──────────
const batchDiscoverFromTGStat = batchDiscoverChannels;

const DEFAULT_CATEGORIES = [
  'economics', 'marketing', 'technologies', 'crypto',
  'health', 'education', 'business', 'entertainment',
];

module.exports = {
  batchDiscoverChannels,
  batchDiscoverFromTGStat,
  DEFAULT_CATEGORIES,
};
