# Channelad — Guía operativa para Claude

Producto operado por **MICHI SOLUCIONS, S.L.** (en constitución). *Channelad* es el nombre comercial; toda referencia legal/fiscal usa la razón social completa.

**Categoría**: marketplace de publicidad en comunidades de mensajería (WhatsApp, Telegram, Discord). **Esencia**: contrato.

## Lectura obligada antes de cualquier trabajo

1. **[Constitution](.specify/memory/constitution.md)** — 5 principios non-negotiable (Verificable / Directo / Localizado / Operativo / Reparador) + reglas de proceso. Toda spec, plan y PR debe alinearse.
2. **[Wording Playbook v1.0](.specify/memory/wording-playbook.md)** — vocabulario permitido/prohibido, fórmulas (hero, CTA, email, incidencia, prueba social), 8 objeciones preacordadas, naming canónico, 10 anti-patrones, checklist 6.

Cualquier copy visible al usuario debe **pasar las 6** del checklist pre-publicación (Constitution §Workflow / Playbook §9) antes de mergear.

## Pipeline de trabajo

Toda feature no trivial:
1. `/speckit-specify` — QUÉ y POR QUÉ.
2. `/speckit-clarify` *(opcional)* — resolver ambigüedades.
3. `/speckit-plan` — stack, arquitectura, **Constitution Check** explícito.
4. `/speckit-tasks` — descomponer.
5. `/speckit-analyze` *(opcional)* — consistencia entre artefactos.
6. `/speckit-implement` — ejecutar.

Excepciones permitidas (no requieren spec): hotfix aislado, cambio de copy de una sola línea, ajuste de config, dependencia de seguridad.

## Arnés de sesión

Antes de empezar y antes de cerrar cualquier sesión sobre el repo:

```
npm run verify
```

Eso corre [init.mjs](init.mjs) y valida en cascada: Node 20+, dependencias instaladas, archivos del arnés presentes, `.env` no modificado, working tree, sanidad del `tasks.md` del spec activo, lint y tests Jest. Exit 0 = sano, exit 1 = corrige antes de seguir. `SKIP_LINT=1` y `SKIP_TESTS=1` permiten saltar bloques caros en iteración rápida (no antes de cerrar).

**Artefactos del arnés**:
- [CHECKPOINTS.md](CHECKPOINTS.md) — criterios binarios C1–C5 que definen "terminado".
- [progress/current.md](progress/current.md) — estado de la sesión activa (qué archivos, qué tareas, plan, log).
- [progress/history.md](progress/history.md) — append-only de sesiones cerradas.
- [.claude/agents/](.claude/agents/) — `leader`, `implementer`, `reviewer` (ver abajo).

### Cuándo invocar subagentes

| Situación | Patrón |
|---|---|
| Spec activo en `specs/` y vas a abordar una fase ≥3 tareas, una user story, o un PR grande | Lanza el subagente `leader` y deja que orqueste `implementer` + `reviewer` |
| Tarea concreta de `tasks.md` que sabes exactamente cómo ejecutar | Lanza `implementer` directo con el ID y los paths |
| Antes de marcar `[X]` una fase completa o de hacer cherry-pick / PR a main | Lanza `reviewer` con el alcance |
| Hotfix, cambio de copy de una línea, ajuste de config, dependencia de seguridad | **No lances subagentes**. Edita tú directo |
| Pregunta conceptual sobre el repo, lectura pura | No lances subagentes. Responde directo |

El rol `leader` **no se activa por defecto** — solo cuando el usuario te pide trabajar sobre un spec o tú determinas que el alcance lo justifica. Para tareas sueltas fuera de `specs/`, sigue siendo Claude editando directo el que trabaja.

### Regla anti-teléfono-roto

Cuando lances un subagente, **instrúyelo para escribir su trabajo a disco** y devolverte solo una referencia, no el contenido. Convenciones:
- `implementer` escribe código a su path real + un resumen breve en `progress/impl_<task-id>.md`. Devuelve `OK <task-id>: <ruta>` o `BLOCKED: <razón>`.
- `reviewer` escribe veredicto en `progress/review_<scope>.md`. Devuelve `APROBADO ...` o `RECHAZADO ...` en una línea.
- `Explore` / `general-purpose` escriben hallazgos en `progress/explore_<tema>.md`. Devuelven solo la ruta.

Esto evita que el contenido de los subagentes erosione el contexto de Claude principal.

## Stack y restricciones

- Backend: Node.js + Express (`server.js`, `routes/`, `controllers/`, `services/`, `models/`).
- Frontend: React + Vite (`client/`), Tailwind.
- Datos: MongoDB.
- Tests: Jest. Lint: ESLint.
- Despliegue: Render (backend) + Vercel (frontend).
- Pagos: **escrow obligatorio** — no hay pago directo.
- Mercado primario: España + LATAM hispanohablante. Fiscalidad ES.

## Reglas no negociables al ejecutar

- **Tutear siempre** al usuario en cualquier copy.
- **Cifras antes que adjetivos**. "72 h" no "rápido". "40 €/post canal medio ~8K subs" no "tarifas competitivas".
- **Nunca** vocabulario prohibido (lista completa en playbook §3.2): *ecosistema, sinergia, revolucionar, holístico, disruptivo, game-changer, fácil, rápido, simple, increíble, líder, performance, journey, ownership*…
- **Estados de campaña canónicos (10)**: Borrador → Pendiente de aceptación → Aceptada → En publicación → Publicada → Verificada → Pagada → Disputa → Cancelada → Reembolsada.
- **Naming**: Catálogo (no Marketplace Hub), Panel de campañas (no Dashboard), Disputa (no ticket), Saldo retenido/liberado. Planes: Básico/Pro/Agencia.
- **Marca vs entidad legal**: Channelad para producto; **MICHI SOLUCIONS, S.L.** para legal/fiscal/registros de terceros.
- **Worktrees de Claude**: nunca mergear directo — cherry-pick o rebase a `main` primero.

<!-- SPECKIT START -->
**Spec vigente**: [SPEC-B1 RGPD Delete + Export](specs/001-rgpd-delete-export/) (Fase B del backlog MVP).

Pipeline cerrado: [spec](specs/001-rgpd-delete-export/spec.md) · [plan](specs/001-rgpd-delete-export/plan.md) · [research](specs/001-rgpd-delete-export/research.md) · [data-model](specs/001-rgpd-delete-export/data-model.md) · [contracts/](specs/001-rgpd-delete-export/contracts/) · [quickstart](specs/001-rgpd-delete-export/quickstart.md) · **[tasks](specs/001-rgpd-delete-export/tasks.md)** (58 tareas en 6 fases, ordenadas por dependencia).

Próximo comando del pipeline: `/speckit-implement` para ejecutar las tareas. MVP mínimo legal = US1 + sub-US3 (botón borrado solo); MVP completo = US1+US2+US3.
<!-- SPECKIT END -->
