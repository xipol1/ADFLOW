# ADFLOW

**Marketplace de publicidad en comunidades reales.**
Conecta anunciantes con creadores de canales en WhatsApp, Telegram, Discord, Instagram y mas.

> **Estado actual:** MVP funcional — backend operativo en produccion (Vercel), frontend React completo con dashboards para advertiser, creator y admin. Sistema de pagos Stripe, notificaciones en tiempo real (Socket.io), disputas, listas de favoritos, autobuy y **sistema de tracking avanzado con verificacion de canales** implementados.

---

## Tabla de contenidos

- [Stack tecnologico](#stack-tecnologico)
- [Arquitectura](#arquitectura)
- [Quick Start](#quick-start)
- [Scripts disponibles](#scripts-disponibles)
- [Variables de entorno](#variables-de-entorno)
- [API Reference](#api-reference)
- [Modelos de datos](#modelos-de-datos)
- [Frontend](#frontend)
- [Despliegue](#despliegue)
- [Estado del proyecto](#estado-del-proyecto)

---

## Stack tecnologico

| Capa | Tecnologia |
|------|-----------|
| **Runtime** | Node.js >= 16 |
| **Backend** | Express 4.18 |
| **Base de datos** | MongoDB (Mongoose 7.5) + JSON file store de respaldo |
| **Autenticacion** | JWT (access + refresh tokens) + bcryptjs |
| **Pagos** | Stripe 13.5 (checkout, escrow, PaymentIntents) |
| **Tiempo real** | Socket.io 4.7 (notificaciones push) |
| **Frontend** | React 18 + React Router 6 + Vite 4 |
| **Estilos** | TailwindCSS 3.3 + CSS custom properties |
| **Email** | Nodemailer 6.9 (Gmail, Outlook, SendGrid, Mailgun) |
| **Archivos** | Multer + Sharp (upload y optimizacion de imagenes) |
| **Seguridad** | Helmet, CORS, HPP, rate limiting, express-mongo-sanitize, xss-clean |
| **Logging** | Winston 3.10 + Morgan |
| **Testing** | Jest + Supertest |
| **Deploy** | Vercel (serverless) / Render (alternativo) |

---

## Arquitectura

```
ADFLOW/
├── api/                    # Entry point Vercel serverless
│   └── index.js            # Exporta app Express
├── app.js                  # Configuracion Express (middleware, rutas, static)
├── server.js               # HTTP server + Socket.io + cron jobs
├── config/
│   ├── config.js           # Configuracion centralizada
│   └── database.js         # Conexion MongoDB con retry
├── models/                 # 17 schemas Mongoose
├── controllers/            # 15 controladores de request/response
├── routes/                 # 16 archivos de rutas Express
├── middleware/             # Auth JWT, validacion, rate limiting, partner auth
├── services/               # 19 servicios de logica de negocio
├── lib/                    # Utilidades (scoring engine, cron, connectors)
├── src/                    # Frontend React
│   ├── App.jsx             # Root component
│   ├── auth/               # AuthContext (JWT state management)
│   ├── routes/             # AppRoutes.jsx (router principal)
│   └── ui/
│       ├── pages/          # 28 paginas (landing, auth, dashboards, registro de canal)
│       ├── layouts/        # AppLayout, DashboardLayout
│       ├── navigation/     # NavBar
│       └── routing/        # ProtectedRoute
├── styles/                 # globals.css
├── public/                 # Assets estaticos
├── uploads/                # Archivos subidos por usuarios
├── docs/                   # Documentacion tecnica
├── tests/                  # Tests Jest
└── scripts/                # Migraciones y utilidades
```

### Flujo de request (produccion Vercel)

```
Cliente → Vercel CDN → /api/*  → api/index.js (serverless function)
                     → /t/:code → api/index.js (tracking redirect)
                     → /r/:id  → api/index.js (campaign redirect)
                     → /*      → dist/index.html (SPA)
```

### Flujo de request (desarrollo local)

```
Frontend (Vite :3000) → Backend (Express :5000) → MongoDB Atlas
                                                → Socket.io (mismo puerto)
```

---

## Quick Start

### Prerequisitos

- Node.js >= 16 y npm >= 8
- MongoDB local o URI de MongoDB Atlas

### Instalacion

```bash
git clone <repo-url> && cd ADFLOW
npm install
cp .env.example .env
# Editar .env con tu MONGODB_URI y JWT_SECRET
```

### Desarrollo

```bash
# Backend + Frontend en paralelo
npm run dev:full

# Solo backend (puerto 5000)
npm run dev

# Solo frontend (puerto 3000)
npm run frontend:dev
```

### Build de produccion

```bash
npm run build        # Compila React → dist/
npm start            # Arranca server.js en produccion
```

### Usuarios de prueba

| Rol | Email | Password |
|-----|-------|----------|
| Creator | creator@adflow.com | Creator2026x |
| Advertiser | advertiser@adflow.com | Advert2026x |

---

## Scripts disponibles

| Script | Descripcion |
|--------|-------------|
| `npm start` | Produccion: `node server.js` |
| `npm run dev` | Desarrollo: `nodemon server.js` |
| `npm run frontend:dev` | Vite dev server (HMR) |
| `npm run dev:full` | Backend + frontend en paralelo |
| `npm run build` | Build frontend (Vite → dist/) |
| `npm test` | Tests con Jest |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | ESLint auto-fix |
| `npm run migrate:roles` | Migracion de roles en DB |

---

## Variables de entorno

Copiar `.env.example` a `.env`. Variables minimas para desarrollo:

```env
# Base de datos
MONGODB_URI=mongodb://localhost:27017/adflow

# Autenticacion
JWT_SECRET=tu_secreto_seguro_min_32_chars
JWT_REFRESH_SECRET=tu_refresh_secreto
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Servidor
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Pagos (opcional para desarrollo)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Comision plataforma
PLATFORM_COMMISSION_RATE=0.10
```

Para la lista completa de variables (APIs externas, email, rate limiting, archivos), ver [`.env.example`](.env.example).

---

## API Reference

Base URL: `/api`

### Autenticacion

| Metodo | Ruta | Descripcion | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/registro` | Registro con rol (creator/advertiser) | No |
| POST | `/api/auth/login` | Login, devuelve access + refresh token | No |
| POST | `/api/auth/refresh-token` | Renueva access token | No |
| GET | `/api/auth/perfil` | Perfil del usuario actual | Si |
| POST | `/api/auth/cambiar-password` | Cambiar contrasena | Si |
| GET | `/api/auth/verificar-email/:token` | Verificar email | No |

### Canales

| Metodo | Ruta | Descripcion | Auth |
|--------|------|-------------|------|
| GET | `/api/channels` | Listar canales (paginado, filtros) | No |
| GET | `/api/channels/:id` | Detalle de canal | No |
| POST | `/api/canales` | Crear canal | Si (creator) |
| PUT | `/api/canales/:id` | Actualizar canal | Si (owner) |
| DELETE | `/api/canales/:id` | Eliminar canal | Si (owner) |

### Campanas

| Metodo | Ruta | Descripcion | Auth |
|--------|------|-------------|------|
| GET | `/api/campaigns` | Mis campanas | Si |
| POST | `/api/campaigns` | Crear campana (DRAFT) | Si (advertiser) |
| PUT | `/api/campaigns/:id/confirm` | Confirmar pago (DRAFT → PAID) | Si |
| PUT | `/api/campaigns/:id/publish` | Publicar (PAID → PUBLISHED) | Si (creator) |
| PUT | `/api/campaigns/:id/complete` | Completar (PUBLISHED → COMPLETED) | Si |
| PUT | `/api/campaigns/:id/cancel` | Cancelar campana | Si |

**Ciclo de vida de una campana:**

```
DRAFT → PAID → PUBLISHED → COMPLETED
  │       │                    │
  │       └─→ EXPIRED         │
  └─→ CANCELLED               └─→ DISPUTED
```

### Disputas

| Metodo | Ruta | Descripcion | Auth |
|--------|------|-------------|------|
| GET | `/api/disputes` | Mis disputas | Si |
| GET | `/api/disputes/:id` | Detalle disputa | Si |
| POST | `/api/disputes` | Abrir disputa | Si |
| POST | `/api/disputes/:id/message` | Enviar mensaje | Si |
| PUT | `/api/disputes/:id/resolve` | Resolver disputa | Si (admin) |

### Listas de favoritos

| Metodo | Ruta | Descripcion | Auth |
|--------|------|-------------|------|
| GET | `/api/lists` | Mis listas | Si |
| POST | `/api/lists` | Crear lista | Si |
| POST | `/api/lists/:id/add-channel` | Anadir canal a lista | Si |
| DELETE | `/api/lists/:id/remove-channel/:channelId` | Quitar canal | Si |
| DELETE | `/api/lists/:id` | Eliminar lista | Si |

### AutoBuy (compra automatizada)

| Metodo | Ruta | Descripcion | Auth |
|--------|------|-------------|------|
| GET | `/api/autobuy` | Mis reglas | Si |
| POST | `/api/autobuy` | Crear regla | Si |
| PUT | `/api/autobuy/:id` | Actualizar regla | Si |
| DELETE | `/api/autobuy/:id` | Eliminar regla | Si |
| POST | `/api/autobuy/:id/trigger` | Ejecutar regla (crea campanas) | Si |

### Tracking y verificacion

| Metodo | Ruta | Descripcion | Auth |
|--------|------|-------------|------|
| POST | `/api/tracking/links` | Crear link trackeable | Si |
| GET | `/api/tracking/links` | Mis links (filtros: type, campaignId, channelId) | Si |
| GET | `/api/tracking/links/:id/analytics` | Analytics detallados de un link | Si |
| POST | `/api/tracking/verify-link` | Crear link de verificacion para canal | Si (creator) |
| GET | `/api/tracking/verify-status/:channelId` | Estado de verificacion en tiempo real | Si |
| POST | `/api/tracking/convert` | Convertir URL de anunciante en link trackeable | Si |
| GET | `/t/:code` | Redirect inteligente con tracking completo | No |
| GET | `/r/:campaignId` | Redirect de campana con tracking basico | No |

**Datos capturados por click:**
- IP, User-Agent, Referer, idioma del navegador
- Dispositivo (desktop/mobile/tablet), Sistema operativo, Navegador
- Pais (via headers Cloudflare/Vercel)
- Parametros UTM (utm_source, utm_medium, utm_campaign)

### Otros endpoints

| Grupo | Base | Descripcion |
|-------|------|-------------|
| Transacciones | `/api/transacciones` | Historial de pagos, reembolsos, comisiones |
| Estadisticas | `/api/estadisticas` | Dashboard stats, metricas generales |
| Notificaciones | `/api/notifications` | CRUD notificaciones, marcar leidas |
| Archivos | `/api/files` | Upload/download de archivos |
| Partner API | `/api/partners` | Integraciones de terceros |
| Anuncios | `/api/anuncios` | Gestion de anuncios |
| Health | `/health`, `/api/health` | Health checks |

### Autenticacion de requests

Todas las rutas protegidas requieren header:

```
Authorization: Bearer <jwt_token>
```

Formato de respuesta estandar:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operacion exitosa"
}
```

---

## Modelos de datos

### Principales

| Modelo | Descripcion | Campos clave |
|--------|-------------|-------------|
| **Usuario** | Usuarios de la plataforma | email, password, rol (creator/advertiser/admin), emailVerificado |
| **Canal** | Canales de creadores | nombreCanal, plataforma, categoria, precioBase, propietario, score |
| **Campaign** | Campanas publicitarias | advertiser, channel, content, targetUrl, price, status, deadline |
| **Transaccion** | Movimientos financieros | campaign, advertiser, creator, amount, tipo, status |
| **Dispute** | Sistema de disputas | campaign, openedBy, againstUser, reason, status, messages[] |

### Automatizacion

| Modelo | Descripcion |
|--------|-------------|
| **AutoBuyRule** | Reglas de compra automatica (budgets, filtros, canales target) |
| **UserList** | Listas personalizadas de canales (favoritos) |

### Tracking y analytics

| Modelo | Descripcion |
|--------|-------------|
| **TrackingLink** | Links cortos trackeables con analytics completos (clicks, dispositivos, paises, UTMs) |
| **Tracking** | Clicks basicos por campana (IP dedup 1h) — modelo legacy |

### Soporte

| Modelo | Descripcion |
|--------|-------------|
| **Notificacion** | Notificaciones in-app y push |
| **Retiro** | Solicitudes de retiro de creadores |
| **Archivo** | Metadata de archivos subidos |
| **ChannelMetrics** | Metricas de rendimiento de canales |
| **Anuncio** | Detalle de anuncios |
| **Partner** | Integraciones externas |
| **Estadistica** | Agregaciones de estadisticas |

### Comisiones y pagos

- Comision plataforma: **10%** (configurable via `PLATFORM_COMMISSION_RATE`)
- Calculo automatico: `netAmount = price * (1 - commissionRate)`
- Escrow via Stripe PaymentIntents: captura diferida al completar campana
- Cron cada 10 min: expira campanas pasadas de deadline, auto-completa +7 dias, libera escrow

---

## Frontend

### Estructura de paginas

**Publicas:**
- `/` — Landing page con hero, categorias, canales destacados
- `/marketplace` — Explorar canales con filtros y busqueda
- `/auth/login` — Inicio de sesion
- `/auth/register` — Registro con seleccion de rol
- `/verificar-email/:token` — Verificacion de email

**Dashboard Advertiser** (`/advertiser/*`):
- Overview — KPIs, campanas activas, graficos de gasto
- Explore — Buscar y filtrar canales del marketplace
- AutoBuy — Crear y gestionar reglas de compra automatica
- Ads — Gestionar campanas (crear, confirmar, cancelar)
- Finances — Historial de transacciones, wallet
- Disputes — Ver y gestionar disputas
- Settings — Configuracion de cuenta

**Dashboard Creator** (`/creator/*`):
- Overview — KPIs, ganancias, campanas recibidas
- Channels — Gestionar canales propios
- **Register Channel** (`/creator/channels/new`) — Flujo de registro en 5 pasos:
  1. Seleccion de plataforma (Telegram, WhatsApp, Discord, Instagram, Newsletter, Facebook)
  2. Conexion API (credenciales especificas por plataforma)
  3. Informacion del canal (nombre, categoria, descripcion, precio)
  4. Post de prueba — Verificacion con link trackeable (minimo 3 clicks unicos en 48h)
  5. Confirmacion de exito
- Requests — Campanas pendientes de publicar
- Earnings — Historial de ganancias y retiros
- Disputes — Ver y gestionar disputas
- Settings — Configuracion de cuenta

### Contextos React

- **AuthContext** — Estado de autenticacion, login/logout, token management
- **NotificationsProvider** — Notificaciones en tiempo real via Socket.io + API backend

### Navegacion

```
/ (AppLayout + NavBar)
├── /                      → LandingPage
├── /marketplace           → MarketplacePage
├── /auth/login            → LoginPage
├── /auth/register         → RegisterPage
├── /dashboard             → Redirect segun rol
├── /advertiser/*          → AdvertiserLayout + subrutas
└── /creator/*             → CreatorLayout + subrutas
```

---

## Despliegue

### Vercel (produccion)

La app esta desplegada en Vercel como proyecto `adflow-unified`.

**URL de produccion:** `https://adflow-unified.vercel.app`

**Configuracion (`vercel.json`):**
- Frontend: SPA servida desde `dist/` (build de Vite)
- Backend: serverless function en `api/index.js` que exporta la app Express
- Rewrites: `/api/*`, `/t/:code`, `/r/:id` → serverless function, todo lo demas → `index.html`
- Max duration por request: 30s
- Archivos incluidos en el bundle: routes, controllers, models, middleware, lib, services, config

**Desplegar:**
```bash
# Via Vercel CLI
vercel

# O push a main (auto-deploy)
git push origin main
```

### Render (alternativo)

Configurado en `render.yaml`:
- Web service Node.js
- Build: `npm install`
- Start: `npm start`
- Puerto: 10000

### Variables de entorno en produccion

Configurar en el dashboard de Vercel/Render:
- `MONGODB_URI` — Connection string de MongoDB Atlas
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — Secretos de tokens
- `STRIPE_SECRET_KEY` — Clave secreta de Stripe
- `FRONTEND_URL` — URL del frontend para CORS
- `NODE_ENV=production`

---

## Estado del proyecto

### Sprint 1-2: Infraestructura + Marketplace core ✅

- [x] **Backend REST API** — 17 archivos de rutas, 16 controladores
- [x] **Autenticacion** — JWT access/refresh tokens, verificacion email
- [x] **Base de datos** — 18 modelos Mongoose, lazy connection serverless
- [x] **Sistema de pagos** — Stripe checkout, escrow con captura diferida
- [x] **Ciclo de campana completo** — DRAFT → PAID → PUBLISHED → COMPLETED
- [x] **Dashboard Advertiser** — 7 paginas con KPIs reales
- [x] **Dashboard Creator** — 7 paginas con ganancias y gestion
- [x] **Marketplace publico** — Busqueda, filtros, paginacion
- [x] **Scoring engine** — 5 factores, pricing dinamico por CPM

### Sprint 3: Automatizacion + Engagement ✅

- [x] **Disputas** — Crear, mensajes, resolucion admin
- [x] **Listas de favoritos** — CRUD listas personalizadas
- [x] **AutoBuy** — Reglas de compra automatica
- [x] **Notificaciones** — DB + Socket.io + email + push
- [x] **Campaign cron** — Auto-expiracion, auto-complete, escrow release
- [x] **Partner API** — Auth, CRUD, webhooks, Stripe escrow

### Sprint 4: Tracking + Verificacion ✅

- [x] **Tracking avanzado** — Links cortos `/t/:code` con analytics completos
- [x] **Verificacion por test post** — Min 3 clicks unicos, auto-verificacion
- [x] **Registro de canal** — 5 pasos: plataforma → API → info → verificacion → exito
- [x] **Conversion URLs** — Links de anunciantes → links trackeables
- [x] **Analytics por click** — Dispositivo, OS, navegador, pais, UTMs

### Sprint 5: Features avanzados ✅

- [x] **Reviews y ratings** — 5 categorias, respuestas, moderacion, agregados
- [x] **Analytics avanzados** — Time-series, comparativas, export CSV
- [x] **14 templates email** — HTML profesional con diseno ADFLOW
- [x] **Swagger/OpenAPI** — 48 endpoints documentados en /api/docs/
- [x] **PWA** — Manifest, service worker, push notifications
- [x] **118+ tests** — 8 suites de integracion + smoke tests
- [x] **Integraciones** — Telegram, Discord, WhatsApp, Instagram, Facebook, Newsletter

### Sprint 6: Produccion real (PENDIENTE)

- [ ] Configurar servicios externos (Stripe live, SMTP, VAPID keys, platform tokens)
- [ ] Vercel Cron Functions para campaign automation
- [ ] Cloud storage para uploads (Vercel Blob / S3)
- [ ] Reemplazar Socket.io por solucion serverless-compatible
- [ ] Panel admin completo (moderacion, metricas plataforma)
- [ ] Onboarding guiado, graficos con Chart.js/Recharts
- [ ] Encriptar credenciales en DB, 2FA, GDPR compliance

### Sprint 7: Escalamiento (FUTURO)

- [ ] Code-splitting, Redis cache, CDN
- [ ] Campanas programadas, A/B testing, bulk campaigns
- [ ] Expansion: Twitter/X, TikTok, YouTube, LinkedIn
- [ ] Planes de suscripcion, programa de referidos

Para el plan detallado con sub-items, ver [`docs/plan-fases.md`](docs/plan-fases.md).
Para el estado tecnico detallado, ver [`docs/estado-real.md`](docs/estado-real.md).

---

## Seguridad

### Autenticacion y autorizacion

- **JWT** con access token (15 min) + refresh token (7 dias)
- Claims del token: `id`, `email`, `rol`, `emailVerificado`
- Validacion de issuer/audience en verificacion
- Algoritmo HS256

### Middleware de proteccion

| Middleware | Funcion |
|-----------|---------|
| `autenticar` | Verifica JWT en header `Authorization: Bearer <token>` |
| `autorizarRoles('creator', 'admin')` | Restringe acceso por rol |
| `requiereEmailVerificado` | Bloquea usuarios sin email verificado |
| `validarCampos` | Ejecuta validaciones de express-validator |
| `rateLimiter` | Limita requests por IP (global, auth, upload) |

### Proteccion de requests

- **Helmet** — Security headers (CSP, HSTS, X-Frame-Options, etc.)
- **CORS** — Solo origenes autorizados en produccion (dominio Vercel + FRONTEND_URL)
- **HPP** — Previene HTTP Parameter Pollution
- **express-mongo-sanitize** — Previene inyeccion NoSQL
- **xss-clean** — Sanitiza inputs contra XSS
- **Rate limiting** — Configurable por ventana (global: 1000/15min, auth: 50/15min, upload: 10/15min)

### Contrasenas

- Minimo 8 caracteres, requiere mayuscula + minuscula + digito
- Hash con bcrypt (10 rounds por defecto)
- Comparacion en tiempo constante

---

## Scoring Engine

Algoritmo de 5 factores para valorar y rankear canales del marketplace.

```
channel_score = Attention(25%) + Intent(15%) + Trust(20%) + Performance(25%) + Liquidity(15%)
```

| Factor | Peso | Que mide |
|--------|------|----------|
| **Attention** | 25% | Seguidores + engagement rate |
| **Intent** | 15% | Intencion comercial segun categoria (40-100) |
| **Trust** | 20% | Verificacion + antiguedad del canal |
| **Performance** | 25% | CTR + conversiones historicas |
| **Liquidity** | 15% | Disponibilidad + frecuencia de publicacion |

### CPM base por plataforma

| Plataforma | CPM (EUR/1000 views) | Precio minimo |
|-----------|---------------------|--------------|
| Newsletter | 20 | 80 |
| Instagram | 15 | 80 |
| WhatsApp | 12 | 60 |
| Facebook | 10 | 40 |
| Telegram | 8 | 50 |
| Blog | 6 | 30 |
| Discord | 5 | 30 |

### Intent por categoria

```
finanzas/ecommerce/negocios: 90  |  crypto/investing: 95
marketing/tecnologia: 85         |  educacion: 80
fitness/salud: 75                |  noticias: 60
gaming: 55                       |  entretenimiento: 45
memes/humor: 40                  |  high_intent: 100
```

Formula de precio:

```
price = (attention * CPM / 1000) * (score / 50) * adjustments
```

---

## Sistema de Tracking

Sistema completo de tracking de links con analytics avanzados y verificacion de canales.

### Arquitectura

```
Creador/Anunciante → POST /api/tracking/links → TrackingLink (code, targetUrl, stats)
                                                      │
Usuario final ────→ GET /t/:code ─────────────────────┘
                        │
                        ├── Registra click (fire-and-forget)
                        │   ├── IP, User-Agent, Referer
                        │   ├── Dispositivo, OS, Navegador
                        │   ├── Pais (Cloudflare/Vercel headers)
                        │   ├── UTM params (source, medium, campaign)
                        │   └── Deduplicacion por IP (uniqueClicks)
                        │
                        └── 302 Redirect → targetUrl (con UTM passthrough)
```

### Verificacion de canales

Flujo de verificacion por test post:

```
1. Creator registra canal en /creator/channels/new
2. Step 4: Se genera un TrackingLink tipo "verification"
3. Creator publica el link en su canal (WhatsApp, Telegram, etc.)
4. Seguidores hacen click → /t/:code registra clicks
5. Frontend hace polling cada 5s a /api/tracking/verify-status/:channelId
6. Al alcanzar 3 clicks unicos → auto-verificacion:
   - TrackingLink.verification.status = "verified"
   - Canal.estado = "activo", Canal.verificado = true
7. Frontend avanza automaticamente al Step 5 (exito)
```

### Conversion de URLs para campanas

Cuando un anunciante crea una campana con un targetUrl, el sistema puede convertirlo automaticamente:

```
URL original:   https://mitienda.com/producto
URL trackeable: https://adflow-unified.vercel.app/t/kHaZnvK → 302 → https://mitienda.com/producto
```

Esto permite medir CTR real, dispositivos, paises y engagement sin depender de las APIs de plataformas.

### Modelo TrackingLink

```javascript
{
  code: "kHaZnvK",              // Codigo unico de 7 chars
  targetUrl: "https://...",      // URL de destino
  type: "campaign|verification|custom",
  stats: {
    totalClicks: 142,
    uniqueClicks: 98,
    lastClickAt: Date,
    devices: { desktop: 45, mobile: 52, tablet: 1 },
    countries: { ES: 60, MX: 20, AR: 18 },
    referers: { "t.me": 50, "direct": 48 }
  },
  clicks: [                      // Ultimos 500 clicks detallados
    { ip, userAgent, referer, country, device, os, browser, language, utmSource, ... }
  ],
  verification: {                // Solo para type=verification
    status: "pending|posted|verified|failed|expired",
    minClicks: 3,
    expiresAt: Date,             // 48h desde creacion
    verifiedAt: Date
  }
}
```

---

## Notificaciones en tiempo real

Sistema multicanal basado en EventEmitter + Socket.io.

### Canales de entrega

| Canal | Descripcion |
|-------|-------------|
| `database` | Persiste en modelo Notificacion (siempre) |
| `realtime` | Push via Socket.io a la sesion activa del usuario |
| `email` | Email transaccional via Nodemailer |
| `push` | Push notification nativa (pendiente) |

### Eventos que generan notificacion

| Evento | Destinatario | Prioridad |
|--------|-------------|-----------|
| Campana creada | Creator (dueno del canal) | Normal |
| Campana confirmada (PAID) | Advertiser | Normal |
| Campana publicada | Advertiser | Normal |
| Campana completada | Ambos (advertiser + creator) | Alta |
| Campana cancelada | Creator | Normal |
| Campana expirada | Advertiser | Alta |
| Disputa abierta | Usuario afectado | Alta |
| Disputa resuelta | Ambos participantes | Alta |

### Socket.io

- Autenticacion JWT en handshake (`socket.handshake.auth.token`)
- Rooms por usuario: `user:${userId}`
- Evento de push: `notificacion`
- Reconexion automatica con backoff (3s, max 10 intentos)

---

## Campaign Cron (automatizacion)

Job que se ejecuta cada 10 minutos en `server.js` via `lib/campaignCron.js`.

### Acciones automaticas

| Accion | Condicion | Resultado |
|--------|-----------|-----------|
| **Expirar** | PAID + deadline < ahora | PAID → EXPIRED, notifica advertiser |
| **Auto-completar** | PUBLISHED + publicado hace > 7 dias | PUBLISHED → COMPLETED |
| **Liberar escrow** | COMPLETED reciente + tiene PaymentIntent | Captura Stripe PI, marca transaccion como `paid` |

### Flujo de escrow

```
1. Advertiser confirma pago → Stripe crea PaymentIntent (requires_capture)
2. Creator publica → status = PUBLISHED
3. 7 dias sin accion → cron auto-completa → status = COMPLETED
4. Cron detecta completed reciente → stripe.paymentIntents.capture()
5. Transaccion marcada como paid → creator puede solicitar retiro
```

---

## Servicios clave

### authService

Generacion y verificacion de tokens JWT. Gestion de refresh tokens.

### channelService

CRUD de canales con calculo automatico de score via scoring engine.

### channelScoring / channelPricingService

Algoritmo de scoring de 5 factores. Pricing dinamico basado en CPM y score.

### campaignOptimizerService

Sugerencias de optimizacion para campanas (seleccion de canales, presupuesto).

### launchCampaignService

Gestion del ciclo de vida de campanas (crear, confirmar, publicar, completar, cancelar).

### notificationService

EventEmitter singleton con entrega multicanal (DB, Socket.io, email). Se conecta a Socket.io en `server.js`.

### emailService

Envio de emails transaccionales via Nodemailer. Soporta Gmail, Outlook, SendGrid, Mailgun, SMTP generico.

### fileService

Upload de archivos con Multer, validacion de tipo/tamano, optimizacion de imagenes con Sharp.

### persistentStore

Almacenamiento JSON en disco como fallback cuando MongoDB no esta disponible.

---

## Ejemplos de API

### Login

```bash
curl -X POST https://adflow-unified.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"advertiser@adflow.com","password":"Advert2026x"}'
```

**Respuesta:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "6606a1b2c3d4e5f6a7b8c9d0",
    "email": "advertiser@adflow.com",
    "role": "advertiser",
    "nombre": "Advertiser",
    "emailVerificado": true
  }
}
```

### Crear campana

```bash
curl -X POST https://adflow-unified.vercel.app/api/campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "channel": "6606a1b2c3d4e5f6a7b8c9d1",
    "content": "Descubre nuestra nueva coleccion de verano",
    "targetUrl": "https://mitienda.com/verano",
    "price": 250,
    "deadline": "2026-04-15T23:59:59Z"
  }'
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "_id": "6606a1b2c3d4e5f6a7b8c9d2",
    "advertiser": "6606a1b2c3d4e5f6a7b8c9d0",
    "channel": "6606a1b2c3d4e5f6a7b8c9d1",
    "content": "Descubre nuestra nueva coleccion de verano",
    "targetUrl": "https://mitienda.com/verano",
    "price": 250,
    "netAmount": 225,
    "commissionRate": 0.1,
    "status": "DRAFT",
    "deadline": "2026-04-15T23:59:59.000Z",
    "createdAt": "2026-03-28T12:00:00.000Z"
  }
}
```

### Crear lista de favoritos y anadir canal

```bash
# Crear lista
curl -X POST https://adflow-unified.vercel.app/api/lists \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Mis canales WhatsApp"}'

# Anadir canal a la lista
curl -X POST https://adflow-unified.vercel.app/api/lists/<listId>/add-channel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"channelId":"6606a1b2c3d4e5f6a7b8c9d1"}'
```

### Crear regla AutoBuy

```bash
curl -X POST https://adflow-unified.vercel.app/api/autobuy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Auto WhatsApp ecommerce",
    "content": "Promo especial para tu comunidad",
    "targetUrl": "https://mitienda.com/promo",
    "listId": "<listId>",
    "platforms": ["whatsapp"],
    "categories": ["ecommerce"],
    "maxPricePerPost": 400,
    "dailyBudget": 1000,
    "totalBudget": 5000
  }'
```

### Abrir disputa

```bash
curl -X POST https://adflow-unified.vercel.app/api/disputes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "campaignId": "6606a1b2c3d4e5f6a7b8c9d2",
    "reason": "not_published",
    "description": "Han pasado 5 dias y el anuncio no se ha publicado"
  }'
```

### Crear link de verificacion de canal

```bash
curl -X POST https://adflow-unified.vercel.app/api/tracking/verify-link \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"channelId":"69c808a8cddb1a2e43f29b87"}'
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "id": "69ca3b7bda15584517ba4af5",
    "code": "kHaZnvK",
    "trackingUrl": "https://adflow-unified.vercel.app/t/kHaZnvK",
    "targetUrl": "https://adflow-unified.vercel.app/verify-channel?ch=69c808a8cddb1a2e43f29b87",
    "verification": {
      "status": "pending",
      "minClicks": 3,
      "expiresAt": "2026-04-01T08:59:39.257Z"
    },
    "stats": { "totalClicks": 0, "uniqueClicks": 0, "devices": {} },
    "message": "Publica este enlace en tu canal. Necesitas al menos 3 clicks en 48h para verificar."
  }
}
```

### Convertir URL de anunciante en link trackeable

```bash
curl -X POST https://adflow-unified.vercel.app/api/tracking/convert \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "targetUrl": "https://mitienda.com/producto",
    "campaignId": "6606a1b2c3d4e5f6a7b8c9d2"
  }'
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "id": "69ca4f00da15584517ba4b01",
    "code": "xR7mPqL",
    "originalUrl": "https://mitienda.com/producto",
    "trackingUrl": "https://adflow-unified.vercel.app/t/xR7mPqL",
    "type": "campaign"
  }
}
```

### Consultar estado de verificacion

```bash
curl https://adflow-unified.vercel.app/api/tracking/verify-status/69c808a8cddb1a2e43f29b87 \
  -H "Authorization: Bearer <token>"
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "status": "pending",
    "trackingUrl": "https://adflow-unified.vercel.app/t/kHaZnvK",
    "stats": {
      "totalClicks": 1,
      "uniqueClicks": 1,
      "devices": { "desktop": 1, "mobile": 0 },
      "countries": { "ES": 1 }
    },
    "minClicks": 3,
    "clicksNeeded": 2,
    "recentClicks": [
      { "device": "desktop", "os": "Windows", "browser": "Chrome", "country": "ES" }
    ]
  }
}
```

### Errores

Todas las respuestas de error siguen el mismo formato:

```json
{
  "success": false,
  "message": "Descripcion del error"
}
```

Codigos HTTP usados:

| Codigo | Significado |
|--------|------------|
| 200 | OK |
| 201 | Creado |
| 400 | Datos invalidos / peticion malformada |
| 401 | No autenticado (falta token o token invalido) |
| 403 | No autorizado (rol insuficiente o email no verificado) |
| 404 | Recurso no encontrado |
| 409 | Conflicto (duplicado, estado invalido) |
| 429 | Rate limit excedido |
| 500 | Error interno del servidor |
| 503 | Servicio no disponible (DB desconectada) |

---

## Consideraciones tecnicas

### Serverless en Vercel

- **ensureDb()**: Patron lazy-connection obligatorio antes de cualquier operacion MongoDB. En serverless, cada invocacion puede partir de un cold start sin conexion activa.
- **Pre-carga de rutas**: `app.js` hace `require()` de cada modulo de ruta a nivel top con try-catch individual. Esto permite al file tracer de Vercel (`@vercel/nft`) detectar las dependencias y bundlearlas correctamente.
- **safeMount**: Si un modulo de ruta falla al cargar, se registra un handler 503 en su lugar para no crashear toda la aplicacion.

### Patrón de controladores

Todos los controladores siguen la misma estructura:

```javascript
const miAccion = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    // ... logica de negocio ...

    return res.json({ success: true, data: resultado });
  } catch (error) {
    next(error);
  }
};
```

### Socket.io y server.js

`server.js` crea el HTTP server sobre la app Express y le adjunta Socket.io:

1. `http.createServer(app)` — servidor HTTP
2. `new Server(server, { cors, transports })` — Socket.io sobre el mismo puerto
3. JWT auth middleware en `io.use()` — valida token en handshake
4. Rooms por usuario: `user:${userId}` — para push dirigido
5. Override de `notificationService.enviarTiempoReal` — wired a `io.to().emit()`

### Cron y procesos background

- **campaignCron**: `setInterval` cada 10 min en `server.js` (solo en server mode, no en serverless)
- No hay workers separados — todo corre en el mismo proceso Node
- En Vercel serverless, el cron no se ejecuta (solo aplica en Render o self-hosted)

---

## Estructura de la base de datos

### Relaciones entre modelos

```
Usuario (1) ──→ (N) Canal          # Un creator tiene N canales
Usuario (1) ──→ (N) Campaign       # Un advertiser crea N campanas
Canal   (1) ──→ (N) Campaign       # Un canal recibe N campanas
Campaign(1) ──→ (N) Transaccion    # Una campana genera N transacciones
Campaign(1) ──→ (1) Dispute        # Una campana puede tener 1 disputa
Usuario (1) ──→ (N) UserList       # Un usuario tiene N listas
UserList(1) ──→ (N) Canal          # Una lista contiene N canales
Usuario (1) ──→ (N) AutoBuyRule    # Un advertiser tiene N reglas
AutoBuyRule ──→ (1) UserList       # Una regla puede apuntar a 1 lista
AutoBuyRule ──→ (N) Canal          # Una regla puede apuntar a N canales directos
Usuario (1) ──→ (N) Notificacion   # Un usuario recibe N notificaciones
Campaign(1) ──→ (N) Tracking       # Una campana registra N clicks (legacy)
Campaign(1) ──→ (1) TrackingLink   # Una campana tiene 1 link trackeable
Canal   (1) ──→ (N) TrackingLink   # Un canal tiene N links (incl. verificacion)
Usuario (1) ──→ (N) TrackingLink   # Un usuario crea N links trackeables
Usuario (1) ──→ (N) Retiro         # Un creator solicita N retiros
```

### Indices principales

- `Usuario`: email (unique), rol
- `Canal`: propietario, plataforma, categoria, score
- `Campaign`: advertiser, channel, status, stripePaymentIntentId
- `Transaccion`: campaign, advertiser, creator, tipo, status
- `Dispute`: campaign, openedBy, againstUser, status
- `UserList`: owner + name (unique compound)
- `AutoBuyRule`: advertiser
- `Tracking`: campaign + ip + timestamp
- `TrackingLink`: code (unique), createdBy, campaign, channel, type

---

## Documentacion adicional

| Documento | Descripcion |
|-----------|-------------|
| [`docs/api-contrato.md`](docs/api-contrato.md) | Contrato de API detallado |
| [`docs/estado-real.md`](docs/estado-real.md) | Estado tecnico del proyecto |
| [`docs/plan-fases.md`](docs/plan-fases.md) | Roadmap por fases de desarrollo |
| [`docs/release-checklist.md`](docs/release-checklist.md) | Checklist de release |
| [`.env.example`](.env.example) | Variables de entorno (referencia completa) |

---

## Tests y calidad

```bash
npm test              # Jest (smoke + integracion)
npm run lint          # ESLint check
npm run build         # Verificar build frontend
```

CI/CD configurado con GitHub Actions (`.github/workflows/ci.yml`).

---

## Contribuir

1. Crear rama desde `main`: `git checkout -b feature/mi-feature`
2. Hacer cambios y verificar:
   ```bash
   npm run lint          # Sin errores de linting
   npm run build         # Build frontend exitoso
   npm test              # Tests pasan
   ```
3. Commit con mensaje descriptivo: `feat: agregar filtro por precio en marketplace`
4. Push y crear Pull Request hacia `main`

### Convenciones de commit

```
feat: nueva funcionalidad
fix: correccion de bug
refactor: refactorizacion sin cambio de comportamiento
docs: cambios en documentacion
style: formato, puntuacion (sin cambio de logica)
test: agregar o corregir tests
chore: mantenimiento, dependencias, config
```

---

## Licencia

MIT
