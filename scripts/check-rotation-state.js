/**
 * Report the current state of the keyword rotation cursors and the
 * SeenChannel cache. Useful for pre/post-run audits.
 */
require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const ScrapingRotation = require('../models/ScrapingRotation');
    const SeenChannel = require('../models/SeenChannel');
    const { ALL_KEYWORDS } = require('../services/telegramIntelService');

    console.log('=== ROTATION CURSORS ===');
    const states = await ScrapingRotation.find().sort({ source: 1 }).lean();
    if (states.length === 0) {
      console.log('(none — first run will start from offset 0)');
    } else {
      for (const s of states) {
        const pct = Math.round((s.offset / (s.totalKeywords || ALL_KEYWORDS.length)) * 100);
        const last =
          s.lastRunAt
            ? `${Math.round((Date.now() - new Date(s.lastRunAt).getTime()) / 3600000)}h ago`
            : 'never';
        console.log(
          `  ${s.source.padEnd(18)} offset=${s.offset}/${s.totalKeywords} (${pct}%) | last run: ${last}`,
        );
        if (s.lastSlice && s.lastSlice.length > 0) {
          console.log(
            `    last slice sample: ${s.lastSlice.slice(0, 3).join(', ')}${s.lastSlice.length > 3 ? '...' : ''}`,
          );
        }
      }
    }

    console.log(`\nCurrent ALL_KEYWORDS total: ${ALL_KEYWORDS.length}`);

    console.log('\n=== SEENCHANNEL CACHE ===');
    const totalSeen = await SeenChannel.countDocuments();
    const active = await SeenChannel.countDocuments({
      retryAfter: { $gt: new Date() },
    });
    const expired = totalSeen - active;
    console.log(`Total docs:  ${totalSeen}`);
    console.log(`Active (under retry lock): ${active}`);
    console.log(`Expired (pending TTL sweep): ${expired}`);

    const byReason = await SeenChannel.aggregate([
      { $match: { retryAfter: { $gt: new Date() } } },
      { $group: { _id: '$reason', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    if (byReason.length > 0) {
      console.log('\nActive by reason:');
      for (const r of byReason) {
        console.log(`  ${r._id.padEnd(20)} ${r.count}`);
      }
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
