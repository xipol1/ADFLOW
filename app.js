const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Pre-load route modules with per-module error capture.
// Static require() literals are needed so Vercel's file tracer
// includes all backend files in the serverless function bundle.
const _preload = (mod) => { try { return require(mod); } catch (e) { return e; } };
const _routes = {
  './routes/auth':          _preload('./routes/auth'),
  './routes/channels':      _preload('./routes/channels'),
  './routes/canales':       _preload('./routes/canales'),
  './routes/campaigns':     _preload('./routes/campaigns'),
  './routes/transacciones': _preload('./routes/transacciones'),
  './routes/estadisticas':  _preload('./routes/estadisticas'),
  './routes/lists':         _preload('./routes/lists'),
  './routes/partnerApi':    _preload('./routes/partnerApi'),
  './routes/anuncios':      _preload('./routes/anuncios'),
  './routes/notifications': _preload('./routes/notifications'),
  './routes/files':         _preload('./routes/files'),
};

const app = express();

const ENV = process.env.NODE_ENV || 'development';
const MAX_REQUEST_SIZE = process.env.MAX_REQUEST_SIZE || '10mb';
const FRONTEND_URL = process.env.FRONTEND_URL || '';

app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.set('trust proxy', 1);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (ENV !== 'production') return cb(null, true);
    // Allow Vercel preview and production deployments
    if (origin.endsWith('.vercel.app')) return cb(null, true);
    if (FRONTEND_URL && origin === FRONTEND_URL) return cb(null, true);
    return cb(new Error('Origin no permitido por CORS'));
  },
  credentials: false
}));
app.use(compression());
app.use(morgan(ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: MAX_REQUEST_SIZE }));
app.use(express.urlencoded({ extended: true, limit: MAX_REQUEST_SIZE }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: ENV
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Tracking redirect: GET /r/:campaignId
app.get('/r/:campaignId', async (req, res) => {
  const campaignId = req.params.campaignId;

  // Fire-and-forget click recording
  setImmediate(async () => {
    try {
      const { ensureDb } = require('./lib/ensureDb');
      const ok = await ensureDb();
      if (!ok) return;

      const Campaign = require('./models/Campaign');
      const Tracking = require('./models/Tracking');

      const campaign = await Campaign.findById(campaignId).select('targetUrl status').lean();
      if (!campaign) return;

      const ip = req.ip || req.headers['x-forwarded-for'] || '';

      // Deduplication: same IP within 1 hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recent = await Tracking.exists({
        campaign: campaign._id,
        ip,
        timestamp: { $gte: oneHourAgo }
      });

      if (!recent) {
        await Tracking.create({ campaign: campaign._id, ip, timestamp: new Date() });
      }
    } catch (_) {
      // Silent fail — tracking must never break the redirect
    }
  });

  // Resolve target URL then redirect
  try {
    const { ensureDb } = require('./lib/ensureDb');
    const ok = await ensureDb();
    if (ok) {
      const Campaign = require('./models/Campaign');
      const campaign = await Campaign.findById(campaignId).select('targetUrl').lean();
      if (campaign?.targetUrl) {
        return res.redirect(302, campaign.targetUrl);
      }
    }
  } catch (_) {
    // Fall through to 404
  }

  return res.status(404).json({ success: false, message: 'Campaña no encontrada' });
});

const safeMount = (mountPath, modulePath) => {
  const preloaded = _routes[modulePath];
  const router = (preloaded instanceof Error) ? null : preloaded;
  const mountError = (preloaded instanceof Error) ? preloaded : null;

  if (router) {
    app.use(mountPath, router);
    return;
  }

  if (mountError) {
    console.error(`SAFE MOUNT ERROR (${mountPath} -> ${modulePath}):`, mountError);
  }

  app.use(mountPath, (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Servicio no disponible',
      ...(mountError ? { error: mountError.message || String(mountError), stack: mountError.stack } : {})
    });
  });
};

const enabledRoutes = [
  ['/api/auth', './routes/auth'],
  ['/auth', './routes/auth'],
  ['/api/channels', './routes/channels'],
  ['/channels', './routes/channels'],
  ['/api/canales', './routes/canales'],
  ['/api/campaigns', './routes/campaigns'],
  ['/campaigns', './routes/campaigns'],
  ['/api/transacciones', './routes/transacciones'],
  ['/api/estadisticas', './routes/estadisticas'],
  ['/api/lists', './routes/lists'],
  ['/api/partners', './routes/partnerApi'],
  ['/api/anuncios', './routes/anuncios'],
  ['/api/notifications', './routes/notifications'],
  ['/api/files', './routes/files'],
];

enabledRoutes.forEach(([mountPath, modulePath]) => safeMount(mountPath, modulePath));

const distPath = path.join(__dirname, 'dist');
const distIndex = path.join(distPath, 'index.html');
const hasDist = fs.existsSync(distIndex);

if (hasDist) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api')) return next();
    if (req.path.startsWith('/uploads') || req.path.startsWith('/public')) return next();
    res.sendFile(distIndex);
  });
}

app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.path} no encontrada`,
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  if (hasDist) {
    res.status(404).sendFile(distIndex);
    return;
  }
  res.status(404).json({
    success: false,
    message: `Ruta ${req.path} no encontrada`,
    timestamp: new Date().toISOString()
  });
});

app.use((error, req, res, next) => {
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Error interno del servidor',
    ...(ENV === 'development' && { stack: error.stack })
  });
});

module.exports = app;
