require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Canales by actual createdAt
    const Canal = require('../models/Canal');
    const agg = await Canal.aggregate([
      { $match: { plataforma: 'telegram' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 10 },
    ]);
    console.log('\n=== CANALES by createdAt (top 10 days) ===');
    agg.forEach((r) => console.log(`  ${r._id}: ${r.count}`));

    await mongoose.disconnect();

    // Probe Telemetr
    console.log('\n=== TELEMETR PROBE ===');
    const { scrapePage } = require('../services/telemetrScraperService');
    const url = 'https://telemetr.io/es/channels?country=ES&category=finance&page=1';
    console.log('Scraping:', url);
    const res = await scrapePage(url);
    console.log('Returned', res.length, 'channels');
    res.slice(0, 5).forEach((c) =>
      console.log(`  @${c.username} | ${c.subscribers} subs | "${c.title?.slice(0, 40)}"`),
    );

    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
