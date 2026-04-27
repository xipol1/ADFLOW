# Architecture

A 10-minute mental model of how Channelad fits together. Read this before diving into the code.

> Companion docs: [glossary.md](glossary.md) for the bilingual entity names, [technical-guide.md](technical-guide.md) for module-by-module depth.

---

## 1. Big picture

```
        Browser (React 18 + Vite SPA)
                  │
                  │  HTTP   /api/*   /t/:code   /r/:id   /go/*
                  ▼
        ┌─────────────────────────────┐
        │  Vercel Edge / CDN          │
        │  - Static assets from /dist │
        │  - Static blog HTML         │
        │  - Rewrites /api/* + tracking
        ▼
        ┌─────────────────────────────┐
        │  api/index.js               │   single Vercel serverless fn
        │  → require('../app.js')     │   60s maxDuration
        │                             │
        │  Express app                │
        │  - middleware (helmet, cors,│
        │    rate-limit, sanitize)    │
        │  - 33 route modules         │
        │  - blog static serve        │
        │  - SPA catch-all            │
        └──────────┬─────────┬────────┘
                   │         │
        Mongoose   │         │  Stripe SDK + webhooks
                   ▼         ▼
            MongoDB Atlas    Stripe (Payments + Connect)
                   │
              Redis (rate-limit fallback, OTP TTL)
```

Two things that are not on this diagram but matter:

- **Vercel cron** hits 6 internal endpoints daily/weekly (Meta token refresh, scoring recalc, intel scraping). They share a single `CRON_SECRET`.
- **Long-running workers** (`whatsapp-web.js`, `services/WhatsAppAdminClient`) live on a VPS or dev machine, not on Vercel. They activate when `WHATSAPP_SESSION_PATH` is set.

---

## 2. The six pieces that matter

### 2.1 Marketplace core

The classic two-sided marketplace.

- **Channels** (`models/Canal.js`): a creator's community on a specific platform (Telegram, WhatsApp, Discord, Instagram, Facebook, LinkedIn, Newsletter). Holds pricing, niche, audience size, verification tier (`bronce`/`plata`/`oro`), CAS score.
- **Campaigns** (`models/Campaign.js`): a funded ad placement on a specific channel. State machine: `DRAFT → PAID → PUBLISHED → COMPLETED` with side branches `CANCELLED`, `EXPIRED`, `DISPUTED`. Owns `price`, `commissionRate`, `netAmount` (= `price * (1 - commissionRate)`, recomputed in pre-save).
- **Users** (`models/Usuario.js`): roles `creator`, `advertiser`, `admin`. Holds JWT sessions, 2FA secret (encrypted), Stripe Connect account id, referral code/tier, beta-access flag.

Discovery: `/api/channels` (buyer-side filters/rankings) vs `/api/canales` (creator-side CRUD) — see glossary.

### 2.2 Money flow (Stripe)

```
Advertiser                     Channelad                    Creator
    │                               │                           │
    │── create-payment-intent ───▶  │                           │
    │                               │── PaymentIntent.create    │
    │                               │   capture_method=manual   │
    │                               │   (escrow authorize)      │
    │  client_secret                │                           │
    │◀──────────────────────────────│                           │
    │── confirm card on Stripe ────▶                           │
    │                               │  webhook:                 │
    │                               │  payment_intent.amount    │
    │                               │  _capturable_updated      │
    │                               │  → Campaign.status=PAID   │
    │                               │                           │
    │   …creator publishes ad…                                  │
    │                               │                           │
    │── POST /campaigns/:id/        │                           │
    │       complete ─────────────▶ │                           │
    │                               │── PaymentIntent.capture   │
    │                               │   (idempotencyKey:        │
    │                               │    capture:<piId>)        │
    │                               │── Transfer.create to      │
    │                               │   creator's Connect acct  │
    │                               │   (idempotencyKey:        │
    │                               │    transfer:<campaignId>) │
    │                               │── PayoutAttempt row       │
    │                               │   succeeded/failed        │
    │                               │                           │
```

Hard rules (enforced by AUDIT.md):
- Every Stripe call passes an `idempotencyKey` keyed on a stable resource id.
- Every webhook handler verifies the signature against the **raw** body. Failed verification = 4xx, never silently accepted.
- Commission rate comes from `config/commissions.js`. Never hardcode percentages elsewhere.
- Failed transfers are persisted as `PayoutAttempt` rows; admin can list/retry via `/api/admin/payouts`.

### 2.3 Channel intelligence + scoring

Background pipeline that gives each channel a CAS (Channel Audience Score, 0-100):

- **Discovery jobs** (`jobs/`, daily Vercel cron): scrape Telegram (MTProto + tgstat), Discord (Disboard, Cheetah), Instagram (Igrupos + xtea), WhatsApp (wachannelsfinder), and newsletters. Insert `ChannelCandidate` rows for admin review.
- **Metrics capture** (`services/campaignSnapshotService`, `services/channelScoringV2`): on every campaign completion plus daily, snapshot views/forwards/engagement to `CampaignMetrics{V2}` and `CanalScoreSnapshot`.
- **Scoring engine** (`lib/scoringEngine.js`, `services/scoringOrchestrator.js`): combine snapshots into CAS using CAF (audience), CTF (traffic), CER (engagement), fillRate. Persisted on `Canal.cas`.
- Admin endpoints under `/api/admin/scoring/*`.

Auth: cron endpoints check `CRON_SECRET`; admin endpoints check `req.usuario.rol === 'admin'`.

### 2.4 Tracking + verification

Three URL formats, one handler in `app.js`:
- `/t/:code` — short link.
- `/r/:slug` — custom slug.
- `/go/:path*` — domain-prefixed.

All resolve to a `TrackingLink` document and 302 to `targetUrl` (with UTM passthrough).

Per-click side effects (in `setImmediate`):
- Composite fingerprint = `sha1(ip::ua::device::os::browser).slice(0, 20)`. Bot user-agents are filtered out.
- Atomic dedup against `TrackingFingerprint` collection (unique compound index, 90-day TTL). First sighting → `uniqueClicks++`.
- Append click record (capped at last 500).
- Update `stats.totalClicks`, `stats.devices`, `stats.countries`, `stats.referers`.
- For verification links, when `uniqueClicks >= verification.minClicks`, mark `Canal.verificado = true, estado = 'activo'`.

Rate-limited at 30 req/min per IP (express-rate-limit + mongo store) so click flooding can't trigger verification.

### 2.5 Onboarding (creator side)

7-screen wizard for creators arriving from Getalink (or organic):

```
register  →  channel info  →  verify-intro  →  verify-action  →  verify-wait  →  success
```

Each platform has its own verifier (`controllers/onboardingController.js`):
- **Telegram**: bot-as-admin check via Bot API.
- **Discord**: webhook URL verification.
- **Instagram**: OAuth state with a `source` field that routes the callback either back to the wizard (`/onboarding/success`) or to the dashboard (`/creator/channels`).
- **WhatsApp**: dual track — Cloud API OTP for personal numbers, `whatsapp-web.js` admin worker on VPS for full read access.

Email-verified is enforced (`requiereEmailVerificado`) on every platform `verify` route so unverified accounts can't claim channels.

### 2.6 Partner API

External integrations (Getalink today, others later) talk to `/api/partners/*` with bearer auth. Contract documented in [docs/api-contrato.md](api-contrato.md) and [docs/getalink-api.md](getalink-api.md).

Special middleware:
- `middleware/partnerAuth.js` — bearer token → `req.partner`.
- `middleware/partnerIdempotency.js` — caches POST responses by `Idempotency-Key` header so retries don't double-spawn campaigns.
- `middleware/partnerRequestContext.js` — request id + structured logging.

Webhook back to partners: `services/webhookService.js` signs payloads with the partner's secret.

Stripe-side: partners get `partnerAPI` commission tier (18 %) by default, override-able per-partner via `Partner.commissionOverride`.

---

## 3. Request lifecycle (concrete example)

`POST /api/campaigns/:id/complete` (creator marks the placement done):

1. Vercel CDN matches the rewrite `/api/(.*) → /api/index.js`.
2. `api/index.js` does `require('../app')`. The Express app boots once per cold start; warm calls reuse the same instance.
3. Middleware chain on the request:
   - `helmet` headers.
   - `cors` allowlist check (FRONTEND_URL + CORS_ORIGIN list + `*.vercel.app` suffix).
   - `morgan` access log.
   - `requestMetrics` for the `/health` endpoint counters.
   - `express.json` (body size capped by `MAX_REQUEST_SIZE`).
   - `express-mongo-sanitize`, `hpp`.
   - Sensitive-path filter (rejects `/.env`, `/.git`, etc.).
4. Router lookup: `/api/campaigns` → `routes/campaigns.js`.
5. Route middleware: `autenticar` (JWT), `requiereEmailVerificado`, `validarCampos` (express-validator).
6. `controllers/campaignController.completeCampaign`:
   - Verifies the user owns the channel.
   - Transitions `Campaign.status` to `COMPLETED`.
   - Creates / updates `PayoutAttempt` row.
   - Fires `setImmediate` to capture the Stripe PaymentIntent (with idempotencyKey) and create the Transfer to the creator's Connect account.
   - Fires `setImmediate` to snapshot final campaign metrics.
   - Sends notifications to advertiser + creator.
   - Generates referral credit if applicable.
7. JSON response back through the middleware chain.

A failed transfer ends up as `PayoutAttempt.status = 'failed'`, visible at `/api/admin/payouts`.

---

## 4. Where things live

```
Channelad
├── api/                — Vercel serverless entry (single fn, re-exports app)
├── app.js              — Express setup, route mounts, blog/SPA catch-all
├── server.js           — Local HTTP + Socket.io + cron + graceful shutdown
├── config/             — Configuration (commissions, db, redis, validateEnv, swagger)
├── controllers/        — HTTP handlers (one per domain)
├── routes/             — Express routers (one per URL prefix)
├── models/             — Mongoose schemas
├── services/           — Business logic (Stripe, OAuth, scrapers, scoring, …)
├── middleware/         — Cross-cutting (auth, rate limit, idempotency, metrics)
├── lib/                — Shared helpers (logger, ensureDb, scoringEngine, campaignCron)
├── jobs/               — Cron job entry points (called by Vercel cron)
├── workers/            — Long-running processes (whatsapp worker — VPS only)
├── integraciones/      — SDK wrappers (Telegram, WhatsApp, Meta, Discord, LinkedIn)
├── templates/emails/   — Nodemailer HTML templates
├── scripts/            — One-shot CLIs (migrations, seeds, build-blog, smoke tests)
├── tests/              — Jest + supertest
├── content/blog/       — Markdown sources for the static blog
├── public/             — Public assets (incl. generated public/blog/*.html)
├── client/             — Frontend (Vite root)
│   ├── index.html
│   ├── styles/
│   └── src/            — App.jsx, routes, hooks, ui/, services/api.js, …
└── docs/               — This folder
```

---

## 5. Things that surprise people

- **app.js pre-loads every route at top level** (`_routes['./routes/auth'] = require('./routes/auth')`). That's so Vercel's `nft` static tracer bundles every route file into the serverless artefact. Without it the lazy `require()` inside `safeMount()` was getting tree-shaken away.
- **Two Stripe webhook routes**, both must be configured: `/api/partners/webhooks/stripe` and `/api/transacciones/webhook`. Different audiences, both verify signatures the same way.
- **CORS in dev allows all origins, in prod uses an allowlist**. The allowlist is built once at boot from `FRONTEND_URL + CORS_ORIGIN.split(',') + *.vercel.app suffix`. Socket.io reuses the same allowlist via `app.isAllowedOrigin`.
- **Rate limiting uses MongoDB**, not memory. Each Vercel cold start would otherwise reset counters. See `middleware/rateLimiter.js` for the `rate-limit-mongo` plumbing.
- **Static blog is built at deploy time** (`scripts/build-blog.js`) into `public/blog/*.html`. Express tries to serve those before falling through to the SPA. Vercel rewrites cover the same routes.
- **The catch-all `app.get('*')` in app.js explicitly skips `/blog`**, so blog 404s don't accidentally serve the SPA shell.
- **`req.usuario` (Spanish) is set by `middleware/auth.js`**, not Express. Everything keys on `req.usuario.id` and `req.usuario.rol`.
