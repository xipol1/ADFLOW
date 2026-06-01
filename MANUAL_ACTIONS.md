# Channelad — Acciones manuales pendientes (runbook)

> Generado tras la auditoría CTO del **2026-06-01**. Fuente única de verdad para todo lo
> que **solo tú / ops** podéis hacer (requiere tarjeta real, acceso a Atlas, dashboards de
> Fly/Vercel, o una decisión de producto). Todo lo automatizable ya está hecho o
> preparado en ramas/PRs — ver "Estado al cierre de la sesión".

---

## Estado al cierre de la sesión (ya hecho por mí)

| # | Acción | Estado |
|---|--------|--------|
| ✅ | **PR #79 mergeado** (fly.toml durable: 1GB + `ENABLE_BACKGROUND_JOBS=true`) — el scheduler de payouts/escrow ya no se apaga en un redeploy de Fly | hecho |
| ✅ | **`main` local sincronizado** con origin (incluye merges #78, #79, #80) | hecho |
| ✅ | **Trabajo en vuelo preservado** en rama `wip/baileys-landing-2026-06-01` (cleanup Baileys + campos Canal + tests). Working tree limpio | hecho |
| ✅ | **PR #82** — `scripts/check-scheduler-health.js` (monitor del worker de payouts). Mergeable | abierto |
| 🟡 | **PR #83** — quitar crons de Vercel. **Marcado DO NOT MERGE** hasta confirmar cutover (ver A4) | abierto, en espera |
| 📋 | 37 ramas fusionadas listas para borrar (bloqueado el borrado masivo automático — ver P2-1) | comando abajo |

---

## 🔴 P0 — Bloquean cobrar dinero real / operar desatendido

### A1. Prueba E2E de pago con TARJETA REAL
**Por qué:** el monedero (Track B) se verificó con `stripe listen` en test mode, pero **nunca con una tarjeta real de principio a fin**. Hasta cerrar esto, Channelad NO debe tratarse como listo para cobrar.

Pasos (Stripe en modo live o una tarjeta de test real contra el entorno de staging):
1. Recargar saldo vía Stripe Checkout → confirmar que el webhook abona `Usuario.saldo`.
2. Pagar una campaña → confirmar `Transaccion` en `escrow` + `Campaign.capturedAmount` y `creatorPayable` persistidos.
3. Completar la campaña (o esperar al auto-complete del cron) → confirmar liberación de escrow.
4. Retiro del creador a una cuenta **Stripe Connect onboardeada de verdad** (capability `transfers` activa) → confirmar transferencia recibida.
5. Probar el caso 402 (saldo insuficiente) y el doble-pago idempotente.

Documenta el resultado (capturas del dashboard de Stripe + IDs de Transaccion).

### A2. Ejecutar el backfill de `creatorPayable` (PR #78, ya en main)
**Por qué:** las campañas legacy completadas antes de #76 caen al fallback `netAmount`, que sobre-paga lo financiado con créditos. El script lo corrige. **No se pudo correr desde mi entorno** (DNS de Atlas SRV inalcanzable).

Desde un host con acceso a Atlas (tu máquina con la VPN/whitelist, o el propio Fly):
```bash
git pull                                          # main al día
node scripts/backfill-creator-payable.js          # DRY-RUN: imprime el alcance, no escribe
node scripts/backfill-creator-payable.js --apply  # escribe (idempotente, seguro re-ejecutar)
```
Hazlo **después** de confirmar que #76 está desplegado en Vercel **y** en el worker Fly.

### A3. Verificar que el worker Fly está vivo y durable
**Por qué:** es el único sitio donde corren el cron de payouts/escrow y los 9 jobs. Single point of failure.
```bash
flyctl status -a channelad-api-test
flyctl secrets list -a channelad-api-test          # debe estar ENABLE_BACKGROUND_JOBS=true
flyctl logs -a channelad-api-test | grep scheduler  # buscar "[scheduler] enabled — 9 jobs"
```
Si la máquina aparece `stopped`, despiértala: `flyctl machine start <id> -a channelad-api-test`.
Tras una noche, valida con el monitor nuevo (desde host con Atlas):
```bash
node scripts/check-scheduler-health.js             # todos los daily en OK
```

### A4. Confirmar cutover y mergear PR #83 (quitar crons de Vercel)
**Por qué:** mientras Vercel-cron **y** Fly-scheduler estén activos, `telegram-intel` puede dispararse doble (riesgo de baneo MTProto).
1. Completa A3 (worker vivo, una noche de runs OK).
2. `node scripts/check-scheduler-health.js` → todos los daily `OK`.
3. Mergea **PR #83**. A partir de ahí, solo Fly dispara los jobs.

### A5. Montar la alerta del monitor (cuando A3 esté verde)
Programa `scripts/check-scheduler-health.js --json` (cron del SO, GitHub Action schedule, o uptime check) para que avise si algún daily deja de estar fresco. Exit code: `0` sano / `1` degradado / `2` sin conexión.

---

## 🟠 P1 — Antes de lanzamiento público

### B1. Seguridad de `ALLOW_SIMULATED_PAYMENTS` (env, no código)
El path de pago simulado sigue en el código (lo necesitan los tests E2E) pero **falla en producción** salvo que el flag esté en `'true'`. **Verifica que NO esté puesto** en los entornos reales:
```bash
flyctl secrets list -a channelad-api-test | grep -i SIMULATED   # no debe aparecer
# Vercel → Project Settings → Environment Variables → confirmar que ALLOW_SIMULATED_PAYMENTS NO existe
```
(En `.env` local no está — OK.) Opcional P2: sacar el path a fixtures de test.

### B2. Secret `VERCEL_DEPLOY_HOOK_URL` (TODO heredado)
El blog ahora publica vía Deploy Hook en vez de empujar a main (PR #80). Crea el hook y ponlo como secret, si no los posts programados no se publicarán hasta el siguiente deploy de main:
- Vercel → Project → Settings → Git → **Deploy Hooks** → crear uno → copiar URL.
- GitHub → repo → Settings → Secrets → Actions → `VERCEL_DEPLOY_HOOK_URL` = esa URL.

### B3. DECISIÓN: rediseño de ownership de Baileys (WhatsApp)
La propiedad por invite-link es insegura (el invite público no prueba nada; match owner-JID roto por LID-vs-phone; bug `[object Object]` en el nombre). **Decide:**
- **(a)** Congelar WhatsApp como "beta / verificación manual" hasta rediseñar, **o**
- **(b)** Priorizar el rediseño: ownership desde `viewer_metadata.role` de la cuenta emparejada; invite = solo descubrimiento; nonce-challenge para tiers altos.

La rama `wip/baileys-landing-2026-06-01` tiene avances parciales (cleanup de sesiones + campos `channelJid`/`verifiedByMeta`). Decide si la promueves a PR o la dejas como base del rediseño.

---

## 🟡 P2 — Higiene y deuda

### P2-1. Borrar 37 ramas fusionadas (borrado masivo bloqueado en mi entorno)
Todas tienen PR **fusionado** (su trabajo está en main) y **ninguna** tiene PR abierto. Comando listo:
```bash
git push origin --delete \
  auth-google-harden chore/blog-publish-deploy-hook chore/repo-hygiene-blog-posts \
  chore/scope-cleanup chore/tiers-reorder claude/angry-ritchie-520546 \
  claude/brave-ishizaka-19c5fc claude/focused-margulis-d3e69e claude/goofy-nash-22cb33 \
  claude/heuristic-bhabha-39fd43 claude/laughing-kilby-3d601e claude/relaxed-jackson-8010ab \
  claude/silly-hodgkin-1dbc08 feat/admin-pages-and-r2-publication feat/ci-jest-mms-default \
  feat/creators-phase1 feat/creators-phase2 feat/creators-phase3 feat/herramientas-rebuild \
  feat/subscription-tiers-3d feat/unify-channel-calculator feat/whatsapp-groups-audit \
  fix/blog-index-empty fix/ci-lint-errors fix/ci-tests-green fix/commission-20pct \
  fix/creator-comparison-toolkit fix/creator-hero-composition fix/creator-page-wash \
  fix/cron-route-preload fix/herramientas-page-wash fix/i18n-campanas-lowercase \
  fix/i18n-orthography fix/metric-scrapers-job-scheduler fix/rankings-crypto-slug \
  geo/que-es-channelad-llms-txt hotfix/orphaned-jsx-comment
```
Limpia las locales con: `git fetch --prune && git branch --merged main | grep -v main | xargs -r git branch -d`

### P2-2. Triage de 8 PRs de Dependabot
Mergeables tras revisar CI, en este orden de riesgo:
- **Bajo riesgo (mergear):** `actions/checkout-6`, `actions/setup-node-6`, `actions/cache-5`, `actions/upload-artifact-7` (#66-68), grupo minor-and-patch (#69) — revisar que CI siga verde.
- **Riesgo medio (probar antes):** `bcryptjs 2→3` (#72) — verificar que el hashing/login sigue OK con la suite de auth.
- **Riesgo alto (breaking, probar a fondo):** `react-router-dom 6→7` (#73), `redis 4→6` (#71), `multer 1→2` (#70). No mergear a ciegas; cada uno tiene cambios de API.

### P2-3. Borrar ficheros basura (borrado bloqueado en mi entorno)
Untracked, inofensivos pero ruido. Si quieres limpiarlos:
```bash
rm -f 9500 _home.html tmp_count_users.js
```
(`_home.html` es un snapshot de 1.4MB; `9500` y `tmp_count_users.js` son artefactos temporales.)

### P2-4. Revisar la rama `wip/baileys-landing-2026-06-01`
Contiene trabajo en vuelo que saqué de tu working tree (no se perdió nada). Decide: promover a PR, integrar en el rediseño Baileys (B3), o descartar.

---

## Referencia rápida

**PRs abiertos relevantes:** #82 (monitor, mergeable) · #83 (quitar crons, en espera) · #81 (worker gratis Oracle — alternativa a Fly) · #52 (rich content) · 8× Dependabot.

**Scripts útiles:**
- `node scripts/check-scheduler-health.js` — salud del worker de payouts.
- `node scripts/check-last-jobs.js` — últimos jobs massive-seed + canales por semana.
- `node scripts/backfill-creator-payable.js [--apply]` — backfill payouts legacy.

**Decisión de infra pendiente:** Fly (de pago, actual) vs Oracle free always-on (PR #81). Ambos eliminan el SPOF solo si el worker está monitorizado (A5).

**Branch protection:** `main` exige el check "Lint + Test + Build". `enforce_admins=false` (un admin puede saltarse el gate). Para gate duro: `gh api --method PUT repos/xipol1/ADFLOW/branches/main/protection/enforce_admins`.
