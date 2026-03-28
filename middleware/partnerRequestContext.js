const { ensureRequestId } = require('../lib/partnerApiHttp');

const partnerRequestContext = (req, res, next) => {
  const requestId = ensureRequestId(req.headers['x-request-id']);
  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-API-Version', '2026-03-26');
  res.setHeader('Cache-Control', 'no-store');
  next();
};

module.exports = {
  partnerRequestContext
};
