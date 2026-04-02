const env = process.env.NODE_ENV || 'development';

const toInt = (value, fallback) => {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : fallback;
};

const toBool = (value, fallback) => {
  if (value == null) return fallback;
  const v = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(v)) return true;
  if (['false', '0', 'no', 'n'].includes(v)) return false;
  return fallback;
};

const databaseUri = process.env.MONGODB_URI || '';

module.exports = {
  app: {
    nombre: process.env.APP_NAME || 'Plataforma Monetización'
  },
  server: {
    environment: env,
    port: toInt(process.env.PORT, 5000),
    host: process.env.HOST || '0.0.0.0'
  },
  frontend: {
    url: process.env.FRONTEND_URL || ''
  },
  database: {
    uri: databaseUri
  },
  jwt: {
    secret: process.env.JWT_SECRET || '',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'plataforma-monetizacion',
    audience: process.env.JWT_AUDIENCE || 'plataforma-monetizacion'
  },
  security: {
    bcryptRounds: toInt(process.env.BCRYPT_ROUNDS, 10)
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    currency: process.env.STRIPE_CURRENCY || 'usd'
  },
  email: {
    service: process.env.EMAIL_PROVIDER || '',
    host: process.env.EMAIL_HOST || '',
    port: toInt(process.env.EMAIL_PORT, 587),
    secure: toBool(process.env.EMAIL_SECURE, false),
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || ''
    },
    from: {
      name: process.env.EMAIL_FROM_NAME || 'Plataforma Monetización',
      address: process.env.EMAIL_FROM_ADDRESS || ''
    },
    support: process.env.SUPPORT_EMAIL || ''
  },
  demo: {
    enabled: toBool(process.env.DEMO_MODE, false),
    password: process.env.DEMO_PASSWORD || 'demo'
  },
  files: {
    uploadPath: process.env.UPLOADS_PATH || './uploads',
    maxFileSize: toInt(process.env.MAX_FILE_SIZE, 10 * 1024 * 1024),
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,image/webp,application/pdf').split(',')
  },
  meta: {
    appId: process.env.META_APP_ID || '',
    appSecret: process.env.META_APP_SECRET || '',
    graphApiVersion: 'v19.0',
    oauthCallbackPath: '/api/oauth/meta/callback',
    scopes: [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'instagram_basic',
      'instagram_manage_insights',
      'business_management',
    ].join(','),
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || '',
  },
};
