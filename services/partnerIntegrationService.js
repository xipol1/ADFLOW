/**
 * Partner Integration Service — Contract-compliant implementation
 *
 * Implements the mandatory flow from contract clause 5.1:
 *   Create Campaign → Select Channel → Payment (Stripe escrow) → Publication → Confirmation → Fund Release
 *
 * All operations use MongoDB models (Canal, Campaign, Transaccion, Tracking, Partner, PartnerAuditLog).
 * Stripe PaymentIntents with manual capture for escrow (clause 6.2).
 * Audit trail for all operations (clause 3.3).
 * Anti-bypass: no contact info exposed (clause 13).
 */
const crypto = require('crypto');
const { ensureDb } = require('../lib/ensureDb');
const { createApiError } = require('../lib/partnerApiHttp');

// ── Helpers ────────────────────────────────────────────────────────────────────

const hashApiKey = (apiKey) => crypto.createHash('sha256').update(String(apiKey || '')).digest('hex');

const safeEqualHex = (left, right) => {
  const leftBuf = Buffer.from(String(left || ''), 'hex');
  const rightBuf = Buffer.from(String(right || ''), 'hex');
  if (leftBuf.length === 0 || leftBuf.length !== rightBuf.length) return false;
  return crypto.timingSafeEqual(leftBuf, rightBuf);
};

const normalizeIp = (ip) => String(ip || '').replace('::ffff:', '').trim();

const SENSITIVE_KEYS = ['authorization', 'apikey', 'api_key', 'token', 'secret', 'password', 'stripe'];
const maskSensitiveData = (value) => {
  if (!value || typeof value !== 'object') return value;
  try {
    const clone = JSON.parse(JSON.stringify(value));
    const visit = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      for (const key of Object.keys(obj)) {
        if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k))) { obj[key] = '***'; continue; }
        if (typeof obj[key] === 'object') visit(obj[key]);
      }
    };
    visit(clone);
    return clone;
  } catch { return '[unserializable]'; }
};

// ── Audit trail (contract clause 3.3) ──────────────────────────────────────────

const audit = async (partnerId, action, extra = {}) => {
  try {
    await ensureDb();
    const PartnerAuditLog = require('../models/PartnerAuditLog');
    await PartnerAuditLog.create({
      partner: partnerId,
      action,
      method: extra.method || '',
      path: extra.path || '',
      statusCode: extra.statusCode || 0,
      ip: normalizeIp(extra.ip || ''),
      campaignId: extra.campaignId || null,
      requestBody: extra.requestBody ? maskSensitiveData(extra.requestBody) : null,
      metadata: extra.metadata || {},
      error: extra.error || null
    });
  } catch (_) { /* audit must never block the main flow */ }
};

// ── Partner auth (from MongoDB) ────────────────────────────────────────────────

const getPartnerByApiKey = async (apiKey) => {
  await ensureDb();
  const Partner = require('../models/Partner');
  const apiKeyHash = hashApiKey(apiKey);
  const partners = await Partner.find({ status: 'active' }).lean();
  return partners.find((p) => safeEqualHex(p.apiKeyHash, apiKeyHash)) || null;
};

const isIpAllowed = (partner, ip) => {
  const allowed = Array.isArray(partner.allowedIps) ? partner.allowedIps : [];
  if (allowed.length === 0) return true;
  const clientIp = normalizeIp(ip);
  return allowed.includes('*') || allowed.map(normalizeIp).includes(clientIp);
};

const touchPartnerUsage = async (partnerId, ip) => {
  try {
    await ensureDb();
    const Partner = require('../models/Partner');
    await Partner.findByIdAndUpdate(partnerId, { lastUsedAt: new Date(), lastIp: normalizeIp(ip) });
  } catch (_) { /* non-blocking */ }
};

// ── API request logging (clause 3.3 audit) ─────────────────────────────────────

const registerApiLog = async ({ partnerId, ip, method, path, statusCode, requestBody }) => {
  await audit(partnerId, 'api.request', { method, path, statusCode, ip, requestBody });
};

// ── Channels (real DB, anti-bypass clause 13) ──────────────────────────────────

const listChannels = async ({ plataforma, categoria, page = 1, limit = 20, search } = {}) => {
  await ensureDb();
  const Canal = require('../models/Canal');

  const filter = {};
  if (plataforma) filter.plataforma = plataforma.toLowerCase();
  if (categoria) filter.categoria = { $regex: new RegExp(categoria, 'i') };
  if (search) {
    filter.$or = [
      { nombreCanal: { $regex: new RegExp(search, 'i') } },
      { descripcion: { $regex: new RegExp(search, 'i') } }
    ];
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  // Contract clause 13 & 4.3: never expose contact info, credentials, identifiers
  const safeProjection = 'nombreCanal plataforma categoria descripcion estadisticas.seguidores createdAt';

  const [items, total] = await Promise.all([
    Canal.find(filter)
      .select(safeProjection)
      .sort({ 'estadisticas.seguidores': -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Canal.countDocuments(filter)
  ]);

  return {
    items: items.map((ch) => ({
      id: ch._id.toString(),
      name: ch.nombreCanal || '',
      platform: ch.plataforma,
      category: ch.categoria,
      description: (ch.descripcion || '').slice(0, 500),
      followers: ch.estadisticas?.seguidores || 0,
      createdAt: ch.createdAt
      // NO URLs, NO contact info, NO credentials, NO owner info (clause 13)
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit))
    }
  };
};

const getChannel = async (channelId) => {
  await ensureDb();
  const Canal = require('../models/Canal');
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(channelId)) return null;
  const ch = await Canal.findById(channelId)
    .select('nombreCanal plataforma categoria descripcion estadisticas.seguidores createdAt')
    .lean();
  if (!ch) return null;
  return {
    id: ch._id.toString(),
    name: ch.nombreCanal,
    platform: ch.plataforma,
    category: ch.categoria,
    description: (ch.descripcion || '').slice(0, 500),
    followers: ch.estadisticas?.seguidores || 0,
    createdAt: ch.createdAt
  };
};

// ── Stripe escrow helpers (clause 6) ─────────────────────────────────────��─────

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw createApiError(503, 'PAYMENT_UNAVAILABLE', 'Servicio de pagos no configurado');
  return require('stripe')(key);
};

const createEscrowPaymentIntent = async (amount, currency, metadata) => {
  const stripe = getStripe();
  // Manual capture = escrow: funds authorized but not captured until confirmation
  const pi = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Stripe uses cents
    currency: (currency || 'eur').toLowerCase(),
    capture_method: 'manual',
    metadata: {
      ...metadata,
      platform: 'adflow',
      type: 'partner_campaign_escrow'
    },
    description: `AdFlow Partner Campaign Escrow — ${metadata.campaignId || 'new'}`
  });
  return pi;
};

const captureEscrowPayment = async (paymentIntentId) => {
  const stripe = getStripe();
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (pi.status === 'requires_capture') {
    return await stripe.paymentIntents.capture(paymentIntentId);
  }
  if (pi.status === 'succeeded') return pi; // already captured
  throw createApiError(409, 'CAPTURE_FAILED', `PaymentIntent status: ${pi.status}, cannot capture`);
};

const cancelEscrowPayment = async (paymentIntentId) => {
  const stripe = getStripe();
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (['requires_capture', 'requires_payment_method', 'requires_confirmation'].includes(pi.status)) {
      return await stripe.paymentIntents.cancel(paymentIntentId);
    }
    // If already succeeded, issue refund
    if (pi.status === 'succeeded') {
      return await stripe.refunds.create({ payment_intent: paymentIntentId });
    }
  } catch (err) {
    console.error('[partner] Stripe cancel/refund error:', err.message);
  }
};

// ── Partner user management ────────────────────────────────────────────────────

const getOrCreatePartnerUser = async (partner) => {
  const Usuario = require('../models/Usuario');
  const email = `partner+${partner.slug}@adflow.internal`;

  let user = await Usuario.findOne({ email }).lean();
  if (user) return user;

  const bcrypt = require('bcryptjs');
  const randomPass = crypto.randomBytes(32).toString('hex');
  const hashedPass = await bcrypt.hash(randomPass, 10);

  user = await Usuario.create({
    nombre: partner.name,
    email,
    password: hashedPass,
    rol: 'advertiser',
    emailVerificado: true
  });

  return user;
};

// ── Campaign CRUD (contract clause 5.1 mandatory flow) ─────────────────────────

/**
 * Contract mandatory flow (clause 5.1):
 *   DRAFT → (payment) → PAID → (publication) → PUBLISHED → (confirmation) → COMPLETED (funds released)
 *   Any state → CANCELLED (with refund if payment was made)
 */

const createCampaign = async (partner, payload) => {
  await ensureDb();
  const Canal = require('../models/Canal');
  const Campaign = require('../models/Campaign');
  const Transaccion = require('../models/Transaccion');
  const mongoose = require('mongoose');

  const channelId = String(payload.channelId || '').trim();
  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw createApiError(400, 'INVALID_CHANNEL', 'channelId invalido');
  }

  const canal = await Canal.findById(channelId).select('_id propietario nombreCanal plataforma categoria').lean();
  if (!canal) throw createApiError(404, 'CHANNEL_NOT_FOUND', 'Canal no encontrado');

  const price = Number(payload.budget || payload.price);
  if (!Number.isFinite(price) || price <= 0) {
    throw createApiError(400, 'INVALID_BUDGET', 'Budget/price invalido');
  }

  const content = String(payload.content || payload.title || '').trim();
  const targetUrl = String(payload.targetUrl || '').trim();
  if (!content) throw createApiError(400, 'CONTENT_REQUIRED', 'content o title requerido');
  if (!targetUrl) throw createApiError(400, 'TARGET_URL_REQUIRED', 'targetUrl requerido');

  // Duplicate external reference check
  const externalRef = String(payload.externalReference || '').trim() || null;
  if (externalRef) {
    const existing = await Campaign.findOne({ partner: partner._id, partnerExternalRef: externalRef }).lean();
    if (existing) throw createApiError(409, 'EXTERNAL_REFERENCE_CONFLICT', 'externalReference ya existe');
  }

  const advertiserUser = await getOrCreatePartnerUser(partner);
  const deadline = payload.deadline ? new Date(payload.deadline) : null;
  const commissionRate = partner.commissionOverride != null ? partner.commissionOverride : 0.10;

  const campaign = await Campaign.create({
    advertiser: advertiserUser._id,
    channel: canal._id,
    content,
    targetUrl,
    price,
    commissionRate,
    deadline,
    status: 'DRAFT',
    partner: partner._id,
    partnerExternalRef: externalRef,
    createdAt: new Date()
  });

  // Create pending transaction record
  await Transaccion.create({
    campaign: campaign._id,
    advertiser: advertiserUser._id,
    creator: canal.propietario,
    amount: price,
    tipo: 'pago',
    status: 'pending',
    description: `Partner campaign via ${partner.name}`
  });

  // Audit
  await audit(partner._id, 'campaign.created', {
    campaignId: campaign._id,
    metadata: { channelId, price, externalRef }
  });

  // Notify channel owner
  try {
    const notificationService = require('./notificationService');
    if (canal.propietario) {
      await notificationService.enviarNotificacion({
        usuarioId: canal.propietario,
        tipo: 'campana.nueva',
        titulo: 'Nueva campana de partner',
        mensaje: `${partner.name} quiere publicar en tu canal por $${price}`,
        datos: { campaignId: campaign._id },
        canales: ['database', 'realtime'],
        prioridad: 'normal'
      });
    }
  } catch (_) { /* non-blocking */ }

  return serializeCampaign(campaign.toObject(), canal);
};

// ── Payment: create Stripe escrow (clause 6.1, 6.2) ───────────────────────────

const createPaymentSession = async (partnerId, campaignId) => {
  await ensureDb();
  const Campaign = require('../models/Campaign');
  const mongoose = require('mongoose');

  if (!mongoose.Types.ObjectId.isValid(campaignId)) {
    throw createApiError(404, 'CAMPAIGN_NOT_FOUND', 'Campana no encontrada');
  }

  const campaign = await Campaign.findOne({ _id: campaignId, partner: partnerId });
  if (!campaign) throw createApiError(404, 'CAMPAIGN_NOT_FOUND', 'Campana no encontrada');
  if (campaign.status !== 'DRAFT') {
    throw createApiError(409, 'INVALID_STATE', 'Solo se puede crear sesion de pago en estado DRAFT');
  }

  // If already has a PaymentIntent, return the existing client_secret
  if (campaign.stripePaymentIntentId) {
    const stripe = getStripe();
    const existing = await stripe.paymentIntents.retrieve(campaign.stripePaymentIntentId);
    return {
      paymentIntentId: existing.id,
      clientSecret: existing.client_secret,
      amount: existing.amount,
      currency: existing.currency,
      status: existing.status
    };
  }

  // Create PaymentIntent with manual capture (escrow)
  const pi = await createEscrowPaymentIntent(campaign.price, 'eur', {
    campaignId: campaign._id.toString(),
    partnerId: partnerId.toString(),
    channelId: campaign.channel.toString()
  });

  campaign.stripePaymentIntentId = pi.id;
  await campaign.save();

  await audit(partnerId, 'payment.session.created', {
    campaignId: campaign._id,
    metadata: { paymentIntentId: pi.id, amount: pi.amount }
  });

  return {
    paymentIntentId: pi.id,
    clientSecret: pi.client_secret,
    amount: pi.amount,
    currency: pi.currency,
    status: pi.status
  };
};

// ── Confirm payment: DRAFT → PAID ─────────────────────────────────────────────

const confirmPayment = async (partnerId, campaignId, payload) => {
  await ensureDb();
  const Campaign = require('../models/Campaign');
  const Transaccion = require('../models/Transaccion');

  const campaign = await Campaign.findOne({ _id: campaignId, partner: partnerId });
  if (!campaign) throw createApiError(404, 'CAMPAIGN_NOT_FOUND', 'Campana no encontrada');
  if (campaign.status !== 'DRAFT') {
    throw createApiError(409, 'INVALID_STATE', 'Solo se puede confirmar pago en estado DRAFT');
  }

  // Verify Stripe PaymentIntent is authorized
  if (campaign.stripePaymentIntentId && process.env.STRIPE_SECRET_KEY) {
    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(campaign.stripePaymentIntentId);
    // PaymentIntent must be in requires_capture (authorized, not yet captured = escrow)
    if (pi.status !== 'requires_capture' && pi.status !== 'succeeded') {
      throw createApiError(409, 'PAYMENT_NOT_AUTHORIZED',
        `El pago no esta autorizado. Estado actual: ${pi.status}. El cliente debe completar el pago primero.`);
    }
  } else {
    // Fallback: accept external payment reference
    const paymentReference = String(payload?.paymentReference || '').trim();
    if (!paymentReference) {
      throw createApiError(400, 'PAYMENT_REFERENCE_REQUIRED', 'paymentReference o Stripe PaymentIntent requerido');
    }
    campaign.stripePaymentIntentId = paymentReference;
  }

  campaign.status = 'PAID';
  await campaign.save();

  await Transaccion.updateMany(
    { campaign: campaign._id, status: 'pending' },
    { $set: { status: 'paid' } }
  );

  await audit(partnerId, 'payment.confirmed', {
    campaignId: campaign._id,
    metadata: { paymentIntentId: campaign.stripePaymentIntentId }
  });

  const populated = await Campaign.findById(campaign._id).populate('channel', 'nombreCanal plataforma categoria').lean();
  return serializeCampaign(populated, populated.channel);
};

// ── Publish: PAID ��� PUBLISHED ──────────────────────────────────────────────────

const publishCampaign = async (partnerId, campaignId, payload) => {
  await ensureDb();
  const Campaign = require('../models/Campaign');

  const campaign = await Campaign.findOne({ _id: campaignId, partner: partnerId });
  if (!campaign) throw createApiError(404, 'CAMPAIGN_NOT_FOUND', 'Campana no encontrada');
  if (campaign.status !== 'PAID') {
    throw createApiError(409, 'INVALID_STATE', 'Solo se puede publicar en estado PAID (pago previo obligatorio, clause 5.1)');
  }

  campaign.status = 'PUBLISHED';
  campaign.publishedAt = payload.publishedAt ? new Date(payload.publishedAt) : new Date();
  await campaign.save();

  await audit(partnerId, 'campaign.published', {
    campaignId: campaign._id,
    metadata: { publishedAt: campaign.publishedAt }
  });

  try {
    const notificationService = require('./notificationService');
    await notificationService.enviarNotificacion({
      usuarioId: campaign.advertiser,
      tipo: 'campana.publicada',
      titulo: 'Campana publicada',
      mensaje: 'Tu campana ha sido publicada.',
      datos: { campaignId: campaign._id },
      canales: ['database', 'realtime'],
      prioridad: 'normal'
    });
  } catch (_) { /* non-blocking */ }

  const populated = await Campaign.findById(campaign._id).populate('channel', 'nombreCanal plataforma categoria').lean();
  return serializeCampaign(populated, populated.channel);
};

// ── Complete + release escrow: PUBLISHED → COMPLETED (clause 6.2) ──────────────

const completeCampaign = async (partnerId, campaignId) => {
  await ensureDb();
  const Campaign = require('../models/Campaign');
  const Transaccion = require('../models/Transaccion');

  const campaign = await Campaign.findOne({ _id: campaignId, partner: partnerId });
  if (!campaign) throw createApiError(404, 'CAMPAIGN_NOT_FOUND', 'Campana no encontrada');
  if (campaign.status !== 'PUBLISHED') {
    throw createApiError(409, 'INVALID_STATE', 'Solo se puede completar en estado PUBLISHED');
  }

  // Capture Stripe PaymentIntent (release escrow funds)
  if (campaign.stripePaymentIntentId && process.env.STRIPE_SECRET_KEY) {
    try {
      await captureEscrowPayment(campaign.stripePaymentIntentId);
    } catch (stripeErr) {
      await audit(partnerId, 'escrow.capture.failed', {
        campaignId: campaign._id,
        error: stripeErr.message,
        metadata: { paymentIntentId: campaign.stripePaymentIntentId }
      });
      throw createApiError(502, 'ESCROW_CAPTURE_FAILED', `Error al capturar fondos: ${stripeErr.message}`);
    }
  }

  campaign.status = 'COMPLETED';
  campaign.completedAt = new Date();
  await campaign.save();

  // Mark all pending/paid transactions as completed
  await Transaccion.updateMany(
    { campaign: campaign._id },
    { $set: { status: 'paid' } }
  );

  // Create commission transaction for AdFlow (clause 6.3)
  const commissionAmount = +(campaign.price * campaign.commissionRate).toFixed(2);
  if (commissionAmount > 0) {
    await Transaccion.create({
      campaign: campaign._id,
      advertiser: campaign.advertiser,
      amount: commissionAmount,
      tipo: 'comision',
      status: 'paid',
      description: `Comision AdFlow (${(campaign.commissionRate * 100).toFixed(0)}%) — partner campaign`
    });
  }

  await audit(partnerId, 'campaign.completed', {
    campaignId: campaign._id,
    metadata: { commissionAmount, netAmount: campaign.netAmount }
  });

  const populated = await Campaign.findById(campaign._id).populate('channel', 'nombreCanal plataforma categoria').lean();
  return serializeCampaign(populated, populated.channel);
};

// ── Cancel + refund (clause 6.4) ───────────────────────────────────────────────

const cancelCampaign = async (partnerId, campaignId, payload) => {
  await ensureDb();
  const Campaign = require('../models/Campaign');
  const Transaccion = require('../models/Transaccion');

  const campaign = await Campaign.findOne({ _id: campaignId, partner: partnerId });
  if (!campaign) throw createApiError(404, 'CAMPAIGN_NOT_FOUND', 'Campana no encontrada');
  if (['COMPLETED', 'CANCELLED'].includes(campaign.status)) {
    throw createApiError(409, 'INVALID_STATE', 'No se puede cancelar esta campana');
  }

  // Refund/cancel Stripe PaymentIntent if exists
  if (campaign.stripePaymentIntentId && process.env.STRIPE_SECRET_KEY) {
    try {
      await cancelEscrowPayment(campaign.stripePaymentIntentId);

      // Record refund transaction
      await Transaccion.create({
        campaign: campaign._id,
        advertiser: campaign.advertiser,
        amount: campaign.price,
        tipo: 'reembolso',
        status: 'paid',
        description: `Reembolso por cancelacion — partner campaign`
      });
    } catch (stripeErr) {
      await audit(partnerId, 'escrow.cancel.failed', {
        campaignId: campaign._id,
        error: stripeErr.message
      });
      // Don't block cancellation if stripe fails
      console.error('[partner] Stripe refund error:', stripeErr.message);
    }
  }

  campaign.status = 'CANCELLED';
  campaign.cancelledAt = new Date();
  await campaign.save();

  await audit(partnerId, 'campaign.cancelled', {
    campaignId: campaign._id,
    metadata: { reason: payload?.reason || 'partner_request' }
  });

  const populated = await Campaign.findById(campaign._id).populate('channel', 'nombreCanal plataforma categoria').lean();
  return serializeCampaign(populated, populated.channel);
};

// ── Metrics (clause 10) ────────────────────────────────────────────────────────

const getCampaignMetrics = async (partnerId, campaignId) => {
  await ensureDb();
  const Campaign = require('../models/Campaign');
  const Tracking = require('../models/Tracking');
  const mongoose = require('mongoose');

  if (!mongoose.Types.ObjectId.isValid(campaignId)) {
    throw createApiError(404, 'CAMPAIGN_NOT_FOUND', 'Campana no encontrada');
  }

  const campaign = await Campaign.findOne({ _id: campaignId, partner: partnerId }).lean();
  if (!campaign) throw createApiError(404, 'CAMPAIGN_NOT_FOUND', 'Campana no encontrada');

  if (!['PUBLISHED', 'COMPLETED'].includes(campaign.status)) {
    throw createApiError(409, 'METRICS_NOT_AVAILABLE', 'Metricas disponibles solo tras publicacion');
  }

  const [totalClicks, uniqueIps] = await Promise.all([
    Tracking.countDocuments({ campaign: campaign._id }),
    Tracking.distinct('ip', { campaign: campaign._id }).then((ips) => ips.length)
  ]);

  await audit(partnerId, 'metrics.read', { campaignId: campaign._id });

  return {
    campaignId: campaign._id.toString(),
    status: campaign.status,
    metrics: {
      totalClicks,
      uniqueClicks: uniqueIps,
      publishedAt: campaign.publishedAt,
      completedAt: campaign.completedAt
    },
    disclaimer: 'AdFlow provee click-tracking y metricas agregadas. No se garantizan conversiones ni ROI (clause 10.1).'
  };
};

// ── List/get partner campaigns ─────────────────────────────────────────────────

const getPartnerCampaigns = async (partnerId, { page = 1, limit = 20, status } = {}) => {
  await ensureDb();
  const Campaign = require('../models/Campaign');

  const filter = { partner: partnerId };
  if (status) filter.status = status.toUpperCase();

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const safePage = Math.max(Number(page) || 1, 1);

  const [items, total] = await Promise.all([
    Campaign.find(filter)
      .populate('channel', 'nombreCanal plataforma categoria')
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    Campaign.countDocuments(filter)
  ]);

  return {
    items: items.map((c) => serializeCampaign(c, c.channel)),
    pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.max(1, Math.ceil(total / safeLimit)) }
  };
};

const getPartnerCampaign = async (partnerId, campaignId) => {
  await ensureDb();
  const Campaign = require('../models/Campaign');
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(campaignId)) return null;

  const campaign = await Campaign.findOne({ _id: campaignId, partner: partnerId })
    .populate('channel', 'nombreCanal plataforma categoria')
    .lean();
  if (!campaign) return null;
  return serializeCampaign(campaign, campaign.channel);
};

// ─��� Serialization ──────────────────────────────────────────────────────────────

const getAvailableActions = (campaign) => {
  switch (campaign.status) {
    case 'DRAFT':
      return campaign.stripePaymentIntentId ? ['confirm_payment', 'cancel'] : ['create_payment_session', 'cancel'];
    case 'PAID': return ['publish', 'cancel'];
    case 'PUBLISHED': return ['complete', 'metrics', 'cancel'];
    case 'COMPLETED': return ['metrics'];
    default: return [];
  }
};

const serializeCampaign = (campaign, channel) => ({
  id: (campaign._id || campaign.id).toString(),
  status: campaign.status,
  content: campaign.content,
  targetUrl: campaign.targetUrl,
  price: campaign.price,
  netAmount: campaign.netAmount,
  commissionRate: campaign.commissionRate,
  externalReference: campaign.partnerExternalRef || null,
  deadline: campaign.deadline,
  stripePaymentIntentId: campaign.stripePaymentIntentId || null,
  channel: channel ? {
    id: (channel._id || channel.id).toString(),
    name: channel.nombreCanal,
    platform: channel.plataforma,
    category: channel.categoria
    // NO contact info (clause 13)
  } : null,
  createdAt: campaign.createdAt,
  publishedAt: campaign.publishedAt,
  completedAt: campaign.completedAt,
  cancelledAt: campaign.cancelledAt,
  workflow: {
    status: campaign.status,
    availableActions: getAvailableActions(campaign),
    mandatoryFlow: 'DRAFT → payment → PAID → publish → PUBLISHED → complete → COMPLETED'
  }
});

// ── Auth: validate API key and return partner profile (SHA-256) ───────────────

const authenticatePartner = async (apiKey, ip) => {
  if (!apiKey) throw createApiError(401, 'API_KEY_REQUIRED', 'API key requerida');

  const partner = await getPartnerByApiKey(apiKey);
  if (!partner) throw createApiError(401, 'INVALID_CREDENTIALS', 'Credenciales invalidas');
  if (partner.status !== 'active') throw createApiError(403, 'ACCESS_REVOKED', 'Acceso revocado');
  if (partner.expiresAt && new Date(partner.expiresAt) < new Date()) {
    throw createApiError(403, 'API_KEY_EXPIRED', 'API key caducada');
  }
  if (ip && !isIpAllowed(partner, ip)) {
    throw createApiError(403, 'IP_NOT_ALLOWED', 'IP no autorizada');
  }

  touchPartnerUsage(partner._id, ip);
  await audit(partner._id, 'auth.validate', { ip, metadata: { method: 'sha256' } });

  return {
    partnerId: partner._id.toString(),
    name: partner.name,
    slug: partner.slug,
    status: partner.status,
    apiKeyHint: partner.apiKeyHint || '',
    rateLimitPerMinute: partner.rateLimitPerMinute || 60,
    commissionRate: partner.commissionOverride != null ? partner.commissionOverride : 0.10,
    allowedIps: (partner.allowedIps || []).length > 0 ? partner.allowedIps : ['*'],
    webhookUrl: partner.webhookUrl || null,
    expiresAt: partner.expiresAt || null,
    lastUsedAt: partner.lastUsedAt || null,
    createdAt: partner.createdAt
  };
};

// ── Update campaign (only DRAFT) ──────────────────────────────────────────────

const updateCampaign = async (partnerId, campaignId, payload) => {
  await ensureDb();
  const Campaign = require('../models/Campaign');
  const mongoose = require('mongoose');

  if (!mongoose.Types.ObjectId.isValid(campaignId)) {
    throw createApiError(404, 'CAMPAIGN_NOT_FOUND', 'Campana no encontrada');
  }

  const campaign = await Campaign.findOne({ _id: campaignId, partner: partnerId });
  if (!campaign) throw createApiError(404, 'CAMPAIGN_NOT_FOUND', 'Campana no encontrada');
  if (campaign.status !== 'DRAFT') {
    throw createApiError(409, 'INVALID_STATE', 'Solo se pueden editar campanas en estado DRAFT');
  }

  // Updatable fields
  if (payload.content !== undefined) campaign.content = String(payload.content).trim();
  if (payload.title !== undefined) campaign.content = String(payload.title).trim();
  if (payload.targetUrl !== undefined) campaign.targetUrl = String(payload.targetUrl).trim();
  if (payload.budget !== undefined) {
    const price = Number(payload.budget);
    if (!Number.isFinite(price) || price <= 0) {
      throw createApiError(400, 'INVALID_BUDGET', 'Budget invalido');
    }
    campaign.price = price;
  }
  if (payload.deadline !== undefined) {
    campaign.deadline = payload.deadline ? new Date(payload.deadline) : null;
  }

  await campaign.save();

  await audit(partnerId, 'campaign.updated', {
    campaignId: campaign._id,
    metadata: { updatedFields: Object.keys(payload) }
  });

  const populated = await Campaign.findById(campaign._id)
    .populate('channel', 'nombreCanal plataforma categoria').lean();
  return serializeCampaign(populated, populated.channel);
};

// ── Billing: transaction history + balance ────────────────────────────────────

const getPartnerBilling = async (partnerId, { from, to, status, page = 1, limit = 20 } = {}) => {
  await ensureDb();
  const Campaign = require('../models/Campaign');
  const Transaccion = require('../models/Transaccion');

  // Get all campaign IDs for this partner
  const partnerCampaigns = await Campaign.find({ partner: partnerId }).select('_id').lean();
  const campaignIds = partnerCampaigns.map((c) => c._id);

  if (campaignIds.length === 0) {
    return {
      balance: { totalSpent: 0, pending: 0, settled: 0, refunded: 0, currency: 'eur' },
      transactions: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 1 }
    };
  }

  // Build transaction filter
  const filter = { campaign: { $in: campaignIds } };
  if (status) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const safePage = Math.max(Number(page) || 1, 1);

  const [transactions, total] = await Promise.all([
    Transaccion.find(filter)
      .populate('campaign', 'content status partnerExternalRef')
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    Transaccion.countDocuments(filter)
  ]);

  // Calculate balance aggregates
  const allTransactions = await Transaccion.find({ campaign: { $in: campaignIds } }).lean();
  const balance = {
    totalSpent: 0,
    pending: 0,
    settled: 0,
    refunded: 0,
    currency: 'eur'
  };

  for (const tx of allTransactions) {
    if (tx.tipo === 'reembolso') {
      balance.refunded += tx.amount;
    } else if (tx.tipo === 'pago' || tx.tipo === 'comision') {
      if (tx.status === 'pending' || tx.status === 'escrow') {
        balance.pending += tx.amount;
      } else if (tx.status === 'paid') {
        balance.settled += tx.amount;
      }
    }
  }
  balance.totalSpent = +(balance.pending + balance.settled).toFixed(2);
  balance.pending = +balance.pending.toFixed(2);
  balance.settled = +balance.settled.toFixed(2);
  balance.refunded = +balance.refunded.toFixed(2);

  await audit(partnerId, 'billing.read', { metadata: { from, to, status } });

  return {
    balance,
    transactions: transactions.map((tx) => ({
      id: tx._id.toString(),
      campaignId: tx.campaign?._id?.toString() || null,
      campaignRef: tx.campaign?.partnerExternalRef || null,
      amount: tx.amount,
      type: tx.tipo,
      status: tx.status,
      description: tx.description,
      createdAt: tx.createdAt
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit))
    }
  };
};

// ── Stats: aggregate partner metrics ──────────────────────────────────────────

const getPartnerStats = async (partnerId, { period = 'month' } = {}) => {
  await ensureDb();
  const Campaign = require('../models/Campaign');
  const Tracking = require('../models/Tracking');
  const PartnerAuditLog = require('../models/PartnerAuditLog');

  // Calculate date range
  const now = new Date();
  const periodDays = { week: 7, month: 30, quarter: 90, year: 365 }[period] || 30;
  const since = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

  // Campaign stats
  const allCampaigns = await Campaign.find({ partner: partnerId }).lean();
  const periodCampaigns = allCampaigns.filter((c) => c.createdAt >= since);

  const byStatus = {};
  for (const c of allCampaigns) {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
  }

  const totalSpent = allCampaigns
    .filter((c) => ['PAID', 'PUBLISHED', 'COMPLETED'].includes(c.status))
    .reduce((sum, c) => sum + (c.price || 0), 0);

  const completedCampaigns = allCampaigns.filter((c) => c.status === 'COMPLETED');
  const avgBudget = allCampaigns.length > 0
    ? +(allCampaigns.reduce((s, c) => s + c.price, 0) / allCampaigns.length).toFixed(2)
    : 0;

  // Click metrics
  const campaignIds = allCampaigns.map((c) => c._id);
  const [totalClicks, uniqueIps] = await Promise.all([
    Tracking.countDocuments({ campaign: { $in: campaignIds } }),
    Tracking.distinct('ip', { campaign: { $in: campaignIds } }).then((ips) => ips.length)
  ]);

  // API usage stats from audit log
  const [apiRequestsTotal, apiRequestsPeriod, apiErrors] = await Promise.all([
    PartnerAuditLog.countDocuments({ partner: partnerId, action: 'api.request' }),
    PartnerAuditLog.countDocuments({ partner: partnerId, action: 'api.request', createdAt: { $gte: since } }),
    PartnerAuditLog.countDocuments({
      partner: partnerId,
      action: 'api.request',
      statusCode: { $gte: 400 },
      createdAt: { $gte: since }
    })
  ]);

  const errorRate = apiRequestsPeriod > 0 ? +(apiErrors / apiRequestsPeriod).toFixed(4) : 0;

  await audit(partnerId, 'stats.read', { metadata: { period } });

  return {
    campaigns: {
      total: allCampaigns.length,
      periodNew: periodCampaigns.length,
      byStatus,
      avgBudget,
      totalSpent: +totalSpent.toFixed(2),
      activeNow: (byStatus.DRAFT || 0) + (byStatus.PAID || 0) + (byStatus.PUBLISHED || 0)
    },
    metrics: {
      totalClicks,
      uniqueClicks: uniqueIps,
      avgClicksPerCampaign: completedCampaigns.length > 0
        ? +(totalClicks / completedCampaigns.length).toFixed(1)
        : 0
    },
    api: {
      requestsTotal: apiRequestsTotal,
      requestsPeriod: apiRequestsPeriod,
      errorRate
    },
    period: {
      name: period,
      from: since.toISOString(),
      to: now.toISOString()
    }
  };
};

// ── Exports ────────────────────────────────────────────────────────────────────

module.exports = {
  hashApiKey,
  safeEqualHex,
  normalizeIp,
  getPartnerByApiKey,
  isIpAllowed,
  touchPartnerUsage,
  registerApiLog,
  audit,
  authenticatePartner,
  listChannels,
  getChannel,
  createCampaign,
  updateCampaign,
  createPaymentSession,
  confirmPayment,
  publishCampaign,
  completeCampaign,
  cancelCampaign,
  getCampaignMetrics,
  getPartnerCampaigns,
  getPartnerCampaign,
  getPartnerBilling,
  getPartnerStats,
  getOrCreatePartnerUser
};
