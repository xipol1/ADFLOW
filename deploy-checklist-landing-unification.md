# Deploy Checklist: channelad-frontend — landing-unification

**Release:** ForBrandsPage como nueva home (`/`)
**Fecha de deploy:** 2026-05-09 (sábado)
**Deployer / Owner:** Rafa Ferrer (frontend lead)
**Segundo par de ojos:** [⚠ CONFIRMAR ANTES DEL VIERNES 18:00 — sin esto no hay deploy]
**Estrategia:** Canary detrás de feature flag `new_landing_v2`
**Severidad:** Alta — afecta ~90% del tráfico (orgánico + directo + paid)

---

## ⚠ Resumen de riesgos críticos

Esta no es una release rutinaria a pesar del tag. Está marcada como "Routine update" pero el blast radius la convierte de facto en una release de alto impacto:

- Toda campaña de Google/Meta Ads aterriza en `/`
- SEO ranking del dominio concentrado en `/`
- Cambio de contenido principal de la home → fluctuación de SEO esperada 2–4 semanas
- Aunque el feature flag permite rollback en <2min, una pérdida de tráfico de adquisición durante ese intervalo se traduce en CAC perdido inmediato

Por eso esta checklist trata el deploy como release crítica, no rutinaria.

### ⚠ Riesgos asumidos por la fecha (sábado)

- Baseline reducido a **48h en lugar de 7 días** → más ruido, thresholds ampliados un 50%
- Si algo se rompe sábado 11:00, siguiente fix probable lunes
- Estado intermedio (25% canary) durante el fin de semana con menos atención del equipo
- Stakeholder de marketing puede no responder hasta lunes si hay issues con campañas

**Mitigación:** dejar canary en 25% durante el fin de semana, no expandir. Lunes 10:00 primer checkpoint con equipo presente.

### ⚠ Cobertura del fin de semana (84h post-deploy)

El segundo par de ojos confirmado solo cubre 09:00–13:00 sábado. Las 84h restantes (sáb 13:00 → lun 10:00) recaen únicamente en Rafa. Decisiones a tomar antes del viernes:

**Opción A (mínima):** Aceptar que Rafa es el único respondedor durante el fin de semana, con SLA degradado a 30min fuera de horario laboral (en lugar de <2min). Documentar que las alertas no críticas (ej: LCP degradado) se postpone su revisión al lunes.

**Opción B (recomendada):** Configurar rotación informal:
- Sábado 13:00 → Domingo 12:00: persona X
- Domingo 12:00 → Lunes 10:00: persona Y
- Backup de Rafa: alguien con acceso a flag dashboard + Vercel + Slack

**Opción C (conservadora):** Si no se consigue rotación, limitar el blast radius del fin de semana. Bajar el canary stage 2 de 25% a 10% antes de pausar, y solo expandir el lunes con equipo presente.

- [ ] **Decisión documentada antes del viernes 18:00:** A, B o C
- [ ] Si B: confirmar personas + horarios + briefing
- [ ] Si C: ajustar §2.5 stage 2 del 25% al 10% (ahora §2.5 es stage 2 tras la inserción de stage 1.5)

---

## 1. Pre-Deploy (T-48h → T-0)

### 1.1 Captura de baseline (T-48h, BLOQUEANTE — empezar 2026-05-07)

Sin baseline los thresholds de rollback no tienen referencia. Con solo 48h de runway hay que aceptar más ruido y ampliar márgenes.

- [ ] **HOY (jueves 07/05):** verificar que Posthog/Hotjar está capturando los 5 eventos clave en `/`. Si no lo está, instrumentación es la primera tarea
- [ ] Capturar 48h de métricas (07/05 18:00 → 09/05 18:00) en `LandingPage.jsx` actual:
  - [ ] Bounce rate (mediana, no media — menos sensible al ruido)
  - [ ] Avg. session duration
  - [ ] Scroll depth a 75%
  - [ ] Click rate CTA "Marketplace"
  - [ ] Conversión visit → registro
  - [ ] LCP mobile P75 (probable ~3s por Hero3D)
  - [ ] FCP mobile P75
  - [ ] JS bundle size landing (~280KB estimado)
- [ ] Documentar baseline en doc compartido con valores absolutos (no TBD), linkear desde este checklist
- [ ] Calcular thresholds finales con márgenes ampliados por baseline corto (ver §4)

### 1.2 Code & CI

- [ ] Todos los tests pasando en CI (unit + integration)
- [ ] PR aprobado por al menos 1 reviewer
- [ ] No hay bugs críticos abiertos contra `ForBrandsPage` o componentes compartidos
- [ ] Branch al día con `main` (rebase reciente)

### 1.3 Feature flag (`new_landing_v2`)

- [ ] Flag creado en el sistema de flags y verificado que existe en producción
- [ ] Default en producción = **OFF** (deploy del código no debe activar la nueva home)
- [ ] Targeting rules definidos para canary (ver §2.2 y §2.3)
- [ ] **Política de cookie sticky decidida: SESIÓN, 24h max** (no persistente — limpia el experimento al expirar)
- [ ] Kill switch documentado: quién lo flippea, desde dónde, en cuánto tiempo
- [ ] **Test bidireccional en staging:**
  - [ ] Flag OFF → ON: `/` cambia a `ForBrandsPage` en <30s
  - [ ] Flag ON → OFF: `/` vuelve a `LandingPage` legacy en <30s
  - [ ] Cookie sticky no impide ver el cambio tras purgar cookie + recargar
  - [ ] Cronometrar roundtrip completo: si >60s, el rollback real será demasiado lento → arreglar antes del sábado
- [ ] Verificar que el flag es server-side (no client-only) para evitar flicker en SSR

### 1.4 Decisión de auto-rollback: MANUAL para esta release

Para una ventana de runway de 48h no hay tiempo de configurar auto-rollback automatizado de forma confiable. Un script mal configurado es peor que rollback manual rápido.

- [ ] **Configurar alertas automáticas en Slack** que disparen en cuanto cualquier threshold del §4 se cruce (no rollback automático, solo alerta)
- [ ] Rafa + segundo par de ojos con flag dashboard abierto durante toda la ventana
- [ ] **SLA de respuesta humana: flippeo manual en <2min desde alerta**
- [ ] Test de las alertas: disparar un trigger fake en staging y verificar que llega a Slack
- [ ] Auto-rollback automático queda como TODO para el siguiente release

### 1.5 Breaking change: URL canónica + estructura SEO

Aunque marcado como "breaking API change", el cambio breaking real es de URL canónica + estructura de la home, no de API JSON. Tratamiento equivalente:

- [ ] Auditoría de internal linking: `grep -r 'to="/para-anunciantes"\|href="/para-anunciantes"'` en repo
  - [ ] Componentes
  - [ ] Posts del blog
  - [ ] Email templates
  - [ ] Footer / Header
- [ ] Decisión documentada: ¿se mantienen links a `/para-anunciantes` o se redirigen a `/`?
- [ ] Redirect 301 `/para-anunciantes` → `/` configurado en `vercel.json` o middleware
- [ ] Test del 301 con `curl -I` post-deploy a staging
- [ ] Stakeholder de marketing notificado: revisar destinos de URL en Google Ads + Meta Ads activas
- [ ] Si alguna campaña usa `/para-anunciantes` como landing → decidir si se actualiza o se mantiene el 301

### 1.6 SEO

- [ ] `<title>`, meta description, OG tags revisados en `ForBrandsPage`
- [ ] Schema.org WebSite markup presente
- [ ] `sitemap.xml` regenerado
- [ ] Canonical URL apunta a `/` (no a `/para-anunciantes`)
- [ ] `robots.txt` sin cambios accidentales
- [ ] Preparado: enviar sitemap a Search Console post-deploy + "Solicitar indexación" de `/`

### 1.7 Rendimiento (objetivo: superar el baseline)

- [ ] Lighthouse en preview deploy: Performance ≥ 85, Accessibility ≥ 95, SEO ≥ 95
- [ ] LCP mobile P75 < 2.5s (verificar con WebPageTest, no solo Lighthouse local)
- [ ] FCP mobile P75 < 1.5s
- [ ] JS bundle landing < 200KB (verificar con `next build` analyzer o equivalente)
- [ ] Hero/imágenes principales con `loading="eager"` + priority, resto lazy
- [ ] Fonts con `font-display: swap`
- [ ] Sin layout shift visible (CLS < 0.1)

### 1.8 Cross-browser & responsive

- [ ] Chrome desktop + mobile
- [ ] Safari desktop + iOS
- [ ] Firefox
- [ ] Edge
- [ ] Sticky bottom CTA bar mobile: no bloquea viewport, no solapa contenido scrolleable
- [ ] Visual regression con Playwright en ≥10 viewports
- [ ] Test en device real iOS Safari + Chrome Android (no solo emulador)

### 1.9 E2E happy paths (deben pasar antes del deploy)

- [ ] Anunciante nuevo: `/` → `/marketplace` → ver canales (auth gating) → registro → primer flow de campaña
- [ ] Anunciante existente: `/` → click "Iniciar sesión" → dashboard
- [ ] Creador: `/` → CrossLinks "Para creadores" → `/para-canales` carga correctamente
- [ ] 301: request a `/para-anunciantes` devuelve 301 → `/`

### 1.10 Comunicación previa

- [ ] Stakeholder de marketing avisado del deploy 48h antes (jueves 07/05) — confirmación recibida, no solo mensaje enviado
- [ ] Aviso en canal de Slack del equipo: ventana de deploy, owner, link a este checklist
- [ ] Soporte / CX heads-up T-24h por si reciben tickets confusos
- [ ] Si tienes status page interno: anuncio programado

### 1.11 Pre-flight viernes 2026-05-08, 18:00 (NO NEGOCIABLE)

Antes de ir a dormir el viernes, todos estos items deben estar verdes. Si alguno está abierto, **mover deploy al martes 12 de mayo**:

- [ ] Baseline de 48h capturado, métricas calculadas, thresholds del §4 escritos en absoluto (no TBD)
- [ ] Feature flag testeado en staging incluido el rollback path bidireccional
- [ ] Internal linking auditado (grep ejecutado, decisión documentada)
- [ ] Redirect 301 testeado en staging con curl
- [ ] Stakeholder de marketing **confirmación recibida** (no solo enviado)
- [ ] **Segundo par de ojos confirmado** con disponibilidad horaria 09:00–13:00 sábado mínimo
- [ ] E2E happy paths verdes en staging
- [ ] Lighthouse en preview ≥ thresholds del §1.7
- [ ] Posthog dashboard bookmarkeado, **alertas configuradas y testeadas con un trigger fake**
- [ ] Sentry dashboard bookmarkeado
- [ ] Plan de comunicación: mensaje de Slack pre-escrito para anunciar deploy + rollback si toca

---

## 2. Deploy day (2026-05-09, sábado)

### 2.1 Pre-flight (T-30min, 09:30)

- [ ] CI verde en commit a deployar
- [ ] Sin incidentes activos en producción
- [ ] Sentry / monitoring abierto en pestaña dedicada
- [ ] Posthog dashboard de la home abierto
- [ ] Vercel dashboard abierto
- [ ] Feature flag dashboard abierto
- [ ] Rafa + segundo par de ojos disponibles los próximos 60 min sin reuniones
- [ ] Slack con canal del equipo abierto

### 2.2 Deploy de código (flag aún OFF)

- [ ] Deploy a staging y smoke test
- [ ] Verificar en staging: con flag OFF, `/` muestra `LandingPage` actual; con flag ON, `/` muestra `ForBrandsPage`
- [ ] Promote a producción
- [ ] Verificar en producción: `/` sigue mostrando `LandingPage` actual (flag OFF default)
- [ ] Verificar Sentry: cero errores nuevos derivados del deploy
- [ ] Esperar 10 min observando

### 2.3 Canary stage 1 — 5% (T+0, ~10:00)

**Targeting rules para stage 1:**
- 5% del tráfico
- **EXCLUIR `utm_source = google_ads | meta_ads | tiktok_ads`** (paid traffic es CAC pagado, no se experimenta con él en stage 1)
- Excluir bots / crawlers
- Cookie sticky de sesión 24h

**Ejecutar:**
- [ ] Activar flag con targeting de stage 1
- [ ] Purge de CDN en `/` y `/para-anunciantes` en Vercel
- [ ] Esperar 15 min

**Triggers leading (instantáneos) durante stage 1:**
- [ ] Errores JS por sesión < 0.5%
- [ ] Bounce rate a 10s < baseline + 25%
- [ ] Click rate CTA primario en muestra > 50% del baseline (no esperar a conversiones lentas)
- [ ] Sentry: cero errores nuevos críticos
- [ ] LCP mobile no degradado vs baseline

### 2.4 Canary stage 1.5 — paid traffic al 5% (T+15min, ~10:15, si stage 1 OK)

**Por qué este paso intermedio:** el tráfico paid puede romper diferente que el orgánico. Los creatives de Google/Meta Ads esperan estructura concreta de la landing (headlines, CTAs, formularios). Saltar de 0% paid a 25% paid en un solo paso puede mandar CAC pagado a un fallo no detectado en stage 1.

**Targeting rules para stage 1.5:**
- 5% del tráfico **paid** (`utm_source = google_ads | meta_ads | tiktok_ads`)
- Mantener 5% orgánico de stage 1
- Total combinado: ~5% del tráfico real
- Cookie sticky de sesión 24h

**Ejecutar:**
- [ ] Activar flag con targeting de stage 1.5 (paid 5%)
- [ ] Esperar 15 min
- [ ] Triggers leading del §2.3 + verificación específica de paid:
  - [ ] CTR de creatives no degradado (ver Google Ads / Meta Ads dashboards)
  - [ ] Conversión paid → registro en muestra > 50% del baseline paid
  - [ ] Sin spike de "low quality landing page" warnings en Google Ads

### 2.5 Canary stage 2 — 25% (T+30min, ~10:30, si stage 1.5 OK)

**Targeting rules para stage 2:**
- 25% del tráfico (orgánico + paid combinado)
- Resto igual que stage 1

**Ejecutar:**
- [ ] Subir flag a 25%
- [ ] Esperar 30 min
- [ ] Triggers leading del §2.3 + ahora añadir métricas con más latencia:
  - [ ] Conversión visit → registro vs muestra control < baseline - 15% (con baseline 48h, margen ampliado)
  - [ ] LCP P75 > 4s
- [ ] Spot check: visitar `/` desde dispositivo con cookies limpias

### 2.6 PARAR aquí (T+60min, ~11:00)

**No expandir más el día del deploy.** Dejar 25% durante 48h (todo el fin de semana) antes de cualquier expansión adicional.

- [ ] Confirmar en Slack del equipo: "Canary al 25%, pausamos hasta lunes 10:00"
- [ ] Mantener alertas activas durante el fin de semana
- [ ] Rafa disponible para responder a alertas críticas durante el fin de semana

---

## 3. Post-Deploy

### 3.1 Lunes 2026-05-11, 10:00 — Primer checkpoint con equipo

- [ ] Revisar Sentry: ¿errores JS nuevos en sesiones con flag ON durante el fin de semana?
- [ ] Comparar métricas del 25% canary vs el 75% control:
  - [ ] Bounce rate
  - [ ] Conversión a registro
  - [ ] Tiempo en página
  - [ ] Click rate CTA primario
- [ ] Sentir-check qualitativo: ¿algún feedback en Slack / soporte / Twitter durante el fin de semana?
- [ ] Decisión: seguir, esperar más, o rollback

### 3.2 +7d (lunes 2026-05-16, si métricas dentro de threshold)

- [ ] Expandir flag a 50%
- [ ] Sitemap re-enviado a Search Console + "Solicitar indexación" de `/`
- [ ] Revisar posición en Search Console de keywords principales (esperar fluctuación)

### 3.3 +14d (lunes 2026-05-23)

- [ ] Expandir a 100% si todo OK
- [ ] Anunciar al equipo el 100% rollout
- [ ] Actualizar changelog / release notes

### 3.4 +30d (lunes 2026-06-08)

- [ ] Decisión final: eliminar `LandingPage.jsx` y los 16 sub-componentes legacy, o conservar como backup permanente
- [ ] Postmortem ligero: ¿qué métricas se movieron? ¿qué aprendiste para el siguiente landing test?
- [ ] Postmortem técnico: ¿auto-rollback automatizado para próximo release?

---

## 4. Rollback triggers (kill switch — manual con alertas)

Recibir alerta automática en Slack y **flippear `new_landing_v2 = false` manualmente en <2min** si cualquiera de estas condiciones se cumple.

**Thresholds ampliados un 50% por baseline corto de 48h:**

| Trigger | Threshold | Acción |
|---|---|---|
| Errores JS por sesión | > 0.5% | Alerta crítica → flip manual <2min |
| Spike de errores 5xx desde `/` | > 1% de requests | Alerta crítica → flip manual <2min |
| Bounce rate del segmento canary | > baseline + **22%** | Alerta crítica → flip manual <2min |
| Click rate CTA primario | < baseline - **30%** | Alerta crítica → flip manual <2min |
| Conversión visit → registro | < baseline - **15%** | Alerta a Rafa, decisión humana en 30min |
| LCP mobile P75 | > 4s | Alerta, decisión humana |

### Pasos del rollback

1. Recibir alerta en Slack
2. Verificar que es real (no falso positivo) → mirar dashboard 30s
3. Flippear flag (`new_landing_v2 = false`) — debería tomar <30s
4. Purge CDN en `/` y `/para-anunciantes` en Vercel
5. Verificar en navegador limpio que `/` muestra `LandingPage` legacy
6. Comunicar en Slack del equipo: "Rollback ejecutado, investigando"
7. **NO eliminar el código de `ForBrandsPage`** — solo el flag está OFF
8. Postmortem en las siguientes 24h

### Constraints del rollback

- **Ventana objetivo:** <2 min desde alerta hasta flag OFF
- **Error budget:** rollback vía flag NO consume budget. Si requiere redeploy → consume ~10-15min del budget mensual de 43min
- Conservar `LandingPage.jsx` y los 16 sub-componentes en repo durante 30 días post-100% rollout por si hace falta revertir tardíamente

---

## 5. Notificaciones

| Quién | Cuándo | Cómo |
|---|---|---|
| Equipo frontend | Antes, durante, después | Slack del equipo |
| Stakeholder marketing | T-48h (jueves 07/05) y post-100% | DM + email, **confirmación requerida** |
| Backend on-call | No aplica (sin cambios backend) | — |
| Soporte / CX | T-24h (viernes 08/05) | Heads-up por si reciben tickets confusos |
| Segundo par de ojos | T-48h | Briefing + acceso confirmado a flag dashboard + Vercel |

---

## 6. Open questions / decisiones pendientes

Cosas a confirmar antes del viernes 18:00. Si alguna sigue abierta, **mover deploy al martes 12**:

- [ ] **Quién es el segundo par de ojos** durante la ventana de deploy si Rafa se desconecta — disponibilidad confirmada 09:00–13:00 sábado mínimo
- [ ] **Auto-rollback decidido como MANUAL** para este release (alertas automáticas + flip manual <2min) — confirmar que las alertas están configuradas y testeadas antes del viernes
- [ ] Para el cambio de copy hacia anunciantes: ¿hay mockup aprobado por marketing del CrossLink "¿Eres creador?" para no perder ese segmento?
- [ ] Sábado 09/05: confirmar disponibilidad de Rafa todo el fin de semana para responder a alertas críticas
- [ ] Posthog y Search Console conectados de modo que los baselines del §1.1 se puedan capturar — si requiere medición manual, asignar tiempo el jueves
- [x] ~~Política de cookie de sesión 24h confirmada como suficiente para el experimento~~ → **DECIDIDO en §1.3: cookie de sesión 24h max, no persistente**
- [ ] **Cobertura fin de semana:** decidir entre opción A (solo Rafa, SLA degradado), B (rotación informal) o C (canary al 10% en stage 2 para reducir blast radius) — ver "Cobertura del fin de semana" arriba
