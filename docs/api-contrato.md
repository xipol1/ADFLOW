# Contrato API (MVP actual)

## Auth
### POST `/api/auth/login`
Request:
```json
{ "email": "user@example.com", "password": "Password123" }
```
Response 200:
```json
{ "success": true, "token": "jwt", "user": { "id": "...", "rol": "advertiser" } }
```

## Campaigns
### GET `/api/campaigns`
- Auth: Bearer (`advertiser` o `admin`).
- Response: `{ success, data: Campaign[] }`

### POST `/api/campaigns`
Request:
```json
{ "titulo": "Campaña Q2", "descripcion": "texto", "presupuesto": 500 }
```
Response 201:
```json
{ "success": true, "data": { "id": "cmp-*", "estado": "draft" } }
```

## Transacciones
### GET `/api/transacciones`
- Auth: Bearer.
- Response: `{ success, data: Transaction[] }`

### POST `/api/transacciones`
Request:
```json
{ "monto": 120, "moneda": "EUR", "referencia": "order-1001" }
```
- Si `referencia` ya existe para el mismo usuario, devuelve 200 con `duplicate: true`.

### POST `/api/transacciones/webhook`
- Público (MVP).
- Idempotencia por `body.id` (o hash del payload si falta).
- Respuesta:
  - 202 si evento nuevo.
  - 200 con `duplicate: true` si ya estaba procesado.

## Anuncios (nuevo CRUD mínimo)
### GET `/api/anuncios`
- Auth: `advertiser/admin`.
- Lista anuncios propios (admin ve todos).

### POST `/api/anuncios`
Request:
```json
{ "titulo": "Anuncio verano", "descripcion": "Texto largo", "presupuesto": 300 }
```

### GET `/api/anuncios/:id`
### PUT `/api/anuncios/:id`
### DELETE `/api/anuncios/:id`
- Auth: `advertiser/admin`.
- Owner-only salvo admin.

## Notifications (MVP mínimo)
### GET `/api/notifications`
- Auth: Bearer.
- Lista notificaciones del usuario.

### POST `/api/notifications`
Request:
```json
{ "titulo": "Pago recibido", "mensaje": "Se acreditó tu pago" }
```

### PUT `/api/notifications/:id/leer`
- Marca notificación del usuario como leída.


## Files (MVP mínimo)
### GET `/api/files`
- Auth: Bearer.
- Lista archivos propios (admin ve todos).

### POST `/api/files`
Request:
```json
{ "nombre": "brief.txt", "tipo": "text/plain", "contenido": "texto" }
```

### GET `/api/files/:id`
### DELETE `/api/files/:id`
- Auth: Bearer.
- Owner-only salvo admin.
