/**
 * Massive Seed Job — one-shot bulk channel discovery.
 *
 * Runs in background (setImmediate) since it takes 45-90 min.
 * Progress is tracked in the JobLog collection.
 *
 * Process:
 * 1. Keyword discovery (80+ keywords, 2s between each)
 * 2. Social graph discovery (15 seed channels)
 * 3. For each unique username: getChannelMetrics() for full data
 * 4. Filter min 200 subs, upsert into ChannelCandidates
 */

const { v4: uuidv4 } = require('uuid');

const MIN_SUBSCRIBERS = 200;
const KEYWORD_DELAY_MS = 2000;
const METRICS_DELAY_MS = 1500;
const FLOOD_EXTRA_WAIT_MS = 5000;

/**
 * Start the massive seed job in background.
 * Returns immediately with jobId for status polling.
 */
function startMassiveSeedJob() {
  const jobId = `massive-seed-${Date.now()}-${uuidv4().slice(0, 8)}`;

  // Fire-and-forget — runs in background
  setImmediate(() => {
    runMassiveSeed(jobId).catch((err) => {
      console.error(`[MassiveSeed] Fatal error in job ${jobId}:`, err.message);
    });
  });

  return jobId;
}

/**
 * Main job execution (runs in background).
 */
async function runMassiveSeed(jobId) {
  const JobLog = require('../models/JobLog');
  const ChannelCandidate = require('../models/ChannelCandidate');
  const Canal = require('../models/Canal');
  const {
    getClient,
    disconnectClient,
    discoverByKeywords,
    discoverFromSocialGraph,
    getChannelMetrics,
    sleep,
    ALL_KEYWORDS,
    SEED_CHANNELS,
  } = require('../services/telegramIntelService');

  // Create job log
  const log = await JobLog.create({
    jobId,
    type: 'massive-seed',
    status: 'running',
    progress: { phase: 'keyword-discovery', current: 0, total: ALL_KEYWORDS.length },
  });

  const errors = [];
  const allUsernames = new Map(); // username -> source data
  let saved = 0;
  let filteredOut = 0;
  let duplicates = 0;

  try {
    await getClient(); // ensure connection

    // ── Phase 1: Keyword discovery ────────────────────────────────────
    log.progress.phase = 'keyword-discovery';
    log.progress.total = ALL_KEYWORDS.length;
    await log.save();

    console.log(`[MassiveSeed] Phase 1: ${ALL_KEYWORDS.length} keywords`);

    const kwResult = await discoverByKeywords(ALL_KEYWORDS);
    for (const ch of kwResult.results) {
      if (ch.username && !allUsernames.has(ch.username)) {
        allUsernames.set(ch.username, { ...ch, _source: 'keyword' });
      }
    }
    errors.push(...kwResult.errors.map((e) => `[KW] ${e}`));

    log.progress.current = ALL_KEYWORDS.length;
    log.progress.discovered = allUsernames.size;
    await log.save();

    console.log(`[MassiveSeed] Phase 1 done: ${allUsernames.size} unique channels`);

    // ── Phase 2: Social graph ─────────────────────────────────────────
    log.progress.phase = 'social-graph';
    log.progress.total = SEED_CHANNELS.length;
    log.progress.current = 0;
    await log.save();

    console.log(`[MassiveSeed] Phase 2: ${SEED_CHANNELS.length} seed channels`);

    // Process seeds in batches of 5 to avoid running too long
    for (let i = 0; i < SEED_CHANNELS.length; i += 5) {
      const batch = SEED_CHANNELS.slice(i, i + 5);
      const sgResult = await discoverFromSocialGraph(batch);
      for (const ch of sgResult.results) {
        if (ch.username && !allUsernames.has(ch.username)) {
          allUsernames.set(ch.username, { ...ch, _source: 'social_graph' });
        }
      }
      errors.push(...sgResult.errors.map((e) => `[SG] ${e}`));

      log.progress.current = Math.min(i + 5, SEED_CHANNELS.length);
      log.progress.discovered = allUsernames.size;
      await log.save();
    }

    console.log(`[MassiveSeed] Phase 2 done: ${allUsernames.size} total unique`);

    // ── Phase 3: Enrich with full metrics + save ──────────────────────
    const usernamesToEnrich = Array.from(allUsernames.keys());
    log.progress.phase = 'enriching-metrics';
    log.progress.current = 0;
    log.progress.total = usernamesToEnrich.length;
    await log.save();

    console.log(`[MassiveSeed] Phase 3: enriching ${usernamesToEnrich.length} channels`);

    for (let i = 0; i < usernamesToEnrich.length; i++) {
      const username = usernamesToEnrich[i];
      const sourceData = allUsernames.get(username);

      try {
        // Check if already exists in Canal or ChannelCandidates
        const [existingCanal, existingCandidate] = await Promise.all([
          Canal.findOne({
            plataforma: 'telegram',
            identificadorCanal: { $regex: new RegExp(`^@?${username}$`, 'i') },
          }).lean(),
          ChannelCandidate.findOne({ username }).lean(),
        ]);

        if (existingCanal || existingCandidate) {
          duplicates++;
          continue;
        }

        // Get full metrics
        let metrics = null;
        try {
          metrics = await getChannelMetrics(username);
        } catch (err) {
          // Handle FloodWaitError
          if (err.message && err.message.includes('FLOOD_WAIT')) {
            const waitMatch = err.message.match(/(\d+)/);
            const waitSec = waitMatch ? parseInt(waitMatch[1]) : 30;
            console.warn(`[MassiveSeed] FloodWait ${waitSec}s for @${username}`);
            await sleep((waitSec + FLOOD_EXTRA_WAIT_MS / 1000) * 1000);
            // Retry once
            try {
              metrics = await getChannelMetrics(username);
            } catch {
              errors.push(`@${username}: FloodWait retry failed`);
            }
          } else {
            errors.push(`@${username}: ${err.message}`);
          }
        }

        if (!metrics) {
          await sleep(METRICS_DELAY_MS);
          continue;
        }

        // Filter by minimum subscribers
        const subs = metrics.participants_count || 0;
        if (subs < MIN_SUBSCRIBERS) {
          filteredOut++;
          await sleep(METRICS_DELAY_MS);
          continue;
        }

        // Save to ChannelCandidates
        await ChannelCandidate.create({
          username,
          source: sourceData._source === 'social_graph' ? 'social_graph' : 'tgstat',
          status: 'pending_review',
          scraped_at: new Date(),
          raw_metrics: {
            title: sourceData.title || metrics.username || '',
            description: metrics.description || '',
            subscribers: subs,
            avg_views: metrics.avg_views_last_20_posts || null,
            engagement_rate: metrics.engagement_rate || null,
            post_frequency: metrics.post_frequency_per_week || null,
            verified: metrics.verified || false,
            discoveredVia: sourceData._source,
          },
        });

        saved++;
      } catch (err) {
        if (err.code === 11000) {
          duplicates++;
        } else {
          errors.push(`@${username}: ${err.message}`);
        }
      }

      // Update progress every 10 channels
      if (i % 10 === 0) {
        log.progress.current = i;
        log.progress.saved = saved;
        await log.save();
      }

      await sleep(METRICS_DELAY_MS);
    }

    // ── Done ──────────────────────────────────────────────────────────
    const result = {
      total_discovered: allUsernames.size,
      saved,
      duplicates,
      filtered_out: filteredOut,
      errors: errors.slice(0, 100), // cap errors in response
      error_count: errors.length,
      duration_ms: Date.now() - log.startedAt.getTime(),
    };

    log.status = 'completed';
    log.result = result;
    log.completedAt = new Date();
    log.progress.phase = 'done';
    log.progress.current = usernamesToEnrich.length;
    log.progress.saved = saved;
    await log.save();

    console.log(`[MassiveSeed] Completed: ${saved} saved, ${duplicates} dupes, ${filteredOut} filtered, ${errors.length} errors`);
  } catch (err) {
    console.error(`[MassiveSeed] Fatal: ${err.message}`);
    log.status = 'failed';
    log.error = err.message;
    log.completedAt = new Date();
    await log.save().catch(() => {});
  } finally {
    await disconnectClient();
  }
}

module.exports = { startMassiveSeedJob, runMassiveSeed };
