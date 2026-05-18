# Phase 1 — Data Model: SPEC-B1 RGPD Delete + Export

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Research**: [research.md](./research.md) · **Date**: 2026-05-18

Cuatro modelos Mongoose nuevos + edición de `Usuario.js`. State machines explícitas para los flujos con transiciones. Validaciones derivadas de FR.

---

## E-1 — `AccountDeletionRequest`

**Colección**: `accountdeletionrequests` · **Archivo**: `models/AccountDeletionRequest.js`

### Campos

| Campo | Tipo | Required | Notas |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `usuarioId` | ObjectId ref `Usuario` | ✓ | índice |
| `status` | enum (ver state machine) | ✓ default `'pending_email_confirmation'` | índice |
| `requestedAt` | Date | ✓ default `Date.now` | |
| `confirmationTokenHash` | String | ✓ | bcrypt hash del token |
| `confirmationTokenExpiresAt` | Date | ✓ | 24 h post `requestedAt` |
| `confirmedAt` | Date | null | |
| `gracePeriodEndsAt` | Date | null | 7 días post `confirmedAt` (FR-004) |
| `cancelledAt` | Date | null | |
| `cancelledReason` | String enum `['user_cancel', 'dispute_opened', 'agency_clients_active']` | null | |
| `executedAt` | Date | null | |
| `pausedAt` | Date | null | usado en `paused_pending_*` |
| `pausedReason` | String | null | descripción legible para usuario |
| `liquidationResult` | Mixed | null | resumen JSON con qué se canceló/refundeó/liberó |
| `motivo` | String maxLength 500 | null | libre, opcional, lo que el usuario escribe |

### State machine

```
                  ┌────────────────────────────┐
                  │                            ▼
   pending_email_confirmation ── 24h sin confirmar ──▶ expired (terminal)
              │
              │ usuario abre link válido
              ▼
   grace_period ── usuario re-loguea y cancela ──▶ cancelled (terminal)
              │
              │ gracePeriodEndsAt <= now (cron)
              ▼
   executing_liquidation
              │
              ├── todas las operaciones OK ──▶ anonymizing ──▶ executed (terminal)
              │
              └── alguna pendiente humana ──▶ paused_pending_liquidation
                            │
                            └── cuando se resuelve manualmente ──▶ executing_liquidation
```

Transiciones se ejecutan con `findOneAndUpdate({ _id, status: <from> }, { $set: { status: <to>, ...timestamps } })` para garantizar atomicidad sin race conditions del worker.

### Índices

- `{ usuarioId: 1, status: 1 }` — para buscar request activa por usuario.
- `{ status: 1, gracePeriodEndsAt: 1 }` — para query del cron.
- `{ confirmationTokenExpiresAt: 1 }` TTL — purga automática de tokens expirados sin confirmar (Mongo TTL).

### Reglas de validación

- Solo puede existir un documento `status ∈ ['pending_email_confirmation','grace_period','executing_liquidation','paused_pending_liquidation','anonymizing']` por `usuarioId` (índice único parcial).
- `gracePeriodEndsAt` debe ser exactamente `confirmedAt + 7 días` (pre-save hook).

---

## E-2 — `DataExportRequest`

**Colección**: `dataexportrequests` · **Archivo**: `models/DataExportRequest.js`

### Campos

| Campo | Tipo | Required | Notas |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `usuarioId` | ObjectId ref `Usuario` | ✓ | índice |
| `status` | enum (ver state machine) | ✓ default `'queued'` | índice |
| `requestedAt` | Date | ✓ default `Date.now` | |
| `processingStartedAt` | Date | null | |
| `completedAt` | Date | null | |
| `expiresAt` | Date | null | `completedAt + 7 días` |
| `failedAt` | Date | null | |
| `failureReason` | String | null | |
| `packageData` | Buffer | null | ZIP inline si ≤ 15 MB |
| `gridfsId` | ObjectId | null | si excede 15 MB, ref a bucket `rgpdExports` |
| `packageSize` | Number | null | bytes, para mostrar al usuario |
| `schemaVersion` | String | ✓ default `'1.0'` | versionado del manifest |
| `downloadedAt` | Date | null | primer download timestamp |

### State machine

```
queued ── worker pick ──▶ processing
                            │
                            ├── OK ──▶ ready ── usuario abre link ──▶ delivered ── 7d ──▶ expired
                            │                                                       │
                            │                                                       └─ TTL purge
                            │
                            └── error ──▶ failed (worker reintenta hasta 3 veces, luego terminal)
```

### Índices

- `{ usuarioId: 1, status: 1 }` — rate limit query (`1/24h`).
- `{ status: 1, requestedAt: 1 }` — cola FIFO para worker.
- `{ expiresAt: 1 }` TTL — purga packages expirados (libera espacio).

### Reglas de validación

- Si `packageData` existe → `gridfsId` debe ser null (y viceversa). XOR forzado en pre-save.
- Rate limit a nivel servicio: rechazar `POST /api/rgpd/export` si existe doc `requestedAt > now - 24h` para el `usuarioId`.

---

## E-3 — `RGPDAuditLog`

**Colección**: `rgpdauditlogs` · **Archivo**: `models/RGPDAuditLog.js`

### Campos

| Campo | Tipo | Required | Notas |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `usuarioId` | ObjectId | ✓ | NO ref → no se popula tras anonimización; sigue siendo trazable por id |
| `action` | enum | ✓ | ver lista abajo |
| `timestamp` | Date | ✓ default `Date.now` | índice DESC |
| `ip` | String | null | IP del actor en el momento del evento |
| `userAgent` | String | null | UA del actor |
| `actor` | enum `['system','user','admin','dpo']` | ✓ | |
| `actorUserId` | ObjectId | null | si actor ∈ admin/dpo, quién |
| `metadata` | Mixed | null | JSON estructurado específico por action |

### Acciones registradas

```
deletion.requested           — POST /api/rgpd/deletion
deletion.confirmed           — GET  /auth/confirm-deletion?token=...
deletion.cancelled           — DELETE /api/rgpd/deletion
deletion.grace_warning_sent  — cron 24h antes
deletion.liquidation_started — cron al fin de gracia
deletion.liquidation_paused  — cuando hay operaciones que requieren humano
deletion.anonymized          — tras anonymize OK
deletion.expired             — 24h sin confirmar email
export.requested             — POST /api/rgpd/export
export.processing_started    — worker pick
export.ready                 — worker completa generación
export.downloaded            — primer GET /api/rgpd/export/download/...
export.expired               — TTL
export.failed                — worker tras 3 reintentos
admin.audit_viewed           — GET /api/admin/rgpd/audit-log
```

### Inmutabilidad

`services/rgpdAuditService.js` expone **solo**: `log(action, opts)`, `findByUser(usuarioId)`, `findByAction(action, range)`. **No expone** `update` ni `delete`. Es responsabilidad de PR review garantizar que ningún otro módulo importe el modelo `RGPDAuditLog` directamente y mute documentos.

### Índices

- `{ usuarioId: 1, timestamp: -1 }` — query "todo lo de este usuario en orden".
- `{ action: 1, timestamp: -1 }` — query por tipo de acción para reportes admin.
- **Sin TTL** — el log es retención permanente (justificable por interés legítimo de cumplimiento RGPD; no se purga).

---

## E-4 — `ReservedSlug`

**Colección**: `reservedslugs` · **Archivo**: `models/ReservedSlug.js`

### Campos

| Campo | Tipo | Required | Notas |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `slug` | String unique lowercase trim | ✓ | índice único |
| `reservedAt` | Date | ✓ default `Date.now` | |
| `reservedUntil` | Date | ✓ | `reservedAt + 90 días` |
| `originalUserId` | ObjectId | ✓ | quién lo liberó (anonimizado tras borrado, pero ID se preserva) |

### Índices

- `{ slug: 1 }` unique — chequeo O(1) al validar nuevo slug.
- `{ reservedUntil: 1 }` TTL — purga automática tras expirar.

### Cuándo se inserta

`rgpdDeletionWorker.anonymize(usuarioId)` consulta `Usuario.channelUsername` y, si no es null, inserta `ReservedSlug` antes de continuar con la anonimización.

### Cuándo se consulta

Endpoint de registro de canal (`POST /api/channels` o equivalente en `routes/channels.js`) hace `ReservedSlug.findOne({ slug, reservedUntil: { $gt: now } })`. Si encuentra → rechaza con 409 Conflict y mensaje "Este nombre estará disponible a partir del DD/MM/YYYY".

---

## E-5 — Edición de `Usuario.js`

### Campos añadidos

| Campo | Tipo | Default | Notas |
|---|---|---|---|
| `deletionStatus` | String enum `['active','pending_email_confirmation','pending_deletion','anonymized']` | `'active'` | índice |
| `anonymizedAt` | Date | null | timestamp de finalización |

### Pre-save hook ampliado

- Si `deletionStatus === 'anonymized'`, fuerza scrub de las 6 categorías PII (defensa en profundidad por si alguien intenta salvar un Usuario anonimizado por error). Concretamente, valida que no existan valores no-anonimizados en los campos sensibles antes de aceptar el save.

### Método estático

```
Usuario.anonymizeById(usuarioId) → Promise<UsuarioAnonimizado>
```

Implementado en `services/anonymizationService.js`. Pasos:

1. Carga doc con todos los campos.
2. Por cada categoría de FR-009, sobreescribe valores con constantes anonimizadas.
3. Vacía arrays (`sesiones`, `pushSubscriptions`, `twoFactorBackupCodes`).
4. Marca `deletionStatus='anonymized'`, `anonymizedAt=now`, `activo=false`.
5. Guarda.
6. Si `channelUsername` no era null, inserta `ReservedSlug`.
7. Escribe `RGPDAuditLog` con action `deletion.anonymized`.

### Mapeo PII → valor anonimizado

| Campo original | Valor tras anonimización |
|---|---|
| `email` | `deleted-{_id}@anonymized.local` |
| `password` | bcrypt hash de un random irrecuperable |
| `nombre` | `'Usuario'` |
| `apellido` | `'eliminado'` |
| `googleId` | `null` |
| `telegramUserId` | `null` |
| `channelUsername` | `null` (pero `ReservedSlug` toma el control 90d) |
| `botVerified` | `false` |
| `twoFactorEnabled` | `false` |
| `twoFactorSecret` | `null` |
| `twoFactorBackupCodes` | `[]` |
| `pushSubscriptions` | `[]` |
| `sesiones` | `[]` |
| `emailVerificationToken` | `null` |
| `passwordResetToken` | `null` |
| `datosFacturacion.razonSocial` | `'(eliminado)'` |
| `datosFacturacion.nif` | `'XXXXXXXXX'` |
| `datosFacturacion.direccion` | `'(eliminado)'` |
| `datosFacturacion.cp` | `''` |
| `datosFacturacion.ciudad` | `''` |
| `datosFacturacion.provincia` | `''` |
| `datosFacturacion.emailFacturacion` | `''` |
| `agencia.nombre` | `'(eliminado)'` (si tipoPerfil = agencia) |
| `agencia.sitioWeb` | `''` |
| `agencia.cifNif` | `'XXXXXXXXX'` |
| `referralCode` | `null` (se libera) |
| `referredBy` | **preservado** (integridad del programa de referidos del referidor) |
| `recordatorioPerfil`, etc. | preservados (no son PII) |
| `stripeConnectAccountId` | `null` (la cuenta Stripe se cierra externamente vía Stripe API en SPEC-F2; aquí solo se desvincula) |

---

## Datos NO incluidos en el export (justificación)

Por FR-016: el export incluye lo que el usuario "posee". Excluye:

- `password` hash (no portable, no aporta al usuario).
- `twoFactorSecret`, `twoFactorBackupCodes` (secrets de seguridad, exposición = degradación seguridad).
- `emailVerificationToken`, `passwordResetToken` (tokens vivos, exposición = riesgo).
- `sesiones[].tokenHash` (tokens vivos).
- `pushSubscriptions[]` (endpoints internos del navegador, no útiles fuera de Channelad).
- `stripeConnectAccountId`, `stripeCustomerId` (refs internos de la pasarela; el usuario puede descargar su histórico Stripe directamente desde Stripe Dashboard).
- `referralCode`, `referredBy` (compartibles solo entre Channelad).
- Campos calculados (`betaAccess`, `founderTier`, `referralTier`) — están en el manifest como metadatos pero no expuestos como derechos.

El manifest documenta explícitamente esta lista de exclusiones para transparencia.

---

## Relaciones entre entidades

```
Usuario 1 ────── 0..1 AccountDeletionRequest   (única request activa por usuario)
Usuario 1 ────── 0..N DataExportRequest         (máximo 1 cada 24h, pero histórico se conserva)
Usuario 1 ────── 0..N RGPDAuditLog              (todas las acciones del usuario)
Usuario 1 ────── 0..1 ReservedSlug              (solo creators con slug público)
```

`AccountDeletionRequest` y `DataExportRequest` referencian `Usuario` por `usuarioId` con `ref` Mongoose. `RGPDAuditLog` y `ReservedSlug` solo guardan `usuarioId` sin `ref` para preservar trazabilidad post-anonimización (la referencia sigue siendo válida en la DB pero `.populate()` devuelve el Usuario anonimizado, no error).

---

## Modelos existentes referenciados (no editados, solo consultados)

### Dispute

`models/Dispute.js` — el modelo **se llama `Dispute` en inglés** (no `Disputa`). Campos relevantes para el pre-check FR-006:

- `openedBy: ObjectId ref Usuario` (quién abrió la disputa)
- `againstUser: ObjectId ref Usuario` (contra quién)
- `status` enum: `'open' | 'under_review' | 'resolved_advertiser' | 'resolved_creator' | 'closed'`
- "Disputa abierta" = `status ∈ ['open', 'under_review']` (las tres resoluciones son terminales y no bloquean borrado).

Query para FR-006: `Dispute.countDocuments({ $or: [{openedBy: usuarioId}, {againstUser: usuarioId}], status: {$in: ['open','under_review']} })`.

### Canal

`models/Canal.js` — solo expone `propietario: ObjectId ref Usuario` para el creator dueño del canal. **No tiene actualmente campo `gestorId`** ni similar para modelar "agencia gestiona canales de clientes". Implicación para FR-008.a — ver sección "Future-ready" más abajo.

### AuthAuditLog (no confundir con RGPDAuditLog)

`models/AuthAuditLog.js` existente usa convención `event`/`user`/`email` para eventos de autenticación. **NO se reutiliza** para RGPD por:
- Dominios distintos (auth ≠ tratamiento de datos personales).
- Requisitos legales distintos (RGPD Art. 30 exige registro de actividades de tratamiento).
- Inmutabilidad estricta requerida en RGPD vs solo append-recomendado en Auth.
- Divergencia intencional de nomenclatura (`usuarioId` vs `user`, `action` vs `event`) para hacer evidente la separación en code review.

---

## Future-ready: campos que dependen de features futuras

Dos requisitos del spec dependen de relaciones que **no existen actualmente en el modelo de datos** del repo. La spec los formula con propósito; el plan los implementa como skeleton activable.

### FR-008.a — Agencia con canales de clientes

El campo `Usuario.tipoPerfil = 'agencia'` existe, pero **no hay campo `Canal.gestorId`** que mapee canales gestionados por una agencia para clientes. Solo hay `Canal.propietario` para el dueño.

**Tratamiento en SPEC-B1**:
- El pre-check de `POST /api/rgpd/deletion` evalúa `tipoPerfil === 'agencia'`.
- Si verdadero, consulta `Canal.countDocuments({ gestorId: usuarioId, activo: true })` — query que **devolverá siempre 0** mientras `gestorId` no esté wired.
- El resultado se logueará a warn: `[rgpd] agency block returned 0 — gestorId field not yet present in Canal model. FR-008.a is skeleton-ready, full enforcement pending future spec.`
- Cuando una spec futura añada `Canal.gestorId`, FR-008.a empieza a bloquear automáticamente. Sin cambios adicionales en SPEC-B1.

### FR-012.a — Slug de perfil público creator

La ruta `/c/:slug` existe en `client/src/routes/AppRoutes.jsx:160` apuntando a `PublicCreatorProfilePage.jsx`. El componente llama `apiService.getPublicCreatorProfile(slug)` pero **ese método no existe en `client/src/services/api.js`** ni hay endpoint backend que lo sirva. El componente tiene fallback a "derive from current user's profile".

**Tratamiento en SPEC-B1**:
- `rgpdDeletionWorker` siempre inserta `ReservedSlug` cuando el creator tiene un slug detectable (e.g. `channelUsername` no-null, o algún otro campo futuro).
- El endpoint de registro de canal/perfil debe consultar `ReservedSlug` antes de aceptar slug nuevo (ya documentado en E-4).
- Si actualmente el endpoint público no está completado, el `ReservedSlug` simplemente queda como reserva preventiva — no daña nada y se activa cuando el feature público entre en producción.

### Modelos adicionales tocados por anonimización (FR-009 expandido)

Beyond los campos de `Usuario`, las siguientes colecciones contienen PII del usuario y deben tratarse:

- **`Tracking` / `TrackingFingerprint` / `TrackingLink`**: registran IP, user agent, fingerprint del visitante. Anonimización: para registros asociados a `usuarioId` del usuario borrado, sobreescribir `ip = '0.0.0.0'`, `userAgent = '(eliminado)'`, `fingerprint = null`. Los registros se preservan para integridad de métricas históricas agregadas.
- **`Notificacion`**: notificaciones enviadas al usuario. Conservar el documento (para integridad de timeline) pero sobreescribir contenido si incluye PII transcrita.
- **`Retiro`**: solicitudes de retiro (payouts). Datos fiscalmente relevantes → conservar 6 años con `usuarioId` anonimizado pero no borrado.
- **`Review`**: reseñas dadas o recibidas. Conservar autoría anonimizada (igual que mensajes de Dispute).

El servicio `anonymizationService.js` se estructura como pipeline de pasos:

```
anonymizeUser(usuarioId) {
  await scrubUsuarioDoc(usuarioId);          // las 6 categorías en Usuario
  await scrubTrackingRecords(usuarioId);     // Tracking* collections
  await scrubNotificaciones(usuarioId);      // Notificacion content
  await reserveSlugIfApplicable(usuarioId);  // ReservedSlug
  // Retiro y Review se conservan intactos (FK al usuarioId anonimizado basta)
  await logAuditEntry(usuarioId, 'deletion.anonymized', { stepsCompleted: [...] });
}
```

Cada paso es independiente y se loggea individualmente para test forense (SC-004).

---

## Datos incluidos en el export (FR-016 expandido)

Más allá del listado inicial, basado en los modelos del repo (`Notificacion`, `Tracking*`, `Review`, `Conversion`, `Retiro`, `Factura`):

```
export-{requestId}/
├── MANIFEST.json
├── profile.json
├── campaigns.json
├── transactions.json
├── invoices.json          # facturas emitidas (Factura.js) — datos fiscales del usuario
├── disputes.json
├── reviews.json           # reseñas dadas o recibidas (Review.js)
├── notifications.json     # historial de notificaciones recibidas
├── tracking-summary.json  # agregado (no eventos crudos — solo conteos por campaña, sin IP individual)
├── conversions.json       # conversiones atribuidas (Conversion.js)
├── retirosolicitudes.json # retiros solicitados (Retiro.js)
├── consents.json
├── notifications-prefs.json
├── channels/              # solo si creator
│   ├── {channelId}.json
│   └── ...
└── README.txt
```

**Justificación de incluir tracking agregado pero no eventos crudos**: el detalle de cada visita con IP no aporta al usuario (es metadato de la plataforma) y exportarlo permite ataques de correlación. El agregado por campaña sí es relevante (saber cuántos clicks recibió cada uno de mis ads).

**Documentado en el MANIFEST**: lista explícita de qué se incluye y qué se excluye con justificación. Aumenta transparencia y prueba el cumplimiento del Art. 15 + 20.
