/**
 * Structured logger using Winston — production-ready logging for ChannelAd.
 *
 * Features:
 * - JSON structured output in production, colorized in development
 * - Request correlation via X-Request-Id
 * - Automatic context enrichment (partnerId, userId, method, path)
 * - Non-blocking, async-safe
 */
const winston = require('winston');

const ENV = process.env.NODE_ENV || 'development';

// ── Credential scrubber ──────────────────────────────────────────────────────
// Defence-in-depth against accidental credential leaks (DEP0170 warnings,
// stack traces that include connection strings, third-party libs that log
// `redis://user:pass@…`, etc.). Runs over every log line BEFORE it leaves
// the process. The pattern matches `<scheme>://<user>:<pass>@` for any
// scheme — mongodb, mongodb+srv, redis, rediss, postgres, postgresql,
// amqp, amqps, mysql, mssql.
const CREDENTIALS_IN_URI = /\b([a-z][a-z0-9+.-]*:\/\/[^\s:/@]+):[^\s@]+@/gi;
const scrubString = (s) => typeof s === 'string'
  ? s.replace(CREDENTIALS_IN_URI, '$1:***@')
  : s;

const scrubValue = (v) => {
  if (typeof v === 'string') return scrubString(v);
  if (v && typeof v === 'object') {
    // Avoid mutating caller objects; build a shallow scrubbed copy.
    if (Array.isArray(v)) return v.map(scrubValue);
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = scrubValue(val);
    return out;
  }
  return v;
};

const scrubFormat = winston.format((info) => {
  // Top-level fields most likely to carry the leak.
  if (info.message) info.message = scrubValue(info.message);
  if (info.stack) info.stack = scrubString(info.stack);
  // Iterate over any extra meta (e.g. {url, uri, connection}).
  for (const k of Object.keys(info)) {
    if (k === 'level' || k === 'timestamp' || k === 'service') continue;
    info[k] = scrubValue(info[k]);
  }
  return info;
})();

const logger = winston.createLogger({
  level: ENV === 'development' ? 'debug' : 'info',
  defaultMeta: { service: 'channelad-api' },
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    scrubFormat,                                            // ← always before output
    ENV === 'development'
      ? winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const ctx = meta.requestId ? ` [${meta.requestId.slice(0, 8)}]` : '';
            const extra = Object.keys(meta).length > 2
              ? ` ${JSON.stringify(Object.fromEntries(Object.entries(meta).filter(([k]) => !['service', 'timestamp'].includes(k))))}`
              : '';
            return `${timestamp} ${level}${ctx}: ${message}${extra}`;
          })
        )
      : winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Also scrub anything written directly via console.* (deprecation warnings,
// third-party libs that bypass winston). Wrap the four stdout/stderr writers.
for (const method of ['log', 'info', 'warn', 'error']) {
  const original = console[method].bind(console);
  console[method] = (...args) => original(...args.map(scrubValue));
}

module.exports = logger;
module.exports.scrubString = scrubString;
module.exports.scrubValue = scrubValue;
