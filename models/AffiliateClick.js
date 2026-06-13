const mongoose = require('mongoose');

/**
 * AffiliateClick — outbound click event from a neutral-brand affiliate bridge
 * page (e.g. "Cocina Lista") to an external marketplace (Amazon).
 *
 * Flow:
 *   1. A ChannelAd channel (WhatsApp/Telegram) posts a link to a bridge page
 *      carrying `?utm_source=<channel>&utm_medium=...&utm_campaign=...`.
 *   2. The visitor lands on the bridge page; UTM params are captured.
 *   3. On any "Ver en Amazon" CTA click, the page fires a write-only beacon to
 *      POST /api/track/outbound-click BEFORE navigating to Amazon. We record
 *      the event here so we can attribute the click to the originating channel.
 *      Amazon-side attribution rides separately on the `ascsubtag` query param.
 *
 * This collection is write-heavy and read-rarely (analytics rollups), and
 * carries no PII — only campaign/channel UTM tags plus coarse request metadata.
 *
 * Indexes:
 *   - utmSource + createdAt: "clicks per channel over time"
 *   - createdAt: time-range rollups / future TTL aging
 */
const AffiliateClickSchema = new mongoose.Schema(
  {
    // ── Channel attribution (from the landing URL's utm_* query params) ──
    utmSource:   { type: String, default: null, index: true }, // originating channel
    utmMedium:   { type: String, default: null },
    utmCampaign: { type: String, default: null },
    utmContent:  { type: String, default: null },

    // ── Event context ──────────────────────────────────────────────────
    // Which CTA was clicked: 'sticky' | 'hero' | 'social' | 'final' | ...
    ctaLocation: { type: String, default: null },
    // Neutral store identifier + product key (config-driven on the page).
    store:       { type: String, default: null },
    product:     { type: String, default: null },
    // Client-reported timestamp (ISO string); server time lives in createdAt.
    clientTs:    { type: String, default: null },

    // ── Coarse request metadata (no PII) ───────────────────────────────
    ip:        { type: String, default: '' },
    userAgent: { type: String, default: '' },
    referer:   { type: String, default: '' },
  },
  { timestamps: true }
);

AffiliateClickSchema.index({ utmSource: 1, createdAt: -1 });
AffiliateClickSchema.index({ createdAt: -1 });

module.exports = mongoose.models.AffiliateClick
  || mongoose.model('AffiliateClick', AffiliateClickSchema);
