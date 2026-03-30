const mongoose = require('mongoose');
const crypto = require('crypto');

const ClickSchema = new mongoose.Schema({
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  referer: { type: String, default: '' },
  country: { type: String, default: '' },
  city: { type: String, default: '' },
  device: { type: String, enum: ['desktop', 'mobile', 'tablet', 'unknown'], default: 'unknown' },
  os: { type: String, default: '' },
  browser: { type: String, default: '' },
  language: { type: String, default: '' },
  utmSource: { type: String, default: '' },
  utmMedium: { type: String, default: '' },
  utmCampaign: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
}, { _id: true });

const TrackingLinkSchema = new mongoose.Schema(
  {
    // Short code — e.g. "aB3xK9" → /t/aB3xK9
    code: { type: String, required: true, unique: true, index: true },

    // The original destination URL
    targetUrl: { type: String, required: true },

    // Who created this link
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', index: true },

    // Context: campaign tracking OR channel verification
    type: {
      type: String,
      enum: ['campaign', 'verification', 'custom'],
      default: 'campaign',
      index: true,
    },

    // Associated campaign (for campaign links)
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null, index: true },

    // Associated channel (for verification links)
    channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Canal', default: null, index: true },

    // Aggregated stats (updated on each click, avoids counting array)
    stats: {
      totalClicks: { type: Number, default: 0 },
      uniqueClicks: { type: Number, default: 0 },
      lastClickAt: { type: Date, default: null },
      devices: {
        desktop: { type: Number, default: 0 },
        mobile: { type: Number, default: 0 },
        tablet: { type: Number, default: 0 },
        unknown: { type: Number, default: 0 },
      },
      countries: { type: Map, of: Number, default: {} },
      referers: { type: Map, of: Number, default: {} },
    },

    // Individual clicks stored (last N for detail view)
    clicks: [ClickSchema],

    // Unique IPs seen (for dedup)
    _seenIps: [{ type: String }],

    // Verification-specific fields
    verification: {
      status: {
        type: String,
        enum: ['pending', 'posted', 'verified', 'failed', 'expired'],
        default: 'pending',
      },
      minClicks: { type: Number, default: 3 },  // Min clicks to verify
      expiresAt: { type: Date, default: null },  // 48h to complete
      verifiedAt: { type: Date, default: null },
      postScreenshot: { type: String, default: '' },
    },

    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Generate a unique short code
TrackingLinkSchema.statics.generateCode = function (length = 7) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
};

// Parse device from user-agent
TrackingLinkSchema.statics.parseDevice = function (ua) {
  if (!ua) return { device: 'unknown', os: '', browser: '' };
  const lc = ua.toLowerCase();

  let device = 'desktop';
  if (/mobile|android.*mobile|iphone|ipod|blackberry|iemobile|opera mini/i.test(lc)) device = 'mobile';
  else if (/tablet|ipad|android(?!.*mobile)/i.test(lc)) device = 'tablet';

  let os = 'Other';
  if (/windows/i.test(lc)) os = 'Windows';
  else if (/macintosh|mac os/i.test(lc)) os = 'macOS';
  else if (/linux/i.test(lc)) os = 'Linux';
  else if (/android/i.test(lc)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(lc)) os = 'iOS';

  let browser = 'Other';
  if (/edg\//i.test(lc)) browser = 'Edge';
  else if (/chrome/i.test(lc) && !/chromium/i.test(lc)) browser = 'Chrome';
  else if (/firefox/i.test(lc)) browser = 'Firefox';
  else if (/safari/i.test(lc) && !/chrome/i.test(lc)) browser = 'Safari';
  else if (/opera|opr\//i.test(lc)) browser = 'Opera';

  return { device, os, browser };
};

// Country from IP — basic geo via timezone/language headers (no external API)
TrackingLinkSchema.statics.guessCountry = function (req) {
  // Try cf-ipcountry (Cloudflare / Vercel)
  const cf = req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'];
  if (cf && cf !== 'XX') return cf;
  // Fallback: accept-language
  const lang = (req.headers['accept-language'] || '').split(',')[0] || '';
  const parts = lang.split('-');
  return parts.length > 1 ? parts[1].toUpperCase() : '';
};

module.exports = mongoose.models.TrackingLink || mongoose.model('TrackingLink', TrackingLinkSchema);
