/**
 * copyBenchmarksService — aggregates per-channel ad-copy performance data
 * to feed the channel-aware copy analyzer.
 *
 * Pulls the last N completed campaigns on a channel, joins them with
 * CampaignMetricsV2 to get the final CTR, and computes summary statistics
 * about WHAT WORKED on this channel: avg/median length, top-quartile CTR
 * patterns, emoji density of top posts, common hooks, etc.
 *
 * Output is cached on Canal.copyBenchmarksCache with a 24h TTL because
 * channel performance moves slowly.
 */

const Canal = require('../models/Canal');
const Campaign = require('../models/Campaign');
const CampaignMetricsV2 = require('../models/CampaignMetricsV2');

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const SAMPLE_LIMIT = 50;                  // last N completed campaigns
const TOP_QUARTILE = 0.25;                // top X% define "what works"

// ── Pure helpers (no DB) ──────────────────────────────────────────────────
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

function countEmojis(text) {
  if (!text) return 0;
  const m = text.match(EMOJI_RE);
  return m ? m.length : 0;
}

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Detect a "hook" pattern in a copy: starts with question, exclamation, emoji,
// number, or one of a few well-known opening tropes. Useful for surfacing
// top-quartile patterns ("80% of best posts in this channel start with X").
function detectHook(text) {
  if (!text) return null;
  const t = text.trim();
  if (!t) return null;
  const first = t.slice(0, 50).toLowerCase();
  if (/^[¿?]/.test(t)) return 'question';
  if (/^[¡!]/.test(t)) return 'exclamation';
  if (EMOJI_RE.test(t.slice(0, 3))) return 'emoji';
  if (/^\d/.test(t)) return 'number';
  if (/^(yo|hoy|llevo|acabo de|llevo años|este|esta|aquí está)/.test(first)) return 'personal';
  if (/^(nuevo|atención|importante|breaking|noticia)/.test(first)) return 'announcement';
  return 'other';
}

// ── Main aggregation ──────────────────────────────────────────────────────

/**
 * Compute fresh benchmarks for a channel, ignoring any cache.
 * Heavy operation — should only run when cache is stale.
 */
async function computeBenchmarks(canalId) {
  const completedCampaigns = await Campaign.find({
    channel: canalId,
    status: { $in: ['COMPLETED', 'PUBLISHED'] },
    content: { $exists: true, $ne: '' },
  })
    .select('_id content publishedAt completedAt')
    .sort({ publishedAt: -1, completedAt: -1 })
    .limit(SAMPLE_LIMIT)
    .lean();

  if (completedCampaigns.length === 0) {
    return {
      sampleSize: 0,
      fetchedAt: new Date(),
      // Empty payload — caller should fall back to category/platform defaults
    };
  }

  // Join with metrics
  const ids = completedCampaigns.map(c => c._id);
  const metrics = await CampaignMetricsV2.find({ campaniaId: { $in: ids } })
    .select('campaniaId final.CTR final.views final.clicksUnicos')
    .lean();

  const metricsByCampaign = new Map();
  for (const m of metrics) {
    if (m.final && Number.isFinite(m.final.CTR)) {
      metricsByCampaign.set(String(m.campaniaId), m.final);
    }
  }

  // Enrich each campaign with its CTR + derived features
  const enriched = completedCampaigns.map(c => {
    const m = metricsByCampaign.get(String(c._id));
    return {
      content: c.content,
      length: c.content.length,
      words: c.content.split(/\s+/).filter(Boolean).length,
      emojis: countEmojis(c.content),
      hook: detectHook(c.content),
      hasUrl: /https?:\/\//.test(c.content),
      ctr: m?.CTR ?? null,
      views: m?.views ?? 0,
    };
  });

  // Overall stats (everything we have data for)
  const lengths = enriched.map(e => e.length);
  const wordCounts = enriched.map(e => e.words);
  const emojiCounts = enriched.map(e => e.emojis);

  // Top-quartile by CTR — these define "what works on this channel"
  const withCtr = enriched.filter(e => e.ctr != null && e.ctr > 0);
  const topCount = Math.max(1, Math.ceil(withCtr.length * TOP_QUARTILE));
  const topQuartile = [...withCtr].sort((a, b) => b.ctr - a.ctr).slice(0, topCount);

  const hookFrequency = {};
  for (const e of topQuartile) {
    if (e.hook) hookFrequency[e.hook] = (hookFrequency[e.hook] || 0) + 1;
  }
  const dominantHook = Object.entries(hookFrequency)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    sampleSize: enriched.length,
    sampleWithCtr: withCtr.length,
    fetchedAt: new Date(),
    overall: {
      lengthMedian: Math.round(median(lengths)),
      lengthAvg: Math.round(avg(lengths)),
      lengthP25: Math.round(percentile(lengths, 0.25)),
      lengthP75: Math.round(percentile(lengths, 0.75)),
      wordsMedian: Math.round(median(wordCounts)),
      emojisMedian: Math.round(median(emojiCounts)),
      avgCtr: withCtr.length ? +avg(withCtr.map(e => e.ctr)).toFixed(2) : null,
    },
    topQuartile: {
      count: topQuartile.length,
      avgCtr: topQuartile.length ? +avg(topQuartile.map(e => e.ctr)).toFixed(2) : null,
      lengthMedian: Math.round(median(topQuartile.map(e => e.length))),
      lengthRange: topQuartile.length
        ? [Math.min(...topQuartile.map(e => e.length)), Math.max(...topQuartile.map(e => e.length))]
        : null,
      emojisMedian: Math.round(median(topQuartile.map(e => e.emojis))),
      hooksUsed: hookFrequency,
      dominantHook,
      urlPresence: topQuartile.length
        ? topQuartile.filter(e => e.hasUrl).length / topQuartile.length
        : 0,
    },
  };
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(s.length - 1, Math.floor(s.length * p)));
  return s[idx];
}

/**
 * Get benchmarks for a channel — cached on the Canal document with a 24h TTL.
 * Returns the cached payload if fresh, otherwise recomputes and stores.
 */
async function getBenchmarks(canalId, { force = false } = {}) {
  const canal = await Canal.findById(canalId).select('copyBenchmarksCache plataforma categoria').lean();
  if (!canal) throw new Error('Canal no encontrado');

  const cache = canal.copyBenchmarksCache;
  const isFresh = cache?.fetchedAt
    && (Date.now() - new Date(cache.fetchedAt).getTime()) < CACHE_TTL_MS;

  if (cache && isFresh && !force) {
    return { ...cache, fresh: true };
  }

  const fresh = await computeBenchmarks(canalId);
  // Annotate the channel context that the analyzer needs
  fresh.plataforma = canal.plataforma;
  fresh.categoria = canal.categoria;

  await Canal.updateOne(
    { _id: canalId },
    { $set: { copyBenchmarksCache: fresh } }
  );

  return { ...fresh, fresh: true };
}

module.exports = {
  computeBenchmarks,
  getBenchmarks,
  // Exported for testing
  detectHook,
  countEmojis,
};
