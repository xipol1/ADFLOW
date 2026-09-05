# impl T013

## Archivos tocados

- tests/rgpdDeletion.integration.test.js (nuevo, 344 líneas)

## Tests añadidos / modificados

- tests/rgpdDeletion.integration.test.js — 8 escenarios (a–h) según T013:
  - (a) happy path completo con cron forzado + assertion SC-001 `<90s` y SC-006 (audit log poblado con `deletion.requested` + `deletion.confirmed`); inyecta token bcrypt conocido en DB porque el email real no se entrega en test.
  - (b) bloqueo 409 `disputes_open` con `Dispute` `status='open'` apuntando a `usuarioId`.
  - (c) bloqueo 409 `last_admin`: promociona el único usuario a `rol='admin'` y re-loguea para refrescar el JWT.
  - (d) agencia skeleton-ready: `tipoPerfil='agencia'`; acepta 202 o 409 `agency_clients_active` porque `Canal.gestorId` no existe todavía (FR-008.a auto-activable).
  - (e) DELETE durante gracia → `status='cancelled'` + `Usuario.deletionStatus='active'`.
  - (f) token expirado (`confirmationTokenExpiresAt` 60s atrás) → 410 `token_expired`.
  - (g) token reutilizado (2º POST confirm con mismo token) → 410 `token_already_used`.
  - (h) role denial FR-022: `creator` y `advertiser` reciben 403 en `GET /api/admin/rgpd/audit-log` (dos subtests, uno por rol).

  Todos fallan con: **`Cannot find module '../models/AccountDeletionRequest' from 'tests/rgpdDeletion.integration.test.js'`** porque T015 (modelo) y T017–T022 (handlers reales) no están implementados. Es el fallo esperado por TDD.

## Comandos de verificación corridos

- `npx eslint tests/rgpdDeletion.integration.test.js` → OK (0 errors, 0 warnings).
- `npx jest tests/rgpdDeletion.integration.test.js --forceExit` → **FAIL como esperado**:

  ```
  FAIL tests/rgpdDeletion.integration.test.js
    ● Test suite failed to run
      Cannot find module '../models/AccountDeletionRequest' from 'tests/rgpdDeletion.integration.test.js'

       19 | // Jest falle si el modelo no existe (señal de TDD pendiente, NO de bug).
    >  20 | const AccountDeletionRequest = require('../models/AccountDeletionRequest');

  Test Suites: 1 failed, 1 total
  Tests:       0 total
  Time:        2.282 s
  ```

## Pendiente / dudas

- Ninguna. El test queda listo para activarse a medida que T015–T022 entren. Cuando `models/AccountDeletionRequest`, `workers/rgpdDeletionWorker` y los handlers reales del controller existan, jest avanzará y los assertions concretos empezarán a evaluar la implementación.
- Decisión menor (registrada por transparencia): los escenarios que necesitan confirmar el token de email lo inyectan vía `bcrypt.hash(plainToken, 4)` directamente en el documento `AccountDeletionRequest`. El test NO depende de que el email real se entregue ni se intercepte — solo del hash bcrypt almacenado, que es el contrato de verificación.
