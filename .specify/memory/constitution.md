# Channelad Constitution

> Producto operado por **MICHI SOLUCIONS, S.L.** (en constitución). "Channelad" es el nombre comercial; toda referencia legal, fiscal o institucional debe usar la razón social completa. Ver Sección "Marca vs Entidad Legal".

## Core Principles

### I. Wording Playbook v1.0 (NON-NEGOTIABLE)

Todo texto visible al usuario — landing, onboarding, emails, errores, soporte, FAQ, blog, redes, in-app — debe cumplir el **Channelad Brand & Wording Playbook v1.0** (mayo 2026).

Reglas duras:
- **Voz**: concreta (cifras antes que adjetivos), sobria (cero exclamaciones, cero emojis decorativos en hero/CTA/asunto email), adulta, quirúrgica con jerga sectorial, de parte (admite trade-offs). Tutear siempre.
- **Vocab prohibido** (rechazo automático en review): *ecosistema, sinergia, experiencia 360, solución integral, revolucionar, potenciar, empoderar, holístico, disruptivo, next-level, game-changer, pasión, fácil, rápido, simple, increíble, mejor, líder, #1, top (sin cifra), garantizado (sin mecanismo), siempre, nunca, performance, awareness, journey, ownership*.
- **Vocab firma** (usar): *escrow, pago custodiado, verificación, auditoría, contrato, liberación, plazo, entrega, disputa, reembolso, suscriptores activos, CPM, nicho, audiencia cualificada, post patrocinado, 1/24, 2/48, media kit, autónomo, IRPF, IVA, modelo 036, SEPA, hispanohablante*.
- **Fórmula hero**: `[Acción concreta]. [Beneficio operativo medible]. [Garantía o salvaguarda].` Máx. 9 palabras.
- **Fórmula CTA**: verbo+objeto, máx. 4 palabras. Buenos: *Ver canales, Registrar canal, Calcular tarifa, Lanzar campaña*. Malos: *Empieza ahora, Descúbrelo, Solicita demo, Más información*.
- **Naming**: Catálogo (no Marketplace Hub), Calculadora de tarifa, Verificación de canal, Panel de campañas (no Dashboard), Disputa (no ticket), Saldo retenido/liberado. Planes: Básico/Pro/Agencia (no Bronze/Silver/Gold).

**Checklist pre-merge para cualquier PR con copy** (las 6, todas deben pasar):
1. ¿Al menos un número, plazo o % verificable?
2. ¿Promesa central con mecanismo detrás (no promesa vacía)?
3. ¿Libre del vocab prohibido?
4. ¿Funciona igual para anunciante español que para creador mexicano?
5. ¿Legible en 5 s en móvil?
6. ¿Pasaría el test del CEO de Telega.io leyéndolo?

Playbook completo: `C:\Users\win\Desktop\_Channelad\ADFLOW\channelad_brand_wording.md.pdf` (rev. trimestral con datos propios).

### II. Marca vs Entidad Legal

- **"Channelad"** = nombre comercial → copy de producto, landing, app, dominios (`channelad.io`), marketing.
- **"MICHI SOLUCIONS, S.L."** = razón social → toda documentación legal, fiscal, contractual, subvenciones, registros de terceros (LinkedIn API, Meta Business, Stripe Connect, banca, AEAT), footers de aviso legal, T&C, política de privacidad, facturación.
- Formato canónico cuando se combinan: *"MICHI SOLUCIONS, S.L. (operadora de Channelad)"* o *"MICHI SOLUCIONS, S.L. trading as Channelad"*.
- **Estado a 2026-05-17**: certificación negativa de denominación obtenida (2026-04-10, vence 2026-10-10), S.L. **no constituida** aún — sin CIF definitivo. No someter aplicaciones de APIs que exijan CIF hasta constitución.
- **Spelling**: *SOLUCIONS* sin "e" (forma intencional, no es typo — verificar siempre contra el certificado original).

### III. Confianza Demostrable, No Prometida

La categoría tiene un problema estructural de confianza (Telega.io: "scam", "can't withdraw" en Trustpilot). Channelad gana solo si cada artefacto demuestra confianza operativa en vez de prometerla.

- Toda promesa pública debe ir acompañada del **mecanismo** que la sostiene (escrow, verificación, auditoría, reembolso automático, SLA con consecuencia).
- Anti-patrones que requieren rechazo en revisión: promesas sin mecanismo, métricas sin contexto, urgencia falsa, testimonios anónimos, stock photos, garantías sin condiciones explícitas.
- Promesas columna vertebral:
  - **Anunciante**: *"Si la campaña no se publica como se acordó, no pagas. Punto."*
  - **Canal**: *"Si publicas el anuncio, cobras. Antes de 72 horas. En euros, a tu cuenta."*

### IV. Cifras Antes que Adjetivos

Especificidad medible > impresión cualitativa. Cualquier afirmación sobre rendimiento, alcance, precio o velocidad debe ir acompañada de la cifra concreta y, cuando aplique, del contexto comparativo.

- "Pago en 72 h" — no "pago rápido".
- "40 €/post en canal medio de finanzas ~8K subs" — no "tarifas competitivas".
- "Reembolso automático a las 48 h si no se publica" — no "garantía total".
- Cifras inventadas o no verificables están **prohibidas**. Mejor omitir que estimar a ojo.

### V. Spec-Driven Development (NON-NEGOTIABLE)

Toda feature no trivial debe pasar por el pipeline de spec-kit antes de implementarse:

1. `/speckit-specify` — describir **QUÉ** y **POR QUÉ** (sin tecnología).
2. `/speckit-clarify` (recomendado) — resolver ambigüedades antes de planificar.
3. `/speckit-plan` — definir stack, arquitectura, decisiones técnicas.
4. `/speckit-tasks` — descomponer en tareas accionables.
5. `/speckit-analyze` (recomendado) — chequear consistencia entre artefactos.
6. `/speckit-implement` — ejecutar.

Excepciones (no requieren spec): hotfix de bug aislado, cambio de copy de una sola línea, ajuste de configuración, dependencia de seguridad. Todo lo demás → spec primero.

## Restricciones Técnicas y Operativas

- **Stack vigente** (no cambiar sin ADR explícito): Node.js + Express en backend, React + Vite en frontend, Tailwind, MongoDB para datos transaccionales, Render + Vercel para despliegue.
- **Multi-canal**: la plataforma agrega comunidades en Telegram, WhatsApp y Discord — toda feature debe explicitar para qué canales aplica.
- **Pagos**: arquitectura escrow obligatoria para cualquier flujo monetario entre anunciante y canal. No hay "pago directo".
- **Cumplimiento ES**: la operativa fiscal asume España como mercado primario — IRPF, IVA, modelo 036, facturación con CIF de MICHI SOLUCIONS S.L. (cuando esté disponible).
- **Seguridad**: nunca commitear secretos. `.env*` está en `.gitignore`; mantenerlo. Credenciales de plataforma viven en `memory/user_credentials.md` (local, no se sube).

## Workflow y Calidad

- **Worktrees de Claude**: nunca mergear directamente la rama de un worktree de Claude. Cherry-pick o rebase contra `main` primero (las ramas de worktree quedan stale rápido).
- **PRs**: título conciso (<70 chars), descripción con "Summary" y "Test plan", siempre PR — nunca push directo a `main`.
- **Hooks de spec-kit**: `auto_execute_hooks: true` en `.specify/extensions.yml`. Antes de cada etapa del pipeline (specify, clarify, plan, tasks, implement) se invoca un commit automático opcional. Aceptar por defecto para mantener historial granular.
- **Constitution check en planes**: cada `/speckit-plan` debe incluir una sección "Constitution alignment" demostrando que el plan no infringe ninguno de los 5 principios.

## Governance

Esta constitution prevalece sobre cualquier otra práctica, documento o convención del repositorio. Cualquier conflicto entre código existente y estos principios se resuelve actualizando el código, no relajando la constitution.

**Enmiendas**:
- Cambios de MAJOR (eliminar/reemplazar un principio): requieren propuesta escrita, justificación y plan de migración. Aplica a todos los artefactos vivos en `.specify/`.
- Cambios de MINOR (añadir principio o expandir sección): documentar el cambio en el commit y notificar en el siguiente PR de feature.
- Cambios de PATCH (clarificaciones, typos): commit directo con justificación en el mensaje.

**Cumplimiento**: cada PR debe demostrar (en su descripción o vía `/speckit-analyze`) que respeta los principios I–V. La complejidad debe justificarse explícitamente — YAGNI por defecto.

**Guía operativa runtime**: `CLAUDE.md` en raíz del repo (cargado automáticamente por Claude Code).

---

**Version**: 1.0.0 | **Ratified**: 2026-05-17 | **Last Amended**: 2026-05-17
