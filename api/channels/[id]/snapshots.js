const { ensureDb } = require('../../../lib/ensureDb');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    await ensureDb();
    req.params = req.params || {};
    req.params.id = req.query.id;
    const { getChannelSnapshots } = require('../../../controllers/channelsController');
    return getChannelSnapshots(req, res);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
