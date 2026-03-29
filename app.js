const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Pre-load every route module so Vercel's static tracer can bundle
// them. Each require() is a literal string at the top level so the
// nft/esbuild tracer sees it. Errors are captured per-module so a
// single failing route doesn't crash the whole application.
const _routes = {};
try { _routes['./routes/auth']          = require('./routes/auth');          } catch (e) { _routes['./routes/auth']          = e; }
try { _routes['./routes/channels']      = require('./routes/channels');      } catch (e) { _routes['./routes/channels']      = e; }
try { _routes['./routes/canales']       = require('./routes/canales');       } catch (e) { _routes['./routes/canales']       = e; }
try { _routes['./routes/campaigns']     = require('./routes/campaigns');     } catch (e) { _routes['./routes/campaigns']     = e; }
try { _routes['./routes/transacciones'] = require('./routes/transacciones'); } catch (e) { _routes['./routes/transacciones'] = e; }
try { _routes['./routes/estadisticas']  = require('./routes/estadisticas');  } catch (e) { _routes['./routes/estadisticas']  = e; }
try { _routes['./routes/lists']         = require('./routes/lists');         } catch (e) { _routes['./routes/lists']         = e; }
try { _routes['./routes/partnerApi']    = require('./routes/partnerApi');    } catch (e) { _routes['./routes/partnerApi']    = e; }
try { _routes['./routes/anuncios']      = require('./routes/anuncios');      } catch (e) { _routes['./routes/anuncios']      = e; }
try { _routes['./routes/notifications'] = require('./routes/notifications'); } catch (e) { _routes['./routes/notifications'] = e; }
try { _routes['./routes/files']         = require('./routes/files');         } catch (e) { _routes['./routes/files']         = e; }
try { _routes['./routes/disputes']      = require('./routes/disputes');      } catch (e) { _routes['./routes/disputes']      = e; }
try { _routes['./routes/userLists']     = require('./routes/userLists');     } catch (e) { _routes['./routes/userLists']     = e; }
try { _routes['./routes/autobuy']       = require('./routes/autobuy');       } catch (e) { _routes['./routes/autobuy']       = e; }
try { _routes['./routes/partnerWebhook'] = require('./routes/partnerWebhook'); } catch (e) { _routes['./routes/partnerWebhook'] = e; }

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

// Stripe webhook MUST be mounted before express.json() — it needs the raw body
// for stripe.webhooks.constructEvent() HMAC signature verification.
{
  const webhookRoute = _routes['./routes/partnerWebhook'];
  if (webhookRoute && !(webhookRoute instanceof Error)) {
    app.use('/api/partners/webhooks/stripe', webhookRoute);
  }
}

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
      ...(ENV === 'development' && mountError ? { error: mountError.message || String(mountError) } : {})
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
  ['/api/lists', './routes/userLists'],
  ['/api/lists/public', './routes/lists'],
  ['/api/partners', './routes/partnerApi'],
  ['/api/anuncios', './routes/anuncios'],
  ['/api/notifications', './routes/notifications'],
  ['/api/files', './routes/files'],
  ['/api/disputes', './routes/disputes'],
  ['/api/autobuy', './routes/autobuy'],
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
