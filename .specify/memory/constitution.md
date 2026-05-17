# Channelad Constitution

> Producto operado por **MICHI SOLUCIONS, S.L.** (en constitución). *"Channelad"* es el nombre comercial; toda referencia legal, fiscal o institucional debe usar la razón social completa. Ver Principio III.

## Preámbulo — qué es Channelad y por qué importa

**Categoría**: *marketplace de publicidad en comunidades de mensajería* (WhatsApp, Telegram, Discord). **No** es "plataforma de Telegram Ads" — esa descripción reduce el wedge.

**Esencia (1 palabra)**: **Contrato**. Channelad existe porque convierte un acuerdo verbal frágil entre anunciante y canal en una transacción protegida. No "comunidad", no "conexión", no "crecimiento".

**Promesa de marca**: *publicidad en comunidades, sin perseguir pagos ni discutir métricas.*

**Wedge competitivo**: el único marketplace de publicidad en comunidades con **escrow operativo**, **verificación de métricas** y **soporte fiscal español** — respuesta directa a las tres objeciones dominantes del mercado: *"me van a estafar"*, *"las métricas son mentira"*, *"no sé cómo facturarlo en España"*.

**Promesas columna vertebral** (cualquier mensaje que las contradiga o diluya, fuera):
- **Anunciante**: *"Si la campaña no se publica como se acordó, no pagas. Punto."*
- **Canal**: *"Si publicas el anuncio, cobras. Antes de 72 horas. En euros, a tu cuenta."*

Esta constitution codifica los principios **non-negotiable** que toda spec, plan, código, copy y artefacto del repositorio debe respetar. El detalle operativo (vocabulario completo, fórmulas de copy, objeciones preacordadas, naming, anti-patrones, checklist pre-publicación) vive en [`wording-playbook.md`](./wording-playbook.md) — referencia obligatoria.

---

## Core Principles

Los cinco principios son los **cinco valores operativos** del Wording Playbook v1.0 elevados a regla de constitución: aplican tanto al copy de cara al usuario como a las decisiones técnicas, de producto, legales y de proceso.

### I. Verificable (NON-NEGOTIABLE)

Toda métrica, promesa y afirmación pública debe estar **auditada o etiquetada explícitamente como estimada**. Nunca afirmar algo sin posibilidad de comprobación.

- Promesas → siempre acompañadas del **mecanismo** que las sostiene (escrow, API verification, auditoría manual, reembolso automático, SLA con consecuencia).
- Métricas inventadas o no verificables → **prohibidas**. Mejor omitir que estimar a ojo. Si es estimación, debe rotularse como tal.
- Aplica también a código: tests verifican comportamiento, no asumen; assertions sobre datos externos; logging estructurado que permita auditar lo que pasó.

### II. Directo (NON-NEGOTIABLE)

Decimos precio, comisión, riesgo y trade-off **antes de que pregunten**. Sin eufemismos comerciales, sin esconder lo que duele.

- Comisiones, plazos, condiciones de reembolso → siempre visibles, nunca en letra pequeña.
- Si una decisión técnica o de producto tiene contrapartida (latencia, coste, complejidad), se documenta junto al beneficio.
- En review: rechazar copy que use vocabulario hueco/vago/sobrecomprometido (lista completa en [wording-playbook.md §3.2](./wording-playbook.md#32-vocabulario-prohibido-rechazo-en-review)). Términos prohibidos: *ecosistema, sinergia, experiencia 360, revolucionar, potenciar, holístico, disruptivo, game-changer, fácil, rápido, increíble, líder, #1, garantizado (sin mecanismo), siempre, nunca, performance, awareness, journey, ownership*.

### III. Localizado (NON-NEGOTIABLE)

Pensado desde España y para hispanohablantes — no traducido. Léxico fiscal, monetario, regulatorio y cultural propio.

- **Marca vs entidad legal**:
  - **"Channelad"** = nombre comercial → copy de producto, landing, app, dominios (`channelad.io`), marketing.
  - **"MICHI SOLUCIONS, S.L."** = razón social → documentación legal, fiscal, contractual, subvenciones, registros de terceros (LinkedIn API, Meta Business, Stripe Connect, banca, AEAT), footers, T&C, política de privacidad, facturación.
  - Formato canónico combinado: *"MICHI SOLUCIONS, S.L. (operadora de Channelad)"*.
  - **Estado a 2026-05-17**: certificación negativa de denominación obtenida (2026-04-10, vence 2026-10-10). S.L. **no constituida** aún — sin CIF definitivo. No someter aplicaciones a APIs que exijan CIF hasta constitución.
  - **Spelling**: *SOLUCIONS* sin "e" (intencional, no es typo — verificar siempre contra certificado).
- **Vocabulario hispano de firma** (usar): autónomo, IRPF, IVA, modelo 036, CNMV, DGOJ, alta en Hacienda, SEPA, hispanohablante, LATAM.
- **Anglicismos innecesarios prohibidos**: *performance* → rendimiento/resultados, *awareness* → notoriedad, *journey* → proceso, *ownership* → responsabilidad. Excepciones aceptadas (jerga del sector): CPM, escrow, fill rate, media kit.
- **Tutear siempre**, anunciante y canal. *Usted* suena a banco, no a marketplace.
- **Mayúsculas españolas correctas**: días, meses, idiomas y gentilicios en minúscula. *Marketplace* o *escrow* no van en mayúscula.

### IV. Operativo (NON-NEGOTIABLE)

Vendemos mecánica, no aspiraciones. **"Cómo funciona" > "Por qué importa"**. Cifras antes que adjetivos.

- Cualquier afirmación sobre rendimiento, alcance, precio o velocidad debe ir con la cifra concreta y, cuando aplique, con contexto comparativo.
  - "Pago en 72 h" — no "pago rápido".
  - "40 €/post en canal medio de finanzas ~8K subs" — no "tarifas competitivas".
  - "Reembolso automático a las 48 h si no se publica" — no "garantía total".
- Plazos siempre en horas o días concretos. Nunca *pronto* o *en breve*.
- Hero ≤ 9 palabras. CTA ≤ 4 palabras (verbo + objeto). Buenos: *Ver canales, Registrar canal, Calcular tarifa*. Malos: *Empieza ahora, Descúbrelo, Solicita demo*.
- Naming castellano operativo: **Catálogo** (no Marketplace Hub), **Panel de campañas** (no Dashboard), **Disputa** (no ticket), **Saldo retenido / liberado**. Planes: **Básico / Pro / Agencia** (no Bronze/Silver/Gold).
- **Estados de campaña canónicos (10)**: Borrador → Pendiente de aceptación → Aceptada → En publicación → Publicada → Verificada → Pagada → Disputa → Cancelada → Reembolsada. Cualquier nuevo flujo que toque estado de campaña debe mapearse a estos.

### V. Reparador (NON-NEGOTIABLE)

Cuando algo falla, hay **protocolo, no excusa**. El wording de incidencias es honesto, accionable y con plazo.

- Fórmula de incidencia obligatoria (ver [wording-playbook.md §6.4](./wording-playbook.md#64-incidencia)): qué ha pasado · qué hacemos nosotros · qué puedes hacer tú (con opciones) · cuándo se resuelve.
- Soporte: empático sin disculpas vacías; siempre con plazo de resolución concreto, no "estado".
- Reembolso automático cuando el SLA falla — no requiere ticket ni negociación.
- En código: los errores que ve el usuario deben proponer acción concreta. *"Algo salió mal"* es violación.
- Las **8 objeciones preacordadas** del playbook (§5) son el guion canónico para FAQ, respuestas de soporte y sales scripts. Cualquier nueva objeción detectada en producción debe añadirse al playbook antes de cerrarse en producto.

---

## Restricciones técnicas y operativas

- **Stack vigente** (no cambiar sin ADR explícito): Node.js + Express (`server.js`), React + Vite (`client/`), Tailwind, MongoDB, Jest, ESLint. Render + Vercel para despliegue.
- **Multi-canal**: la plataforma agrega comunidades en Telegram, WhatsApp y Discord — toda feature debe explicitar para qué canales aplica y, si solo aplica a uno, justificar por qué no a los otros.
- **Pagos**: arquitectura **escrow obligatoria** para cualquier flujo monetario entre anunciante y canal. No existe "pago directo".
- **Cumplimiento ES**: operativa fiscal asume España como mercado primario (IRPF, IVA, modelo 036, facturación con CIF de MICHI SOLUCIONS S.L. cuando esté disponible).
- **Seguridad**: nunca commitear secretos. `.env*` está en `.gitignore` — mantenerlo. Credenciales de plataforma viven en `memory/user_credentials.md` (local, no se sube).
- **Antipatrones bloqueantes en cualquier merge** (lista completa en [wording-playbook.md §8](./wording-playbook.md#8-anti-patrones-lista-negra)): promesas sin mecanismo, métricas sin contexto, urgencia falsa, testimonios anónimos, stock photos, jerga anglo-castellana, comparaciones agresivas con competencia nombrada, emojis en hero/CTA/asunto email.

## Workflow y calidad

### Spec-driven Development (proceso, NON-NEGOTIABLE)

Toda feature no trivial pasa por el pipeline spec-kit antes de implementarse:

1. `/speckit-specify` — describir **QUÉ** y **POR QUÉ** (sin tecnología).
2. `/speckit-clarify` (recomendado) — resolver ambigüedades antes de planificar.
3. `/speckit-plan` — definir stack, arquitectura, decisiones técnicas. **Debe incluir sección "Constitution Check" demostrando alineamiento con los 5 principios.**
4. `/speckit-tasks` — descomponer en tareas accionables.
5. `/speckit-analyze` (recomendado) — chequeo de consistencia entre artefactos.
6. `/speckit-implement` — ejecutar.

**Excepciones** (no requieren spec): hotfix de bug aislado, cambio de copy de una sola línea (sigue requiriendo checklist 6), ajuste de configuración, dependencia de seguridad. Todo lo demás → spec primero.

### Checklist pre-merge de copy (las 6, todas deben pasar)

Cualquier PR que toque texto visible al usuario:

1. ¿Contiene al menos un número, plazo o porcentaje verificable?
2. ¿La promesa central tiene un mecanismo detrás?
3. ¿Está libre del vocabulario prohibido?
4. ¿Funcionaría igual para anunciante español que para creador mexicano?
5. ¿Es legible en 5 segundos en móvil?
6. ¿Pasaría el test del CEO de Telega.io leyéndolo — diría *"joder, no puedo copiar esto"*?

Si alguna respuesta es no, reescribir antes de mergear.

### Git, worktrees y PRs

- **Worktrees de Claude**: nunca mergear directamente la rama de un worktree de Claude — cherry-pick o rebase contra `main` primero. Las ramas de worktree quedan stale rápido.
- **PRs**: título conciso (<70 chars), descripción con *Summary* y *Test plan*, siempre PR — nunca push directo a `main`.
- **Hooks de spec-kit**: `auto_execute_hooks: true` en [`.specify/extensions.yml`](../extensions.yml). Antes/después de cada etapa del pipeline se invoca un commit automático opcional — aceptar por defecto para mantener historial granular.

## Governance

Esta constitution **prevalece** sobre cualquier otra práctica, documento o convención del repositorio. Cualquier conflicto entre código existente y estos principios se resuelve actualizando el código, no relajando la constitution.

**Enmiendas**:
- **MAJOR** (eliminar/reemplazar un principio): requiere propuesta escrita, justificación y plan de migración. Aplica a todos los artefactos vivos en `.specify/` y al `wording-playbook.md`.
- **MINOR** (añadir principio, expandir sección, incorporar nuevas objeciones del playbook): documentar el cambio en el commit y notificar en el siguiente PR de feature.
- **PATCH** (clarificaciones, typos, ajustes de wording de la propia constitution): commit directo con justificación en el mensaje.

**Cumplimiento**: cada PR demuestra (en su descripción o vía `/speckit-analyze`) que respeta los principios I–V. La complejidad debe justificarse explícitamente — YAGNI por defecto.

**Sincronización con el playbook**: el [`wording-playbook.md`](./wording-playbook.md) es el detalle operativo de los 5 principios. Cualquier enmienda al playbook que toque vocabulario, fórmulas u objeciones requiere revisar si la constitution necesita bumpear MINOR.

**Guía operativa runtime**: [`CLAUDE.md`](../../CLAUDE.md) en raíz del repo (cargado automáticamente por Claude Code) referencia esta constitution y el playbook para que cada sesión los tenga presentes.

---

**Version**: 2.0.0 | **Ratified**: 2026-05-17 | **Last Amended**: 2026-05-17

> Nota de versión: 2.0.0 (MAJOR) reemplaza los 5 principios provisionales de v1.0.0 por los **5 valores operativos del Wording Playbook v1.0** (Verificable, Directo, Localizado, Operativo, Reparador) y traslada *Spec-Driven Development* a la sección de proceso. Razón: alinear la constitution directamente con la fuente de verdad de marca/voz en vez de mantenerla en paralelo.
