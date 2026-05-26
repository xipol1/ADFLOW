# Patches · 2026-05-26 · Channelad publication flow

Conjunto consolidado de cambios para cerrar el flujo de publicación
end-to-end con soporte de formato rico (media + botones + embeds),
storage R2, IG Broadcast Channels, compliance y notificaciones email.

## Estructura

```
patches/2026-05-26/
├── README.md                              ← este archivo (guía de aplicación)
│
├── new/                                   ← drop-in (no toca nada existente)
│   ├── lib/
│   │   ├── postFormats.js                 ← catálogo per-plataforma + multipliers
│   │   ├── urlBlocklist.js                ← 6 categorías, ~50 dominios
│   │   └── contentFilter.js               ← keywords ES+EN, 6 categorías
│   ├── services/
│   │   └── r2StorageService.js            ← Cloudflare R2, 25MB, 8 MIME
│   ├── routes/
│   │   └── uploads.js                     ← POST /api/uploads/campaign-media
│   └── client/
│       └── src/
│           ├── config/
│           │   └── postFormats.js         ← mirror ESM con iconos lucide
│           └── ui/components/
│               ├── preview/ChannelPreview.jsx
│               └── format/
│                   ├── FormatEditor.jsx   ← FormatSelector + MediaUploader → R2 + InlineButtonsEditor + EmbedEditor + NewsletterFields + PlatformToolbar
│                   └── Step3Visual.jsx    ← FormatStrip + AddOnStrip + PriceRibbon + CharProgress + DeviceFrame + TipPill + ForecastStrip + LiveIndicator
│
├── replace/                               ← reemplazos completos de archivos existentes
│   ├── models/
│   │   └── Campaign.js                    ← + format, media, buttons, embed, reminder24hSent
│   ├── controllers/
│   │   └── canalController.js             ← + broadcastChannelId en actualizarCanal
│   ├── services/
│   │   └── adDeliveryService.js           ← deliverAd pasa campaign entero
│   ├── lib/
│   │   └── campaignCron.js                ← auto-complete 48h + recordatorio 24h + email expiración
│   └── integraciones/
│       ├── telegram.js                    ← publishAd con media/album/botones + sendVideo, sendMediaGroup
│       ├── discord.js                     ← publishAd con embed customizado
│       ├── whatsapp.js                    ← publishAd con header media + cta_url + botones-as-text
│       └── facebook.js                    ← publishPost con /photos, /videos, multi-photo
│
└── edits/                                 ← snippets focalizados para archivos grandes
    ├── 01-lib-platformConnectors-publishAdToChannel.md
    ├── 02-controllers-campaignController-createCampaign.md
    ├── 03-controllers-campaignController-notifications.md
    ├── 04-models-Canal-broadcastChannelId.md
    ├── 05-app-mount-uploads-route.md
    ├── 06-env-example-R2.md
    ├── 07-client-api-uploadCampaignMedia.md
    ├── 08-RegisterChannelPage-broadcastChannelId.md
    └── 09-NewCampaignPage-FormatSelector.md
```

**Falta solo `integraciones/linkedin.js`** — está en `replace/` también.

## Aplicación (3 pasos)

### 1 · Drop-in los archivos nuevos y reemplazos

```bash
cp -r patches/2026-05-26/new/* .
cp -r patches/2026-05-26/replace/* .
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 2 · Aplicar los 9 edits manuales

Cada `edits/NN-*.md` describe el cambio con el bloque exacto a sustituir.
Aplícalos en orden:

| # | Archivo | Qué hace |
|---|---|---|
| 01 | `lib/platformConnectors.js` | Sustituye `publishAdToChannel` por la nueva signature con back-compat |
| 02 | `controllers/campaignController.js` | Sustituye `createCampaign` con payload rico + compliance + multiplier |
| 03 | `controllers/campaignController.js` + `lib/campaignCron.js` | Añade `'email'` en 6+1 sitios de eventos críticos |
| 04 | `models/Canal.js` | Añade `broadcastChannelId` en dos sitios |
| 05 | `app.js` | Registra y monta `/api/uploads` |
| 06 | `.env.example` | Documenta las 5 vars R2 |
| 07 | `client/src/services/api.js` | Añade método `uploadCampaignMedia(file, onProgress)` |
| 08 | `RegisterChannelPage.jsx` | Campo `broadcastChannelId` condicional para Instagram |
| 09 | `NewCampaignPage.jsx` | FormatSelector + MediaUploader + editors en Step 2 |

### 3 · Configurar env vars (opcional pero recomendado)

```bash
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=channelad-media
R2_PUBLIC_URL=https://<account-id>.r2.dev
```

Sin esto, `/api/uploads/campaign-media` devuelve 503. El resto sigue
funcionando para campañas de texto plano.

## Smoke tests post-aplicación

```bash
# 1. Catálogo
node -e "
const pf = require('./lib/postFormats');
console.log('Telegram formats:', pf.getPlatformFormats('telegram').length); // 5
console.log('IG first:', pf.getPlatformFormats('instagram')[0].id);          // broadcast
console.log('Pricing:', pf.applyFormatPricing(28, { platform:'telegram', formatId:'album', addOnIds:['pinned'] })); // 67.20
"

# 2. Blocklist + filter
node -e "
console.log(require('./lib/urlBlocklist').checkUrl('https://bet365.com'));
console.log(require('./lib/contentFilter').checkContent('Apuesta en el casino').allowed); // false
"

# 3. Schema
node -e "
const M = require('./models/Campaign');
const k = Object.keys(M.schema.paths);
['format','media','buttons','embed','reminder24hSent'].forEach(f => console.log(f, k.some(x => x === f || x.startsWith(f + '.'))));
"

# 4. Storage + dispatcher back-compat
node -e "
console.log('R2:', require('./services/r2StorageService').isEnabled());
const { publishAdToChannel } = require('./lib/platformConnectors');
publishAdToChannel({ plataforma:'telegram', identificadorCanal:'@x' }, 'hi', 'https://x.com').catch(e => console.log('legacy ok'));
publishAdToChannel({ plataforma:'telegram', identificadorCanal:'@x' }, { content:'hi', targetUrl:'https://x.com', media:[], buttons:[] }).catch(e => console.log('new ok'));
"

# 5. Endpoint uploads montado
curl -i http://localhost:5000/api/uploads/campaign-media # debe dar 401, no 404
```

## Estado del flujo end-to-end post-aplicación

| Plataforma | Texto | Imagen | Video | Álbum | Botones | Embed |
|---|---|---|---|---|---|---|
| **Telegram** | ✅ | ✅ `sendPhoto` | ✅ `sendVideo` | ✅ `sendMediaGroup` 2-10 | ✅ hasta 4 nativos | n/a |
| **Discord** | ✅ | ✅ `embed.image` | n/a | n/a | n/a | ✅ rico con color |
| **WhatsApp** | ✅ | ✅ `header.image+cta_url` | ✅ `header.video` | ✅ N msgs consecutivos | ✅ 1 nativo + extras texto | n/a |
| **Facebook** | ✅ | ✅ `/photos` | ✅ `/videos` | ✅ multi-photo 2-step | ⚠️ como texto en body | n/a |
| **LinkedIn** | ✅ | ✅ assets API | ✅ assets API | ✅ multi-image carousel | ⚠️ como texto en body | n/a |
| **Instagram** | 🔒 OAuth scope pendiente | — | — | — | — | n/a |
| **Newsletter** | manual | manual | manual | manual | n/a | n/a |

## Lo que queda fuera de scope

- **Instagram Broadcast delivery real** — requiere Meta App Review
  (`instagram_manage_messages`). La declaración manual del broadcast
  channel ID (edits/04 + 08) ya funciona; el delivery automático
  llega cuando Meta apruebe el scope (típicamente 2-8 semanas).
- **Newsletter auto-publish** — los providers (Substack/Mailchimp/Beehiiv)
  permiten lectura de stats pero no envío programático directo. Quedará
  como confirmación manual indefinidamente.
- **Wizard de 6 pasos full-takeover** — el wizard surgical (edit 09)
  conserva los 3 pasos actuales con FormatSelector inyectado. Si quieres
  el wizard 6-step con device frame y preview en vivo, es un ticket
  aparte de UI.
