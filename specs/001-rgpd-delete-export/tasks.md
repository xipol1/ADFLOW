---
description: "Task list — SPEC-B1 RGPD Delete + Export"
---

# Tasks: Eliminación de cuenta + Export de datos (RGPD)

**Input**: Design documents from `specs/001-rgpd-delete-export/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/](./contracts/) · [quickstart.md](./quickstart.md)

**Tests**: Included — el spec exige verificación forense (SC-004), trazabilidad del audit log (SC-006) y cobertura del flujo completo. Tres suites: 1 unit (forense) + 2 integration (deletion E2E, export E2E).

**Organization**: Por user story (US1 P1 borrado · US2 P2 export · US3 P3 página derechos). Cada user story es independientemente testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizable (distinto archivo, sin deps en pendientes).
- **[Story]**: `[US1]`, `[US2]`, `[US3]` para fases de user story. Vacío en Setup / Foundational / Polish.
- Cada tarea con path exacto.

## Path Conventions

- Backend: raíz repo (`models/`, `routes/`, `controllers/`, `services/`, `workers/`, `jobs/`, `middleware/`, `email-templates/`, `config/`).
- Frontend: `client/src/`.
- Tests: `tests/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: variables de entorno, cron Vercel, dependencia nueva, templates email base.

- [X] T001 Añadir `RGPD_TOKEN_SECRET` y `RGPD_EXPORT_SIGNING_KEY` a la lista de envs requeridas en [config/validateEnv.js](config/validateEnv.js). Documentar generación con `openssl rand -hex 32`.
- [X] T002 Añadir cron Vercel `/api/jobs/rgpd-grace` con schedule `0 * * * *` (cada hora) en [vercel.json](vercel.json) bajo `crons` (header `Authorization: Bearer $CRON_SECRET` ya gestionado por handler). **Constraint Vercel Hobby tier**: el plan Hobby limita a **2 crons total** y este sería el #4 (el repo ya tiene `telegram-intel`, `multiplatform-intel`, `tgstat-discover`). Decisión 2026-05-18: free tier por ahora → si Vercel rechaza el deploy por exceso de crons, opciones (a) consolidar en un cron único dispatcher que llame a los 4 workers en cadena, (b) reducir frecuencia de los crons intel a semanal, o (c) migrar a Pro tier (~$20/mes). Cron horario sigue cumpliendo SLA <24h del export (FR-014) con latencia degradada máx. ~1h desde fin de gracia hasta ejecución.
- [X] T003 [P] Instalar `archiver` (`npm install archiver`) y verificar versión en [package.json](package.json).
- [X] T004 [P] Crear 5 templates HTML en [email-templates/](email-templates/): `rgpd-confirm-deletion.html`, `rgpd-grace-started.html`, `rgpd-grace-warning.html`, `rgpd-deletion-completed.html`, `rgpd-export-ready.html`. Estructura idéntica a los 18 existentes (variables vía `{{var}}`). Copy alineado a [wording-playbook.md §6.3 fórmula email transaccional](.specify/memory/wording-playbook.md#63-email-transaccional). **i18n-ready**: cada texto traducible va en variable separada (e.g., `{{subject}}`, `{{body_intro}}`, `{{cta_label}}`); en MVP el render server-side inyecta castellano peninsular. Cuando SPEC-C3 entregue i18n LATAM, basta con tener variantes por locale del mismo template sin cambiar el sistema de render (FR-025).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: infraestructura cross-cutting que cualquier user story necesita. NO se puede tocar Phase 3+ sin esto.

**⚠️ CRITICAL**: ningún `[US*]` empieza hasta que esta fase esté cerrada.

- [X] T005 Crear modelo append-only [models/RGPDAuditLog.js](models/RGPDAuditLog.js) con schema `{usuarioId, action, timestamp, ip, userAgent, actor, actorUserId, metadata}` + índices `{usuarioId:1, timestamp:-1}` y `{action:1, timestamp:-1}`. Sin TTL (retención permanente — RGPD Art. 30).
- [X] T006 Crear [services/rgpdAuditService.js](services/rgpdAuditService.js) que expone **solo** `log(action, opts)`, `findByUser(usuarioId)`, `findByAction(action, range)`. No exporta `update`/`delete`. Comentario superior aclarando inmutabilidad.
- [X] T007 Editar [models/Usuario.js](models/Usuario.js): añadir `deletionStatus: String enum ['active','pending_email_confirmation','pending_deletion','anonymized']` default `'active'` con índice, y `anonymizedAt: Date` default null. Añadir método estático `Usuario.anonymizeById(id)` que delega en `anonymizationService` (importación lazy para evitar circular). Pre-save hook valida que `deletionStatus === 'anonymized'` no se acompañe de PII visible.
- [X] T007.5 Crear script de migración [scripts/migrate-rgpd-deletionStatus.js](scripts/migrate-rgpd-deletionStatus.js): conecta a Mongo vía `config/database.js`, ejecuta `Usuario.updateMany({deletionStatus:{$exists:false}}, {$set:{deletionStatus:'active'}})` idempotente, loggea conteo de docs actualizados. Añadir entrada a `package.json scripts`: `"migrate:rgpd": "node scripts/migrate-rgpd-deletionStatus.js"`. Ejecutar manualmente 1× antes del primer release y dejar listo para idempotente re-ejecutar si se restaura DB. Sin este script, los `Usuario` existentes quedan con `deletionStatus === undefined` y el middleware T008 puede comportarse incorrectamente.
- [~] T008.5 **DEFERIDA — requiere rebase de worktree sobre main**. Editar [client/src/App.jsx](client/src/App.jsx) para montar `TermsAcceptanceGate` dentro de `AuthProvider` y `CookieBanner` al nivel raíz. Los componentes existen en main (commit `2ca47f5`) pero NO en este worktree (creado antes del commit). Al hacer rebase del worktree sobre main, los archivos estarán disponibles y esta task se puede ejecutar. Marcador `[~]` = deferida en lugar de `[X]` completada o `[ ]` pendiente.
- [X] T008 Editar [middleware/auth.js](middleware/auth.js): leer `Usuario.deletionStatus` después de validar JWT. Si `'anonymized'` → responder 401 con código `account_deleted` y mensaje sobrio. Si `'pending_deletion'` → permitir request pero inyectar header `X-Channelad-Deletion-Pending: true` para que el frontend muestre `DeletionGraceBanner`.
- [X] T009 Crear [routes/rgpd.js](routes/rgpd.js) con router skeleton (sin handlers todavía) y montarlo en [app.js](app.js) bajo `/api/rgpd` siguiendo el patrón lazy-load de `channelIntelligence` (línea ~40 de app.js).
- [X] T010 Crear [routes/adminRgpd.js](routes/adminRgpd.js) con router skeleton + middleware `autenticar + autorizarRoles('admin')` aplicado a todo el router. Montar en [app.js](app.js) bajo `/api/admin/rgpd`.
- [X] T011 Crear [controllers/rgpdController.js](controllers/rgpdController.js) con esqueleto de exports vacíos para los 9 handlers de user API + 5 de admin API (cuerpos `throw new Error('not implemented')` por ahora).
- [X] T012 Crear cron endpoint para `/api/jobs/rgpd-grace` con handler lazy-loaded (patrón de `routes/telegramIntel.js`): valida `CRON_SECRET`, llama a `rgpdExportWorker` y `rgpdDeletionWorker` (no implementados aún), devuelve JSON resumen. Montar en [app.js](app.js). **Corrección de path durante implement**: el archivo se creó en [routes/rgpdGraceCheckJob.js](routes/rgpdGraceCheckJob.js) (no `jobs/`) para alinear con la convención del repo — los cron endpoints viven en `routes/` porque son routers Express; la carpeta `jobs/` contiene funciones puras del job. La descripción original decía "copiar patrón de routes/telegramIntel.js" lo cual confirma routes/.

**Checkpoint**: foundation lista — user stories pueden arrancar (P1 primero, P2/P3 después o en paralelo).

---

## Phase 3: User Story 1 — Eliminación de cuenta (Priority: P1) 🎯 MVP

**Goal**: usuario solicita borrado → confirma por email → 7 días de gracia (cancelable) → liquidación express → anonimización irreversible. Bloqueos por disputas/agencia/último-admin. Sin Stripe live: FR-007.b/c/e quedan `paused_pending_stripe`.

**Independent Test**: ejecutar end-to-end manual del quickstart §"Test E2E manual: Eliminación de cuenta — Caso happy path"; verificar transición de estados, anonimización de PII (test forense T014), cierre de sesiones (FR-003), audit log poblado (SC-006).

### Tests for User Story 1 (FIRST — must FAIL before implementation)

- [ ] T013 [P] [US1] Crear suite integration [tests/rgpdDeletion.integration.test.js](tests/rgpdDeletion.integration.test.js) cubriendo: (a) happy path completo con cron forzado + **assertion de SC-001 (request <90s)** medida con timestamps, (b) bloqueo por disputa abierta (409 `disputes_open`), (c) bloqueo por último admin (409 `last_admin`), (d) bloqueo por agencia con canales (409 `agency_clients_active`, esperando que devuelva 0 por skeleton-ready), (e) cancelación durante gracia, (f) token de confirmación expirado (410), (g) token reutilizado (410), (h) **role denial**: usuario rol=`creator` o `advertiser` intenta `GET /api/admin/rgpd/audit-log` → 403 esperado (cubre FR-022 access control).
- [ ] T014 [P] [US1] Crear suite unit [tests/rgpdAnonymization.unit.test.js](tests/rgpdAnonymization.unit.test.js) cubriendo: (a) las 6 categorías PII de FR-009 sobreescritas correctamente, (b) `referredBy` **del usuario anonimizado preservado** Y `referredBy` de **otros usuarios que apuntaban al usuario anonimizado** sigue apuntando al mismo `_id` (la ref no se rompe, solo cambia la PII visible al popular), (c) `Tracking*` records anonimizados (IP/UA/fingerprint a valores neutros), (d) test forense — queries operativas no devuelven PII original (asserts SC-004), (e) **aserción FR-010**: tras anonimización, documentos `Factura` del usuario siguen recuperables vía `Factura.find({usuarioId})` con todos los campos contables intactos (`numero`, `total`, `iva`, `fechaEmision`, `conceptos`) — solo cambia el snapshot de datos personales asociados. Igual aserción para `Transaccion` y `Retiro`.

### Implementation for User Story 1

- [ ] T015 [P] [US1] Crear modelo [models/AccountDeletionRequest.js](models/AccountDeletionRequest.js) con schema completo de [data-model.md E-1](specs/001-rgpd-delete-export/data-model.md) (campos, state machine, 3 índices incluido TTL en `confirmationTokenExpiresAt`, índice único parcial por `usuarioId+status` activo).
- [ ] T016 [P] [US1] Crear modelo [models/ReservedSlug.js](models/ReservedSlug.js) con `{slug, reservedAt, reservedUntil, originalUserId}`, índice único en `slug`, TTL en `reservedUntil` (90d auto-purge).
- [ ] T017 [US1] Implementar [services/anonymizationService.js](services/anonymizationService.js) como pipeline de pasos: `scrubUsuarioDoc(id)` (6 categorías de FR-009 con mapping de data-model "Mapeo PII"), `scrubTrackingRecords(id)` (sobreescribe IP/UA/fingerprint en Tracking/TrackingFingerprint/TrackingLink), `scrubNotificaciones(id)` (contenido con PII), `reserveSlugIfApplicable(id)` (lee `channelUsername` y persiste `ReservedSlug` si no-null), `logAuditEntry(id, 'deletion.anonymized', stepsCompleted)`. Cada paso loggea independientemente. Exporta `anonymizeUser(id)` orquestador. Depende de T005/T015/T016.
- [ ] T018 [US1] Implementar [workers/rgpdDeletionWorker.js](workers/rgpdDeletionWorker.js) con función `runExpiredGracePeriods()`: query `AccountDeletionRequest.find({status:'grace_period', gracePeriodEndsAt:{$lte:now}})`, transición atómica a `executing_liquidation`, llama `liquidatePendingOperations(usuarioId)` (FR-007.a cancelar borradores; FR-007.b/c/e → marcar `paused_pending_stripe` con audit log + email; FR-007.d → `paused_pending_liquidation`), si OK llama `anonymizationService.anonymizeUser` y marca `executed`. También expone función `runGraceWarnings()` que envía email 24h antes (FR-005).
- [ ] T019 [US1] Implementar handler `POST /api/rgpd/deletion` en [controllers/rgpdController.js](controllers/rgpdController.js): pre-checks FR-006 (Dispute con `status ∈ ['open','under_review']`), FR-008 (último admin), FR-008.a (`tipoPerfil==='agencia'` → query Canal por gestorId aunque devuelva 0 hoy), check de request activa existente. Genera token via `crypto.randomBytes(32).toString('hex')`, hash bcrypt, crea `AccountDeletionRequest` con `confirmationTokenHash` y `confirmationTokenExpiresAt = now + 24h`. Envía email `rgpd-confirm-deletion`. Log audit `deletion.requested`. Wire en `routes/rgpd.js`.
- [ ] T020 [US1] Implementar handler `POST /api/rgpd/deletion/confirm` en [controllers/rgpdController.js](controllers/rgpdController.js): valida `{requestId, token}`, busca `AccountDeletionRequest`, compara token via bcrypt, verifica expiración. Transición atómica `pending_email_confirmation → grace_period` con `confirmedAt=now`, `gracePeriodEndsAt=now+7d`. Vacía `Usuario.sesiones` (FR-003), set `Usuario.deletionStatus='pending_deletion'`. Calcula `liquidationPreview` (campañas Borrador/Pendiente/Activa, escrow EUR, payouts EUR, referralCash EUR, blocked_pending_stripe). Devuelve preview. Envía email `rgpd-grace-started`. Audit `deletion.confirmed`. Wire en `routes/rgpd.js`.
- [ ] T021 [US1] Implementar handler `DELETE /api/rgpd/deletion` en [controllers/rgpdController.js](controllers/rgpdController.js): busca request activa con `status='grace_period'` del usuario actual, transición atómica a `cancelled` con `cancelledReason='user_cancel'`. Set `Usuario.deletionStatus='active'`. Audit `deletion.cancelled` (actor='user'). Wire en `routes/rgpd.js`.
- [ ] T022 [US1] Implementar handler `GET /api/rgpd/deletion/status` en [controllers/rgpdController.js](controllers/rgpdController.js): devuelve estado de la request activa o `{active:false}`. Wire en `routes/rgpd.js`.
- [ ] T023 [US1] Editar [services/emailService.js](services/emailService.js): añadir 4 métodos siguiendo patrón de los 18 existentes — `enviarRgpdConfirmDeletion(user, {token, requestId, expiresAt})`, `enviarRgpdGraceStarted(user, {gracePeriodEndsAt, liquidationPreview})`, `enviarRgpdGraceWarning(user, {gracePeriodEndsAt})`, `enviarRgpdDeletionCompleted(user)`. Cada uno usa `renderTemplate('rgpd-...', vars)`.
- [ ] T024 [US1] Editar [client/src/services/api.js](client/src/services/api.js): añadir métodos `requestAccountDeletion(motivo)`, `confirmAccountDeletion(requestId, token)`, `cancelAccountDeletion()`, `getDeletionStatus()`.
- [ ] T025 [US1] Crear [client/src/ui/components/rgpd/DeletionFlowModal.jsx](client/src/ui/components/rgpd/DeletionFlowModal.jsx): modal con **3 pasos explícitos**: (1) explicación + lista de bloqueos pendientes (monta `PendingOperationsList` de T030 si endpoint devuelve 409 con detalle), (2) `<textarea>` opcional para motivo (max 500 chars), (3) confirmación final con CTA "Enviar solicitud" que llama `requestAccountDeletion`. Copy alineado a wording playbook (sin "rápido"/"fácil", tutea, cifras concretas). Si paso 1 muestra bloqueos, deshabilita avance a paso 2 hasta resolución manual.
- [ ] T026 [US1] Crear [client/src/ui/components/rgpd/DeletionGraceBanner.jsx](client/src/ui/components/rgpd/DeletionGraceBanner.jsx): banner persistente que aparece cuando header `X-Channelad-Deletion-Pending: true` (de T008) o cuando `GET /api/rgpd/deletion/status` devuelve `grace_period`. Muestra fecha exacta de borrado, CTA "Cancelar eliminación".
- [ ] T027 [US1] Crear [client/src/ui/pages/auth/ConfirmDeletionPage.jsx](client/src/ui/pages/auth/ConfirmDeletionPage.jsx): página pública en `/auth/confirm-deletion`, lee `token` e `id` de querystring, requiere sesión activa (redirige a login si no), llama `confirmAccountDeletion`, muestra `liquidationPreview` y CTA final "Confirmar borrado" → redirige a `ConfirmDeletionDonePage`.
- [ ] T028 [US1] Crear [client/src/ui/pages/auth/ConfirmDeletionDonePage.jsx](client/src/ui/pages/auth/ConfirmDeletionDonePage.jsx): landing post-confirmación con fecha de borrado y mención del banner que verá al loguear.
- [ ] T029 [US1] Editar [client/src/routes/AppRoutes.jsx](client/src/routes/AppRoutes.jsx): añadir rutas `/auth/confirm-deletion` y `/auth/confirm-deletion/done`.
- [ ] T030 [US1] Crear [client/src/ui/components/rgpd/PendingOperationsList.jsx](client/src/ui/components/rgpd/PendingOperationsList.jsx): lista interactiva de disputas/canales gestionados/etc. que bloquean el borrado, con enlace a la resolución de cada item. Usado dentro de `DeletionFlowModal`.
- [ ] T031 [US1] Wire del worker en [jobs/rgpdGraceCheckJob.js](jobs/rgpdGraceCheckJob.js): llamar a `rgpdDeletionWorker.runGraceWarnings()` y luego `runExpiredGracePeriods()` en cada ejecución.

**Checkpoint**: US1 funcional end-to-end. Pasa los 7 escenarios del integration test (T013) + test forense (T014). Quickstart §US1 reproducible.

---

## Phase 4: User Story 2 — Export de datos (Priority: P2)

**Goal**: usuario solicita export → worker genera ZIP async (12 archivos del manifest) → email con link JWT 7d → descarga stream.

**Independent Test**: ejecutar quickstart §"Test E2E manual: Export de datos"; verificar contenido del ZIP, expiración del link, rate limit 1/24h.

### Tests for User Story 2

- [ ] T032 [P] [US2] Crear suite integration [tests/rgpdExport.integration.test.js](tests/rgpdExport.integration.test.js) cubriendo: (a) flujo completo request → worker → email → download → contenido del ZIP con los 12 archivos + **aserción de SC-002 (request <30s)** medida con timestamps en el endpoint POST, (b) rate limit `1/24h` → reuso del existente, (c) link expirado → 410 `link_expired`, (d) JWT inválido → 401 `token_invalid`, (e) descarga doble (downloadedAt registrado una sola vez), (f) usuario sin datos genera ZIP mínimo válido, (g) usuario con > 15 MB de datos → fallback a GridFS (verificar `gridfsId` no null y `packageData` null).

### Implementation for User Story 2

- [ ] T033 [P] [US2] Crear modelo [models/DataExportRequest.js](models/DataExportRequest.js) con schema completo de [data-model.md E-2](specs/001-rgpd-delete-export/data-model.md) (state machine, índices, TTL en `expiresAt`, XOR `packageData`/`gridfsId` en pre-save).
- [ ] T034 [US2] Implementar [services/dataExportService.js](services/dataExportService.js) con función `buildExportZip(usuarioId)`: agrega datos de 12 colecciones → JSON estructurado por archivo → empaqueta con `archiver` → devuelve Buffer (≤ 15 MB) o stream a GridFS bucket `rgpdExports`. **Recomendación de implementación**: estructurar el servicio como 3 funciones cohesivas (acepta granularidad gruesa pero permite testing independiente y mejor reporting de fallos): `buildCoreData(usuarioId)` (profile, campaigns, transactions, invoices), `buildActivityData(usuarioId)` (disputes, reviews, notifications, conversions, retirosolicitudes), `buildChannelData(usuarioId)` (channels x N + tracking-summary agregado, solo si creator). Si una falla, las otras se completan y el manifest reporta cuál falló. Manifest documenta inclusiones + exclusiones (password, 2FA secrets, tokens vivos, push subscriptions, Stripe IDs) + función fallida si aplica. README en castellano.
- [ ] T035 [US2] Implementar [workers/rgpdExportWorker.js](workers/rgpdExportWorker.js) con función `runPendingExports()`: query FIFO `DataExportRequest.find({status:'queued'}).sort({requestedAt:1}).limit(10)`. Para cada: transición atómica a `processing`, llama `buildExportZip`, persiste resultado (Buffer o GridFS ref), marca `ready` con `completedAt` y `expiresAt=now+7d`, envía email `rgpd-export-ready` con JWT firmado. Retry up to 3 con backoff exponencial si falla → marca `failed` con `failureReason`.
- [ ] T036 [US2] Implementar handler `POST /api/rgpd/export` en [controllers/rgpdController.js](controllers/rgpdController.js): rate limit check (FR-018 — buscar request `<24h` no-failed; si existe devolver `reused:true`). Crear `DataExportRequest` `status='queued'`. Devolver 202 con `estimatedReadyAt = now + 30 min`. Audit `export.requested`. Wire en `routes/rgpd.js`.
- [ ] T037 [US2] Implementar handler `GET /api/rgpd/export/status` en [controllers/rgpdController.js](controllers/rgpdController.js): devuelve la última request del usuario; si `status='ready'`, incluye `downloadUrl` firmado. Wire en `routes/rgpd.js`.
- [ ] T038 [US2] Implementar handler `GET /api/rgpd/export/download/:requestId` en [controllers/rgpdController.js](controllers/rgpdController.js): valida JWT con `RGPD_EXPORT_SIGNING_KEY`, verifica claim `requestId` coincide con path, busca request `status='ready' && expiresAt>now`. Stream del ZIP (desde Buffer o GridFS) con `Content-Type: application/zip`, `Content-Disposition: attachment`, `Cache-Control: no-store`, `Content-Encoding: identity`. Primer download → set `downloadedAt`. Audit `export.downloaded` con IP/UA. Wire en `routes/rgpd.js` (sin middleware de auth).
- [ ] T039 [US2] Añadir método `enviarRgpdExportReady(user, {downloadUrl, expiresAt, packageSize})` en [services/emailService.js](services/emailService.js).
- [ ] T040 [US2] Editar [client/src/services/api.js](client/src/services/api.js): añadir métodos `requestDataExport()`, `getExportStatus()`.
- [ ] T041 [US2] Crear [client/src/ui/components/rgpd/ExportFlowModal.jsx](client/src/ui/components/rgpd/ExportFlowModal.jsx): modal con **2 pasos**: (1) explicación de qué se incluye (los 12 archivos del manifest, en lista) y qué se excluye (password/2FA secrets/tokens vivos/Stripe IDs — para transparencia), (2) confirmación + CTA "Solicitar mi archivo" que llama `requestDataExport`. Al éxito, mostrar mensaje persistente "Estamos preparando tu archivo. Recibirás un email cuando esté listo (≤24h)". Si existe export reciente activo (`reused: true`), mostrar mensaje alternativo "Tienes una solicitud reciente en preparación. Verás el email en breve.". Copy playbook-compliant.
- [ ] T042 [US2] Wire del worker en [jobs/rgpdGraceCheckJob.js](jobs/rgpdGraceCheckJob.js): llamar a `rgpdExportWorker.runPendingExports()` antes de los workers de deletion del T031. **Dependencia explícita**: T042 edita el mismo archivo que T031. Si US1 y US2 se trabajan en paralelo, T042 debe esperar a T031 mergeado (o coordinar el wiring en commit conjunto al final de US2).

**Checkpoint**: US2 funcional end-to-end. Pasa los 6 escenarios del integration test (T032). Quickstart §US2 reproducible.

---

## Phase 5: User Story 3 — Página "Mis derechos RGPD" (Priority: P3)

**Goal**: sección "Privacidad y datos" en panel de configuración de ambos roles (advertiser/creator), lista los 6 derechos con plazo legal, botones para los endpoints disponibles, mailto al DPO para los demás.

**Independent Test**: navegar a settings de ambos roles, verificar que los 6 derechos están listados con el formato del playbook, botones de Acceso/Supresión/Portabilidad llevan a los flujos correctos, botones de Rectificación/Oposición/Limitación abren mailto correcto.

### Implementation for User Story 3

- [ ] T043 [P] [US3] Implementar handler `GET /api/rgpd/rights` en [controllers/rgpdController.js](controllers/rgpdController.js): devuelve los 6 derechos en formato del contract [rgpd-user-api.md §GET /api/rgpd/rights](specs/001-rgpd-delete-export/contracts/rgpd-user-api.md). Cuando SPEC-C3 (i18n) esté lista, devolver según `Accept-Language`. Por ahora siempre castellano. Wire en `routes/rgpd.js`.
- [ ] T044 [P] [US3] Editar [client/src/services/api.js](client/src/services/api.js): añadir método `getRGPDRights()`.
- [ ] T045 [P] [US3] Crear [client/src/ui/components/rgpd/RGPDRightsList.jsx](client/src/ui/components/rgpd/RGPDRightsList.jsx): renderiza lista de los 6 derechos con explicación de una línea, plazo legal "30 días naturales", y el botón apropiado por tipo (`endpoint` → trigger flujo, `ui` → Link react-router, `email` → mailto).
- [ ] T046 [US3] Crear [client/src/ui/components/rgpd/PrivacySection.jsx](client/src/ui/components/rgpd/PrivacySection.jsx): compone `RGPDRightsList` + botones secundarios "Eliminar mi cuenta" (abre `DeletionFlowModal` de T025) y "Descargar mis datos" (abre `ExportFlowModal` de T041). Incluye banner de gracia si aplica (estado actual via `getDeletionStatus`). Depende de T025, T041, T045.
- [ ] T047 [US3] Editar [client/src/ui/pages/dashboard/advertiser/SettingsPage.jsx](client/src/ui/pages/dashboard/advertiser/SettingsPage.jsx): montar `<PrivacySection />` como nueva sección con título "Privacidad y datos". Sin tocar el resto del archivo (regla no-eliminar).
- [ ] T048 [US3] Editar [client/src/ui/pages/dashboard/creator/CreatorSettingsPage.jsx](client/src/ui/pages/dashboard/creator/CreatorSettingsPage.jsx): mismo montaje que T047.

**Checkpoint**: US3 visible y funcional en ambos paneles. Los 3 user stories completos e integrados.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: endpoints admin (admin API completa), wiring Sentry en workers, revisión de wording, ejecución de pre-flight checklist.

- [ ] T049 Implementar handler `GET /api/admin/rgpd/requests` en [controllers/rgpdController.js](controllers/rgpdController.js) con filtros `type/status/limit/skip`. Wire en `routes/adminRgpd.js`. Audit `admin.audit_viewed`.
- [ ] T050 Implementar handler `POST /api/admin/rgpd/requests/:id/force-execute` (transición desde `paused_pending_*` → `executing_liquidation`). Wire en `routes/adminRgpd.js`. Audit `deletion.force_executed`.
- [ ] T051 Implementar handler `POST /api/admin/rgpd/requests/:id/cancel` (admin override). Wire en `routes/adminRgpd.js`. Audit `deletion.cancelled_by_admin`. Envía email al usuario notificando cancelación con `adminNote`.
- [ ] T052 Implementar handler `GET /api/admin/rgpd/audit-log` con filtros `usuarioId/action/from/to`. Wire en `routes/adminRgpd.js`. Audit `admin.audit_viewed` (recursivo).
- [ ] T053 Implementar handler `GET /api/admin/rgpd/users/:id/dossier` (resumen RGPD de un usuario para soporte DPO). Wire en `routes/adminRgpd.js`. Audit `admin.dossier_viewed`.
> **Nota sobre T049–T053**: las cinco editan el mismo `controllers/rgpdController.js` y `routes/adminRgpd.js`, por lo que **NO son paralelizables**. Ejecutar secuencialmente; cada handler en su commit independiente para granularidad de revisión.
- [ ] T054 [P] Crear [client/src/ui/pages/admin/AdminRGPDPage.jsx](client/src/ui/pages/admin/AdminRGPDPage.jsx): tabla de solicitudes pendientes (deletion + export) con acciones `force-execute` / `cancel`. Filtros básicos por estado.
- [ ] T055 Wire Sentry en los 2 workers ([workers/rgpdDeletionWorker.js](workers/rgpdDeletionWorker.js) y [workers/rgpdExportWorker.js](workers/rgpdExportWorker.js)): llamar `sentry.captureException(err, {worker, requestId})` en cualquier `catch` no esperado. **Depende de T055.5** (wiring global hecho primero).
- [ ] T055.5 Wire global de Sentry en [app.js](app.js): añadir `const sentry = require('./lib/sentry')` al top, llamar `sentry.init()` después de cargar config y antes de `mongoose.connect()`, montar `app.use(sentry.requestHandler)` antes del primer `app.use` de routes, montar `app.use(sentry.errorHandler)` antes del error middleware final. Documentado en JSDoc de `lib/sentry.js` (commit `30ed16d` en main). Sin esto, los `captureException` de T055 son no-op silenciosos.
- [ ] T056 Revisión wording de todo el copy generado (5 templates email + DeletionFlowModal + ExportFlowModal + PrivacySection + ConfirmDeletionPage + DeletionGraceBanner) contra la checklist 6 del [wording-playbook.md §9](.specify/memory/wording-playbook.md#9-checklist-pre-publicación-las-6). Cada texto debe pasar las 6 antes de mergear. **Mini-checklist explícito de verificaciones adicionales**:
  - [ ] Dirección DPO operativa real configurada (sustituir placeholder `dpo@channelad.io` por la elegida; confirmar buzón monitorizado).
  - [ ] `7 días` en email `rgpd-grace-started` y banner `DeletionGraceBanner`.
  - [ ] `24 horas` en email `rgpd-confirm-deletion` y página `ConfirmDeletionPage`.
  - [ ] `7 días` en email `rgpd-export-ready`.
  - [ ] `30 días naturales` en `RGPDRightsList` (plazo legal RGPD por derecho).
  - [ ] `6 años` mencionado en política de privacidad actualizada (retención fiscal LGT 58/2003).
  - [ ] Cero emojis en hero/CTA/asunto email (regla 10 anti-patrones playbook).
  - [ ] Aclaración de FR-024: la fórmula incidencia §6.4 aplica a errores **operativos** (token expirado, gracia bloqueada por disputas, KYC pendiente). Errores de validación HTTP 400 simples (e.g., motivo > 500 chars) mantienen formato corto y directo. No forzar la fórmula donde es awkward.
- [ ] T057 [P] Actualizar [README.md](README.md) con sección "RGPD" describiendo los flujos disponibles, el endpoint del DPO operativo (placeholder hasta confirmación), y referencia a las rutas `/api/rgpd/*` y `/api/admin/rgpd/*`.
- [ ] T058 Ejecutar el pre-flight checklist completo del [quickstart.md §"Pre-flight checklist"](specs/001-rgpd-delete-export/quickstart.md#pre-flight-checklist-antes-de-primer-release) en entorno staging. 9 items binarios, todos en verde antes de release.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin deps; arranca inmediato.
- **Foundational (Phase 2)**: depende de Phase 1 cerrado; BLOQUEA Phase 3+.
- **US1 (Phase 3)**: arranca tras Phase 2.
- **US2 (Phase 4)**: arranca tras Phase 2 — puede ir en paralelo con US1 si hay dos desarrolladores.
- **US3 (Phase 5)**: arranca tras Phase 2 técnicamente, pero **necesita T025 (DeletionFlowModal) y T041 (ExportFlowModal) para que los botones de PrivacySection funcionen**. Recomendable: tras US1 y US2.
- **Polish (Phase 6)**: arranca tras todos los user stories que vayan a estar en el release.

### Dependencias internas críticas

- T005 (RGPDAuditLog) bloquea T006, T017, T018, T019–T022, T035, T036–T038, T049–T053.
- T007 (Usuario.deletionStatus) bloquea T008 (middleware), T015 (AccountDeletionRequest references it indirectly), T017 (anonymizationService).
- T011 (rgpdController skeleton) bloquea T019, T020, T021, T022, T036, T037, T038, T043, T049–T053.
- T015 (AccountDeletionRequest) bloquea T018 (worker), T019, T020, T021, T022, T030.
- T016 (ReservedSlug) bloquea T017 (anonymizationService → reserveSlugIfApplicable).
- T017 (anonymizationService) bloquea T018 (worker llama anonymizeUser).
- T033 (DataExportRequest) bloquea T034 (service), T035 (worker), T036, T037, T038.
- T034 (dataExportService) bloquea T035 (worker).
- T031 + T042 (cron wires) deben hacerse después de los workers existir.
- T046 (PrivacySection) depende de T025 + T041 + T045.

### Parallel opportunities

- **Setup**: T003, T004 paralelizables entre sí (T001, T002 también pero comparten cambios menores en archivos config).
- **Foundational**: T005 y T007 paralelizables; T009 y T010 paralelizables; T012 después de T009/T010.
- **US1 tests**: T013 y T014 paralelizables.
- **US1 models**: T015 y T016 paralelizables.
- **US1 frontend (T024–T030)**: T024 (api.js), T025 (DeletionFlowModal), T026 (DeletionGraceBanner), T027 (ConfirmDeletionPage), T028 (Done page), T029 (routes), T030 (PendingOperationsList) — la mayoría son archivos distintos, todos paralelizables excepto T029 que toca AppRoutes (compartido).
- **US2**: T033 paralelizable con cualquier task de US1 (modelos distintos).
- **US3 inicial**: T043 (backend handler), T044 (api.js), T045 (RGPDRightsList) — los 3 paralelizables.
- **Polish admin**: T049–T053 todos paralelizables entre sí; cada uno es un handler distinto en el controller (cuidado: si comparten líneas próximas en `rgpdController.js`, merge conflict probable).

---

## Parallel Example: User Story 1

```bash
# Tests primero (deben fallar antes de implementar):
Task: "tests/rgpdDeletion.integration.test.js"          # T013
Task: "tests/rgpdAnonymization.unit.test.js"            # T014

# Modelos en paralelo:
Task: "models/AccountDeletionRequest.js"                # T015
Task: "models/ReservedSlug.js"                          # T016

# Frontend componentes en paralelo (cada uno archivo distinto):
Task: "client/src/ui/components/rgpd/DeletionFlowModal.jsx"     # T025
Task: "client/src/ui/components/rgpd/DeletionGraceBanner.jsx"   # T026
Task: "client/src/ui/components/rgpd/PendingOperationsList.jsx" # T030
Task: "client/src/ui/pages/auth/ConfirmDeletionPage.jsx"        # T027
Task: "client/src/ui/pages/auth/ConfirmDeletionDonePage.jsx"    # T028
```

---

## Implementation Strategy

### MVP First (User Story 1 + 3 mínimo)

1. Phase 1 Setup completa.
2. Phase 2 Foundational completa.
3. Phase 3 US1 completa → **test independiente passing**.
4. Phase 5 US3 mínima (solo el botón "Eliminar mi cuenta" wired; el de "Descargar mis datos" deshabilitado con tooltip "Próximamente") → garantiza discoverability legal.
5. **PARAR Y VALIDAR**: cumplimiento RGPD básico (Art. 17 + transparencia) verificado en staging.
6. Deploy si pasa pre-flight checklist (T058 parcial).

Este sub-MVP es lo mínimo legalmente aceptable. US2 (export) puede shippear en una iteración posterior dentro del mismo sprint sin bloquear la conformidad básica.

### Incremental Delivery

1. Setup + Foundational → infra lista.
2. US1 → Deploy/Demo (cumplimiento Art. 17).
3. US2 → Deploy/Demo (cumplimiento Art. 15 + 20 completo).
4. US3 → Deploy/Demo (transparencia visible al usuario en settings).
5. Polish: admin endpoints + Sentry + revisión wording + pre-flight final.

### Parallel team strategy

Con 2 desarrolladores:
- Dev A: Phase 2 Foundational + Phase 3 US1.
- Dev B: arranca Phase 4 US2 en cuanto T005, T007, T011, T012 estén listos (≈ tras 4–6h de Dev A).
- Ambos convergen en Phase 5 US3 + Phase 6 Polish.

---

## Notes

- [P] = archivo distinto, sin dep en pendientes.
- Cada user story es independientemente shippable; el MVP mínimo legal es US1 + sub-US3 (solo botón borrado).
- Tests T013/T014/T032 escritos PRIMERO y deben FALLAR antes de implementar (TDD enforced por el spec template).
- Commit por tarea o por grupo lógico. Ningún commit cierra un US sin pasar su test independiente.
- Política no-eliminar: ningún task elimina código existente. Las ediciones de archivos existentes (Usuario.js, SettingsPage.jsx, CreatorSettingsPage.jsx, AppRoutes.jsx, app.js, vercel.json, validateEnv.js, emailService.js) solo añaden.

---

## Review Log

- **2026-05-18 — Review crítica de tasks.md vs paths reales**: corregidos 5 puntos (T049–T053 sin [P], T014 con FR-010, T007 con migración nota, T056 con DPO, T004 i18n-ready).

- **2026-05-18 — `/speckit-analyze` cross-artifact**: 0 CRITICAL, 3 HIGH, 5 MEDIUM, 8 LOW. Aplicadas todas excepto C2 (FR-024 scope se aclara en T056 wording review):
  - **A1** (Vercel cron tier): T002 ajustado a `0 * * * *` horario con nota explícita sobre Hobby tier (max 2 crons; opciones de consolidación si excede).
  - **A2** (Sentry wiring missing): nueva T055.5 que edita `app.js` para `sentry.init()` + middleware. T055 ahora depende de T055.5.
  - **A3** (migration as task): promovida a T007.5 con path `scripts/migrate-rgpd-deletionStatus.js` y entrada en `package.json scripts`.
  - **A4** (TermsAcceptanceGate mount): nueva T008.5 para verificar y wirear `TermsAcceptanceGate` + `CookieBanner` en `client/src/App.jsx`.
  - **B1** (T031/T042 cron conflict): nota explícita de dependencia en T042.
  - **B2** (modal steps ambiguity): T025 y T041 expandidas con steps explícitos (3 y 2 respectivamente).
  - **B4** (T034 granularidad): recomendación de split en 3 funciones cohesivas (buildCoreData, buildActivityData, buildChannelData) para reporting fino de fallos.
  - **B5/B6** (cosmetic): conteo "12 ediciones" consistente; T053b convertido a callout `>` (sin ID propio).
  - **C1/C5/C7** (tests): T013 añade aserciones SC-001 (<90s) y role denial 403; T014 añade preservación de `referredBy` desde terceros; T032 añade SC-002 (<30s) y test de fallback GridFS > 15 MB.
  - **C3** (T056 checklist): mini-checklist explícito de 8 ítems verificables.
  - **C8** (quickstart 12 files): paso 9 actualizado con los 12 archivos del manifest + carpeta channels/.

## Métricas de tasks

- **Total**: 61 tareas (58 original + T007.5 + T008.5 + T055.5; T053b convertido a callout `>` sin ID).
- **Por user story**: US1 = 19 (T013–T031) · US2 = 11 (T032–T042) · US3 = 6 (T043–T048).
- **Setup**: 4 · **Foundational**: 8 · **Polish**: 10.
- **Tests**: 3 suites (1 unit + 2 integration) — escritas en T013, T014, T032.
- **Paralelizables [P]**: 13 (reducido de 18 reales tras quitar [P] mal puesto en T049–T053 — comparten archivo controller/router; nota original "21" era estimación previa).
- **Edits a archivos existentes**: 12 (validateEnv.js, vercel.json, package.json, Usuario.js, auth.js, app.js, emailService.js, api.js, AppRoutes.jsx, SettingsPage.jsx, CreatorSettingsPage.jsx, App.jsx, README.md) — todas son adiciones, regla no-eliminar respetada.
- **Archivos nuevos**: 4 modelos + 3 services + 2 workers + 1 job + 2 routes + 1 controller + 5 templates email + 6 componentes React + 2 páginas auth + 1 página admin = **27 archivos nuevos**.
