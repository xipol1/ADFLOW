# Plan: Calculadora con análisis automático desde link + lead capture

**Estado:** Draft v1 · 2026-05-26
**Owner:** —
**Prioridad declarada:** WhatsApp > Telegram > Discord. Captura email + reporte PDF. Sin tocar código hasta aprobar este plan.

---

## 0 · Resumen ejecutivo

La calculadora actual (`ChannelCalculator.jsx`) es un simulador con sliders. Este plan la convierte en **una herramienta de captación**: el usuario pega un link de su canal, el backend analiza datos reales (suscriptores, engagement cuando es accesible) y devuelve una tarifa basada en datos verificados, no en estimaciones. Opcionalmente captura el email a cambio de un reporte PDF más completo.

**Por qué:**
- **Lead magnet**: emails de creadores con canal pre-analizado entrando al funnel.
- **Onboarding 1-click**: si después se registran, el canal ya está pre-validado.
- **Ventaja defensiva**: imitar la calc con sliders es trivial; replicar el análisis real es mucho más caro.
- **SEO/viralidad**: cada análisis puede generar URL única compartible (fase 2 — no en este plan).

**Lo nuevo en negrita:**
- 1 endpoint público `POST /api/calculator/analyze` (rate-limited, anónimo).
- 1 endpoint con email `POST /api/calculator/report` que genera PDF y captura lead.
- 1 modelo `CalculatorAnalysis` para auditoría/cache.
- Extensión de `ChannelCalculator.jsx` con input de URL en cabecera.
- Cuando el link es de WhatsApp Group, el flujo redirige al OAuth existente (`LinkWhatsAppPage`) sin duplicar lógica.

---

## 1 · Capacidad técnica por plataforma

### 1.1 · WhatsApp (PRIORIDAD)

#### a) Canal Newsletter (`whatsapp.com/channel/{slug}`)
- **Datos públicos accesibles vía fetch HTML server-side:**
  - `og:title` → nombre
  - `og:description` → descripción
  - HTML inline → seguidores (cuando es público, no siempre)
  - `og:image` → foto perfil
  - Badge ✓ verificado (parseable)
- **Engagement / posts**: NO accesibles desde la página pública. Para eso → OAuth Baileys (ya implementado en `LinkWhatsAppPage`).
- **Robustez**: WhatsApp cambia HTML cada 6-12 meses → tests + selector tolerante a cambios.

#### b) Grupo (`chat.whatsapp.com/{invite}`)
- **Datos públicos:** solo nombre y descripción. NO miembros (privado por diseño).
- **Plan**: detectar grupo → mensaje claro "Para grupos necesitamos OAuth. Conecta tu WhatsApp" → redirige a `/creator/channels/link-whatsapp` (flujo Baileys existente).
- **Una vez vinculado**: el flujo de `NewsletterPickerStep` + `GroupAuditReport` ya devuelve `apto/no-apto` con miembros reales. Ese output alimenta la calc.

#### c) Detección automática del subtipo
Regex sobre la URL pegada:
```
^https?://(www\.)?whatsapp\.com/channel/[A-Za-z0-9_-]+/?$   → channel
^https?://chat\.whatsapp\.com/[A-Za-z0-9_-]+/?$              → group
```

### 1.2 · Telegram (`t.me/{username}` o `t.me/+{invite}`)

#### a) Canal/grupo público (`t.me/{username}`)
- **Fetch HTML público**: la página `https://t.me/{username}` expone:
  - Nombre del canal
  - Descripción
  - Suscriptores (literal, no estimado)
  - Última foto / video del canal (preview)
  - Idioma (heurística)
- **Reuso**: el repo ya tiene `services/tgstatScraperService.js` y `services/telegramIntelService.js`. Para este caso no necesitamos TGStat API (más caro), basta el HTML público.
- **Para engagement (ER%, views/post)**: opcional fase 2, usar TGStat API (cuenta del proyecto ya activa, ID 15357946 en memory).

#### b) Invitaciones privadas (`t.me/+xxx`)
- HTML mínimo, solo nombre. No exponemos análisis fiable.
- **Plan**: mostrar "Este es un link privado de invitación. Pega la URL pública del canal o conéctalo con login".

### 1.3 · Discord (`discord.gg/{code}` o `discord.com/invite/{code}`)
- **Endpoint público oficial**: `GET https://discord.com/api/v10/invites/{code}?with_counts=true&with_expiration=true`
- **Respuesta JSON sin auth**:
  - `guild.name`, `guild.description`, `guild.icon`, `guild.banner`
  - `approximate_member_count` ← este es el campo crítico
  - `approximate_presence_count` (online aprox)
  - `guild.verification_level`, `guild.premium_tier`, `guild.features[]`
- **Fragilidad**: Discord recortó este endpoint en 2022 una vez. Hay que tolerar 401/404 y caer al modo manual.

### 1.4 · Newsletter (Substack, Beehiiv, ConvertKit, etc.)

- **Substack** (`*.substack.com`): el repo ya tiene `services/newsletter/newsletterDiscoveryService.js`. Reusar ese para detección + scraping de página pública. Cuando el autor lo expone públicamente, sale el contador de suscriptores.
- **Beehiiv** (`*.beehiiv.com`): scraping similar, datos públicos limitados.
- **Plan**: detectar dominio → reusar `newsletterDiscoveryService`. Si no hay subs públicos → calc manual con disclaimer.

---

## 2 · Arquitectura técnica

### 2.1 · Flujo end-to-end

```
┌──────────────────────────────────────────────────────────────────────┐
│ FRONTEND (ChannelCalculator.jsx)                                      │
│                                                                       │
│  ┌────────────────────────────────────────────┐                       │
│  │ [    Pega aquí el link de tu canal     ] 🔍│ ← NUEVO bloque arriba │
│  │                  Analizar                   │                       │
│  └────────────────────────────────────────────┘                       │
│                          │                                            │
│                          ▼ POST /api/calculator/analyze { link }      │
│                                                                       │
│  ┌────────────────────────────────────────────┐                       │
│  │ Detectado: Telegram · @canal · 8.420 subs │ ← Badge de datos      │
│  │ Última actividad: hace 2h                  │   verificados         │
│  └────────────────────────────────────────────┘                       │
│                          │                                            │
│                          ▼ Pre-rellena los inputs                     │
│                                                                       │
│  [calc existente con sliders/pills pre-rellenados con datos reales]   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ ¿Quieres el análisis completo en PDF?                        │    │
│  │ [   email@dominio.com   ]  [ ☐ Acepto política ]             │    │
│  │ [ Enviar reporte ]                                            │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                          │                                            │
│                          ▼ POST /api/calculator/report                │
│                            { analysisId, email, consent: true }       │
└──────────────────────────────────────────────────────────────────────┘

                          ▼

┌──────────────────────────────────────────────────────────────────────┐
│ BACKEND                                                               │
│                                                                       │
│  POST /api/calculator/analyze                                         │
│   ├─ Rate limit: 6/min por IP, 30/día por IP                          │
│   ├─ Detecta plataforma (regex)                                       │
│   ├─ Cache lookup (Redis o Mongo, TTL 24h)                            │
│   ├─ Si no cache → analizador específico por plataforma:              │
│   │     telegramAnalyzer.js   (HTML público)                          │
│   │     whatsappChannelAnalyzer.js (HTML público)                     │
│   │     whatsappGroupAnalyzer.js   (devuelve "redirect-oauth")        │
│   │     discordAnalyzer.js   (API /invites)                           │
│   │     newsletterAnalyzer.js (reusa newsletterDiscoveryService)      │
│   ├─ Calcula tarifa con computeChannelPricing() del frontend lib      │
│   │   (movido a /shared para reuso back+front)                        │
│   ├─ Guarda CalculatorAnalysis (audit + cache)                        │
│   └─ Devuelve { analysisId, platform, subs, name, pricing[6] }        │
│                                                                       │
│  POST /api/calculator/report                                          │
│   ├─ Valida email (regex + MX check opcional)                         │
│   ├─ Verifica consent: true (legal)                                   │
│   ├─ Crea/actualiza CalculatorLead (email + analysisId + UTM)         │
│   ├─ Genera PDF con datos completos (usar Puppeteer o pdfkit)         │
│   ├─ Encola email vía emailService (queue para no bloquear)           │
│   └─ Devuelve { ok: true, leadId }                                    │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.2 · Archivos nuevos

```
shared/
└── channelPricing.js                       (MOVIDO desde client/src/ui/lib/
                                              para compartir backend + frontend)

services/
└── calculatorAnalyzer/
    ├── index.js                            (router por plataforma)
    ├── telegramAnalyzer.js                 (~150 líneas, scraping HTML)
    ├── whatsappChannelAnalyzer.js          (~150 líneas, scraping HTML)
    ├── whatsappGroupAnalyzer.js            (~50 líneas, redirige a OAuth)
    ├── discordAnalyzer.js                  (~80 líneas, fetch API invite)
    ├── newsletterAnalyzer.js               (~100 líneas, reusa newsletterDiscoveryService)
    └── platformDetector.js                 (~40 líneas, regex sobre URL)

services/
└── calculatorReportService.js              (PDF generation + email queue)

models/
├── CalculatorAnalysis.js                   (audit trail + cache)
└── CalculatorLead.js                       (email + canal capturado)

routes/
└── calculator.js                           (POST /analyze, POST /report)

middleware/
└── calculatorRateLimit.js                  (express-rate-limit con dos buckets)

client/src/ui/components/calculator/
├── ChannelCalculator.jsx                   (EXTENDIDO, no reescrito)
├── UrlInputCard.jsx                        (componente nuevo del input + análisis)
├── AnalysisBadge.jsx                       (componente nuevo: "8.420 subs · verificado")
└── ReportRequestCard.jsx                   (componente nuevo: captura email)

client/src/ui/lib/
└── channelPricing.js                       (RE-EXPORTA desde shared/)
```

### 2.3 · Mover `channelPricing.js` a `shared/`

La función `computeChannelPricing()` ya existe en `client/src/ui/lib/channelPricing.js`. Para evitar duplicarla en backend, la movemos a `/shared/channelPricing.js` y dejamos en el path antiguo un re-export. Funciones puras → 100% reutilizables.

---

## 3 · Schemas de datos

### 3.1 · `CalculatorAnalysis` (Mongo)

```js
{
  _id: ObjectId,

  // Input del usuario (normalizado)
  inputUrl:     String,    // URL exacta que pegó
  platform:     String,    // 'telegram' | 'whatsapp_channel' | 'whatsapp_group' | 'discord' | 'newsletter'
  externalId:   String,    // username, invite code, channel slug — para dedup
  fingerprint:  String,    // sha256(externalId + platform) — para lookup cache

  // Output del análisis
  status:       String,    // 'ok' | 'partial' | 'redirect_oauth' | 'failed'
  data: {
    name:           String,
    description:    String,
    subscribers:    Number,
    verified:       Boolean,
    lastActivity:   Date,
    profileImage:   String,
    raw:            Mixed,    // payload completo crudo de la fuente
  },

  // Lo que devolvemos al frontend (snapshot)
  pricing: {
    effectiveCpm:     Number,
    reachPerPost:     Number,
    monthlyEarnings:  Number,
    pricePerFormat:   [{ id, label, price }],
  },

  // Metadata
  scrapedFrom:   String,    // 'html_public', 'discord_api', 'tgstat', 'baileys'
  durationMs:    Number,
  errorMessage:  String,
  ipHash:        String,    // sha256(ip + salt) — anti-spam, no PII directo
  userAgent:     String,

  createdAt:     Date,
  expiresAt:     Date,      // TTL index: cache 24h
}
```

**Índices:**
- `{ fingerprint: 1, expiresAt: 1 }` → lookup cache
- `{ ipHash: 1, createdAt: -1 }` → rate-limit acumulado / fraud detection
- TTL en `expiresAt`

### 3.2 · `CalculatorLead` (Mongo)

```js
{
  _id: ObjectId,
  email:          String,    // único + lowercase
  emailVerified:  Boolean,   // true tras double opt-in (fase 2 opcional)
  analyses:       [ObjectId], // referencias a CalculatorAnalysis
  primaryAnalysis: ObjectId,  // la última que pidió reporte

  // Channelad funnel
  registered:     Boolean,   // true si después creó cuenta
  userId:         ObjectId,  // ref a Usuario si se convirtió

  // Tracking
  utmSource:      String,
  utmMedium:      String,
  utmCampaign:    String,
  referrer:       String,
  ipHash:         String,
  userAgent:      String,
  locale:         String,

  // GDPR
  consentAt:      Date,      // timestamp del checkbox
  consentText:    String,    // copy literal del checkbox al momento
  unsubscribedAt: Date,      // null hasta que pida baja

  // Reporte
  reportSentAt:   Date,
  reportPdfUrl:   String,    // S3/local

  createdAt:      Date,
  updatedAt:      Date,
}
```

**Índices:**
- `{ email: 1 }` único
- `{ registered: 1, createdAt: -1 }`

---

## 4 · Endpoints backend

### 4.1 · `POST /api/calculator/analyze`

**Auth:** ninguna (público).
**Rate limit:**
- 6 análisis / minuto / IP
- 30 análisis / día / IP
- Si supera: `429 Too Many Requests` con `Retry-After` header.

**Request:**
```json
{ "link": "https://t.me/cryptoespana" }
```

**Validación:**
- `link` requerido, ≤ 500 chars
- Debe parsear como URL válida
- Plataforma detectable (si no → 400)

**Response 200 — caso feliz:**
```json
{
  "ok": true,
  "analysisId": "664f1a...",
  "platform": "telegram",
  "data": {
    "name": "Crypto España",
    "description": "Noticias y análisis crypto para hispanohablantes",
    "subscribers": 8420,
    "verified": false,
    "lastActivity": "2026-05-26T08:31:00Z",
    "profileImage": "https://..."
  },
  "pricing": {
    "effectiveCpm": 16.8,
    "reachPerPost": 5052,
    "monthlyEarnings": 339,
    "pricePerFormat": [
      { "id": "standard", "label": "Post estándar",   "price": 85 },
      { "id": "pin24",    "label": "Fijado 24h",       "price": 170 },
      { "id": "pin48",    "label": "Fijado 48h",       "price": 254 },
      { "id": "organic",  "label": "Mención orgánica", "price": 127 },
      { "id": "pack5",    "label": "Paquete 5 posts",  "price": 359 },
      { "id": "pack10",   "label": "Paquete 10 posts", "price": 636 }
    ]
  },
  "source": "html_public",
  "cached": false
}
```

**Response 200 — redirección OAuth (WhatsApp Group):**
```json
{
  "ok": true,
  "platform": "whatsapp_group",
  "needsOAuth": true,
  "redirectUrl": "/creator/channels/link-whatsapp",
  "message": "Los grupos de WhatsApp requieren autenticación. Vincula tu WhatsApp y te analizaremos todos tus grupos."
}
```

**Response 200 — análisis parcial:**
```json
{
  "ok": true,
  "platform": "whatsapp_channel",
  "partial": true,
  "data": { "name": "...", "description": "...", "subscribers": null },
  "fallback": "manual",
  "message": "No hemos podido leer los suscriptores. Introdúcelos manualmente abajo."
}
```

**Errores:**
- `400 Bad Request` — link inválido o plataforma no soportada
- `404 Not Found` — el link es válido pero el canal no existe / es privado
- `429 Too Many Requests`
- `502 Bad Gateway` — fuente externa caída (Discord API, etc.)
- `500 Internal Server Error` — fallo inesperado

### 4.2 · `POST /api/calculator/report`

**Auth:** ninguna.
**Rate limit:** 3/min/IP, 10/día/IP.

**Request:**
```json
{
  "analysisId": "664f1a...",
  "email": "creador@gmail.com",
  "consent": true,
  "utm": { "source": "blog", "medium": "calculator", "campaign": "..." }
}
```

**Validación:**
- `analysisId` debe existir y no estar expirado
- `email` regex + MX lookup opcional
- `consent === true` obligatorio (GDPR)

**Response 200:**
```json
{
  "ok": true,
  "leadId": "664f2c...",
  "message": "Reporte enviado a creador@gmail.com (revisa spam si no lo ves en 5 minutos)."
}
```

**Errores:**
- `400 Bad Request` — email inválido, consent no aceptado, analysisId no encontrado/expirado
- `429 Too Many Requests`

---

## 5 · Análisis específico por plataforma

### 5.1 · `telegramAnalyzer.js`

```js
// Pseudo-código
async function analyze(url) {
  const username = url.match(/t\.me\/([A-Za-z0-9_]+)/)?.[1];
  if (!username) throw new Error('invalid_telegram_url');

  const html = await fetchWithUA(`https://t.me/${username}`);

  // Si "If you have Telegram, you can view..." → canal privado
  if (html.includes('tgme_page_extra')) return parsePrivate(html);

  return {
    name:        extract(html, 'meta[property="og:title"]'),
    description: extract(html, 'meta[property="og:description"]'),
    subscribers: parseInt(extract(html, '.tgme_page_extra').match(/[\d\s]+/)[0].replace(/\s/g, '')),
    profileImage:extract(html, 'meta[property="og:image"]'),
    verified:    html.includes('verified_icon'),
    lastActivity: null, // no expuesto en HTML público
  };
}
```

**User-Agent**: usar UA realista de navegador. Telegram detecta y rechaza UAs vacíos.

**Cache**: 24h por username.

**Tests** (`__tests__/telegramAnalyzer.test.js`):
- Canal público con N subs → parsea ok
- Canal privado → returns `partial`
- Username inexistente → 404
- HTML cambia (mock con HTML legacy) → degradación graciosa

### 5.2 · `whatsappChannelAnalyzer.js`

```js
async function analyze(url) {
  const slug = url.match(/whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/)?.[1];
  if (!slug) throw new Error('invalid_whatsapp_channel_url');

  const html = await fetchWithUA(`https://whatsapp.com/channel/${slug}`);

  // Selectores frágiles → tests defensivos
  return {
    name:        extract(html, 'meta[property="og:title"]'),
    description: extract(html, 'meta[property="og:description"]'),
    subscribers: parseSubscribers(html),    // regex sobre "N followers" / "N seguidores"
    profileImage:extract(html, 'meta[property="og:image"]'),
    verified:    html.includes('verified-badge'),
    lastActivity: null,
  };
}

function parseSubscribers(html) {
  const en = html.match(/(\d[\d,.\s]*)\s+followers/i);
  const es = html.match(/(\d[\d,.\s]*)\s+seguidores/i);
  const raw = (en || es)?.[1];
  return raw ? parseInt(raw.replace(/[,.\s]/g, '')) : null;
}
```

**Riesgo crítico**: WhatsApp tiene anti-scraping. Pruebas iniciales obligatorias antes de comprometerse a esta ruta. Si bloquean, plan B = pedir al usuario que se conecte con OAuth Baileys.

### 5.3 · `whatsappGroupAnalyzer.js`

Sin lógica de scraping. Solo:
```js
async function analyze(url) {
  return {
    needsOAuth: true,
    redirectUrl: '/creator/channels/link-whatsapp',
    message: 'Los grupos de WhatsApp son privados por diseño. Vincula tu cuenta con OAuth para analizar todos tus grupos en 30 segundos.',
  };
}
```

El flujo OAuth ya existe en `LinkWhatsAppPage` con `NewsletterPickerStep` + `GroupAuditReport`. Una vez completado, podemos enganchar un callback que vuelva a la calc con los datos.

### 5.4 · `discordAnalyzer.js`

```js
async function analyze(url) {
  const code = url.match(/(?:discord\.gg|discord\.com\/invite)\/([A-Za-z0-9_-]+)/)?.[1];
  if (!code) throw new Error('invalid_discord_url');

  const res = await fetch(`https://discord.com/api/v10/invites/${code}?with_counts=true`);
  if (res.status === 404) throw new Error('discord_invite_invalid_or_expired');
  if (!res.ok) throw new Error('discord_api_error');
  const data = await res.json();

  return {
    name:        data.guild.name,
    description: data.guild.description,
    subscribers: data.approximate_member_count,
    onlineCount: data.approximate_presence_count,
    profileImage:`https://cdn.discordapp.com/icons/${data.guild.id}/${data.guild.icon}.png`,
    verified:    data.guild.features?.includes('VERIFIED') || false,
    lastActivity:null,
  };
}
```

**Cache**: 1h (Discord cambia frecuentemente). Discord no requiere rate-limit por nuestra parte mientras estemos por debajo de 50 req/seg globalmente.

### 5.5 · `newsletterAnalyzer.js`

Reusa `services/newsletter/newsletterDiscoveryService.js`. Si ya tiene función `analyzeUrl(url)` o similar, llamarla. Si no, escribir un wrapper que detecte el host (Substack, Beehiiv, ConvertKit) y parsee el HTML.

---

## 6 · UI flow frontend

### 6.1 · Mockup textual de la calculadora ampliada

```
┌──────────────────────────────────────────────────────────────────────┐
│ Calculadora de tarifa                                                │
│ ¿Cuánto puede ganar tu canal este mes?                               │
│                                                                       │
│ ┌────────────────────────────────────────────────────────────────┐   │
│ │  🔗  https://t.me/cryptoespana                       [Analizar]│   │
│ └────────────────────────────────────────────────────────────────┘   │
│  Pega tu link y te damos la tarifa basada en datos reales            │
│                                                                       │
│ ─── O introduce manualmente ───                                      │
└──────────────────────────────────────────────────────────────────────┘

     │  (tras analizar)
     ▼

┌──────────────────────────────────────────────────────────────────────┐
│ ✅ Canal verificado · Telegram · @cryptoespana                       │
│ 8.420 suscriptores · Última actividad: hace 2h                       │
│                                                          [Cambiar]    │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐  ┌───────────────────────────────────────┐
│ Suscriptores: 8.420  ✓  │  │ Precio · Post estándar                │
│ Reacciones: 320      ✓  │  │ 142 €                                 │
│ Posts / mes: 4          │  │ Anunciante paga 170€ (+20% comisión)  │
│ Plataforma: Telegram ✓  │  └───────────────────────────────────────┘
│ Nicho: Cripto           │
│ Formato: Post estándar  │  ┌──────────────────┐ ┌─────────────────┐
└─────────────────────────┘  │ Ingreso mensual  │ │ CPM efectivo    │
                              │ 568 €            │ │ 17,4 €          │
                              │ Anual: 6.812 €   │ │ Alcance ~5.052  │
                              └──────────────────┘ └─────────────────┘

                              [tabla con los 6 formatos · igual que ahora]

┌──────────────────────────────────────────────────────────────────────┐
│ 📧 Recibe el análisis completo en PDF                                │
│                                                                       │
│ • Tarifas detalladas por formato                                     │
│ • Benchmark de tu nicho (percentil donde está tu canal)              │
│ • Checklist media-kit ready (0-100)                                  │
│ • Estrategia de crecimiento personalizada                            │
│                                                                       │
│ [  tu@email.com  ]  ☐ Acepto recibir comunicaciones (política)       │
│ [ Enviar reporte ]                                                   │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.2 · Estados visuales del input URL

1. **Vacío**: input placeholder "Pega tu link de Telegram, WhatsApp o Discord".
2. **Cargando**: spinner sobre el botón "Analizando…". Inputs manuales se atenúan.
3. **OK**: badge verde "Canal verificado · X subs". Inputs auto-completados.
4. **Parcial**: badge ámbar "Datos parciales — completa lo que falte abajo".
5. **OAuth needed** (WhatsApp group): banner "Para grupos de WhatsApp, vincula tu cuenta → [Vincular →]".
6. **Error**: banner rojo con mensaje + "Sigue manualmente abajo →".

### 6.3 · Captura email (después del análisis)

- No es bloqueante. Si el usuario no deja email, ya vio la tarifa.
- El bloque del email aparece **debajo** del análisis y de los outputs visibles.
- Checkbox de consentimiento explícito (texto literal guardado en `CalculatorLead.consentText`).
- Tras enviar: el bloque se reemplaza por un mensaje "✓ Te lo hemos enviado a creador@gmail.com (revisa spam)".

---

## 7 · GDPR / Legal

### 7.1 · Captura del email
- Doble opt-in **opcional fase 1**, **obligatorio fase 2** según volumen y abogado.
- Texto del checkbox literal (ejemplo, requiere revisión legal):
  > "Acepto recibir el análisis de mi canal por email y comunicaciones puntuales sobre Channelad. Puedo darme de baja en cualquier momento. He leído la política de privacidad."
- El texto exacto se guarda en `CalculatorLead.consentText` para auditoría.

### 7.2 · Política de privacidad
- Añadir sección "Análisis de canal" en `/privacidad`:
  - Qué datos recogemos: URL del canal, email, IP hasheada, UA, UTM.
  - Para qué: enviar el reporte solicitado + marketing relacionado con Channelad.
  - Base legal: consentimiento (Art. 6.1.a GDPR).
  - Cuánto retenemos: 24 meses desde la última interacción, salvo baja.
  - Cómo darse de baja: footer del email + endpoint `/api/calculator/unsubscribe?token=...`.
- Mismo enlace desde el checkbox.

### 7.3 · Datos del canal analizado
- Los datos públicos (nombre, subs, etc.) no son PII del creador necesariamente — pero la URL podría serlo. Mantener `CalculatorAnalysis.ipHash` (no IP cruda), TTL 24h en cache, y borrar `inputUrl` después de N días si no hay lead asociado.

### 7.4 · Unsubscribe
- Endpoint `GET /api/calculator/unsubscribe?token={hmac}`.
- Token firmado con `JWT_SECRET` para evitar enumeración.
- Marca `CalculatorLead.unsubscribedAt`.
- Mostrar pantalla "Te hemos dado de baja. Puedes volver a suscribirte en cualquier momento desde la calculadora".

---

## 8 · Reporte por email (PDF)

### 8.1 · Contenido

Página 1: portada
- Logo Channelad
- "Análisis de tu canal"
- Nombre del canal + plataforma + suscriptores
- Fecha del análisis

Página 2: tarifas
- Tabla con los 6 formatos + precios
- CPM efectivo · Alcance estimado · Ingreso mensual / anual
- Disclaimer "Estimación basada en …"

Página 3: benchmark
- "Tu canal está en el percentil X de su nicho (Cripto, 5-10K subs)"
- Mini-gráfico comparativo (top quartile / median / tu canal)
- Datos: agregado de los +2.500 canales del proyecto

Página 4: media-kit checklist
- Items binarios: foto perfil ✓, descripción ≥ 50 chars ✓, último post ≤ 7 días, etc.
- Score 0-100
- Top 3 acciones concretas para mejorar

Página 5: CTA
- "Cuando estés listo, registra tu canal en Channelad"
- URL con UTM precargados + analysisId para pre-rellenar el flujo de alta

### 8.2 · Generación

- Opción A: **Puppeteer** (Chrome headless). Pros: HTML + CSS exacto. Contras: pesado, requiere ~250MB de runtime en Fly.io.
- Opción B: **pdfkit / @react-pdf/renderer**. Pros: liviano. Contras: layout más manual.
- **Recomendación**: `@react-pdf/renderer` — vive en `services/calculatorReportService.js`, comparte componentes con la web, ligero.

### 8.3 · Envío

- Cola asíncrona (no bloquear el endpoint). Usar el `emailService.js` existente con un job.
- Adjuntar el PDF + link de descarga S3/local (por si Gmail bloquea attachments).
- Subject: "Tu análisis: {nombre del canal} — Channelad"
- Body: HTML con preview de la tarifa principal + botón "Descargar PDF" + CTA "Registra tu canal".

---

## 9 · Edge cases y errores

| Caso | Comportamiento esperado |
|---|---|
| Link de YouTube / Instagram / TikTok (no soportadas) | 400 + mensaje "De momento solo analizamos Telegram, WhatsApp y Discord. Avísanos si quieres otra plataforma →" |
| Canal Telegram privado (`t.me/+invite`) | `partial` + fallback manual |
| Canal Telegram inexistente | 404 con mensaje claro |
| WhatsApp channel HTML cambia | Selectores caen → degradación graciosa a manual. Test diario en CI con HTMLs reales. |
| Discord invite expirado | 404 con mensaje "Este invite ha expirado. Pide al admin uno permanente." |
| Discord guild que prohibió scraping | Caer a manual. |
| Usuario pega link con tracking (`?fbclid=...`) | Normalizar la URL antes de analizar. |
| Mismo IP intenta 100 análisis distintos | Rate limit lo bloquea a partir del 30 diario. |
| Email desechable (mailinator, etc.) | Aceptar pero marcarlo en `CalculatorLead.emailQuality = 'disposable'`. No bloquear (mata conversión). |
| Email con typo (`gmial.com`) | Sugerencia frontend antes de enviar ("¿Quisiste decir gmail.com?"). |
| Caída de Mongo durante el análisis | El análisis se realiza igual y se devuelve al usuario, sin persistir. Log de error. |
| Sin Mongo: cache no funciona | El sistema sigue funcionando, solo cada análisis es siempre fresh. |
| TGStat / Discord API caídas | Devolver `503` con `Retry-After`. Frontend muestra "Servicio temporalmente no disponible, sigue manualmente". |

---

## 10 · Plan de tests

### 10.1 · Tests unitarios

| Archivo | Cobertura |
|---|---|
| `platformDetector.test.js` | 20+ URLs reales + edge cases (tracking params, subdominios) |
| `telegramAnalyzer.test.js` | HTML mock canal público, privado, vacío, con error |
| `whatsappChannelAnalyzer.test.js` | HTML mock con N seguidores en EN/ES, sin subs, con badge ✓ |
| `discordAnalyzer.test.js` | Mock fetch a /invites con respuestas válidas/expiradas/4xx |
| `newsletterAnalyzer.test.js` | Substack mock + Beehiiv mock + dominio desconocido |
| `channelPricing.test.js` | Casos numéricos: 10K Tg finanzas → 75 EUR. Edge: 0 subs, 0 reactions, etc. |

### 10.2 · Tests de integración

| Test | Qué prueba |
|---|---|
| `POST /api/calculator/analyze` con link real de Telegram en CI | Devuelve subs reales (cifra > 0) |
| `POST /api/calculator/analyze` con Discord invite real | Devuelve `approximate_member_count` |
| `POST /api/calculator/report` con email válido | Crea CalculatorLead + emailService llamado |
| Rate limit | 7ª llamada en 1 min devuelve 429 |
| Cache | 2ª llamada al mismo link en < 24h sirve desde Mongo, no del scraper |

### 10.3 · Tests end-to-end (Playwright o Cypress, opcional fase 2)

- Usuario pega link → calc se rellena → pide PDF → recibe el email (Mailhog en CI).

### 10.4 · Tests de regresión externos (diario)

- Cron diario corre el analyzer contra 3-5 URLs reales conocidas. Si falla → alerta a Slack/Sentry. Detecta cambios en el HTML de WhatsApp/Telegram antes de que un usuario lo reporte.

---

## 11 · Esfuerzo estimado

| Fase | Contenido | Días dev (estimación) |
|---|---|---|
| **0 · Preparación** | Move `channelPricing.js` a `/shared`, schemas Mongo, route skeleton | 0,5 |
| **1 · Telegram + Discord** | Analyzers + tests + endpoint analyze (sin email) | 2 |
| **2 · WhatsApp Channel** | Scraping HTML + tests + handling de cambios | 1,5 |
| **3 · WhatsApp Group** | Detect + redirect a OAuth + callback que devuelve datos a la calc | 1 |
| **4 · Newsletter** | Wrapper sobre newsletterDiscoveryService | 0,5 |
| **5 · Frontend UrlInputCard + AnalysisBadge** | UI nueva en `ChannelCalculator.jsx` | 1 |
| **6 · Captura email + PDF + report endpoint** | Modelo CalculatorLead, ReportRequestCard, PDF con react-pdf, queue email | 2 |
| **7 · GDPR (privacidad + unsubscribe)** | Actualizar `/privacidad`, endpoint unsubscribe, copy del checkbox | 0,5 |
| **8 · Tests + monitoring + cron diario** | Tests unitarios + integración, cron de regresión externa | 1 |
| **TOTAL** | | **10 días-dev** |

**Reparto sugerido en 2 sprints:**

- **Sprint 1 (1 semana)**: Fases 0 + 1 + 2 + 5 — análisis Tg/Discord/WhatsApp Channel + UI básico. **Ya hay valor entregable** sin email.
- **Sprint 2 (1 semana)**: Fases 3 + 4 + 6 + 7 + 8 — WhatsApp Group OAuth, newsletter, email + PDF, GDPR, tests/monitoring.

---

## 12 · Métricas de éxito (KPIs)

A medir 30 días post-launch:

| KPI | Valor objetivo |
|---|---|
| % visitantes calc que pegan un link (vs sliders only) | ≥ 25% |
| % análisis con éxito (no 4xx/5xx por nuestra causa) | ≥ 90% |
| % análisis exitosos que dejan email | ≥ 15% |
| Open rate del email del reporte | ≥ 40% |
| Conversión email → registro Channelad | ≥ 8% |
| Coste por lead (excluyendo dev) | < 0,50 € (servidor + email + S3) |

---

## 13 · Riesgos abiertos · decisiones pendientes

| Riesgo / decisión | Quién decide | Mitigación si va mal |
|---|---|---|
| WhatsApp Channel scraping bloqueado | Probar antes de comprometerse a la fase 2 | Fallback solo manual con disclaimer |
| Discord cierra `/invites?with_counts` | — | Manual + sugerir OAuth Discord |
| Volumen de análisis dispara costes scraping/fly.io | Monitorear logs primer mes | Aumentar cache TTL, agresivizar rate limit |
| Conversión email → registro < 5% | Producto | Reescribir copy del PDF + CTA |
| GDPR: doble opt-in obligatorio en España | Legal | Implementar fase 2, con tu abogado |
| Calidad de leads pobre (mucho gmail.com sin registro) | Producto | Cualificar por tamaño del canal (rechazar < 500 subs en el email) |

---

## 14 · Próximos pasos (acción inmediata si apruebas)

1. **Validación técnica (1 día)**: probar manualmente los 4 analyzers con 10 URLs reales cada uno. Si WhatsApp Channel HTML no se deja scrapear → renegociar plan.
2. **Setup (0,5 días)**: crear branches, modelos Mongo, route skeleton, mover `channelPricing.js`.
3. **Sprint 1 (5 días)**: Tg + Discord + WhatsApp Channel + UI.
4. **Demo intermedia**: si todo va, deploy a una rama preview en Fly.io y revisamos juntos.
5. **Sprint 2 (5 días)**: WhatsApp Group OAuth + Newsletter + Email + PDF + GDPR + tests.
6. **Deploy producción**: PR a `main`, deploy Fly.io.

---

## 15 · Cosas que NO entran en este plan

(Para hacer en otros sprints, sin dependencias con este)
- Compartir resultado con URL única + imagen OG.
- Score "media-kit ready" como sección visible (sí está en el PDF, no en la web).
- Benchmark percentil visual interactivo en la web.
- Multi-canal / media kit consolidado.
- Toggle anunciante (unificar ROICalculator).
- Recomendación de formato óptimo.

Estos quedan como **Sprint 3+** una vez validemos que la captación funciona.

---

_Fin del plan v1 — revisar y ajustar antes de commit._
