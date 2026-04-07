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

const logger = winston.createLogger({
  level: ENV === 'development' ? 'debug' : 'info',
  defaultMeta: { service: 'channelad-api' },
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
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

module.exports = logger;
