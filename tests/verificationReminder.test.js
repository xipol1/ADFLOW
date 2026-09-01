process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const { ensureDb } = require('../lib/ensureDb');
const Usuario = require('../models/Usuario');
const emailService = require('../services/emailService');
const { runVerificationReminderJob } = require('../jobs/verificationReminderJob');

/**
 * jobs/verificationReminderJob — a quién se le recuerda, a quién no, y qué
 * pasa cuando el correo está caído.
 *
 * Este último caso no es teórico: entre junio y agosto de 2026 el SMTP dejó de
 * enviar y el cron de limpieza acabó borrando 16 cuentas reales que nunca
 * recibieron el email de verificación. Si el job marcara los recordatorios como
 * enviados cuando el transporte está muerto, repetiríamos el mismo agujero.
 */
const DIA = 24 * 60 * 60 * 1000;

const crearUsuario = (extra = {}) =>
  Usuario.create({
    email: `reminder-${Math.random().toString(36).slice(2)}@test.com`,
    password: 'hash-irrelevante',
    nombre: 'Recordatorio Test',
    rol: 'creator',
    emailVerificado: false,
    emailVerificationToken: 'token-viejo',
    emailVerificationExpires: new Date(Date.now() - DIA),
    ...extra,
  });

// createdAt lo pone Mongoose; para simular una cuenta antigua hay que
// reescribirlo saltándose los timestamps.
const envejecer = (id, dias) =>
  Usuario.collection.updateOne(
    { _id: id },
    { $set: { createdAt: new Date(Date.now() - dias * DIA) } }
  );

describe('verificationReminderJob', () => {
  let disponible = true;

  beforeAll(async () => {
    disponible = await ensureDb();
  });

  beforeEach(async () => {
    if (disponible) await Usuario.deleteMany({ email: /^reminder-/ });
  });

  test('propone a quien lleva días sin verificar y respeta el margen inicial', async () => {
    if (!disponible) return console.warn('SKIP: DB not available');

    const antiguo = await crearUsuario();
    await envejecer(antiguo._id, 5);
    const recien = await crearUsuario(); // registrado hoy → aún no toca

    const res = await runVerificationReminderJob({ dryRun: true });
    const emails = res.detalles.map((d) => d.email);

    expect(emails).toContain(antiguo.email);
    expect(emails).not.toContain(recien.email);
    expect(res.detalles.find((d) => d.email === antiguo.email).intento).toBe(1);
  });

  test('no molesta a quien ya verificó ni a quien agotó los recordatorios', async () => {
    if (!disponible) return console.warn('SKIP: DB not available');

    const verificado = await crearUsuario({ emailVerificado: true });
    await envejecer(verificado._id, 5);
    const agotado = await crearUsuario({ verificationRemindersSent: 2 });
    await envejecer(agotado._id, 5);

    const res = await runVerificationReminderJob({ dryRun: true });
    const emails = res.detalles.map((d) => d.email);

    expect(emails).not.toContain(verificado.email);
    expect(emails).not.toContain(agotado.email);
  });

  test('espera el hueco mínimo entre el primer y el segundo recordatorio', async () => {
    if (!disponible) return console.warn('SKIP: DB not available');

    const reciente = await crearUsuario({
      verificationRemindersSent: 1,
      lastVerificationReminderAt: new Date(Date.now() - DIA), // ayer
    });
    await envejecer(reciente._id, 6);

    const listo = await crearUsuario({
      verificationRemindersSent: 1,
      lastVerificationReminderAt: new Date(Date.now() - 9 * DIA),
    });
    await envejecer(listo._id, 12);

    const res = await runVerificationReminderJob({ dryRun: true });
    const emails = res.detalles.map((d) => d.email);

    expect(emails).not.toContain(reciente.email);
    expect(emails).toContain(listo.email);
  });

  test('con el correo caído no envía NI marca nada como enviado', async () => {
    if (!disponible) return console.warn('SKIP: DB not available');

    const u = await crearUsuario();
    await envejecer(u._id, 5);
    // En el entorno de test no hay transporter: isOperational() ya es false.
    expect(await emailService.isOperational()).toBe(false);

    const res = await runVerificationReminderJob({ dryRun: false });
    expect(res.error).toBe('email_not_operational');
    expect(res.enviados).toBe(0);

    const tras = await Usuario.findById(u._id);
    expect(tras.verificationRemindersSent).toBe(0);
    expect(tras.lastVerificationReminderAt).toBeNull();
    // Y el token no se toca: no gastamos el enlace en un envío que no ocurrió.
    expect(tras.emailVerificationToken).toBe('token-viejo');
  });

  test('un envío real renueva el token caducado y contabiliza el recordatorio', async () => {
    if (!disponible) return console.warn('SKIP: DB not available');

    const u = await crearUsuario();
    await envejecer(u._id, 5);

    // Simulamos un transporte vivo: lo que importa es el efecto sobre la BD.
    const operativo = jest.spyOn(emailService, 'isOperational').mockResolvedValue(true);
    const envio = jest.spyOn(emailService, 'enviarRecordatorioVerificacion').mockResolvedValue({ exito: true });

    const res = await runVerificationReminderJob({ dryRun: false, contexto: 'Contexto de prueba' });
    expect(res.enviados).toBeGreaterThanOrEqual(1);

    const [email, , token, opciones] = envio.mock.calls.find((c) => c[0] === u.email);
    expect(email).toBe(u.email);
    expect(token).not.toBe('token-viejo');
    expect(opciones.intento).toBe(1);
    expect(opciones.contexto).toBe('Contexto de prueba');
    // El aviso de borrado cuenta desde el alta, no desde hoy.
    expect(opciones.diasParaCaducar).toBeGreaterThan(0);

    const tras = await Usuario.findById(u._id);
    expect(tras.verificationRemindersSent).toBe(1);
    expect(tras.lastVerificationReminderAt).toBeTruthy();
    expect(tras.emailVerificationToken).toBe(token);
    expect(tras.emailVerificationExpires.getTime()).toBeGreaterThan(Date.now());

    operativo.mockRestore();
    envio.mockRestore();
  });
});
