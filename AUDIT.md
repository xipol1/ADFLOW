# ChannelAd — Auditoría técnica (Fase 1)

> Fecha original: 2026-04-27 · Rama: `main`.
> Alcance: solo lectura en Fase 1. Las Fases 2 y 3 aplicaron las acciones que se listan abajo.

## Estado de remediación (2026-04-27)

Todos los críticos y la mayoría de los altos están cerrados. La tabla cruza cada hallazgo con el commit que lo resuelve.

| ID | Severidad | Estado | Commit |
|----|-----------|--------|--------|
| C-1 | Crítico  | ✅ Resuelto | `6944e9f` fix(stripe): reject webhook events when STRIPE_WEBHOOK_SECRET is missing |
| C-2 | Crítico  | ✅ Resuelto | `d227efd` fix(security): verify WhatsApp webhook HMAC against the raw request body |
| C-3 | Crítico  | ✅ Documentado | `30279a5` docs: add SECURITY.md with rotation procedures per secret · acción manual: rotar secretos |
| C-4 | Crítico  | ✅ Resuelto | `a238298` fix(commissions): drop hardcoded 10% fallback in completeCampaign |
| A-1 | Alto     | ✅ Resuelto | `f0b9597` fix(stripe): add idempotencyKey to every Stripe API mutation |
| A-2 | Alto     | ✅ Resuelto | `539e8e7` fix(cors): replace permissive CORS with shared allowlist |
| A-3 | Alto     | ✅ Resuelto | `e2feb5e` refactor(commissions): centralize referral tiers and rate |
| A-4 | Alto     | ✅ Resuelto | `e138713` fix(admin): correct dead enum/field in dashboard revenue aggregations |
| A-5 | Alto     | ✅ Resuelto | `a238298` (mismo commit que C-4) |
| A-6 | Alto     | ✅ Resuelto | `d900558` fix(chat): replace in-memory chat rate limit with mongo-backed limiter |
| A-7 | Alto     | ✅ Resuelto | `22b16eb` chore(deps): drop unused/deprecated dependencies |
| A-8 | Alto     | ✅ Resuelto | `5ac01be` fix(security): anchor sensitive-path filter at segment boundaries |
| A-9 | Alto     | ✅ Resuelto | `daa984d` feat(payouts): persist creator payout attempts + `db3e5c1` admin endpoints |
| A-10 | Alto    | ✅ Resuelto | `d7fcc0e` fix(tracking): move click dedup from capped array to TrackingFingerprint · requiere ejecutar `node scripts/migrate-tracking-fingerprints.js --execute --prune` en prod tras el deploy |
| A-11 | Alto    | ✅ Resuelto | `9cb5f0b` refactor(logging): use winston for auth error paths |
| M-1..M-14 | Medio | Pendiente | sin cambios; ver Sección 5 más abajo |
| B-1..B-12 | Bajo | Pendiente | sin cambios; ver Sección 5 más abajo |

Acciones manuales sin commit posible:

- **Rotar secretos** del `.env` local siguiendo [SECURITY.md](SECURITY.md) (C-3).
- **Ejecutar migración** `node scripts/migrate-tracking-fingerprints.js --execute --prune` después del deploy de A-10 para mover los `_seenIps` históricos a la nueva colección y limpiar los arrays.
- **Verificar en Vercel** que `STRIPE_WEBHOOK_SECRET` y `META_APP_SECRET` están definidos antes del primer evento real tras el deploy.

---

## Cuerpo original de la auditoría

---

## Resumen ejecutivo

| Severidad | Hallazgos |
|-----------|-----------|
| Crítico   | 4 |
| Alto      | 11 |
| Medio     | 14 |
| Bajo      | 12 |

Los 4 críticos involucran credenciales productivas en disco, dos bypasses de firma en webhooks (Stripe + WhatsApp) y un fallback financiero con tasa de comisión incorrecta. Antes de cualquier despliegue conviene rotar secretos y arreglar los webhooks.

---

## 1. Estructura del repo y código huérfano / duplicado

### Stack real detectado

- Backend: Node.js ≥16, Express 4, Mongoose 7, Stripe 13, Socket.io 4, Redis 4, Winston, Helmet, Multer 1.x.
- Frontend: React 18, Vite 4, React Router 6, Recharts, Lucide, Framer Motion.
- Auth: JWT (jsonwebtoken 9), bcryptjs, otpauth (TOTP).
- Integraciones: Telegram MTProto (`telegram`), Discord.js, WhatsApp (Cloud API + `whatsapp-web.js` + Baileys), Meta/Instagram OAuth, LinkedIn OAuth, Google OAuth.
- Infra: Vercel (`vercel.json`), MongoDB Atlas, scrapers (Puppeteer + Cheerio).

### Carpetas/archivos huérfanos y dead code

| Ítem | Tamaño / impacto | Acción sugerida |
|------|------------------|-----------------|
| [sistema_comisiones.js](sistema_comisiones.js) (raíz, 19 KB) | Duplicado obsoleto de `config/commissions.js`. Define una clase `SistemaComisiones` con baseline 20 % y ajustes por plataforma (Telegram −1 %, Instagram +2 %, etc.) que **contradicen** la lógica viva. Importa Stripe/PayPal/Crypto APIs inexistentes. **Cero `require` desde el código activo** (verificado con grep). | Borrar |
| [legacy-backend/routes/](legacy-backend/routes/) | Réplica fosilizada de `/routes` (anuncios, campaigns, canales, channels, files, lists, notifications, transacciones, estadisticas). **Cero referencias desde el código activo**. | Borrar |
| [api/auth/](api/) (login.js, registro.js, verificar-token.js, verificar-email/) y [api/channels/](api/channels/) (index.js, rankings.js, [id]/, username/) | Funciones serverless paralelas a las rutas Express. Quedan **shadowed** por el rewrite `vercel.json: /api/(.*) → /api/index.js`, pero Vercel las sigue subiendo como funciones individuales (infla artefacto y aumenta cold-starts). | Borrar (mantener solo `api/index.js`) |
| [middleware/notImplemented.js](middleware/notImplemented.js) y [lib/notImplemented.js](lib/notImplemented.js) | Dos copias del mismo helper, ninguna usada en `routes/*` ni `controllers/*`. | Consolidar o borrar |
| [controllers/scoringController.js](controllers/scoringController.js) | Sin ruta que lo monte; la lógica viva está en `services/scoringOrchestrator.js`. | Borrar o migrar lo que falte |
| [channelmarket.html](channelmarket.html) (33 KB, raíz) | Prototipo HTML antiguo no referenciado por Express ni Vite. | Borrar |
| [Adflow 1.0/](Adflow%201.0/), [adflow-unified/](adflow-unified/), [Adflow Gestion/](Adflow%20Gestion/) | Iteraciones previas. Ya en `.gitignore` pero ocupan disco y aparecen en búsquedas locales. | Borrar / mover fuera del repo |
| [adflow-unified.zip](adflow-unified.zip), `plataforma-*.zip` | Backups en raíz, gitignored pero sucios en working tree. | Borrar |
| `_server_fatal.log`, `logs/` | Sin rotación; gitignored. | Documentar política de logs |
| `uploads/` | Almacenamiento local, no sobrevive a despliegues serverless de Vercel. | Migrar a S3 / R2 / equivalente |

### Documentación dispersa (raíz)

`README.md` (38 KB), `Readme adflow.pdf`, `ADFLOW_Development_Report.docx`, `Executive Summary.pdf`, `ONBOARDING_SYSTEM_DESIGN.md`, `wireframes.md`, `todo.md`, varios `*.xlsx` de planificación.
Recomendación (Fase 2): mover Markdown a `/docs`, dejar solo `README.md` en raíz, sacar PDFs/XLSX/DOCX a un drive externo.

---

## 2. Endpoints declarados pero no implementados (501) y handlers rotos

### Handlers que devuelven 501

| Archivo:línea | Handler | Notas |
|---------------|---------|-------|
| [controllers/notificationController.js:62](controllers/notificationController.js:62) | `enviarNotificacionMasiva` | Sin ruta que lo monte; stub legítimo. |
| [controllers/fileController.js:50](controllers/fileController.js:50) | `actualizarArchivo` | Exportado pero no aparece en `routes/files.js`. |
| [controllers/authController.js:647](controllers/authController.js:647) | `obtenerEstadisticas` | Devuelve `{ data: {} }` (vacío, no 501) — usado en `GET /api/auth/estadisticas`. **Funcionalmente no implementado.** |

### Helpers `notImplemented*` declarados pero no usados

- [middleware/notImplemented.js](middleware/notImplemented.js) y [lib/notImplemented.js](lib/notImplemented.js): exportan `notImplementedRouter`/`notImplementedHandler`/`notImplementedPayload`. Cero importadores reales.

### Endpoints declarados sin handler / con importación rota

- Ninguno detectado. Todas las rutas en `routes/*.js` se resuelven a funciones existentes en `controllers/*.js` o `services/*.js`. (Inventario completo: 33 archivos de ruta, ~140 endpoints, todos resueltos.)

### Controladores muertos (no montados en ninguna ruta)

- [controllers/scoringController.js](controllers/scoringController.js) — superseded por `services/scoringOrchestrator.js`.

### Doble entry point del backend

- `app.js` monta TODO en `/api/*` y se exporta vía `api/index.js` (Vercel).
- En `api/auth/*.js` y `api/channels/*.js` existen funciones serverless paralelas. El rewrite `vercel.json:60` (`/api/(.*) → /api/index.js`) las dejasilenciadas, pero Vercel las despliega de todos modos. **Riesgo:** divergencia silenciosa entre versiones.

---

## 3. Variables de entorno: usadas vs documentadas en `.env.example`

### Usadas en código pero **NO** documentadas en [.env.example](.env.example)

| ENV | Usada en | Comentario |
|-----|----------|------------|
| `BOT_API_KEY` | [controllers/authController.js:326](controllers/authController.js:326) | API key del bot Telegram para `POST /api/auth/bot-token`. Crítica. |
| `DATABASE_URL` | [server.js:41](server.js:41) | Fallback de `MONGODB_URI`. |
| `DEMO_MODE`, `DEMO_PASSWORD` | [config/config.js:65-67](config/config.js:65) | Modo demo. |
| `BCRYPT_ROUNDS` | [config/config.js:42](config/config.js:42) | Coste bcrypt. |
| `JWT_ISSUER`, `JWT_AUDIENCE` | [config/config.js:38-39](config/config.js:38) y [middleware/auth.js:25](middleware/auth.js:25) | Validación JWT. |
| `GOOGLE_CLIENT_ID` | [controllers/authController.js:657](controllers/authController.js:657) | Login Google. |
| `SUPPORT_EMAIL` | [config/config.js:63](config/config.js:63) | Email soporte. |
| `MAX_REQUEST_SIZE` | [app.js:54](app.js:54) | Límite body. |
| `APP_NAME`, `HOST` | `config/config.js` | Defaults benignos. |
| `WHATSAPP_VERIFY_TOKEN` | [routes/webhooks.js:19](routes/webhooks.js:19) | Está en `.env.example`. ✓ |
| `META_APP_SECRET` | [routes/webhooks.js:44](routes/webhooks.js:44) | Está en `.env.example`. ✓ |

### Inconsistencias entre `.env.example` y código

| Campo | `.env.example` | Código real | Severidad |
|-------|----------------|-------------|-----------|
| `STRIPE_CURRENCY` | `usd` | Defaults a `eur` ([transaccionController.js:144](controllers/transaccionController.js:144), [stripeConnectService.js:103](services/stripeConnectService.js:103)) | Medio |
| `UPLOAD_PATH` vs `UPLOADS_PATH` | `.env.example` define `UPLOAD_PATH` | `config/config.js:70` lee `UPLOADS_PATH` | Medio |
| `ALLOWED_IMAGE_TYPES` + `ALLOWED_DOCUMENT_TYPES` | Definidas | Código lee `ALLOWED_FILE_TYPES` (lista única) | Medio |
| `DISCORD_CLIENT_ID` | Duplicada en líneas 73 y 99 | — | Bajo |
| `PLATFORM_COMMISSION_RATE=0.10` | Indica 10 % de comisión | El código real usa `config/commissions.js` (standard 20 %, partner 18 %, etc.) y nunca lee `process.env.PLATFORM_COMMISSION_RATE` | **Alto** (engañoso para nuevos devs) |
| `ENCRYPTION_KEY` | Comenta "MUST be exactly 32 characters" | No hay validación de longitud al arrancar | Medio |

### Variables de `.env.example` que parecen no leerse

- `MONGODB_TEST_URI`, `STRIPE_PUBLISHABLE_KEY` (frontend), `BACKEND_URL`, `NEXT_PUBLIC_API_URL`, `MAX_FILE_SIZE`, `MAX_FILES_PER_UPLOAD`, `RATE_LIMIT_*` (no son leídas por `middleware/rateLimiter.js`, que hardcodea ventanas y límites).

### Validación de envs

[config/validateEnv.js](config/validateEnv.js) agrupa por dominio (core/auth/email/telegram/discord/instagram/whatsapp/cron) y aborta el proceso solo si falta `core` en producción. **Bug menor:** el grupo `auth` exige `JWT_SECRET` pero ya está en `core`; redundante.

---

## 4. Dependencias: declaradas vs usadas

### Declaradas y NO usadas en código (candidatas a borrar)

- `chart.js` (se usa `react-chartjs-2`, que ya empuja `chart.js` como peer)
- `discord.js` (no hay imports — discord se usa vía API REST manual en `integraciones/discord.js`)
- `geoip-lite`
- `joi` (la validación se hace con `express-validator`)
- `request-ip` (Express ya da `req.ip`; se usa siempre `req.headers['x-forwarded-for']` manual)

### Declaradas pero peligrosas / desaconsejadas

- `crypto ^1.0.1` — **es un paquete npm distinto del módulo built-in de Node**, está deprecado y nunca debió aparecer en `dependencies`. El código usa `require('crypto')` correctamente y resuelve al built-in, pero el npm sigue ahí en `node_modules` → confusión + supply-chain risk.
- `xss-clean ^0.1.4` — abandonado desde 2018. Helmet + sanitización en frontend cubren mejor. Cargado con try/catch en [app.js:93](app.js:93), su ausencia ya está prevista.
- `multer ^1.4.5-lts.1` — la rama 1.x tiene CVEs conocidos (DoS por multipart). Migrar a 2.x.
- `web3 ^4.1.1` — declarada pero sin uso real localizado en código de runtime (solo aparece en bundles minificados). Si no hay caso de uso vivo, removerla por superficie de ataque.
- `whatsapp-web.js` — librería de ingeniería inversa, no oficial de Meta; riesgo operativo de bans.

### Usadas pero NO declaradas

- `tesseract.js` — citada en código de scraping/OCR (lazy `require`). Si se ejecuta esa rama en prod sin instalarla, peta. Confirmar caso de uso y declararla o eliminarla.

---

## 5. Seguridad

### CRÍTICO

#### C-1. Bypass de firma en webhook Stripe (`/api/transacciones/webhook`)

[controllers/transaccionController.js:216-237](controllers/transaccionController.js:216).
El handler `webhookPago` solo verifica firma si `stripe && webhookSecret` están definidos. Si `STRIPE_WEBHOOK_SECRET` falta, pasa al `else` y procesa el body como JSON sin validar. Cualquier atacante puede:

```bash
curl -X POST https://api.channelad.io/api/transacciones/webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"payment_intent.succeeded","data":{"object":{"metadata":{"type":"recharge","userId":"<victim>","amount":"1000"}}}}'
```

…y crear una transacción de tipo `recarga` por cualquier monto a nombre de cualquier usuario. **Impacto:** fraude financiero directo. Comparar con [routes/partnerWebhook.js:22-27](routes/partnerWebhook.js:22), que devuelve 503 cuando falta el secret (correcto).

#### C-2. Verificación HMAC SHA-256 de WhatsApp rota

[routes/webhooks.js:35-69](routes/webhooks.js:35).
La ruta usa `express.json()` antes del check; luego ejecuta:

```js
const rawBody = JSON.stringify(req.body);
const expectedSig = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
```

`JSON.stringify` no garantiza orden de claves ni espaciado del payload original de Meta, así que el HMAC nunca coincide en el caso real. Resultado: en dev (sin `META_APP_SECRET`) acepta TODO; en prod rechaza TODO mensaje válido. Además, mensajes que sí pasen el filtro acaban llamando a `verification.verificarOTP(codigo)` y marcando canales como verificados. Solución: montar la ruta con `express.raw({ type: 'application/json' })` y firmar el `Buffer` original.

#### C-3. Credenciales productivas en disco

[.env](.env) (working tree, no commiteado — verificado con `git log --all --full-history -- .env`):

- MongoDB Atlas SRV con usuario y password (`Vercel-Admin-Adflow1` / `oo1Jc5PaXVNIv6Zx`).
- `JWT_SECRET` y `JWT_REFRESH_SECRET` reales.
- Password SMTP de Hostinger (`9609708124Rfc.`).
- `BOT_API_KEY` (64 bytes hex).
- Telegram Bot Token, MTProto API ID/Hash y `TELEGRAM_SESSION` con autenticación viva.

Aunque está gitignoreado y no apareció en historia git, el archivo es legible por cualquier proceso del usuario, está expuesto al asistente y puede acabar en backups. **Acción inmediata:** rotar todos los secretos, migrar `.env` a un gestor (1Password / Vercel envs / Doppler), y asegurar que `settings.local.json` no incluye permisos de lectura amplios.

#### C-4. Tasa de comisión incorrecta en fallback financiero

[controllers/campaignController.js:470](controllers/campaignController.js:470):

```js
const netAmount = campaign.netAmount || campaign.price * 0.9;
```

`* 0.9` implica 10 % de comisión, pero `config/commissions.js` define `standard = 0.20` (y `partnerAPI = 0.18`, `autoCampaign = 0.25`, etc.). Si el campo `campaign.netAmount` quedara en 0 (nuevo registro, fallo de pre-save), el creator se transfiere **un 10 %–15 % más** de lo que debería, drenando margen real. El mismo `* 0.9` aparece en lógica de pagos en `setImmediate` con Stripe Connect (transfer real). **Impacto:** fuga de revenue.

### ALTO

#### A-1. Falta de `idempotencyKey` en TODAS las llamadas a Stripe

Buscado con grep `idempotencyKey|idempotency_key|Idempotency-Key`: solo aparecen en `middleware/partnerIdempotency.js` (idempotencia a nivel de Partner API, no de Stripe) y en tests. **Cero llamadas a Stripe pasan `idempotencyKey`**:

| Llamada | Ubicación |
|---------|-----------|
| `paymentIntents.create` | [transaccionController.js:198](controllers/transaccionController.js:198), [partnerIntegrationService.js:183](services/partnerIntegrationService.js:183) |
| `paymentIntents.capture` | [campaignController.js:456](controllers/campaignController.js:456), [campaignCron.js:85](lib/campaignCron.js:85), [partnerIntegrationService.js:201](services/partnerIntegrationService.js:201) |
| `paymentIntents.cancel` | [campaignController.js:609](controllers/campaignController.js:609), [partnerIntegrationService.js:212](services/partnerIntegrationService.js:212) |
| `refunds.create` | [campaignController.js:611](controllers/campaignController.js:611), [partnerIntegrationService.js:216](services/partnerIntegrationService.js:216) |
| `transfers.create` | [stripeConnectService.js:101](services/stripeConnectService.js:101) |
| `checkout.sessions.create` | [transaccionController.js:146](controllers/transaccionController.js:146) |
| `accounts.create`, `accountLinks.create`, `accounts.createLoginLink` | `services/stripeConnectService.js` |

En cada caso un timeout de red o reintento de Vercel puede provocar **cargo doble, transfer doble o refund doble**. Patrón requerido:

```js
await stripe.paymentIntents.capture(piId, { idempotencyKey: `capture:${campaignId}` });
await stripe.transfers.create({...}, { idempotencyKey: `transfer:${campaignId}` });
```

#### A-2. CORS permisivo

[app.js:59-69](app.js:59) acepta cualquier origen sin `Origin`, todo `*.vercel.app` (no solo el dominio de la app), y en dev acepta cualquier origen. Para Socket.io ([server.js:71](server.js:71)) directamente pasa `'*'` en dev y un array con el literal `'*.vercel.app'` en prod (que Socket.io trata como string exacto, no glob). Sustituir por allowlist explícita.

#### A-3. Modelo financiero inconsistente y duplicado

- `.env.example` (`PLATFORM_COMMISSION_RATE=0.10`) sugiere 10 %; el código real usa 20 % vía `config/commissions.js`.
- Tres definiciones de tiers de referidos (idénticas y reescritas):
  - [controllers/campaignController.js:9-13](controllers/campaignController.js:9)
  - [controllers/authController.js:259-262](controllers/authController.js:259)
  - [routes/referrals.js:9-13](routes/referrals.js:9)
  Cualquier cambio futuro romperá uno de los tres y los reportes saldrán desalineados.
- Tasa de comisión por referido **5 % hardcodeada** en [campaignController.js:510](controllers/campaignController.js:510); debería vivir en `config/commissions.js`.
- `sistema_comisiones.js` (raíz, dead code) propone una lógica completamente distinta (Telegram −1 %, Instagram +2 %, Discord −2 %, destacado +3 %) — confunde a quien lea el repo.

#### A-4. `payoutController` y dashboard usan enums inexistentes

- [controllers/payoutController.js:154](controllers/payoutController.js:154): query `tipo: { $in: ['retiro', 'comision'] }` (válido).
- [routes/adminDashboard.js:72](routes/adminDashboard.js:72) y [routes/adminDashboard.js:292](routes/adminDashboard.js:292): query `tipo: { $in: ['comision', 'commission'] }`. **`'commission'` no existe en el enum** del modelo Transaccion (solo `'comision'`), por lo que el `$in` filtra el ruido pero las métricas del dashboard ignoran transacciones con cualquier futura nomenclatura `commission`. Decidir un único valor.

#### A-5. Doble fuente de verdad en `Campaign.netAmount`

- `Campaign.pre('save')` recalcula `netAmount = price * (1 - commissionRate)` cuando cambian `price` o `commissionRate` ([models/Campaign.js:46-50](models/Campaign.js:46)).
- Fuera de `save`, controladores como `completeCampaign` siguen usando el fallback `campaign.price * 0.9` (ver C-4) en vez de releer `netAmount` o calcular vía `commissionRate`.

#### A-6. Rate limiting de chat de campañas en memoria

[campaignController.js:630-682](controllers/campaignController.js:630) usa `Map` global para timestamps por usuario. En Vercel cada invocación es una instancia distinta → el límite (1 msg cada 3 s, 60/h) no se aplica. Mover a Redis o `rate-limit-mongo` (que ya está instalado para `middleware/rateLimiter.js`).

#### A-7. `xss-clean` y `request-ip` deprecadas

Ya cubierto en §4. Mantenerlas activas en hot path da falsa sensación de seguridad y aumenta superficie de CVE.

#### A-8. Permisos de lectura sobre archivos sensibles

[app.js:97-103](app.js:97) bloquea por regex paths que contienen `package.json`, `.env`, `.git`, `node_modules`, `tsconfig`, `vite.config`, `.claude`. Ojo: la regex coincide en cualquier parte del path (no anclada), pero como `req.path` siempre empieza con `/`, una ruta legítima como `/api/canales/.envio-noticias` activaría el filtro. Riesgo bajo pero real.

#### A-9. Logging silencioso en transferencias a creators

`setImmediate` en [campaignController.js:464-479](controllers/campaignController.js:464) hace `transferToCreator` con `try/catch` y solo `console.error`. Si Stripe Connect falla (cuenta no enabled, requirements pendientes), el creator no cobra y nadie se entera. Necesita tabla de `payout_attempts` con reintento explícito.

#### A-10. Tracking redirect: `_seenIps` ilimitado

[app.js:300-302](app.js:300): `link._seenIps` se cap a 10 000 elementos pero el documento en Mongo crece sin límite intermedio. Riesgo de colisión con el límite de 16 MB de BSON en links muy populares. Mover a colección aparte indexada por `(linkId, fingerprint)`.

#### A-11. `JSON.stringify` en logs de error sensibles

Varios `console.error('LOGIN ERROR:', error)` y `console.error('AUTH ERROR:', error)` exponen stack traces completos en logs. En entornos compartidos, mejor usar `logger.error` (Winston ya está) y filtrar tokens.

### MEDIO

#### M-1. Webhook `/api/webhooks/whatsapp` POST responde 200 antes de validar

[routes/webhooks.js:36-37](routes/webhooks.js:36): `res.status(200).json({ status: 'ok' })` se ejecuta antes de la verificación de firma. El cliente nunca sabe si el evento fue rechazado. Es intencional para Meta, pero implica que cualquier monitor externo (uptime checks) sondeando este endpoint contará éxitos falsos.

#### M-2. Login devuelve `error.message` en dev sin sanitizar

[controllers/authController.js:14](controllers/authController.js:14) `errorPayload`. Aceptable en dev; verificar que `NODE_ENV=production` esté siempre seteado en Vercel (de lo contrario filtra detalles).

#### M-3. Account lockout sin notificación

[authController.js:101](controllers/authController.js:101) bloquea 30 min tras 5 intentos. No notifica por email al usuario legítimo. Ataque de degradación servicio (lock perpetuo) es trivial.

#### M-4. Sin verificación de captcha en `/api/auth/registro`

El rate limit (5/h por IP) es la única defensa anti-bots. Considerar hCaptcha/Cloudflare Turnstile.

#### M-5. Token de email verification sin scoping por user

[authController.js:193](controllers/authController.js:193) `crypto.randomBytes(32).toString('hex')` — bien. Pero `verificarEmail` (no leído pero asumido) busca por token sin `userId`; un token caducado no se invalida explícitamente, depende de `passwordResetExpires`. Verificar con tests.

#### M-6. `bcryptjs` con rounds = 10 fijo

[middleware/auth.js / authController.js:178](controllers/authController.js:178) `bcrypt.hash(password, 10)`. Para 2026, recomendado 12 (o `BCRYPT_ROUNDS` env, ya existe en `config/config.js` pero no se usa al hashear).

#### M-7. CRON_SECRET shared entre 6 jobs

Las rutas `/api/admin/scoring/run`, `/api/admin/metrics/capture`, `/api/jobs/*` comparten un único `CRON_SECRET`. Compromise → barrido total. Considerar secretos por job.

#### M-8. Swagger gate

[app.js:166-170](app.js:166) protege `/api/docs` con JWT admin en prod. Bien. Pero la CSP usa `'unsafe-inline'` y `'unsafe-eval'` (necesario para Swagger UI clásico). Documentarlo o usar Redoc con CSP estricta.

#### M-9. Express-rate-limit sin keyGenerator personalizado

Por defecto usa `req.ip`. Si no se configura `app.set('trust proxy', N)` correctamente, Vercel pasa la IP del front-end. `app.set('trust proxy', 1)` ([app.js:58](app.js:58)) está bien para Vercel, pero conviene confirmar con `req.app.get('trust proxy')` runtime.

#### M-10. Estructura `routes/lists` vs `routes/userLists`

Dos archivos sirven a `/api/lists`: `routes/userLists.js` para `/api/lists` y `routes/lists.js` para `/api/lists/public`. Confunde. Renombrar.

#### M-11. `transaccionController.crearTransaccion` no exige campo `tipo`

[controllers/transaccionController.js:65-91](controllers/transaccionController.js:65). Crea Transaccion sin pasar `tipo`, dejándolo en default `'pago'`. Un usuario puede llamar a `POST /api/transacciones` con cualquier `amount` sin pagar; queda en `status: 'pending'`. Validar que el flujo correcto siempre va vía `crearPaymentIntent`/checkout.

#### M-12. No hay test para `webhookPago`

Búsqueda en `tests/` no muestra cobertura de `transaccionController.webhookPago`. Combinado con el bypass de C-1, riesgo crítico no detectado.

#### M-13. `FULL_ACCESS_EMAILS` por defecto incluye 3 emails de ejemplo

[authController.js:22](controllers/authController.js:22): si la env no se define, `admin@channelad.io`, `creator@channelad.io`, `advertiser@channelad.io` reciben `betaAccess`. En prod no es problema (los emails reales no existen en BD), pero crear esos usuarios provoca escalada de privilegios. Reducir el default a `[]`.

#### M-14. Migración SQL/NoSQL incompleta

El comando `npm run migrate:roles` apunta a `scripts/migrate-roles.js`. Verificar idempotencia y backup previo.

### BAJO

#### B-1 a B-12

- B-1. `index.html` (raíz, 9.8 KB) es el entry de Vite — correcto, pero conviven con `dist/index.html`. Documentarlo.
- B-2. `eslintrc.cjs` muy laxo, no hay CI que falle por warnings.
- B-3. `jest.config.js` sin coverage thresholds.
- B-4. Sin `husky` / `lint-staged`.
- B-5. `Adflow_Dashboard.xlsx` y planes en raíz — gitignored pero ensucian.
- B-6. `.vercelignore` existe pero no excluye `legacy-backend/`, `Adflow 1.0/`, `adflow-unified/`.
- B-7. Comentarios en español + inglés mezclados; no hay convención.
- B-8. Variable `_seenIps` en `TrackingLink` empieza con `_` (Mongoose por defecto la trata como pública).
- B-9. `models/Usuario.js` no tiene índice compuesto para queries de referidos.
- B-10. `services/persistentStore.js` sin tests, depende de `data/*.json` (no sobrevive a Vercel).
- B-11. `dist/` está commiteado (verificar — figura en `.gitignore` pero presente en filesystem).
- B-12. `package.json` con `"author": ""`, `"keywords": []`, `"description": ""`.

---

## 6. Stripe — diagnóstico consolidado

| Área | Estado |
|------|--------|
| Webhook `/api/partners/webhooks/stripe` | ✅ Verifica firma con `constructEvent` y raw body. ACK inmediato. Maneja `payment_intent.amount_capturable_updated`, `canceled`, `payment_failed`. |
| Webhook `/api/transacciones/webhook` | ❌ **Bypass de firma cuando falta `STRIPE_WEBHOOK_SECRET`** (C-1). |
| Idempotencia | ❌ **Cero** llamadas a Stripe pasan `idempotencyKey` (A-1). |
| Captura escrow | OK (capture_method `manual`), pero sin idempotencia (A-1). |
| Refund flow | OK lógico, sin idempotencia (A-1). |
| Connect transfer | OK lógico, sin idempotencia, sin retry queue (A-9, A-1). |
| Errores | Solo `console.error`; no se escribe nada a `Transaccion.failureReason` ni `Campaign.delivery.error` (A-9). |

---

## 7. Blog estático (SSG Markdown → HTML servido por Express)

### Arquitectura

- Generador: [scripts/build-blog.js](scripts/build-blog.js) lee `content/blog/*.md`, los renderiza con `marked` + template `_template.html`, escribe `public/blog/<slug>.html`, `public/blog/index.html`, `public/blog/feed.xml`, `public/sitemap.xml`. Soporta `meta.spaOnly === 'true'` para saltar generación.
- Express: [app.js:421-446](app.js:421) sirve `public/blog/*.html`. `/blog`, `/blog/feed.xml`, `/blog/:slug` → `sendFile` si existe, `next()` si no.
- Vercel: rewrites en [vercel.json:65-69](vercel.json:65) hacen `/blog → /blog/index.html`, `/blog/calculadora-precios-publicidad → /index.html` (excepción hardcoded), `/blog/:slug → /blog/:slug.html`, y todo lo demás → `/index.html`.

### Bugs encontrados

#### B/M — fallback inconsistente entre Express y Vercel

En [app.js:474-480](app.js:474) el catch-all hace:

```js
app.get('*', (req, res, next) => {
  if (req.method !== 'GET') return next();
  if (req.path.startsWith('/api')) return next();
  if (req.path.startsWith('/uploads') || req.path.startsWith('/public')) return next();
  if (req.path.startsWith('/blog')) return next();   // ← excluye /blog
  res.sendFile(distIndex);
});
```

Si `/blog/foo` no existe como HTML, Express NO sirve `dist/index.html` (React) — devuelve 404. Pero en Vercel, `/blog/foo` se reescribe a `/blog/foo.html` → si no existe, Vercel también devuelve 404. **Resultado:** posts marcados como `spaOnly = 'true'` en frontmatter NO funcionan ni en local ni en Vercel, salvo el caso hardcoded de `calculadora-precios-publicidad`. Este flujo es frágil.

Opciones: (a) eliminar `spaOnly` y siempre generar un stub HTML que cargue React; (b) cambiar el catch-all de `app.js` para servir React también en `/blog/*` cuando el HTML estático no exista, y replicar la regla en `vercel.json` con `/blog/(.*)` → `/index.html` como fallback final.

#### B — Cache headers diferentes entre Express y Vercel

- Express ([app.js:425-444](app.js:425)): `max-age=1800` y `max-age=3600`.
- Vercel ([vercel.json:51-57](vercel.json:51)): `s-maxage=3600` para slugs, `s-maxage=1800` para index.

`s-maxage` y `max-age` no son intercambiables. Unificar.

#### B — Catch-all Express sirve `dist/index.html` para `/sitemap.xml` y `/robots.txt` cuando `dist` existe

[app.js:449-466](app.js:449) tiene handlers, OK. Pero si `public/sitemap.xml` no existe (build no ejecutado), llama `next()` y el catch-all sirve `dist/index.html`. Resultado: bots reciben HTML como sitemap. Mismo problema con `robots.txt`. Devolver 404 explícito.

#### B — `loadFaqMap` parsea `blogPosts.js` con regex frágil

[scripts/build-blog.js:64-91](scripts/build-blog.js:64). Si el formato del archivo cambia (saltos de línea, comillas), las FAQs se rompen sin error. Migrar a importar el módulo (`require()`) — el script ya está en Node.

---

## 8. Calidad de tests

`tests/` contiene `commissions.test.js` (Jest, cubre tiers), `partner-api.integration.test.js` (idempotencia partner). Ausencias relevantes:

- Sin tests de `webhookPago` (C-1).
- Sin tests de WhatsApp signature (C-2).
- Sin tests de blog SSG (Sección 7).
- Sin tests de `transferToCreator` (no idempotencia, no error path).

Recomendar añadir test mínimo de cada finding crítico antes de cerrar Fase 3.

---

## 9. Lista priorizada para Fase 3

| Orden | ID | Acción | Archivo principal |
|-------|----|--------|-------------------|
| 1 | C-3 | Rotar todos los secretos productivos del `.env`. | `.env`, gestor externo |
| 2 | C-1 | Hacer obligatorio `STRIPE_WEBHOOK_SECRET` en `webhookPago`; devolver 503 si falta. Añadir test. | `controllers/transaccionController.js` |
| 3 | C-2 | Refactor del webhook WhatsApp para usar `express.raw` y firmar el `Buffer` original. | `routes/webhooks.js` |
| 4 | C-4 | Eliminar el fallback `* 0.9`; usar siempre `commissionRate` resuelto. | `controllers/campaignController.js` |
| 5 | A-1 | Añadir `idempotencyKey` a TODAS las llamadas Stripe. | múltiples |
| 6 | A-3 | Centralizar tiers de referido + 5 % de referido en `config/commissions.js`. Borrar `sistema_comisiones.js`. Sincronizar `.env.example`. | `config/commissions.js` |
| 7 | A-4 | Unificar enum `'comision'` (no `'commission'`) en queries. | `routes/adminDashboard.js` |
| 8 | A-2 | Allowlist explícita CORS + Socket.io. | `app.js`, `server.js` |
| 9 | A-5 | Reemplazar `* 0.9` por `commissionRate` en todas las apariciones. | `controllers/campaignController.js`, `services/*` |
| 10 | A-6 | Mover rate limit de chat a Redis/Mongo. | `controllers/campaignController.js` |
| 11 | A-9 | Crear modelo `PayoutAttempt` con retry. | `models/`, `services/stripeConnectService.js` |
| 12 | A-7 | Eliminar `xss-clean`, `request-ip`, `chart.js`, `discord.js`, `joi`, `geoip-lite`, paquete npm `crypto`. | `package.json` |

Los hallazgos M y B se atajan en Fase 2 (reorganización) o como housekeeping.

---

## 10. Próximo paso

Esperando tu OK explícito (`procede con fase 2` o `procede con fase 3`) antes de tocar nada.
