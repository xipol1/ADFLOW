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
try { _routes['./routes/tracking']       = require('./routes/tracking');       } catch (e) { _routes['./routes/tracking']       = e; }
try { _routes['./routes/reviews']        = require('./routes/reviews');        } catch (e) { _routes['./routes/reviews']        = e; }
try { _routes['./routes/oauth']          = require('./routes/oauth');          } catch (e) { _routes['./routes/oauth']          = e; }
try { _routes['./routes/referrals']      = require('./routes/referrals');      } catch (e) { _routes['./routes/referrals']      = e; }
try { _routes['./routes/payouts']        = require('./routes/payouts');        } catch (e) { _routes['./routes/payouts']        = e; }
try { _routes['./routes/invoices']       = require('./routes/invoices');       } catch (e) { _routes['./routes/invoices']       = e; }
try { _routes['./routes/onboarding']     = require('./routes/onboarding');     } catch (e) { _routes['./routes/onboarding']     = e; }
try { _routes['./routes/webhooks']       = require('./routes/webhooks');       } catch (e) { _routes['./routes/webhooks']       = e; }
try { _routes['./routes/adminScoring']   = require('./routes/adminScoring');   } catch (e) { _routes['./routes/adminScoring']   = e; }
try { _routes['./routes/adminMetrics']   = require('./routes/adminMetrics');   } catch (e) { _routes['./routes/adminMetrics']   = e; }
try { _routes['./routes/channelIntelligence'] = require('./routes/channelIntelligence'); } catch (e) { _routes['./routes/channelIntelligence'] = e; }
try { _routes['./routes/nicheIntelligence']   = require('./routes/nicheIntelligence');   } catch (e) { _routes['./routes/nicheIntelligence']   = e; }
try { _routes['./routes/telegramIntel']       = require('./routes/telegramIntel');       } catch (e) { _routes['./routes/telegramIntel']       = e; }
try { _routes['./routes/channelCandidates']   = require('./routes/channelCandidates');   } catch (e) { _routes['./routes/channelCandidates']   = e; }

// Pre-load for Vercel nft tracer (require only, don't execute swagger-jsdoc at top level)
let _swaggerPathsJson;
try { _swaggerPathsJson = require('./docs/swagger/paths.json'); } catch (_) {}

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

// Structured logging & request metrics
const logger = require('./lib/logger');
const { requestMetrics, getMetrics } = require('./middleware/requestMetrics');
app.use(requestMetrics);
logger.info('ChannelAd API starting', { env: ENV });

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

// Security middleware — sanitize inputs against NoSQL injection, XSS, and HTTP parameter pollution
try { app.use(require('express-mongo-sanitize')()); } catch (e) { console.warn('express-mongo-sanitize not loaded:', e.message); }
try { app.use(require('xss-clean')()); } catch (e) { console.warn('xss-clean not loaded:', e.message); }
try { app.use(require('hpp')()); } catch (e) { console.warn('hpp not loaded:', e.message); }

// Block access to sensitive files that could reveal tech stack or secrets
app.use((req, res, next) => {
  const blocked = /\/(package\.json|package-lock\.json|\.env|\.git|node_modules|tsconfig|vite\.config|\.claude)/i;
  if (blocked.test(req.path)) {
    return res.status(404).json({ success: false, message: 'Recurso no encontrado' });
  }
  next();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/health', async (req, res) => {
  try {
    const database = require('./config/database');
    const dbOk = database.estaConectado();
    const uptime = process.uptime();
    const memMB = Math.round(process.memoryUsage().rss / 1024 / 1024);
    const appMetrics = getMetrics();
    res.status(dbOk ? 200 : 503).json({
      status: dbOk ? 'ok' : 'degraded',
      db: dbOk ? 'connected' : 'disconnected',
      uptime: `${Math.floor(uptime / 60)}m`,
      memoryMB: memMB,
      requests: appMetrics.totalRequests,
      errorRate: appMetrics.errorRate
    });
  } catch {
    res.status(200).json({ status: 'ok' });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    const database = require('./config/database');
    const dbOk = database.estaConectado();
    res.status(dbOk ? 200 : 503).json({
      status: dbOk ? 'ok' : 'degraded',
      db: dbOk ? 'connected' : 'disconnected',
    });
  } catch {
    res.status(200).json({ status: 'ok' });
  }
});

// Swagger docs — only accessible in development or with valid auth token
try {
  const swaggerUi = require('swagger-ui-express');
  const swaggerSpec = require('./config/swagger');
  const swaggerCspMiddleware = (req, res, next) => {
    res.setHeader('Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
    );
    next();
  };
  const swaggerAuthGate = (req, res, next) => {
    if (ENV === 'development') return next();
    // In production, require a valid JWT with admin role
    try {
      const jwt = require('jsonwebtoken');
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.query.token;
      if (!token) return res.status(401).json({ success: false, message: 'No autorizado' });
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.rol !== 'admin') return res.status(403).json({ success: false, message: 'Solo administradores' });
      next();
    } catch {
      return res.status(401).json({ success: false, message: 'Token inválido' });
    }
  };
  app.use('/api/docs', swaggerAuthGate, swaggerCspMiddleware, swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Channelad API Docs',
  }));
  app.get('/api/docs.json', swaggerAuthGate, (req, res) => res.json(swaggerSpec));
} catch (e) {
  console.error('Swagger setup error:', e.message);
}

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

// ═══════════════════════════════════════════════════════════════════════════════
// SMART TRACKING REDIRECT: GET /t/:code
// Tracks clicks with full analytics then redirects to target URL
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/t/:code', async (req, res) => {
  const { code } = req.params;

  try {
    const { ensureDb } = require('./lib/ensureDb');
    const ok = await ensureDb();
    if (!ok) return res.redirect(302, '/');

    const TrackingLink = require('./models/TrackingLink');
    const link = await TrackingLink.findOne({ code, active: true });

    if (!link || !link.targetUrl) {
      return res.status(404).json({ success: false, message: 'Enlace no encontrado' });
    }

    // ── Collect click data ──
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '';
    const ua = req.headers['user-agent'] || '';
    const referer = req.headers['referer'] || req.headers['referrer'] || '';
    const language = (req.headers['accept-language'] || '').split(',')[0] || '';

    const { device, os, browser } = TrackingLink.parseDevice(ua);
    const country = TrackingLink.guessCountry(req);

    // Parse UTM params from query string
    const utmSource = req.query.utm_source || '';
    const utmMedium = req.query.utm_medium || '';
    const utmCampaign = req.query.utm_campaign || '';

    // ── Record click (fire-and-forget) ──
    setImmediate(async () => {
      try {
        const isNew = !link._seenIps.includes(ip);

        // Add click record (keep last 500)
        if (link.clicks.length >= 500) link.clicks.shift();
        link.clicks.push({
          ip, userAgent: ua, referer, country, device, os, browser, language,
          utmSource, utmMedium, utmCampaign, timestamp: new Date(),
        });

        // Update aggregated stats
        link.stats.totalClicks += 1;
        if (isNew) {
          link.stats.uniqueClicks += 1;
          link._seenIps.push(ip);
          // Cap _seenIps to 10000
          if (link._seenIps.length > 10000) link._seenIps = link._seenIps.slice(-8000);
        }
        link.stats.lastClickAt = new Date();
        link.stats.devices[device] = (link.stats.devices[device] || 0) + 1;
        if (country) link.stats.countries.set(country, (link.stats.countries.get(country) || 0) + 1);

        const refDomain = referer ? (() => { try { return new URL(referer).hostname } catch { return 'direct' } })() : 'direct';
        link.stats.referers.set(refDomain, (link.stats.referers.get(refDomain) || 0) + 1);

        await link.save();

        // ── Auto-verify channel if threshold reached ──
        if (link.type === 'verification' && link.verification?.status !== 'verified') {
          if (link.stats.uniqueClicks >= link.verification.minClicks) {
            link.verification.status = 'verified';
            link.verification.verifiedAt = new Date();
            await link.save();

            const Canal = require('./models/Canal');
            await Canal.findByIdAndUpdate(link.channel, {
              estado: 'activo',
              verificado: true,
              'estadisticas.ultimaActualizacion': new Date(),
            });
          } else if (link.verification.status === 'pending') {
            link.verification.status = 'posted';
            await link.save();
          }
        }
      } catch (_) { /* tracking must never fail */ }
    });

    // ── Build redirect URL with UTM passthrough ──
    let targetUrl = link.targetUrl;
    // Append UTMs from query to target if they exist and target doesn't have them
    if (utmSource || utmMedium || utmCampaign) {
      try {
        const url = new URL(targetUrl);
        if (utmSource && !url.searchParams.has('utm_source')) url.searchParams.set('utm_source', utmSource);
        if (utmMedium && !url.searchParams.has('utm_medium')) url.searchParams.set('utm_medium', utmMedium);
        if (utmCampaign && !url.searchParams.has('utm_campaign')) url.searchParams.set('utm_campaign', utmCampaign);
        targetUrl = url.toString();
      } catch { /* use original URL */ }
    }

    return res.redirect(302, targetUrl);
  } catch (_) {
    return res.redirect(302, '/');
  }
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
    console.error(`SAFE MOUNT ERROR (${mountPath} -> ${modulePath}):`, mountError.message || mountError);
  }

  app.use(mountPath, (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Servicio no disponible',
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
  ['/api/tracking', './routes/tracking'],
  ['/api/reviews', './routes/reviews'],
  ['/api/oauth', './routes/oauth'],
  ['/api/referrals', './routes/referrals'],
  ['/api/payouts', './routes/payouts'],
  ['/api/invoices', './routes/invoices'],
  ['/api/onboarding', './routes/onboarding'],
  ['/api/webhooks', './routes/webhooks'],
  ['/api/admin/scoring', './routes/adminScoring'],
  ['/api/admin/metrics', './routes/adminMetrics'],
  ['/api/channels', './routes/channelIntelligence'],
  ['/api/niche',    './routes/nicheIntelligence'],
  ['/api/jobs',     './routes/telegramIntel'],
  ['/api/jobs',     './routes/channelCandidates'],
  ['/api/channel-candidates', './routes/channelCandidates'],
];

enabledRoutes.forEach(([mountPath, modulePath]) => safeMount(mountPath, modulePath));

// Debug: list mounted routes (remove after diagnosis)
app.get('/api/debug/routes', (req, res) => {
  const mounted = enabledRoutes.map(([mp, mod]) => {
    const r = _routes[mod];
    return { path: mp, module: mod, status: r instanceof Error ? `ERROR: ${r.message}` : 'OK' };
  });
  res.json({ mounted, total: mounted.length, errors: mounted.filter(m => m.status !== 'OK').length });
});

// ─── Static blog: serve pre-built HTML from public/blog/ ───
const blogDir = path.join(__dirname, 'public', 'blog');
app.get('/blog', (req, res, next) => {
  const indexFile = path.join(blogDir, 'index.html');
  if (fs.existsSync(indexFile)) {
    res.setHeader('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600');
    return res.sendFile(indexFile);
  }
  next();
});
app.get('/blog/feed.xml', (req, res, next) => {
  const feedFile = path.join(blogDir, 'feed.xml');
  if (fs.existsSync(feedFile)) {
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.sendFile(feedFile);
  }
  next();
});
app.get('/blog/:slug', (req, res, next) => {
  const file = path.join(blogDir, `${req.params.slug}.html`);
  if (fs.existsSync(file)) {
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    return res.sendFile(file);
  }
  next();
});

// ─── Sitemap ───
app.get('/sitemap.xml', (req, res, next) => {
  const sitemapFile = path.join(__dirname, 'public', 'sitemap.xml');
  if (fs.existsSync(sitemapFile)) {
    res.setHeader('Content-Type', 'application/xml');
    return res.sendFile(sitemapFile);
  }
  next();
});

// ─── Robots.txt ───
app.get('/robots.txt', (req, res, next) => {
  const robotsFile = path.join(__dirname, 'public', 'robots.txt');
  if (fs.existsSync(robotsFile)) {
    res.setHeader('Content-Type', 'text/plain');
    return res.sendFile(robotsFile);
  }
  next();
});

const distPath = path.join(__dirname, 'dist');
const distIndex = path.join(distPath, 'index.html');
const hasDist = fs.existsSync(distIndex);

if (hasDist) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api')) return next();
    if (req.path.startsWith('/uploads') || req.path.startsWith('/public')) return next();
    if (req.path.startsWith('/blog')) return next();
    res.sendFile(distIndex);
  });
}

app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Recurso no encontrado',
  });
});

app.use((req, res) => {
  if (hasDist) {
    res.status(404).sendFile(distIndex);
    return;
  }
  res.status(404).json({
    success: false,
    message: 'Recurso no encontrado',
  });
});

// Error logging — persist errors to MongoDB in production
try {
  const { errorLoggingMiddleware } = require('./services/errorLogger');
  app.use(errorLoggingMiddleware);
} catch {}

app.use((error, req, res, next) => {
  if (ENV !== 'production') console.error(error);
  res.status(error.status || 500).json({
    success: false,
    message: ENV === 'production' ? 'Error interno del servidor' : (error.message || 'Error interno del servidor'),
  });
});

module.exports = app;
