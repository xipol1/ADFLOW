# Specification Quality Checklist: Eliminación de cuenta + Export de datos (RGPD)

**Purpose**: Validar completitud y calidad de la spec antes de proceder a `/speckit-clarify` o `/speckit-plan`.

**Created**: 2026-05-18

**Feature**: [spec.md](../spec.md)

---

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) — la spec habla de PII, anonimización, periodo de gracia, retención fiscal; nunca menciona Mongoose, Express, JWT, etc.
- [x] Focused on user value and business needs — cada user story arranca por lo que el usuario quiere conseguir (Art. 17, Art. 20 RGPD).
- [x] Written for non-technical stakeholders — un responsable legal o un DPO entendería el spec sin formación técnica.
- [x] All mandatory sections completed — User Scenarios, Requirements, Success Criteria, Assumptions presentes y completas.

## Requirement Completeness

- [x] **No [NEEDS CLARIFICATION] markers remain** — resueltos 2026-05-18: Q1=B (liquidación express auto, con fasing técnico en FR-007.a/b/c/d), Q2=A (7 días de gracia, FR-004).
- [x] Requirements are testable and unambiguous — cada FR usa "MUST" y se puede probar con un escenario concreto.
- [x] Success criteria are measurable — SC-001..SC-008 todos con cifras (segundos, %, días, número de reclamaciones).
- [x] Success criteria are technology-agnostic — ningún SC menciona Mongo, índices, latencia de API o frameworks. Métricas centradas en outcome usuario / cumplimiento legal.
- [x] All acceptance scenarios are defined — 5 escenarios en US1, 5 en US2, 4 en US3, todos en formato Given/When/Then.
- [x] Edge cases are identified — 12 edge cases enumerados, con cross-reference a las cláusulas que los gobiernan o a las preguntas pendientes.
- [x] Scope is clearly bounded — Assumptions explicita qué derechos RGPD quedan fuera del MVP (rectificación ya parcial, oposición/limitación vía DPO).
- [x] Dependencies and assumptions identified — 8 assumptions explicitan dependencias (SMTP en Fase F, i18n en SPEC-C3, MongoDB Atlas at-rest, DPO operativo).

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria — los 25 FR mapean a escenarios concretos de US1/US2/US3 o a edge cases.
- [x] User scenarios cover primary flows — los 3 user stories cubren los 3 derechos centrales operativizables (supresión, portabilidad, discoverability).
- [x] Feature meets measurable outcomes defined in Success Criteria — la combinación US1+US2+US3 cumple los 8 SC.
- [x] No implementation details leak into specification — verificado: cero menciones de tecnología.

## Constitution Alignment

Sección añadida específicamente para Channelad. Cada principio debe alinearse explícitamente.

- [x] Principio I (Verificable) — SC-005, SC-006 verificables por auditoría. FR-021/22 garantizan trazabilidad RGPD inmutable.
- [x] Principio II (Directo) — FR-019/20 obligan transparencia de derechos con plazos. FR-024 prohíbe vocab hueco.
- [x] Principio III (Localizado) — FR-010 retención fiscal ES 6 años, FR-020 DPO castellano, FR-025 variantes LATAM cuando disponible.
- [x] Principio IV (Operativo) — todos los plazos en cifras (24h, 7d, 30d, 6 años, 90s, 30s).
- [x] Principio V (Reparador) — FR-006/07/08 protocolos claros para bloqueos; FR-024 fórmula incidencia §6.4 en errores; FR-005 email de salvaguarda 24h antes de fin de gracia.

## Wording Playbook Compliance

- [x] Tutear siempre en copy al usuario — FR-024 lo exige.
- [x] Sin vocabulario prohibido — verificado en spec (sin "fácil", "rápido", "garantizado sin mecanismo", anglicismos).
- [x] Cifras antes que adjetivos — los SC y FR usan plazos concretos en lugar de "rápido", "pronto".
- [x] Fórmulas operativas referenciadas — fórmula incidencia §6.4 obligatoria en errores (FR-024).
- [x] Estados claros en lugar de jerga — `pending_email_confirmation`, `grace_period`, `cancelled`, `executed` alineados con espíritu de estados de campaña canónicos.

## Notes

- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`.
- 2 [NEEDS CLARIFICATION] markers pendientes (Q1 operaciones pendientes, Q2 duración gracia) — presentados al usuario en el chat siguiendo el formato del skill `speckit-specify`. Cuando se respondan, se reemplazan los marcadores en spec.md y este checklist se actualiza a `[x]` en "No [NEEDS CLARIFICATION] markers remain".
- Tras resolver clarifications, el siguiente comando recomendado es `/speckit-plan` (no `/speckit-clarify`, porque las dos preguntas están ya formuladas aquí explícitamente y el usuario solo necesita elegir opción).
