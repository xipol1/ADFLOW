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

// Keyword rotation slice sizes. Each run queries a DIFFERENT slice of
// ALL_KEYWORDS, persisted via ScrapingRotation. Over ceil(N/slice) runs
// the full keyword space is covered, then the cycle repeats.
//
// MTProto is 60 because contacts.Search is prefix-based and yields
// diminishing returns past ~60 keywords per run. Lyzem is 30 because
// each query ships a full HTML fetch + 400ms validation per channel.
const MTPROTO_KEYWORDS_PER_RUN = parseInt(process.env.MTPROTO_KEYWORDS_PER_RUN, 10) || 60;
const LYZEM_KEYWORDS_PER_RUN = parseInt(process.env.LYZEM_KEYWORDS_PER_RUN, 10) || 30;

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
  const SeenChannel = require('../models/SeenChannel');
  const {
    getClient,
    disconnectClient,
    discoverByKeywords,
    discoverFromSocialGraph,
    getChannelMetrics,
    getRotatingKeywords,
    sleep,
    ALL_KEYWORDS,
    SEED_CHANNELS,
  } = require('../services/telegramIntelService');

  // Create job log
  const log = await JobLog.create({
    jobId,
    type: 'massive-seed',
    status: 'running',
    progress: { phase: 'keyword-discovery', current: 0, total: MTPROTO_KEYWORDS_PER_RUN },
  });

  const errors = [];
  const allUsernames = new Map(); // username -> source data
  let saved = 0;
  let filteredOut = 0;
  let duplicates = 0;
  let skippedBySeenCache = 0;

  try {
    await getClient(); // ensure connection

    // ── Phase 1: Keyword discovery (rotating slice of ALL_KEYWORDS) ──
    // The slice advances between runs via ScrapingRotation, so consecutive
    // runs explore DIFFERENT keywords and don't rediscover the same channels.
    const mtprotoKeywords = await getRotatingKeywords(
      'mtproto_keywords',
      MTPROTO_KEYWORDS_PER_RUN,
    );

    log.progress.phase = 'keyword-discovery';
    log.progress.total = mtprotoKeywords.length;
    await log.save();

    console.log(
      `[MassiveSeed] Phase 1: ${mtprotoKeywords.length}/${ALL_KEYWORDS.length} keywords (rotating slice) | sample: ${mtprotoKeywords.slice(0, 3).join(', ')}...`,
    );

    const kwResult = await discoverByKeywords(mtprotoKeywords);
    for (const ch of kwResult.results) {
      if (ch.username && !allUsernames.has(ch.username)) {
        allUsernames.set(ch.username, { ...ch, _source: 'keyword' });
      }
    }
    errors.push(...kwResult.errors.map((e) => `[KW] ${e}`));

    log.progress.current = mtprotoKeywords.length;
    log.progress.discovered = allUsernames.size;
    await log.save();

    console.log(`[MassiveSeed] Phase 1 done: ${allUsernames.size} unique channels`);

    // ── Phase 1.5: Lyzem.com search (complementary HTML index) ────────
    // Lyzem indexes public Telegram channels and returns matches that
    // MTProto contacts.Search (prefix-based) tends to miss. Yield per
    // query is modest (~8-15) but dedupes naturally against Phase 1.
    try {
      const { scrapeByKeywords } = require('../services/lyzemScraperService');
      // Rotating slice — own cursor, independent from MTProto's
      const lyzemKeywords = await getRotatingKeywords(
        'lyzem_keywords',
        LYZEM_KEYWORDS_PER_RUN,
      );

      log.progress.phase = 'lyzem-search';
      log.progress.total = lyzemKeywords.length;
      log.progress.current = 0;
      await log.save();

      console.log(
        `[MassiveSeed] Phase 1.5: ${lyzemKeywords.length}/${ALL_KEYWORDS.length} keywords (rotating slice, t.me validation enabled) | sample: ${lyzemKeywords.slice(0, 3).join(', ')}...`,
      );

      const lyzemResult = await scrapeByKeywords(lyzemKeywords, { validate: true });
      let newFromLyzem = 0;
      for (const ch of lyzemResult.results) {
        if (ch.username && !allUsernames.has(ch.username)) {
          allUsernames.set(ch.username, { ...ch, _source: 'lyzem' });
          newFromLyzem++;
        }
      }
      errors.push(...lyzemResult.errors.map((e) => `[Lyzem] ${e}`));

      log.progress.current = lyzemKeywords.length;
      log.progress.discovered = allUsernames.size;
      await log.save();

      const rawCount = lyzemResult.scrapeRaw || 0;
      const validated = lyzemResult.results.length;
      const rejected = rawCount - validated;
      const rejectSummary = lyzemResult.rejectCounts
        ? Object.entries(lyzemResult.rejectCounts)
            .map(([k, v]) => `${k}=${v}`)
            .join(' ')
        : '';
      console.log(
        `[MassiveSeed] Phase 1.5 done: raw=${rawCount} validated=${validated} rejected=${rejected} [${rejectSummary}] — +${newFromLyzem} new unique (${allUsernames.size} total)`,
      );
    } catch (err) {
      errors.push(`[Lyzem phase] ${err.message}`);
      console.warn(`[MassiveSeed] Lyzem phase failed: ${err.message}`);
    }

    // ── Phase 2: Social graph ─────────────────────────────────────────
    // Dynamic seeds: hardcoded SEED_CHANNELS + active canales already in DB.
    // The pool is deduped and shuffled so each run explores a different subset.
    const activeCanales = await Canal.find({
      plataforma: 'telegram',
      estado: { $in: ['activo', 'verificado'] },
    })
      .select('identificadorCanal')
      .lean();

    const dynamicSeeds = activeCanales
      .map((c) => (c.identificadorCanal || '').replace(/^@/, '').trim().toLowerCase())
      .filter(Boolean);

    const seedPool = Array.from(new Set([...SEED_CHANNELS, ...dynamicSeeds]));
    // Fisher-Yates shuffle so runs explore different slices of the graph
    for (let i = seedPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [seedPool[i], seedPool[j]] = [seedPool[j], seedPool[i]];
    }

    // Cap at 40 seeds per run to keep runtime bounded (~30 min upper bound)
    const seedsForRun = seedPool.slice(0, 40);

    log.progress.phase = 'social-graph';
    log.progress.total = seedsForRun.length;
    log.progress.current = 0;
    await log.save();

    console.log(
      `[MassiveSeed] Phase 2: ${seedsForRun.length} seeds (${SEED_CHANNELS.length} static + ${dynamicSeeds.length} dynamic, capped at 40)`,
    );

    // Process seeds in batches of 5 — discoverFromSocialGraph now honors maxSeeds
    for (let i = 0; i < seedsForRun.length; i += 5) {
      const batch = seedsForRun.slice(i, i + 5);
      const sgResult = await discoverFromSocialGraph(batch, {
        maxSeeds: batch.length, // process the full batch, not just 3
        maxResolvePerSeed: 8, // slightly higher than Vercel default (5)
      });
      for (const ch of sgResult.results) {
        if (ch.username && !allUsernames.has(ch.username)) {
          allUsernames.set(ch.username, { ...ch, _source: 'social_graph' });
        }
      }
      errors.push(...sgResult.errors.map((e) => `[SG] ${e}`));

      log.progress.current = Math.min(i + 5, seedsForRun.length);
      log.progress.discovered = allUsernames.size;
      await log.save();
    }

    console.log(`[MassiveSeed] Phase 2 done: ${allUsernames.size} total unique`);

    // ── Snapshot allUsernames to disk before Phase 3 ─────────────────
    // Phase 3 is network-intensive and prone to crashes. Persisting the
    // discovery set means a recovery script can resume enrichment without
    // re-running phases 1/1.5/2. See scripts/resume-phase3.js.
    try {
      const fs = require('fs');
      const path = require('path');
      const snapshotDir = path.join(__dirname, '..', 'logs');
      if (!fs.existsSync(snapshotDir)) fs.mkdirSync(snapshotDir, { recursive: true });
      const snapshotPath = path.join(snapshotDir, 'last-discovery-snapshot.json');
      const snapshot = {
        jobId,
        createdAt: new Date().toISOString(),
        totalChannels: allUsernames.size,
        channels: Array.from(allUsernames.entries()).map(([username, data]) => ({
          username,
          ...data,
        })),
      };
      fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
      console.log(`[MassiveSeed] Snapshot saved: ${snapshotPath} (${allUsernames.size} channels)`);
    } catch (err) {
      console.warn(`[MassiveSeed] Snapshot save failed: ${err.message}`);
    }

    // ── Phase 3: Enrich with full metrics + save ──────────────────────
    // Bulk-load the SeenChannel cache ONCE so we check membership in O(1)
    // instead of N per-username queries. These are channels we processed
    // in previous runs that didn't result in a save (filtered, errored,
    // etc.) and whose retry window hasn't expired yet.
    const seenDocs = await SeenChannel.find({
      retryAfter: { $gt: new Date() },
    })
      .select('username reason')
      .lean();
    const seenMap = new Map(seenDocs.map((d) => [d.username.toLowerCase(), d.reason]));
    console.log(
      `[MassiveSeed] Phase 3: SeenChannel cache loaded (${seenMap.size} usernames under retry lock)`,
    );

    const usernamesToEnrich = Array.from(allUsernames.keys());
    log.progress.phase = 'enriching-metrics';
    log.progress.current = 0;
    log.progress.total = usernamesToEnrich.length;
    await log.save();

    console.log(`[MassiveSeed] Phase 3: enriching ${usernamesToEnrich.length} channels`);

    // Helper to write to SeenChannel cache (fire-and-forget, ignore dup errors)
    const markAsSeen = async (username, reason, extra = {}) => {
      try {
        await SeenChannel.findOneAndUpdate(
          { username },
          {
            $set: {
              reason,
              source: extra.source || 'keyword',
              seenAt: new Date(),
              lastKnownSubs: extra.subs ?? null,
              lastError: (extra.error || '').slice(0, 500),
              retryAfter: SeenChannel.computeRetryAfter(reason),
            },
          },
          { upsert: true, new: true },
        );
      } catch (err) {
        // Ignore — cache write failure shouldn't break the run
      }
    };

    for (let i = 0; i < usernamesToEnrich.length; i++) {
      const username = usernamesToEnrich[i];
      const sourceData = allUsernames.get(username);

      try {
        // Fast path: SeenChannel cache hit (skip without any DB query)
        if (seenMap.has(username)) {
          skippedBySeenCache++;
          continue;
        }

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
        let metricsErr = null;
        try {
          metrics = await getChannelMetrics(username);
        } catch (err) {
          metricsErr = err;
          // Handle FloodWaitError
          if (err.message && err.message.includes('FLOOD_WAIT')) {
            const waitMatch = err.message.match(/(\d+)/);
            const waitSec = waitMatch ? parseInt(waitMatch[1]) : 30;
            console.warn(`[MassiveSeed] FloodWait ${waitSec}s for @${username}`);
            await sleep((waitSec + FLOOD_EXTRA_WAIT_MS / 1000) * 1000);
            // Retry once
            try {
              metrics = await getChannelMetrics(username);
              metricsErr = null;
            } catch (retryErr) {
              errors.push(`@${username}: FloodWait retry failed`);
              metricsErr = retryErr;
            }
          } else {
            errors.push(`@${username}: ${err.message}`);
          }
        }

        if (!metrics) {
          // Classify the error so SeenChannel picks the right retry horizon
          const msg = metricsErr?.message || '';
          let reason = 'error-transient';
          if (/USERNAME_INVALID|No user has/i.test(msg)) reason = 'username-invalid';
          else if (/FLOOD_WAIT|seconds is required/i.test(msg)) reason = 'floodwait';
          else if (/PRIVATE|RESTRICTED/i.test(msg)) reason = 'unscrapable';
          await markAsSeen(username, reason, {
            source: sourceData._source,
            error: msg,
          });
          await sleep(METRICS_DELAY_MS);
          continue;
        }

        // Filter by minimum subscribers
        const subs = metrics.participants_count || 0;
        if (subs < MIN_SUBSCRIBERS) {
          filteredOut++;
          await markAsSeen(username, 'filtered-low-subs', {
            source: sourceData._source,
            subs,
          });
          await sleep(METRICS_DELAY_MS);
          continue;
        }

        // Save to ChannelCandidates
        const sourceMap = {
          social_graph: 'social_graph',
          lyzem: 'lyzem',
          keyword: 'tgstat',
        };
        const candidateSource = sourceMap[sourceData._source] || 'tgstat';
        await ChannelCandidate.create({
          username,
          source: candidateSource,
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
      skipped_by_seen_cache: skippedBySeenCache,
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

    console.log(
      `[MassiveSeed] Completed: ${saved} saved, ${duplicates} dupes, ${filteredOut} filtered, ${skippedBySeenCache} skipped-by-cache, ${errors.length} errors`,
    );
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
