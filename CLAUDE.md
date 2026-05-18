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
**Plan vigente**: [specs/001-rgpd-delete-export/plan.md](specs/001-rgpd-delete-export/plan.md) — SPEC-B1 RGPD Delete + Export (Fase B del backlog MVP).

Contexto técnico, estructura, decisiones de fasing (Stripe diferido a Fase F) y todos los artefactos asociados ([spec](specs/001-rgpd-delete-export/spec.md), [research](specs/001-rgpd-delete-export/research.md), [data-model](specs/001-rgpd-delete-export/data-model.md), [contracts/](specs/001-rgpd-delete-export/contracts/), [quickstart](specs/001-rgpd-delete-export/quickstart.md)) están en `specs/001-rgpd-delete-export/`.

Próximo comando del pipeline: `/speckit-tasks` para descomponer el plan en tareas ejecutables.
<!-- SPECKIT END -->
