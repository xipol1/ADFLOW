# Channelad — Backlog MVP

> **Definición de "acabado" (MVP)**: 10 primeros usuarios reales (mezcla anunciantes + canales) capaces de ejecutar el flujo end-to-end con **escrow real** funcionando — anunciante crea campaña → paga → dinero retenido en Stripe → canal publica en Telegram → se verifica → fondos liberados al canal vía SEPA.
>
> **Premisa de orden** (decisión explícita 2026-05-18): **Stripe va al final**. Antes de tocar pagos live se completan todos los huecos user-facing, legales, de UX y de operativa que no dependen de cuentas Stripe en producción. Razón: maximizar el código testable sin dinero real circulando y dejar Stripe para una fase concentrada al final.
>
> **Diagnóstico actualizado 2026-05-18**: ~**75 %** del producto user-facing está implementado (44 rutas, 30+ páginas creator/advertiser, calculadora de tarifa, 2FA, Google OAuth, intel multiplataforma, 32+ posts blog, 18 templates email, 40 test files). El primer corte de este backlog (2026-05-17) había estimado 60 % porque miró solo el flujo de pago. Estimación total al MVP: ~**35–45 h coding** distribuidas en 6 fases.
>
> **Regla operativa**: nada de lo desarrollado se elimina. Rutas/código sin UI consumidora se documentan como "intel pendiente de exposición" y se decide caso a caso.

---

## Fase A — Acciones inmediatas (cero dev, alto riesgo si se pierde)

### A.1 Commit del trabajo untracked en `main` (URGENTE)

El repo principal tiene archivos críticos terminados pero sin commitear. Si algo borra el working dir de main (un `git clean`, un reset accidental), se pierde.

```
client/src/ui/components/CookieBanner.jsx          # RGPD compliance
client/src/ui/components/TermsAcceptanceGate.jsx   # gate legal previo a uso
client/src/ui/components/brand/ChannelAdLogo.jsx   # asset de marca
lib/sentry.js                                       # error tracking
client/src/ui/pages/blog/posts/*.jsx (4 posts)     # contenido SEO
content/blog/*.md (4 posts)                        # fuente markdown
public/blog/*.html (4 builds)                      # output generado
deploy-checklist-landing-unification.md            # checklist deploy
```

**Acción** (sobre `main`, no este worktree): inspeccionar cada archivo y crear 2–3 commits temáticos: `feat(legal)`, `feat(blog)`, `chore(observability)`. **0 h coding, ~30 min de revisión.**

### A.2 Inventario de rutas "intel" — ✅ COMPLETADO 2026-05-18

Verificación manual de las 4 rutas que un agente Explore había marcado como "zombie". **Diagnóstico corregido**: todas son infraestructura productiva. Detalle completo en [`intel-routes-inventory.md`](./intel-routes-inventory.md).

Resumen:
- `routes/telegramIntel.js` — cron diario 02:30 UTC, infra backend, no requiere UI ✅
- `routes/multiplatformIntel.js` — cron diario 04:00 UTC, infra backend, no requiere UI ✅
- `routes/channelCandidates.js` — cron Lunes 05:00 + admin endpoints, UI en `CandidatesReviewPage.jsx` ✅
- `routes/channelIntelligence.js` — endpoint público rate-limited, **consumido por 12+ páginas del cliente** (ChannelExplorer, AnalyzeChannel, AudienceInsights, AudienceOverlap, AuditChannels, CreatorAnalytics, CompareChannels, LookalikeChannels, NewCampaign, PositionTracker, ClaimChannel) ✅

**Lectura estratégica**: el subsistema Channel Intelligence (12+ páginas + 2 crons diarios + 1 semanal + pipeline TGStat → candidates → canal aprobado) constituye **moat real** alineado con wedge del playbook §1.3 (verificación de métricas) y Principio I de la constitution (Verificable). No tocar como "limpieza".

**Acción recomendada post-MVP**: página "Cómo verificamos los canales" en landing/FAQ para sobre-comunicar este diferenciador.

---

## Fase B — Confianza & legal (lo que un usuario nuevo MIRA primero)

Sin estas piezas, el usuario decide en los primeros 30 segundos que la plataforma no es fiable o legal. **Cero dependencia de Stripe**.

### SPEC-B1 — Eliminación de cuenta + export de datos (RGPD)

**Por qué**: la página de Privacy promete derechos RGPD que no tienen endpoint detrás. Es **incumplimiento legal** si entra cualquier usuario europeo y es la primera cosa que un revisor RGPD comprueba.

**Scope**:
- `DELETE /api/users/me` con confirmación email (token 24 h), borrado soft + anonimización tras 30 días.
- `GET /api/users/me/export` que genera ZIP con: perfil, campañas, transacciones (sin datos Stripe sensibles), disputas, mensajes. Async + email con link de descarga (expira 7 días).
- UI en `client/src/ui/pages/settings/AccountPage.jsx` con sección "Tus derechos": exportar / eliminar, con confirmaciones que cumplan playbook §6.4 (fórmula incidencia).

**NO incluye**: derecho de rectificación automatizado (ya hay edición de perfil).

**Estimación**: 4 h coding + 1 h copy. **Sin dependencia Stripe.**

**Constitution check**: III (Localizado) — RGPD es requisito ES. II (Directo) — el usuario ve exactamente qué se borra y qué queda.

### SPEC-B2 — FAQ pública con las 8 objeciones preacordadas

**Por qué**: el playbook §5 (`wording-playbook.md`) tiene 8 objeciones con respuestas literales. **No existe ruta `/faq` pública**. Cada objeción no respondida es un usuario que no convierte.

**Scope**:
- Página `client/src/ui/pages/help/FAQPage.jsx` con sección anunciante (O1–O4) y canal (O5–O8) del playbook.
- Schema.org `FAQPage` structured data por cada pregunta.
- Enlaces desde footer y desde landings.
- Buscador interno simple (cliente, sin backend).

**NO incluye**: FAQ dinámica desde DB (las 8 son estables; ampliar es PATCH del playbook).

**Estimación**: 2 h coding + 0 copy (ya escrito en playbook). **Sin dependencia.**

**Constitution check**: I (Verificable), V (Reparador) — respuestas que disuelven objeciones reales con mecanismo concreto.

### SPEC-B3 — Versionado de T&C + aceptación con fecha

**Por qué**: el `TermsAcceptanceGate.jsx` (untracked) bloquea la app hasta aceptar T&C, pero no hay registro **cuándo** ni **qué versión** aceptó cada usuario. Sin esto, ante cualquier cambio futuro de T&C no se puede demostrar consentimiento previo.

**Scope**:
- Modelo `TermsVersion` (`version`, `effectiveDate`, `htmlSnapshot`).
- Campo `User.acceptedTerms = [{version, acceptedAt, ip}]`.
- Endpoint `POST /api/legal/accept` que registra aceptación atómicamente.
- Al detectar versión nueva, `TermsAcceptanceGate` muestra diff resumido y re-pide aceptación.

**NO incluye**: editor de T&C en admin (versionado se hace por commit en `content/legal/`).

**Estimación**: 3 h coding + 1 h tests.

**Dependencias**: A.1 (commitear `TermsAcceptanceGate.jsx` primero).

**Constitution check**: III (Localizado) — cumplimiento ES. I (Verificable) — quedan trazas auditables.

### SPEC-B4 — Edad gate 18+

**Por qué**: muchos anuncios en comunidades son de productos sensibles (apuestas, criptos, salud) regulados con edad mínima. Sin gate no hay defensa ante reclamación.

**Scope**:
- Modal en primera visita / primer registro pidiendo confirmación de mayoría de edad.
- Para canales que se registran, confirmar también que sus suscriptores son mayoritariamente +18 (declaración bajo responsabilidad).
- Persistir en `User.ageConfirmedAt`.

**NO incluye**: verificación de edad real (DNI scan) — está fuera de scope MVP.

**Estimación**: 1 h coding + 30 min copy.

**Constitution check**: III (Localizado) — protocolo conservador alineado a regulación ES.

### SPEC-B5 — Schema.org structured data completo

**Por qué**: `SEO.jsx` tiene `<meta>` y Open Graph pero falta JSON-LD para `Organization`, `WebSite`, `Product` (cada canal), `Article` (cada post de blog) y `FAQPage` (de B2). Google Search Console no muestra rich results actualmente; SEO pierde clicks.

**Scope**:
- Componente `<JsonLd type="..." data={...}>` reutilizable.
- Inyectar en: landing root, página de canal, posts de blog (cada uno), FAQ.

**NO incluye**: AMP, breadcrumbs estructurados (post-MVP).

**Estimación**: 2 h coding + 1 h validación con Schema.org validator + Google Rich Results Test.

**Constitution check**: I (Verificable) — los datos JSON-LD son auditables externamente.

---

## Fase C — UX completa (cierre de huecos visibles)

Lo que un usuario activo (no nuevo) echa de menos. **Cero dependencia Stripe.**

### SPEC-C1 — Onboarding 6 screens (sin step Stripe Connect todavía)

**Por qué**: ya estaba en backlog v1 como SPEC-003 (bloqueante). Sigue siendo bloqueante porque sin `RegisterStep` no hay token para `ChannelStep`. Implementamos las 5 screens no-Stripe; el `StripeConnectStep` se añade en Fase F.

**Scope**:
- `RegisterStep.jsx` (4 h) — email + password + rol canal, llama `POST /api/auth/registro`.
- `VerifyProgressStep.jsx` (2 h) — polling sobre `GET /api/channels/:id/verification-status`.
- `OnboardingContext` para estado compartido.
- Stub temporal `StripeConnectStep` que muestra "Configurarás cobros en tu primera campaña aceptada" — placeholder a sustituir en Fase F.
- Copy alineado a wording-playbook §4.2.

**NO incluye**: KYC Stripe real (va en Fase F).

**Estimación**: 6 h coding + 2 h copy.

**Constitution check**: V (Reparador) en cada step, IV (Operativo) en checks de verificación.

### SPEC-C2 — Wishlist / favoritos de canales

**Por qué**: anunciante explora 20+ canales antes de decidir. Sin favoritos pierde el contexto entre sesiones y re-busca.

**Scope**:
- Modelo `Favorite (userId, channelId, createdAt)`.
- Endpoints `POST /api/favorites/:channelId`, `DELETE`, `GET /api/favorites`.
- Botón estrella en cards del catálogo + página `/mis-favoritos`.

**Estimación**: 2 h coding.

**Constitution check**: II (Directo) — sin paywall, feature útil gratis.

### SPEC-C3 — i18n LATAM variants

**Por qué**: el playbook §0 dice "funcionaría igual para anunciante español que para creador mexicano". Actualmente solo hay `es` y `en` en `SEO.jsx`. Falta diferenciar locales LATAM (formato fecha/moneda, vocabulario regional como *autónomo* vs *monotributista*).

**Scope**:
- Setup `i18next` o equivalente si no existe; auditar primero.
- Locales: `es-ES`, `es-MX`, `es-AR`, `es-CO`. Inglés por compatibilidad SEO solo.
- Fallback en cascada: `es-MX` → `es` → `en`.
- Glosario regional mínimo (5–10 términos): autónomo/monotributista, euros/pesos, IRPF/ISR, modelo 036/CUIT…

**NO incluye**: traducción de blog (cada post es decisión editorial).

**Estimación**: 6 h setup + 3 h glosario inicial.

**Constitution check**: III (Localizado) ✓✓ — principio puro.

### SPEC-C4 — Accesibilidad (a11y) audit + fixes

**Por qué**: ninguna validación a11y detectada. Excluye usuarios con tecnologías asistivas y arriesga reclamación (UE Accessibility Act 2025). Es además requisito para subvenciones públicas (mencionado en memoria como motivo del proyecto).

**Scope**:
- Auditar con `axe-core` o Lighthouse a11y en las 10 páginas más visitadas (landings, catálogo, detalle canal, dashboard creator/advertiser, settings, login, registro, FAQ).
- Arreglar: contrastes < 4.5:1, falta de `alt`, headings desordenados, `aria-label` en botones icon-only, foco visible, keyboard nav en modals.
- Añadir test a11y básico en CI (jest-axe).

**Estimación**: 4 h audit + 6 h fixes (depende del baseline).

**Constitution check**: III (Localizado) — accesibilidad es requisito legal ES/UE.

### SPEC-C5 — Chat en vivo o form de contacto wired

**Por qué**: `SupportPage.jsx` existe pero el form no se sabe si envía a alguna parte. Sin canal de soporte vivo, los primeros 10 usuarios escriben a un email sin respuesta.

**Scope (opción A — form simple, recomendada)**:
- `POST /api/support/contact` que crea ticket en DB + envía email al admin.
- Auto-reply al usuario con número de ticket + tiempo de respuesta esperado (alineado a playbook §6.4).
- Vista admin en panel para listar tickets.

**Scope (opción B — chat externo)**:
- Embeber Crisp o Tawk.to (gratis) en layout para soporte síncrono.
- Decidir si compromete RGPD (terceros US → necesita mención en cookie policy).

**Recomendación**: A primero (sin terceros, sin coste), B si volumen lo justifica.

**Estimación A**: 3 h coding + 1 h email templates.

**Constitution check**: V (Reparador) — el usuario sabe que su mensaje llegó y cuándo se le responde.

### SPEC-C6 — Email digest semanal (creator + advertiser)

**Por qué**: 18 templates email transaccionales pero **ninguno proactivo** ("¿qué pasó esta semana?"). El usuario que no recibe notificación se desconecta.

**Scope**:
- Cron lunes 9:00 que agrega métricas semanales por usuario.
- Template creator: ingresos · campañas publicadas · próximos pagos.
- Template advertiser: campañas activas · gasto semana · CTR medio · próximas publicaciones.
- Preferencia opt-out en settings.

**Estimación**: 4 h coding + 2 h templates + revisión copy.

**Dependencias**: SMTP en prod (Fase F SPEC-F5 — pero el cron puede desarrollarse y testearse con mailtrap).

**Constitution check**: I (Verificable) — todas las cifras son agregaciones reales.

---

## Fase D — Calidad & ops (lo que evita explosiones en producción)

### SPEC-D1 — Push notifications completo (VAPID setup)

**Por qué**: el hook `usePushNotifications.js` está 90 % listo. Solo falta generar VAPID keys, registrar Service Worker en producción y crear endpoint para guardar subscription.

**Scope**:
- `npx web-push generate-vapid-keys` → guardar en envs (no en repo).
- Endpoint `POST /api/push/subscribe` y `DELETE /api/push/subscribe`.
- Wire 3 triggers críticos: campaña publicada, payout recibido, disputa nueva.
- Botón "Activar notificaciones" en settings.

**Estimación**: 3 h coding.

**Constitution check**: V (Reparador) — alternativa a email cuando bloqueado por filtros.

### SPEC-D2 — PWA + offline + Service Worker

**Por qué**: `manifest.json` existe pero no hay Service Worker activo. PWA install no funciona, offline page 0.

**Scope**:
- Service Worker con `workbox` (cache-first para assets, network-first para API).
- Offline page neutral con fórmula incidencia (§6.4).
- Install prompt suave (no bloqueante) tras 3 visitas.

**Estimación**: 4 h coding + 1 h testing en mobile real.

**Constitution check**: V (Reparador).

### SPEC-D3 — Healthcheck endpoint + uptime monitoring

**Por qué**: no hay `/api/health` explícito. Si el server muere, nadie se entera hasta que un usuario reporta.

**Scope**:
- `GET /api/health` que valida: Mongo conexión, Redis conexión, vars críticas presentes.
- Integrar UptimeRobot (gratis) o BetterStack haciendo ping cada minuto.
- Alerta a email admin si 2 fallos seguidos.

**Estimación**: 1 h coding + 30 min setup UptimeRobot.

**Constitution check**: I (Verificable).

### SPEC-D4 — User analytics privacy-friendly

**Por qué**: cero telemetría = volamos a ciegas con los primeros 10 usuarios. Pero GA4 contamina compliance RGPD.

**Scope**:
- Plausible.io self-hosted o Posthog Cloud EU (ambos no requieren consentimiento cookie según ICO/AEPD si configurados sin cookies).
- Eventos clave: registro completado, primera campaña creada, pago intentado (sin datos sensibles), publicación verificada.
- Dashboard accesible solo a admin.

**Estimación**: 2 h setup + 1 h instrumentación eventos.

**Constitution check**: III (Localizado) — provider compatible RGPD ES.

### SPEC-D5 — E2E tests Playwright en flujos críticos

**Por qué**: 40 tests Jest pero 0 E2E. Imposible saber si un cambio rompe el flujo completo de un usuario real.

**Scope**:
- Setup `@playwright/test`.
- 5 specs: registro completo · login + 2FA · crear campaña hasta paso pre-pago · onboarding canal hasta verificación · disputa create + admin resolve.
- CI: ejecutar en cada PR contra preview Vercel.

**Estimación**: 8 h setup + tests.

**Constitution check**: I (Verificable).

### SPEC-D6 — Admin dashboard expandido

**Por qué**: solo `CandidatesReviewPage.jsx` tiene UI. El backend admin tiene endpoints para users, campaigns, disputes, metrics — sin pantallas.

**Scope**:
- 4 páginas admin: `/admin/users` (lista, filtros, suspend, role change), `/admin/campaigns` (lista, override estados), `/admin/disputes` (cola + resolve, reusa SPEC-006 v1), `/admin/metrics` (revenue, GMV, funnel básico — alimentado por D4).
- Layout admin con sidebar.
- Guard por rol `admin`.

**Estimación**: 8 h coding (UI principalmente, backend ya está).

**Constitution check**: II (Directo) — admin ve todo sin trucos.

### SPEC-D7 — Feature flags UI admin

**Por qué**: `lib/plans.js` ya resuelve flags pero sin UI para togglear. Si una feature explota, hay que redeploy para apagarla.

**Scope**:
- Modelo `FeatureFlag (key, enabled, rolloutPercentage, audience)`.
- Página `/admin/flags` para toggle.
- Cache 60 s en backend.

**Estimación**: 4 h coding.

**Dependencias**: SPEC-D6 (capa admin).

**Constitution check**: V (Reparador) — kill switch para incidentes.

---

## Fase E — Notificaciones & comunicación (preparar el journey)

### SPEC-E1 — Emails transaccionales de campaña: wire + copy review

**Por qué**: 18 templates email existen pero **revisión de copy contra wording playbook pendiente** (algunos pueden tener "rápido", "fácil", emojis decorativos). El wiring de los 5 triggers críticos también.

**Scope**:
- Auditar los 18 templates contra wording-playbook §3 y §6.3 (fórmula email).
- Wire 5 triggers críticos del journey: `campaign.paid`, `campaign.published`, `campaign.verified`, `campaign.completed`, `payout.received`.
- Plantilla genérica de error con fórmula incidencia §6.4.
- SMTP en dev/staging con Mailtrap o Ethereal (gratis), sin tocar prod todavía.

**NO incluye**: configurar SMTP de producción (va en Fase F).

**Estimación**: 1 h wire + 3 h revisión de los 18 templates + 30 min setup Mailtrap.

**Constitution check**: I (Verificable), V (Reparador), II (Directo).

### SPEC-E2 — Notificaciones in-app: centro unificado

**Por qué**: el badge / dropdown existen pero el "ver todas" lleva a páginas separadas (creator/advertiser tienen distintas). Unificar.

**Scope**:
- `/notifications` única con filtros (sistema · campaña · pago · disputa).
- Marcar como leídas / archivar.
- Polling cada 30 s en lugar de Socket.io si simplifica (Socket.io ya existe en stack pero verificar uso).

**Estimación**: 3 h.

**Constitution check**: II (Directo).

---

## Fase F — Stripe y go-live (al final, como pediste)

> Esta fase **solo** se aborda después de A–E. Antes de empezar: confirmar disponibilidad de cuenta Stripe live (con datos MICHI SOLUCIONS S.L. — bloqueo posible si exigen CIF, ver Constitution Principio III).

### SPEC-F1 — Idempotencia Stripe end-to-end *(originalmente SPEC-001)*

Sin cambios respecto a versión anterior — añadir `idempotencyKey` a las 8 superficies Stripe. **3 h.**

### SPEC-F2 — Configuración producción Stripe + Telegram bot + SMTP prod *(originalmente SPEC-002)*

Sin cambios — provisionar `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BOT_API_KEY`, `EMAIL_*` en Vercel. **3 h + decisiones humanas.**

### SPEC-F3 — Stripe Connect KYC step en onboarding canal

Sustituir el stub `StripeConnectStep` de SPEC-C1 por el flujo real: `accountLink.create` → redirección a Stripe Hosted Onboarding → return URL. **2 h coding (refactor del stub).**

### SPEC-F4 — PayoutAttempt retry queue + cron *(originalmente SPEC-004)*

Sin cambios — retry con backoff exponencial, dispute automática tras 10 intentos. **4 h coding.**

### SPEC-F5 — Admin moderación de disputas con flujo financiero *(originalmente SPEC-006, ampliado)*

Cuando admin resuelve disputa, ejecutar reembolso/transfer Stripe con idempotency. UI básica ya hecha en SPEC-D6 → ampliar con triggers reales. **3 h delta.**

### SPEC-F6 — Runbook captación + dashboard primeros 10 *(originalmente SPEC-007)*

Sin cambios — runbook captación, queries Mongo, alertas mínimas, dashboard MVP. **4 h.**

---

## Diferidos (post-MVP confirmados)

| ID | Item | Razón |
|---|---|---|
| D-1 | WhatsApp Business / Discord publicación | Telegram solo basta para 10 usuarios. WhatsApp Cloud requiere CIF MICHI SOLUCIONS S.L. |
| D-2 | Blog SEO completo (12 posts del cluster) | Hay 32+ posts ya; el cluster específico es growth, no producto base |
| D-3 | Multi-canal por usuario | 1 canal/usuario en MVP |
| D-4 | App móvil nativa | Web responsive suficiente |
| D-5 | Programa de referidos | Crecimiento, post-MVP |
| D-6 | Webhooks salientes a usuarios B2B | API/integraciones avanzadas |
| D-7 | AMP / Breadcrumbs estructurados | Optimización SEO marginal |
| D-8 | Compliance avanzado DGOJ / CNMV detallado | Aplica con tracción |
| D-9 | Chat externo (Crisp/Intercom) | Form de SPEC-C5 basta inicialmente |
| D-10 | Editor de T&C en admin | Versionado por commit suficiente |

---

## Resumen ejecutivo

**Ruta sugerida** (~35–45 h de coding distribuidas):

```
Fase A — Acciones inmediatas               (~30 min, fuera del worktree)
   ↓
Fase B — Confianza & legal                 (~15 h)
   SPEC-B1, B2, B3, B4, B5
   ↓
Fase C — UX completa                       (~25 h)
   SPEC-C1, C2, C3, C4, C5, C6
   ↓
Fase D — Calidad & ops                     (~30 h)
   SPEC-D1, D2, D3, D4, D5, D6, D7
   ↓
Fase E — Notificaciones                    (~7 h)
   SPEC-E1, E2
   ↓
Fase F — Stripe + go-live                  (~15 h + decisiones humanas)
   SPEC-F1, F2, F3, F4, F5, F6
   ↓
SOFT LAUNCH a 10 usuarios beta
```

**Atajos posibles si el tiempo aprieta**:
- Saltar SPEC-D5 (E2E tests) si confías en tests Jest existentes → −8 h.
- Saltar SPEC-D7 (feature flags UI) → −4 h.
- Saltar SPEC-C2 (favoritos) → −2 h.
- Posponer SPEC-D6 admin dashboard expandido a post-MVP → −8 h.

**Mínimo viable absoluto** (sin atajos en confianza/legal): **A + B + SPEC-C1 + SPEC-C5 + Fase E + Fase F ≈ 30 h coding**.

**Próximo paso recomendado**: arrancar por **Fase A** (commit del trabajo untracked — 30 min, riesgo de pérdida es real), luego `/speckit-specify` con **SPEC-B1** (eliminación de cuenta + RGPD export) que es el hueco más urgente legalmente y abre además discusión sobre auth/sessions.
