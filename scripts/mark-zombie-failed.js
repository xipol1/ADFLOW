/**
 * Mark the stuck massive-seed job as failed so the next run isn't confused.
 */
require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const JobLog = require('../models/JobLog');
    const r = await JobLog.updateOne(
      { jobId: 'cli-1776205304281' },
      {
        $set: {
          status: 'failed',
          error: 'EHOSTUNREACH/ENOTFOUND: network dropped during Phase 3 enrichment',
          completedAt: new Date(),
        },
      },
    );
    console.log('Updated:', r.modifiedCount);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
