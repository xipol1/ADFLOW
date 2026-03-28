const sampleChannels = [
  {
    id: 'demo-ch-crypto-alpha-signals',
    nombre: 'Crypto Alpha Signals',
    plataforma: 'telegram',
    categoria: 'cripto',
    audiencia: 120000,
    precio: 450,
    moneda: 'EUR',
    verificado: true,
    url: 'https://t.me/cryptoalphasignals'
  },
  {
    id: 'demo-ch-gaming-deals-hub',
    nombre: 'Gaming Deals Hub',
    plataforma: 'discord',
    categoria: 'gaming',
    audiencia: 150000,
    precio: 650,
    moneda: 'EUR',
    verificado: false,
    url: 'https://discord.gg/gamingdeals'
  },
  {
    id: 'demo-ch-ecom-growth-es',
    nombre: 'Ecom Growth ES',
    plataforma: 'whatsapp',
    categoria: 'negocios',
    audiencia: 80000,
    precio: 390,
    moneda: 'EUR',
    verificado: true,
    url: 'https://wa.me/00000000000'
  }
];

const normalizeBool = (value) => {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return null;
};

const listChannels = async (req, res) => {
  const pagina = Number(req.query?.pagina || 1);
  const limite = Number(req.query?.limite || 20);
  const plataforma = req.query?.plataforma ? String(req.query.plataforma).toLowerCase() : '';
  const verificado = normalizeBool(req.query?.verificado);

  let items = sampleChannels.slice();

  if (plataforma) items = items.filter((channel) => channel.plataforma === plataforma);
  if (verificado !== null) items = items.filter((channel) => channel.verificado === verificado);

  const total = items.length;
  const start = (Math.max(pagina, 1) - 1) * Math.max(limite, 1);
  const paginados = items.slice(start, start + Math.max(limite, 1));

  return res.json({
    success: true,
    data: paginados,
    pagination: {
      pagina,
      limite,
      total,
      totalPaginas: Math.max(1, Math.ceil(total / Math.max(limite, 1)))
    }
  });
};

const getChannelById = async (req, res) => {
  const { id } = req.params;
  const channel = sampleChannels.find((item) => item.id === id);

  if (!channel) {
    return res.status(404).json({
      success: false,
      message: 'Canal no encontrado'
    });
  }

  return res.json({ success: true, data: channel });
};

module.exports = {
  listChannels,
  getChannelById
};
