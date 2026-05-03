/**
 * Swaps Maintenance Job — daily cron that handles two state transitions:
 *
 *  1. Expiration: any `propuesto` swap older than its `expiraEn` date is
 *     marked `expirado`. The recipient never responded — clean it up so
 *     it stops cluttering inboxes and frees the (channelA, channelB) pair
 *     for new proposals (the partial unique index excludes expirado).
 *
 *  2. Closing: any `publicado_ambos` swap whose tracking window has
 *     elapsed (oldest publication + propuesta.duracionHoras + 24h grace)
 *     is moved to `completado`. Click counts from both TrackingLinks
 *     are aggregated into `resultados.clicksRequester/clicksRecipient`,
 *     and each side's `contenido*.verificado` flips `true` if the link
 *     received >= TrackingLink.verification.minClicks (default 3).
 *
 * Triggered via GET /api/jobs/swaps-maintenance, protected by CRON_SECRET.
 * Returns { processed, expired, closed, errors, duration_ms, timestamp }.
 */

const ChannelSwap = require('../models/ChannelSwap');
const TrackingLink = require('../models/TrackingLink');
const { ensureDb } = require('../lib/ensureDb');

async function expirePending() {
  const now = new Date();
  const result = await ChannelSwap.updateMany(
    { status: 'propuesto', expiraEn: { $lte: now } },
    { $set: { status: 'expirado' } }
  );
  return result.modifiedCount || 0;
}

async function closeFinished() {
  const now = new Date();

  // Find swaps in publicado_ambos whose tracking window elapsed.
  // We need both publicadoEn timestamps + duracionHoras to compute the
  // close-by time, so do the date math in JS rather than a single query.
  const candidates = await ChannelSwap.find({
    status: 'publicado_ambos',
    'contenidoRequester.publicadoEn': { $ne: null },
    'contenidoRecipient.publicadoEn': { $ne: null },
  }).limit(500);

  let closed = 0;
  const errors = [];

  for (const swap of candidates) {
    try {
      const oldestPub = Math.min(
        swap.contenidoRequester.publicadoEn.getTime(),
        swap.contenidoRecipient.publicadoEn.getTime()
      );
      const trackingMs = (swap.propuesta.duracionHoras || 24) * 3_600_000;
      const graceMs = 24 * 3_600_000; // extra 24h to let stragglers click
      const closeBy = oldestPub + trackingMs + graceMs;
      if (now.getTime() < closeBy) continue;

      // Aggregate clicks from both tracking links
      const links = await TrackingLink.find({ swap: swap._id, type: 'swap' })
        .select('channel stats verification')
        .lean();

      let clicksToRecipientChannel = 0; // requester's link → recipient channel
      let clicksToRequesterChannel = 0; // recipient's link → requester channel

      for (const link of links) {
        const channelStr = String(link.channel);
        const total = link.stats?.totalClicks || 0;
        const min = link.verification?.minClicks ?? 3;
        if (channelStr === String(swap.recipientChannel)) {
          clicksToRecipientChannel += total;
          if (total >= min) swap.contenidoRequester.verificado = true;
        } else if (channelStr === String(swap.requesterChannel)) {
          clicksToRequesterChannel += total;
          if (total >= min) swap.contenidoRecipient.verificado = true;
        }
      }

      // resultados.clicksRequester = clicks DRIVEN BY the requester's post
      // (which point to the recipient channel) — i.e. the value the
      // requester delivered to the recipient.
      swap.resultados.clicksRequester = clicksToRecipientChannel;
      swap.resultados.clicksRecipient = clicksToRequesterChannel;
      swap.resultados.cerradoEn = now;
      swap.status = 'completado';

      await swap.save();
      closed += 1;
    } catch (err) {
      errors.push(`swap=${swap._id}: ${err.message}`);
    }
  }

  return { closed, errors };
}

async function runSwapsMaintenanceJob() {
  const t0 = Date.now();
  const timestamp = new Date().toISOString();
  console.log(`[SwapsMaintenance] Job started at ${timestamp}`);

  const ok = await ensureDb();
  if (!ok) throw new Error('DB no disponible');

  const expired = await expirePending();
  const { closed, errors } = await closeFinished();
  const duration_ms = Date.now() - t0;

  console.log(`[SwapsMaintenance] Done — expired=${expired} closed=${closed} errors=${errors.length} (${duration_ms}ms)`);
  if (errors.length) console.warn('[SwapsMaintenance] Errors:', errors.join(' | '));

  return {
    timestamp,
    expired,
    closed,
    errors,
    processed: expired + closed,
    duration_ms,
  };
}

module.exports = { runSwapsMaintenanceJob, expirePending, closeFinished };
