/**
 * Smoke test: call getRotatingKeywords 4 times in a row and verify that
 * consecutive calls return DIFFERENT slices (rotation is working and
 * persisted to DB). Also tests that mtproto_keywords and lyzem_keywords
 * have independent cursors.
 */
require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const ScrapingRotation = require('../models/ScrapingRotation');
    const { getRotatingKeywords, ALL_KEYWORDS } = require('../services/telegramIntelService');

    // Clean slate for both sources so the test is reproducible
    await ScrapingRotation.deleteMany({
      source: { $in: ['mtproto_keywords', 'lyzem_keywords'] },
    });
    console.log('Starting from a fresh rotation state\n');

    console.log('=== MTProto source (slice=60) ===');
    const mt1 = await getRotatingKeywords('mtproto_keywords', 60);
    console.log(`Call 1: ${mt1.length} keywords, first=${mt1[0]}, last=${mt1[mt1.length - 1]}`);
    const mt2 = await getRotatingKeywords('mtproto_keywords', 60);
    console.log(`Call 2: ${mt2.length} keywords, first=${mt2[0]}, last=${mt2[mt2.length - 1]}`);
    const mt3 = await getRotatingKeywords('mtproto_keywords', 60);
    console.log(`Call 3: ${mt3.length} keywords, first=${mt3[0]}, last=${mt3[mt3.length - 1]}`);
    const mt4 = await getRotatingKeywords('mtproto_keywords', 60);
    console.log(`Call 4: ${mt4.length} keywords, first=${mt4[0]}, last=${mt4[mt4.length - 1]}`);

    const mt1Set = new Set(mt1);
    const mt2Set = new Set(mt2);
    const overlapMT12 = mt1.filter((k) => mt2Set.has(k)).length;
    console.log(`Overlap call1 vs call2: ${overlapMT12}/60 keywords shared`);

    console.log('\n=== Lyzem source (slice=30) ===');
    const ly1 = await getRotatingKeywords('lyzem_keywords', 30);
    console.log(`Call 1: first=${ly1[0]}, last=${ly1[ly1.length - 1]}`);
    const ly2 = await getRotatingKeywords('lyzem_keywords', 30);
    console.log(`Call 2: first=${ly2[0]}, last=${ly2[ly2.length - 1]}`);
    const ly3 = await getRotatingKeywords('lyzem_keywords', 30);
    console.log(`Call 3: first=${ly3[0]}, last=${ly3[ly3.length - 1]}`);

    const overlapLY12 = ly1.filter((k) => new Set(ly2).has(k)).length;
    console.log(`Overlap call1 vs call2: ${overlapLY12}/30 keywords shared`);

    console.log('\n=== State persisted in DB ===');
    const states = await ScrapingRotation.find().lean();
    for (const s of states) {
      console.log(
        `  ${s.source}: offset=${s.offset}, totalKeywords=${s.totalKeywords}, lastRunAt=${s.lastRunAt?.toISOString()}`,
      );
    }

    console.log('\n=== Verdict ===');
    const mtRotating = mt1[0] !== mt2[0] && mt2[0] !== mt3[0];
    const lyRotating = ly1[0] !== ly2[0];
    const independent =
      !(mt1[0] === ly1[0] && mt1[mt1.length - 1] === ly1[ly1.length - 1]);
    console.log(`MTProto rotates between calls: ${mtRotating ? 'PASS' : 'FAIL'}`);
    console.log(`Lyzem rotates between calls:   ${lyRotating ? 'PASS' : 'FAIL'}`);
    console.log(`Independent cursors:           ${independent ? 'PASS' : 'FAIL'}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
