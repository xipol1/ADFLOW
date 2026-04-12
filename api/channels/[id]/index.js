const { ensureDb } = require('../../../lib/ensureDb');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    await ensureDb();
    // Extract id from Vercel's dynamic route
    req.params = req.params || {};
    req.params.id = req.query.id;
    const { getChannelById } = require('../../../controllers/channelsController');
    return getChannelById(req, res);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
