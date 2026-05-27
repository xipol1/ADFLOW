/**
 * calculatorAnalyzer — router por plataforma. Punto de entrada único.
 *
 * Uso:
 *   const { runAnalysis } = require('./services/calculatorAnalyzer');
 *   const result = await runAnalysis(userInputUrl);
 *   //  → { ok, platform, externalId, normalizedUrl, status, data, error?, redirect? }
 *
 * Maneja:
 *   - Detección de plataforma (delega en platformDetector)
 *   - Routing al analyzer correspondiente
 *   - Caso WhatsApp Group: devuelve redirect a OAuth en lugar de scrapear
 *   - Errores y normalización del shape de respuesta
 */

const { detectPlatform } = require('./platformDetector');

const ANALYZERS = {
  telegram:         require('./telegramAnalyzer'),
  discord:          require('./discordAnalyzer'),
  newsletter:       require('./newsletterAnalyzer'),
};

async function runAnalysis(rawUrl) {
  const detected = detectPlatform(rawUrl);
  if (!detected) {
    return {
      ok: false,
      error: 'unsupported_url',
      message: 'Pega un link de Telegram (t.me/...), Discord (discord.gg/...) o Newsletter (Substack, Beehiiv). Otras plataformas todavía no las soportamos.',
    };
  }

  const { platform, externalId, normalizedUrl, subtype } = detected;

  // ── Casos especiales que NO pasan por un analyzer de scraping ─────────────

  if (platform === 'telegram_invite') {
    return {
      ok: true,
      platform: 'telegram',
      externalId,
      normalizedUrl,
      status: 'partial',
      data: {},
      message: 'Este es un link privado de invitación de Telegram. Pega la URL pública del canal (t.me/nombredelcanal) o introduce los datos manualmente abajo.',
    };
  }

  if (platform === 'whatsapp_group' || platform === 'whatsapp_channel') {
    // Por ahora, WhatsApp redirige al questionnaire/OAuth. El scraping
    // de WhatsApp es Sprint 2 del PLAN — todavía no lo hemos verificado
    // que no nos bloquee anti-scraping.
    return {
      ok: true,
      platform: 'whatsapp',
      externalId,
      normalizedUrl,
      status: 'redirect_questionnaire',
      data: {},
      message: 'WhatsApp no expone datos públicos. Usa el cuestionario WhatsApp para rellenar los datos manualmente, o vincula tu cuenta con OAuth para datos reales.',
    };
  }

  // ── Analyzer normal ───────────────────────────────────────────────────────
  const analyzer = ANALYZERS[platform];
  if (!analyzer) {
    return {
      ok: false,
      error: 'no_analyzer_for_platform',
      message: `Plataforma "${platform}" detectada pero no soportada todavía.`,
    };
  }

  const t0 = Date.now();
  let result;
  try {
    result = await analyzer.analyze({ externalId, normalizedUrl, subtype });
  } catch (err) {
    return {
      ok: false,
      platform,
      externalId,
      normalizedUrl,
      error: 'analyzer_threw',
      message: err?.message || 'Error inesperado al analizar el canal.',
      durationMs: Date.now() - t0,
    };
  }

  return {
    ok: true,
    platform: platform === 'newsletter' && subtype ? 'newsletter' : platform,
    subtype,
    externalId,
    normalizedUrl,
    status:        result.status,
    data:          result.data || {},
    errorMessage:  result.errorMessage || '',
    durationMs:    Date.now() - t0,
    scrapedFrom: ({
      telegram:   'html_public',
      discord:    'discord_api',
      newsletter: subtype || 'html_public',
    })[platform] || 'html_public',
  };
}

module.exports = {
  runAnalysis,
  detectPlatform, // re-exported for tests
  // Ananlyzers raw para tests aislados
  telegramAnalyzer:   require('./telegramAnalyzer'),
  discordAnalyzer:    require('./discordAnalyzer'),
  newsletterAnalyzer: require('./newsletterAnalyzer'),
};
