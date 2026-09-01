/*
 * recover-unverified.js — recuperacion del incidente de verificacion de email
 * (SMTP de contact@channelad.io caido desde 2026-06-18).
 *
 * Cuatro modos, todos DRY-RUN salvo que pases --apply:
 *
 *   --check     Verifica que el SMTP configurado en .env autentica.
 *               No toca la BD ni envia nada. Ejecutalo SIEMPRE primero.
 *
 *   --protect   Alarga emailVerificationExpires de los usuarios sin verificar.
 *               El cron auth-cleanup solo borra cuentas cuyo token esta
 *               caducado, asi que un token vivo las pone a salvo sin
 *               necesidad de redeploy. No envia ningun email.
 *
 *   --resend    Genera un token nuevo y envia el email de verificacion
 *               estandar (el mismo del alta). ENVIA CORREO A PERSONAS REALES.
 *
 *   --reminder  Igual que --resend pero con la plantilla de recordatorio
 *               (recordatorio-verificacion.html): reconoce que el fallo fue
 *               nuestro y explica que la cuenta sigue a medias. Pensado para
 *               la segunda pasada, unos dias despues del --resend.
 *               ENVIA CORREO A PERSONAS REALES.
 *
 * Los dos modos de envio son comunicaciones OPERATIVAS (art. 6.1.b RGPD): el
 * usuario inicio un registro y le pedimos completarlo. No metas ofertas ni
 * promociones — en el alta no se recoge consentimiento de marketing.
 *
 * Opciones:
 *   --days=N         Validez del token (por defecto 30 en protect, 7 al enviar).
 *   --only=a@b,c@d   Limita la actuacion a esos emails.
 *   --apply          Ejecuta de verdad. Sin esto solo imprime lo que haria.
 *
 * Ejemplos:
 *   node scripts/recover-unverified.js --check
 *   node scripts/recover-unverified.js --protect --apply
 *   FRONTEND_URL=https://channelad.io node scripts/recover-unverified.js --reminder --days=14 --apply
 */
require('dotenv').config();
const dns = require('dns');
const mongoose = require('mongoose');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (k, dflt = null) => {
  const a = argv.find((x) => x.startsWith('--' + k + '='));
  return a ? a.slice(k.length + 3) : dflt;
};

const APPLY = has('--apply');
const MODE = has('--check') ? 'check'
  : has('--protect') ? 'protect'
  : has('--resend') ? 'resend'
  : has('--reminder') ? 'reminder'
  : null;
const ENVIA = MODE === 'resend' || MODE === 'reminder';
const ONLY = (val('only') || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

const d = (x) => (x ? new Date(x).toISOString().slice(0, 16).replace('T', ' ') : '-');

// El resolver local bloquea el SRV de Atlas; si MONGODB_URI es mongodb+srv
// lo reescribimos a una URI directa resolviendo por DNS publico.
async function connectDb(uri) {
  if (!uri) throw new Error('MONGODB_URI vacio');
  if (!uri.startsWith('mongodb+srv://')) {
    return mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  }
  const m = uri.match(/^mongodb\+srv:\/\/([^:]+):([^@]+)@([^/?]+)(?:\/([^?]*))?(?:\?(.*))?$/);
  if (!m) throw new Error('No pude parsear MONGODB_URI');
  const [, user, pass, host, db = '', query = ''] = m;
  const r = new dns.promises.Resolver();
  r.setServers(['8.8.8.8', '1.1.1.1']);
  const srv = await r.resolveSrv('_mongodb._tcp.' + host);
  const txt = await r.resolveTxt('_mongodb._tcp.' + host).catch(() => r.resolveTxt(host));
  const kv = Object.fromEntries(txt.flat().join('&').split('&').map((p) => p.split('=')));
  const params = new URLSearchParams(query);
  params.set('ssl', 'true');
  if (kv.replicaSet) params.set('replicaSet', kv.replicaSet);
  params.set('authSource', kv.authSource || 'admin');
  if (!params.has('retryWrites')) params.set('retryWrites', 'true');
  const seeds = srv.map((s) => s.name + ':' + s.port).join(',');
  return mongoose.connect(
    'mongodb://' + user + ':' + pass + '@' + seeds + '/' + db + '?' + params.toString(),
    { serverSelectionTimeoutMS: 20000 }
  );
}

async function checkSmtp() {
  const nodemailer = require('nodemailer');
  const c = require('../config/config').email;
  console.log('Config de correo:');
  console.log('  proveedor : ' + (c.service || '(vacio)'));
  console.log('  host:port : ' + (c.host || '(vacio)') + ':' + c.port + '  secure=' + c.secure);
  console.log('  usuario   : ' + (c.auth.user || '(vacio)'));
  console.log('  password  : ' + (c.auth.pass ? '<' + c.auth.pass.length + ' caracteres>' : '(VACIO)'));
  console.log('  from      : "' + c.from.name + '" <' + c.from.address + '>');
  console.log('  FRONTEND_URL: ' + (process.env.FRONTEND_URL || '(VACIO - los enlaces saldrian rotos)'));

  const t = (c.service || '').toLowerCase() === 'gmail'
    ? nodemailer.createTransport({ service: 'gmail', auth: c.auth, secure: true, tls: { rejectUnauthorized: false } })
    : nodemailer.createTransport({ host: c.host, port: c.port, secure: c.secure, auth: c.auth, tls: { rejectUnauthorized: false } });

  try {
    await t.verify();
    console.log('\nSMTP OK - el servidor acepta estas credenciales.');
    return true;
  } catch (e) {
    console.log('\nSMTP FALLA: ' + e.message);
    return false;
  }
}

(async () => {
  if (!MODE) {
    console.log('Falta el modo. Usa --check, --protect o --resend. Ver cabecera del fichero.');
    process.exit(1);
  }

  if (MODE === 'check') {
    process.exit((await checkSmtp()) ? 0 : 1);
  }

  await connectDb(process.env.MONGODB_URI);
  const Usuario = require('../models/Usuario');

  const q = { emailVerificado: false, rol: { $ne: 'admin' } };
  if (ONLY.length) q.email = { $in: ONLY };
  const users = await Usuario.find(q).sort({ createdAt: 1 });

  const days = Number(val('days')) > 0 ? Number(val('days')) : (MODE === 'protect' ? 30 : 7);
  const ttlDays = Number(process.env.UNVERIFIED_USER_TTL_DAYS) > 0
    ? Number(process.env.UNVERIFIED_USER_TTL_DAYS)
    : 14;

  console.log(APPLY ? '### APPLY - escribiendo en PRODUCCION ###\n' : '### DRY-RUN - no escribe ni envia nada ###\n');
  console.log('Modo: ' + MODE + ' | usuarios sin verificar: ' + users.length + ' | validez token: ' + days + ' dias\n');

  if (ENVIA) {
    const ok = await checkSmtp();
    console.log('');
    if (!ok && APPLY) {
      console.log('Abortado: el SMTP no autentica, no tiene sentido reenviar. Arregla EMAIL_PASS primero.');
      await mongoose.disconnect();
      process.exit(1);
    }
    // El enlace del email se construye con FRONTEND_URL. Si arrastramos el
    // valor de desarrollo, mandariamos a 9 personas un enlace a localhost.
    const fe = (process.env.FRONTEND_URL || '').trim();
    if (!/^https:\/\//.test(fe) || /localhost|127\.0\.0\.1/.test(fe)) {
      console.log('Abortado: FRONTEND_URL = "' + (fe || '(vacio)') + '".');
      console.log('Los enlaces de verificacion saldrian rotos. Ejecuta con la URL de produccion:');
      console.log('  FRONTEND_URL=https://channelad.io node scripts/recover-unverified.js --resend --apply');
      await mongoose.disconnect();
      process.exit(1);
    }
    console.log('Los enlaces apuntaran a: ' + fe + '/verificar-email/<token>\n');
  }

  const crypto = require('crypto');
  const emailService = ENVIA ? require('../services/emailService') : null;
  let done = 0;
  let failed = 0;

  for (const u of users) {
    // Cuando lo borraria el cron tal y como esta ahora
    const borradoEl = new Date(new Date(u.createdAt).getTime() + ttlDays * 864e5);
    const tokenMuerto = !u.emailVerificationExpires || new Date(u.emailVerificationExpires) <= new Date();
    const enRiesgo = tokenMuerto && borradoEl <= new Date(Date.now() + 864e5);
    const nueva = new Date(Date.now() + days * 864e5);

    console.log(u.email + '  (' + u.rol + ', alta ' + d(u.createdAt) + ')');
    console.log('   token expira ' + d(u.emailVerificationExpires) + ' -> ' + d(nueva) +
      (enRiesgo ? '   [BORRADO INMINENTE]' : tokenMuerto ? '   [borrado el ' + d(borradoEl) + ']' : ''));

    if (!APPLY) { console.log(''); continue; }

    try {
      if (ENVIA || !u.emailVerificationToken) {
        u.emailVerificationToken = crypto.randomBytes(32).toString('hex');
      }
      u.emailVerificationExpires = nueva;
      await u.save();

      if (MODE === 'resend') {
        await emailService.enviarEmailVerificacion(u.email, u.nombre || '', u.emailVerificationToken);
        console.log('   OK - email de verificacion enviado');
      } else if (MODE === 'reminder') {
        await emailService.enviarRecordatorioVerificacion(u.email, u.nombre || '', u.emailVerificationToken, {
          rol: u.rol,
          fechaAlta: u.createdAt,
          diasParaCaducar: days,
          intento: Number(val('intento')) === 2 ? 2 : 1,
          // A esta gente el email del alta nunca les salio: la culpa fue
          // nuestra y el texto tiene que decirlo.
          contexto: has('--sin-contexto')
            ? ''
            : 'No fue cosa tuya: nuestro servidor de correo dejo de enviar y el mensaje de verificacion nunca salio. Ya esta corregido.',
        });
        // Deja constancia en los mismos campos que usa el cron diario
        // (jobs/verificationReminderJob). Sin esto, el cron veria a esta
        // persona como si nunca hubiera recibido nada y le enviaria otro
        // recordatorio al dia siguiente.
        u.verificationRemindersSent = (u.verificationRemindersSent || 0) + 1;
        u.lastVerificationReminderAt = new Date();
        await u.save();
        console.log('   OK - recordatorio enviado');
      } else {
        console.log('   OK - token prorrogado (a salvo del cron)');
      }
      done++;
    } catch (e) {
      console.log('   ERROR: ' + e.message);
      failed++;
    }
    console.log('');
  }

  console.log('\nResultado: ' + done + ' ok, ' + failed + ' con error' + (APPLY ? '' : ' (dry-run: nada aplicado)'));
  await mongoose.disconnect();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
