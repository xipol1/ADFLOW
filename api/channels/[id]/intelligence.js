const { ensureDb } = require('../../../lib/ensureDb');
module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await ensureDb();
    const { buildChannelIntelligence } = require('../../../services/channelIntelligenceService');
    const id = req.query.id;
    if (!id || !/^[a-f\d]{24}$/i.test(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }
    const data = await buildChannelIntelligence(id);
    if (!data) return res.status(404).json({ success: false, message: 'Canal no encontrado' });
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    return res.json({ success: true, data });
  } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
};
