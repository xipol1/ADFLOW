const crypto = require('crypto');

const createApiError = (status, code, message, details) => {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  if (details !== undefined) error.details = details;
  return error;
};

const ensureRequestId = (value) => {
  const trimmed = String(value || '').trim();
  if (trimmed) return trimmed.slice(0, 128);
  return crypto.randomUUID();
};

const sendSuccess = (res, payload, options = {}) => {
  const body = {
    success: true,
    requestId: res.locals.requestId,
    data: payload
  };

  if (options.meta) body.meta = options.meta;
  return res.status(options.status || 200).json(body);
};

const sendError = (res, error) => {
  const body = {
    success: false,
    requestId: res.locals.requestId,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Error interno del partner API'
    }
  };

  if (error.details !== undefined) body.error.details = error.details;
  return res.status(error.status || 500).json(body);
};

module.exports = {
  createApiError,
  ensureRequestId,
  sendSuccess,
  sendError
};
