require('dotenv').config();

const databaseConfig = require('../config/database');
const Usuario = require('../models/Usuario');

async function run() {
  await databaseConfig.conectar();

  const toCreator = await Usuario.updateMany(
    { rol: 'creador' },
    { $set: { rol: 'creator' } }
  );

  const toAdvertiser = await Usuario.updateMany(
    { rol: 'anunciante' },
    { $set: { rol: 'advertiser' } }
  );

  console.log('Migración de roles completada', {
    creador_a_creator: toCreator.modifiedCount ?? toCreator.nModified,
    anunciante_a_advertiser: toAdvertiser.modifiedCount ?? toAdvertiser.nModified
  });

  await databaseConfig.desconectar();
}

run().catch(async (error) => {
  console.error('Error en migración de roles:', error);
  try {
    await databaseConfig.desconectar();
  } catch (e) {}
  process.exit(1);
});
