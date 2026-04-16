/**
 * Post-crash audit: what did the massive-seed job save before it died?
 */
require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const ChannelCandidate = require('../models/ChannelCandidate');
    const JobLog = require('../models/JobLog');

    // Job metadata
    const job = await JobLog.findOne({ jobId: 'cli-1776205304281' }).lean();
    console.log('=== JOB ===');
    console.log('status:', job?.status);
    console.log('error:', job?.error);
    console.log('progress:', JSON.stringify(job?.progress, null, 2));
    console.log('result:', JSON.stringify(job?.result, null, 2));

    // Candidates created during this run (after 2026-04-15 00:21)
    const runStart = new Date('2026-04-15T00:21:00Z');
    const savedInRun = await ChannelCandidate.countDocuments({
      scraped_at: { $gte: runStart },
    });
    console.log('\n=== SAVED IN THIS RUN ===');
    console.log('Total new candidates since run start:', savedInRun);

    const bySource = await ChannelCandidate.aggregate([
      { $match: { scraped_at: { $gte: runStart } } },
      { $group: { _id: '$source', count: { $sum: 1 } } },
    ]);
    console.log('By source:');
    bySource.forEach((r) => console.log('  ' + r._id + ': ' + r.count));

    // Total counts now
    const totalAll = await ChannelCandidate.countDocuments();
    const totalPending = await ChannelCandidate.countDocuments({ status: 'pending_review' });
    console.log('\n=== TOTALS NOW ===');
    console.log('All candidates:', totalAll);
    console.log('Pending review:', totalPending);

    const bySourceAll = await ChannelCandidate.aggregate([
      { $group: { _id: { source: '$source', status: '$status' }, count: { $sum: 1 } } },
      { $sort: { '_id.source': 1, '_id.status': 1 } },
    ]);
    console.log('\nAll by source+status:');
    bySourceAll.forEach((r) => console.log('  ' + r._id.source + '/' + r._id.status + ': ' + r.count));

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
