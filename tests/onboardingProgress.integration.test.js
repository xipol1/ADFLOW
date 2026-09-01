process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

const request = require('supertest');
const app = require('../app');
const { registerVerifiedUser } = require('./helpers/registerVerifiedUser');

/**
 * F4 — onboarding progress derived from real state.
 *
 * The checklist used to compute every step in the browser from localStorage,
 * so progress reset on a browser change and the fiscal step disagreed with the
 * API in both directions: pending for a user whose datosFacturacion.completado
 * was true, done for a user that requiereDatosFacturacion would 403.
 */
describe('GET /api/onboarding/progreso — anunciante', () => {
  const id = Date.now();
  const email = `onb-adv-${id}@test.com`;
  const password = 'TestPass123';
  let token;
  let userId;

  beforeAll(async () => {
    const res = await registerVerifiedUser(app, {
      email, password, nombre: 'Onb Adv', role: 'advertiser', withFiscal: false,
    });
    token = res.token;
    userId = res.user.id;
  });

  const get = () => request(app).get('/api/onboarding/progreso').set('Authorization', `Bearer ${token}`);

  test('requiere autenticación', async () => {
    const res = await request(app).get('/api/onboarding/progreso');
    expect(res.status).toBe(401);
  });

  test('una cuenta nueva empieza con todos los pasos a false', async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.body.data.completados).toBe(0);
    expect(res.body.data.total).toBe(8);
    expect(res.body.data.pasos.fiscal).toBe(false);
    expect(res.body.data.pasos['first-campaign']).toBe(false);
  });

  test('el paso fiscal sale de datosFacturacion.completado, la misma fuente que exige la API', async () => {
    const Usuario = require('../models/Usuario');
    const user = await Usuario.findById(userId);
    user.datosFacturacion = {
      razonSocial: 'Test SL', nif: 'B12345678', direccion: 'Calle 1',
      cp: '28001', ciudad: 'Madrid', pais: 'ES',
    };
    await user.save(); // el pre-save calcula completado

    const res = await get();
    expect(res.body.data.pasos.fiscal).toBe(true);
    expect(res.body.data.completados).toBe(1);
  });

  test('el perfil de marca se persiste de verdad y cuenta como paso', async () => {
    // perfilAnunciante no existía en el esquema: cada escritura se descartaba
    // en silencio, que es por lo que el checklist leía un borrador local.
    const Usuario = require('../models/Usuario');
    await Usuario.updateOne({ _id: userId }, {
      $set: { perfilAnunciante: { nombreEmpresa: 'Test SL', industria: 'SaaS' } },
    });

    const guardado = await Usuario.findById(userId).select('perfilAnunciante').lean();
    expect(guardado.perfilAnunciante.nombreEmpresa).toBe('Test SL');

    const res = await get();
    expect(res.body.data.pasos.brand).toBe(true);
  });

  test('el objetivo de gasto, que no deja rastro, se puede marcar a mano', async () => {
    const res = await request(app)
      .post('/api/onboarding/progreso/paso')
      .set('Authorization', `Bearer ${token}`)
      .send({ paso: 'goal' });

    expect(res.status).toBe(200);
    expect(res.body.data.pasos.goal).toBe(true);
  });

  test('un paso derivable NO se puede marcar a mano', async () => {
    const res = await request(app)
      .post('/api/onboarding/progreso/paso')
      .set('Authorization', `Bearer ${token}`)
      .send({ paso: 'fiscal' });

    expect(res.status).toBe(400);
  });

  test('descartar el checklist se guarda en el usuario, no en el navegador', async () => {
    const res = await request(app)
      .post('/api/onboarding/progreso/descartar')
      .set('Authorization', `Bearer ${token}`)
      .send({ descartar: true });
    expect(res.status).toBe(200);

    const estado = await get();
    expect(estado.body.data.dismissedAt).toBeTruthy();
  });
});

describe('GET /api/onboarding/progreso — creador', () => {
  const id = Date.now() + 3;
  const email = `onb-cre-${id}@test.com`;
  const password = 'TestPass123';
  let token;
  let userId;

  beforeAll(async () => {
    const res = await registerVerifiedUser(app, {
      email, password, nombre: 'Onb Cre', role: 'creator', withFiscal: false,
    });
    token = res.token;
    userId = res.user.id;
  });

  const get = () => request(app).get('/api/onboarding/progreso').set('Authorization', `Bearer ${token}`);

  test('los pasos son los del rol creador', async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(8);
    expect(res.body.data.pasos).toHaveProperty('channel');
    expect(res.body.data.pasos).toHaveProperty('oauth');
    // 'goal' es del anunciante: no debe aparecer aquí.
    expect(res.body.data.pasos).not.toHaveProperty('goal');
  });

  test('registrar un canal marca el paso, sin que el cliente lo declare', async () => {
    const Canal = require('../models/Canal');
    await Canal.create({
      nombreCanal: `Canal Onb ${id}`,
      identificadorCanal: `canal_onb_${id}`,
      plataforma: 'telegram',
      propietario: userId,
      categoria: 'tech',
    });

    const res = await get();
    expect(res.body.data.pasos.channel).toBe(true);
  });

  test('el perfil público cuenta cuando dice algo de verdad', async () => {
    const Usuario = require('../models/Usuario');
    await Usuario.updateOne({ _id: userId }, { $set: { perfilCreador: { biografia: 'Hago recetas' } } });

    const res = await get();
    expect(res.body.data.pasos.profile).toBe(true);
  });

  test('un paso guardado a mano que en realidad es derivable se ignora', async () => {
    // Defensa contra la vuelta del bug: si alguien escribe 'fiscal' en
    // pasosCompletados, la verdad sigue siendo datosFacturacion.completado.
    const Usuario = require('../models/Usuario');
    await Usuario.updateOne({ _id: userId }, { $set: { 'onboarding.pasosCompletados': ['fiscal', 'channel'] } });

    const res = await get();
    expect(res.body.data.pasos.fiscal).toBe(false);
  });
});
