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
    nombre: process.env.APP_NAME || 'ChannelAd'
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
    issuer: process.env.JWT_ISSUER || 'channelad',
    audience: process.env.JWT_AUDIENCE || 'channelad'
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
    // .trim() guards against trailing \n in Vercel env vars (copy-paste artefact)
    service: (process.env.EMAIL_PROVIDER || '').trim(),
    host: (process.env.EMAIL_HOST || '').trim(),
    port: toInt(process.env.EMAIL_PORT, 587),
    secure: toBool(process.env.EMAIL_SECURE, false),
    auth: {
      user: (process.env.EMAIL_USER || '').trim(),
      pass: (process.env.EMAIL_PASS || '').trim()
    },
    from: {
      name: (process.env.EMAIL_FROM_NAME || 'ChannelAd').trim(),
      address: (process.env.EMAIL_FROM_ADDRESS || '').trim()
    },
    support: (process.env.SUPPORT_EMAIL || '').trim()
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
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    oauthCallbackPath: '/api/oauth/linkedin/callback',
    // LinkedIn REST API version used for the `/rest/*` versioned endpoints.
    // 202603 supports memberFollowersCount (introduced 202504),
    // memberCreatorVideoAnalytics (202506), and all organization endpoints.
    // Legacy `/v2/*` endpoints do not need this header.
    restApiVersion: '202603',
    // Scopes requested on every OAuth authorization. LinkedIn is tolerant:
    // if the app does not have a scope approved in the Developer Portal,
    // the scope is silently dropped from the granted set — the authorize
    // URL does NOT fail. Our metrics services are scope-tolerant and log
    // 403s without crashing.
    //
    // Required Developer Portal products for each scope:
    //   openid, profile, email       → "Sign In with LinkedIn using OpenID Connect"
    //   w_member_social              → "Share on LinkedIn"
    //   r_member_social              → "Share on LinkedIn" (read, added 2024)
    //   r_liteprofile                → "Sign In with LinkedIn" (legacy, still works)
    //   r_member_profileAnalytics    → "Community Management API" (NEW: needed
    //                                   for /rest/memberFollowersCount which gives
    //                                   the creator's total follower count)
    //   r_organization_social        → "Community Management API"
    //   w_organization_social        → "Community Management API"
    //   rw_organization_admin        → "Community Management API" OR "Advertising API"
    scopes: [
      'openid',
      'profile',
      'email',
      'w_member_social',
      'r_member_social',
      'r_liteprofile',
      'r_member_profileAnalytics',
      'r_organization_social',
      'w_organization_social',
      'rw_organization_admin',
    ].join(','),
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || '',
  },
};
