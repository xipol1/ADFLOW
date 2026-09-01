/**
 * Verification Reminder Job — recordatorio a quien se registró y nunca
 * verificó el email.
 *
 * BASE LEGAL: ejecución de contrato (art. 6.1.b RGPD). La persona inició un
 * alta y le pedimos que la complete; no es una comunicación comercial, así que
 * no necesita el consentimiento del art. 21 LSSI ni lleva enlace de baja. Por
 * eso este job usa emailService.enviarRecordatorioVerificacion() y NO
 * enviarEmailComercial(): si el contenido se convirtiera en una oferta
 * (descuentos, promociones), dejaría de estar cubierto por esa base legal.
 *
 * Encaja con jobs/unverifiedCleanupJob, que borra las cuentas no verificadas a
 * los 14 días: el recordatorio llega ANTES de esa fecha, para que el borrado
 * no se lleve por delante a alguien que simplemente no vio el primer email
 * (que es exactamente lo que pasó durante la caída de SMTP de junio-agosto de
 * 2026, cuando el cron eliminó 16 cuentas reales).
 *
 * Cadencia: como máximo 2 recordatorios por cuenta, con al menos
 * REMINDER_GAP_DAYS entre ellos, y nunca antes de REMINDER_AFTER_DAYS desde el
 * alta (dar tiempo a que vean el email original).
 *
 * Cada envío regenera el token de verificación — el original caduca a las 24 h,
 * así que a estas alturas está muerto y el enlace no funcionaría.
 *
 * Se dispara vía GET/POST /api/jobs/verification-reminder, protegido con
 * CRON_SECRET, o a mano con scripts/send-verification-reminders.js.
 */

const crypto = require('crypto');
const Usuario = require('../models/Usuario');
const { ensureDb } = require('../lib/ensureDb');

const DIA = 24 * 60 * 60 * 1000;

// Días desde el alta antes del primer recordatorio.
const REMINDER_AFTER_DAYS = Number(process.env.VERIFICATION_REMINDER_AFTER_DAYS) > 0
  ? Number(process.env.VERIFICATION_REMINDER_AFTER_DAYS)
  : 2;
// Días mínimos entre el primer y el segundo recordatorio.
const REMINDER_GAP_DAYS = Number(process.env.VERIFICATION_REMINDER_GAP_DAYS) > 0
  ? Number(process.env.VERIFICATION_REMINDER_GAP_DAYS)
  : 5;
const MAX_REMINDERS = 2;

// TTL de borrado — el mismo que usa unverifiedCleanupJob. Lo leemos para poder
// decirle a la persona cuántos días le quedan antes de perder el registro.
const cleanupTtlDays = () =>
  Number(process.env.UNVERIFIED_USER_TTL_DAYS) > 0
    ? Number(process.env.UNVERIFIED_USER_TTL_DAYS)
    : 14;

/**
 * @param {object}  opciones
 * @param {boolean} opciones.dryRun   no envía ni escribe, solo devuelve el alcance
 * @param {number}  opciones.limite   tope de envíos en esta pasada
 * @param {string}  opciones.contexto frase extra de contexto para la plantilla
 *                                    (p. ej. explicar una caída de correo)
 * @param {string[]} opciones.emails  restringe la tanda a estos emails
 */
async function runVerificationReminderJob({
  dryRun = false,
  limite = 200,
  contexto = '',
  emails = null,
} = {}) {
  const t0 = Date.now();
  await ensureDb();

  const ahora = Date.now();
  const ttlDays = cleanupTtlDays();

  const filtro = {
    emailVerificado: false,
    activo: { $ne: false },
    rol: { $ne: 'admin' },
    // Ya ha pasado el margen de cortesía desde el alta…
    createdAt: { $lte: new Date(ahora - REMINDER_AFTER_DAYS * DIA) },
    // …y aún no hemos agotado los recordatorios.
    $or: [
      { verificationRemindersSent: { $exists: false } },
      { verificationRemindersSent: { $lt: MAX_REMINDERS } },
    ],
  };
  if (Array.isArray(emails) && emails.length) {
    filtro.email = { $in: emails.map((e) => String(e).trim().toLowerCase()) };
  }

  const candidatos = await Usuario.find(filtro)
    .select('email nombre createdAt verificationRemindersSent lastVerificationReminderAt')
    .sort({ createdAt: 1 })
    .limit(Math.max(1, limite) * 3) // margen: el filtro de gap se aplica en memoria
    .lean();

  // El hueco entre recordatorios no se puede expresar en el filtro sin un
  // $expr comparando dos campos, así que se descarta aquí.
  const pendientes = candidatos.filter((u) => {
    const enviados = u.verificationRemindersSent || 0;
    if (enviados === 0) return true;
    const ultimo = u.lastVerificationReminderAt ? new Date(u.lastVerificationReminderAt).getTime() : 0;
    return ahora - ultimo >= REMINDER_GAP_DAYS * DIA;
  }).slice(0, limite);

  const resultado = {
    candidatos: pendientes.length,
    enviados: 0,
    fallidos: 0,
    dryRun,
    detalles: [],
  };

  if (dryRun) {
    resultado.detalles = pendientes.map((u) => ({
      email: u.email,
      alta: u.createdAt,
      intento: (u.verificationRemindersSent || 0) + 1,
    }));
    resultado.duration_ms = Date.now() - t0;
    resultado.timestamp = new Date().toISOString();
    return resultado;
  }

  const emailService = require('../services/emailService');
  if (!(await emailService.isOperational())) {
    // Sin transporte de correo no se envía nada, y sobre todo no se marca nada
    // como enviado: si lo hiciéramos, gastaríamos el recordatorio en el vacío.
    resultado.error = 'email_not_operational';
    resultado.duration_ms = Date.now() - t0;
    resultado.timestamp = new Date().toISOString();
    return resultado;
  }

  for (const u of pendientes) {
    const intento = (u.verificationRemindersSent || 0) + 1;
    try {
      // Token nuevo: el del alta caducó a las 24 h y el enlace viejo no sirve.
      const token = crypto.randomBytes(32).toString('hex');
      await Usuario.updateOne(
        { _id: u._id, emailVerificado: false },
        {
          $set: {
            emailVerificationToken: token,
            emailVerificationExpires: new Date(ahora + 7 * DIA),
          },
        }
      );

      const diasDesdeAlta = Math.floor((ahora - new Date(u.createdAt).getTime()) / DIA);
      const diasParaCaducar = Math.max(1, ttlDays - diasDesdeAlta);

      await emailService.enviarRecordatorioVerificacion(u.email, u.nombre, token, {
        intento,
        diasParaCaducar,
        fechaAlta: u.createdAt,
        contexto,
      });

      await Usuario.updateOne(
        { _id: u._id },
        {
          $set: { lastVerificationReminderAt: new Date() },
          $inc: { verificationRemindersSent: 1 },
        }
      );
      resultado.enviados += 1;
      resultado.detalles.push({ email: u.email, intento, ok: true });
    } catch (err) {
      resultado.fallidos += 1;
      resultado.detalles.push({ email: u.email, intento, ok: false, error: err?.message });
      console.error('[verificationReminder] fallo enviando a', u.email, err?.message || err);
    }
  }

  resultado.duration_ms = Date.now() - t0;
  resultado.timestamp = new Date().toISOString();
  return resultado;
}

module.exports = {
  runVerificationReminderJob,
  REMINDER_AFTER_DAYS,
  REMINDER_GAP_DAYS,
  MAX_REMINDERS,
};
