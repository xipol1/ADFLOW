# Plan: sacar `/api/baileys/*` de Vercel

**Fecha:** 2026-05-28  
**Estado:** propuesto — pendiente de ejecución

## Por qué

`services/baileys/BaileysSessionManager.js` necesita un **proceso Node persistente**:
abre un WebSocket largo a WhatsApp Web, guarda QR + creds en memoria mientras el
usuario escanea, y reconecta con backoff. Vercel es serverless: cada request es un
cold start, el socket muere entre invocaciones. **Hoy el flow QR no funciona en
producción**, aunque el código sí está montado en `app.js`.

## La buena noticia

El scaffolding ya está listo:

| Pieza | Ubicación | Estado |
|---|---|---|
| Entrypoint persistente | `server.js` | listo — arranca crons + workers |
| Fly app config | `fly.toml` | listo (`channelad-api-test`, región `cdg`) |
| Cron Baileys | `lib/campaignCron.js` (paso 8) | listo, recién cableado |
| WhatsApp worker pattern | `services/WhatsAppAdminClient.js` + `workers/whatsappWorker.js` | listo (precedente arquitectónico) |
| Migración doc | `MIGRATION_FLY.md` | listo |
| Env gate | `WHATSAPP_SESSION_PATH` | usado en `server.js:138` para `whatsapp-web.js`; reaprovechable |

Solo hay que **encenderlo y redirigir los endpoints de Baileys** desde el frontend.

## Arquitectura objetivo

```
              Vercel (channelad.io)                 Fly (channelad-api-test)
              ┌──────────────────────┐              ┌────────────────────────────┐
  navegador ─▶│ frontend React       │              │ server.js + app.js         │
              │ + /api/* serverless  │              │ persistent Node 22         │
              │   (todo menos        │              │ ┌────────────────────────┐ │
              │    Baileys)          │              │ │ BaileysSessionManager  │ │
              └─────────┬────────────┘              │ │ (in-process WS pool)   │ │
                        │                            │ └────────────────────────┘ │
                        │ /api/baileys/*  ──────────▶│ /api/baileys/* (mismo     │
                        │ (proxy o CORS directo)     │  controller, mismo route) │
                        └────────────────────────────│ Mongo Atlas (compartido)  │
                                                     └────────────────────────────┘
```

**MongoDB es la única fuente de verdad compartida.** No hay IPC entre Vercel y Fly:
ambos hablan al mismo Atlas, así que un canal verificado en Fly aparece
inmediatamente en el dashboard servido desde Vercel.

## Pasos concretos

### 1. Encender Fly (15 min)

```powershell
flyctl launch --no-deploy --copy-config           # confirma channelad-api-test, region cdg
flyctl volumes create channelad_wa_sessions --region cdg --size 1
```

Descomenta el bloque `[mounts]` en `fly.toml` (líneas 51-55).

Secrets mínimos (los crons y Mongo usan estos):

```powershell
flyctl secrets set `
  MONGO_URI="$env:MONGO_URI" `
  JWT_SECRET="$env:JWT_SECRET" `
  JWT_REFRESH_SECRET="$env:JWT_REFRESH_SECRET" `
  WHATSAPP_SESSION_PATH="/app/data/whatsapp-session" `
  STRIPE_SECRET_KEY="$env:STRIPE_SECRET_KEY" `
  CRON_SECRET="$env:CRON_SECRET"
```

```powershell
flyctl deploy
```

Verificación:

```powershell
curl https://channelad-api-test.fly.dev/health
flyctl logs | Select-String "Campaign cron started|Baileys"
```

### 2. Bloquear `/api/baileys/*` en Vercel (5 min)

Para que nadie pueda llamarlo accidentalmente al endpoint serverless roto.
En `app.js` (o un middleware específico) antes del mount de `routes/baileys`:

```js
if (process.env.VERCEL || process.env.RUNTIME_PLATFORM === 'vercel') {
  app.use('/api/baileys', (req, res) =>
    res.status(503).json({
      success: false,
      message: 'WhatsApp QR pairing service unavailable on this host',
      redirect: process.env.BAILEYS_SIDECAR_URL || null,
    }),
  );
} else {
  app.use('/api/baileys', require('./routes/baileys'));
}
```

Esto le da al frontend un 503 estructurado en lugar del 500 + timeout actual.

### 3. Redirigir el frontend ✅ (ya implementado)

**Hecho** en `client/src/services/api.js` — el método `request()` ahora elige el
base URL por endpoint:
- `/baileys/*` → `CONFIGURED_BAILEYS_BASE_URL` (de `VITE_BAILEYS_API_URL`)
- Resto → main API normal

Lo único pendiente para activarlo es **añadir la env var en Vercel**:

```
VITE_BAILEYS_API_URL=https://channelad-api-test.fly.dev
```

(Si la dejas vacía, todo cae al main API — comportamiento idéntico al actual.)

Coverage tests: `tests/apiBaseUrlResolver.test.js` (6 casos: enrutado, fallback,
no-match, defensivos).

**Fly CORS**: el backend lee `FRONTEND_URL` + `CORS_ORIGIN` (CSV) — añadir al
`flyctl secrets set` del paso 1:

```powershell
flyctl secrets set `
  FRONTEND_URL="https://channelad.io" `
  CORS_ORIGIN="https://www.channelad.io"
```

Los hostnames `*.vercel.app` ya se aceptan por sufijo (preview deployments).

### 4. Verificación end-to-end (15 min)

Desde el navegador en `https://channelad.io`:

1. Login normal (sigue en Vercel).
2. Ir a `LinkWhatsAppPage` → "Vincular cuenta".
3. Network panel: la llamada `POST /api/baileys/link/start` va a `*.fly.dev`.
4. QR aparece en < 5 s.
5. Escanear con WhatsApp.
6. Frontend hace polling `GET /api/baileys/link/:sessionId` cada 2 s.
7. Status pasa `pending_qr → connected`; lista de newsletters aparece.
8. Click "Vincular canal" → `POST /api/baileys/sessions/:id/link-canal`.
9. Recargar dashboard (Vercel): el canal aparece como `verificado: oro`, claim asentado.
10. `flyctl logs` muestra entradas de audit log: `session.connected`, `newsletter.list_fetched`, `newsletter.linked_to_canal`.

### 5. Costo y operación

- **Fly free tier:** 3 shared-cpu-1x VMs + 3 GB volúmenes. Suficiente hasta ~50
  sesiones concurrentes. Sin tarjeta hasta superar el free tier.
- **Volumen 1 GB:** ~$0.15/mes si se pasa del free.
- **`min_machines_running = 1`** ($1.94/mes shared-cpu-1x) **es obligatorio** para
  Baileys: si la VM se duerme, el WebSocket muere y todos los usuarios linkeados se
  desconectan. Editar `fly.toml` antes de pasar de pruebas a real.

### 6. Riesgos abiertos

| Riesgo | Mitigación |
|---|---|
| Una sola VM = SPOF | Aceptable mientras hay < 100 sesiones. Sharding por `usuarioId % N` cuando crezca. |
| Pairing requiere persistencia del volumen | Volumen Fly montado en `/app/data/whatsapp-session`. Hacer backup semanal con `flyctl ssh sftp`. |
| WhatsApp ToS — riesgo de ban | Inherente a Baileys, no a esta migración. `markOnlineOnConnect: false` ya ayuda. Documentar en consent del usuario (ya hecho en `BaileysSession.consentVersion`). |
| Mongo compartido = dos escritores | Audit log y verificación son append-only / idempotent → seguro. Cuidado si se añaden flows con read-modify-write entre ambos hosts. |
| Cron duplicado si ambos hosts arrancan `startCampaignCron` | Vercel no arranca `server.js`, solo `app.js` (via build), así que no hay duplicación. Verificar en deploy. |

## Estimación

- Encender Fly + secrets + deploy: **30 min**
- Bloquear endpoints en Vercel + redirección frontend: **30 min**
- QA end-to-end con QR real: **30 min**
- **Total: ~1.5 h** para tener verificación WhatsApp funcionando en producción.

## Cuándo NO hacerlo

Si en el roadmap inmediato Channelad va a priorizar Telegram (donde la verificación
sí funciona en Vercel via MTProto) y WhatsApp queda en backlog, este sidecar puede
esperar — pero entonces hay que **desactivar la opción de vincular WhatsApp en el UI**
para no prometer un flujo roto. Recomendación: bloquearlo ya con el 503 estructurado
(paso 2) y decidir el sidecar después.
