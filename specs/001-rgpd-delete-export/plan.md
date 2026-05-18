# Implementation Plan: Eliminación de cuenta + Export de datos (RGPD)

**Branch**: `claude/sad-hawking-99a5d2` | **Date**: 2026-05-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-rgpd-delete-export/spec.md`

## Summary

Implementar el primer flujo RGPD operativo de Channelad: solicitud de eliminación de cuenta (Art. 17) con confirmación por email, 7 días de gracia, liquidación express de operaciones pendientes (FR-007.a/b/c/d/e con fasing técnico hasta SPEC-F1+F2 Stripe), anonimización irreversible de 6 categorías de PII preservando integridad referencial; y export de datos personales (Art. 15 + 20) generado async, entregado por email con enlace temporal de 7 días. Más una página "Tus derechos RGPD" embebida en `SettingsPage.jsx` y `CreatorSettingsPage.jsx`, y un audit log inmutable `RGPDAuditLog` separado del `AuthAuditLog` existente.

Enfoque técnico: tres modelos nuevos (`AccountDeletionRequest`, `DataExportRequest`, `RGPDAuditLog`) + un modelo auxiliar (`ReservedSlug` para FR-012.a), dos workers (`rgpdExportWorker`, `rgpdDeletionWorker`), un cron job que los dispara cada 10 min, dos routers nuevos (`/api/rgpd/*` usuario y `/api/admin/rgpd/*` admin/DPO), un componente React `PrivacySection` reutilizable montado en ambos paneles de settings, y la página pública `/auth/confirm-deletion?token=...`. Reutiliza patrones existentes: token via `crypto.randomBytes(32)` + bcrypt hash (igual que `emailVerificationToken`), cron lazy-loaded (igual que `telegramIntel`), Vercel cron schedule. Cero dependencia de Stripe live para el flujo Fase 1 (cancelación de borradores/pendientes); Fase 2 desbloqueada cuando SPEC-F1+F2 estén operativos.

## Technical Context

**Language/Version**: Node.js ≥ 16 (backend) · React 18 (frontend) · ECMAScript 2022. Coincide con stack vigente del repo.

**Primary Dependencies**:
- Backend: `express ^4.18`, `mongoose ^7.5`, `bcryptjs ^2.4.3` (hash de tokens), `jsonwebtoken ^9.0.2` (firma JWT del download URL — **ya presente en deps**), `crypto` (nativo), `nodemailer ^6.9` (vía `services/emailService.js` existente con método `renderTemplate(name, vars)`), **`archiver`** (NEW: empaquetar ZIP del export — ~700 KB unpacked, pure JS, sin nativas; compatible Vercel Lambda).
- Frontend: `react ^18`, `react-router-dom ^6`, ya presentes. Sin nuevas deps.
- Cron: Vercel Cron (declarado en `vercel.json`, ya hay 3 crons activos como precedente: `telegramIntel` 02:30 UTC, `multiplatformIntel` 04:00 UTC, `tgstat-discover` lunes 05:00 UTC).

**Storage**: MongoDB Atlas (mismo cluster que el resto de modelos). 4 colecciones nuevas: `accountdeletionrequests`, `dataexportrequests`, `rgpdauditlogs`, `reservedslugs`. Mutaciones en `usuarios` para anonimización (en su sitio, preservando `_id` para integridad referencial).

**Testing**: Jest ≥ 29 + Supertest (existente). Tres suites nuevas: `tests/rgpdDeletion.integration.test.js`, `tests/rgpdExport.integration.test.js`, `tests/rgpdAnonymization.unit.test.js`. Test forense incluido: verificar que tras anonimización ninguna consulta operativa devuelve PII (cubre SC-004).

**Target Platform**: Vercel serverless functions (backend) + Vercel static (frontend). Crons en Vercel Cron. Compatible con Node ≥ 16.

**Project Type**: web fullstack (monorepo existente, backend en raíz + `client/`).

**Performance Goals**:
- Endpoint de solicitud (`POST /api/rgpd/deletion`) < 200 ms p95.
- Endpoint de export (`POST /api/rgpd/export`) < 200 ms p95 (encola, no procesa).
- Generación de ZIP en worker: SLA suave < 24 h, target hard < 5 min para usuarios MVP (típicamente < 50 campañas).
- Cron de gracia + worker: cada 10 min, latencia max desde fin de gracia hasta ejecución ≈ 10 min.

**Constraints**:
- Sin Stripe live → FR-007.b/c/e quedan en `paused_pending_stripe`. La spec lo anticipa.
- Vercel function timeout 60 s en plan Pro (asumido); si export tarda más, se trocea (fanout cada 100 campañas).
- Tamaño máximo de Mongo doc 16 MB → si export ZIP excede, usar GridFS (improbable para MVP).
- Cero secretos en repo. `RGPD_TOKEN_SECRET` y `RGPD_EXPORT_SIGNING_KEY` se añaden a `config/validateEnv.js` y a la lista de envs prod.

**Scale/Scope**:
- Volumen previsto MVP: < 5 solicitudes RGPD/día.
- Datos por usuario típico MVP: < 50 campañas, < 100 transacciones, < 20 mensajes en disputa, 0–3 canales si creator.
- Tamaño ZIP estimado por usuario MVP: < 2 MB (texto JSON + manifest, sin assets binarios pesados).

## Constitution Check

> Gate Phase 0: PASS (alineamiento ya confirmado en spec, sección "Constitution Check"). Re-evaluación post-Phase 1 al final de este plan.

Resumen del alineamiento (detalle en spec):

| Principio | Cumplimiento |
|---|---|
| I. Verificable | Audit log inmutable, tests forenses, SC-004/005/006 cuantitativos |
| II. Directo | Derechos visibles en settings con plazo y mecanismo; vocab prohibido vetado en FR-024 |
| III. Localizado | Marco RGPD + retención fiscal ES 6 años + DPO email + i18n preparado |
| IV. Operativo | Cifras concretas en todos los plazos; estados claros |
| V. Reparador | FR-006/007.d/008/008.a definen protocolos; emails de salvaguarda |

## Project Structure

### Documentation (this feature)

```text
specs/001-rgpd-delete-export/
├── plan.md              # Este archivo
├── spec.md              # Especificación funcional
├── research.md          # Phase 0 output (decisiones técnicas)
├── data-model.md        # Phase 1 output (entidades, state machines)
├── quickstart.md        # Phase 1 output (cómo testear E2E local)
├── contracts/           # Phase 1 output (REST contracts)
│   ├── rgpd-user-api.md
│   └── rgpd-admin-api.md
├── checklists/
│   └── requirements.md  # Validación pre-plan (en verde)
└── tasks.md             # Phase 2 output (/speckit-tasks - aún no creado)
```

### Source Code (repository root)

Estructura web fullstack existente (Node+Express raíz, React+Vite en `client/`). Esta feature **añade** los siguientes archivos y **modifica** los marcados con ✎.

```text
# Backend (raíz)
models/
├── AccountDeletionRequest.js      # NEW — solicitud de borrado con state machine
├── DataExportRequest.js           # NEW — solicitud de export
├── RGPDAuditLog.js                # NEW — log inmutable append-only
├── ReservedSlug.js                # NEW — slug creator reservado 90d post-borrado
└── Usuario.js                     # ✎ EDIT — añadir anonimización helpers + estado deletionStatus

routes/
├── rgpd.js                        # NEW — endpoints usuario (/api/rgpd/*)
└── adminRgpd.js                   # NEW — endpoints admin/DPO (/api/admin/rgpd/*)

controllers/
└── rgpdController.js              # NEW — orquestación de los flujos

services/
├── anonymizationService.js        # NEW — pipeline: scrubUsuarioDoc + scrubTrackingRecords + scrubNotificaciones + reserveSlugIfApplicable + logAuditEntry
├── dataExportService.js           # NEW — generación ZIP + manifest (12 archivos incluyendo invoices, reviews, notifications, tracking-summary, conversions, retirosolicitudes)
├── rgpdAuditService.js            # NEW — escritura append-only del log
└── emailService.js                # ✎ EDIT — añadir 5 métodos para los 5 templates RGPD nuevos

workers/
├── rgpdExportWorker.js            # NEW — procesa cola DataExportRequest pendiente
└── rgpdDeletionWorker.js          # NEW — ejecuta anonimización tras fin de gracia

jobs/
└── rgpdGraceCheckJob.js           # NEW — cron cada 10 min que dispara los 2 workers

middleware/
└── auth.js                        # ✎ EDIT — añadir guard `pending_deletion` para reactivar cuenta al login

email-templates/
├── rgpd-confirm-deletion.html     # NEW — token 24h
├── rgpd-grace-started.html        # NEW — confirmación de inicio de gracia
├── rgpd-grace-warning.html        # NEW — 24h antes del fin
├── rgpd-deletion-completed.html   # NEW — confirmación de borrado ejecutado
└── rgpd-export-ready.html         # NEW — enlace de descarga listo

config/
└── validateEnv.js                 # ✎ EDIT — RGPD_TOKEN_SECRET, RGPD_EXPORT_SIGNING_KEY

vercel.json                        # ✎ EDIT — añadir cron /api/jobs/rgpd-grace cada 10 min

app.js                             # ✎ EDIT — montar routes/rgpd.js y routes/adminRgpd.js

tests/
├── rgpdDeletion.integration.test.js   # NEW — flujo completo (req → confirm → gracia → exec)
├── rgpdExport.integration.test.js     # NEW — flujo completo (req → worker → download)
└── rgpdAnonymization.unit.test.js     # NEW — scrubber por categoría + test forense

# Frontend (client/)
client/src/ui/pages/dashboard/advertiser/SettingsPage.jsx       # ✎ EDIT — montar PrivacySection
client/src/ui/pages/dashboard/creator/CreatorSettingsPage.jsx   # ✎ EDIT — montar PrivacySection
client/src/ui/pages/auth/ConfirmDeletionPage.jsx                # NEW — página pública del enlace email
client/src/ui/pages/auth/ConfirmDeletionDonePage.jsx            # NEW — landing post-confirmación

client/src/ui/components/rgpd/PrivacySection.jsx                # NEW — sección reutilizable
client/src/ui/components/rgpd/RGPDRightsList.jsx                # NEW — listado 6 derechos (US3)
client/src/ui/components/rgpd/DeletionFlowModal.jsx             # NEW — modal multi-step
client/src/ui/components/rgpd/ExportFlowModal.jsx               # NEW — modal export
client/src/ui/components/rgpd/DeletionGraceBanner.jsx           # NEW — banner persistente durante gracia
client/src/ui/components/rgpd/PendingOperationsList.jsx         # NEW — lista para FR-008.a (canales gestionados)

client/src/routes/AppRoutes.jsx                                 # ✎ EDIT — añadir 2 rutas auth nuevas
client/src/services/api.js                                      # ✎ EDIT — métodos RGPD

# Admin
client/src/ui/pages/admin/AdminRGPDPage.jsx                     # NEW — UI mínima FR-023
```

**Structure Decision**: web fullstack (Option 2). Coincide con la estructura ya en producción (Express raíz + Vite client). Cero migración estructural; solo añade ficheros y edita los marcados.

## Review Log

- **2026-05-18 — Review crítica del plan vs código real**: confirmadas las siguientes asunciones (✓) y corregidas las siguientes desviaciones (✎). Plan/data-model/contracts editados en el mismo commit.
  - ✓ `jsonwebtoken ^9.0.2` ya en deps (no es nueva).
  - ✓ `bcryptjs ^2.4.3`, `mongoose ^7.5`, `nodemailer ^6.9` ya en deps. `emailService.renderTemplate(name, vars)` existe y se usa para 18 templates actuales.
  - ✓ `CRON_SECRET` ya `required` en `config/validateEnv.js:46`. Tres crons activos como precedente.
  - ✓ Paths `client/src/ui/pages/dashboard/{advertiser,creator}/{SettingsPage,CreatorSettingsPage}.jsx` confirmados.
  - ✓ `middleware/auth.js` confirmado.
  - ✎ **Modelo es `Dispute` (inglés), no `Disputa`**. Status enum real: `'open' | 'under_review' | 'resolved_advertiser' | 'resolved_creator' | 'closed'`. Campos relevantes: `openedBy`, `againstUser`. Bloquean borrado solo los dos primeros estados. Data-model y contracts actualizados.
  - ✎ **`Canal.gestorId` no existe**: FR-008.a (bloqueo por agencia con canales de clientes) implementado como skeleton-ready — query devuelve siempre 0 hasta que el campo entre en producción por feature futura. Documentado en data-model "Future-ready" y en el contract de error 409 agency_clients_active.
  - ✎ **`getPublicCreatorProfile` endpoint no existe todavía** (ruta `/c/:slug` está pero backend incompleto). FR-012.a (reservar slug 90d) implementación es preventiva — el `ReservedSlug` se inserta igualmente y activará la protección cuando el endpoint público se complete. Documentado.
  - ✎ **Export ampliado** de 8 a 12 archivos: añadidos `invoices.json`, `reviews.json`, `notifications.json`, `tracking-summary.json` (agregado, no eventos crudos), `conversions.json`, `retirosolicitudes.json`. Basado en modelos reales del repo (`Factura`, `Review`, `Notificacion`, `Tracking*`, `Conversion`, `Retiro`).
  - ✎ **Anonimización ampliada**: además de los campos en `Usuario`, scrubea `Tracking*` collections (IP/UA/fingerprint) y sobreescribe contenido de `Notificacion` si contiene PII transcrita. `Retiro` y `Review` se conservan intactos (FK al usuarioId anonimizado basta). Documentado en data-model como pipeline de pasos en `anonymizationService`.
  - **Decisión sobre convención `RGPDAuditLog` vs `AuthAuditLog`**: mantengo divergencia intencional (`usuarioId`/`action` vs `user`/`event`) para señalizar separación de dominios. Documentado en data-model "Modelos existentes referenciados".

## Complexity Tracking

Sin violaciones del Constitution Check. Tres decisiones que merecen justificación explícita:

| Decisión | Por qué necesaria | Alternativa más simple rechazada porque |
|---|---|---|
| 4 colecciones nuevas (vs reutilizar `AuthAuditLog` o sub-doc en Usuario) | Audit RGPD necesita inmutabilidad estricta (append-only) y retención independiente; estados de borrado/export deben ser consultables sin escanear `Usuario` | Reutilizar `AuthAuditLog` mezclaría dominios con requisitos legales distintos (Spec, Assumptions). Sub-doc en Usuario rompe la inmutabilidad si Usuario se anonimiza. |
| Workers separados (`rgpdExportWorker` + `rgpdDeletionWorker`) vs uno solo | Permiten escalado independiente y diferente ventana de retry (export reintenta más agresivo que deletion) | Worker único acopla ciclos: si export tarda, borrado se atrasa. |
| Servicio `anonymizationService` schema-aware (vs scrubber genérico template) | FR-009 enumera 6 categorías con tratamiento distinto (referrals preservados parcial vs secretos wipe total). Test forense (SC-004) más fácil de aserto si funciones discretas. | Scrubber genérico haría imposible verificar que `googleId` se limpia y `referredBy` se conserva con la misma regla. |

## Phase 0 Outputs

→ Ver [research.md](./research.md). Decisiones cerradas: estrategia anonimización in-place, audit log append-only collection, download token = JWT firmado 7d, generación async vía worker, patrón token reutiliza emailVerificationToken, almacenamiento ZIP en Mongo (Buffer < 15 MB / GridFS si supera).

## Phase 1 Outputs

→ Ver [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md).

## Constitution Check — Re-evaluation post Phase 1

Pasada de revisión con las decisiones de diseño cerradas:

- **I. Verificable** ✓ — `RGPDAuditLog` append-only sin endpoint de update/delete; test forense `rgpdAnonymization.unit.test.js` verifica que ninguna consulta operativa devuelve PII; `SC-006` cumplible cruzando logs vs solicitudes ejecutadas.
- **II. Directo** ✓ — `PrivacySection` reutilizable expone los 6 derechos en una sola vista (FR-019/20); copy de modales obligado a pasar checklist 6 del playbook (FR-024); errores con formato `[qué pasó | qué hacemos | qué puedes hacer | cuándo se resuelve]` (fórmula incidencia §6.4).
- **III. Localizado** ✓ — `anonymizationService.js` distingue `tipoPerfil === 'agencia'` para tratar el sub-doc `agencia` específicamente (decisión Q3); FR-010 plasmado en assertion del worker que **no** borra documentos contables, solo anonimiza referencias personales; emails preparados para variantes LATAM cuando SPEC-C3 entregue i18n.
- **IV. Operativo** ✓ — plazos concretos en todos los emails y banners: "Borrado efectivo el 25/05/2026 a las 14:00 CET", "Pago liberado en 72 h", "Enlace válido hasta 25/05/2026". Cero "rápidamente" o "pronto".
- **V. Reparador** ✓ — `DeletionGraceBanner` y `PendingOperationsList` aseguran que el usuario siempre vea exactamente qué bloquea su solicitud y cómo continuar; worker `rgpdDeletionWorker` con retry exponencial; email de aviso 24 h antes de fin de gracia (FR-005).

**Gate post-design: PASS.** Sin violaciones nuevas; sin clarifications pendientes. Plan listo para `/speckit-tasks`.
