# First campaign — link-attribution flow

WhatsApp does **not** sync channels to linked devices, so we can't auto-publish or read
native views/reactions (proof: `docs/wa-web-metrics-validation.md`). The only channel
metric we can read is the **subscriber count by invite code**
(`services/whatsappChannelStats.js`). So:

> The **creator publishes the ad himself** (we hand him the creative + a tracked link).
> We attribute by **clicks** on `https://channelad.io/r/<campaignId>`, not by views.

The redirect + click logging already runs on Vercel (`app.js → GET /r/:campaignId →
models/Tracking`, dedupe per IP/1h). **Clicks are recorded even if this PC is asleep** —
the PC is only needed to (a) read the subscriber count and (b) run these scripts.

## Scripts

| Script | What it does | Writes? |
|---|---|---|
| `run-first-campaign.js` | Creates the Campaign (reach = subscribers, status DRAFT, link). | Prod Mongo, only with `--apply` |
| `confirm-delivery.js`   | Marks it PUBLISHED once the creator posted (manual). | Prod Mongo (single campaign) |
| `campaign-report.js`    | Clicks (total/unique), time series, CTR = clicks/reach. | Read-only |

## Flow

```powershell
# 1. Create the campaign (DRY-RUN first — no --apply — to preview)
node scripts/run-first-campaign.js `
  --advertiser-name "Wetaca" --advertiser-email ads@wetaca.com `
  --invite 0029Vb82Fo0I7BeLLtWLvh2B `
  --target "https://wetaca.com/oferta" `
  --creative "🍱 Comida real a domicilio. 20% con CANAL20. {{LINK}}"

# 2. Commit it (writes to prod Mongo, prints the link + final creative for chomon)
#    add --apply
node scripts/run-first-campaign.js ... --apply

# 3. Send chomon the printed creative + link → he publishes in his channel → he forwards
#    you the post. Then mark it live:
node scripts/confirm-delivery.js <campaignId>

# 4. After the campaign window, pull the report:
node scripts/campaign-report.js <campaignId>
```

Example link: `https://channelad.io/r/665f…c1a9` → 302 to the advertiser's `targetUrl`.

## Flags (`run-first-campaign.js`)

- `--advertiser-name`, `--advertiser-email` — the founding brand (Usuario, created if new).
- `--invite` — channel invite code or full `whatsapp.com/channel/...` URL.
- `--target` — advertiser landing (validated: http(s) + `lib/urlBlocklist`).
- `--creative` — ad text. Put `{{LINK}}` where the link goes; appended if absent.
- `--creator-email` — default `chomon@gmail.com` (already exists in DB).
- `--price` — default `0` (founding brand, no commission → `commissionRate: 0`).
- `--reach <n>` — override the subscriber count manually.
- `--no-wa` — skip the live whatsapp-web.js query; take reach from
  `_canales-cocina-validated.json` (faster, no Chromium).
- `--apply` — **actually write**. Without it, dry-run.

## Notes / guardrails

- Reach: by default tries the live wweb count (`getMetaByInvite`, needs the logged-in
  session in `data/whatsapp-session-probe`, ~30s). Falls back to the validated JSON, then
  to `--reach`. Clicks never depend on wweb.
- Writes touch ONLY `Campaign` (+ find-or-create the advertiser `Usuario` and the
  `Canal`). It never modifies other campaigns/users.
- `status` uses the existing enum (`DRAFT` → `PUBLISHED`); there is no `pendiente`.
- Money/payouts are out of scope here — founding brand's first campaign is commission-free
  and settled manually.
- Delivery confirmation is **manual** on purpose: forwarded channel posts don't reliably
  reach a linked device, so auto-detection isn't trustworthy. The first click also proves
  the post is live.
- Local JSON dumps (`_campaign-*.json`) are git-ignored.

---

# Test the FULL product flow (seeded actors)

To exercise the real lifecycle (request → copy → pay → review → publish → metrics)
through the actual controllers, not the shortcut script above.

## 1. Seed the actors (once)

```powershell
node scripts/seed-test-campaign.js --apply --reset-password
```

Creates / configures (idempotent):
- **creator@channelad.io** (creator, betaAccess, founderTier) — owns the channel
- **La Terreta Cream** WhatsApp channel — €25, marketplace-visible (`estado: activo`)
- **advertiser@channelad.io** (advertiser, betaAccess, fiscal data, €100 credits)

Default password for both: `Channelad.test.2026` (change it after). Flags:
`--price`, `--credits`, `--password`, `--reach`, `--no-wa`, `--reset-password`.

## 2a. Run the whole flow automatically (no server needed)

`e2e-campaign-flow.js` invokes the **real controllers in-process** with mocked
req/res — same validation, pricing, commission, tracking-link, escrow and payout
as the app, against prod Mongo. Payment is covered by the advertiser's credits
(€0 charge → no Stripe, no real money moves).

```powershell
node scripts/e2e-campaign-flow.js --apply --click            # create → pay → confirm → click
node scripts/e2e-campaign-flow.js --apply --click --complete # + complete
node scripts/campaign-report.js <campaignId>                 # clicks + CTR
```

Flags: `--target`, `--creative`, `--tracking-format short|domain|custom`,
`--channel-id`, `--advertiser-email`, `--creator-email`.

Verified 2026-06-04 on La Terreta Cream: DRAFT €28.75 → PAID (€0 charged, credits)
→ PUBLISHED (`/t/<hash>` link, WhatsApp delivery = manual/skipped) → 2 clicks tracked.

## 2b. Or click through the app UI

Start the app (`npm run dev:full`), then:
1. **Advertiser** — log in as advertiser@channelad.io → marketplace → pick *La Terreta
   Cream* → request campaign (paste copy + targetUrl). *(request + copy)*
2. Pay the campaign. Locally `NODE_ENV=development` allows the simulated/credits
   path, so no real card is needed. *(payment)*
3. **Creator** — log in as creator@channelad.io → campaign requests → review the copy
   (chat / suggestions) → **confirm** to publish. *(review + validation + publication)*
4. WhatsApp is manual: the creator posts the copy + tracking link in the channel and
   forwards proof. (`deliverAd` marks WhatsApp `skipped` — no auto-publish.)
5. Clicks on the tracking link flow into the TrackingLink; see them with
   `node scripts/campaign-report.js <id>` or the advertiser's campaign metrics. *(metrics)*

## Gotchas found while testing (2026-06-04)

- WhatsApp removed from `adDeliveryService` auto-publish list → marked `skipped`
  (manual), since channels can't be published to from a linked device.
- `domain` tracking-link format (`/go/host/path`) hits a Vercel **308 trailing-slash**
  redirect when the target path is `/` — the click misses. Use `short` (`/t/hash`)
  for root-path targets. (Edge case; real URLs with a path are fine.)
- Added missing `templates/emails/notificacion-generica.html` (every campaign
  notification fell back to it and errored with ENOENT).
```
