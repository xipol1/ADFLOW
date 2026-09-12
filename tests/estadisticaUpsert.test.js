/**
 * Guarda contra la fuga que agoto la cuota de Atlas en agosto de 2026.
 *
 * updateEstadisticaGlobal filtraba el upsert por rango ($gte/$lte) sobre
 * periodo.inicio/fin. Mongo no copia operadores al documento que inserta, asi
 * que el doc nuevo nacia sin `periodo`, la siguiente sync no lo encontraba y
 * volvia a insertar. Resultado: un documento nuevo por canal y por pasada,
 * 889.064 documentos con CERO `periodo`, y el cluster bloqueando escrituras.
 */
const mongoose = require('mongoose');
const { useMongo } = require('./helpers/useMongo');
const Estadistica = require('../models/Estadistica');
const socialSync = require('../services/SocialSyncService');

describe('SocialSyncService.updateEstadisticaGlobal', () => {
  useMongo();

  test('reutiliza el documento del dia en vez de insertar uno nuevo en cada sync', async () => {
    const entidadId = new mongoose.Types.ObjectId();

    await socialSync.updateEstadisticaGlobal(entidadId, 'CANAL', { seguidores: 100 });
    await socialSync.updateEstadisticaGlobal(entidadId, 'CANAL', { seguidores: 150 });
    await socialSync.updateEstadisticaGlobal(entidadId, 'CANAL', { seguidores: 200 });

    const docs = await Estadistica.find({ entidadId, tipoEntidad: 'CANAL' });
    expect(docs).toHaveLength(1);
    expect(docs[0].metricas.alcance).toBe(200);
  });

  test('graba el periodo en el documento insertado', async () => {
    const entidadId = new mongoose.Types.ObjectId();

    await socialSync.updateEstadisticaGlobal(entidadId, 'CANAL', { seguidores: 10 });

    const doc = await Estadistica.findOne({ entidadId });
    expect(doc.periodo?.inicio).toBeInstanceOf(Date);
    expect(doc.periodo?.fin).toBeInstanceOf(Date);
    expect(doc.periodo.inicio.getHours()).toBe(0);
    expect(doc.periodo.fin.getTime()).toBeGreaterThan(doc.periodo.inicio.getTime());
  });

  test('separa por entidad: dos canales no comparten documento', async () => {
    const a = new mongoose.Types.ObjectId();
    const b = new mongoose.Types.ObjectId();

    await socialSync.updateEstadisticaGlobal(a, 'CANAL', { seguidores: 1 });
    await socialSync.updateEstadisticaGlobal(b, 'CANAL', { seguidores: 2 });

    expect(await Estadistica.countDocuments({ entidadId: { $in: [a, b] } })).toBe(2);
  });
});
