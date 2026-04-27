# Channelad — Guia Tecnica para Desarrolladores

> Documento preparado para el equipo de soporte tecnico. Ultima actualizacion: 27 abril 2026.
> Cross-refs: [README.md](../README.md) (setup), [docs/architecture.md](architecture.md) (10-min mental model), [docs/glossary.md](glossary.md) (Spanish/English domain terms), [AUDIT.md](../AUDIT.md) (technical debt status), [SECURITY.md](../SECURITY.md) (secret rotation).

## 1. Vision general

**Channelad** (antes ADFLOW) es un marketplace B2B que conecta anunciantes con propietarios de canales en WhatsApp, Telegram, Discord, Instagram, Facebook, LinkedIn y Newsletter. Los anunciantes compran espacios publicitarios, los pagos se retienen en escrow, y los creators cobran cuando el anuncio se publica.

**URL produccion:** https://channelad.io
**Repositorio:** https://github.com/xipol1/ADFLOW
**Deploy:** Vercel (auto-deploy desde branch `main`, una unica funcion serverless `api/index.js`)

---

## 2. Stack tecnologico

| Capa | Tecnologia | Version |
|------|-----------|---------|
| Runtime | Node.js (pinned via .nvmrc) | >= 20 |
| Backend | Express | 4.18 |
| Base de datos | MongoDB Atlas | Mongoose 7.5 |
| Auth | JWT (access 15m + refresh 7d) + bcryptjs | - |
| 2FA | TOTP via otpauth + qrcode | - |
| Pagos | Stripe (Checkout, PaymentIntents, Connect Express) | 13.5 |
| Tiempo real | Socket.io | 4.7 |
| Frontend | React 18 + React Router 6 + Vite 4 | - |
| Email | Nodemailer (SMTP / Gmail / SendGrid / Mailgun / Ethereal) | 6.9 |
| Seguridad | Helmet, CORS allowlist, HPP, express-mongo-sanitize, rate-limit-mongo, express-rate-limit | - |
| Logs | Winston (JSON en prod, colorized en dev) + Morgan | 3.10 / 1.10 |
| Deploy | Vercel Serverless | maxDuration 60s |

---

## 3. Estructura del proyecto

```
channelad/
├── api/index.js              # Entry point Vercel serverless (re-exports app.js)
├── app.js                    # Express app: middleware, route mounts, blog/SPA catch-all
├── server.js                 # Local HTTP + Socket.io + cron + graceful shutdown
├── config/
│   ├── config.js             # Env vars centralizadas (jwt, stripe, email, meta, linkedin)
│   ├── commissions.js        # Tiers de comision + referral rate (single source of truth)
│   ├── database.js           # MongoDB connection + reconnection
│   ├── redis.js              # Redis client (rate-limit fallback, OTP TTL)
│   ├── nicheBenchmarks.js    # Benchmarks CPM/engagement por nicho
│   ├── swagger.js            # API docs config
│   └── validateEnv.js        # Boot-time env validation (strict en produccion)
├── controllers/              # 24 archivos
│   ├── authController.js     # Login, registro, password reset, email verification, Google OAuth
│   ├── twoFactorController.js # 2FA setup, verify, validate, disable
│   ├── campaignController.js # CRUD campanas + escrow + Stripe transfer + PayoutAttempt
│   ├── canalController.js    # CRUD canales del creator
│   ├── channelsController.js # Listado publico de canales (marketplace)
│   ├── oauthController.js    # Meta OAuth + LinkedIn OAuth + connect/disconnect
│   ├── platformConnectController.js # Telegram, Discord, WhatsApp, Newsletter connect
│   ├── payoutController.js   # Stripe Connect onboarding + withdrawals manuales
│   ├── disputeController.js  # Disputas con timeline + resolucion + reembolso
│   ├── claimController.js    # Reclamacion de canal pre-existente
│   ├── onboardingController.js # Wizard 7-pantallas para creators (post-rebrand)
│   ├── baileysController.js  # WhatsApp via baileys (VPS only)
│   └── … (CRUD anuncios, autobuy, tracking, files, lists, notifications, push, scoring)
├── models/                   # 34 schemas Mongoose
│   ├── Usuario.js            # Users (auth, referral, 2FA, Stripe Connect, lockout)
│   ├── Canal.js              # Channels (credentials encrypted, OAuth data, availability)
│   ├── Campaign.js           # Campaigns (status pipeline, delivery tracking, escrow)
│   ├── Transaccion.js        # Transactions (escrow, paid, refunded, referral, comision)
│   ├── PayoutAttempt.js      # Stripe Connect transfer tracking + retry queue
│   ├── TrackingLink.js       # Click tracking + verification links
│   ├── TrackingFingerprint.js # Per-link click dedup (out-of-document)
│   ├── Dispute.js            # Disputas (timeline, 4 resolution types, refund)
│   └── … (CampaignMetrics{V2}, Canal*, AutoBuyRule, Partner, BotToken, etc.)
├── services/                 # 38 services
│   ├── authService.js        # JWT generation, refresh rotation, session management
│   ├── emailService.js       # Nodemailer template rendering + transactional emails
│   ├── stripeConnectService.js # Stripe Express accounts + idempotent transfers
│   ├── partnerIntegrationService.js # Partner API: campaign CRUD, escrow, audit
│   ├── adDeliveryService.js  # Publish ads to platforms with 3x retry
│   ├── invoiceService.js     # HTML invoice generation
│   ├── errorLogger.js        # Error persistence to MongoDB (TTL)
│   ├── notificationService.js # DB + Socket.io + email + push notifications
│   ├── scoringOrchestrator.js # CAS scoring orchestration
│   ├── channelScoringV2.js   # Score calculation (CAF + CTF + CER + fillRate)
│   ├── tokenRefreshService.js # Auto-refresh Meta + LinkedIn tokens (cron)
│   ├── campaignSnapshotService.js # Final-snapshot capture on campaign complete
│   ├── nicheIntelligenceService.js # Niche-level analytics
│   ├── telemetrScraperService.js, tgstatScraperService.js, lyzemScraperService.js,
│   ├── multiplatformIntelService.js, telegramIntelService.js,
│   └── scrapers/, baileys/, newsletter/ subfolders
├── integraciones/            # SDK wrappers (7 files)
│   ├── telegram.js, discord.js, whatsapp.js, instagram.js,
│   ├── facebook.js, linkedin.js, newsletter.js
├── lib/
│   ├── logger.js             # Winston (JSON in prod, pretty in dev)
│   ├── platformConnectors.js # Master dispatcher per platform
│   ├── encryption.js         # AES-256 encrypt/decrypt for stored credentials
│   ├── ensureDb.js           # MongoDB connection guard
│   ├── campaignCron.js       # Periodic: expire, auto-complete, retry deliveries
│   ├── scoringEngine.js      # Pure functions: CAS / CAF / CTF / CER / pricing
│   ├── messageModeration.js  # Chat content moderation
│   └── partnerApiHttp.js     # Partner API HTTP helpers
├── middleware/
│   ├── auth.js               # JWT verify, role check, email verification gate
│   ├── rateLimiter.js        # MongoDB-backed distributed rate limiting
│   ├── validarCampos.js      # express-validator error formatter
│   ├── partnerAuth.js        # Bearer auth para Partner API
│   ├── partnerIdempotency.js # Cache de respuestas POST por Idempotency-Key
│   ├── partnerRequestContext.js # Request id + structured logging
│   └── requestMetrics.js     # Counters para /health endpoint
├── routes/                   # 34 route files (see API Reference below)
├── jobs/                     # Cron job entry points (telegram-intel, multiplatform, massive-seed)
├── workers/                  # Long-running processes (whatsappWorker.js — VPS only)
├── templates/emails/         # HTML email templates with base layout
├── client/                   # Frontend (Vite root)
│   ├── index.html            # Vite entry HTML
│   ├── styles/globals.css    # Global styles + design tokens
│   └── src/
│       ├── App.jsx, main.jsx
│       ├── auth/AuthContext.jsx   # Auth state, auto token refresh
│       ├── routes/AppRoutes.jsx   # All routes + FullAccessOnly gate + ComingSoon
│       ├── hooks/                 # useNotifications, usePushNotifications
│       ├── services/api.js        # Axios client + auto refresh on 401
│       └── ui/
│           ├── components/        # TwoFactorCard, DeliveryBadge, ComingSoon, …
│           ├── pages/             # Auth, dashboard, marketplace, onboarding, blog
│           ├── layouts/, navigation/, routing/
│           └── theme/tokens.js    # Design system (colors, fonts, spacing)
├── content/blog/             # Markdown sources for the static blog
├── docs/                     # README links here for deeper context
└── public/
    ├── manifest.json          # PWA manifest (logo SVG)
    ├── sw.js                  # Service worker (cache, push, offline)
    ├── logo.svg               # Single SVG icon used by manifest + favicon
    └── blog/*.html            # Generated blog (build-blog.js → public/blog/)
```

---

## 4. Autenticacion y seguridad

### Flujo de auth
1. **Registro** → JWT access (15m) + refresh (7d) + email verification token (24h)
2. **Login** → Verifica password + check lockout + check 2FA → tokens
3. **2FA** → Si habilitado: login devuelve `requires2FA: true` → frontend muestra input → `POST /auth/2fa/validate`
4. **Token refresh** → `POST /auth/refresh-token` → rota refresh token (old revocado) + nuevo access
5. **Auto-refresh frontend** → `api.js._tryRefreshToken()` se dispara automaticamente en 401

### Account lockout
- 5 intentos fallidos → cuenta bloqueada 30 minutos
- Se resetea al hacer login exitoso
- Campos: `failedLoginAttempts`, `lockedUntil` en Usuario

### 2FA / TOTP
- Setup: `POST /auth/2fa/setup` → QR code + secret
- Verify: `POST /auth/2fa/verify` → activa + devuelve 8 backup codes
- Validate (login): `POST /auth/2fa/validate` → valida TOTP o backup code
- Disable: `POST /auth/2fa/disable` → requiere password

### Encryption
- Credenciales de canales encriptadas con AES-256 (env: `ENCRYPTION_KEY`, 32 chars)
- Pre-save hook en `Canal.js` encripta: `botToken`, `accessToken`, `refreshToken`, `phoneNumberId`, `pageAccessToken`
- `getDecryptedCreds(channel)` para leer

### Password reset
- `POST /auth/solicitar-restablecimiento` (o alias `/auth/forgot-password`)
- Token de 1 hora, email con link
- `POST /auth/restablecer-password/:token` → cambia password + revoca todas las sesiones

### Middleware de seguridad (app.js)
```
helmet → cors (allowlist) → compression → morgan → requestMetrics
→ stripe partner webhook (raw body) → express.json → express.urlencoded
→ mongoSanitize → hpp → sensitive-paths filter (anchored regex)
→ /uploads + /public static → /api/health → /api/docs (admin gated)
→ tracking redirects (rate-limited) → mounted route modules
→ blog static serve → SPA catch-all → 404 → error logger → error handler
```

`xss-clean` fue eliminado en abril 2026 (deprecado desde 2018; React + helmet CSP cubren XSS mejor).

### CORS
- Allowlist construida en boot desde `FRONTEND_URL` + `CORS_ORIGIN.split(',')`.
- En produccion, ademas se aceptan hostnames `*.vercel.app` (suffix sobre `URL().hostname`, no string-include).
- En desarrollo, todo origen permitido para que `vite :5173` y dispositivos LAN funcionen sin config.
- Socket.io reusa la misma allowlist via `app.isAllowedOrigin`.

### Rate limiting
- `rate-limit-mongo` con MongoDB store (distribuido para serverless — counters sobreviven cold starts).
- Login: 10 req/15min, Registro: 5 req/1h, API general: 300 req/15min.
- Tracking redirects: 30 req/min por IP (anti click-flood).
- Chat de campanas: 1 msg cada 3s + max 60/h, keyed `(userId, campaignId)`.
- Fallback a memoria si MongoDB no disponible.

### Sensitive-path filter
Regex anclada al inicio de path-segment que rechaza con 404: `package.json`, `package-lock.json`, `.env*`, `.git`, `node_modules`, `tsconfig.json`, `vite.config.*`, `.claude`. La regex original matcheaba en cualquier substring, por lo que `/api/canales/.envio-noticias` daba 404 falso (resuelto en abril 2026, AUDIT.md A-8).

---

## 5. Flujo de campanas (core business)

```
DRAFT → PAID (escrow) → PUBLISHED → COMPLETED
                  ↓              ↓
              EXPIRED        DISPUTED → resolved (4 opciones)
                  ↓
              CANCELLED
```

### Paso a paso
1. **Advertiser crea campana** → `POST /api/campaigns` → status DRAFT + Transaccion pending.
2. **Pago** → `POST /api/transacciones/create-payment-intent` → devuelve `clientSecret` para Stripe Elements. Stripe procesa la tarjeta con `capture_method: manual` (escrow autorizado pero no capturado). Webhook `payment_intent.amount_capturable_updated` mueve Campaign → `PAID` y Transaccion → `escrow`.
3. **Creator publica** y la plataforma confirma. Tras la confirmacion del creator/admin, `POST /api/campaigns/:id/publish` → status `PUBLISHED` + dispara `adDeliveryService.deliverAd()`.
4. **Ad delivery** publica el contenido (Telegram, Discord, etc.) con 3 reintentos exponenciales.
5. **Completar** → `POST /api/campaigns/:id/complete`:
   - Campaign → `COMPLETED`.
   - Stripe `paymentIntents.capture(piId, { idempotencyKey: 'capture:<piId>' })` → escrow liberado.
   - Snapshot final + recalculo CAS no-bloqueante (`setImmediate`).
   - Crea/actualiza row en `PayoutAttempt` (status pending) **antes** de la transferencia, para que un fallo nunca se pierda en logs serverless (AUDIT.md A-9).
   - `setImmediate` ejecuta `stripeConnect.transferToCreator(netAmount, accountId, meta, { idempotencyKey: 'transfer:<campaignId>' })`. Marca `succeeded` o `failed` con `lastError`.
   - Genera credito de referido del 5% (constante `REFERRAL_RATE` en `config/commissions.js`).
   - Notifica a ambas partes.

### Comision y netAmount
- Tasa centralizada en `config/commissions.js` (`COMMISSION_TIERS.standard = 0.20`, partnerAPI 0.18, autoCampaign 0.25, etc.). Ningun otro archivo debe hardcodear porcentajes.
- `Campaign.netAmount = price * (1 - commissionRate)` recalculado en `pre('save')` cuando se inserta o cambian `price`/`commissionRate`. Helper `resolveNetAmount(campaign)` en el controller cubre docs legacy con netAmount = 0.

### Escrow
- `crearPaymentIntent` (`controllers/transaccionController.js`) crea PI con `capture_method: 'manual'` + `idempotencyKey: 'pi:<txId>'`.
- Webhook firmado por Stripe (HMAC) actualiza Transaccion + Campaign. Si falta `STRIPE_WEBHOOK_SECRET`, el webhook **rechaza con 503** — nunca acepta sin firma (AUDIT.md C-1).

### Ad Delivery
- Archivo: `services/adDeliveryService.js`.
- Retry: 3 intentos con backoff exponencial (5s, 15s, 45s).
- Tracking: `Campaign.delivery` = `{ status, attempts, error, platformMessageId, deliveredAt }`.
- Cron retry: `campaignCron.js` ejecuta `retryFailedDeliveries()` cada 10 min.

### Payouts fallidos
- Cada intento de transfer se persiste en `PayoutAttempt` con status, attempts, lastError, lastAttemptedAt, succeededAt, stripeTransferId, stripeIdempotencyKey.
- Endpoint admin para listar y reintentar: `GET /api/admin/payouts` (default = pending+processing+failed) y `POST /api/admin/payouts/:id/retry`. El reintento reusa la misma `idempotencyKey` para que dos clicks no generen dos transferencias.

---

## 6. Plataformas integradas

| Plataforma | Auth method | Connect endpoint | Publish method |
|-----------|------------|-----------------|---------------|
| Telegram | Bot token manual | `POST /api/oauth/telegram/connect` | `sendMessage` con inline keyboard |
| Discord | Bot token manual | `POST /api/oauth/discord/connect` | Embed message en canal |
| WhatsApp | Meta OAuth o manual | `POST /api/oauth/whatsapp/connect-manual` | CTA URL interactive message |
| Instagram | Meta OAuth | `POST /api/oauth/meta/connect` | Via page token (Graph API) |
| Facebook | Meta OAuth | `POST /api/oauth/meta/connect` | Page post con link |
| LinkedIn | LinkedIn OAuth | `POST /api/oauth/linkedin/connect` | UGC Post |
| Newsletter | API key manual | `POST /api/oauth/newsletter/connect` | No auto-publish (manual) |

### Meta OAuth flow
1. `GET /api/oauth/meta/authorize` → URL de Facebook Login
2. Facebook redirige a `/api/oauth/meta/callback` → exchange code → long-lived token (60d)
3. `GET /api/oauth/meta/accounts` → lista pages, Instagram, WhatsApp
4. `POST /api/oauth/meta/connect` → crea Canal records

### Token refresh
- Cron diario: `/api/oauth/meta/cron-refresh` renueva tokens que expiran en 7 dias
- Tambien renueva LinkedIn tokens automaticamente

---

## 7. Sistema de pagos (Stripe)

### Reglas duras (no negociables)

- **Toda llamada Stripe pasa `idempotencyKey`.** Sin esto un retry de red duplica cargos, captures o transferencias. Patrones estables: `pi:<txId>`, `pi-partner:<campaignId>`, `capture:<piId>`, `cancel:<piId>`, `refund:<piId>`, `transfer:<campaignId>`, `connect-account:<userId>`. Para checkout sessions usamos `recharge:<userId>:<UUID>` (cada click = sesion nueva, retries dentro del mismo click coalescen).
- **Todo webhook verifica firma con raw body.** `stripe.webhooks.constructEvent(req.body, sig, secret)` montado con `express.raw({ type: 'application/json' })`. Si `STRIPE_WEBHOOK_SECRET` no esta configurado, la ruta devuelve 503 (no fallback a JSON parse).
- **Comision desde `config/commissions.js`** — nunca hardcodear porcentajes. La env var `PLATFORM_COMMISSION_RATE` no se lee, dejarla en `.env` confunde.

### Webhooks

| Endpoint | Quien lo llama | Eventos |
|----------|----------------|---------|
| `POST /api/partners/webhooks/stripe` | Stripe (Partner API flow) | `payment_intent.amount_capturable_updated`, `payment_intent.canceled`, `payment_intent.payment_failed` |
| `POST /api/transacciones/webhook` | Stripe (recargas + escrow propio) | `payment_intent.succeeded`, `checkout.session.completed` |
| `GET /api/webhooks/whatsapp` | Meta (verify subscribe) | challenge handshake con `WHATSAPP_VERIFY_TOKEN` |
| `POST /api/webhooks/whatsapp` | Meta (mensajes entrantes) | HMAC-SHA256 con `META_APP_SECRET` sobre raw Buffer (no JSON.stringify, ver AUDIT.md C-2) |
| `POST /api/webhooks/telegram` | Telegram Bot API | parse de updates para metricas |

### Checkout (recarga de saldo)
- `POST /api/transacciones/create-checkout-session` → redirect a Stripe Checkout, `idempotencyKey: recharge:<userId>:<UUID>`.
- Webhook `checkout.session.completed` → crea Transaccion tipo `recarga`.

### PaymentIntent (pago de campana)
- `POST /api/transacciones/create-payment-intent` → devuelve clientSecret + paymentIntentId, `idempotencyKey: pi:<txId>`.
- Webhook `payment_intent.amount_capturable_updated` → Campaign `PAID`, Transaccion `escrow`.

### Stripe Connect (payouts a creators)
- `POST /api/payouts/onboard` → crea Express account (`idempotencyKey: connect-account:<userId>`) + onboarding URL.
- Creator completa KYC en Stripe.
- Al completar campana → ver Seccion 5 (PayoutAttempt + transfer + retry).
- `POST /api/payouts/withdraw` → retiro manual.
- `GET /api/payouts/status` → estado de la cuenta Connect.

### Admin payouts queue
- `GET /api/admin/payouts` (default: pending + processing + failed; `?status=` para filtrar).
- `GET /api/admin/payouts/:id` (con campaign + creator populados).
- `POST /api/admin/payouts/:id/retry` (sincrono, reusa idempotency key).

---

## 8. Sistema de disputas

### Flujo
1. `POST /api/disputes` → crea disputa, campaign status → `DISPUTED`
2. `POST /api/disputes/:id/message` → mensajes entre partes
3. `POST /api/disputes/:id/escalate` → status `under_review`
4. `POST /api/disputes/:id/resolve` (admin) → 4 opciones de resolucion

### Opciones de resolucion
| Tipo | Accion |
|------|--------|
| `favor_advertiser` | Reembolso total + campaign CANCELLED |
| `favor_creator` | Escrow liberado + campaign COMPLETED |
| `partial` | Reembolso parcial (% configurable) |
| `closed_no_action` | Sin accion |

### Timeline
Cada disputa tiene un array `timeline[]` con eventos tipados: `opened`, `message`, `escalated`, `admin_note`, `resolved`.

---

## 9. Sistema de referidos

### Modelo
- `referralCode` auto-generado al crear usuario
- `referredBy` → ObjectId del referrer
- `referralCreditsBalance` / `referralCashBalance` → saldos
- Tiers: `normal` (0%), `power` (50% conversion), `partner` (100% conversion)

### Flujo
1. Referrer comparte `channelad.io/auth/register?ref=CODE`
2. Nuevo usuario se registra → `POST /api/referrals/apply` vincula referencia
3. Email al referrer: "Nuevo referido registrado"
4. Cuando referido completa campana pagada → 5% credito al referrer
5. Email al referrer: "Has ganado creditos"
6. `POST /api/referrals/convert` → convierte creditos a cash (segun tier)

---

## 10. Frontend

### Routing (AppRoutes.jsx)
- **Publico:** Landing, Marketplace, Auth, Legal pages
- **Advertiser** (`/advertiser/*`): Overview, Explore, AutoBuy, Campaigns, Ads, Finances, Referrals, Settings
- **Creator** (`/creator/*`): Overview, Channels, RegisterChannel, Requests, Earnings, Referrals, Settings

### Feature gating (lanzamiento)
- `FullAccessOnly` component gate → muestra `ComingSoon.jsx` para features no disponibles
- Features abiertas: Overview, Channels, Referrals, Settings, Notifications
- Features bloqueadas: Marketplace, Campaigns, Finances, AutoBuy, Ads, Disputes, Earnings, Requests
- `FULL_ACCESS_EMAILS` en env var controla quien tiene acceso completo

### Auth flow frontend
- `AuthContext.jsx` → maneja token, refreshToken, user state, auto-verify
- `api.js._tryRefreshToken()` → auto-refresh transparente en 401
- Login con 2FA → pantalla de codigo de 6 digitos si `requires2FA: true`

### Componentes clave
- `TwoFactorCard` → setup/verify/disable 2FA con QR
- `StripeConnectCard` → onboarding Stripe Connect
- `DeliveryBadge` → estado de entrega en campanas
- `EmailVerificationBanner` → banner persistente si email no verificado
- `ComingSoon` → pantalla de feature no disponible con CTA a referidos

---

## 11. Variables de entorno (produccion)

> Lista completa con valores de ejemplo en [.env.example](../.env.example). El validador `config/validateEnv.js` aborta el proceso en produccion si falta cualquier `[required-prod]`.

### Criticas (sin estas no arranca en produccion)
```
MONGODB_URI          # MongoDB Atlas connection string
JWT_SECRET           # Access token signing key (>= 48 bytes random)
JWT_REFRESH_SECRET   # Refresh token signing key
FRONTEND_URL         # https://channelad.io (CORS allowlist + email links)
BACKEND_URL          # https://channelad.io (mismo dominio, Vercel rewrites)
```

### Stripe (sin esto los pagos quedan en modo simulado)
```
STRIPE_SECRET_KEY     # sk_live_...
STRIPE_WEBHOOK_SECRET # whsec_... — sin esto el webhook devuelve 503
STRIPE_CURRENCY       # eur (default; nunca usd salvo cambio explicito)
```

### Email
```
EMAIL_PROVIDER       # smtp | gmail | sendgrid | mailgun
EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE
EMAIL_USER           # SMTP username / sender email
EMAIL_PASS           # SMTP password
EMAIL_FROM_NAME      # Channelad
EMAIL_FROM_ADDRESS   # noreply@channelad.io
```

### OAuth + plataformas
```
META_APP_ID, META_APP_SECRET     # Facebook Login + WhatsApp signing
INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET
LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET
GOOGLE_CLIENT_ID                  # Sign in with Google
TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME
TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_SESSION  # MTProto intel scraping
DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET
WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN
WHATSAPP_SESSION_PATH             # opcional, activa el worker whatsapp-web.js (VPS only)
```

### Seguridad y operacion
```
ENCRYPTION_KEY        # AES-256 (exactamente 32 caracteres)
SESSION_SECRET
CRON_SECRET           # bearer token que validan los 6 vercel cron jobs
CORS_ORIGIN           # comma-separated allowlist adicional (FRONTEND_URL ya esta)
BCRYPT_ROUNDS         # default 10, recomendado 12+
MAX_REQUEST_SIZE      # default 10mb (express.json + urlencoded)
REDIS_URL             # opcional, mejora rate-limit y OTP TTL
```

### Internas
```
BOT_API_KEY           # Auth del bot Telegram para POST /api/auth/bot-token (CRITICO)
FULL_ACCESS_EMAILS    # comma-separated emails con beta access automatico (vacio en prod)
DEMO_MODE, DEMO_PASSWORD
```

> La env `PLATFORM_COMMISSION_RATE` que aparece en .env.example legacy es ignorada — la tasa real vive en `config/commissions.js`.

---

## 12. Deploy y operaciones

### Vercel
- Auto-deploy desde `main` branch.
- `vercel.json`: una unica funcion `api/index.js` con `maxDuration: 60`.
- Output directory: `dist/` (vite build con `root: 'client'`, `outDir: '../dist'`).
- Cron jobs (todos validados con `CRON_SECRET`):

| Schedule (UTC)  | Endpoint                           | Que hace |
|-----------------|------------------------------------|----------|
| `0 3 * * *`     | `/api/oauth/meta/cron-refresh`     | Refresca tokens Meta que expiran en <7d |
| `0 3 * * *`     | `/api/admin/scoring/run`           | Recalcula CAS de todos los canales |
| `30 3 * * *`    | `/api/admin/metrics/capture`       | Snapshot diario de metricas de campana |
| `30 2 * * *`    | `/api/jobs/telegram-intel`         | Scraping diario de Telegram |
| `0 4 * * *`     | `/api/jobs/multiplatform-intel`    | Scraping diario multiplataforma |
| `0 5 * * 1`     | `/api/jobs/tgstat-discover`        | Discovery semanal via tgstat |

### Health check
- `GET /health` o `GET /api/health`
- Devuelve: `{ status, db, uptime, memoryMB }`
- 503 si MongoDB desconectado

### Error logging
- `services/errorLogger.js` persiste errores en MongoDB (collection `errorlogs`, TTL 30 dias)
- Express middleware: ultimo en la cadena, antes del error handler

### Graceful shutdown
- `server.js` maneja SIGTERM/SIGINT
- Cierra HTTP server → desconecta MongoDB → exit
- Timeout de 10s forzado

### Monitoring recomendado
- Vercel Analytics (built-in)
- MongoDB Atlas monitoring (built-in)
- `/api/health` para uptime checks (UptimeRobot, Better Uptime)
- Collection `errorlogs` en MongoDB para debugging

---

## 13. Comandos de desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo (backend + frontend)
npm run dev:full

# Solo backend
npm run dev

# Solo frontend
npm run frontend:dev

# Build produccion
npm run build

# Tests
npm test
npm run test:watch

# Lint
npm run lint
npm run lint:fix
```

---

## 14. Modelos de datos (resumen)

### Usuario
```
email, password (bcrypt), nombre, apellido, rol (creator|advertiser|admin)
emailVerificado, emailVerificationToken/Expires
passwordResetToken/Expires
failedLoginAttempts, lockedUntil
twoFactorEnabled, twoFactorSecret (encrypted), twoFactorBackupCodes (hashed)
stripeConnectAccountId
referralCode, referredBy, referralCreditsBalance, referralCashBalance
referralTier (normal|power|partner), referralGMVGenerated, referralCount
sesiones: [{ tokenHash, fechaCreacion, fechaExpiracion }]
```

### Canal
```
propietario (ref Usuario), plataforma, identificadorCanal, nombreCanal
estado (pendiente_verificacion|activo), verificado
credenciales: { botToken, accessToken, refreshToken, phoneNumberId, tokenType, tokenExpiresAt } (encrypted)
metaOAuth: { metaUserId, connectedPages[], scopes, oauthConnectedAt }
linkedinOAuth: { linkedinUserId, organizationId, scopes, oauthConnectedAt }
identificadores: { chatId, serverId, phoneNumber, provider, linkedinUrn }
estadisticas: { seguidores, ultimaActualizacion }
precio, disponibilidad: { maxPublicacionesMes, diasSemana, preciosPorDia, horarioPreferido }
```

### Campaign
```
advertiser, channel, content, targetUrl, price, netAmount, commissionRate
status: DRAFT|PAID|PUBLISHED|COMPLETED|CANCELLED|EXPIRED|DISPUTED
stripePaymentIntentId, deadline
delivery: { status (pending|sent|failed|skipped), attempts, error, platformMessageId, deliveredAt }
publishedAt, completedAt, cancelledAt, expiredAt
```

### Transaccion
```
campaign, advertiser, creator, amount
tipo: pago|recarga|reembolso|comision|retiro|referral
status: pending|escrow|paid|refunded|failed
stripePaymentIntentId, stripeClientSecret
referralCreditGenerated, referralUserId
```

### PayoutAttempt (nuevo, AUDIT.md A-9)
```
campaign (unique), creator, stripeAccountId, amount, currency
status: pending|processing|succeeded|failed
attempts, lastError, lastAttemptedAt, succeededAt
stripeTransferId, stripeIdempotencyKey
```

### TrackingLink
```
code (unique), targetUrl, createdBy, type (campaign|verification|custom)
campaign, channel
stats: { totalClicks, uniqueClicks, lastClickAt, devices, countries, referers }
clicks: [{ ip, userAgent, referer, country, device, os, browser, language, utm*, timestamp }]  # last 500
verification: { status, minClicks, expiresAt, verifiedAt, postScreenshot }
active
```

### TrackingFingerprint (nuevo, AUDIT.md A-10)
```
trackingLinkId, fingerprint  # unique compound index, race-safe upsert
firstSeenAt                  # TTL: 90 dias
```

Reemplaza `TrackingLink._seenIps` (array capped a 10000 que se acercaba a 16MB BSON limit). El array sigue presente como fallback durante la migracion.

### Dispute
```
campaign, openedBy, againstUser
reason: not_published|wrong_content|late_delivery|fraud|other
status: open|under_review|resolved_advertiser|resolved_creator|closed
resolutionType: favor_advertiser|favor_creator|partial|closed_no_action
refundAmount, resolution, resolvedBy, resolvedAt, escalatedAt, adminNotes
timeline: [{ type, by, text, at }]
messages: [{ sender, text, createdAt }]
```

---

## 15. API Reference (endpoints principales)

### Auth (`/api/auth`)
| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| POST | /registro | No | Registro |
| POST | /login | No | Login (devuelve requires2FA si activo) |
| POST | /refresh-token | No | Rotar tokens |
| POST | /forgot-password | No | Solicitar reset |
| POST | /restablecer-password/:token | No | Reset con token |
| GET | /verificar-email/:token | No | Verificar email |
| POST | /2fa/setup | Si | Generar QR + secret |
| POST | /2fa/verify | Si | Activar 2FA |
| POST | /2fa/validate | No | Validar codigo en login |
| POST | /2fa/disable | Si | Desactivar (requiere password) |

### Campaigns (`/api/campaigns`)
| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| GET | / | Si | Listar mis campanas |
| POST | / | Si | Crear campana (DRAFT) |
| POST | /:id/pay | Si | Pagar (DRAFT→PAID, escrow) |
| POST | /:id/confirm | Si | Confirmar (PAID→PUBLISHED, delivery) |
| POST | /:id/complete | Si | Completar (release escrow, transfer) |
| POST | /:id/cancel | Si | Cancelar |

### Channels (`/api/canales` + `/api/channels`)
| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| GET | /api/canales | Si | Mis canales |
| POST | /api/canales | Si | Crear canal |
| PUT | /api/canales/:id | Si | Actualizar |
| GET | /api/channels | No | Marketplace publico |

### Platform Connect (`/api/oauth`)
| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| POST | /telegram/connect | Si | Connect bot token + chatId |
| POST | /discord/connect | Si | Connect bot token + serverId |
| POST | /whatsapp/connect-manual | Si | Connect access token + phoneNumberId |
| POST | /newsletter/connect | Si | Connect API key + provider |
| GET | /meta/authorize | Si | Iniciar Meta OAuth |
| GET | /linkedin/authorize | Si | Iniciar LinkedIn OAuth |

### Payouts (`/api/payouts`)
| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| POST | /onboard | Si | Crear cuenta Stripe Connect |
| GET | /status | Si | Estado de cuenta Connect |
| GET | /dashboard-link | Si | Link al dashboard Stripe |
| POST | /withdraw | Si | Solicitar retiro |
| GET | /history | Si | Historial de retiros |

### Disputes (`/api/disputes`)
| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| POST | / | Si | Crear disputa |
| GET | / | Si | Listar disputas |
| POST | /:id/message | Si | Enviar mensaje |
| POST | /:id/escalate | Si | Escalar a admin |
| POST | /:id/resolve | Admin | Resolver (4 opciones) |

### Invoices (`/api/invoices`)
| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| GET | /:transactionId | Si | Descargar factura HTML |

### Onboarding (`/api/onboarding`) — wizard creators
| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| POST | /telegram/instrucciones | Si | Texto + chatId para verificar |
| POST | /telegram/verificar | Si + email verified | Confirma admin status del bot |
| POST | /discord/instrucciones | Si | Pasos para invitar el bot |
| POST | /discord/verificar | Si + email verified | Confirma webhook configurado |
| GET | /instagram/auth-url | Si + email verified | Genera URL OAuth con `state.source` |
| GET | /instagram/callback | No | Routing por `state.source` (wizard vs dashboard) |
| POST | /whatsapp/instrucciones | Si + email verified | Inicia OTP flow |
| POST | /whatsapp/verificar-otp | Si + email verified | Valida OTP recibido por WhatsApp |
| POST | /whatsapp/verificar | Si + email verified | Final del flow Cloud API |
| POST | /whatsapp/iniciar | Si + email verified | Init worker baileys (VPS only) |
| GET | /estado/:canalId | Si | Estado de integracion en tiempo real |

### Webhooks (`/api/webhooks`) — entrada de plataformas externas
| Metodo | Ruta | Verificacion |
|--------|------|--------------|
| GET | /whatsapp | `WHATSAPP_VERIFY_TOKEN` (Meta subscribe handshake) |
| POST | /whatsapp | HMAC-SHA256 con `META_APP_SECRET` sobre raw Buffer (AUDIT.md C-2) |
| POST | /telegram | Parse de updates de Bot API |

### Admin (`/api/admin/*`) — gated por `req.usuario.rol === 'admin'`
| Endpoint | Que hace |
|----------|----------|
| GET `/api/admin/dashboard/{overview,users,channels,campaigns,disputes,finances,scoring}` | KPIs y listados |
| PUT `/api/admin/dashboard/{users,campaigns,disputes}/:id` | Mutaciones admin |
| GET `/api/admin/payouts` | PayoutAttempt queue (default: pending+processing+failed) |
| POST `/api/admin/payouts/:id/retry` | Reintenta transfer Stripe (idempotency-key reusa) |
| POST `/api/admin/scoring/run` | Recalcula CAS (cron — header `Authorization: Bearer <CRON_SECRET>`) |
| POST `/api/admin/metrics/capture` | Snapshot diario (cron) |

### Cron jobs (`/api/jobs/*`) — tambien gated por `CRON_SECRET`
`telegram-intel`, `multiplatform-intel`, `tgstat-discover`, `massive-seed`.

### Otras rutas
- `/api/lists` (userLists) y `/api/lists/public` (lists publicas)
- `/api/autobuy` (reglas + trigger)
- `/api/tracking` (links + analytics)
- `/api/reviews` (5 stars + helpful + report)
- `/api/notifications` (CRUD + push subscription)
- `/api/files` (upload via multer + sharp)
- `/api/anuncios` (CRUD anuncios + aprobacion)
- `/api/transacciones` (historial + estadisticas + retiros + webhook stripe)
- `/api/estadisticas` (dashboards creator/advertiser/channel/campaign)
- `/api/baileys` (WhatsApp link + sessions, VPS only)

---

*Para preguntas: rafa@channelad.io. Reportes de seguridad: ver [SECURITY.md](../SECURITY.md).*
