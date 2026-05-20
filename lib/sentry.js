/**
 * Sentry initialization wrapper.
 *
 * Safe no-op if SENTRY_DSN is not configured — keeps local dev and CI clean.
 * In production we want errors captured even if Sentry import fails (e.g. in
 * a future serverless build), so every export degrades gracefully.
 *
 * Usage:
 *   const sentry = require('./lib/sentry');
 *   sentry.init();                       // call once on boot
 *   sentry.captureException(err, ctx);   // anywhere
 *   app.use(sentry.requestHandler);      // before routes
 *   app.use(sentry.errorHandler);        // before final error middleware
 */

let Sentry = null;
let initialized = false;

function init() {
  if (initialized) return;
  initialized = true;

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.log('[sentry] SENTRY_DSN not set — error monitoring disabled');
    return;
  }

  try {
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || undefined,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
      profilesSampleRate: 0,
      sendDefaultPii: false,
      beforeSend(event) {
        // Strip request bodies — they may contain secrets, fiscal data, or PII.
        if (event.request) {
          delete event.request.data;
          delete event.request.cookies;
          if (event.request.headers) {
            delete event.request.headers.authorization;
            delete event.request.headers.cookie;
            delete event.request.headers['stripe-signature'];
            delete event.request.headers['x-hub-signature-256'];
          }
        }
        return event;
      },
    });
    console.log('[sentry] initialized', { env: process.env.NODE_ENV });
  } catch (err) {
    console.error('[sentry] init failed:', err?.message || err);
    Sentry = null;
  }
}

function captureException(err, context) {
  if (!Sentry) return;
  try {
    if (context) Sentry.withScope(scope => {
      Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
      Sentry.captureException(err);
    });
    else Sentry.captureException(err);
  } catch {}
}

function captureMessage(msg, level = 'info', context) {
  if (!Sentry) return;
  try {
    if (context) Sentry.withScope(scope => {
      Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
      Sentry.captureMessage(msg, level);
    });
    else Sentry.captureMessage(msg, level);
  } catch {}
}

// No-op middleware fallbacks so app.js can wire them unconditionally.
const noopMw = (req, res, next) => next();
const noopErrMw = (err, req, res, next) => next(err);

function requestHandler(req, res, next) {
  if (!Sentry || !Sentry.Handlers?.requestHandler) return next();
  return Sentry.Handlers.requestHandler()(req, res, next);
}

function errorHandler(err, req, res, next) {
  if (!Sentry || !Sentry.Handlers?.errorHandler) return next(err);
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Send 5xx and unhandled errors. 4xx are user errors — skip.
      const status = error?.status || error?.statusCode || 500;
      return status >= 500;
    },
  })(err, req, res, next);
}

module.exports = {
  init,
  captureException,
  captureMessage,
  requestHandler,
  errorHandler,
  noopMw,
  noopErrMw,
  get instance() { return Sentry; },
};
