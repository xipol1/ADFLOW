/**
 * WhatsApp Intel Job — cron entrypoint para refresh de métricas WA channels.
 *
 * Análogo a jobs/telegramIntelJob.js. Itera todos los Canal con
 * plataforma:'whatsapp' que tienen una BaileysSession conectada vinculada,
 * y refresca snapshot + scoring.
 *
 * Se expone via GET /api/jobs/whatsapp-intel (proteger con CRON_SECRET).
 */

const { syncAllConnectedCanales } = require('../services/whatsappIntelService');

async function runWhatsAppIntelJob() {
  const timestamp = new Date().toISOString();
  console.log(`[WhatsAppIntel] Job started at ${timestamp}`);

  try {
    const result = await syncAllConnectedCanales();

    console.log(
      `[WhatsAppIntel] Job completed: ${result.processed} channels processed, ` +
      `${result.errors.length} errors, ${result.duration_ms}ms`
    );

    if (result.errors.length > 0) {
      console.warn('[WhatsAppIntel] Errors:', result.errors.join(' | '));
    }

    return {
      timestamp,
      processed: result.processed,
      errors: result.errors,
      duration_ms: result.duration_ms,
    };
  } catch (err) {
    console.error('[WhatsAppIntel] Job failed:', err.message);
    throw err;
  }
}

module.exports = { runWhatsAppIntelJob };
