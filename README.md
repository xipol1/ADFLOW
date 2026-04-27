# Channelad

> Marketplace de publicidad en comunidades cerradas: WhatsApp, Telegram, Discord, Instagram, Facebook, LinkedIn y newsletters.
> Producción: <https://channelad.io>

[![Audit](https://img.shields.io/badge/audit-AUDIT.md-orange)](AUDIT.md)
[![Docs](https://img.shields.io/badge/docs-/docs-blue)](docs/)

---

## Tabla de contenido

1. [Stack](#stack)
2. [Estructura del repo](#estructura-del-repo)
3. [Setup local](#setup-local)
4. [Scripts npm](#scripts-npm)
5. [Variables de entorno](#variables-de-entorno)
6. [Despliegue (Vercel)](#despliegue-vercel)
7. [Documentación adicional](#documentación-adicional)

---

## Stack

| Capa | Tecnología |
|------|------------|
| Runtime | Node.js ≥ 16, npm ≥ 8 |
| Backend | Express 4, Mongoose 7 (MongoDB Atlas), Socket.io 4, Redis 4 |
| Pagos | Stripe 13 (PaymentIntents con `manual` capture = escrow) + Stripe Connect Express |
| Auth | JWT (access + refresh), bcryptjs, otpauth (TOTP), Google OAuth |
| Email | Nodemailer (SMTP / Gmail / SendGrid / Mailgun) |
| Frontend | React 18, React Router 6, Vite 4, TailwindCSS 3, Recharts, Framer Motion |
| Integraciones | Telegram Bot API + MTProto, WhatsApp Cloud API + Baileys, Discord, Meta/Instagram OAuth, LinkedIn OAuth |
| Seguridad | Helmet, CORS allowlist, HPP, express-rate-limit (Mongo store), express-mongo-sanitize |
| Logs / monitoring | Winston + Morgan |
| Tests | Jest + Supertest |
| Deploy | Vercel (serverless functions + static) |

> **Nota:** ver [AUDIT.md](AUDIT.md) para hallazgos críticos pendientes (firma de webhooks, idempotencia Stripe, fallback de comisión 10 % vs 20 %, etc.).

---

## Estructura del repo

```
channelad/
├── api/                 # Vercel serverless entry (api/index.js → require('../app'))
├── app.js               # Express app: middleware, mounts, blog SSG, catch-all React
├── server.js            # HTTP server + Socket.io + cron + graceful shutdown
├── config/              # config.js, database.js, redis.js, commissions.js, swagger.js, validateEnv.js
├── controllers/         # 24 controladores HTTP (auth, campaigns, channels, payouts…)
├── routes/              # 33 routers Express (montados en app.js)
├── middleware/          # auth, rate limiting, partner auth, idempotency, request metrics
├── models/              # 32 schemas Mongoose
├── services/            # 50+ servicios (Stripe Connect, OAuth, scrapers, scoring, …)
├── lib/                 # helpers reutilizables (ensureDb, logger, scoringEngine, campaignCron, …)
├── jobs/                # cron jobs (intel scraping, scoring, métricas)
├── workers/             # whatsapp-web.js worker (solo VPS, no Vercel)
├── integraciones/       # SDK wrappers para Telegram, WhatsApp, Meta, Discord, LinkedIn, Newsletter
├── templates/emails/    # plantillas HTML para nodemailer
├── scripts/             # build-blog.js, migrate-roles.js, seed.js, generate-report.js, …
├── tests/               # Jest + supertest (integration + unit)
├── content/blog/        # fuentes Markdown del blog estático
├── public/              # estáticos (incluye public/blog/*.html generado por build-blog.js)
├── client/              # frontend React (Vite root = client/)
│   ├── index.html       # entry HTML de Vite
│   ├── styles/          # globals.css
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── routes/AppRoutes.jsx
│       ├── ui/pages/    # 30+ páginas
│       ├── ui/components/
│       ├── ui/layouts/
│       ├── ui/navigation/
│       └── auth/        # AuthContext
├── docs/                # technical-guide, getalink-api, plan-fases, swagger, legal/…
├── vite.config.js       # root: 'client', build.outDir: '../dist'
├── tailwind.config.js
├── vercel.json          # rewrites + crons + functions config
└── README.md
```

### Flujo de request

```
Producción (Vercel)
  Cliente → CDN ─┬─► /api/*   → /api/index.js (serverless) → app.js (Express)
                 ├─► /t/:code, /r/:id, /go/* → /api/index.js (tracking)
                 ├─► /blog, /blog/:slug      → public/blog/*.html (estático)
                 └─► resto                   → dist/index.html (SPA React)

Desarrollo
  Frontend (Vite :5173)  ────►  Backend Express (:5000)  ────►  MongoDB Atlas
                                          │
                                          └─► Socket.io (mismo puerto)
```

---

## Setup local

### Prerequisitos

- Node.js ≥ 16 y npm ≥ 8.
- MongoDB local o un cluster Atlas (`MONGODB_URI`).
- Opcional: Redis local (`REDIS_URL`) para rate limiting distribuido y TTL de OTPs.

### Pasos

```bash
git clone <repo-url> channelad
cd channelad
npm install
cp .env.example .env
# Edita .env: como mínimo MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET.
npm run build           # genera blog estático + bundle de Vite
npm run dev:full        # backend (5000) + frontend (5173) en paralelo
```

Abre <http://localhost:5173>. La API queda en <http://localhost:5000/api/health>.

### Modo "sólo backend" o "sólo frontend"

```bash
npm run dev               # nodemon server.js (puerto 5000)
npm run frontend:dev      # vite dev (puerto 5173)
```

### Tests

```bash
npm test                  # jest
npm run test:watch        # jest --watch
```

Los tests de integración requieren `MONGODB_TEST_URI` apuntando a una base separada.

---

## Scripts npm

| Script | Comando | Uso |
|--------|---------|-----|
| `start` | `node server.js` | Producción (no usado en Vercel; entry real es `api/index.js`). |
| `dev` | `nodemon server.js` | Backend con hot reload. |
| `frontend:dev` | `vite` | Frontend Vite con HMR. |
| `frontend:build` | `vite build` (con guardia) | Compila frontend a `dist/` (no-op si falta `index.html`). |
| `frontend:preview` | `vite preview` | Sirve el bundle de producción para QA. |
| `dev:full` | `concurrently "npm run dev" "npm run frontend:dev"` | Backend + frontend. |
| `blog:build` | `node scripts/build-blog.js` | Renderiza `content/blog/*.md` → `public/blog/*.html` + `sitemap.xml` + `feed.xml`. |
| `build` | `npm run blog:build && npm run frontend:build` | Build completo (lo ejecuta Vercel). |
| `build:full` | `npm run build && npm start` | Build + start, útil para smoke local. |
| `migrate:roles` | `node scripts/migrate-roles.js` | Migración one-off de roles en BD. |
| `test` / `test:watch` | `jest` | Tests Jest. |
| `lint` / `lint:fix` | `eslint .` | Lint y auto-fix. |

---

## Variables de entorno

Copia [.env.example](.env.example) a `.env`. El archivo está agrupado por dominio (Runtime, URLs, Database, Auth, Stripe, Email, Telegram, WhatsApp, Discord, Instagram, Meta, LinkedIn, Google, Bot, Beta, Demo).

`config/validateEnv.js` valida al arranque:

- **Bloquea el proceso en producción** si faltan `MONGODB_URI`, `JWT_SECRET`, `FRONTEND_URL`, `BACKEND_URL`.
- **Solo emite warnings** (en producción degrada features individuales) si faltan credenciales de email, Telegram, Discord, Instagram, WhatsApp o `CRON_SECRET`.

> **Comisiones:** las tasas viven en `config/commissions.js` (no en envs).
> Las tarifas reales son: standard 20 %, partnerAPI 18 %, autoCampaign 25 %, collaborative 28 %, volumeMid (>5K€) 18 %, volumeHigh (>20K€) 15 %.
> Cualquier `PLATFORM_COMMISSION_RATE` en `.env` es ignorado por el código actual.

---

## Despliegue (Vercel)

El despliegue es 100 % serverless con assets estáticos.

### Configuración relevante (`vercel.json`)

- `installCommand`: `npm install --include=dev` (necesario para que Vite esté disponible en build).
- `buildCommand`: `npm run build` (blog estático + Vite).
- `outputDirectory`: `dist` (assets servidos desde la CDN).
- `functions["api/index.js"]`: única función serverless (`maxDuration: 60`s, incluye `routes/`, `controllers/`, `models/`, `middleware/`, `lib/`, `services/`, `config/`, `docs/swagger/`, `templates/`, `integraciones/`, `jobs/`; excluye `node_modules/{sharp,puppeteer,whatsapp-web.js}`).
- `crons`: 6 jobs diarios/semanales (Meta token refresh, scoring, intel scraping, métricas).
- `rewrites`: `/api/(.*)` → `/api/index.js`; `/t/:code`, `/r/:campaignId`, `/go/:path*`, `/health` → `/api/index.js`; `/blog/:slug` → `/blog/:slug.html`; resto → `/index.html`.

### Setup en Vercel

1. Conectar el repo de GitHub.
2. Pegar TODAS las variables de [.env.example](.env.example) en *Settings → Environment Variables* (Production y Preview).
3. Configurar *Domains* con el dominio productivo.
4. Verificar que los crons aparecen en *Settings → Cron Jobs*.
5. Asegurar que `STRIPE_WEBHOOK_SECRET`, `META_APP_SECRET`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY` y `BOT_API_KEY` están definidos antes del primer despliegue (sin ellos hay funcionalidades degradadas o vulnerabilidades).

### Webhooks externos a configurar

| Proveedor | URL | Header / secret |
|-----------|-----|------------------|
| Stripe (Partner API) | `https://channelad.io/api/partners/webhooks/stripe` | firma con `STRIPE_WEBHOOK_SECRET` |
| Stripe (recargas) | `https://channelad.io/api/transacciones/webhook` | firma con `STRIPE_WEBHOOK_SECRET` |
| WhatsApp Cloud API (Meta) | `https://channelad.io/api/webhooks/whatsapp` | `WHATSAPP_VERIFY_TOKEN` para subscribe; HMAC con `META_APP_SECRET` |
| Telegram Bot | `https://channelad.io/api/webhooks/telegram` | secret-token (configurar en `setWebhook`) |

### Deploy alternativo (Render / VPS)

Existe un `render.yaml` mínimo. Para correr en VPS hace falta instalar Redis, definir `WHATSAPP_SESSION_PATH` (activa el worker `services/WhatsAppAdminClient.js`), y exponer el puerto con un proxy (nginx/caddy).

---

## Documentación adicional

- [docs/technical-guide.md](docs/technical-guide.md) — guía técnica detallada (modelos, flujos, integraciones).
- [docs/api-contrato.md](docs/api-contrato.md) — contrato de la API pública para partners.
- [docs/getalink-api.md](docs/getalink-api.md) — integración específica con Getalink.
- [docs/plan-fases.md](docs/plan-fases.md) — roadmap por fases.
- [docs/release-checklist.md](docs/release-checklist.md) — checklist pre-deploy.
- [docs/onboarding-system-design.md](docs/onboarding-system-design.md) — diseño del wizard de onboarding (7 pasos).
- [docs/wireframes.md](docs/wireframes.md) — wireframes históricos.
- [docs/swagger/](docs/swagger/) — definiciones OpenAPI consumidas por `swagger-ui-express` (`/api/docs` requiere JWT admin en producción).
- [docs/legal/](docs/legal/) — términos y privacidad.
- [AUDIT.md](AUDIT.md) — auditoría técnica con hallazgos priorizados.

---

## Licencia

Propietaria. © Michi Solucions S.L. (en constitución).
