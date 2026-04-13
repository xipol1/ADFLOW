const { ensureDb } = require('../../../lib/ensureDb');
module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await ensureDb();
    req.params = req.params || {};
    req.params.username = req.query.username;
    const { getChannelByUsername } = require('../../../controllers/channelsController');
    return getChannelByUsername(req, res);
  } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
};
