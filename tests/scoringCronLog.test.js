const mongoose = require('mongoose');
const ScoringCronLog = require('../models/ScoringCronLog');

function buildLog(overrides = {}) {
  return new ScoringCronLog({
    fechaInicio: new Date(),
    fechaFin: new Date(),
    canalesProcesados: 10,
    canalesActualizados: 9,
    errores: 1,
    duracionMs: 4200,
    ...overrides,
  });
}

describe('ScoringCronLog model', () => {
  test('valid entry passes validation', () => {
    expect(buildLog().validateSync()).toBeUndefined();
  });

  test('fechaInicio is required', () => {
    const log = buildLog({ fechaInicio: undefined });
    // Mongoose will auto-default via `default: Date.now`; validate it is set.
    expect(log.fechaInicio).toBeInstanceOf(Date);
  });

  test('engineVersion defaults to 2', () => {
    expect(buildLog().engineVersion).toBe(2);
  });

  test('trigger enum accepts scheduled/manual/campaign_completed only', () => {
    for (const t of ['scheduled', 'manual', 'campaign_completed']) {
      expect(buildLog({ trigger: t }).validateSync()).toBeUndefined();
    }
    const bad = buildLog({ trigger: 'bogus' });
    expect(bad.validateSync()).toBeDefined();
  });

  test('erroresDetalle holds { canalId, mensaje } subdocuments', () => {
    const log = buildLog({
      erroresDetalle: [{ canalId: new mongoose.Types.ObjectId(), mensaje: 'boom' }],
    });
    expect(log.validateSync()).toBeUndefined();
    expect(log.erroresDetalle[0].mensaje).toBe('boom');
  });

  test('has descending index on fechaInicio', () => {
    const indexes = ScoringCronLog.schema.indexes();
    expect(indexes.find(([spec]) => spec.fechaInicio === -1)).toBeDefined();
  });
});
