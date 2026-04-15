/**
 * Remove all auto-discovered newsletter Canals and ChannelCandidates.
 *
 * Safety: only deletes documents with plataforma='newsletter' AND claimed=false.
 * Does NOT touch newsletters that a creator has reclaimed.
 *
 * Usage: node scripts/clean-newsletters.js
 */

require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('[clean-newsletters] Connecting to Mongo...');
    await mongoose.connect(process.env.MONGODB_URI);

    const Canal = require('../models/Canal');
    const ChannelCandidate = require('../models/ChannelCandidate');

    // Only delete unclaimed auto-discovered newsletters
    const canalFilter = { plataforma: 'newsletter', claimed: false };
    const candidateFilter = { plataforma: 'newsletter' };

    const [canalCount, candidateCount] = await Promise.all([
      Canal.countDocuments(canalFilter),
      ChannelCandidate.countDocuments(candidateFilter),
    ]);

    console.log(`[clean-newsletters] About to delete:`);
    console.log(`  - Canal (newsletter, unclaimed): ${canalCount}`);
    console.log(`  - ChannelCandidate (newsletter): ${candidateCount}`);

    const [canalRes, candidateRes] = await Promise.all([
      Canal.deleteMany(canalFilter),
      ChannelCandidate.deleteMany(candidateFilter),
    ]);

    console.log(`[clean-newsletters] Deleted:`);
    console.log(`  - Canal: ${canalRes.deletedCount}`);
    console.log(`  - ChannelCandidate: ${candidateRes.deletedCount}`);
  } catch (err) {
    console.error('[clean-newsletters] ERROR:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
