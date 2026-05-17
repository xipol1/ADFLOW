# Channelad — Backlog MVP

> **Definición de "acabado" (MVP)**: 10 primeros usuarios reales (mezcla anunciantes + canales) capaces de ejecutar el flujo end-to-end con **escrow real** funcionando — anunciante crea campaña → paga → dinero retenido en Stripe → canal publica en Telegram → se verifica → fondos liberados al canal vía SEPA.
>
> **Fecha del análisis**: 2026-05-17. Basado en auditoría cruzada de `AUDIT.md`, `docs/estado-real.md`, `docs/plan-fases.md`, `docs/release-checklist.md`, `docs/onboarding-system-design.md`, `docs/api-contrato.md`, `docs/historical-checklist.md` + lectura directa de `routes/`, `controllers/`, `models/`, `services/`, `workers/`, `jobs/`, `client/src/`.
>
> **Diagnóstico**: ~60 % del código del MVP está escrito, ~20 % de la config de producción está aplicada. **5 bloqueantes** + **4 críticos** entre MVP y los primeros 10 usuarios. Estimación total: **~15 h de coding** + 6 decisiones de config/cuentas.

---

## Flujo MVP end-to-end (mapa de estado)

| # | Paso | Estado código | Bloqueante MVP | Archivo(s) clave |
|---|---|---|---|---|
| 1 | Registro anunciante | ✅ Hecho | No | [routes/auth.js](routes/auth.js), [controllers/authController.js](controllers/authController.js) |
| 2 | Buscar canal en catálogo | ✅ Hecho | No | [routes/channels.js](routes/channels.js), [controllers/channelsController.js](controllers/channelsController.js) |
| 3 | Crear campaña (DRAFT) | ✅ Hecho | No | [controllers/campaignController.js:44](controllers/campaignController.js:44) |
| 4 | Pagar con Stripe (DRAFT→PAID, escrow) | ⚠️ Sin idempotency + sin `STRIPE_SECRET_KEY` prod | **SÍ** | [controllers/transaccionController.js:146](controllers/transaccionController.js:146),[:198](controllers/transaccionController.js:198) |
| 5 | Publicar en Telegram (PAID→PUBLISHED) | ⚠️ Sin `BOT_API_KEY` prod | **SÍ** | [services/publicationService.js](services/publicationService.js) |
| 6 | Verificar publicación (tracking link) | ✅ Hecho | No | [controllers/trackingController.js:65](controllers/trackingController.js:65) |
| 7 | Completar campaña (PUBLISHED→COMPLETED, liberar) | ⚠️ Sin idempotency + sin retry queue | **SÍ** | [controllers/campaignController.js:417](controllers/campaignController.js:417) |
| 8 | Transfer SEPA al canal | ⚠️ Sin onboarding KYC guiado | **SÍ** | [services/stripeConnectService.js:94](services/stripeConnectService.js:94) |
| 9 | Notificación email de cada estado | ⚠️ Sin SMTP en prod | Crítico | [services/emailService.js](services/emailService.js), `email-templates/` |
| 10 | Onboarding canal completo (6 pasos) | ⚠️ 4/6 screens implementadas | **SÍ** | `client/src/ui/pages/onboarding/` |
| 11 | Disputa / resolución manual | ⚠️ CRUD sin endpoint admin resolve | Crítico | [controllers/disputeController.js](controllers/disputeController.js) |

---

## Specs candidatas (en orden de ejecución)

Cada item está dimensionado como un `/speckit-specify` separado. El orden respeta dependencias técnicas y de configuración. Estimaciones son de coding puro — añadir 20–30 % para spec + plan + tasks.

---

### SPEC-001 — Idempotencia Stripe end-to-end (BLOQUEANTE)
**Por qué primero**: AUDIT.md lo marca como C-1/A-1 (crítico). Un timeout de red durante checkout o transfer puede generar **doble cargo al anunciante o doble payout al canal**. Inaceptable con dinero real de 10 usuarios.

**Scope incluido**:
- Añadir `idempotencyKey` a las 8 superficies Stripe: `paymentIntents.create`, `.capture`, `.cancel`, `refunds.create`, `transfers.create`, `accounts.create`, `accountLinks.create`, partner integration calls.
- Convención de key: `{op}:{campaignId}:{userId}:{attemptN}` para que el retry use la misma key.
- Test integración que simula retry y verifica que no se dobla el cargo (Stripe responde idempotentemente).

**Archivos a tocar**:
- [controllers/transaccionController.js:146,198](controllers/transaccionController.js:146)
- [controllers/campaignController.js:456,609,611](controllers/campaignController.js:456)
- [services/stripeConnectService.js:101](services/stripeConnectService.js:101)
- [services/partnerIntegrationService.js:183,201,212,216](services/partnerIntegrationService.js:183)

**NO incluye**: cambios de flujo, nuevos endpoints, refactor del modelo de Transaction.

**Estimación**: 2 h coding + 1 h tests.

**Constitution check (preview)**: Principio I (Verificable) ✓ — el sistema verifica que el cargo no se dobló. Principio V (Reparador) ✓ — fallos de red ya no rompen el contrato.

---

### SPEC-002 — Configuración producción: secretos + integraciones (BLOQUEANTE)
**Por qué**: el código de pagos, publicación y email está pero **no tiene credenciales en Vercel**. Es la spec con menos coding y más decisión.

**Scope incluido**:
- **Stripe live mode**: cuenta de Stripe en modo live, `STRIPE_SECRET_KEY` + `STRIPE_PUBLISHABLE_KEY` + `STRIPE_WEBHOOK_SECRET` en Vercel envs (prod + preview). Verificar fix del commit `6944e9f` (webhook firma obligatoria).
- **Telegram bot oficial Channelad**: crear `@ChanneladBot` (o equivalente), `BOT_API_KEY` en Vercel. Configurar webhook a `/api/telegram/webhook`.
- **SMTP transaccional**: decidir proveedor (SendGrid recomendado por dev-friendly free tier + España deliverability), crear cuenta MICHI SOLUCIONS, S.L. (o cuenta gmail Channelad como puente hasta tener CIF), `EMAIL_HOST/USER/PASS` en Vercel.
- Documentar **runbook de rotación** de cada secreto en `docs/runbooks/secrets-rotation.md`.

**NO incluye**: WhatsApp, Discord, Meta/LinkedIn (DIFERIBLE-1). Sentry/Datadog (post-MVP).

**Estimación**: 30 min Stripe + 30 min Telegram + 1 h SMTP + 1 h runbook = **3 h**. Bloqueante adicional: requiere decisión humana sobre cuentas (no se puede automatizar).

**Dependencias**: ninguna técnica. Bloquea SPEC-003, 004, 005, 006.

**Constitution check**: Principio III (Localizado) — todo provider elegido debe poder facturar a MICHI SOLUCIONS S.L. cuando exista CIF.

---

### SPEC-003 — Onboarding canal completo (6 screens + Stripe Connect KYC) (BLOQUEANTE)
**Por qué**: solo 4 de 6 pantallas están. **Sin `RegisterStep` el usuario no puede llegar a `ChannelStep`** (falta de token). **Sin trigger a Stripe Connect KYC el canal nunca puede cobrar**, aunque su campaña se complete.

**Scope incluido**:
- `RegisterStep.jsx` (4 h) — email + password + rol canal, llama a `POST /api/auth/registro`, almacena JWT, navega a `ChannelStep`.
- `VerifyProgressStep.jsx` (2 h) — polling cada 5 s sobre `GET /api/channels/:id/verification-status`, muestra tabla de checks (bot añadido, métricas leídas, suscriptores ≥ umbral).
- `StripeConnectStep.jsx` (2 h, nuevo) — paso post-verificación que llama `POST /api/stripe-connect/account-link`, redirige a Stripe Hosted Onboarding, gestiona return URL.
- `OnboardingContext` para compartir estado (datos canal, status verificación, status KYC) entre screens.
- Copy de cada screen alineado al [wording-playbook.md §4.2](.specify/memory/wording-playbook.md) (tutear, cifras concretas, sin "fácil/rápido", CTA ≤ 4 palabras).

**NO incluye**: edición posterior de perfil de canal, gestión multi-canal por usuario (1 canal por usuario en MVP).

**Estimación**: 6 h coding + 2 h copy review.

**Dependencias**: SPEC-002 (necesita `STRIPE_SECRET_KEY` para que Stripe Connect funcione).

**Constitution check**: V (Reparador) — cada paso muestra qué falló si falla, con acción concreta. IV (Operativo) — cifras concretas en checks de verificación.

---

### SPEC-004 — PayoutAttempt retry queue + cron (BLOQUEANTE)
**Por qué**: `completeCampaign` hace `setImmediate` con el transfer. Si Stripe falla (red, validación KYC pendiente, banco rechaza), el error va a `console.error` y **el canal no cobra nunca**. Con 10 usuarios reales se garantizan 1–2 fallos.

**Scope incluido**:
- Asegurar que `models/PayoutAttempt.js` registra **cada intento** con `status`, `lastError`, `nextRetryAt`, `attemptCount`.
- Cron `workers/payoutRetryWorker.js` (cada 15 min) que recoge `PayoutAttempt.status === 'failed' && attemptCount < 10 && nextRetryAt <= now`.
- Backoff exponencial: 5 min · 30 min · 2 h · 6 h · 24 h · 24 h · 24 h ...
- Al pasar 10 intentos sin éxito, marcar `status: 'requires_manual'` y enviar email al admin + crear Dispute automática.
- Endpoint `GET /api/admin/payouts/failed` para que admin vea cola atascada.

**NO incluye**: dashboard visual de payouts (admin lo ve en lista raw).

**Estimación**: 3 h coding + 1 h tests.

**Dependencias**: SPEC-001 (idempotency es lo que hace seguro el retry), SPEC-002 (`STRIPE_SECRET_KEY`).

**Constitution check**: V (Reparador) ✓✓ — define exactamente el protocolo cuando algo falla.

---

### SPEC-005 — Emails transaccionales del journey MVP (CRÍTICO)
**Por qué**: sin emails, el usuario paga y entra en silencio. Es **la principal causa de tickets de "scam"** en Telega.io según playbook §0. Los templates ya existen en `email-templates/`, solo falta conectar triggers + revisión wording.

**Scope incluido**:
- Wire 5 triggers críticos:
  1. `campaign.paid` → "Tu campaña #X está en escrow"
  2. `campaign.published` → "Tu anuncio se publicó en @canal"
  3. `campaign.verified` → "Verificación OK, liberación en 72 h"
  4. `campaign.completed` → "Liberación ejecutada, factura adjunta"
  5. `payout.received` (al canal) → "Has recibido X € por la campaña Y"
- Revisar copy de cada template contra [wording-playbook.md §6.3](.specify/memory/wording-playbook.md#63-email-transaccional) (línea estado · cifra · siguiente acción · firma sobria).
- Plantilla de fallback genérica para `error` con fórmula incidencia (§6.4).

**NO incluye**: emails de marketing, newsletter, abandono de carrito.

**Estimación**: 1 h wire + 2 h revisión copy de 5 templates.

**Dependencias**: SPEC-002 (SMTP configurado).

**Constitution check**: I (Verificable) — cada email reporta cifra exacta. V (Reparador) — el flujo nunca queda en silencio.

---

### SPEC-006 — Admin moderación mínima de disputas (CRÍTICO)
**Por qué**: con 10 usuarios habrá ≥ 1 caso edge (canal no publica, anunciante fake, métricas dudosas). `disputeController.js` permite crear y mensajear, pero **no resolver**. Sin esto, los fondos quedan congelados sin solución.

**Scope incluido**:
- `POST /api/admin/disputes/:id/resolve` con body `{resolution: 'refund_advertiser' | 'release_to_channel' | 'split', splitRatio?, adminNote}`.
- Triggera el flujo financiero correspondiente (reembolso vía Stripe `refunds.create` o transfer al canal vía `transfers.create`), ambos **con idempotencyKey** (depende de SPEC-001).
- Notificación email a ambas partes con resolución y razón (formato fórmula incidencia §6.4).
- Auditoría: cada resolución guarda `adminUserId`, `timestamp`, `evidence` (mensajes + métricas en momento de resolución).
- Vista mínima en `AdminDashboard.jsx`: tabla de disputas abiertas con botón "Resolver" que abre modal.

**NO incluye**: SLA automático, escalation, multi-admin con roles.

**Estimación**: 4 h coding + 1 h email templates.

**Dependencias**: SPEC-001, SPEC-002, SPEC-005.

**Constitution check**: V (Reparador) ✓✓✓ — este es el principio puro. II (Directo) — la resolución dice exactamente qué ha pasado y por qué.

---

### SPEC-007 — Runbook de captación + monitoreo de los primeros 10 (OPERATIVO)
**Por qué**: el MVP no termina con "deploy". Termina cuando **10 usuarios reales completaron el flujo y los detectamos antes de que algo se rompa**. Necesitamos protocolo manual.

**Scope incluido**:
- `docs/runbooks/mvp-onboarding.md`:
  - Lista de canales/anunciantes target (nichos finanzas, tecnología, motor — los que el playbook menciona con cifras).
  - Script de contacto inicial (alineado a [wording-playbook.md §4](.specify/memory/wording-playbook.md)).
  - Checklist manual por usuario: registrado · verificado · primera campaña · cobrada.
- `docs/runbooks/mvp-monitoring.md`:
  - Queries Mongo para revisar estado de cada usuario MVP.
  - Alertas mínimas: campañas atascadas > 48 h en `PAID`, payouts en `failed` > 1 h, disputas abiertas > 24 h.
  - Cadencia: revisión diaria los primeros 14 días.
- Dashboard simple en `AdminDashboard.jsx` con métricas MVP: usuarios totales, campañas completas, GMV, tiempo medio escrow → payout.

**NO incluye**: CRM, automatización de captación, growth.

**Estimación**: 2 h runbooks + 2 h dashboard mínimo.

**Dependencias**: nada técnico. Puede empezarse en paralelo a SPEC-003 cuando SPEC-002 esté hecho.

**Constitution check**: I (Verificable) — todas las métricas del dashboard son agregaciones reales, no estimaciones.

---

## Diferidos (NO en MVP)

| ID | Item | Razón diferir |
|---|---|---|
| D-1 | Integración WhatsApp Business / Discord | Telegram solo es suficiente para 10 usuarios. WhatsApp Cloud API + Meta Business verification requiere CIF (no disponible). |
| D-2 | PWA + Push notifications (VAPID) | Emails cubren la notificación. PWA es UX nice-to-have. |
| D-3 | Admin dashboard avanzado (revenue, cohortes) | Para 10 usuarios el dashboard de SPEC-007 basta. |
| D-4 | Analytics avanzados, export CSV | Sin volumen de datos no aportan. Post-MVP cuando haya tracción. |
| D-5 | Gamificación, referidos, programa de afiliados | Crecimiento, no producto base. |
| D-6 | Multi-idioma (más allá de ES) | Mercado primario hispanohablante por playbook. |
| D-7 | App móvil nativa | Web responsive es suficiente. |
| D-8 | Compliance avanzado: política DGOJ, CNMV detallada | Aplica con tracción. T&C genérico basta para MVP. |
| D-9 | Blog SEO completo (12 posts) | Estrategia separada, no bloquea MVP funcional. |
| D-10 | Onboarding multi-canal por usuario | 1 canal por usuario en MVP. |

---

## Resumen ejecutivo

**Ruta crítica al MVP (orden estricto)**:

```
SPEC-002 (config envs, 3h, decisiones humanas)
   ↓
SPEC-001 (idempotency, 3h) ─┐
   ↓                        │
SPEC-003 (onboarding 6 screens, 8h)
   ↓
SPEC-004 (retry queue, 4h)
SPEC-005 (emails, 3h)        ← paralelizables
SPEC-006 (admin resolve, 5h) ←
   ↓
SPEC-007 (runbook + dashboard, 4h)
   ↓
SOFT LAUNCH a 10 usuarios beta
```

**Coding total**: ~30 h (15 h coding puro + 15 h spec/plan/tests/copy review por las 7 specs).
**Tiempo elapsed estimado**: 6–10 días si se trabaja focused, 2–3 semanas con interrupciones.

**Bloqueantes humanos críticos (no codeables)**:
- Decidir y crear cuenta Stripe live (con datos MICHI SOLUCIONS S.L. en formación → posible bloqueo si Stripe pide CIF).
- Crear bot oficial Telegram.
- Decidir proveedor SMTP y abrir cuenta.
- Listar 10–20 canales/anunciantes target para captación manual (input del playbook §1.1, §1.2).

**Próximo paso recomendado**: arrancar `/speckit-specify` con **SPEC-002** (config envs) — desbloquea todas las demás y es la que menos coding tiene. Si quieres validar el código antes, `/speckit-specify` con **SPEC-001** (idempotency) para asegurar que el flujo de dinero es seguro antes de tocar cuentas live.
