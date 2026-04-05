# Channelad — Guia Tecnica para Desarrolladores

> Documento preparado para el equipo de soporte tecnico. Ultima actualizacion: Abril 2026.

## 1. Vision general

**Channelad** (antes ADFLOW) es un marketplace B2B que conecta anunciantes con propietarios de canales en WhatsApp, Telegram, Discord, Instagram, Facebook, LinkedIn y Newsletter. Los anunciantes compran espacios publicitarios, los pagos se retienen en escrow, y los creators cobran cuando el anuncio se publica.

**URL produccion:** https://channelad.io
**Repositorio:** https://github.com/xipol1/ADFLOW
**Deploy:** Vercel (auto-deploy desde branch `main`)

---

## 2. Stack tecnologico

| Capa | Tecnologia | Version |
|------|-----------|---------|
| Runtime | Node.js | >= 16 |
| Backend | Express | 4.18 |
| Base de datos | MongoDB Atlas | Mongoose 7.5 |
| Auth | JWT (access 15m + refresh 7d) + bcryptjs | - |
| 2FA | TOTP via otpauth + qrcode | - |
| Pagos | Stripe (Checkout, PaymentIntents, Connect Express) | 13.5 |
| Tiempo real | Socket.io | 4.7 |
| Frontend | React 18 + React Router 6 + Vite 4 | - |
| Email | Nodemailer (Gmail, SMTP, Ethereal) | 6.9 |
| Seguridad | Helmet, CORS, HPP, xss-clean, express-mongo-sanitize, rate-limit-mongo | - |
| Deploy | Vercel Serverless | - |

---

## 3. Estructura del proyecto

```
ADFLOW/
├── api/index.js              # Entry point Vercel serverless
├── app.js                    # Express app (middleware, routes, error handling)
├── server.js                 # HTTP server + Socket.io + cron + graceful shutdown
├── config/
│   ├── config.js             # Todas las env vars centralizadas
│   ├── database.js           # MongoDB connection + reconnection
│   └── swagger.js            # API docs config
├── controllers/
│   ├── authController.js     # Login, registro, password reset, email verification
│   ├── twoFactorController.js # 2FA setup, verify, validate, disable
│   ├── campaignController.js # CRUD campanas + escrow + delivery trigger
│   ├── canalController.js    # CRUD canales del creator
│   ├── channelsController.js # Listado publico de canales (marketplace)
│   ├── oauthController.js    # Meta OAuth + LinkedIn OAuth
│   ├── platformConnectController.js # Telegram, Discord, WhatsApp, Newsletter connect
│   ├── payoutController.js   # Stripe Connect onboarding + withdrawals
│   ├── disputeController.js  # Disputas con timeline + resolucion + reembolso
│   ├── anuncioController.js  # Workflow de anuncios
│   ├── autoBuyController.js  # Campanas automaticas
│   └── trackingController.js # Tracking links + channel verification
├── models/
│   ├── Usuario.js            # Users (auth, referral, 2FA, Stripe Connect, lockout)
│   ├── Canal.js              # Channels (credentials encrypted, OAuth data, availability)
│   ├── Campaign.js           # Campaigns (status pipeline, delivery tracking, escrow)
│   ├── Transaccion.js        # Transactions (escrow, paid, refunded, referral)
│   ├── Dispute.js            # Disputes (timeline, resolution types, refund)
│   └── ... (20 models total)
├── services/
│   ├── authService.js        # JWT generation, refresh rotation, session management
│   ├── emailService.js       # Template rendering + transactional emails
│   ├── metaOAuthService.js   # Meta Graph API OAuth flow
│   ├── linkedinOAuthService.js # LinkedIn OAuth flow
│   ├── stripeConnectService.js # Stripe Express accounts + transfers
│   ├── adDeliveryService.js  # Publish ads to platforms with 3x retry
│   ├── invoiceService.js     # HTML invoice generation
│   ├── errorLogger.js        # Error persistence to MongoDB (30d TTL)
│   ├── notificationService.js # DB + Socket.io + email + push notifications
│   ├── SocialSyncService.js  # Sync metrics from all platforms
│   └── tokenRefreshService.js # Auto-refresh Meta + LinkedIn tokens
├── integraciones/
│   ├── telegram.js           # TelegramAPI class (bot API)
│   ├── discord.js            # DiscordAPI class (bot API)
│   ├── whatsapp.js           # WhatsAppAPI class (Business API)
│   ├── instagram.js          # InstagramAPI class (Graph API)
│   ├── facebook.js           # FacebookAPI class (Graph API)
│   ├── linkedin.js           # LinkedInAPI class (REST API)
│   └── newsletter.js         # NewsletterAPI (Mailchimp, Beehiiv, Substack)
├── lib/
│   ├── platformConnectors.js # Master dispatcher: fetch, verify, publish per platform
│   ├── encryption.js         # AES-256 encrypt/decrypt for credentials
│   ├── ensureDb.js           # MongoDB connection guard
│   └── campaignCron.js       # Periodic: expire, auto-complete, retry deliveries
├── middleware/
│   ├── auth.js               # JWT verify, role check, email verification gate
│   ├── rateLimiter.js        # MongoDB-backed distributed rate limiting
│   └── validarCampos.js      # express-validator error formatter
├── routes/                   # 20+ route files (see API Reference below)
├── templates/emails/         # HTML email templates with base layout
├── src/                      # Frontend React app
│   ├── auth/AuthContext.jsx   # Auth state, auto token refresh
│   ├── routes/AppRoutes.jsx   # All routes + FullAccessOnly gate + ComingSoon
│   └── ui/
│       ├── components/        # TwoFactorCard, DeliveryBadge, ComingSoon, etc.
│       ├── pages/auth/        # Login, Register, ForgotPassword, VerifyEmail
│       ├── pages/dashboard/   # Advertiser + Creator dashboards
│       └── theme/tokens.js    # Design system (colors, fonts, spacing)
└── public/
    ├── manifest.json          # PWA manifest
    └── sw.js                  # Service worker (cache, push, offline)
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
helmet → cors → compression → morgan → stripe webhook (raw body)
→ express.json → express.urlencoded → mongoSanitize → xss-clean → hpp
→ blocked paths filter → routes → error logger → error handler
```

### Rate limiting
- `rate-limit-mongo` con MongoDB store (distribuido para serverless)
- Login: 10 req/15min, Registro: 5 req/1h, API general: 300 req/15min
- Fallback a memoria si MongoDB no disponible

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
1. **Advertiser crea campana** → `POST /api/campaigns` → status DRAFT + Transaccion pending
2. **Pago** → `POST /api/campaigns/:id/pay` → Transaccion status `escrow`, Campaign status `PAID`
3. **Creator confirma** → `POST /api/campaigns/:id/confirm` → Campaign `PUBLISHED` + ad delivery trigger
4. **Ad delivery** → `adDeliveryService.deliverAd()` publica en la plataforma (Telegram, Discord, etc.) con 3 reintentos
5. **Completar** → `POST /api/campaigns/:id/complete` → release escrow (`paid`) + Stripe capture + auto-transfer a creator via Connect + referral credits (5%)

### Escrow
- `payCampaign` → transaction status = `escrow` (dinero retenido)
- `completeCampaign` → transaction status = `paid` (dinero liberado)
- Stripe PaymentIntent con `capture_method: manual` para hold real

### Ad Delivery
- Archivo: `services/adDeliveryService.js`
- Retry: 3 intentos con backoff exponencial (5s, 15s, 45s)
- Tracking: `Campaign.delivery` = `{ status, attempts, error, platformMessageId, deliveredAt }`
- Cron retry: `campaignCron.js` ejecuta `retryFailedDeliveries()` cada 10 min

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

### Checkout (recarga de saldo)
- `POST /api/transacciones/create-checkout-session` → redirect a Stripe Checkout
- Webhook `checkout.session.completed` → crea Transaccion tipo `recarga`

### PaymentIntent (pago de campana)
- `POST /api/transacciones/create-payment-intent` → devuelve clientSecret
- Webhook `payment_intent.succeeded` → actualiza Transaccion + Campaign

### Stripe Connect (payouts a creators)
- `POST /api/payouts/onboard` → crea Express account + onboarding URL
- Creator completa KYC en Stripe
- Al completar campana → `stripeConnect.transferToCreator(amount, accountId)`
- `POST /api/payouts/withdraw` → retiro manual
- `GET /api/payouts/status` → estado de la cuenta Connect

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

### Criticas (sin estas no arranca)
```
MONGODB_URI          # MongoDB Atlas connection string
JWT_SECRET           # Access token signing key
JWT_REFRESH_SECRET   # Refresh token signing key
ENCRYPTION_KEY       # AES-256 key (exactamente 32 caracteres)
FRONTEND_URL         # https://channelad.io
BACKEND_URL          # https://channelad.io (mismo dominio, Vercel rewrites)
```

### Stripe
```
STRIPE_SECRET_KEY    # sk_live_...
STRIPE_WEBHOOK_SECRET # whsec_...
```

### Email
```
EMAIL_PROVIDER       # gmail | smtp
EMAIL_USER           # sender email
EMAIL_PASS           # app password
EMAIL_FROM_NAME      # Channelad
EMAIL_FROM_ADDRESS   # noreply@channelad.io
```

### OAuth
```
META_APP_ID          # Facebook App ID
META_APP_SECRET      # Facebook App Secret
LINKEDIN_CLIENT_ID   # LinkedIn App ID
LINKEDIN_CLIENT_SECRET # LinkedIn App Secret
```

### Opcionales
```
CRON_SECRET          # Vercel cron authorization
FULL_ACCESS_EMAILS   # Comma-separated admin/beta tester emails
NODE_ENV             # production
```

---

## 12. Deploy y operaciones

### Vercel
- Auto-deploy desde `main` branch
- `vercel.json`: build command, rewrites, cron, function timeout (30s)
- Cron: `/api/oauth/meta/cron-refresh` diario a las 3:00 UTC

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

---

*Documento generado automaticamente. Para preguntas: soporte@channelad.io*
