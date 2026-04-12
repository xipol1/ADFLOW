const { ensureDb } = require('../../lib/ensureDb');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const ok = await ensureDb();
    if (!ok) {
      // Return demo data
      const DEMO = [
        { id: 'demo-1', nombre: 'Crypto Alpha Signals', plataforma: 'telegram', categoria: 'cripto', audiencia: 120000, precio: 450, moneda: 'EUR', verificado: true, CAS: 72, nivel: 'GOLD' },
        { id: 'demo-2', nombre: 'Gaming Deals Hub', plataforma: 'discord', categoria: 'gaming', audiencia: 150000, precio: 650, moneda: 'EUR', verificado: false, CAS: 55, nivel: 'SILVER' },
        { id: 'demo-3', nombre: 'Ecom Growth ES', plataforma: 'whatsapp', categoria: 'negocios', audiencia: 80000, precio: 390, moneda: 'EUR', verificado: true, CAS: 63, nivel: 'GOLD' },
      ];
      return res.json({ success: true, data: DEMO, pagination: { pagina: 1, limite: 20, total: 3, totalPaginas: 1 } });
    }
    const { listChannels } = require('../../controllers/channelsController');
    return listChannels(req, res);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
