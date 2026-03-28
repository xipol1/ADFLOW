const database = require('../config/database');

const ensureDb = async () => {
  if (database.estaConectado()) return true;
  const ok = await database.conectar();
  return Boolean(ok);
};

module.exports = { ensureDb };

