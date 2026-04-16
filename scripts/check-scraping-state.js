/**
 * Quick audit: when did we last scrape, and how many candidates do we have?
 */
require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const ChannelCandidate = require('../models/ChannelCandidate');
    const Canal = require('../models/Canal');

    const totalCands = await ChannelCandidate.countDocuments();
    const bySource = await ChannelCandidate.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } },
    ]);
    const byStatus = await ChannelCandidate.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const newest = await ChannelCandidate.find()
      .sort({ scraped_at: -1 })
      .limit(5)
      .select('username source status scraped_at raw_metrics.subscribers raw_metrics.category')
      .lean();

    const oldest = await ChannelCandidate.find()
      .sort({ scraped_at: 1 })
      .limit(1)
      .select('scraped_at')
      .lean();

    const last7d = await ChannelCandidate.countDocuments({
      scraped_at: { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
    });
    const last30d = await ChannelCandidate.countDocuments({
      scraped_at: { $gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
    });

    const totalCanales = await Canal.countDocuments({ plataforma: 'telegram' });
    const canalesActivos = await Canal.countDocuments({
      plataforma: 'telegram',
      estado: { $in: ['activo', 'verificado'] },
    });

    console.log('\n=== CHANNEL CANDIDATES ===');
    console.log('Total candidates:', totalCands);
    console.log('By source:', JSON.stringify(bySource, null, 2));
    console.log('By status:', JSON.stringify(byStatus, null, 2));
    console.log('Added last 7d:', last7d);
    console.log('Added last 30d:', last30d);
    console.log('Oldest scraped_at:', oldest[0]?.scraped_at || 'N/A');
    console.log('\nNewest 5 candidates:');
    for (const c of newest) {
      const days = Math.round((Date.now() - new Date(c.scraped_at).getTime()) / 86400000);
      console.log(
        `  @${c.username} | ${c.source} | ${c.status} | ${c.raw_metrics?.subscribers || 0} subs | ${days}d ago`,
      );
    }

    console.log('\n=== CANALES (TELEGRAM) ===');
    console.log('Total telegram canales:', totalCanales);
    console.log('Activos/Verificados:', canalesActivos);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
