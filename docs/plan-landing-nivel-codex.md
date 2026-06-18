# Elevar channelad.io al nivel de openai.com/codex — Plan de ejecución

> **Owner:** Rafa Ferrer · **Creado:** 2026-06-12 · **Estado:** aprobado, sin ejecutar
> **Home real:** ruta `index` → `client/src/ui/pages/landing/ForBrandsPage.jsx` (1819 líneas, doble uso `/` y `/para-anunciantes`)
> **Referencia:** https://openai.com/es-ES/codex/ (devuelve 403 a bots — la sesión de ejecución debe empezar capturando screenshots manuales de Codex + de nuestra home actual para comparar 1:1)
> **Branch:** crear `landing/codex-level` desde `origin/main` limpio. NO trabajar sobre `seo/canonical-www-sitemap` ni con el árbol sucio actual.

---

## 0. Tesis y tensión estratégica (leer antes de tocar nada)

Codex **no gana por tener más, gana por quitar**: una idea por pantalla, el producto real como único héroe, tipografía enorme con aire, paleta casi monocroma con un acento, motion mínimo. Nuestra home hace lo contrario: satura morado, anima 4 cosas a la vez y decora cada bloque.

**Matiz de solución (revisión sobre visión en vivo de ambas landings):** la corrección NO es "quita el morado, quita las animaciones". El morado es la **identidad** de Channelad y es legítimo. El problema es el morado *como textura de fondo* (gradientes de página, glows) y el motion *simultáneo* (5 animaciones a la vez en el hero). La solución correcta es **contener el morado a su función semántica** (CTA, acento de dato, kicker de sección, estado activo) y **reducir las animaciones a la vez** (de 5 elementos en paralelo a 1 con movimiento). Perseguir el minimalismo como fin en sí mismo sería un error: a diferencia de Codex —cuyo producto es conocido y por eso puede prescindir de FAQ, pricing y educación de mercado— **Channelad necesita más secciones que Codex** porque el mercado de publicidad en canales privados no está educado. Igualamos el *nivel de oficio* de Codex (jerarquía, contención cromática, sistema tipográfico, motion intencional), no su recuento de secciones.

**El producto real es el héroe — sí podemos grabarlo ahora.** El marketplace existe y funciona; capturamos pantallas reales del producto (catálogo, checkout en escrow, campaña en vivo, resultados) y las mostramos con **los nombres de canal anonimizados** (alias tipo "Canal #018 · Finanzas · ES", IDs/nichos/regiones en vez de la marca real del canal). En paralelo, **damos protagonismo a los activos product-like que ya existen** (`demo/Demo*.jsx`, `CampaignFlow`, `EscrowFlowAnimation`) como apoyo y para los estados que aún no convenga capturar en vivo. Regla de oro: lo que se ve es producto real anonimizado, nunca tracción fingida.

> **Matiz importante sobre el hero (código vs visión en vivo):** las cards del hero ya tienen el **formato correcto** —se ven creíbles y anonimizadas (`Canal #009`, `Canal #018 · Finanzas · ES · 24.7K`)— así que NO hay que rediseñarlas ni recapturar nada para que "parezcan reales": el problema visual es solo el *movimiento simultáneo*. Pero el código las marca como **sintéticas** (`HERO_FLOATING_CARDS:54` → `// Synthetic anonymized data`), y la regla de oro es mostrar producto real. Síntesis: **mantener el formato, reducir el drift a 1 card estática, y reemplazar la data sintética por registros reales anonimizados** del marketplace. No es trabajo de rediseño; es swap de datos + recorte de motion.

**La landing debe verse como producto final y profesional — sin rastro de IA.** No es una demo ni un prototipo: es la cara de un producto terminado. Eso significa, de forma no negociable:
- **Copy humano:** voz de marca de Channelad (`feedback_brand_wording`), frases con criterio editorial. Prohibidos los tics de IA — paralelismos mecánicos, "Eleva/Potencia/Desbloquea", em-dashes decorativos en cadena, listas tripartitas de relleno, adjetivos vacíos. Cada frase la firmaría un humano del equipo.
- **Cero placeholders:** nada de lorem ipsum, "ejemplo", cifras-globo redondas, ni "(próximamente)". Si un dato no es real, no aparece.
- **Visual sin estética de IA:** nada de ilustraciones/stock generados; solo UI real del producto, tipografía y color. Datos anonimizados que parezcan reales, no obviamente inventados.
- **Coherencia de producto terminado:** estados vacíos, hovers, foco, dark mode y responsive todos resueltos. Ningún borde sin pulir que delate "esto se montó rápido".

**Principio rector medible:** si una sección no se puede resumir en *un* titular ≤7 palabras + *una* evidencia visual de producto real, sobra o se parte.

---

## 1. Auditoría del estado actual (anclada en código)

Inventario real de `ForBrandsPage.jsx` y diagnóstico por sección:

| # | Sección | Componente / línea | Diagnóstico (revisado con visión en vivo) |
|---|---------|-------------------|----------------------|
| 1 | Hero split | `:447` | **El problema es el motion, no la data.** El formato de las cards es bueno y creíble. Lo que sobra: drift simultáneo en 3 cards + `SettlementCard` + `RotatingWord` = 5 animaciones en paralelo. Fix: 1 card estática + eliminar drift + data real anonimizada (hoy sintética, `:54`). |
| 2 | Trust bar | `:763` | Chips de plataforma (correcto en pre-launch, no son logos de clientes). **Problema nuevo:** el espacio en blanco *después* de la barra es excesivo y desconecta el hero del siguiente bloque. Compactar el gap. |
| 3 | Problem (3 pains) | `:835` | **El copy es bueno y humano** ("Telegram/WhatsApp/Discord no tienen buscador público… horas de DMs"). Lo que sobra: los 3 bullets por card redundan el título. Quitar bullets, dejar el párrafo central. |
| 4 | How it works | `CampaignFlow` `:1031` | **El activo de mayor confianza** (UI real del marketplace en `BrowserChrome`). Subir de jerarquía, por delante de Insights. |
| 5 | Insights preview | `:1065` | El **fondo de gradiente morado** (`:1217`) rompe la coherencia visual con el resto. Unificar fondo. Suavizar el claim "ningún competidor puede ofrecerte" (`:1104`) a tono verificable. |
| 6 | Comparison | `ComparisonSection` `:1253` | **Fusionar con §3 Problemas:** la tabla (Paid Ads vs Channelad) y los 3 pain points cuentan lo mismo desde ángulos distintos. Una sola sección "El mercado hoy vs. Channelad". |
| 7 | Escrow flow | `EscrowFlowAnimation` `:1263` | **6 pasos en grid = demasiado detalle** para una landing, y llega *después* de comparativa y tour cuando el punto ya estaba hecho. Reducir a 3 pasos (paga → se publica/verifica → se libera); el detalle a una página de trust enlazada. |
| 8 | Calculadora | `ChannelCalculator` `:1272` | **BUG DE AUDIENCIA (bloqueador):** está dirigida a *creadores* ("¿Cuánto puede ganar tu canal?") en una página de *anunciantes*. Rompe el flujo. No es un tema de TBT: es un error de producto. Reescribir a anunciante ("Estima el alcance de tu campaña") o sacarla a `/herramientas`. |
| 9 | Pricing | `:1284` | El subtítulo ("Una sola comisión sobre el GMV") y el CTA son perfectos. Lo que sobra: **gradient-clip** de texto (`:1400`) + glow. Destacar el **ejemplo de ahorro (350€ · 64%)**, no la tabla. **Conflicto:** compara con "Agencia 35%+retainer" mientras §6 compara con Meta/Google — dos comparadores compitiendo. Elegir/fusionar. |
| 10 | FAQ | `:140` data, render abajo | 8 preguntas, bien escritas. Mantener (alimenta FAQPage schema). La página cierra directa en FAQ+CTA, **sin testimonios** — correcto para el estado actual. |
| — | CrossLinks / CTA final | fin de archivo | Verificar en ejecución (líneas 1469-1819 no leídas). |

**Problemas transversales detectados (evidencia en código):**

- **Paleta sin contención:** morado en gradientes, glows, bordes, sombras, acentos y texto. Codex = fondo monocromo + 1 acento puntual. Hoy el acento ES el fondo.
- **Sin sistema de valores:** estilos inline con números mágicos (`padding:'108px 32px 88px'`, `gap:56`, `fontSize:17`, `marginBottom:22/32/24`). No hay escala de espaciado ni de tipo. Esto es *el* diferencial amateur↔Codex.
- **Motion sin presupuesto:** drift infinito en 3 cards + rotating word + hover-transforms en cada card + transiciones de barra. Codex: una entrada fade+rise por sección, resto quieto.
- **Honestidad de datos:** `heroEmailSubmitted` simula éxito sin endpoint; `INSIGHTS_DATASET_COUNT` y cards son sintéticos. Cualquier "social proof" nuevo debe ser real o etiquetado como ejemplo.

---

## 2. Sistema de diseño (el 60% del resultado — definir y *enforzar*)

Crear `client/src/ui/theme/landingScale.js` y migrar la home a estos tokens. Nada de números mágicos nuevos.

**Escala tipográfica** (1 familia display + 1 body, ya existen `FONT_DISPLAY`/`FONT_BODY`):
```
display-xl : clamp(44px, 6vw, 80px)  / line 1.0  / tracking -0.04em   (solo H1)
display-l  : clamp(32px, 4vw, 52px)  / line 1.08 / tracking -0.03em   (H2 sección)
title-m    : clamp(20px, 2.5vw, 26px)/ line 1.2  / tracking -0.02em
body-l     : 18px / line 1.6   (subtítulo hero, intro de sección)
body-m     : 15px / line 1.6   (texto general)
label      : 12px / 0.08em uppercase / 600  (kickers)
```
Regla: **máx. 3 tamaños visibles por viewport.**

**Escala de espaciado** (múltiplos de 4, una sola fuente):
```
section-y desktop: 140px · tablet: 96px · mobile: 64px
bloque interno:   gap 24 / 32 / 48
gutter:           20 (mobile) / 32 (desktop)
max-width texto:  640px  ·  max-width sección: 1200px
```

> **Verificar antes de migrar:** `FONT_DISPLAY`/`FONT_BODY` viven en `theme/tokens.js` — confirmar si son variables CSS o constantes JS y si se aplican consistentes (en las screenshots se ven **inconsistencias de peso** entre el hero y las secciones interiores; el display parece Geist). Unificar pesos como parte de WS-1.

**Regla de kicker (mantener — uso de color correcto):** todos los kickers de sección usan `uppercase` + tracking ancho en morado claro (`CHANNELAD INSIGHTS`, `EL PROBLEMA`, `COMPARATIVA`). Este es el **único uso de morado fuera de CTAs que tiene coherencia semántica** — NO eliminarlo. Cuenta como el "1 acento por sección".

**Reducción cromática (lo más importante):**
- Fondo: alternar `--bg` neutro / `--surface` casi-neutro por sección. **Eliminar** los `radial-gradient` morados de fondo de página (`:408`), los glows ambientales (`:656`, `:1322`) y el fondo de gradiente morado de Insights (`:1217`).
- Acento morado: **solo** en CTA primario, foco de input, kicker de sección, y 1 dato destacado por sección. Prohibido como textura de fondo, bordes por defecto y sombras.
- Quitar gradient-clip de texto en pricing (`:1400`) → color sólido.

**Presupuesto de motion:**
- 1 animación de entrada por sección: `fadeUp` 400ms ease-out al entrar en viewport (ya existe en `MotionSection`).
- Hero: máximo 1 elemento en movimiento continuo (o ninguno). Eliminar el drift de las 3 cards o reducir a 1 card estática.
- `RotatingWord`: evaluar si se queda — Codex no rota palabras. Recomendación: titular fijo y fuerte.
- Respetar `prefers-reduced-motion` globalmente (gate en `MotionSection`).

---

## 3. Arquitectura objetivo de la home (10 → 7 secciones)

```
1. Hero            1 idea + UI real del marketplace (data real anonimizada, drift reducido)
2. Trust bar       plataformas, compactada (cerrar el gap post-barra)
3. Cómo funciona   4 pasos + UI real animada (el activo estrella, sube por delante de Insights)
4. Por qué seguro  escrow resumido a 3 pasos + garantía de reembolso (de §5+§7)
5. Comparativa     "El mercado hoy vs. Channelad" (fusión de §3 Problemas + §6 tabla)
6. Precio          tabla plana + ejemplo de ahorro destacado, sin glow ni gradient-text
7. FAQ + CTA final un solo par de CTAs, cierre (sin testimonios por ahora)
```
Fusiones: §5 Insights + §7 Escrow → "Por qué es seguro". §3 Problem + §6 Comparison → "Comparativa" (un solo bloque, eliminando los pain points como sección aparte). **Calculadora (§8): SALE de la home** → a `/herramientas` o a una `ForCreatorsPage` reescrita; no es opcional, su audiencia está rota en la página de anunciantes (ver WS-3.5). Decisión de comparador: el pricing compara con "agencia tradicional"; la comparativa con "Meta/Google". Elegir **un eje dominante** para no competir por el mismo espacio mental (recomendación: Meta/Google en §5, y en pricing solo el ejemplo de ahorro sin segunda tabla comparativa).

---

## 4. Workstreams (5 PRs independientes, cada uno shippeable y revisable)

Cada workstream: **objetivo · cambios · criterio de aceptación · riesgo · esfuerzo.**

### WS-1 · Sistema de diseño + Hero  *(esfuerzo: L · el de mayor impacto)*
- **Alcance del hero (afinado):** NO es un rediseño ni recaptura — el formato de las cards ya funciona. Es **(a) recortar motion** (drift de 3 cards → 1 card estática; resolver `RotatingWord`: titular fijo recomendado) y **(b) swap de datos**: reemplazar los registros sintéticos (`HERO_FLOATING_CARDS:54`) por registros reales del marketplace con nombres de canal anonimizados (alias ID+nicho+región, métricas reales). Documentar el método de anonimización para reusarlo en WS-2.
- **Cambios:** crear `landingScale.js`; reescribir hero `:447-758`: H1 ≤7 palabras, subtítulo 1 línea, par CTA primario+secundario consistente; reducir composición a 1 card + `SettlementCard`; eliminar glow `:656`, ambient glow y gradientes de fondo de página `:408`; unificar pesos tipográficos hero↔secciones.
- **Aceptación:** hero con ≤2 elementos animados (idealmente 1); datos del hero reales anonimizados (no sintéticos); pesos tipográficos consistentes con secciones interiores; 0 `radial-gradient` morados de fondo; LCP element pintado < 2.5s; sin regresión del snapshot estático (`scripts/snapshot-home.js` — el hero usa `initial={false}` por esto, mantenerlo).
- **Riesgo:** el hero está prerenderizado a snapshot; cambiar markup obliga a regenerar `home.html`. Verificar el flujo de snapshot antes de mergear. Anonimización: confirmar que ningún nombre/handle real de canal se filtra en el asset, alt-text ni JSON.

### WS-2 · StickyScrollTour  *(esfuerzo: L)*
- **Cambios:** componente nuevo `components/landing/StickyScrollTour.jsx`: columna de texto con 3-4 pasos (`useScroll`+`useTransform`) y panel visual sticky que cruza-funde entre las **4 capturas reales anonimizadas** (catálogo → checkout escrow → publicación en vivo → resultados), usando el método de anonimización de WS-1; las demos `Demo*.jsx` quedan como fallback para estados no capturables en vivo. Reemplaza/envuelve `CampaignFlow`.
- **Aceptación:** el tour muestra producto real anonimizado; en desktop el visual queda fijo y muta al hacer scroll; en mobile degrada a stack vertical; **sin** `AnimatePresence mode="wait"` (feedback `feedback_framer_motion_animate_presence`); 60fps en scroll (sin layout thrash); 0 nombres reales de canal en capturas/alt-text.
- **Riesgo:** scroll-driven motion es frágil en Safari iOS; testear en dispositivo real.

### WS-3 · Copy editorial + reducción de secciones  *(esfuerzo: M)*
- **Cambios:** aplicar `feedback_brand_wording` con regla Codex (H ≤7 palabras, sub ≤20, párrafo ≤2 líneas); ejecutar las fusiones de §3; revisar claim "ningún competidor puede ofrecerte" (`:1104`) → tono verificable; alinear EN con `ForCreatorsEN`.
- **Aceptación:** ≤7 secciones; ningún titular >7 palabras; un solo par de CTAs en toda la página; cero afirmaciones de tracción no respaldadas; §3 Problemas y §6 Comparativa fusionadas en un solo bloque.
- **Riesgo:** tocar copy de FAQ rompe `FAQPage` schema — mantener Q/A sincronizados con el JSON-LD `:417`.

### WS-3.5 · Fix de audiencia de la calculadora  *(esfuerzo: S · bloqueador de WS-5)*
- **Por qué:** `ChannelCalculator` (`:1272`) está en modo creador ("¿Cuánto puede ganar tu canal?") dentro de la página de anunciantes — rompe el flujo del usuario objetivo. Es un bug de producto, no de rendimiento.
- **Cambios:** opción A (preferida) reescribir a anunciante: inputs presupuesto+duración → outputs alcance estimado; opción B (mínimo aceptable) sacarla de `ForBrandsPage` y dejar enlace a `/herramientas`.
- **Aceptación:** ninguna pieza de la home se dirige a la audiencia equivocada; si se mueve, el enlace a `/herramientas` funciona.
- **Dependencias:** no bloquea WS-1/WS-2; **sí bloquea WS-5** (no se puede cerrar QA con el flujo de usuario roto).

### WS-4 · Social proof honesto + Pricing plano  *(esfuerzo: M)*
- **Cambios:** social proof = una sección de **datos de plataforma** desarrollada a partir de las micro-stats que ya viven en el hero, en formato tipo `3.000+ canales analizados · 5 plataformas · CPM mediano verificado 12,40€` — **siempre cifras reales y trazables**, agregadas y anonimizadas, **sin exponer datos explícitos de chomon** (ni su nombre, ni su canal, ni sus cifras). Nada de testimonios con nombre+cara hasta tener consentimiento explícito de marcas fundadoras (la página hoy cierra sin testimonios, lo cual es correcto). Reescribir pricing `:1284` → tabla plana sin glow `:1322` ni gradient-text `:1400`, **destacando el ejemplo de ahorro (350€ · 64%)** en vez de la tabla comparativa, para no duplicar el eje de §5.
- **Aceptación:** 0 cifras inventadas presentadas como reales; 0 referencias identificables a chomon o a cualquier creador concreto sin consentimiento; toda cifra de proof es agregada y anonimizada; pricing sin efectos; `handleHeroEmailSubmit` conectado a endpoint real de waitlist (`/api/founder-waitlist`) o el CTA deja de prometer "te avisamos".
- **Riesgo:** legal/honestidad — coordinar con `project_legal_docs`; no afirmar verificaciones que no ocurren aún; no publicar datos atribuibles a un creador sin permiso.

### WS-5 · Performance + Accesibilidad + QA  *(esfuerzo: M)*
- **Cambios:** auditar presupuesto de motion (1 por sección, `prefers-reduced-motion`); poster estático para hero; confirmar lazy de todo lo below-the-fold (ya lo está, `:23-31`); revisar contraste del acento morado sobre fondos nuevos; landmarks (ya cuida `div` vs `main` `:400`).
- **Aceptación (gates duros):** WS-3.5 resuelto (flujo de audiencia correcto); Lighthouse mobile ≥95 perf / 100 a11y; LCP <2.5s; CLS <0.05; TBT <200ms; axe 0 violaciones serias; navegación por teclado completa; QA visual en 390/768/1440 + dark mode (la sección Insights `:1231` ya tematiza dark — mantener coherencia en todas).
- **Riesgo (ritmo visual en mobile):** las secciones alternas `--bg`/`--surface` pueden crear un **efecto zebra** no deseado en mobile, donde las secciones son más cortas. Revisar el **scroll completo a 390px** (no solo capturas estáticas aisladas) y ajustar el alternado si el ritmo se rompe. Animaciones: medir TBT con/sin y decidir.

---

## 5. Plan de medición (antes/después)

- **Baseline:** capturar Lighthouse (mobile+desktop), screenshots de las 10 secciones actuales y un registro de eventos de conversión actuales **antes** de WS-1.
- **KPIs producto:** CTR del CTA hero, scroll-depth hasta pricing, envíos de waitlist, rebote. Instrumentar con el analytics ya presente (verificar cuál) antes de cambiar nada.
- **Gate de release:** ningún PR mergea si empeora Lighthouse perf/a11y respecto al baseline.
- **Validación cualitativa:** comparación lado a lado de screenshots (nuestra home vs Codex) al cierre de WS-1, WS-2 y WS-5.

---

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| Snapshot estático del hero se desincroniza | Regenerar `home.html` vía `scripts/snapshot-home.js` en cada cambio de hero; CI check si existe |
| Romper FAQPage / WebSite schema | No editar `FAQS`/`structuredData` sin actualizar el JSON-LD espejo |
| Árbol git sucio actual contamina PRs | Branch desde `origin/main` limpio; `git diff --cached` antes de cada commit (`feedback_dirty_tree_commit_pollution`) |
| Tocar landings SEO por error | **Fuera de alcance:** WhatsApp/Telegram/Discord pillars y `seo/canonical-www-sitemap`. Solo `ForBrandsPage` + componentes `landing/` |
| Scroll-tour roto en iOS Safari | Test en dispositivo real; fallback a stack |
| Vite cache fantasma durante dev | `feedback_vite_cache_stale`: borrar `node_modules/.vite` ante ReferenceError raros |

---

## 7. Definición de "hecho" (checklist de cierre)

- [ ] ≤7 secciones, cada una con 1 idea + 1 visual.
- [ ] 0 gradientes morados de fondo de página; acento solo en CTA/foco/1 dato.
- [ ] Sistema tipográfico y de espaciado aplicado vía `landingScale.js` (sin números mágicos nuevos).
- [ ] 1 animación de entrada por sección; `prefers-reduced-motion` respetado.
- [ ] Hero con ≤2 elementos animados y **datos reales anonimizados** (no sintéticos); tour con producto real anonimizado.
- [ ] 0 nombres/handles reales de canal filtrados en assets, alt-text o JSON.
- [ ] Calculadora con audiencia correcta (anunciante) o fuera de la home (WS-3.5).
- [ ] §3 Problemas y §6 Comparativa fusionadas; un único eje de comparación en toda la página.
- [ ] Sin efecto zebra en scroll completo a 390px.
- [ ] Social proof solo con cifras agregadas y anonimizadas; 0 datos identificables de chomon o cualquier creador sin consentimiento.
- [ ] 0 cifras inventadas presentadas como reales; CTA waitlist conectado o sin promesa falsa.
- [ ] **Sin rastro de IA:** copy con voz humana de marca (0 tics de IA), 0 placeholders, 0 ilustraciones generadas; lo revisa un humano leyéndolo en voz alta.
- [ ] Acabado de producto final: estados vacíos, hover, foco, dark mode y responsive resueltos en todas las secciones.
- [ ] Lighthouse mobile ≥95 perf / 100 a11y; LCP<2.5s; CLS<0.05.
- [ ] Screenshots comparativos vs Codex adjuntos en el PR final.
- [ ] EN coherente con ES.

---

## 8. Secuencia recomendada

`WS-1 (sistema+hero)` → valida la dirección visual con screenshots antes de seguir → `WS-3 (copy/secciones)` + `WS-3.5 (fix calculadora)` en paralelo con `WS-2 (scroll tour)` → `WS-4 (proof+pricing)` → `WS-5 (perf/a11y/QA)` como gate final. WS-1 solo ya entrega el ~60% de la percepción de calidad; si hay que parar, parar después de WS-1 con valor real shippeado. **Nota de prioridad:** WS-3.5 es barato pero es bloqueador de WS-5 — el flujo de anunciante no puede cerrar QA con una calculadora dirigida a creadores.

---

## Resumen de los 3 cambios de prioridad (revisión en vivo)

1. **Bug de audiencia en la calculadora** → tratado como **bloqueador de WS-5** (WS-3.5), no como "riesgo de TBT". Reescribir a anunciante o mover a `/herramientas`.
2. **Las cards del hero ya tienen formato real anonimizado** → WS-1 **reduce el motion** (no recaptura). Solo queda el swap de data sintética→real. Ahorra el trabajo de captura/anonimización que asumía la versión anterior.
3. **Fusionar Comparativa con Problemas** en un solo bloque "El mercado hoy vs. Channelad", y elegir un único eje de comparación (Meta/Google) para que pricing no compita con una segunda tabla.
