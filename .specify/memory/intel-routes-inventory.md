# Channel Intelligence — Inventario de rutas

> **Fecha**: 2026-05-18. Resultado de la auditoría manual de las 4 rutas que un primer agente Explore marcó como "posiblemente zombie" en la auditoría user-facing. **Diagnóstico corregido**: ninguna es zombie — son infraestructura central de la plataforma.
>
> Este documento existe para evitar que futuras auditorías repitan el error y para dejar trazado el valor estratégico del subsistema de Channel Intelligence.

---

## TL;DR

Las 4 rutas auditadas (`telegramIntel`, `multiplatformIntel`, `channelCandidates`, `channelIntelligence`) son **infraestructura productiva**, agendada en `vercel.json` o consumida directamente por el frontend. Ninguna debe tocarse en el contexto del backlog MVP — siguen funcionando como están.

El subsistema completo de Channel Intelligence (12+ páginas que lo consumen, 2 crons diarios + 1 semanal, modelo de candidatos con flujo admin de aprobación) constituye un **diferenciador competitivo** que el playbook §1.3 ya identifica como pilar del wedge (verificación de métricas). No es ruido; es producto.

---

## Inventario detallado

### 1. `routes/telegramIntel.js` — CRON, no UI

- **Mount**: `app.js:519` → `/api/jobs/telegram-intel`
- **Schedule**: `vercel.json` cron diario `30 2 * * *` (02:30 UTC)
- **Auth**: `CRON_SECRET` (Bearer token)
- **Función**: hidrata métricas de canales Telegram vía GramJS (lazy-loaded para no bundlear en cada función serverless).
- **Job**: `jobs/telegramIntelJob.js` → `services/telegramIntelService.js`
- **Tests**: `tests/telegramIntel.test.js`
- **Estado**: ✅ Operativa. No requiere UI (es backend infrastructure).
- **Dependencias env**: `CRON_SECRET`, credenciales GramJS (Telegram).

### 2. `routes/multiplatformIntel.js` — CRON, no UI

- **Mount**: `app.js:520` → `/api/jobs/multiplatform-intel`
- **Schedule**: `vercel.json` cron diario `0 4 * * *` (04:00 UTC)
- **Auth**: `CRON_SECRET`
- **Función**: ingesta de métricas para plataformas no-Telegram (Instagram, LinkedIn, etc.). Modo `?bootstrap=true` crea snapshots iniciales para canales sin histórico.
- **Servicio**: `services/multiplatformIntelService.js`
- **Job**: `jobs/multiplatformIntelJob.js`
- **Servicios relacionados**: `linkedinSyncService.js`, `linkedinCreatorMetricsService.js`
- **Estado**: ✅ Operativa. No requiere UI.
- **Dependencias env**: `CRON_SECRET`, credenciales por plataforma (LinkedIn OAuth, etc.).

### 3. `routes/channelCandidates.js` — CRON + Admin UI

- **Mounts dobles** (`app.js:521-522`):
  - `/api/jobs/tgstat-discover` (cron Lunes 05:00 UTC, `vercel.json:37`)
  - `/api/jobs/massive-seed` (manual trigger one-shot, background)
  - `/api/channel-candidates/` (admin endpoints: list, approve, reject)
- **Auth admin endpoints**: `autenticar + autorizarRoles('admin')`
- **Función**: pipeline de descubrimiento de canales — TGStat scraper alimenta cola de candidatos → admin revisa → aprobar crea `Canal` linkado a `propietario`.
- **Servicio**: `services/tgstatScraperService.js`
- **Modelo**: `models/ChannelCandidate.js`
- **Job background**: `jobs/massiveSeedJob.js`
- **UI consumidora**: `client/src/ui/pages/admin/CandidatesReviewPage.jsx` (confirmado por agente previo).
- **Tests**: `tests/channelDiscovery.test.js`, `tests/massiveSeed.test.js`
- **Estado**: ✅ Operativa con UI admin.
- **Riesgo de seguridad ya mitigado**: comentario en route advierte que sin guard admin cualquier usuario podría apropiarse de canales scrapeados (ej. `@nasa`, `@bbcnews`).

### 4. `routes/channelIntelligence.js` — Endpoint público con 12+ consumidores

- **Mount**: `app.js:516` → `GET /api/channels/:id/intelligence`
- **Auth**: pública, sin token. Rate limit dual: 100 req/IP/hora + burst 10 req/IP/10 s.
- **Cache**: `Cache-Control: public, max-age=3600, s-maxage=3600` (Edge Vercel).
- **Función**: devuelve `{ canal, scores, historial, benchmark, campanias }` con filtro de privacidad en service layer (owner, contacto, advertiser history, fraud flags filtrados).
- **Servicio**: `services/channelIntelligenceService.js`
- **Tests**: `tests/channelIntelligenceService.test.js`
- **Consumido por** (`client/src/services/api.js:254` → `getChannelIntelligence`):
  1. `ui/pages/channel/ChannelExplorerPage.jsx:148`
  2. `ui/pages/claim/ClaimChannelPage.jsx:54`
  3. `ui/pages/dashboard/advertiser/AnalyzeChannelPage.jsx:219, 293, 705`
  4. `ui/pages/dashboard/advertiser/AudienceInsightsPage.jsx:168`
  5. `ui/pages/dashboard/advertiser/AudienceOverlapPage.jsx:195`
  6. `ui/pages/dashboard/advertiser/AuditChannelsPage.jsx:85`
  7. `ui/pages/dashboard/advertiser/CompareChannelsPage.jsx:238`
  8. `ui/pages/dashboard/advertiser/LookalikeChannelsPage.jsx:263`
  9. `ui/pages/dashboard/advertiser/NewCampaignPage.jsx:190`
  10. `ui/pages/dashboard/advertiser/PositionTrackerPage.jsx:142`
  11. `ui/pages/dashboard/creator/CreatorAnalyticsPage.jsx:1243`
- **Estado**: ✅ Operativa y altamente integrada (12+ páginas).

---

## Lectura estratégica

El subsistema Channel Intelligence cubre **mucho más que un marketplace básico**:

- **Para anunciante**: analyze · audit · audience insights · audience overlap · compare · lookalike · position tracker — un toolkit de inteligencia competitiva por canal.
- **Para canal**: analytics propias enriquecidas con scoring y benchmark.
- **Para plataforma**: pipeline de descubrimiento automatizado (TGStat scraper) que alimenta el catálogo sin intervención manual masiva.
- **Para operativa**: 2 crons diarios + 1 semanal mantienen los datos frescos sin trabajo humano.

Este subsistema es **moat real** alineado con [wording-playbook.md §1.3](./wording-playbook.md) (wedge: verificación de métricas) y [constitution.md Principio I](./constitution.md) (Verificable: toda métrica auditada o etiquetada). No tocar como "limpieza" — si algo, sobre-comunicar en landing y FAQ.

## Recomendaciones

1. **No eliminar nada** de las 4 rutas ni de sus servicios/jobs/modelos asociados.
2. **No incluir en backlog MVP** ninguna spec sobre estas rutas — están terminadas y operando.
3. **Considerar para post-MVP** una página de "Cómo verificamos los canales" que explique el subsistema al usuario final (ancla de confianza fuerte alineada al wedge §1.3 del playbook).
4. **Documentar en `docs/architecture.md`** (si no está ya) el flujo: `tgstat-discover` → `ChannelCandidate` → `admin review` → `Canal` → `telegram-intel + multiplatform-intel` → `channelIntelligence` (servido público con rate limit + cache).

## Cierre de Fase A.2

Acción completada. Ningún archivo modificado, ningún archivo eliminado. Solo inventario y corrección del diagnóstico previo.
