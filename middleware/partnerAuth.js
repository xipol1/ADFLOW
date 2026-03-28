const rateLimit = require('express-rate-limit');
const partnerIntegrationService = require('../services/partnerIntegrationService');
const { createApiError } = require('../lib/partnerApiHttp');

const getClientIp = (req) => req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '';

const autenticarPartner = (req, res, next) => {
  const authHeader = String(req.headers.authorization || '').trim();
  const apiKeyHeader = String(req.headers['x-api-key'] || '').trim();
  const apiKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : apiKeyHeader;

  if (!apiKey) {
    return next(createApiError(401, 'API_KEY_REQUIRED', 'API key requerida'));
  }

  const partner = partnerIntegrationService.getPartnerByApiKey(apiKey);
  if (!partner) {
    return next(createApiError(401, 'INVALID_CREDENTIALS', 'Credenciales invalidas'));
  }
  if (partner.status && partner.status !== 'active') {
    return next(createApiError(403, 'ACCESS_REVOKED', 'Acceso revocado'));
  }
  if (partner.expiresAt && new Date(partner.expiresAt) < new Date()) {
    return next(createApiError(403, 'API_KEY_EXPIRED', 'API key caducada'));
  }

  const clientIp = getClientIp(req);
  if (!partnerIntegrationService.isIpAllowed(partner, clientIp)) {
    return next(createApiError(403, 'IP_NOT_ALLOWED', 'IP no autorizada'));
  }

  req.partner = partner;
  req.partnerApiKeyHint = partner.apiKeyHint || '';
  partnerIntegrationService.touchPartnerUsage(partner.id, clientIp);
  return next();
};

const limitadorPartner = rateLimit({
  windowMs: 60 * 1000,
  max: (req) => {
    const limit = Number(req.partner?.rateLimitPerMinute);
    return Number.isFinite(limit) && limit > 0 ? limit : 60;
  },
  keyGenerator: (req) => req.partner?.id || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Cuota del partner excedida' } }
});

const registrarActividadPartner = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    try {
      if (req.partner?.id) {
        partnerIntegrationService.registerApiLog({
          partnerId: req.partner.id,
          ip: getClientIp(req),
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          requestBody: req.method === 'GET' ? undefined : req.body,
          responseBody: body
        });
      }
    } catch (error) {
      console.error('PARTNER API LOG ERROR:', error);
    }
    return originalJson(body);
  };

  next();
};

module.exports = {
  autenticarPartner,
  limitadorPartner,
  registrarActividadPartner
};
