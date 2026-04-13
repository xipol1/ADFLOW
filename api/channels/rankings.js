const { ensureDb } = require('../../lib/ensureDb');
module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await ensureDb();
    const { getRankings } = require('../../controllers/channelsController');
    return getRankings(req, res);
  } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
};
