# Cocina Lista — Amazon affiliate bridge page

Short impulse **bridge page** (6 sections, one repeated amber CTA) for hot traffic
from WhatsApp/Telegram channels. Captures the channel's UTM params, fires an
`outbound_click` beacon to the ChannelAd API, and redirects to Amazon with your
affiliate tag + `ascsubtag` — **no hardcoded price**, with affiliate disclosure.

Neutral store brand, intentionally **separate from ChannelAd** (own palette).

## Stack
React + Vite + TypeScript + Tailwind. Static SPA, deploy on Vercel.

## Run locally
```bash
cd landings/cocina-lista
npm install
npm run dev        # http://localhost:5173
```

Point the beacon at a local ChannelAd API during QA without editing config:
```bash
# .env.local
VITE_API_BASE_URL=http://localhost:3000
```

## Change product (the whole point: one build → N products)
Edit **only** `src/config/product.ts`:
- `amazon.url` + `amazon.tag` (your Associates tag, e.g. `cocinalista-21`)
- `store` identity, `hero`, `benefits`, `social`, `faq`, copy
- `trust.rating` / `trust.reviews` (display only — **never a price**)
- `hero.image`, `demo.poster`, `demo.videoSrc` (swap the placeholder SVGs in
  `public/assets/` for real `.webp` / video)
- `tracking.apiBaseUrl` + `tracking.productKey`

## Tracking
Every CTA routes through `src/components/CTAButton.tsx` → `src/lib/track.ts`:
1. `fireOutboundClick()` sends `{ utm_source, utm_medium, utm_campaign, utm_content, cta_location, store, product, ts }`
   to `POST {apiBaseUrl}/api/track/outbound-click` via `navigator.sendBeacon`
   (text/plain → no CORS preflight; survives same-tab unload).
2. `buildAmazonUrl()` appends `tag` + `ascsubtag=chad-<utm_source>-<cta>`.
3. Opens Amazon (new tab on desktop, same tab on mobile).

UTM params are captured + persisted to `localStorage` by `src/hooks/useUTM.ts`.

Backend endpoint lives in the main repo:
`routes/affiliateTrack.js` · `controllers/affiliateClickController.js` ·
`models/AffiliateClick.js` — mounted before the global CORS so this page's
domain needs no allowlist entry.

## Deploy (Vercel)
Create a **new Vercel project** with **Root Directory = `landings/cocina-lista`**.
Framework preset: Vite. Build `npm run build`, output `dist`. Add your own
domain (do **not** reuse a ChannelAd domain — neutral brand).

## Before launch — checklist
- [ ] Real `amazon.url` + `amazon.tag` in `product.ts`
- [ ] Real product photo (`.webp`) and demo video/comparison
- [ ] Legal pages wired at `/legal/*` (footer + cookie banner links)
- [ ] Confirm cookie policy treats the first-party `outbound_click` beacon as
      essential measurement (no PII) per your final legal review
