require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  const Canal = require('../models/Canal');
  console.log('now:', new Date().toISOString());
  const buckets = await Canal.aggregate([
    { $match: { plataforma: 'telegram', 'estadisticas.ultimaActualizacion': { $gte: new Date('2026-06-11T09:00:00Z') } } },
    { $group: {
      _id: { $dateToString: { format: '%H:%M', date: '$estadisticas.ultimaActualizacion', timezone: 'UTC' } },
      n: { $sum: 1 },
    } },
    { $sort: { _id: 1 } },
  ]);
  console.log('updates per minute (UTC):');
  buckets.forEach((b) => console.log(` ${b._id}  ${b.n}`));
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
