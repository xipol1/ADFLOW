const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  const mongo = await MongoMemoryServer.create({ binary: { version: '6.0.14' } });
  globalThis.__MMS__ = mongo;
  process.env.__MMS_URI__ = mongo.getUri();
};
