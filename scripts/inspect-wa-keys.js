/**
 * Quick inspection: sample WhatsApp keys from ChannelCandidate + Canal to see
 * what format the existing rows use. Used to validate the duplicate-detection
 * logic in compare-harvest-with-db.js.
 */
require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const ChannelCandidate = require('../models/ChannelCandidate');
  const Canal = require('../models/Canal');

  console.log('─── ChannelCandidate WA samples ───');
  const cands = await ChannelCandidate.find({ plataforma: 'whatsapp' }, { username: 1, source: 1, raw_metrics: 1 })
    .limit(30)
    .lean();
  for (const c of cands) {
    console.log(`  ${c.username}  [${c.source}]  channelCode=${c.raw_metrics?.channelCode || '-'}  invite=${c.raw_metrics?.inviteLink || '-'}`);
  }

  console.log('\n─── ChannelCandidate WA distribution by username prefix ───');
  const allUsernames = await ChannelCandidate.distinct('username', { plataforma: 'whatsapp' });
  const prefixCounts = {};
  for (const u of allUsernames) {
    const prefix = u.split(':')[0] + ':';
    prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
  }
  console.log(`  ${JSON.stringify(prefixCounts)}`);

  // How many start with "wa:0029" (real WA channel ID format)?
  const realWaChannelIds = allUsernames.filter((u) => /^wa:0029[A-Za-z0-9]+/.test(u));
  console.log(`  Real WA channel IDs (wa:0029...): ${realWaChannelIds.length}/${allUsernames.length}`);

  // How many have channelCode field in raw_metrics?
  const withChannelCode = await ChannelCandidate.countDocuments({
    plataforma: 'whatsapp',
    'raw_metrics.channelCode': { $exists: true, $ne: '' },
  });
  console.log(`  raw_metrics.channelCode populated: ${withChannelCode}/${allUsernames.length}`);

  console.log('\n─── Canal WA samples ───');
  const canales = await Canal.find({ plataforma: 'whatsapp' }, { identificadorCanal: 1, nombreCanal: 1, estado: 1 })
    .limit(15)
    .lean();
  for (const c of canales) {
    console.log(`  ${c.identificadorCanal}  [${c.estado}]  name="${c.nombreCanal}"`);
  }

  console.log('\n─── Canal WA distribution by identificador prefix ───');
  const allIds = await Canal.distinct('identificadorCanal', { plataforma: 'whatsapp' });
  const idPrefixes = {};
  for (const id of allIds) {
    const prefix = id.includes(':') ? id.split(':')[0] + ':' : id.slice(0, 4);
    idPrefixes[prefix] = (idPrefixes[prefix] || 0) + 1;
  }
  console.log(`  ${JSON.stringify(idPrefixes)}`);

  await mongoose.disconnect();
  process.exit(0);
})();
