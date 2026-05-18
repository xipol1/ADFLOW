# CHECKPOINTS — criterios objetivos del estado final

> En sistemas multi-agente no se evalúa el camino, se evalúa el destino. Estos son los
> checkpoints binarios que un revisor (humano o subagente `reviewer`) usa para decidir
> si el repo está sano antes de cerrar una sesión o aceptar un PR.
>
> Marca `[x]` cuando se cumpla y `[ ]` cuando no. Si un grupo tiene boxes vacíos, la
> sesión **no se cierra** y el PR **no se mergea**.

---

## C1 — Arnés completo

- [ ] [CLAUDE.md](CLAUDE.md) existe y carga sin errores.
- [ ] [.specify/memory/constitution.md](.specify/memory/constitution.md) y [.specify/memory/wording-playbook.md](.specify/memory/wording-playbook.md) existen.
- [ ] [progress/current.md](progress/current.md) existe (vacío con template o describiendo sesión activa, nunca basura de sesiones anteriores).
- [ ] [progress/history.md](progress/history.md) existe.
- [ ] [.claude/agents/leader.md](.claude/agents/leader.md), [implementer.md](.claude/agents/implementer.md) y [reviewer.md](.claude/agents/reviewer.md) existen.
- [ ] `npm run verify` termina con exit code 0.

## C2 — Estado coherente

- [ ] Como mucho **una** tarea con marcador `[~]` (deferida) en el `tasks.md` del spec activo. Cero tareas con marcador "en curso" sin documentar en `progress/current.md`.
- [ ] Toda tarea marcada `[X]` tiene su entrega real en disco (modelo/handler/test/template referido por la descripción).
- [ ] Working tree limpio o con cambios documentados en `progress/current.md`.
- [ ] `.env` y secretos **no** están modificados (este check es bloqueante).

## C3 — Código respeta arquitectura

- [ ] Backend solo en las carpetas previstas: `models/`, `routes/`, `controllers/`, `services/`, `workers/`, `jobs/`, `middleware/`, `config/`, `lib/`, `scripts/`.
- [ ] Frontend solo en `client/src/`.
- [ ] Tests Jest solo en `tests/`.
- [ ] Sin nuevas dependencias en `package.json` salvo que estén justificadas en el spec activo (research.md o plan.md las menciona) o en el commit message.
- [ ] Sin `console.log`/`print` sueltos de debug. Sin `TODO` sin contexto (un TODO sin link a issue o spec es ruido).

## C4 — Verificación real

- [ ] `npm run lint` pasa sin errores. Warnings tolerados solo si ya existían antes del cambio (no regresión).
- [ ] `npm test` pasa al 100% (cero fallos, cero pendientes nuevos).
- [ ] Para cualquier feature de spec activo: existe al menos **un** test nuevo (unit o integration) que falle si la feature se rompe. TDD: el test se escribió **antes** que la implementación (el commit del test precede al commit de la implementación cuando es posible).
- [ ] Si el cambio toca copy visible al usuario (UI, emails, errores, landing), ese copy **pasa las 6** del checklist pre-publicación del [Wording Playbook §9](.specify/memory/wording-playbook.md). Documentado en `progress/current.md` o en el commit/PR.

## C5 — Sesión cerrada

- [ ] `progress/current.md` está en estado template (vacío) o describe la sesión activa todavía en curso.
- [ ] Hay una entrada nueva en `progress/history.md` con resultado de la sesión.
- [ ] Sin archivos sin trackear sospechosos (`*.tmp`, `*.log`, `coverage/`, dumps de DB) fuera de `.gitignore`.
- [ ] Si la sesión modificó tasks.md: el spec activo refleja el estado real (lo terminado como `[X]`, lo en curso documentado, lo bloqueado como `[~]` con razón).

---

## Cómo usar este archivo

- El subagente [`reviewer`](.claude/agents/reviewer.md) recorre cada checkbox de C1–C5 antes de aprobar el cierre de una tarea grande, una fase de spec o un PR.
- Para cierre de sesión rutinaria basta con que C1, C2, C4 y C5 estén en verde.
- C3 se evalúa también en review de PR — el reviewer rechaza si encuentra fugas de estructura.
- C4.4 (wording playbook) solo aplica si la sesión tocó copy visible. Si no, marca el box como N/A en `progress/current.md` y se considera cumplido.
