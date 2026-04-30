// Pure schema tests for the datosFacturacion subdocument.
// We don't try to fire the pre-save hook in isolation (Mongoose's internal
// hook dispatch is version-fragile). The hook is exercised end-to-end by
// fiscalProfile.integration.test.js when a database is available.

const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');

describe('Usuario.datosFacturacion schema', () => {
  test('subdocument is created with sensible defaults', () => {
    const u = new Usuario({ email: 'a@b.com', password: 'x' });
    expect(u.datosFacturacion).toBeDefined();
    expect(u.datosFacturacion.razonSocial).toBe('');
    expect(u.datosFacturacion.pais).toBe('ES');
    expect(u.datosFacturacion.esEmpresa).toBe(true);
    expect(u.datosFacturacion.completado).toBe(false);
    expect(u.datosFacturacion.viesValidado).toBe(false);
  });

  test('uppercase coercion on nif and pais', () => {
    const u = new Usuario({
      email: 'a@b.com',
      password: 'x',
      datosFacturacion: { nif: 'b58378431', pais: 'es' },
    });
    expect(u.datosFacturacion.nif).toBe('B58378431');
    expect(u.datosFacturacion.pais).toBe('ES');
  });

  test('lowercase coercion on emailFacturacion', () => {
    const u = new Usuario({
      email: 'a@b.com',
      password: 'x',
      datosFacturacion: { emailFacturacion: 'BILL@TEST.COM' },
    });
    expect(u.datosFacturacion.emailFacturacion).toBe('bill@test.com');
  });

  test('trim coercion on text fields', () => {
    const u = new Usuario({
      email: 'a@b.com',
      password: 'x',
      datosFacturacion: { razonSocial: '  My Company SL  ', ciudad: '  Madrid  ' },
    });
    expect(u.datosFacturacion.razonSocial).toBe('My Company SL');
    expect(u.datosFacturacion.ciudad).toBe('Madrid');
  });

  afterAll(async () => {
    await mongoose.disconnect().catch(() => {});
  });
});
