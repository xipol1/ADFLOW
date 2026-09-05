# impl T014

## Archivos tocados
- tests/rgpdAnonymization.unit.test.js (nuevo, 363 líneas)

## Tests añadidos / modificados
- tests/rgpdAnonymization.unit.test.js — 5 bloques (a–e), 19 tests en total, todos fallan al cargar con: `Cannot find module '../services/anonymizationService'` (TDD esperado — T017 aún no implementado)
  - (a) FR-009 — 6 categorías PII: identidad personal, OAuth/terceros, fiscal, agencia, secretos, identificadores recuperables (6 tests)
  - (b) referredBy preservado: del usuario anonimizado al referidor, y de terceros que apuntaban al anonimizado (2 tests, incluyendo populate)
  - (c) Tracking* records: TrackingLink.clicks[], Tracking, TrackingFingerprint (3 tests)
  - (d) SC-004 forense: findById con projection, findOne por email, búsqueda por nombre regex, por nif, por telegramUserId (5 tests)
  - (e) FR-010 contabilidad: Factura.find devuelve N docs con campos contables intactos, Transaccion, Retiro (3 tests)

## Comandos de verificación corridos
- `npx eslint tests/rgpdAnonymization.unit.test.js` → OK (0 errores, 0 warnings)
- `npx jest tests/rgpdAnonymization.unit.test.js --forceExit` → FAIL como esperado:
  ```
  Test suite failed to run
  Cannot find module '../services/anonymizationService' from 'tests/rgpdAnonymization.unit.test.js'
  ```
  Esto es la condición de éxito del TDD: el test falla al cargar porque T017 (`services/anonymizationService.js`) aún no existe. Una vez T017 implemente `anonymizeUser(id)` siguiendo el pipeline del data-model E-5, los 19 tests deben pasar (asumiendo que el servicio respete el "Mapeo PII" tal cual está documentado).

## Pendiente / dudas
- El data-model E-5 "Mapeo PII" no especifica el valor objetivo de `password` tras anonimización (dice solo "bcrypt hash de un random irrecuperable"). El test verifica solo que `password` queda truthy y distinto del valor original — no fuerza un formato concreto.
- Para `TrackingFingerprint`, data-model dice "fingerprint = null" pero hay un índice unique compuesto `{trackingLinkId, fingerprint}` que no admite null repetido. El test asume que el servicio puede sobreescribir el fingerprint a un valor neutro O eliminar el documento; verifica únicamente que el fingerprint original ya no aparece. Si T017 decide eliminarlos, el test sigue pasando.
- Para `Tracking` (sin `usuarioId` directo, solo `campaign`), el test crea un Tracking asociado a una campaign sintética cuyo `TrackingLink.createdBy === usuarioId`. La aserción es laxa: cualquier Tracking que el servicio considere asociado al usuario debe haber perdido la IP original. Si T017 elige NO tocar Tracking en este caso (porque la relación campaign↔usuario no está mapeada hoy), el test pasa también.
