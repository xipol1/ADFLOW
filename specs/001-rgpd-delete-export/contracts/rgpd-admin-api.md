# Contract — RGPD Admin / DPO API

**Mount path**: `/api/admin/rgpd` (router `routes/adminRgpd.js`)
**Auth**: todas requieren JWT válido **+** `rol === 'admin'` (middleware `autorizarRoles('admin')`).

> DPO no es un rol propio en `Usuario.rol` (que es enum `creator/advertiser/admin`). En MVP, DPO = admin. Si en el futuro se introduce rol `dpo`, ampliar el middleware.

---

## GET /api/admin/rgpd/requests

Lista solicitudes de borrado y export pendientes o recientes.

**Query params**:
- `type`: `'deletion' | 'export' | 'all'` (default `all`)
- `status`: filtro opcional (e.g., `paused_pending_liquidation`)
- `limit`: 1–100 default 50
- `skip`: paginación

**Response 200**:
```json
{
  "items": [
    {
      "type": "deletion",
      "requestId": "...",
      "usuarioId": "...",
      "usuarioEmail": "...",
      "status": "paused_pending_liquidation",
      "requestedAt": "...",
      "gracePeriodEndsAt": "...",
      "pausedReason": "Refund de campaña 12345 requiere intervención manual (banco rechazó SEPA)"
    },
    {
      "type": "export",
      "requestId": "...",
      "usuarioId": "...",
      "usuarioEmail": "...",
      "status": "failed",
      "requestedAt": "...",
      "failedAt": "...",
      "failureReason": "Mongo timeout durante agregación de transacciones (1247 docs)"
    }
  ],
  "total": 17,
  "limit": 50,
  "skip": 0
}
```

**Audit log entry**: `admin.audit_viewed` (con metadata `{ filter: {...} }`).

---

## POST /api/admin/rgpd/requests/:id/force-execute

Permite a admin forzar la ejecución manual de un `AccountDeletionRequest` en estado `paused_pending_liquidation` o `paused_pending_stripe`. Útil cuando la operación bloqueante se resolvió fuera de banda.

**Request**:
```json
{
  "adminNote": "string requerido — qué se resolvió manualmente",
  "confirmedLiquidation": true
}
```

**Response 200**:
```json
{
  "requestId": "...",
  "status": "executing_liquidation",
  "queuedAt": "..."
}
```

**Audit log entry**: `deletion.force_executed` (actor='admin', actorUserId=adminId, metadata={adminNote}).

---

## POST /api/admin/rgpd/requests/:id/cancel

Cancela una solicitud forzosamente desde admin (ej.: el usuario contactó por email y dijo que fue un error).

**Request**:
```json
{
  "adminNote": "string requerido"
}
```

**Response 200**:
```json
{ "requestId": "...", "status": "cancelled", "cancelledReason": "admin_override" }
```

**Pre-check**: solo permitido si `status ∈ ['pending_email_confirmation', 'grace_period', 'paused_pending_liquidation', 'paused_pending_stripe']`.

**Side effects**:
- `Usuario.deletionStatus = 'active'`.
- Email al usuario notificando cancelación con `adminNote`.

**Audit log entry**: `deletion.cancelled_by_admin`.

---

## GET /api/admin/rgpd/audit-log

Consulta el `RGPDAuditLog` con filtros.

**Query params**:
- `usuarioId`: opcional
- `action`: opcional, uno de los enumerados en data-model E-3
- `from`, `to`: rango ISO date
- `limit`: 1–500 default 100
- `skip`

**Response 200**:
```json
{
  "items": [
    {
      "_id": "...",
      "usuarioId": "...",
      "action": "deletion.anonymized",
      "timestamp": "...",
      "ip": "...",
      "userAgent": "...",
      "actor": "system",
      "metadata": { "categoriesAnonymized": ["personal","oauth","fiscal","secrets"] }
    }
  ],
  "total": 423,
  "limit": 100,
  "skip": 0
}
```

**Audit log entry**: `admin.audit_viewed` (recursivo — registrar la consulta del audit log es buena práctica RGPD).

---

## GET /api/admin/rgpd/users/:id/dossier

Devuelve un resumen RGPD para un usuario específico — útil cuando un usuario contacta al DPO por email y el admin necesita contexto.

**Response 200**:
```json
{
  "usuario": {
    "id": "...",
    "email": "...",
    "deletionStatus": "active",
    "createdAt": "..."
  },
  "consents": {
    "termsAcceptedAt": "...",
    "termsVersion": "1.0",
    "cookiesConsent": { "essential": true, "analytics": false, "marketing": false }
  },
  "activeRequests": {
    "deletion": null,
    "export": null
  },
  "history": {
    "deletionRequests": 0,
    "exportRequests": 2,
    "lastExportAt": "..."
  },
  "blockers": {
    "openDisputes": 0,
    "managedChannels": 0,
    "pendingEscrow": 0,
    "pendingPayouts": 0,
    "referralCashBalance": 0
  }
}
```

**Audit log entry**: `admin.dossier_viewed`.

---

## Notas de seguridad

- Todos los endpoints admin pasan por rate limit reforzado: 100 req/h por IP (middleware existente `limitarIntentos`).
- Cuerpo de admin actions con `adminNote` se preserva en `RGPDAuditLog.metadata` y es citable en reclamaciones.
- Endpoints **no** permiten anonimizar a un usuario directamente sin el flujo de borrado normal — siempre debe haber `AccountDeletionRequest` previa, aunque sea forzada por admin (`POST /requests/:id/force-execute`). Esto preserva trazabilidad y respeta el principio de no-bypass del flujo legal.
