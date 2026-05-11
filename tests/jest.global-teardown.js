module.exports = async () => {
  const mongo = globalThis.__MMS__;
  if (mongo) {
    try { await mongo.stop(); } catch { /* noop */ }
  }
};
