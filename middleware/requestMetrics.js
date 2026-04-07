/**
 * Request metrics middleware — tracks duration, throughput, and error rates.
 *
 * Stores in-memory counters (reset on deploy, which is fine for Vercel serverless).
 * Exposes metrics via GET /api/metrics (admin-only) and enriches logs.
 */
const logger = require('../lib/logger');

// In-memory counters (per-instance, resets on cold start)
const metrics = {
  totalRequests: 0,
  totalErrors: 0,
  byStatus: {},
  byRoute: {},
  startedAt: new Date().toISOString()
};

const requestMetrics = (req, res, next) => {
  const start = process.hrtime.bigint();

  // Track when response finishes
  const originalEnd = res.end;
  res.end = function (...args) {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const status = res.statusCode;
    const route = `${req.method} ${req.route?.path || req.path}`;

    // Update counters
    metrics.totalRequests++;
    metrics.byStatus[status] = (metrics.byStatus[status] || 0) + 1;
    if (status >= 400) metrics.totalErrors++;

    // Track per-route (top 50 only to limit memory)
    if (Object.keys(metrics.byRoute).length < 50) {
      if (!metrics.byRoute[route]) metrics.byRoute[route] = { count: 0, totalMs: 0 };
      metrics.byRoute[route].count++;
      metrics.byRoute[route].totalMs += durationMs;
    }

    // Log slow requests (>5s)
    if (durationMs > 5000) {
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.originalUrl,
        duration: `${durationMs.toFixed(0)}ms`,
        status,
        partnerId: req.partner?._id?.toString(),
        requestId: res.locals.requestId
      });
    }

    // Log errors
    if (status >= 500) {
      logger.error('Server error', {
        method: req.method,
        path: req.originalUrl,
        status,
        duration: `${durationMs.toFixed(0)}ms`,
        partnerId: req.partner?._id?.toString(),
        requestId: res.locals.requestId
      });
    }

    return originalEnd.apply(this, args);
  };

  next();
};

const getMetrics = () => ({
  ...metrics,
  errorRate: metrics.totalRequests > 0
    ? +(metrics.totalErrors / metrics.totalRequests).toFixed(4)
    : 0,
  uptimeSeconds: Math.floor(process.uptime()),
  memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024)
});

module.exports = { requestMetrics, getMetrics };
