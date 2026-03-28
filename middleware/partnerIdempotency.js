const { readCollection, writeCollection } = require('../services/persistentStore');

const COLLECTION = 'partner_idempotency_keys';

const readKeys = () => readCollection(COLLECTION, []);
const saveKeys = (items) => writeCollection(COLLECTION, items);

const partnerIdempotency = (req, res, next) => {
  if (req.method !== 'POST') return next();

  const idempotencyKey = String(req.headers['idempotency-key'] || '').trim();
  if (!idempotencyKey || !req.partner?.id) return next();

  const fingerprint = `${req.partner.id}:${req.method}:${req.baseUrl}${req.path}:${idempotencyKey}`;
  const keys = readKeys();
  const existing = keys.find((item) => item.fingerprint === fingerprint);

  if (existing) {
    res.setHeader('Idempotency-Replayed', 'true');
    return res.status(existing.statusCode).json(existing.responseBody);
  }

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      keys.push({
        id: `pik-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        fingerprint,
        partnerId: req.partner.id,
        statusCode: res.statusCode,
        responseBody: body,
        createdAt: new Date().toISOString()
      });
      saveKeys(keys);
    }
    return originalJson(body);
  };

  next();
};

module.exports = {
  partnerIdempotency
};
