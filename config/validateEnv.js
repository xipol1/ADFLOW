/**
 * Valida que las variables de entorno críticas estén presentes al arrancar.
 * En producción, detiene el proceso si falta alguna obligatoria.
 * En desarrollo, solo advierte para que el dev pueda trabajar sin todas las integraciones.
 */

// Grupos de envs. Cada uno incluye un `tag` para reportar legiblemente.
const GROUPS = [
  {
    tag: 'core',
    required: ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'FRONTEND_URL', 'BACKEND_URL'],
  },
  {
    tag: 'auth',
    required: ['JWT_SECRET', 'JWT_REFRESH_SECRET'],
    optional: ['JWT_ISSUER', 'JWT_AUDIENCE', 'GOOGLE_CLIENT_ID'],
  },
  {
    tag: 'email',
    required: ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM_ADDRESS'],
    optional: ['EMAIL_PROVIDER', 'EMAIL_PORT', 'EMAIL_SECURE', 'EMAIL_FROM_NAME'],
    note: 'Sin estos no se envían emails de verificación ni notificaciones',
  },
  {
    tag: 'telegram',
    required: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_BOT_USERNAME'],
    note: 'Onboarding Telegram no funciona sin estas envs',
  },
  {
    tag: 'discord',
    required: ['DISCORD_CLIENT_ID', 'DISCORD_BOT_TOKEN'],
    note: 'Onboarding Discord no funciona sin estas envs',
  },
  {
    tag: 'instagram',
    required: ['INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET'],
    note: 'Onboarding Instagram OAuth no funciona sin estas envs',
  },
  {
    tag: 'whatsapp',
    required: ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'META_APP_SECRET'],
    note: 'WhatsApp OTP + validación de firma de webhook requieren estas envs',
  },
  {
    tag: 'cron',
    required: ['CRON_SECRET'],
    note: 'Jobs programados (multiplatform-intel) rechazan si falta',
  },
];

function validateEnv({ strict = false, logger = console } = {}) {
  const missing = [];
  const warnings = [];

  for (const group of GROUPS) {
    const missingInGroup = (group.required || []).filter(key => !process.env[key]);
    if (missingInGroup.length === 0) continue;

    const entry = {
      tag: group.tag,
      keys: missingInGroup,
      note: group.note || '',
    };
    if (group.tag === 'core') missing.push(entry);
    else warnings.push(entry);
  }

  if (missing.length > 0) {
    logger.error('\n❌ Faltan variables de entorno críticas (core):');
    for (const m of missing) {
      logger.error(`   [${m.tag}] ${m.keys.join(', ')}${m.note ? ` — ${m.note}` : ''}`);
    }
    if (strict) {
      logger.error('\nEl servidor no puede arrancar sin estas variables en producción.');
      process.exit(1);
    }
  }

  if (warnings.length > 0) {
    const level = strict ? 'error' : 'warn';
    logger[level]('\n⚠️ Variables de entorno opcionales ausentes:');
    for (const w of warnings) {
      logger[level](`   [${w.tag}] ${w.keys.join(', ')}${w.note ? ` — ${w.note}` : ''}`);
    }
    if (strict) {
      logger.error('\nEn producción, las integraciones correspondientes devolverán 503.');
    }
  }

  return { missing, warnings, ok: missing.length === 0 };
}

module.exports = { validateEnv };
