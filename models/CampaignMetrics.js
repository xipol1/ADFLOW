const mongoose = require('mongoose');

/**
 * CampaignMetrics
 *
 * Almacena las métricas de un post de campaña con snapshots en el tiempo.
 * Un documento por anuncio × canal.
 *
 * Los snapshots se añaden en: publicación, 1h, 6h, 24h, 72h, 7d.
 */

const SnapshotSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true, default: Date.now },
  horas: { type: Number }, // horas desde la publicación

  // Métricas universales
  views: { type: Number, default: null },
  reach: { type: Number, default: null },
  impresiones: { type: Number, default: null },
  forwards: { type: Number, default: null },
  reactions: { type: Number, default: null },
  clicks: { type: Number, default: 0 },
  conversiones: { type: Number, default: 0 },

  // Datos específicos por plataforma (schema flexible)
  plataformaData: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false });

const CampaignMetricsSchema = new mongoose.Schema({
  anuncioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Anuncio',
    required: true,
    index: true,
  },
  canalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Canal',
    required: true,
    index: true,
  },
  plataforma: {
    type: String,
    enum: ['telegram', 'discord', 'whatsapp', 'instagram'],
    required: true,
  },

  // ─── Referencia al post publicado ────────────────────────────────────────
  postId: { type: String }, // message_id, media_id, etc.
  postUrl: { type: String }, // permalink si aplica
  publicadoEn: { type: Date },

  // ─── Fuente de datos y tier de verificación ───────────────────────────────
  fuenteDatos: {
    type: String,
    enum: ['admin_directo', 'oauth_graph', 'bot_miembro', 'screenshot_ocr', 'declarado', 'tracking_url'],
    default: 'tracking_url',
  },
  nivelVerificacion: {
    type: String,
    enum: ['platino', 'oro', 'plata', 'bronce'],
    default: 'bronce',
  },
  confianzaScore: { type: Number, min: 0, max: 100, default: 0 },

  // ─── Snapshots temporales ─────────────────────────────────────────────────
  snapshots: [SnapshotSchema],

  // ─── Métricas finales (último snapshot disponible) ────────────────────────
  metricsFinales: {
    views: { type: Number, default: null },
    reach: { type: Number, default: null },
    impresiones: { type: Number, default: null },
    forwards: { type: Number, default: null },
    reactions: { type: Number, default: null },
    clicks: { type: Number, default: 0 },
    conversiones: { type: Number, default: 0 },
    ctr: { type: Number, default: null }, // %
    engagementRate: { type: Number, default: null }, // %
    cpm: { type: Number, default: null }, // coste por mil vistas
    cpc: { type: Number, default: null }, // coste por click
  },

  // ─── Reacciones detalladas (solo Telegram y Discord) ─────────────────────
  reactionsDetalle: { type: mongoose.Schema.Types.Mixed, default: {} },

  // ─── Datos específicos de plataforma ─────────────────────────────────────

  // Telegram
  telegramData: {
    viewsNativos: { type: Boolean, default: false },
    statsApiDisponible: { type: Boolean, default: false },
    linkedGroupActivity: { type: Number, default: null },
  },

  // Discord
  discordData: {
    channelId: { type: String },
    threadReplies: { type: Number, default: 0 },
    membersOnlineAlPublicar: { type: Number, default: null },
  },

  // WhatsApp
  whatsappData: {
    adminAccess: { type: Boolean, default: false },
    messageId: { type: String, default: '' },
    viewsLeidas: { type: Number, default: 0 },
    reactionsLeidas: { type: mongoose.Schema.Types.Mixed, default: {} },
    watermarkValido: { type: Boolean, default: null },
    screenshotVerificado: { type: Boolean, default: false },
  },

  // Instagram
  instagramData: {
    mediaId: { type: String },
    mediaType: { type: String },
    guardados: { type: Number, default: 0 },
    videoPlays: { type: Number, default: 0 },
    demographicReach: { type: mongoose.Schema.Types.Mixed },
  },

  // ─── Flags de calidad ─────────────────────────────────────────────────────
  flagFraude: { type: Boolean, default: false },
  flagFraudeRazon: { type: String },
  revisadoManualmente: { type: Boolean, default: false },

  // ─── Estado de sincronización ─────────────────────────────────────────────
  ultimaSync: { type: Date, default: null },
  proximaSync: { type: Date, default: null },
  syncCompletada: { type: Boolean, default: false },

}, { timestamps: true });

// ─── Índices ─────────────────────────────────────────────────────────────────
CampaignMetricsSchema.index({ anuncioId: 1, canalId: 1 }, { unique: true });
CampaignMetricsSchema.index({ plataforma: 1, publicadoEn: -1 });
CampaignMetricsSchema.index({ nivelVerificacion: 1, confianzaScore: -1 });
CampaignMetricsSchema.index({ proximaSync: 1, syncCompletada: 1 });

// ─── Métodos de instancia ─────────────────────────────────────────────────────

CampaignMetricsSchema.methods.addSnapshot = function(data, horasDesdePublicacion) {
  const snapshot = {
    timestamp: new Date(),
    horas: horasDesdePublicacion,
    ...data,
  };
  this.snapshots.push(snapshot);

  // Actualizar métricas finales con el snapshot más reciente
  this.metricsFinales = {
    views: data.views ?? this.metricsFinales.views,
    reach: data.reach ?? this.metricsFinales.reach,
    impresiones: data.impresiones ?? this.metricsFinales.impresiones,
    forwards: data.forwards ?? this.metricsFinales.forwards,
    reactions: data.reactions ?? this.metricsFinales.reactions,
    clicks: Math.max(data.clicks || 0, this.metricsFinales.clicks || 0),
    conversiones: Math.max(data.conversiones || 0, this.metricsFinales.conversiones || 0),
  };

  // Calcular ratios derivados
  const views = this.metricsFinales.views || this.metricsFinales.reach;
  const clicks = this.metricsFinales.clicks;
  if (views && clicks) {
    this.metricsFinales.ctr = Math.round((clicks / views) * 10000) / 100;
  }

  return this;
};

CampaignMetricsSchema.methods.calcularConfianza = function() {
  const pesos = {
    admin_directo: 95,
    oauth_graph: 95,
    bot_miembro: 70,
    screenshot_ocr: 80,
    declarado: 40,
    tracking_url: 30,
  };

  let score = pesos[this.fuenteDatos] || 30;

  if (this.metricsFinales.clicks > 0 && this.metricsFinales.views > 0) {
    score = Math.min(100, score + 5);
  }

  if (this.snapshots.length >= 3) {
    score = Math.min(100, score + 5);
  }

  this.confianzaScore = score;

  if (score >= 90) this.nivelVerificacion = 'platino';
  else if (score >= 75) this.nivelVerificacion = 'oro';
  else if (score >= 55) this.nivelVerificacion = 'plata';
  else this.nivelVerificacion = 'bronce';

  return score;
};

CampaignMetricsSchema.methods.detectarFraude = function(benchmarkCTR = { min: 0.003, max: 0.30 }) {
  const views = this.metricsFinales.views;
  const clicks = this.metricsFinales.clicks;

  if (!views || !clicks) return false;

  const ctr = clicks / views;
  const esSospechoso = ctr > benchmarkCTR.max || (views > 100 && ctr < benchmarkCTR.min / 10);

  if (esSospechoso) {
    this.flagFraude = true;
    this.flagFraudeRazon = ctr > benchmarkCTR.max
      ? `CTR imposible: ${(ctr * 100).toFixed(2)}% (máx esperado ${(benchmarkCTR.max * 100).toFixed(0)}%)`
      : `CTR anormalmente bajo con muchas vistas declaradas`;
  }

  return this.flagFraude;
};

// ─── Statics ──────────────────────────────────────────────────────────────────

CampaignMetricsSchema.statics.getPendingSync = function() {
  return this.find({
    syncCompletada: false,
    proximaSync: { $lte: new Date() },
  }).populate('anuncioId canalId');
};

module.exports = mongoose.models.CampaignMetrics
  || mongoose.model('CampaignMetrics', CampaignMetricsSchema);
