/**
 * Multi-Platform Intel Job — Cron-triggered sync of WhatsApp & Discord metrics.
 *
 * Triggered via GET /api/jobs/multiplatform-intel (protected by CRON_SECRET).
 * Mirrors telegramIntelJob.js but for WhatsApp and Discord channels.
 */

const { syncAllMultiplatformChannels } = require('../services/multiplatformIntelService');

async function runMultiplatformIntelJob() {
  const timestamp = new Date().toISOString();
  console.log(`[MultiplatformIntel] Job started at ${timestamp}`);

  try {
    const result = await syncAllMultiplatformChannels();

    console.log(
      `[MultiplatformIntel] Job completed: ${result.processed} channels processed, ` +
      `${result.updated} metrics updated, ${result.errors.length} errors, ${result.duration_ms}ms`,
    );

    if (result.errors.length > 0) {
      console.warn('[MultiplatformIntel] Errors:', result.errors.slice(0, 10).join(' | '));
    }

    return {
      timestamp,
      processed: result.processed,
      updated: result.updated,
      errors: result.errors,
      duration_ms: result.duration_ms,
    };
  } catch (err) {
    console.error('[MultiplatformIntel] Job failed:', err.message);
    throw err;
  }
}

module.exports = { runMultiplatformIntelJob };
