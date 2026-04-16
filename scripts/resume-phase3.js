/**
 * Resume massive-seed Phase 3 from a snapshot file.
 *
 * Usage: node scripts/resume-phase3.js [snapshot-path]
 * Default snapshot path: logs/last-discovery-snapshot.json
 *
 * Loads the discovered channel set, skips any already in the DB, and
 * enriches the rest via MTProto. Duplicate handling and FloodWait retry
 * logic mirror the main job.
 */
require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const METRICS_DELAY_MS = 1500;
const MIN_SUBSCRIBERS = 200;
const FLOOD_EXTRA_WAIT_MS = 3000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

(async () => {
  const snapshotPath =
    process.argv[2] || path.join(__dirname, '..', 'logs', 'last-discovery-snapshot.json');

  if (!fs.existsSync(snapshotPath)) {
    console.error('Snapshot not found:', snapshotPath);
    process.exit(1);
  }

  const start = Date.now();
  console.log('[resume] Loading snapshot:', snapshotPath);
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  console.log(
    `[resume] Snapshot: jobId=${snapshot.jobId}, totalChannels=${snapshot.totalChannels}`,
  );

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[resume] Mongo connected');

    const ChannelCandidate = require('../models/ChannelCandidate');
    const Canal = require('../models/Canal');
    const { getChannelMetrics, disconnectClient } = require('../services/telegramIntelService');

    // Load existing candidate usernames so we can skip them in O(1)
    const existingCandidates = await ChannelCandidate.find({})
      .select('username')
      .lean();
    const existingSet = new Set(existingCandidates.map((c) => c.username.toLowerCase()));
    const existingCanales = await Canal.find({ plataforma: 'telegram' })
      .select('identificadorCanal')
      .lean();
    existingCanales.forEach((c) => {
      if (c.identificadorCanal) {
        existingSet.add(c.identificadorCanal.replace(/^@/, '').toLowerCase());
      }
    });
    console.log(
      `[resume] Skip set loaded: ${existingSet.size} already-known channels`,
    );

    // Filter snapshot to channels NOT already in DB
    const toProcess = snapshot.channels.filter(
      (ch) => !existingSet.has(ch.username.toLowerCase()),
    );
    console.log(
      `[resume] To process: ${toProcess.length} / ${snapshot.channels.length} (skipped ${snapshot.channels.length - toProcess.length} already-known)`,
    );

    let saved = 0;
    let duplicates = 0;
    let filteredOut = 0;
    const errors = [];

    for (let i = 0; i < toProcess.length; i++) {
      const ch = toProcess[i];
      const username = ch.username;

      try {
        let metrics = null;
        try {
          metrics = await getChannelMetrics(username);
        } catch (err) {
          if (err.message && err.message.includes('FLOOD_WAIT')) {
            const waitMatch = err.message.match(/(\d+)/);
            const waitSec = waitMatch ? parseInt(waitMatch[1]) : 30;
            console.warn(`[resume] FloodWait ${waitSec}s for @${username}`);
            await sleep((waitSec + FLOOD_EXTRA_WAIT_MS / 1000) * 1000);
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

        const subs = metrics.participants_count || 0;
        if (subs < MIN_SUBSCRIBERS) {
          filteredOut++;
          await sleep(METRICS_DELAY_MS);
          continue;
        }

        const sourceMap = {
          social_graph: 'social_graph',
          lyzem: 'lyzem',
          keyword: 'tgstat',
        };
        const candidateSource = sourceMap[ch._source] || 'tgstat';

        await ChannelCandidate.create({
          username,
          source: candidateSource,
          status: 'pending_review',
          scraped_at: new Date(),
          raw_metrics: {
            title: ch.title || metrics.username || '',
            description: metrics.description || '',
            subscribers: subs,
            avg_views: metrics.avg_views_last_20_posts || null,
            engagement_rate: metrics.engagement_rate || null,
            post_frequency: metrics.post_frequency_per_week || null,
            verified: metrics.verified || false,
            discoveredVia: ch._source,
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

      if (i % 10 === 0) {
        console.log(
          `[resume] ${i}/${toProcess.length} processed | saved=${saved} filtered=${filteredOut} errors=${errors.length}`,
        );
      }

      await sleep(METRICS_DELAY_MS);
    }

    console.log('\n[resume] ==== DONE ====');
    console.log('Processed:', toProcess.length);
    console.log('Saved:', saved);
    console.log('Duplicates:', duplicates);
    console.log('Filtered (< MIN_SUBSCRIBERS):', filteredOut);
    console.log('Errors:', errors.length);
    if (errors.length > 0) {
      console.log('First 10 errors:');
      errors.slice(0, 10).forEach((e) => console.log('  -', e));
    }

    await disconnectClient();
  } catch (err) {
    console.error('[resume] FATAL:', err.message);
    console.error(err.stack);
  } finally {
    await mongoose.disconnect();
    console.log(`[resume] Total runtime: ${((Date.now() - start) / 1000).toFixed(1)}s`);
    process.exit(0);
  }
})();
