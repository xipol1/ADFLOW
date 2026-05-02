const Conversion = require('../models/Conversion');
const Campaign = require('../models/Campaign');
const TrackingLink = require('../models/TrackingLink');
const database = require('../config/database');
const roiService = require('../services/roiService');

const VALID_TYPES = ['purchase', 'signup', 'lead', 'subscription', 'install', 'custom'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolve a clickId to its campaign + advertiser + visitor uid.
 *
 * The clickId lives inside TrackingLink.clicks[].clickId — we use a
 * single MongoDB query against that nested array, then look up the
 * campaign that owns that link. We also pull the click's `uid` so the
 * conversion can carry it forward for multi-touch attribution.
 */
async function resolveClickId(clickId) {
  if (!clickId || typeof clickId !== 'string') return null;
  const link = await TrackingLink.findOne(
    { 'clicks.clickId': clickId },
    { campaign: 1, createdBy: 1, 'clicks.$': 1 },
  ).lean();
  if (!link?.campaign) return null;

  const campaign = await Campaign.findById(link.campaign).select('advertiser status').lean();
  if (!campaign) return null;
  const matchedClick = link.clicks?.[0];
  return {
    campaignId: link.campaign,
    advertiserId: campaign.advertiser,
    status: campaign.status,
    uid: matchedClick?.uid || null,
  };
}

function clientIp(req) {
  return (req.headers['x-forwarded-for']?.split(',')[0] || req.ip || '').trim();
}

// ─── POST /api/conversions  (server-to-server, PUBLIC — clickId required) ───
//
// Public endpoint for advertisers' backends. Always requires a valid clickId
// — that's the only way attribution can be trusted from an unauthenticated
// caller. The clickId is unguessable (16 hex / 64 bits, generated server-side
// on each redirect) and bound to a specific TrackingLink + Campaign.
//
// Idempotent on (campaign, externalId): re-posting the same orderId is a no-op.
const recordConversion = async (req, res) => {
  try {
    if (!database.estaConectado()) await database.conectar();

    const { clickId, type, value, currency, quantity, externalId, metadata } = req.body || {};
    if (!clickId || typeof clickId !== 'string') {
      return res.status(400).json({ success: false, message: 'clickId requerido (string)' });
    }

    // Resolve attribution — the clickId is the trust anchor here.
    const resolved = await resolveClickId(clickId);
    if (!resolved) return res.status(404).json({ success: false, message: 'clickId no reconocido' });
    const campaignId = resolved.campaignId;
    const advertiserId = resolved.advertiserId;

    // Validate
    const conversionType = VALID_TYPES.includes(type) ? type : 'custom';
    const numericValue = Number(value);
    // Cap value at 1M EUR to prevent abusive inflation by attackers who
    // somehow obtained a clickId. A real advertiser can post a normal value;
    // anything larger is almost certainly bogus.
    const safeValue = Number.isFinite(numericValue) && numericValue >= 0 && numericValue <= 1_000_000
      ? numericValue
      : 0;

    // Idempotency check
    if (externalId) {
      const existing = await Conversion.findOne({ campaign: campaignId, externalId: String(externalId) }).lean();
      if (existing) {
        return res.json({ success: true, data: { id: String(existing._id), idempotent: true } });
      }
    }

    const doc = await Conversion.create({
      clickId: clickId || null,
      uid: resolved.uid || req.cookies?._chad_uid || null,
      campaign: campaignId,
      advertiser: advertiserId,
      type: conversionType,
      value: safeValue,
      currency: (currency || 'EUR').toUpperCase().slice(0, 3),
      quantity: Number(quantity) || 1,
      externalId: externalId ? String(externalId) : null,
      source: 'server',
      ip: clientIp(req),
      userAgent: req.headers['user-agent'] || '',
      referer: req.headers['referer'] || '',
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
    });

    return res.status(201).json({ success: true, data: { id: String(doc._id), value: doc.value, type: doc.type } });
  } catch (e) {
    if (e.code === 11000) {
      // Duplicate (campaign, externalId) — idempotent retry
      return res.json({ success: true, data: { idempotent: true } });
    }
    console.error('conversionController.recordConversion failed:', e);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

// ─── GET /api/track/conversion  (pixel — public, called from advertiser site) ──
//
//   <img src="https://channelad.io/api/track/conversion?cid=XXX&type=purchase&v=49.99" />
//
// Falls back to the _chad_cid cookie if `cid` is not in the query string.
// Returns a 1x1 transparent gif so it can be used as an <img> pixel.
const PIXEL_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

const recordConversionPixel = async (req, res) => {
  try {
    if (!database.estaConectado()) await database.conectar();
    const clickId = req.query.cid || req.cookies?._chad_cid || null;
    if (!clickId) {
      // Still respond with the pixel so the user's page doesn't break,
      // just don't record anything.
      res.setHeader('Content-Type', 'image/gif');
      return res.end(PIXEL_GIF);
    }

    const resolved = await resolveClickId(String(clickId));
    if (resolved) {
      const type = VALID_TYPES.includes(req.query.type) ? req.query.type : 'custom';
      const value = Number(req.query.v ?? req.query.value);
      const externalId = req.query.eid ? String(req.query.eid) : null;
      // Idempotency
      let canCreate = true;
      if (externalId) {
        const existing = await Conversion.findOne({ campaign: resolved.campaignId, externalId }).lean();
        if (existing) canCreate = false;
      }
      if (canCreate) {
        await Conversion.create({
          clickId: String(clickId),
          uid: resolved.uid || req.cookies?._chad_uid || null,
          campaign: resolved.campaignId,
          advertiser: resolved.advertiserId,
          type,
          value: Number.isFinite(value) && value >= 0 ? value : 0,
          currency: (req.query.currency || 'EUR').toString().toUpperCase().slice(0, 3),
          externalId,
          source: 'pixel',
          ip: clientIp(req),
          userAgent: req.headers['user-agent'] || '',
          referer: req.headers['referer'] || '',
        }).catch(err => {
          // Ignore dup-key (idempotency)
          if (err.code !== 11000) console.error('pixel conversion create failed:', err.message);
        });
      }
    }

    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(PIXEL_GIF);
  } catch (e) {
    console.error('conversionController.pixel failed:', e);
    res.setHeader('Content-Type', 'image/gif');
    return res.end(PIXEL_GIF);
  }
};

// ─── GET /api/conversions/campaigns/:id  (authenticated, owner only) ────────
const getCampaignROI = async (req, res) => {
  try {
    if (!database.estaConectado()) await database.conectar();
    const { id } = req.params;
    const campaign = await Campaign.findById(id).select('advertiser').lean();
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaña no encontrada' });
    if (String(campaign.advertiser) !== String(req.usuario.id)) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    const data = await roiService.computeCampaignROI(id);
    return res.json({ success: true, data });
  } catch (e) {
    console.error('conversionController.getCampaignROI failed:', e);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

// ─── GET /api/conversions/me  (advertiser-wide ROI) ──────────────────────────
const getMyROI = async (req, res) => {
  try {
    if (!database.estaConectado()) await database.conectar();
    const sinceDays = Number(req.query.sinceDays) || undefined;
    const data = await roiService.computeAdvertiserROI(req.usuario.id, { sinceDays });
    return res.json({ success: true, data });
  } catch (e) {
    console.error('conversionController.getMyROI failed:', e);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

// ─── GET /api/conversions/campaigns/:id/list  (paginated raw conversions) ────
const listCampaignConversions = async (req, res) => {
  try {
    if (!database.estaConectado()) await database.conectar();
    const { id } = req.params;
    const campaign = await Campaign.findById(id).select('advertiser').lean();
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaña no encontrada' });
    if (String(campaign.advertiser) !== String(req.usuario.id)) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const items = await Conversion.find({ campaign: id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({ success: true, data: { items, count: items.length } });
  } catch (e) {
    console.error('conversionController.listCampaignConversions failed:', e);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

module.exports = {
  recordConversion,
  recordConversionPixel,
  getCampaignROI,
  getMyROI,
  listCampaignConversions,
};
