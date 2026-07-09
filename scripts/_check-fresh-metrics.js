require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  const Canal = require('../models/Canal');
  const JobLog = require('../models/JobLog');
  const since = new Date('2026-06-11T10:00:00Z');
  const agg = await Canal.aggregate([
    { $group: {
      _id: '$plataforma',
      total: { $sum: 1 },
      fresh: { $sum: { $cond: [{ $gte: ['$estadisticas.ultimaActualizacion', since] }, 1, 0] } },
    } },
    { $sort: { total: -1 } },
  ]);
  console.table(agg.map((r) => ({ plataforma: r._id, total: r.total, actualizados_hoy: r.fresh })));
  const logs = await JobLog.find({ startedAt: { $gte: since } }).sort({ startedAt: 1 }).lean();
  for (const l of logs) {
    console.log(`${l.type}: ${l.status} (started ${l.startedAt.toISOString()})`, JSON.stringify(l.result || l.error || '').slice(0, 200));
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
