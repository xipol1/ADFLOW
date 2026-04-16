require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const JobLog = require('../models/JobLog');
    const Canal = require('../models/Canal');

    // Last 5 massive-seed jobs
    const lastJobs = await JobLog.find({ type: 'massive-seed' })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    console.log('\n=== LAST 5 MASSIVE-SEED JOBS ===');
    for (const j of lastJobs) {
      const d = j.completedAt || j.createdAt;
      console.log(
        `[${d?.toISOString()}] status=${j.status} | phase=${j.progress?.phase} | saved=${j.result?.saved || 0} | discovered=${j.result?.total_discovered || 0} | dupes=${j.result?.duplicates || 0}`,
      );
    }

    // Check Canal distribution by creation date
    console.log('\n=== CANALES CREATED BY WEEK ===');
    const canalAgg = await Canal.aggregate([
      { $match: { plataforma: 'telegram' } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-W%V', date: '$fechaRegistro' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 8 },
    ]);
    canalAgg.forEach((row) => console.log(`  ${row._id}: ${row.count} canales`));

    // Count candidates pending_review (these would be fresh, unprocessed)
    const ChannelCandidate = require('../models/ChannelCandidate');
    const pending = await ChannelCandidate.countDocuments({ status: 'pending_review' });
    console.log('\nChannelCandidates pending review:', pending);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
