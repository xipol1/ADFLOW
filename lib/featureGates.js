/**
 * Central map of feature → routes that require that feature.
 *
 * The gate middleware (middleware/requiereSubscription.js) reads this
 * map so every Pro-only feature has a single declarative entry. Adding
 * a new gated endpoint means adding one line here, not scattering
 * requiereSubscription({feature: '...'}) calls across routers.
 *
 * Route entries are informational (auditable list of what's gated by
 * what); the actual binding lives in routes/*.js when the team wires
 * a route up — but they should reference this map by feature name.
 */

const FEATURE_ROUTES = {
  // Advertiser Pro features
  bulkLauncher: [
    'POST /api/campaigns/launch-auto',
    'POST /api/campaigns/bulk',
  ],
  lookalike: [
    'GET /api/channels/lookalike',
  ],
  nicheHeatmap: [
    'GET /api/channels/niche-heatmap',
  ],
  audienceInsights: [
    'GET /api/channels/:id/audience-insights',
  ],
  abTestLab: [
    'POST /api/campaigns/:id/ab-test',
    'GET /api/campaigns/:id/ab-test',
  ],
  forecastRoi: [
    'POST /api/campaigns/forecast',
  ],
  realtimeMonitor: [
    'GET /api/campaigns/:id/realtime',
  ],
  multiTouchAttribution: [
    // Free advertisers are pinned to last_touch; PATCH to /settings to change
    // attributionModel is gated by this feature.
    'PATCH /api/users/me/attribution',
  ],
  outgoingWebhooks: [
    'POST /api/webhooks',
    'PUT /api/webhooks/:id',
    'DELETE /api/webhooks/:id',
  ],

  // Creator Pro features
  priorityListing: [
    // Soft gate: read paths consult hasFeature() to boost ranking, no
    // explicit endpoint to block.
  ],
  advancedAnalytics: [
    'GET /api/canales/:id/analytics/advanced',
    'GET /api/canales/:id/analytics/cohort',
    'GET /api/canales/:id/analytics/overlap',
  ],
  apiAccess: [
    'GET /api/creator/export',
    'POST /api/creator/api-keys',
  ],
  customSlug: [
    'PATCH /api/canales/:id/slug',
  ],
  proBadge: [
    // Display-only; no route gate.
  ],
};

/**
 * Numeric limits that are enforced soft-stop (warn at 80%, block at 100%)
 * rather than via route gates. Listed here for auditability.
 */
const SOFT_LIMITS = {
  conversionsPerMonth: {
    appliesTo: 'advertiser',
    description: 'Conversions tracked per calendar month. At 80% the system emails a heads-up; at 100% new conversions are dropped with X-Limit-Exceeded header.',
  },
  maxChannels: {
    appliesTo: 'creator',
    description: 'Number of channels the creator can list in the marketplace. Excess channels stay in the DB but are hidden from public listings until upgrade.',
  },
  lookbackDays: {
    appliesTo: 'advertiser',
    description: 'Attribution lookback window. Clamped in roiService when computing per-campaign revenue.',
  },
};

module.exports = {
  FEATURE_ROUTES,
  SOFT_LIMITS,
};
