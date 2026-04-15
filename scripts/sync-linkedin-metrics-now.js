/**
 * Ad-hoc runner for LinkedIn metrics sync.
 *
 * Runs linkedinSyncService.syncAllMappedLinkedInCanals() inline so the full
 * pipeline (token refresh → creator metrics → org metrics → persist + snapshot)
 * can be watched via the CLI. Equivalent to scripts/run-massive-seed-now.js.
 *
 * Usage:
 *   node scripts/sync-linkedin-metrics-now.js
 *
 * Env overrides:
 *   SYNC_CAP=50  → only process the first N LinkedIn canals (useful for
 *                  rate-limit safety on the first run)
 */

require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const mongoose = require('mongoose');

(async () => {
  const start = Date.now();
  try {
    console.log('[linkedin-sync] Connecting to Mongo...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[linkedin-sync] Connected. Starting LinkedIn sync.\n');

    const { syncAllMappedLinkedInCanals } = require('../services/linkedinSyncService');
    const Canal = require('../models/Canal');

    // Quick pre-flight: how many linkedin canals do we have?
    const totalLi = await Canal.countDocuments({
      plataforma: 'linkedin',
      estado: { $ne: 'eliminado' },
      'credenciales.tokenType': 'oauth_linkedin',
    });
    console.log(`[linkedin-sync] Total LinkedIn canals in DB: ${totalLi}`);

    if (totalLi === 0) {
      console.log('[linkedin-sync] No LinkedIn canals to sync. Exiting.');
    } else {
      const options = {};
      if (process.env.SYNC_CAP) options.cap = Number(process.env.SYNC_CAP);

      console.log('[linkedin-sync] Options:', JSON.stringify(options));
      console.log('');

      const result = await syncAllMappedLinkedInCanals(options);

      console.log('\n[linkedin-sync] ==== FINAL RESULT ====');
      console.log(JSON.stringify(result, null, 2));

      // Show sample snapshot written
      const CanalScoreSnapshot = require('../models/CanalScoreSnapshot');
      const latestSnapshots = await CanalScoreSnapshot.find({
        plataforma: 'linkedin',
        fecha: { $gte: new Date(start) },
      })
        .sort({ fecha: -1 })
        .limit(5)
        .lean();

      if (latestSnapshots.length > 0) {
        console.log('\n[linkedin-sync] Latest snapshots written this run:');
        latestSnapshots.forEach((s, i) => {
          const intel = s.linkedinIntel || {};
          console.log(`  [${i + 1}] canal ${s.canalId}`);
          console.log(`      type: ${intel.type || '(n/a)'}`);
          if (intel.type === 'creator') {
            console.log(
              `      posts: ${intel.postCount} | likes: ${intel.totalLikes} | comments: ${intel.totalComments}`,
            );
          } else if (intel.type === 'organization') {
            console.log(
              `      followers: ${intel.followerCount} | impressions: ${intel.impressions} | engagementRate: ${intel.engagementRate}`,
            );
          }
          console.log(`      scopeMissing: ${intel.scopeMissing}`);
        });
      }
    }
  } catch (err) {
    console.error('\n[linkedin-sync] FATAL:', err.message);
    console.error(err.stack);
  } finally {
    await mongoose.disconnect();
    console.log(
      '\n[linkedin-sync] Done. Total runtime:',
      ((Date.now() - start) / 1000).toFixed(1),
      's',
    );
    process.exit(0);
  }
})();
