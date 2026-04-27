# Glossary

Channelad's codebase is bilingual: legacy modules (the marketplace core, written first in Spanish) coexist with newer modules and infrastructure named in English. This page is the dictionary so you don't have to guess.

---

## Domain entities

| Spanish (in code) | English | Where it lives | Notes |
|-------------------|---------|----------------|-------|
| `Canal`           | Channel | `models/Canal.js` | A creator-owned community on Telegram, WhatsApp, Discord, Instagram, Facebook, LinkedIn or Newsletter. The "supply" side of the marketplace. |
| `Anuncio`         | Ad / Advertisement | `models/Anuncio.js` | A static description of an ad slot. Mostly superseded by `Campaign`. |
| `Campaign`        | Campaign | `models/Campaign.js` | A funded ad placement on a specific channel. The unit of escrow + payout. |
| `Transaccion`     | Transaction | `models/Transaccion.js` | A money movement (charge, refund, commission, payout, referral credit). |
| `Usuario`         | User | `models/Usuario.js` | A platform account: `creator`, `advertiser`, or `admin`. |
| `Retiro`          | Withdrawal | `models/Retiro.js` | A creator's payout request (manual flow, distinct from automated Stripe Connect transfer). |
| `Archivo`         | File | `models/Archivo.js` | An uploaded file (creative asset, KYC doc, etc.). |
| `Notificacion`    | Notification | `models/Notificacion.js` | In-app or push notification record. |
| `Disputa`         | Dispute | `models/Dispute.js` | Buyer/seller disagreement on a completed campaign. (English filename, Spanish content fields.) |
| `Estadistica`     | Statistic | `models/Estadistica.js` | Cached analytics rollup. |

---

## Roles

| Spanish | English | What they do |
|---------|---------|--------------|
| `creator` (or `propietario` of a `Canal`) | Creator / channel owner | Lists channels, sets prices, fulfils ad placements, gets paid. |
| `advertiser` | Advertiser | Funds campaigns to run on creator channels. |
| `admin` | Admin | Internal operator. Resolves disputes, scores channels, reviews payout failures. |

---

## Lifecycle states

### Campaign (`Campaign.status`)

```
DRAFT  →  PAID  →  PUBLISHED  →  COMPLETED
   │        │                       │
   │        └─→ EXPIRED              │
   └─→ CANCELLED                    └─→ DISPUTED
```

| State       | Spanish |
|-------------|---------|
| `DRAFT`     | borrador / pendiente de pago |
| `PAID`      | pagado / en escrow |
| `PUBLISHED` | publicado |
| `COMPLETED` | completada / liberada al creador |
| `CANCELLED` | cancelada |
| `EXPIRED`   | expirada |
| `DISPUTED`  | en disputa |

### Transaction (`Transaccion.tipo`)

| Value      | English equivalent | Note |
|------------|--------------------|------|
| `pago`     | charge            | Buyer's escrow payment for a campaign. |
| `recarga`  | top-up            | Wallet recharge. |
| `reembolso`| refund            | Refund to buyer. |
| `comision` | commission        | Platform's cut. **Always `comision` (Spanish) — never `commission`.** |
| `retiro`   | withdrawal        | Creator's payout request. |
| `referral` | referral credit   | 5% referral bonus credited to a referring user. |

### Transaction (`Transaccion.status`)

`pending`, `escrow`, `paid`, `refunded`, `failed`. English in code, `pendiente / en escrow / pagada / reembolsada / fallida` in the UI.

---

## Channel verification (`Canal.nivelVerificacion`)

| Tier      | Means |
|-----------|-------|
| `bronce`  | Email-verified owner only. |
| `plata`   | Owner has connected the platform via OAuth (Meta / LinkedIn) — read-only metrics access. |
| `oro`     | Bot has admin access on the platform (Telegram bot, WhatsApp Business, Discord webhook). Full automation possible. |

Higher tier = more trust = better discoverability in the marketplace + lower commission tier.

---

## Commission tiers (`config/commissions.js`)

| Tier            | Rate | Trigger |
|-----------------|------|---------|
| `standard`      | 20 % | Default for manual campaigns. |
| `noAdminAccess` | 22 % | Channel without admin access (penalty). |
| `autoCampaign`  | 25 % | Campaign created via the auto-buy bulk flow. |
| `collaborative` | 28 % | Premium collaborative campaign. |
| `volumeMid`     | 18 % | Advertiser with > €5K monthly GMV. |
| `volumeHigh`    | 15 % | Advertiser with > €20K monthly GMV. |
| `partnerAPI`    | 18 % | Campaign created via the Partner API (Getalink and friends). |

Resolved by `resolveCommissionRate({ isPartnerAPI, monthlyGMV, campaignType, hasAdminAccess })`.

---

## Referral programme (`config/commissions.js`)

| Constant | Value |
|----------|-------|
| `REFERRAL_RATE` | `0.05` — 5 % of every referred advertiser's spend goes back to the referrer as credit. |
| `REFERRAL_TIERS.power.gmv` / `.count` | `5000 €` / `5` referrals → `power` tier. |
| `REFERRAL_TIERS.partner.gmv` / `.count` | `20000 €` / `20` referrals → `partner` tier. |

Helper: `getReferralTier(user)` returns `'normal' | 'power' | 'partner'`.

---

## Scoring (CAS — Channel Audience Score)

| Acronym | Spanish | English |
|---------|---------|---------|
| `CAS`   | Channel Audience Score | Composite 0-100 score per channel. |
| `CAF`   | Calidad de Audiencia (Audience Quality) | Component of CAS. |
| `CTF`   | Calidad de Tráfico (Traffic Quality) | Component of CAS. |
| `CER`   | Calidad de Engagement Real | Component of CAS. |
| `CPM`   | Cost Per Mille | Pricing benchmark per niche. |
| `fillRate` | (kept in English) | Slots filled / slots available, 0-1. |
| `ConfianzaScore` | Trust Score | Aggregate trust signal. |

Implementation: `lib/scoringEngine.js`, `services/scoringOrchestrator.js`, `services/channelScoringV2.js`.

---

## Routes / controllers

Most route files keep their Spanish historic name even when their domain is English. So:

| URL prefix              | Route file                       | Controller                           |
|-------------------------|----------------------------------|---------------------------------------|
| `/api/canales`          | `routes/canales.js`              | `controllers/canalController.js`      |
| `/api/channels`         | `routes/channels.js`             | `controllers/channelsController.js`   |
| `/api/anuncios`         | `routes/anuncios.js`             | `controllers/anuncioController.js`    |
| `/api/transacciones`    | `routes/transacciones.js`        | `controllers/transaccionController.js`|
| `/api/estadisticas`     | `routes/estadisticas.js`         | `controllers/estadisticaController.js`|
| `/api/campaigns`        | `routes/campaigns.js`            | `controllers/campaignController.js`   |

**Yes**, `/api/canales` and `/api/channels` are two different things. `canales` is creator-side CRUD on Channel records; `channels` is buyer-side discovery (filters, rankings).

---

## Commonly confusing things

- **`req.usuario` vs `req.user`** — Express auth middleware sets `req.usuario` (Spanish). Some integration tests and partner-API helpers expect `req.user`. When in doubt, check `middleware/auth.js`.
- **`propietario` field on `Canal`** — that's the channel owner (a `Usuario._id`), not a "proprietary" boolean.
- **`comision` enum value vs `commission` English word** — the enum is `'comision'`. Anywhere you see `tipo: 'commission'` in a query, it's a bug (it matches no documents). See AUDIT.md A-4 for the fix that landed.
- **Commission rate vs referral rate vs CPM** — three different numbers. Commission is what the platform takes. Referral rate is what the platform pays back to the referrer. CPM is a pricing benchmark per niche, used in the auto-buy / suggestion flows.
