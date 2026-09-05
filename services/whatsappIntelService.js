/**
 * WhatsApp Intel Service — pulls channel-level engagement metrics for
 * WhatsApp Channels (newsletters) connected via Baileys.
 *
 * Mirrors the shape of telegramIntelService.js:
 *   - getChannelMetrics(canalId)  → returns { participants_count,
 *     avg_views_last_20_posts, engagement_rate, post_frequency_per_week,
 *     views_trend, last_post_date, verified, unscrapable }
 *   - syncCanalIntel(canalId)     → fetch + scoring + Canal update + Snapshot
 *   - syncAllConnectedCanales()   → iterate all Canals with a connected
 *     BaileysSession linked, run syncCanalIntel for each
 *
 * Engagement proxy: WhatsApp newsletters expose subscriber count + per-post
 * reactions and (in some Baileys versions) view counts. We compute:
 *   - avg_reactions   = average reactions count across the last N messages
 *   - engagement_rate = avg_reactions / subscribers
 *   - avg_views_last_20_posts = view count if exposed by Baileys, else
 *     reactions × 10 (rough proxy)
 *   - post_frequency_per_week = posts / weeks between newest and oldest msg
 *   - views_trend  = (avg(recent10) − avg(older10)) / avg(older10)
 *   - last_post_date = newest message timestamp
 *
 * Snapshots are written with `version: 3` to distinguish from MTProto v2.
 */

'use strict';

const Canal = require('../models/Canal');
const BaileysSession = require('../models/BaileysSession');
const CanalScoreSnapshot = require('../models/CanalScoreSnapshot');
const baileysManager = require('./baileys/BaileysSessionManager');
const { calcularCAS } = require('./channelScoringV2');

const SCRAPE_ENGINE_VERSION = 3; // 2 = MTProto Telegram, 3 = Baileys WhatsApp
const FETCH_MESSAGE_COUNT = 20;
const RATE_LIMIT_MS = 5000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// Compute metrics from a normalized message list
// ─────────────────────────────────────────────────────────────────────────────
function computeMetrics(messages, refDate = new Date()) {
  const parsed = (messages || [])
    .filter((m) => m && m.timestamp)
    .map((m) => ({
      ...m,
      reactionsTotal: (m.reactions || []).reduce((acc, r) => acc + (r.count || 0), 0),
    }));

  if (parsed.length === 0) {
    return {
      message_count: 0,
      avg_reactions: 0,
      avg_views: 0,
      reactions_trend: null,
      post_frequency_per_week: null,
      last_post_date: null,
    };
  }

  parsed.sort((a, b) => b.timestamp - a.timestamp);
  const reactionCounts = parsed.map((m) => m.reactionsTotal);
  const viewCounts = parsed.map((m) => Number(m.viewCount) || 0).filter((v) => v > 0);

  const avgReactions = reactionCounts.reduce((a, b) => a + b, 0) / reactionCounts.length;
  const avgViews = viewCounts.length > 0
    ? viewCounts.reduce((a, b) => a + b, 0) / viewCounts.length
    : 0;

  let trend = null;
  if (parsed.length >= 20) {
    const recent = reactionCounts.slice(0, 10);
    const older  = reactionCounts.slice(10, 20);
    const avgR = recent.reduce((a, b) => a + b, 0) / recent.length;
    const avgO = older.reduce((a, b) => a + b, 0) / older.length;
    trend = avgO > 0 ? parseFloat(((avgR - avgO) / avgO).toFixed(4)) : null;
  }

  let freq = null;
  if (parsed.length >= 2) {
    const newest = parsed[0].timestamp;
    const oldest = parsed[parsed.length - 1].timestamp;
    const spanWeeks = (newest - oldest) / (7 * 86_400_000);
    if (spanWeeks > 0) freq = parseFloat((parsed.length / spanWeeks).toFixed(2));
  }

  return {
    message_count: parsed.length,
    avg_reactions: Math.round(avgReactions),
    avg_views: Math.round(avgViews),
    reactions_trend: trend,
    post_frequency_per_week: freq,
    last_post_date: parsed[0].timestamp,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// getChannelMetrics(canalId): returns the same shape as telegramIntelService's
// getChannelMetrics so the rest of the pipeline doesn't need to branch.
// ─────────────────────────────────────────────────────────────────────────────
async function getChannelMetrics(canalId) {
  const canal = await Canal.findById(canalId).lean();
  if (!canal) throw new Error(`Canal ${canalId} no encontrado`);
  if (canal.plataforma !== 'whatsapp') {
    throw new Error(`Canal ${canalId} no es WhatsApp (plataforma=${canal.plataforma})`);
  }

  const sessionId = canal.botConfig?.whatsapp?.baileysSessionId;
  const newsletterJid = canal.botConfig?.whatsapp?.channelJid;

  if (!sessionId || !newsletterJid) {
    return {
      participants_count: canal.estadisticas?.seguidores ?? null,
      avg_views_last_20_posts: null,
      engagement_rate: null,
      post_frequency_per_week: null,
      views_trend: null,
      last_post_date: null,
      verified: !!canal.verificado,
      unscrapable: true,
      reason: 'no_baileys_session_linked',
    };
  }

  const session = await BaileysSession.findById(sessionId);
  if (!session || session.status !== 'connected') {
    return {
      participants_count: canal.estadisticas?.seguidores ?? null,
      avg_views_last_20_posts: null,
      engagement_rate: null,
      post_frequency_per_week: null,
      views_trend: null,
      last_post_date: null,
      verified: !!canal.verificado,
      unscrapable: true,
      reason: `session_status_${session?.status || 'missing'}`,
    };
  }

  // Refresh subscriber count from live metadata
  let participantsCount = canal.estadisticas?.seguidores ?? 0;
  let verified = !!canal.verificado;
  try {
    const meta = await baileysManager.fetchNewsletterMetadata(sessionId, newsletterJid);
    if (meta) {
      participantsCount = meta.subscribers_count ?? meta.subscribers ?? participantsCount;
      verified = meta.verification === 'VERIFIED' || verified;
    }
  } catch (err) {
    console.warn(`[whatsappIntel] fetchNewsletterMetadata failed for ${canalId}:`, err.message);
  }

  // Fetch messages + compute engagement
  let messages = [];
  try {
    messages = await baileysManager.fetchNewsletterMessages(sessionId, newsletterJid, FETCH_MESSAGE_COUNT);
  } catch (err) {
    console.warn(`[whatsappIntel] fetchNewsletterMessages failed for ${canalId}:`, err.message);
    return {
      participants_count: participantsCount,
      avg_views_last_20_posts: null,
      engagement_rate: null,
      post_frequency_per_week: null,
      views_trend: null,
      last_post_date: null,
      verified,
      unscrapable: true,
      reason: 'fetch_messages_unsupported',
    };
  }

  const m = computeMetrics(messages);
  const avgViewsProxy = m.avg_views > 0 ? m.avg_views : m.avg_reactions * 10;
  const engagementRate =
    participantsCount > 0 && m.avg_reactions > 0
      ? parseFloat((m.avg_reactions / participantsCount).toFixed(4))
      : 0;

  return {
    participants_count: participantsCount,
    avg_views_last_20_posts: avgViewsProxy,
    engagement_rate: engagementRate,
    post_frequency_per_week: m.post_frequency_per_week,
    views_trend: m.reactions_trend,
    last_post_date: m.last_post_date,
    verified,
    unscrapable: false,
    message_count: m.message_count,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// syncCanalIntel: full pipeline for one canal
// ─────────────────────────────────────────────────────────────────────────────
async function syncCanalIntel(canalId) {
  const canal = await Canal.findById(canalId).lean();
  if (!canal) throw new Error(`Canal ${canalId} no encontrado`);

  const metrics = await getChannelMetrics(canalId);

  // If completely unscrapable, refresh the stub-only fields and bail.
  if (metrics.unscrapable) {
    await Canal.updateOne(
      { _id: canalId },
      {
        $set: {
          'estadisticas.seguidores': metrics.participants_count ?? canal.estadisticas?.seguidores ?? 0,
          'estadisticas.ultimaActualizacion': new Date(),
          verificado: !!metrics.verified,
        },
      }
    );
    return { canalId, status: 'unscrapable', reason: metrics.reason, metrics };
  }

  const enriched = {
    ...canal,
    estadisticas: {
      ...canal.estadisticas,
      seguidores: metrics.participants_count,
      promedioVisualizaciones: metrics.avg_views_last_20_posts ?? 0,
    },
    verificacion: canal.verificacion || { tipoAcceso: 'declarado' },
    antifraude: canal.antifraude || { flags: [] },
    crawler: {
      ...canal.crawler,
      ultimaActualizacion: new Date(),
      ultimoPostNum: metrics.last_post_date ? Math.floor(metrics.last_post_date.getTime() / 1000) : null,
    },
    _mtprotoIntel: {
      engagement_rate: metrics.engagement_rate,
      views_trend: metrics.views_trend,
      post_frequency_per_week: metrics.post_frequency_per_week,
      verified: !!metrics.verified,
    },
  };

  const scores = calcularCAS(enriched, [], canal.categoria || 'medios_comunicacion');

  await Canal.updateOne({ _id: canalId }, {
    $set: {
      'estadisticas.seguidores': metrics.participants_count,
      'estadisticas.ultimaActualizacion': new Date(),
      'estadisticas.promedioVisualizaciones': metrics.avg_views_last_20_posts ?? 0,
      verificado: !!metrics.verified,
      CAF: scores.CAF, CTF: scores.CTF, CER: scores.CER, CVS: scores.CVS,
      CAS: scores.CAS, nivel: scores.nivel, CPMDinamico: scores.CPMDinamico,
      'verificacion.confianzaScore': scores.confianzaScore,
      'antifraude.ratioCTF_CAF': scores.ratioCTF_CAF,
      'antifraude.flags': scores.flags,
      'antifraude.ultimaRevision': new Date(),
    },
  });

  const snap = await CanalScoreSnapshot.create({
    canalId: canal._id, fecha: new Date(),
    CAF: scores.CAF, CTF: scores.CTF, CER: scores.CER, CVS: scores.CVS,
    CAP: canal.CAP ?? 50, CAS: scores.CAS,
    nivel: scores.nivel, CPMDinamico: scores.CPMDinamico,
    confianzaScore: scores.confianzaScore,
    ratioCTF_CAF: scores.ratioCTF_CAF, flags: scores.flags,
    seguidores: metrics.participants_count,
    nicho: canal.categoria || 'medios_comunicacion',
    plataforma: 'whatsapp',
    version: SCRAPE_ENGINE_VERSION,
    telegramIntel: {
      // shape reused as generic platform-intel envelope
      avg_views_last_20_posts: metrics.avg_views_last_20_posts,
      engagement_rate: metrics.engagement_rate,
      post_frequency_per_week: metrics.post_frequency_per_week,
      views_trend: metrics.views_trend,
      last_post_date: metrics.last_post_date,
      verified: !!metrics.verified,
    },
  });

  return {
    canalId,
    status: 'synced',
    metrics,
    scores,
    snapshotId: snap._id,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// syncAllConnectedCanales: cron entrypoint
// ─────────────────────────────────────────────────────────────────────────────
async function syncAllConnectedCanales() {
  const start = Date.now();

  // Canales WA con baileysSessionId apuntando a una sesión 'connected'
  const sessions = await BaileysSession.find({ status: 'connected' }).select('_id').lean();
  const sessionIds = sessions.map((s) => s._id);

  if (sessionIds.length === 0) {
    return { processed: 0, errors: [], duration_ms: Date.now() - start };
  }

  const canales = await Canal.find({
    plataforma: 'whatsapp',
    'botConfig.whatsapp.baileysSessionId': { $in: sessionIds },
    'botConfig.whatsapp.channelJid': { $exists: true, $ne: '' },
  }).select('_id nombreCanal').lean();

  const errors = [];
  let processed = 0;
  for (const canal of canales) {
    try {
      const r = await syncCanalIntel(canal._id);
      if (r.status === 'synced') processed++;
      else errors.push(`Canal ${canal._id} (${canal.nombreCanal}): ${r.status} ${r.reason || ''}`);
    } catch (err) {
      errors.push(`Canal ${canal._id} (${canal.nombreCanal}): ${err.message}`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  return { processed, errors, duration_ms: Date.now() - start };
}

module.exports = {
  getChannelMetrics,
  syncCanalIntel,
  syncAllConnectedCanales,
  computeMetrics, // exported for unit testing
};
