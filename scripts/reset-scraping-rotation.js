/**
 * Reset the scraping rotation cursors back to offset=0 for a fresh cycle.
 *
 * Usage:
 *   node scripts/reset-scraping-rotation.js                 # reset both sources
 *   node scripts/reset-scraping-rotation.js mtproto         # reset only mtproto
 *   node scripts/reset-scraping-rotation.js lyzem           # reset only lyzem
 *   node scripts/reset-scraping-rotation.js --clear-seen    # also empty SeenChannel cache
 *
 * Use this when:
 *   - You want to force re-processing of every keyword immediately
 *   - The keyword pool has changed significantly and you want fresh coverage
 *   - You suspect the cursor has drifted and want a clean start
 */
require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const mongoose = require('mongoose');

(async () => {
  try {
    const args = process.argv.slice(2);
    const clearSeen = args.includes('--clear-seen');
    const positional = args.filter((a) => !a.startsWith('--'));

    const sourceMap = {
      mtproto: 'mtproto_keywords',
      lyzem: 'lyzem_keywords',
    };

    let sources;
    if (positional.length === 0) {
      sources = ['mtproto_keywords', 'lyzem_keywords'];
    } else {
      sources = positional.map((a) => sourceMap[a] || a);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    const ScrapingRotation = require('../models/ScrapingRotation');
    const SeenChannel = require('../models/SeenChannel');

    console.log('Resetting rotation for:', sources.join(', '));
    for (const source of sources) {
      const before = await ScrapingRotation.findOne({ source }).lean();
      const r = await ScrapingRotation.updateOne(
        { source },
        { $set: { offset: 0, lastRunAt: null, lastSlice: [] } },
        { upsert: true },
      );
      console.log(
        `  ${source}: was offset=${before?.offset ?? 'none'} -> reset to 0 (modified=${r.modifiedCount}, upserted=${r.upsertedCount})`,
      );
    }

    if (clearSeen) {
      const r = await SeenChannel.deleteMany({});
      console.log(`\nCleared SeenChannel cache: ${r.deletedCount} docs removed`);
    } else {
      const count = await SeenChannel.countDocuments();
      console.log(`\nSeenChannel cache NOT touched (${count} docs). Pass --clear-seen to empty it.`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
