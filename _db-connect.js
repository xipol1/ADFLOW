/*
 * _db-connect.js — Connect mongoose to Atlas when the local resolver blocks
 * SRV/TXT lookups (querySrv ECONNREFUSED). Resolves the SRV seed-list + the
 * replicaSet name via a public DNS (8.8.8.8), then builds the expanded
 * non-SRV mongodb:// URI (the shard A-records DO resolve via the system DNS,
 * and keeping hostnames preserves TLS SNI cert validation).
 */
const dns = require('dns');
const mongoose = require('mongoose');

async function connectDirect(srvUri, opts = {}) {
  if (!srvUri) throw new Error('MONGODB_URI vacío');
  if (!srvUri.startsWith('mongodb+srv://')) {
    // Already a direct URI — just connect.
    return mongoose.connect(srvUri, { serverSelectionTimeoutMS: 20000, ...opts });
  }

  const m = srvUri.match(/^mongodb\+srv:\/\/([^:]+):([^@]+)@([^/?]+)(?:\/([^?]*))?(?:\?(.*))?$/);
  if (!m) throw new Error('No pude parsear MONGODB_URI SRV');
  const [, user, pass, host, db = '', query = ''] = m;

  const r = new dns.promises.Resolver();
  r.setServers(['8.8.8.8', '1.1.1.1']);
  const srv = await r.resolveSrv('_mongodb._tcp.' + host);
  let replicaSet = '', authSource = 'admin';
  try {
    const txt = await r.resolveTxt('_mongodb._tcp.' + host).catch(() => r.resolveTxt(host));
    const kv = Object.fromEntries((txt.flat().join('&')).split('&').map(p => p.split('=')));
    if (kv.replicaSet) replicaSet = kv.replicaSet;
    if (kv.authSource) authSource = kv.authSource;
  } catch { /* fall back to query params below */ }

  const seeds = srv.map(s => `${s.name}:${s.port}`).join(',');
  const params = new URLSearchParams(query);
  params.set('ssl', 'true');
  if (replicaSet) params.set('replicaSet', replicaSet);
  params.set('authSource', authSource);
  if (!params.has('retryWrites')) params.set('retryWrites', 'true');
  if (!params.has('w')) params.set('w', 'majority');

  const directUri = `mongodb://${user}:${pass}@${seeds}/${db}?${params.toString()}`;
  return mongoose.connect(directUri, { serverSelectionTimeoutMS: 20000, ...opts });
}

module.exports = { connectDirect };
