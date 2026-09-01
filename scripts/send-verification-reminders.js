#!/usr/bin/env node
/**
 * Envía el recordatorio de verificación pendiente a las cuentas que se
 * registraron y nunca activaron el email.
 *
 * QUÉ ES Y QUÉ NO ES: es un email OPERATIVO (art. 6.1.b RGPD) — "empezaste un
 * alta, complétala". No es marketing y no requiere consentimiento del art. 21
 * LSSI. Puede explicar qué podrá hacer la persona una vez dentro, porque eso
 * es contexto del servicio, pero NO puede incluir ofertas ni promociones. Para
 * eso está el canal comercial, que exige opt-in previo
 * (services/marketingConsent.js).
 *
 * SEGURIDAD:
 *  - DRY-RUN por defecto. Hay que pasar --apply para que salga un solo email.
 *  - Tope de 2 recordatorios por cuenta, controlado en el propio job.
 *  - Si el SMTP no responde, no envía NI marca nada como enviado.
 *
 * USO:
 *   node scripts/send-verification-reminders.js                  # dry-run
 *   node scripts/send-verification-reminders.js --apply
 *   node scripts/send-verification-reminders.js --apply --limite=5
 *   node scripts/send-verification-reminders.js --apply --emails=a@x.com,b@y.com
 *   node scripts/send-verification-reminders.js --apply --contexto="..."
 *
 * El caso para el que se escribió `--contexto`: la caída de SMTP de junio a
 * agosto de 2026 dejó a gente registrada sin recibir nunca el email de
 * verificación. A esa tanda conviene explicarle por qué recibe esto ahora:
 *
 *   --contexto="No fue cosa tuya: nuestro servidor de correo dejó de enviar y
 *               el mensaje de verificación nunca salió. Ya está corregido."
 */
require('dotenv').config();

const databaseConfig = require('../config/database');
const { runVerificationReminderJob } = require('../jobs/verificationReminderJob');

const APPLY = process.argv.includes('--apply');

const argValue = (nombre) => {
  const pref = `--${nombre}=`;
  const arg = process.argv.find((a) => a.startsWith(pref));
  return arg ? arg.slice(pref.length) : null;
};

async function run() {
  await databaseConfig.conectar();

  const limite = Number(argValue('limite')) > 0 ? Number(argValue('limite')) : 200;
  const contexto = argValue('contexto') || '';
  const emailsArg = argValue('emails');
  const emails = emailsArg ? emailsArg.split(',').map((e) => e.trim()).filter(Boolean) : null;

  const res = await runVerificationReminderJob({
    dryRun: !APPLY,
    limite,
    contexto,
    emails,
  });

  console.log(`\n${APPLY ? 'ENVÍO REAL' : 'DRY-RUN (nada enviado)'}`);
  console.log(`Candidatos: ${res.candidatos}`);
  if (res.error) console.log(`Error: ${res.error}`);
  if (APPLY) console.log(`Enviados: ${res.enviados} · Fallidos: ${res.fallidos}`);
  for (const d of res.detalles) {
    const marca = d.ok === false ? '✗' : APPLY ? '✓' : '·';
    console.log(`  ${marca} ${d.email} (intento ${d.intento})${d.error ? ` — ${d.error}` : ''}`);
  }
  if (!APPLY && res.candidatos > 0) {
    console.log('\nRepite con --apply para enviarlos de verdad.');
  }

  await databaseConfig.desconectar?.();
  process.exit(0);
}

run().catch((err) => {
  console.error('Error:', err?.message || err);
  process.exit(1);
});
