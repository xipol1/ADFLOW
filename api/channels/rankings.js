const { ensureDb } = require('../../lib/ensureDb');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const ok = await ensureDb();
    if (!ok) {
      return res.json({ success: true, data: { rankings: [], deltas: {} } });
    }
    const { getRankings } = require('../../controllers/channelsController');
    return getRankings(req, res);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
