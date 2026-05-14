const AuthAuditLog = require('../models/AuthAuditLog');
const logger = require('./logger');

// Fire-and-forget audit log write. Never throws — failures to persist the
// audit trail must not break the underlying auth flow. We still log them so
// they show up in centralized logging if the AuthAuditLog collection itself
// is degraded.
const record = async (event, req, extra = {}) => {
  try {
    const ip =
      req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req?.ip ||
      req?.connection?.remoteAddress ||
      '';
    const userAgent = req?.headers?.['user-agent'] || '';

    await AuthAuditLog.create({
      event,
      user: extra.userId || null,
      email: (extra.email || '').toLowerCase(),
      ip,
      userAgent,
      metadata: extra.metadata || {},
      error: extra.error || null,
    });
  } catch (err) {
    logger.error('authAudit.write_failed', { event, msg: err?.message || String(err) });
  }
};

module.exports = { record };
