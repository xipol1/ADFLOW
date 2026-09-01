process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

const request = require('supertest');
const app = require('../app');
const legalConsent = require('../services/legalConsent');
const marketingConsent = require('../services/marketingConsent');

/**
 * Recorrido completo del consentimiento comercial sobre la API real:
 * registro con y sin casilla marcada, cambio de preferencia desde la cuenta y
 * baja en un click desde el enlace del email (sin sesión).
 *
 * Lo que de verdad se está probando es que no se puede acabar en un estado
 * donde salga un email comercial sin que la persona lo haya pedido.
 */
const creatorConsents = legalConsent
  .requiredDocsForRole('creator')
  .map((d) => ({ slug: d.slug, version: d.version }));

describe('Comunicaciones — consentimiento comercial de punta a punta', () => {
  const uniqueId = Date.now();
  const password = 'TestPass123';
  const emailSinOptIn = `comms-nooptin-${uniqueId}@test.com`;
  const emailConOptIn = `comms-optin-${uniqueId}@test.com`;

  let sinDb = false;
  let usuarioSinOptIn;
  let usuarioConOptIn;

  const registrar = (email, extra = {}) =>
    request(app).post('/api/auth/registro').send({
      email,
      password,
      nombre: 'Comms Test',
      role: 'creator',
      consents: creatorConsents,
      ...extra,
    });

  beforeAll(async () => {
    const res = await registrar(emailSinOptIn);
    if (res.status === 503) { sinDb = true; return; }
    const res2 = await registrar(emailConOptIn, { marketingOptIn: true });

    const Usuario = require('../models/Usuario');
    usuarioSinOptIn = await Usuario.findOne({ email: emailSinOptIn });
    usuarioConOptIn = await Usuario.findOne({ email: emailConOptIn });
    expect(res2.status).toBe(201);
  });

  test('quien no marca la casilla queda sin consentimiento', () => {
    if (sinDb) return console.warn('SKIP: DB not available');
    expect(usuarioSinOptIn.comunicaciones.marketingOptIn).toBe(false);
    expect(usuarioSinOptIn.comunicaciones.historial).toHaveLength(0);
    expect(marketingConsent.puedeRecibirMarketing(usuarioSinOptIn).ok).toBe(false);
  });

  test('quien la marca queda consentido y con la prueba archivada', () => {
    if (sinDb) return console.warn('SKIP: DB not available');
    const c = usuarioConOptIn.comunicaciones;
    expect(c.marketingOptIn).toBe(true);
    expect(c.marketingOptInAt).toBeTruthy();
    expect(c.historial).toHaveLength(1);
    expect(c.historial[0].accion).toBe('opt_in');
    expect(c.historial[0].origen).toBe('registro');
    expect(c.historial[0].texto).toBe(marketingConsent.MARKETING_CONSENT_TEXT);
    expect(marketingConsent.puedeRecibirMarketing(usuarioConOptIn).ok).toBe(true);
  });

  test('la baja en un click funciona sin sesión y es idempotente', async () => {
    if (sinDb) return console.warn('SKIP: DB not available');
    const token = marketingConsent.makeUnsubscribeToken('usuario', usuarioConOptIn._id.toString());

    const res = await request(app).get(`/api/comunicaciones/baja?token=${token}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('Te hemos dado de baja');

    const Usuario = require('../models/Usuario');
    const tras = await Usuario.findById(usuarioConOptIn._id);
    expect(tras.comunicaciones.marketingOptIn).toBe(false);
    expect(tras.comunicaciones.marketingOptOutAt).toBeTruthy();
    // El opt-in original sigue en el historial: es un registro inmutable.
    expect(tras.comunicaciones.historial.map((h) => h.accion)).toEqual(['opt_in', 'opt_out']);
    expect(marketingConsent.puedeRecibirMarketing(tras).ok).toBe(false);

    // Repetir el click no duplica la entrada del historial.
    await request(app).get(`/api/comunicaciones/baja?token=${token}`);
    const dosVeces = await Usuario.findById(usuarioConOptIn._id);
    expect(dosVeces.comunicaciones.historial).toHaveLength(2);
  });

  test('el POST One-Click (RFC 8058) también da de baja', async () => {
    if (sinDb) return console.warn('SKIP: DB not available');
    const Usuario = require('../models/Usuario');
    await Usuario.updateOne(
      { _id: usuarioSinOptIn._id },
      { $set: { 'comunicaciones.marketingOptIn': true, 'comunicaciones.marketingOptOutAt': null } }
    );
    const token = marketingConsent.makeUnsubscribeToken('usuario', usuarioSinOptIn._id.toString());

    const res = await request(app)
      .post('/api/comunicaciones/baja')
      .type('form')
      .send({ token, 'List-Unsubscribe': 'One-Click' });
    expect(res.status).toBe(200);

    const tras = await Usuario.findById(usuarioSinOptIn._id);
    expect(tras.comunicaciones.marketingOptIn).toBe(false);
  });

  test('un token con firma rota no da de baja a nadie', async () => {
    if (sinDb) return console.warn('SKIP: DB not available');
    const Usuario = require('../models/Usuario');
    await Usuario.updateOne(
      { _id: usuarioConOptIn._id },
      { $set: { 'comunicaciones.marketingOptIn': true } }
    );

    const res = await request(app)
      .get(`/api/comunicaciones/baja?token=usuario.${usuarioConOptIn._id}.0000000000000000000000000000cafe`);
    expect(res.status).toBe(400);

    const tras = await Usuario.findById(usuarioConOptIn._id);
    expect(tras.comunicaciones.marketingOptIn).toBe(true);
  });

  test('las preferencias exigen sesión', async () => {
    if (sinDb) return console.warn('SKIP: DB not available');
    const res = await request(app).get('/api/comunicaciones/preferencias');
    expect([401, 403]).toContain(res.status);
  });
});

describe('Diálogo único de consentimiento (marketingPromptPending)', () => {
  const uniqueId = Date.now();
  const password = 'TestPass123';
  const email = `comms-prompt-${uniqueId}@test.com`;

  let sinDb = false;
  let usuario;
  let token;

  // Inicia sesión y devuelve el `user` que el frontend recibirá — es donde vive
  // la bandera que dispara el modal.
  const login = async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    if (res.status === 503) { sinDb = true; return null; }
    token = res.body.token;
    return res.body.user;
  };

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/registro').send({
      email, password, nombre: 'Prompt Test', role: 'creator', consents: creatorConsents,
    });
    if (res.status === 503) { sinDb = true; return; }

    const Usuario = require('../models/Usuario');
    // El diálogo solo se enseña a cuentas verificadas: primero que activen.
    await Usuario.updateOne({ email }, { $set: { emailVerificado: true } });
    usuario = await Usuario.findOne({ email });
  });

  test('una cuenta antigua sin respuesta previa recibe la bandera al entrar', async () => {
    if (sinDb) return console.warn('SKIP: DB not available');
    const user = await login();
    expect(user.marketingPromptPending).toBe(true);
    expect(user.marketingOptIn).toBe(false);
  });

  test('"Ahora no" cuenta un aplazamiento pero sigue preguntando', async () => {
    if (sinDb) return console.warn('SKIP: DB not available');
    const res = await request(app)
      .post('/api/comunicaciones/decision')
      .set('Authorization', `Bearer ${token}`)
      .send({ respuesta: 'luego' });

    expect(res.status).toBe(200);
    expect(res.body.respuesta).toBe('luego');
    expect(res.body.marketingPromptPending).toBe(true);

    const Usuario = require('../models/Usuario');
    const tras = await Usuario.findById(usuario._id);
    expect(tras.comunicaciones.marketingPrompt.aplazamientos).toBe(1);
    expect(tras.comunicaciones.marketingPrompt.respuesta).toBeNull();
  });

  test('decir que NO se registra y no se vuelve a preguntar jamás', async () => {
    if (sinDb) return console.warn('SKIP: DB not available');
    const res = await request(app)
      .post('/api/comunicaciones/decision')
      .set('Authorization', `Bearer ${token}`)
      .send({ respuesta: 'no' });

    expect(res.status).toBe(200);
    expect(res.body.optIn).toBe(false);
    expect(res.body.marketingPromptPending).toBe(false);

    const Usuario = require('../models/Usuario');
    const tras = await Usuario.findById(usuario._id);
    expect(tras.comunicaciones.marketingPrompt.respuesta).toBe('no');
    expect(tras.comunicaciones.marketingPrompt.respondidoEn).toBeTruthy();
    // Un "no" no es una retirada de consentimiento: nunca lo hubo, así que el
    // historial de consentimientos tiene que seguir vacío.
    expect(tras.comunicaciones.historial).toHaveLength(0);
    expect(marketingConsent.puedeRecibirMarketing(tras).ok).toBe(false);

    // Y al volver a entrar, la bandera ya no viene.
    const user = await login();
    expect(user.marketingPromptPending).toBe(false);
  });

  test('decir que SÍ consiente con la misma prueba que la casilla del alta', async () => {
    if (sinDb) return console.warn('SKIP: DB not available');
    const otroEmail = `comms-prompt-si-${uniqueId}@test.com`;
    await request(app).post('/api/auth/registro').send({
      email: otroEmail, password, nombre: 'Prompt Si', role: 'creator', consents: creatorConsents,
    });
    const Usuario = require('../models/Usuario');
    await Usuario.updateOne({ email: otroEmail }, { $set: { emailVerificado: true } });

    const loginRes = await request(app).post('/api/auth/login').send({ email: otroEmail, password });
    expect(loginRes.body.user.marketingPromptPending).toBe(true);

    const res = await request(app)
      .post('/api/comunicaciones/decision')
      .set('Authorization', `Bearer ${loginRes.body.token}`)
      .send({ respuesta: 'si' });

    expect(res.status).toBe(200);
    expect(res.body.optIn).toBe(true);
    expect(res.body.marketingPromptPending).toBe(false);

    const tras = await Usuario.findOne({ email: otroEmail });
    expect(tras.comunicaciones.marketingOptIn).toBe(true);
    expect(tras.comunicaciones.historial).toHaveLength(1);
    expect(tras.comunicaciones.historial[0].origen).toBe('prompt');
    expect(tras.comunicaciones.historial[0].texto).toBe(marketingConsent.MARKETING_CONSENT_TEXT);
    expect(marketingConsent.puedeRecibirMarketing(tras).ok).toBe(true);
  });

  test('quien ya consintió en el alta nunca ve el diálogo', () => {
    if (sinDb) return console.warn('SKIP: DB not available');
    expect(marketingConsent.necesitaPrompt({
      email: 'x@y.com', emailVerificado: true,
      comunicaciones: { marketingOptIn: true },
    })).toBe(false);
  });

  test('se deja de preguntar tras agotar los aplazamientos', () => {
    if (sinDb) return console.warn('SKIP: DB not available');
    const base = { email: 'x@y.com', emailVerificado: true };
    const conAplazamientos = (n) => ({
      ...base,
      comunicaciones: { marketingOptIn: false, marketingPrompt: { aplazamientos: n } },
    });
    expect(marketingConsent.necesitaPrompt(conAplazamientos(marketingConsent.MAX_APLAZAMIENTOS - 1))).toBe(true);
    expect(marketingConsent.necesitaPrompt(conAplazamientos(marketingConsent.MAX_APLAZAMIENTOS))).toBe(false);
  });

  test('sin verificar el email no se le pregunta nada', () => {
    if (sinDb) return console.warn('SKIP: DB not available');
    expect(marketingConsent.necesitaPrompt({
      email: 'x@y.com', emailVerificado: false, comunicaciones: {},
    })).toBe(false);
  });
});
