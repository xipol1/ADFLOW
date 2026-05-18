# Contract — RGPD User API

**Mount path**: `/api/rgpd` (router `routes/rgpd.js`)
**Auth**: todas requieren JWT válido del usuario actuante (middleware `autenticar`) **excepto** `GET /confirm-deletion` y `GET /export/download/:id` (acceso por token URL).

---

## POST /api/rgpd/deletion

Crea una solicitud de borrado. Envía email de confirmación.

**Pre-checks** (sincrono):
1. Usuario sin disputas abiertas (FR-006). Si falla → 409.
2. Usuario no es último admin (FR-008). Si falla → 409.
3. Si `tipoPerfil === 'agencia'`, sin canales gestionados activos (FR-008.a). Si falla → 409.
4. No existe `AccountDeletionRequest` activa para el usuario. Si existe → 409 con `requestId` actual.

**Request**:
```json
{
  "motivo": "string opcional, max 500 chars"
}
```

**Response 202 Accepted**:
```json
{
  "requestId": "ObjectId",
  "status": "pending_email_confirmation",
  "confirmationEmailSentTo": "u***@example.com",
  "expiresAt": "2026-05-19T14:00:00.000Z"
}
```

**Errors**:
- `409 Conflict — disputes_open`: body `{ disputes: [{id, openedAt, contraparte}] }`.
- `409 Conflict — agency_clients_active`: body `{ channels: [{id, slug, nombre}] }`.
- `409 Conflict — last_admin`: body `{ message }`.
- `409 Conflict — request_already_active`: body `{ requestId, status }`.
- `429 Too Many Requests`: si > 3 solicitudes en 24h por mismo usuario (anti-abuso).

**Audit log entry**: `deletion.requested`.

---

## GET /auth/confirm-deletion?token={raw}&id={requestId}

Endpoint público (sin sesión) que confirma la solicitud al abrir el link del email. Página servida por React (`ConfirmDeletionPage.jsx`) que llama internamente a `POST /api/rgpd/deletion/confirm`.

Por simplicidad técnica, exponemos solo el endpoint POST y la página React maneja query params:

### POST /api/rgpd/deletion/confirm

Requiere sesión activa del mismo usuario (doble factor: token email + sesión).

**Request**:
```json
{
  "requestId": "ObjectId",
  "token": "string hex 64 chars"
}
```

**Response 200**:
```json
{
  "requestId": "ObjectId",
  "status": "grace_period",
  "gracePeriodEndsAt": "2026-05-25T14:00:00.000Z",
  "liquidationPreview": {
    "campaigns_to_cancel": 2,
    "escrow_to_refund_eur": 187.00,
    "payouts_to_release_eur": 0.00,
    "referral_cash_to_payout_eur": 0.00,
    "blocked_pending_stripe": true
  }
}
```

`liquidationPreview` informa al usuario qué se va a liquidar al fin de la gracia, calculado al momento de la confirmación. `blocked_pending_stripe = true` si SPEC-F1+F2 todavía no operativos y hay operaciones que requieren Stripe.

**Errors**:
- `400 Bad Request — token_invalid`.
- `410 Gone — token_expired`.
- `410 Gone — token_already_used`.
- `401 Unauthorized`: sesión no activa o no coincide.

**Side effects al confirmar**:
- `Usuario.sesiones = []` (FR-003).
- `Usuario.deletionStatus = 'pending_deletion'`.
- `AccountDeletionRequest.status = 'grace_period'`.
- Email `rgpd-grace-started` enviado.

**Audit log entry**: `deletion.confirmed`.

---

## DELETE /api/rgpd/deletion

Cancela una solicitud durante el periodo de gracia.

**Auth**: usuario actuante autenticado.

**Pre-check**: existe `AccountDeletionRequest.status === 'grace_period'` para este usuario.

**Response 200**:
```json
{
  "requestId": "ObjectId",
  "status": "cancelled",
  "cancelledAt": "2026-05-20T09:30:00.000Z"
}
```

**Side effects**:
- `Usuario.deletionStatus = 'active'`.
- `AccountDeletionRequest.status = 'cancelled'`, `cancelledReason = 'user_cancel'`.

**Audit log entry**: `deletion.cancelled` (actor='user').

---

## GET /api/rgpd/deletion/status

Estado actual de cualquier solicitud activa del usuario.

**Response 200**:
```json
{
  "active": true,
  "requestId": "ObjectId",
  "status": "grace_period",
  "confirmedAt": "...",
  "gracePeriodEndsAt": "...",
  "canCancel": true,
  "liquidationStatus": "pending"
}
```

Si no hay solicitud activa: `{ "active": false }`.

---

## POST /api/rgpd/export

Encola una solicitud de export. Idempotente: si hay una activa < 24h, devuelve la existente.

**Pre-check**:
- `DataExportRequest.findOne({ usuarioId, requestedAt: { $gt: now - 24h }, status: { $ne: 'failed' } })`.

**Response 202**:
```json
{
  "requestId": "ObjectId",
  "status": "queued",
  "estimatedReadyAt": "2026-05-18T20:00:00.000Z",
  "reused": false
}
```

Si reutiliza: `reused: true` + el mismo `requestId` existente.

**Errors**:
- `429 Too Many Requests` — rate limit FR-018.

**Audit log entry**: `export.requested`.

---

## GET /api/rgpd/export/status

Estado de la última solicitud del usuario.

**Response 200**:
```json
{
  "requestId": "ObjectId",
  "status": "ready",
  "requestedAt": "...",
  "completedAt": "...",
  "expiresAt": "...",
  "packageSizeBytes": 184320,
  "downloadUrl": "https://channelad.io/api/rgpd/export/download/<id>?token=<jwt>"
}
```

`downloadUrl` solo si `status === 'ready'`.

---

## GET /api/rgpd/export/download/:requestId?token={jwt}

Endpoint público (sin sesión). Valida JWT, retorna stream del ZIP.

**Validaciones**:
1. JWT firmado válido con `RGPD_EXPORT_SIGNING_KEY`.
2. JWT no expirado (claim `exp`).
3. `requestId` del path coincide con claim `requestId`.
4. `DataExportRequest.status === 'ready'`.
5. `DataExportRequest.expiresAt > now`.

**Response 200**:
- `Content-Type: application/zip`
- `Content-Disposition: attachment; filename="channelad-export-{requestId}.zip"`
- Stream del ZIP (desde Buffer o GridFS).
- `Cache-Control: no-store`.

**Errors**:
- `401 Unauthorized — token_invalid`.
- `410 Gone — link_expired`: incluye CTA en body para generar nueva solicitud.
- `404 Not Found`: si requestId no existe.

**Side effects**:
- Primer download: `downloadedAt = now`.
- Audit log `export.downloaded` con IP y UA.

---

## GET /api/rgpd/rights

Devuelve la lista de los 6 derechos RGPD para renderizar `RGPDRightsList`. Datos casi estáticos pero servidos por API para permitir variantes LATAM cuando SPEC-C3 esté.

**Response 200**:
```json
{
  "rights": [
    {
      "code": "access",
      "name": "Derecho de acceso (Art. 15)",
      "summary": "Saber qué datos guardamos sobre ti.",
      "legalDeadlineDays": 30,
      "action": { "type": "endpoint", "endpoint": "POST /api/rgpd/export" }
    },
    {
      "code": "rectification",
      "name": "Derecho de rectificación (Art. 16)",
      "summary": "Corregir datos inexactos.",
      "legalDeadlineDays": 30,
      "action": { "type": "ui", "target": "/dashboard/profile" }
    },
    {
      "code": "erasure",
      "name": "Derecho de supresión (Art. 17)",
      "summary": "Eliminar tu cuenta y datos personales.",
      "legalDeadlineDays": 30,
      "action": { "type": "endpoint", "endpoint": "POST /api/rgpd/deletion" }
    },
    {
      "code": "portability",
      "name": "Derecho de portabilidad (Art. 20)",
      "summary": "Recibir tus datos en formato estructurado.",
      "legalDeadlineDays": 30,
      "action": { "type": "endpoint", "endpoint": "POST /api/rgpd/export" }
    },
    {
      "code": "restriction",
      "name": "Derecho de limitación (Art. 18)",
      "summary": "Restringir cómo procesamos tus datos.",
      "legalDeadlineDays": 30,
      "action": { "type": "email", "mailto": "dpo@channelad.io" }
    },
    {
      "code": "objection",
      "name": "Derecho de oposición (Art. 21)",
      "summary": "Oponerte a usos específicos de tus datos.",
      "legalDeadlineDays": 30,
      "action": { "type": "email", "mailto": "dpo@channelad.io" }
    }
  ]
}
```

---

## Códigos de error normalizados

Todos los endpoints devuelven errores con estructura:

```json
{
  "error": {
    "code": "string identificador estable",
    "message": "string castellano alineado a wording playbook §6.4",
    "details": {}
  }
}
```

Códigos usados: `disputes_open`, `agency_clients_active`, `last_admin`, `request_already_active`, `token_invalid`, `token_expired`, `token_already_used`, `link_expired`, `rate_limit_exceeded`, `unauthorized`, `not_found`.
