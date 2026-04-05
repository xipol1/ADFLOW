/**
 * Error Logger — Captures application errors to MongoDB for production debugging.
 * Lightweight alternative to Sentry for launch phase.
 */

const mongoose = require('mongoose');

const ErrorLogSchema = new mongoose.Schema({
  level: { type: String, enum: ['error', 'warn', 'fatal'], default: 'error' },
  message: { type: String, required: true },
  stack: { type: String, default: '' },
  context: { type: String, default: '' },
  userId: { type: String, default: '' },
  method: { type: String, default: '' },
  path: { type: String, default: '' },
  statusCode: { type: Number, default: 0 },
  userAgent: { type: String, default: '' },
  ip: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, expires: 2592000 }, // auto-delete after 30 days
});

ErrorLogSchema.index({ createdAt: -1 });
ErrorLogSchema.index({ level: 1, createdAt: -1 });

const ErrorLog = mongoose.models.ErrorLog || mongoose.model('ErrorLog', ErrorLogSchema);

/**
 * Log an error to the database (non-blocking).
 */
function logError(error, req = null, context = '') {
  setImmediate(async () => {
    try {
      if (mongoose.connection.readyState !== 1) return; // skip if DB not connected
      await ErrorLog.create({
        level: 'error',
        message: (error?.message || String(error)).substring(0, 2000),
        stack: (error?.stack || '').substring(0, 5000),
        context,
        userId: req?.usuario?.id || '',
        method: req?.method || '',
        path: req?.originalUrl || req?.path || '',
        statusCode: error?.status || 0,
        userAgent: (req?.headers?.['user-agent'] || '').substring(0, 300),
        ip: req?.ip || '',
      });
    } catch (logErr) {
      // Silently fail — never crash because of logging
      console.error('ErrorLogger failed:', logErr?.message);
    }
  });
}

/**
 * Express error-handling middleware. Add as the LAST middleware.
 * Logs the error, then passes it to the next error handler.
 */
function errorLoggingMiddleware(err, req, res, next) {
  logError(err, req, 'express-error-handler');
  next(err);
}

module.exports = { logError, errorLoggingMiddleware, ErrorLog };
