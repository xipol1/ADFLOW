const crypto = require('crypto');
const { readCollection, writeCollection } = require('./persistentStore');
const { createApiError } = require('../lib/partnerApiHttp');

const PARTNERS_COLLECTION = 'partners';
const PARTNER_CAMPAIGNS_COLLECTION = 'partner_campaigns';
const PARTNER_API_LOGS_COLLECTION = 'partner_api_logs';
const PAYMENT_SESSIONS_COLLECTION = 'partner_payment_sessions';
const CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  PAID: 'paid',
  PUBLISHED: 'published',
  CONFIRMED: 'confirmed',
  FUNDS_RELEASED: 'funds_released',
  CANCELLED: 'cancelled'
};

const sampleInventory = [
  {
    id: 'demo-ch-crypto-alpha-signals',
    nombre: 'Crypto Alpha Signals',
    plataforma: 'telegram',
    categoria: 'cripto',
    audiencia: 120000,
    precio: 450,
    moneda: 'EUR',
    verificado: true
  },
  {
    id: 'demo-ch-ecom-growth-es',
    nombre: 'Ecom Growth ES',
    plataforma: 'whatsapp',
    categoria: 'negocios',
    audiencia: 80000,
    precio: 390,
    moneda: 'EUR',
    verificado: true
  }
];

const hashApiKey = (apiKey) => crypto.createHash('sha256').update(String(apiKey || '')).digest('hex');

const readPartners = () => readCollection(PARTNERS_COLLECTION, []);
const savePartners = (items) => writeCollection(PARTNERS_COLLECTION, items);
const readCampaigns = () => readCollection(PARTNER_CAMPAIGNS_COLLECTION, []);
const saveCampaigns = (items) => writeCollection(PARTNER_CAMPAIGNS_COLLECTION, items);
const readLogs = () => readCollection(PARTNER_API_LOGS_COLLECTION, []);
const saveLogs = (items) => writeCollection(PARTNER_API_LOGS_COLLECTION, items);
const readPaymentSessions = () => readCollection(PAYMENT_SESSIONS_COLLECTION, []);
const savePaymentSessions = (items) => writeCollection(PAYMENT_SESSIONS_COLLECTION, items);

const normalizeIp = (ip) => String(ip || '').replace('::ffff:', '').trim();

const maskSensitiveData = (value) => {
  if (!value || typeof value !== 'object') return value;
  const clone = JSON.parse(JSON.stringify(value));
  const protectedKeys = ['authorization', 'apiKey', 'api_key', 'token', 'secret', 'password'];

  const visit = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    Object.keys(obj).forEach((key) => {
      if (protectedKeys.some((needle) => key.toLowerCase().includes(needle.toLowerCase()))) {
        obj[key] = '********';
        return;
      }
      if (typeof obj[key] === 'object') visit(obj[key]);
    });
  };

  visit(clone);
  return clone;
};

const safeEqualHex = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ''), 'hex');
  const rightBuffer = Buffer.from(String(right || ''), 'hex');
  if (leftBuffer.length === 0 || leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const getPartnerByApiKey = (apiKey) => {
  const apiKeyHash = hashApiKey(apiKey);
  return readPartners().find((partner) => safeEqualHex(partner.apiKeyHash, apiKeyHash)) || null;
};

const isIpAllowed = (partner, ip) => {
  const allowedIps = Array.isArray(partner.allowedIps) ? partner.allowedIps : [];
  if (allowedIps.length === 0) return true;
  const clientIp = normalizeIp(ip);
  return allowedIps.includes('*') || allowedIps.map(normalizeIp).includes(clientIp);
};

const touchPartnerUsage = (partnerId, ip) => {
  const partners = readPartners();
  const index = partners.findIndex((partner) => partner.id === partnerId);
  if (index === -1) return;
  partners[index].lastUsedAt = new Date().toISOString();
  partners[index].lastIp = normalizeIp(ip);
  savePartners(partners);
};

const registerApiLog = ({ partnerId, ip, method, path, statusCode, requestBody, responseBody }) => {
  const logs = readLogs();
  logs.push({
    id: `pal-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    partnerId,
    ip: normalizeIp(ip),
    method,
    path,
    statusCode,
    requestBody: maskSensitiveData(requestBody),
    responseBody: maskSensitiveData(responseBody),
    createdAt: new Date().toISOString()
  });
  saveLogs(logs);
};

const listInventory = ({ plataforma = '', categoria = '', page = 1, limit = 10 }) => {
  let items = sampleInventory.filter((item) => item.verificado === true);

  if (plataforma) items = items.filter((item) => item.plataforma === plataforma);
  if (categoria) items = items.filter((item) => item.categoria === categoria);

  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 20);
  const safePage = Math.max(Number(page) || 1, 1);
  const start = (safePage - 1) * safeLimit;
  const paginated = items.slice(start, start + safeLimit);

  return {
    items: paginated.map((item) => ({
      id: item.id,
      nombre: item.nombre,
      plataforma: item.plataforma,
      categoria: item.categoria,
      audiencia: item.audiencia,
      precio: item.precio,
      moneda: item.moneda,
      verificado: item.verificado
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / safeLimit))
    }
  };
};

const getAvailableActions = (campaign) => {
  switch (campaign.status) {
    case CAMPAIGN_STATUS.DRAFT:
      return campaign.paymentSessionId ? ['confirm_payment'] : ['create_payment_session'];
    case CAMPAIGN_STATUS.PAID:
      return ['register_publication'];
    case CAMPAIGN_STATUS.PUBLISHED:
      return ['confirm_execution', 'read_metrics'];
    case CAMPAIGN_STATUS.CONFIRMED:
      return ['release_funds', 'read_metrics'];
    case CAMPAIGN_STATUS.FUNDS_RELEASED:
      return ['read_metrics'];
    default:
      return [];
  }
};

const serializeCampaign = (campaign) => ({
  ...campaign,
  workflow: {
    status: campaign.status,
    paymentStatus: campaign.paymentStatus,
    escrowStatus: campaign.escrowStatus,
    availableActions: getAvailableActions(campaign)
  }
});

const getCampaignsForPartner = (partnerId) => readCampaigns()
  .filter((item) => item.partnerId === partnerId)
  .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
  .map(serializeCampaign);

const getCampaignForPartner = (partnerId, campaignId) => {
  const item = readCampaigns().find((campaign) => campaign.partnerId === partnerId && campaign.id === campaignId);
  return item ? serializeCampaign(item) : null;
};

const createCampaignForPartner = (partner, payload) => {
  const channel = sampleInventory.find((item) => item.id === payload.channelId && item.verificado === true);
  if (!channel) {
    throw createApiError(400, 'CHANNEL_NOT_AVAILABLE', 'Canal no disponible para integracion externa');
  }

  const budget = Number(payload.budget);
  if (!Number.isFinite(budget) || budget <= 0) {
    throw createApiError(400, 'INVALID_BUDGET', 'Budget invalido');
  }

  const externalReference = String(payload.externalReference || '').trim();
  const duplicateByExternalReference = readCampaigns().find((item) => item.partnerId === partner.id && item.externalReference && item.externalReference === externalReference);
  if (externalReference && duplicateByExternalReference) {
    throw createApiError(409, 'EXTERNAL_REFERENCE_CONFLICT', 'externalReference ya existe para este partner');
  }

  const now = new Date().toISOString();
  const campaigns = readCampaigns();
  const campaign = {
    id: `pcmp-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    partnerId: partner.id,
    partnerName: partner.name,
    externalReference,
    title: String(payload.title || '').trim(),
    description: String(payload.description || '').trim(),
    targetUrl: String(payload.targetUrl || '').trim(),
    channelId: channel.id,
    channelSnapshot: {
      id: channel.id,
      nombre: channel.nombre,
      plataforma: channel.plataforma,
      categoria: channel.categoria,
      precio: channel.precio,
      moneda: channel.moneda
    },
    budget,
    currency: String(payload.currency || channel.moneda || 'EUR').toUpperCase(),
    status: CAMPAIGN_STATUS.DRAFT,
    paymentStatus: 'pending',
    escrowStatus: 'awaiting_payment',
    createdAt: now,
    updatedAt: now,
    auditTrail: [
      {
        at: now,
        action: 'campaign.created',
        actor: partner.name
      }
    ]
  };

  campaigns.push(campaign);
  saveCampaigns(campaigns);
  return serializeCampaign(campaign);
};

const updateCampaignForPartner = (partnerId, campaignId, updater) => {
  const campaigns = readCampaigns();
  const index = campaigns.findIndex((item) => item.partnerId === partnerId && item.id === campaignId);
  if (index === -1) {
    throw createApiError(404, 'CAMPAIGN_NOT_FOUND', 'Campana no encontrada');
  }
  const next = updater({ ...campaigns[index] });
  next.updatedAt = new Date().toISOString();
  campaigns[index] = next;
  saveCampaigns(campaigns);
  return serializeCampaign(next);
};

const createPaymentSession = (partnerId, campaignId, provider = 'stripe') => {
  const campaign = readCampaigns().find((item) => item.partnerId === partnerId && item.id === campaignId);
  if (!campaign) {
    throw createApiError(404, 'CAMPAIGN_NOT_FOUND', 'Campana no encontrada');
  }
  if (campaign.status !== CAMPAIGN_STATUS.DRAFT) {
    throw createApiError(409, 'INVALID_STATE', 'La sesion de pago solo puede generarse para campanas en draft');
  }

  const sessions = readPaymentSessions();
  const existingSession = sessions.find((item) => item.partnerId === partnerId && item.campaignId === campaignId && item.status === 'pending');
  if (existingSession) {
    return updateCampaignForPartner(partnerId, campaignId, (current) => ({
      ...current,
      paymentSessionId: existingSession.id,
      escrowStatus: 'awaiting_payment_confirmation'
    }));
  }
  const session = {
    id: `pps-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    campaignId,
    partnerId,
    provider: String(provider || 'stripe').toLowerCase(),
    amount: campaign.budget,
    currency: campaign.currency,
    status: 'pending',
    escrowStatus: 'held',
    createdAt: new Date().toISOString()
  };
  sessions.push(session);
  savePaymentSessions(sessions);

  return updateCampaignForPartner(partnerId, campaignId, (current) => ({
    ...current,
    paymentStatus: 'pending',
    escrowStatus: 'awaiting_payment_confirmation',
    paymentSessionId: session.id,
    auditTrail: current.auditTrail.concat({
      at: new Date().toISOString(),
      action: 'payment.session.created',
      actor: 'system',
      metadata: { provider: session.provider, sessionId: session.id }
    })
  }));
};

const confirmPayment = (partnerId, campaignId, payload) => {
  const paymentReference = String(payload.paymentReference || '').trim();
  if (!paymentReference) {
    throw createApiError(400, 'PAYMENT_REFERENCE_REQUIRED', 'paymentReference es obligatorio');
  }

  return updateCampaignForPartner(partnerId, campaignId, (current) => {
    if (current.status !== CAMPAIGN_STATUS.DRAFT) {
      throw createApiError(409, 'INVALID_STATE', 'El pago solo puede confirmarse desde draft');
    }
    if (!current.paymentSessionId) {
      throw createApiError(409, 'PAYMENT_SESSION_REQUIRED', 'No existe una sesion de pago previa');
    }
    return {
      ...current,
      status: CAMPAIGN_STATUS.PAID,
      paymentStatus: 'confirmed',
      escrowStatus: 'held',
      paymentReference,
      auditTrail: current.auditTrail.concat({
        at: new Date().toISOString(),
        action: 'payment.confirmed',
        actor: 'partner',
        metadata: { paymentReference }
      })
    };
  });
};

const registerPublication = (partnerId, campaignId, payload) => updateCampaignForPartner(partnerId, campaignId, (current) => {
  if (current.status !== CAMPAIGN_STATUS.PAID) {
    throw createApiError(409, 'INVALID_STATE', 'La campana debe estar pagada antes de registrar la publicacion');
  }

  const publicationId = String(payload.publicationId || '').trim();
  const publishedAt = String(payload.publishedAt || '').trim();

  if (!publicationId || !publishedAt) {
    throw createApiError(400, 'INVALID_PUBLICATION_PAYLOAD', 'publicationId y publishedAt son obligatorios');
  }

  return {
    ...current,
    status: CAMPAIGN_STATUS.PUBLISHED,
    publication: {
      publicationId,
      publishedAt,
      evidenceUrl: String(payload.evidenceUrl || '').trim()
    },
    auditTrail: current.auditTrail.concat({
      at: new Date().toISOString(),
      action: 'publication.registered',
      actor: 'partner',
      metadata: { publicationId }
    })
  };
});

const confirmExecution = (partnerId, campaignId, payload) => updateCampaignForPartner(partnerId, campaignId, (current) => {
  if (current.status !== CAMPAIGN_STATUS.PUBLISHED) {
    throw createApiError(409, 'INVALID_STATE', 'La campana debe estar publicada antes de confirmar la ejecucion');
  }

  return {
    ...current,
    status: CAMPAIGN_STATUS.CONFIRMED,
    execution: {
      confirmedAt: String(payload.confirmedAt || new Date().toISOString()),
      notes: String(payload.notes || '').trim()
    },
    auditTrail: current.auditTrail.concat({
      at: new Date().toISOString(),
      action: 'execution.confirmed',
      actor: 'partner'
    })
  };
});

const releaseFunds = (partnerId, campaignId) => updateCampaignForPartner(partnerId, campaignId, (current) => {
  if (current.status !== CAMPAIGN_STATUS.CONFIRMED) {
    throw createApiError(409, 'INVALID_STATE', 'Los fondos solo pueden liberarse tras la confirmacion de ejecucion');
  }

  return {
    ...current,
    status: CAMPAIGN_STATUS.FUNDS_RELEASED,
    escrowStatus: 'released',
    releasedAt: new Date().toISOString(),
    auditTrail: current.auditTrail.concat({
      at: new Date().toISOString(),
      action: 'escrow.released',
      actor: 'system'
    })
  };
});

const getCampaignMetrics = (partnerId, campaignId) => {
  const campaign = getCampaignForPartner(partnerId, campaignId);
  if (!campaign) {
    throw createApiError(404, 'CAMPAIGN_NOT_FOUND', 'Campana no encontrada');
  }
  if (![CAMPAIGN_STATUS.PUBLISHED, CAMPAIGN_STATUS.CONFIRMED, CAMPAIGN_STATUS.FUNDS_RELEASED].includes(campaign.status)) {
    throw createApiError(409, 'METRICS_NOT_AVAILABLE', 'Las metricas solo estan disponibles tras la publicacion');
  }

  return {
    campaignId: campaign.id,
    status: campaign.status,
    metrics: {
      impressions: 0,
      clicks: 0,
      ctr: 0,
      conversions: 0
    },
    publication: campaign.publication || null,
    updatedAt: campaign.updatedAt
  };
};

module.exports = {
  PARTNERS_COLLECTION,
  CAMPAIGN_STATUS,
  hashApiKey,
  getPartnerByApiKey,
  isIpAllowed,
  touchPartnerUsage,
  registerApiLog,
  listInventory,
  getCampaignsForPartner,
  getCampaignForPartner,
  createCampaignForPartner,
  createPaymentSession,
  confirmPayment,
  registerPublication,
  confirmExecution,
  releaseFunds,
  getCampaignMetrics,
  readPartners,
  savePartners
};
