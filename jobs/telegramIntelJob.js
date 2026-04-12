/**
 * Telegram Intel Job — Cron-triggered sync of Telegram channel metrics.
 *
 * Triggered via GET /api/jobs/telegram-intel (protected by CRON_SECRET).
 * Compatible with Vercel Hobby plan (1 cron/day, runs at 03:00 UTC).
 *
 * Logs execution results: timestamp, channels processed, errors, duration.
 */

const { syncAllMappedChannels } = require('../services/telegramIntelService');

/**
 * Run the Telegram intel sync job.
 * @returns {{ timestamp: string, processed: number, errors: string[], duration_ms: number }}
 */
async function runTelegramIntelJob() {
  const timestamp = new Date().toISOString();
  console.log(`[TelegramIntel] Job started at ${timestamp}`);

  try {
    const result = await syncAllMappedChannels();

    console.log(
      `[TelegramIntel] Job completed: ${result.processed} channels processed, ` +
      `${result.errors.length} errors, ${result.duration_ms}ms`
    );

    if (result.errors.length > 0) {
      console.warn('[TelegramIntel] Errors:', result.errors.join(' | '));
    }

    return {
      timestamp,
      processed: result.processed,
      errors: result.errors,
      duration_ms: result.duration_ms,
    };
  } catch (err) {
    console.error('[TelegramIntel] Job failed:', err.message);
    throw err;
  }
}

module.exports = { runTelegramIntelJob };
