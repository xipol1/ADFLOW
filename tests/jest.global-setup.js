const { MongoMemoryReplSet } = require('mongodb-memory-server');

module.exports = async () => {
  const mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
    binary: { version: '6.0.14' },
  });
  globalThis.__MMS__ = mongo;
  process.env.__MMS_URI__ = mongo.getUri();
};
