# Phase 0 — Research: SPEC-B1 RGPD Delete + Export

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Date**: 2026-05-18

Decisiones técnicas cerradas antes de Phase 1 (data-model + contracts). Cada entrada: Decisión · Razón · Alternativas rechazadas.

---

## R-1 — Estrategia de anonimización: in-place vs colección espejo

**Decisión**: **Anonimización in-place** del documento `Usuario` existente. El `_id` se preserva. Se sobreescriben las 6 categorías PII de FR-009 con valores constantes deterministas (`email = "deleted-{_id}@anonymized.local"`, `nombre = "Usuario eliminado"`, etc.). Se añade campo `anonymizedAt: Date`.

**Razón**: preserva la integridad referencial de **todas** las relaciones existentes (Campaign.anuncianteId, Disputa.usuarioId, Mensaje.autorId, Transaccion.usuarioId, etc.) sin cambio en otros modelos. La query de "campañas pagadas" sigue funcionando para auditoría fiscal post-anonimización. Más simple de testear forensemente: una sola query `findById(usuarioId)` revela todo el estado.

**Alternativas rechazadas**:
- *Colección espejo `AnonymizedUser`* + soft-delete en `Usuario`: rompe integridad referencial salvo que se actualicen todas las FK del repo (decenas), o se cree un mecanismo de redirección entre colecciones. Coste/riesgo no justificado.
- *Borrado físico del documento*: rompe FK en facturas y disputas; viola FR-010 (retención fiscal 6 años) y FR-011 (integridad referencial de disputas).
- *Hash de PII en lugar de constante*: el hash sigue siendo PII relativo (puede correlarse con el original si se tiene texto plano). Cumple peor el "irreversible" de FR-009.

---

## R-2 — Inmutabilidad del Audit Log RGPD

**Decisión**: colección `rgpdauditlogs` **append-only** desde la capa de aplicación. Sin endpoint de update/delete. El esquema Mongoose **no exporta `findByIdAndUpdate` ni `deleteOne`** desde `services/rgpdAuditService.js` (solo `create` y queries `find`). Admin UI lee, nunca edita. Mongo no soporta enforcement nativo de append-only, así que la garantía es de capa de aplicación + revisión de PR (no debe aparecer mutación a `RGPDAuditLog` fuera del servicio).

**Razón**: requisito legal RGPD (Art. 30 — registro de actividades de tratamiento) y de defensa ante AEPD. La inmutabilidad de la capa de aplicación + ausencia de UI de edición es proporcional al tamaño de Channelad. Mongo capped collections no sirven (truncan, no son append-only).

**Alternativas rechazadas**:
- *Reutilizar `AuthAuditLog`* (modelo existente): mezcla dominios (auth vs RGPD) con requisitos legales y retención distintos. Spec (Assumptions) ya lo descarta.
- *Append-only enforced por Mongo*: requiere change streams + Atlas trigger + capa de auditoría adicional. Sobre-ingeniería para MVP de 10 usuarios.
- *Tabla externa (PostgreSQL append-only)*: añade dependencia; el resto de la app está en Mongo.

---

## R-3 — Token de confirmación de email

**Decisión**: **reutilizar el patrón existente** de `emailVerificationToken` y `passwordResetToken` en `Usuario.js`:
- Generar con `crypto.randomBytes(32).toString('hex')` (256 bits de entropía).
- Almacenar hash bcrypt en `AccountDeletionRequest.confirmationTokenHash`.
- Enviar el token raw en la URL del email: `https://channelad.io/auth/confirm-deletion?token={raw}&id={requestId}`.
- TTL 24 h via campo `confirmationTokenExpiresAt`.
- Validación: bcrypt.compare(raw, hash) + check expiración + check requestId pertenece a usuario autenticado en sesión separada (segundo factor: el usuario debe seguir con cuenta activa en el navegador para confirmar).

**Razón**: patrón ya probado en `controllers/authController.js` (registro, password reset). Cero superficie nueva. Bcrypt evita exposición del token en DB. Doble factor (token email + sesión activa) defiende contra interceptación de email.

**Alternativas rechazadas**:
- *JWT firmado*: añade dependencia y rotación de claves. Token de una sola vez no necesita stateless.
- *Magic link sin sesión activa*: peor seguridad (cualquiera con el email confirma sin saber credenciales).

---

## R-4 — Generación asíncrona del export

**Decisión**: **worker + cron** modelo. `POST /api/rgpd/export` crea `DataExportRequest` con `status='queued'` y retorna 202 inmediato. Cron Vercel cada 10 min dispara `POST /api/jobs/rgpd-grace` con `CRON_SECRET`. El handler invoca `rgpdExportWorker.runPendingExports()` que procesa hasta N=10 requests en orden FIFO.

Cada request:
1. Marca `status='processing'`.
2. `dataExportService.buildExportZip(usuarioId)` agrega perfil, campañas, transacciones, disputas, mensajes, datos canal, métricas, consentimientos, manifest.
3. Si ZIP ≤ 15 MB → guarda en `DataExportRequest.packageData` (Buffer). Si > 15 MB → guarda en GridFS bucket `rgpdExports` y referencia por `gridfsId`.
4. Marca `status='ready'`, calcula `expiresAt = now + 7d`.
5. Envía email con link firmado `https://channelad.io/api/rgpd/export/download/{requestId}?token={jwt}`.

**Razón**: Vercel no soporta jobs largos persistentes. Cron + worker batch es el patrón ya usado para `telegramIntel` / `multiplatformIntel` / `tgstat-discover` (precedente en el repo). Mantiene la promesa de spec ("estamos preparando tu archivo, te avisaremos por email") sin engañar al usuario.

**Alternativas rechazadas**:
- *Generación síncrona en el endpoint*: viola timeout Vercel 60 s para usuarios con muchos datos. Bloquea el endpoint.
- *Inngest / Trigger.dev*: tercer servicio externo. Coste y vendor lock-in. No justificado para 5 req/día MVP.
- *Almacenar en S3*: requiere cuenta AWS y configuración IAM. Mongo GridFS cubre el caso sin dependencias nuevas.

---

## R-5 — Token de descarga del export

**Decisión**: **JWT HS256** firmado con `RGPD_EXPORT_SIGNING_KEY` (env nueva). Payload `{ requestId, userId, exp: timestamp+7d }`. Validación en endpoint `GET /api/rgpd/export/download/:requestId?token={jwt}`:
1. Verifica firma JWT.
2. Verifica `exp` futuro.
3. Verifica `requestId` y `userId` coinciden con el path y la sesión (si hay sesión; el link funciona también sin sesión activa porque el usuario podría haber cerrado).
4. Verifica `DataExportRequest.status === 'ready'` y `expiresAt > now`.

**Razón**: el enlace debe funcionar incluso si el usuario no tiene sesión activa en ese navegador (abrir email desde otro dispositivo). JWT firmado es la opción mínima sin estado adicional. La doble verificación (JWT exp + DB expiresAt) protege ante claves comprometidas: rotar `RGPD_EXPORT_SIGNING_KEY` invalida todos los enlaces previos sin tocar DB.

**Alternativas rechazadas**:
- *Token raw + bcrypt hash en DB* (igual que R-3): obliga a sesión activa, peor UX.
- *Signed URL S3*: añade dependencia AWS.
- *Token muy corto (~6 chars)*: insuficiente entropía si se filtra el link.

---

## R-6 — Worker de borrado y trigger de fin de gracia

**Decisión**: el mismo cron de R-4 (`/api/jobs/rgpd-grace`) invoca también `rgpdDeletionWorker.runExpiredGracePeriods()` que:
1. Query `AccountDeletionRequest.find({ status: 'grace_period', gracePeriodEndsAt: { $lte: now } })`.
2. Para cada request:
   - Marca `status='executing_liquidation'`.
   - Llama `liquidatePendingOperations(usuarioId)` que cancela borradores (FR-007.a), encola refunds/payouts si Stripe está live (FR-007.b/c/e) o marca `paused_pending_stripe` con notificación de incidencia (FR-007.d).
   - Si liquidación OK → llama `anonymizationService.anonymizeUser(usuarioId)`. Marca `status='executed'`. Escribe entrada en `RGPDAuditLog`. Envía email `rgpd-deletion-completed`.
   - Si liquidación paused → marca `status='paused_pending_liquidation'`, no anonimiza, espera siguiente ciclo del cron.

**Razón**: un solo cron simplifica scheduling y reduce slots de Vercel Cron consumidos. Idempotencia por estado: si el worker corre dos veces, no duplica operaciones (transición de estado atómica con `findOneAndUpdate`).

**Alternativas rechazadas**:
- *Cron separado para deletion vs export*: consume más slots Vercel Cron (limitado a 2 en Hobby, ilimitado en Pro, pero aún así innecesario).
- *Trigger por fin de gracia individual* (Mongo TTL index + change stream): tampoco hay change stream listener en el stack actual.

---

## R-7 — Reservación de slug 90 días post-borrado

**Decisión**: nueva colección `reservedslugs` con `{ slug: String unique, reservedUntil: Date, originalUserId: ObjectId }`. Cuando `rgpdDeletionWorker` anonimiza a un creator con `channelUsername` no-null o slug público en uso, escribe entrada con `reservedUntil = now + 90d`. El endpoint de registro de canal (`routes/channels.js` o equivalente) consulta `reservedslugs.findOne({ slug, reservedUntil: { $gt: now } })` antes de aceptar el slug. TTL index en `reservedUntil` purga automáticamente tras expirar.

**Razón**: Mongo TTL index hace el cleanup automático, sin worker dedicado. Lookup O(1) en el flujo crítico de registro de canal. Spec (FR-012.a) explícita el plazo de 90 días.

**Alternativas rechazadas**:
- *Campo en `Usuario` anonimizado*: requiere query adicional al validar slug; menos limpio.
- *Política sin reserva (slug libre inmediato)*: descartada en Q5 — riesgo de confusión para anunciantes con link guardado.

---

## R-8 — Cuándo activar `pending_deletion` en `Usuario`

**Decisión**: añadir campo `deletionStatus: String enum ['active', 'pending_email_confirmation', 'pending_deletion', 'anonymized']` en `Usuario.js` (default `'active'`). Transiciones:
- Al solicitar borrado → `pending_email_confirmation`.
- Al confirmar email → `pending_deletion` + cerrar todas las sesiones (`sesiones = []`) + crear `AccountDeletionRequest.status='grace_period'`.
- Si usuario re-loguea durante gracia → vista de cuenta con banner; **no** cambia `deletionStatus`. Si pulsa "Cancelar" → vuelve a `'active'`.
- Tras anonimización → `'anonymized'`.

Middleware `auth.js` lee `deletionStatus`:
- `pending_email_confirmation` → permite login normal (todavía no confirmado).
- `pending_deletion` → permite login pero inyecta banner persistente (`DeletionGraceBanner`).
- `anonymized` → bloquea login con error "Esta cuenta ha sido eliminada".

**Razón**: estado denormalizado en `Usuario` evita JOIN con `AccountDeletionRequest` en cada request autenticado. Coherente con patrón ya en `Usuario` (`activo`, `betaAccess`, `emailVerificado`).

**Alternativas rechazadas**:
- *Solo `AccountDeletionRequest`*: requiere lookup en cada middleware de auth. Penalización de latencia generalizada.

---

## R-9 — Formato del export ZIP

**Decisión**: ZIP plano con estructura:
```
export-{requestId}/
├── MANIFEST.json          # versión schema, fecha, lista de archivos
├── profile.json           # perfil + datos fiscales (excluyendo password/2fa secrets)
├── campaigns.json         # lista de campañas como anunciante
├── transactions.json      # historial transaccional sin tokens Stripe
├── disputes.json          # disputas con mensajes
├── consents.json          # historial de aceptación T&C, cookies, etc.
├── notifications-prefs.json
├── channels/              # solo si rol = creator
│   ├── {channelId}.json   # un fichero por canal con perfil + métricas históricas
│   └── ...
└── README.txt             # explicación humana en español del contenido
```

Generación con `archiver` (puro JS, sin libs nativas, compatible Vercel Lambda). Una pasada secuencial por dataset, sin cargar todo en memoria a la vez (stream).

**Razón**: JSON estructurado es portable y reutilizable (Art. 20 — portabilidad). MANIFEST sirve para validación automatizada por terceros si el usuario quiere migrar a competidor. README ayuda a usuario no técnico.

**Alternativas rechazadas**:
- *CSV*: peor para datos anidados (transacciones tienen sub-objetos).
- *PDF*: no portable, no parseable, archivo masivo.
- *Encrypted ZIP*: el JWT firmado del download URL ya protege el canal; el contenido es del usuario, no terceros.

---

## R-10 — Patrón de bloqueo por disputas abiertas (FR-006) y agencia con canales (FR-008.a)

**Decisión**: pre-check sincrono al solicitar borrado (`POST /api/rgpd/deletion`). Query:
- `Disputa.countDocuments({ usuarioId, status: { $in: ['open', 'pending_evidence', 'pending_resolution'] } })`. Si > 0 → 409 Conflict con array de IDs.
- Si `Usuario.tipoPerfil === 'agencia'`: query `Canal.countDocuments({ gestorId: usuarioId, activo: true })`. Si > 0 → 409 Conflict con lista de canales gestionados.

Patrón usado: misma estructura que `controllers/campaignController.js` valida pre-condiciones antes de crear campaña (precedente existente).

**Razón**: rechazar al momento es mejor UX que aceptar y bloquear durante gracia. Mensaje claro con lista directa para que el usuario actúe.

**Alternativas rechazadas**:
- *Validar en el worker* (durante gracia): el usuario ya recibió email de confirmación, lo confirmó, y entonces le decimos "no se puede borrar" → mala experiencia.

---

## Cierre de Phase 0

Cero `NEEDS CLARIFICATION` pendientes en Technical Context. Las 10 decisiones cubren los puntos no triviales de implementación. Phase 1 puede proceder con data model + contracts + quickstart.
