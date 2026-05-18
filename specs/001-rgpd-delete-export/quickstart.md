# Quickstart — SPEC-B1 RGPD Delete + Export

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Date**: 2026-05-18

Cómo testear el flujo end-to-end en local antes del primer release. Asume el repo arrancado con `npm run dev:full` y MongoDB Atlas conectado.

---

## Setup local

### 1. Variables de entorno nuevas

Añadir a `.env`:

```bash
RGPD_TOKEN_SECRET=<openssl rand -hex 32>
RGPD_EXPORT_SIGNING_KEY=<openssl rand -hex 32>
CRON_SECRET=<openssl rand -hex 16>     # si no estaba ya
SMTP_HOST=smtp.mailtrap.io              # Mailtrap para testing
SMTP_PORT=2525
SMTP_USER=<tu user mailtrap>
SMTP_PASS=<tu pass mailtrap>
EMAIL_FROM=noreply@channelad.io
```

Validar con `node -e "require('./config/validateEnv')()"` — debe pasar sin warnings RGPD.

### 2. Confirmar índices Mongo

Al arrancar el server, los modelos crearán sus índices automáticamente. Verificar con:

```bash
mongosh "$MONGO_URI" --eval '
  db.accountdeletionrequests.getIndexes();
  db.dataexportrequests.getIndexes();
  db.rgpdauditlogs.getIndexes();
  db.reservedslugs.getIndexes();
'
```

Esperado: TTL en `confirmationTokenExpiresAt` (acdr), `expiresAt` (der), `reservedUntil` (rs).

### 3. Forzar ejecución del cron en dev

Vercel Cron no corre en local. Para testar el worker:

```bash
curl -X POST http://localhost:3000/api/jobs/rgpd-grace \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Test E2E manual: Eliminación de cuenta (US1)

### Caso happy path (sin operaciones pendientes)

1. Crear usuario de prueba advertiser desde la UI normal de registro.
2. Login en la app, ir a Dashboard → Configuración → Privacidad y datos.
3. Pulsar "Eliminar mi cuenta", modal aparece pidiendo confirmación con motivo opcional.
4. Pulsar "Continuar" — banner verde: "Te hemos enviado un email a tu_email@... — confirma el enlace en 24 horas".
5. Abrir Mailtrap → email con asunto "Confirma la eliminación de tu cuenta".
6. Click en el link del email — abre `/auth/confirm-deletion?token=...&id=...`.
7. Página confirma: muestra `liquidationPreview` (debería ser 0 todo en este caso happy path) y `gracePeriodEndsAt` formateado.
8. Pulsar "Confirmar borrado" → redirección al dashboard. Verificar:
   - Banner `DeletionGraceBanner` aparece en la parte superior con cuenta atrás.
   - `Usuario.deletionStatus === 'pending_deletion'` (mongosh).
   - `AccountDeletionRequest.status === 'grace_period'` (mongosh).
   - `Usuario.sesiones` está vacío.
9. **Acelerar gracia en dev**: actualizar manualmente `gracePeriodEndsAt` a `new Date(0)`:

   ```bash
   mongosh "$MONGO_URI" --eval '
     db.accountdeletionrequests.updateOne(
       { usuarioId: ObjectId("<id>") },
       { $set: { gracePeriodEndsAt: new Date(0) } }
     )
   '
   ```

10. Disparar cron manualmente (paso "Setup 3").
11. Verificar:
    - `Usuario.deletionStatus === 'anonymized'`, `Usuario.email` empieza por `deleted-`, `Usuario.nombre === 'Usuario'`, `Usuario.apellido === 'eliminado'`.
    - `RGPDAuditLog` tiene entrada `deletion.anonymized` con timestamp.
    - Mailtrap recibe email `rgpd-deletion-completed`.
    - Login con el email original devuelve 401.

### Caso bloqueante: disputa abierta

1. Crear disputa de prueba contra el usuario.
2. Intentar `POST /api/rgpd/deletion` — debe responder 409 `disputes_open` con lista.
3. UI debe mostrar lista de disputas con enlace a su resolución.

### Caso liquidación pausada (sin Stripe live)

1. Crear campaña con escrow simulado (mockear `Stripe.paymentIntents.create` o usar transacción manual en DB).
2. Solicitar borrado y confirmar.
3. Acelerar gracia.
4. Worker debe marcar `AccountDeletionRequest.status === 'paused_pending_stripe'` y notificar al usuario.
5. Mailtrap recibe email con explicación de la pausa.

### Caso agencia con canales

1. Cambiar `Usuario.tipoPerfil = 'agencia'` + crear canal con `gestorId = usuarioId`.
2. Intentar `POST /api/rgpd/deletion` — debe responder 409 `agency_clients_active` con lista de canales.

---

## Test E2E manual: Export de datos (US2)

1. Login con usuario que tenga al menos 2 campañas + 1 disputa + algún mensaje.
2. Dashboard → Configuración → Privacidad y datos → "Descargar mis datos".
3. Confirmar — banner aparece: "Estamos preparando tu archivo, recibirás un email cuando esté listo".
4. Verificar `DataExportRequest.status === 'queued'`.
5. Disparar cron manualmente.
6. Verificar `status === 'ready'`, `packageData` o `gridfsId` populado.
7. Mailtrap recibe email `rgpd-export-ready` con link.
8. Click en el link → descarga ZIP.
9. Descomprimir y verificar contenido (12 archivos + carpeta channels/ si creator):
   ```
   MANIFEST.json          — schemaVersion, generatedAt, files, exclusiones documentadas
   profile.json           — perfil sin password/2FA secrets
   campaigns.json         — campañas como anunciante
   transactions.json      — historial transaccional sin tokens Stripe
   invoices.json          — facturas emitidas (Factura.js) — datos fiscales
   disputes.json          — disputas con mensajes
   reviews.json           — reseñas dadas o recibidas
   notifications.json     — historial de notificaciones recibidas
   tracking-summary.json  — agregado (no eventos crudos — sin IPs individuales)
   conversions.json       — conversiones atribuidas
   retirosolicitudes.json — retiros solicitados
   consents.json          — historial T&C, cookies
   notifications-prefs.json
   channels/              — solo si rol=creator, un fichero por canal con perfil + métricas
   README.txt             — explicación humana en castellano
   ```
10. Esperar (o forzar) 7 días → link debe devolver 410 `link_expired`.

### Rate limit

1. Hacer 2 solicitudes consecutivas de export.
2. Segunda debe devolver 429 `rate_limit_exceeded` O bien `reused: true` con el `requestId` de la primera.

---

## Test E2E manual: Página "Mis derechos" (US3)

1. Login (cualquier rol).
2. Dashboard → Configuración → Privacidad y datos.
3. Verificar sección "Tus derechos RGPD" con los 6 derechos:
   - Acceso (botón funcional → flujo de export).
   - Rectificación (link a `/dashboard/profile`).
   - Supresión (botón funcional → flujo de borrado).
   - Portabilidad (botón funcional → flujo de export).
   - Limitación (mailto a `dpo@channelad.io`).
   - Oposición (mailto a `dpo@channelad.io`).
4. Cada item tiene explicación de una línea y plazo legal "30 días naturales".

---

## Test unitario clave: forensia anonimización (SC-004)

`tests/rgpdAnonymization.unit.test.js` cubre:

```javascript
test('PII de las 6 categorías se sobreescribe correctamente', async () => {
  const u = await Usuario.create({...todoslosCamposRellenos});
  await anonymizationService.anonymizeUser(u._id);
  const after = await Usuario.findById(u._id).lean();
  expect(after.email).toMatch(/^deleted-.+@anonymized\.local$/);
  expect(after.nombre).toBe('Usuario');
  expect(after.apellido).toBe('eliminado');
  expect(after.googleId).toBeNull();
  expect(after.telegramUserId).toBeNull();
  expect(after.twoFactorSecret).toBeNull();
  expect(after.twoFactorBackupCodes).toEqual([]);
  expect(after.sesiones).toEqual([]);
  expect(after.pushSubscriptions).toEqual([]);
  expect(after.datosFacturacion.nif).toBe('XXXXXXXXX');
  expect(after.referredBy).toBeDefined();   // preservado
  expect(after.deletionStatus).toBe('anonymized');
  expect(after.anonymizedAt).toBeInstanceOf(Date);
});

test('queries operativas no devuelven la PII original tras anonimización', async () => {
  await crearUsuariosDePrueba(50);
  const target = await Usuario.findOne({ email: 'target@example.com' });
  await anonymizationService.anonymizeUser(target._id);
  // Búsqueda por email original
  expect(await Usuario.findOne({ email: 'target@example.com' })).toBeNull();
  // Listado público de canales no expone nombre original si era creator
  const channels = await Canal.find({}).populate('propietario').lean();
  channels.forEach(c => {
    if (c.propietario && c.propietario._id.equals(target._id)) {
      expect(c.propietario.nombre).toBe('Usuario');
      expect(c.propietario.email).toMatch(/@anonymized\.local$/);
    }
  });
});
```

---

## Verificación SLA (SC-003)

Cron de export se dispara cada 10 min. Worker procesa hasta 10 requests por ciclo. Para volumen MVP (< 5 req/día), latencia desde request a `ready` es típicamente < 15 min. SLA spec: < 24 h. Margen 90x.

Para validar bajo carga simulada:

```bash
# Script de carga: crear 50 DataExportRequest simultáneas
node scripts/test-export-throughput.js --requests 50

# Esperar 30 min, verificar:
mongosh "$MONGO_URI" --eval '
  db.dataexportrequests.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ])
'
# Esperado: status="ready" >= 30 (tres ciclos de 10 cada uno).
```

---

## Troubleshooting

### Email no llega
- Verificar Mailtrap credenciales y que `EMAIL_FROM` está seteado.
- Mirar `logs/` para `[emailService] failed to send`.
- Test directo: `node -e "require('./services/emailService').send({to:'test@test.com',template:'rgpd-confirm-deletion',data:{...}})"`.

### Cron no se dispara
- Confirmar `CRON_SECRET` en header `Authorization: Bearer $CRON_SECRET`.
- Logs server deben mostrar `[rgpd-grace] starting` al disparar.

### ZIP corrupto al descomprimir
- Verificar header `Content-Disposition` correcto.
- Confirmar que el streamer no añade encoding (gzip/brotli) sobre el ZIP — Vercel a veces aplica compression a `application/octet-stream` pero no a `application/zip`. Setear `Content-Encoding: identity`.

### Anonimización no se ejecuta
- Verificar `Usuario.deletionStatus` en transición correcta.
- Mirar `RGPDAuditLog` para ver hasta dónde llegó.
- Tests: ejecutar `npm test -- rgpdAnonymization` para isolated.

---

## Pre-flight checklist antes de primer release

- [ ] Las 4 envs RGPD añadidas a Vercel (production + preview).
- [ ] SMTP de Mailtrap reemplazado por SMTP prod (SPEC-F2) o, si va antes, por cualquier SMTP que envíe los emails RGPD a buzón monitoreado.
- [ ] Vercel Cron `rgpd-grace` añadido al plan de cuenta (verificar slot disponible).
- [ ] `RGPD_EXPORT_SIGNING_KEY` rotada al menos una vez en staging antes de prod (verifica que enlaces previos se invalidan).
- [ ] Política de privacidad actualizada para referenciar la nueva sección "Privacidad y datos" en settings.
- [ ] `dpo@channelad.io` (o equivalente) operativo y forwarded a un buzón monitorizado.
- [ ] Tests `rgpdDeletion.integration` y `rgpdExport.integration` en verde en CI.
- [ ] Sentry (lib/sentry.js) cableado en `app.js` y captureando exceptions del worker (`rgpdExportWorker` / `rgpdDeletionWorker`).
- [ ] Banner `DeletionGraceBanner` testeado responsive (mobile + desktop).
- [ ] Audit log RGPD revisado por DPO/admin en staging con datos sintéticos.
