const Conversion = require('../models/Conversion');
const Campaign = require('../models/Campaign');
const TrackingLink = require('../models/TrackingLink');
const Usuario = require('../models/Usuario');
const database = require('../config/database');
const roiService = require('../services/roiService');
const { getLimit } = require('../lib/plans');

const VALID_TYPES = ['purchase', 'signup', 'lead', 'subscription', 'install', 'custom'];

/**
 * Soft-stop check for the advertiser's per-month conversion cap. Free
 * advertisers are capped at 1000/month (see config/plans.js). Returns:
 *   - { allowed: true } when under the limit (or Pro = Infinity)
 *   - { allowed: false, count, limit } when at/over the limit
 *
 * Implemented as a count(this calendar month) query — cheap because the
 * Conversion collection is indexed on advertiser. Pro users short-circuit
 * before hitting the DB.
 */
async function checkConversionLimit(advertiserId) {
  const user = await Usuario.findById(advertiserId).select('rol subscription').lean();
  if (!user) return { allowed: true };
  const limit = getLimit(user, 'conversionsPerMonth');
  if (limit === Infinity) return { allowed: true };

  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const count = await Conversion.countDocuments({
    advertiser: advertiserId,
    createdAt: { $gte: start },
  });
  return { allowed: count < limit, count, limit };
}

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

    // Plan soft-limit: free advertisers cap at 1000 conversions/month.
    // We return 200 (not 4xx) so the advertiser's pixel/callback keeps working
    // and surface the cap via X-Limit-Exceeded header + body flag for analytics.
    const cap = await checkConversionLimit(advertiserId);
    if (!cap.allowed) {
      res.setHeader('X-Limit-Exceeded', 'conversionsPerMonth');
      return res.status(200).json({
        success: true,
        data: { dropped: true, reason: 'plan_limit', limit: cap.limit, count: cap.count },
      });
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

// Anti-abuse cap: an attacker with a stolen `cid` could fire the pixel with
// arbitrarily large `v` to inflate the advertiser's ROI dashboard and the
// commission attribution. Configurable per-deploy; defaults to €10k which
// covers realistic high-ticket SaaS / B2B conversions but blocks obvious
// inflation. Conversions above the cap are clamped, not rejected, because
// a real high-value purchase will simply settle at the cap and surface in
// admin review.
const PIXEL_MAX_VALUE = Number(process.env.CONVERSION_MAX_VALUE_EUR || 10000);
const PIXEL_SECRET = process.env.CONVERSION_PIXEL_SECRET || '';

// Verify HMAC of (cid + type + v + eid) using the shared secret. Returns
// true when no secret is configured (legacy/easy onboarding) so existing
// integrations keep working; advertisers who want their conversions to
// count for commission can opt into signed pixels by setting the env.
const verifyPixelSignature = (q) => {
  if (!PIXEL_SECRET) return { ok: true, verified: false };
  const sig = q.sig || '';
  if (!sig) return { ok: false, verified: false };
  const crypto = require('crypto');
  const payload = `${q.cid || ''}|${q.type || ''}|${q.v ?? q.value ?? ''}|${q.eid || ''}`;
  const expected = crypto.createHmac('sha256', PIXEL_SECRET).update(payload).digest('hex');
  try {
    const a = Buffer.from(String(sig).slice(0, 128));
    const b = Buffer.from(expected.slice(0, 128));
    if (a.length !== b.length) return { ok: false, verified: false };
    return { ok: crypto.timingSafeEqual(a, b), verified: true };
  } catch { return { ok: false, verified: false }; }
};

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

    // If HMAC is enforced on this deploy and the call is unsigned/bad, we
    // still serve a gif (no broken image on the advertiser's page) but
    // never record the conversion.
    const sigCheck = verifyPixelSignature(req.query);
    if (!sigCheck.ok) {
      res.setHeader('X-Conversion-Rejected', 'invalid-signature');
      res.setHeader('Content-Type', 'image/gif');
      return res.end(PIXEL_GIF);
    }

    const resolved = await resolveClickId(String(clickId));
    if (resolved) {
      const type = VALID_TYPES.includes(req.query.type) ? req.query.type : 'custom';
      const rawValue = Number(req.query.v ?? req.query.value);
      // Clamp anti-abuse: drop negatives, NaN→0, cap at PIXEL_MAX_VALUE.
      const value = Number.isFinite(rawValue) && rawValue >= 0
        ? Math.min(rawValue, PIXEL_MAX_VALUE)
        : 0;
      const externalId = req.query.eid ? String(req.query.eid) : null;
      // Idempotency
      let canCreate = true;
      if (externalId) {
        const existing = await Conversion.findOne({ campaign: resolved.campaignId, externalId }).lean();
        if (existing) canCreate = false;
      }
      if (canCreate) {
        // Honour per-plan conversion cap silently — pixel always returns a gif.
        const cap = await checkConversionLimit(resolved.advertiserId);
        if (!cap.allowed) {
          res.setHeader('X-Limit-Exceeded', 'conversionsPerMonth');
          res.setHeader('Content-Type', 'image/gif');
          return res.end(PIXEL_GIF);
        }
        await Conversion.create({
          clickId: String(clickId),
          uid: resolved.uid || req.cookies?._chad_uid || null,
          campaign: resolved.campaignId,
          advertiser: resolved.advertiserId,
          type,
          value,
          currency: (req.query.currency || 'EUR').toString().toUpperCase().slice(0, 3),
          externalId,
          source: 'pixel',
          // Whether HMAC verified the call. Downstream commission attribution
          // can choose to only honour { signatureVerified: true } when the
          // platform is in strict mode.
          signatureVerified: sigCheck.verified,
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
