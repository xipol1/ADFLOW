# Integracion externa Getalink

La integracion para Getalink queda separada de la API de usuarios bajo `/api/partners`. Esta capa sigue el flujo contractual y evita reutilizar el JWT de usuarios internos como mecanismo de acceso externo.

## Autenticacion

- Metodo: `Authorization: Bearer <API_KEY>` o `X-API-Key: <API_KEY>`
- Controles:
  - API key con hash SHA-256 en almacenamiento
  - allowlist opcional de IPs por partner
  - cuota por partner por minuto
  - logging de requests y respuestas en `data/partner_api_logs.json`
  - `X-Request-Id` en todas las respuestas
  - soporte de `Idempotency-Key` para operaciones `POST`

## Contrato HTTP

- Envelope de exito:
  - `success`
  - `requestId`
  - `data`
  - `meta` cuando aplica
- Envelope de error:
  - `success=false`
  - `requestId`
  - `error.code`
  - `error.message`
  - `error.details` cuando aplica

## Flujo obligatorio

Getalink debe operar en este orden:

1. `GET /api/partners/inventory`
2. `POST /api/partners/campaigns`
3. `POST /api/partners/campaigns/:id/payment-session`
4. `POST /api/partners/campaigns/:id/confirm-payment`
5. `POST /api/partners/campaigns/:id/register-publication`
6. `POST /api/partners/campaigns/:id/confirm-execution`
7. `POST /api/partners/campaigns/:id/release-funds`

No se permite publicar sin pago confirmado ni liberar fondos antes de la confirmacion de ejecucion.

## Restricciones alineadas con contrato

- Inventario externo limitado a canales verificados.
- Sin URL publica ni datos de contacto del canal en la API externa.
- Paginacion maxima de 20 elementos por request.
- Politica explicita de no exportacion masiva ni contacto directo con canales.
- Metricas solo disponibles tras la publicacion.

## Provisioning del partner

Crear un registro en `data/partners.json` con estructura similar:

```json
[
  {
    "id": "partner-getalink",
    "name": "Getalink",
    "apiKeyHash": "sha256-de-la-api-key",
    "apiKeyHint": "c0de",
    "status": "active",
    "allowedIps": ["*"],
    "rateLimitPerMinute": 60
  }
]
```

El hash se calcula con SHA-256 sobre la API key en texto plano. La clave en claro no debe guardarse en el repositorio.

## Observaciones

- El pago esta modelado como flujo de tercero (`stripe`) y no como custodia directa de AdFlow.
- El escrow queda reflejado en el estado de la campaña (`awaiting_payment`, `held`, `released`) para soportar auditoria contractual.
- Si mas adelante Stripe Connect o un PSP real entra en produccion, el endpoint `confirm-payment` debe quedar reservado a webhook/backoffice y no al partner.
