/**
 * Ad-hoc runner for massive-seed. Runs the job INLINE (blocks until done)
 * so it can be launched from CLI and watched via logs.
 *
 * Usage: node scripts/run-massive-seed-now.js
 */
require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const mongoose = require('mongoose');

(async () => {
  const start = Date.now();
  try {
    console.log('[runner] Connecting to Mongo...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[runner] Connected. Starting massive-seed inline.');

    const { runMassiveSeed } = require('../jobs/massiveSeedJob');
    const jobId = `cli-${Date.now()}`;
    console.log('[runner] jobId =', jobId);

    await runMassiveSeed(jobId);

    const JobLog = require('../models/JobLog');
    const log = await JobLog.findOne({ jobId }).lean();
    console.log('\n[runner] ==== FINAL JOBLOG ====');
    console.log(JSON.stringify(log?.result || {}, null, 2));
    console.log('[runner] status =', log?.status);
    console.log('[runner] error =', log?.error);

    const ChannelCandidate = require('../models/ChannelCandidate');
    const bySource = await ChannelCandidate.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } },
    ]);
    console.log('\n[runner] Candidates by source NOW:');
    bySource.forEach((r) => console.log('  ' + r._id + ': ' + r.count));

    const fresh = await ChannelCandidate.countDocuments({
      scraped_at: { $gte: new Date(Date.now() - 2 * 3600 * 1000) },
    });
    console.log('[runner] Added in last 2h:', fresh);
  } catch (err) {
    console.error('[runner] FATAL:', err.message);
    console.error(err.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n[runner] Done. Total runtime:', ((Date.now() - start) / 1000).toFixed(1), 's');
    process.exit(0);
  }
})();
