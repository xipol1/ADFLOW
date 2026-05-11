/**
 * Channel Health Service — periodic re-verification of active channels.
 *
 * Token refresh (services/tokenRefreshService.js) only rotates Meta and
 * LinkedIn OAuth credentials before they expire. It does NOT detect:
 *   - Bot demoted/kicked on Telegram/Discord (admin loss)
 *   - User revoking the OAuth grant via the platform's settings UI
 *   - WhatsApp System User tokens that don't auto-refresh and silently die
 *   - LinkedIn tokens revoked by the org's super-admin
 *
 * This service runs verifyChannelAccess against every active channel and,
 * on failure, transitions it to `estado: 'pendiente_reverificacion'`,
 * lowers `verificacion.confianzaScore`, and emits a notification to the
 * owner. The next time the owner opens the dashboard they see the
 * channel needs re-authorization — instead of silently failing campaign
 * deliveries.
 *
 * Designed for Vercel serverless: stateless, single batch per invocation,
 * caller controls scheduling via cron endpoint.
 */

const Canal = require('../models/Canal');
const { ensureDb } = require('../lib/ensureDb');
const { verifyChannelAccess } = require('../lib/platformConnectors');
const { ALLOWED_PLATFORMS } = require('../lib/platformWhitelist');
const notificationService = require('./notificationService');

// Health drop applied to `verificacion.confianzaScore` on each failed check.
// Channels that fail health repeatedly tend toward 0 over time, ensuring
// the marketplace surfaces fresh signals.
const CONFIANZA_PENALTY = 20;

// Channels in this state are no longer fully trusted but kept around so the
// owner can re-auth without losing campaign history. The marketplace
// queries (channelListService) filter on `estado === 'activo'`, so this
// state effectively hides the channel from public listings.
const REVERIFY_STATE = 'pendiente_reverificacion';

// Soft cap on a single batch so a serverless invocation can't time out on
// large datasets. Cron should call this often enough to drain the queue.
const DEFAULT_BATCH_SIZE = 100;

/**
 * Inspect a single channel and decide whether it still has working access.
 * Returns `{ ok, code, message }` so the caller can build a report without
 * leaking internal error shapes.
 */
async function checkChannelHealth(canal) {
  try {
    const result = await verifyChannelAccess(canal);
    if (result?.valid) {
      return { ok: true, code: 'HEALTHY' };
    }
    // verifyChannelAccess returned a structured rejection ({ valid:false, error })
    return {
      ok: false,
      code: result?.code || classifyError(result?.error),
      message: result?.error || 'Verification returned invalid',
    };
  } catch (err) {
    return {
      ok: false,
      code: classifyError(err?.message),
      message: err?.message || 'Unknown error',
    };
  }
}

// Map common platform error strings to a stable code so monitoring can
// distinguish "user revoked grant" (actionable) from "platform 5xx"
// (retry next cycle, don't penalize the owner).
function classifyError(msg) {
  const m = String(msg || '').toLowerCase();
  if (!m) return 'UNKNOWN';
  // Match either order: "token expired" OR "invalid token". Both ?= lookaheads
  // must hit somewhere in the string.
  if (/(token|oauth)/.test(m) && /(expired|invalid|revoked|denied|unauthorized|401)/.test(m)) return 'TOKEN_REVOKED';
  if (/(not\s+admin|no\s+admin|kicked|removed|forbidden|403)/.test(m)) return 'ADMIN_LOST';
  if (/(rate.?limit|429)/.test(m)) return 'RATE_LIMITED';
  if (/(network|timeout|econn|enotfound|5\d{2})/.test(m)) return 'PLATFORM_DOWN';
  return 'VERIFY_FAILED';
}

// Errors that are NOT the owner's fault — we don't degrade the channel for
// these, just retry on the next cycle.
const TRANSIENT_CODES = new Set(['RATE_LIMITED', 'PLATFORM_DOWN']);

/**
 * Persist the health-check outcome on the channel. Returns the transition
 * type ('degraded' | 'restored' | 'noop' | 'transient') for the report.
 */
async function applyHealthResult(canal, health) {
  const wasActive = canal.estado === 'activo';
  const wasReverify = canal.estado === REVERIFY_STATE;

  if (health.ok) {
    // If a previously degraded channel recovers (owner re-authed), promote
    // it back to active and restore confianza partially. We don't fully
    // restore to 80 here — the scoring cron will rebuild it from real
    // signals — but moving it out of `pendiente_reverificacion` is enough
    // to put it back on the marketplace.
    if (wasReverify) {
      canal.estado = 'activo';
      canal.verificacion = canal.verificacion || {};
      canal.verificacion.confianzaScore = Math.max(canal.verificacion.confianzaScore || 0, 50);
      await canal.save();
      return 'restored';
    }
    return 'noop';
  }

  // Transient failures: don't touch the channel, log only.
  if (TRANSIENT_CODES.has(health.code)) {
    return 'transient';
  }

  // Real failure: degrade.
  canal.estado = REVERIFY_STATE;
  canal.verificacion = canal.verificacion || {};
  canal.verificacion.confianzaScore = Math.max(
    0,
    (canal.verificacion.confianzaScore || 0) - CONFIANZA_PENALTY
  );
  // Persist the last health failure for diagnostics. Reusing demographicsCache
  // would be wrong (different domain) — keep it on antifraude.flags as a tag.
  canal.antifraude = canal.antifraude || {};
  canal.antifraude.flags = Array.from(
    new Set([...(canal.antifraude.flags || []), `health:${health.code}`])
  );
  canal.antifraude.ultimaRevision = new Date();
  await canal.save();

  if (wasActive && canal.propietario) {
    // Best-effort notification — failure to notify must not roll back the
    // state change (the channel is still degraded). Swallow errors.
    try {
      await notificationService.enviarNotificacion({
        usuarioId: canal.propietario,
        tipo: 'canal_requiere_reverificacion',
        titulo: 'Canal requiere re-verificación',
        mensaje: `Tu canal "${canal.nombreCanal || canal.identificadorCanal}" en ${canal.plataforma} ha perdido acceso (${health.code}). Reconéctalo desde el panel.`,
        datos: { canalId: String(canal._id), plataforma: canal.plataforma, code: health.code },
        prioridad: 'alta',
        canales: ['database', 'realtime', 'email'],
      });
    } catch (notifyErr) {
      console.warn(`channelHealth: notify failed for canal ${canal._id}:`, notifyErr.message);
    }
  }
  return 'degraded';
}

/**
 * Run a single batch of health checks. Returns a report object.
 *
 * @param {object} opts
 * @param {number} [opts.batchSize=100] Max channels to check this invocation.
 * @param {string[]} [opts.platforms] Restrict to specific platforms (default: all whitelisted).
 */
async function runHealthCheckBatch(opts = {}) {
  const ok = await ensureDb();
  if (!ok) throw new Error('Database not available');

  const batchSize = opts.batchSize || DEFAULT_BATCH_SIZE;
  const platforms = (opts.platforms || ALLOWED_PLATFORMS).filter((p) => ALLOWED_PLATFORMS.includes(p));

  // Pick channels that are currently active OR in re-verify limbo. The
  // latter so a recovered channel can be auto-promoted back to active.
  const channels = await Canal.find({
    plataforma: { $in: platforms },
    estado: { $in: ['activo', REVERIFY_STATE] },
  })
    .sort({ updatedAt: 1 }) // stalest first — round-robin coverage
    .limit(batchSize);

  const report = {
    checked: channels.length,
    healthy: 0,
    degraded: 0,
    restored: 0,
    transient: 0,
    byCode: {},
    details: [],
  };

  for (const canal of channels) {
    const health = await checkChannelHealth(canal);
    const transition = await applyHealthResult(canal, health);

    if (transition === 'degraded') report.degraded++;
    else if (transition === 'restored') report.restored++;
    else if (transition === 'transient') report.transient++;
    else report.healthy++;

    if (!health.ok) {
      report.byCode[health.code] = (report.byCode[health.code] || 0) + 1;
    }
    report.details.push({
      id: String(canal._id),
      plataforma: canal.plataforma,
      ok: health.ok,
      code: health.code,
      transition,
    });
  }

  console.log(
    `channelHealth: checked=${report.checked} healthy=${report.healthy} degraded=${report.degraded} restored=${report.restored} transient=${report.transient}`
  );
  return report;
}

module.exports = {
  checkChannelHealth,
  applyHealthResult,
  runHealthCheckBatch,
  classifyError, // exported for tests
  REVERIFY_STATE,
  CONFIANZA_PENALTY,
};
