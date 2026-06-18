const AffiliateClick = require('../models/AffiliateClick');

/**
 * recordOutboundClick — public, write-only beacon handler.
 *
 * Fired by neutral-brand affiliate bridge pages right before they navigate the
 * visitor to Amazon. Design goals:
 *   - NEVER block or delay the visitor's navigation → we ACK 204 immediately and
 *     persist asynchronously. A DB hiccup must not cost a click-out.
 *   - NEVER throw a client-visible error → analytics is best-effort.
 *   - Accept both `text/plain` (navigator.sendBeacon / simple CORS request, no
 *     preflight) and `application/json` bodies. The body arrives as a raw string
 *     because this route is mounted before the global express.json() parser.
 */
exports.recordOutboundClick = async (req, res) => {
  // Acknowledge first; everything below is fire-and-forget.
  res.status(204).end();

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body || '{}'); } catch { body = {}; }
    }
    body = body && typeof body === 'object' ? body : {};

    // Defensive truncation — these are attacker-influencable public inputs.
    const s = (v, n = 200) => (typeof v === 'string' && v ? v.slice(0, n) : null);

    await AffiliateClick.create({
      utmSource:   s(body.utm_source, 120),
      utmMedium:   s(body.utm_medium, 120),
      utmCampaign: s(body.utm_campaign, 200),
      utmContent:  s(body.utm_content, 200),
      ctaLocation: s(body.cta_location, 40),
      store:       s(body.store, 80),
      product:     s(body.product, 160),
      clientTs:    s(body.ts, 40),
      ip:          (req.ip || '').slice(0, 64),
      userAgent:   s(req.get('user-agent'), 300) || '',
      referer:     s(req.get('referer'), 400) || '',
    });
  } catch {
    /* swallow — a tracking failure must never surface to the visitor */
  }
};
