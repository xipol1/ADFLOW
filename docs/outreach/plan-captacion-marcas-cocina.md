# Plan de captación de marcas — Red de canales de cocina

**Channelad · 10 junio 2026 · Owner: Rafa**
**Horizonte: 90 días (10 jun → 10 sep) · Foco: convertir el inventario de cocina en las 3 primeras campañas pagadas**

---

## 1. Objetivo

| Meta | 30 días | 60 días | 90 días |
|---|---|---|---|
| Marcas contactadas (1er toque) | 40 | 80 | 120 |
| Conversaciones reales (llamada/reunión) | 8 | 18 | 30 |
| Propuestas enviadas (rate card personalizado) | 5 | 12 | 20 |
| **Campañas fundadoras cerradas** | **1** | **2** | **3–5** |
| Renovaciones a precio completo (+20%) | — | — | 1 |

La métrica que importa es la última: **una campaña publicada y verificada** nos da el caso de éxito que desbloquea todo lo demás (testimonios, métricas reales de CTR/conversión, prueba social para el resto del pipeline).

---

## 2. Qué vendemos (el producto)

**Inventario:** 16 canales WhatsApp de cocina (red chomon), **5.309.479 suscriptores** validados en vivo:

- 🇪🇸 España: **2,93M** — Recetas Freidora de Aire (1,94M), 1001 Recetas Airfryer (678k), Thermomix (148k + 26k dieta + 24k postres), Dieta y Saludables (105k), Deco (11k)
- 🇩🇪 Alemania: **2,38M** — Heißluftfritteusen Rezepte (1,33M + 305k + 51k), Thermomix Rezepte (554k + 9k + 8k), Diät (116k), General (4k), Deko (7k)

**Audiencia:** cocinan en casa a diario, controlan su dieta, han comprado airfryer/Thermomix (= gastan en cocina), opt-in voluntario a un canal de recetas. Apertura de WhatsApp ≫ email.

**Oferta comercial vigente (no cambiar sin decisión explícita):**
- **Marca fundadora:** 1ª campaña SIN el 20% de comisión de marketplace (paga precio base del creador). NO llamarlo "piloto".
- **Garantía escrow:** la marca solo paga si la campaña se publica y se verifica; si no, reembolso íntegro. Liberación automática a los 15 días de publicación (settlement cron).
- **Pricing:** precio Año 1 de la auditoría × 1,20 (comisión on-top, el creador cobra 100%). Referencia: red completa 14 canales (sin deco) = **4.869 €/ronda**, 1,65M alcance estimado. Post individual destacado: Freidora ES 1,9M = 1.686 €; Rezepte DE 1,3M = 1.150 €.
- Tarifas por canal: `docs/outreach/tarifas-canales-cocina-referencia.xlsx` (+ hoja rellenable para quotes).

---

## 3. Segmentación de prospectos (5 tiers, por encaje y velocidad de decisión)

### Tier A — Electro/gadget cocina (encaje literal: su producto ES el tema del canal)
El canal se llama "Recetas Freidora de Aire" → una marca de freidoras no necesita que le expliquemos el fit.
**Pitch angle:** "vuestro producto es el protagonista del canal, no un anuncio intercalado".

| Marca | Estado | Contacto | Nota |
|---|---|---|---|
| **Cosori** | Rate card YA generado (PDF) | pendiente envío | Prioridad 1 — material listo, encaje perfecto |
| **Create/IKOHS** | por llamar | 91 130 00 19 (L-V 9-14) | DTC español, marketing-savvy, decide rápido |
| Taurus MyCook | por llamar | 945 567 921 | Robot cocina → canales Thermomix |
| Jata | LLAMADA 03/06, email enviado | reenvío vía devoluciones@jata.es | Follow-up F1 vencido → reactivar |
| Lékué | por llamar | 93 574 26 40 | Accesorios airfryer |
| Ibili | por llamar | 943 76 35 44 · comercial@ibili.net | Menaje |
| Orbegozo | por llamar | 968 23 16 00 | |
| Cecotec | por contactar | 963 210 728 | Encaje brutal pero GRANDE → ciclo lento, sembrar ya, no contar con ella para los 90 días |

### Tier B — Meal-prep/tuppers (encaje 1:1 con audiencia dieta/saludable)
⚠️ **Regla de exclusividad:** Wetaca (u otra ancla) pedirá exclusividad de categoría. NO cerrar dos competidores directos sin negociarlo. Estrategia: avanzar TODAS las conversaciones en paralelo, cerrar con la primera que firme, y usar la exclusividad de categoría (con sobreprecio o duración limitada) como palanca de cierre: *"la categoría meal-prep se cierra con una sola marca fundadora"* — escasez real, no artificial.

- **Wetaca** (ancla, email redactado) · NoCocinoMás (Rubén, redes@ — email enviado 03/06, F1 vencido) · MiPlato (673 592 280) · MenuDiet (914 012 499) · Bendito Tupper (625 445 387, founder Núria Arnau, "sí" rápido) · Qchara (616 373 125) · ApetEat · Tappers · Fresh Greens (laura@, founder) · Makroa · Mediterránea de Guisos
- ❌ Knoweats: deprioritizada (Trustpilot 2,2, riesgo reputacional)

### Tier C — Apps nutrición (modelo CPA/código descuento, complementan sin competir con B)
MyRealFood (LinkedIn) · Nootric · NutriScan · Oorenji · Nooddle.
**Ángulo:** atribución medible — código/link único por canal, el modelo link-attribution ya está verificado e2e en plataforma. Para una app, un canal de 1,9M con código trackeable es un experimento barato y medible.

### Tier D — DTC snacks/postres saludables (tickets pequeños, decisión de founder, "sí" rápidos)
Plesh (ronda 1M€, B2B form) · Binz · Rumbo Goods · Futurlife21 · y la veta repostería fit para los canales Postres: Antojos FIT, Dolce Fit, Bakery ZeroZero, Placer Sin Culpa, Maracuyá Sugar Free, Prou.
**Función en el plan:** volumen de campañas pequeñas que generan casos y actividad, no el grueso de ingresos.

### Tier E — Alemania (2,38M subs, activar en fase 2)
Löwenanteil, PrepMyMeal, LiveFresh, every-foods, FITTASTE. Factor/HelloFresh: grandes, dejar para cuando haya caso de éxito ES. **No abrir DE hasta tener 1 campaña ES publicada** — el coste de outreach en frío en alemán sin prueba social no compensa todavía. Excepción: si Cosori (vende en DE) quiere el pack ES+DE, ya está en el rate card.

---

## 4. Canales de captación y cadencia

**Principio (verificado en ronda 1):** teléfono > LinkedIn al founder > email frío. Para pymes españolas, una llamada pidiendo "responsable de marketing / colaboraciones con creadores" abre más puertas que cualquier email. El email es el follow-up con el material, no el primer toque.

**Cadencia "Daily 5"** (ya montada: `docs/outreach/crm-daily5.csv` + plantillas Espanso `espanso-channelad.yml`):
- **5 toques nuevos/día** (L-V): 2-3 llamadas Tier A/B en horario comercial + 2-3 LinkedIn/email a founders.
- **Follow-ups automáticos por fecha:** F1 a +7 días, F2 a +14 días. Sin respuesta tras F2 → estado "dormido", se reactiva con el caso de éxito.
- Cada contacto entra en el CRM con: estado, fecha, plantilla usada, próximo paso, insight (→ contenido LinkedIn) y dato benchmark.

**Secuencia tipo por prospecto:**
1. Llamada → identificar a la persona de marketing/colaboraciones (nombre + email directo, nunca quedarse en info@).
2. Mismo día: email con el **reporte de inventario** (`canales-whatsapp-reporte.pdf`) + 3 líneas personalizadas de "por qué encaja con vuestro cliente" (única frase que cambia entre marcas — reusar email Wetaca).
3. Si hay interés: **rate card personalizado** (clonar plantilla Cosori: seleccionar canales relevantes, quitar los que no apliquen) + propuesta de llamada de 20 min.
4. Llamada de cierre: oferta fundadora + escrow + fechas.
5. Firma → campaña → a los 15 días settlement → **pedir testimonio + datos para caso de éxito**.

**LinkedIn (aire cover):** los decks ya publicables (`channelad-coste-por-impacto.pdf`, `channelad-el-algoritmo-no-decide.pdf`) se publican 1/semana desde el perfil de Rafa. No venden directo: calientan a los founders que recibirán el DM.

---

## 5. Materiales — listo vs. por hacer

**Listo:** reporte inventario (PDF), rate card Cosori (PDF+HTML clonable), 2 hojas Excel de tarifas, plantillas Espanso, CRM CSV, 2 decks LinkedIn, workflow HTML→PDF documentado.

**Por hacer (en orden):**
1. **Rate card Create/IKOHS** (clon de Cosori, mismo set de canales airfryer) — es el mejor prospecto nuevo y no tiene material.
2. **Rate card genérico meal-prep** (canales dieta/saludable/Thermomix-dieta, sin airfryer DE) — sirve para Wetaca, MiPlato, MenuDiet, Bendito Tupper con cambio de logo/nombre.
3. ~~One-pager "Marca fundadora"~~ ✅ HECHO 10-jun → `marca-fundadora-onepager.pdf` (+ HTML en templates/).
4. *(post-primera-campaña)* **Caso de éxito** con métricas reales — el material más valioso del plan; reservar slot para hacerlo bien la semana que se publique.

**Canal nuevo añadido 10-jun: AGENCIAS DE MARKETING** (multiplicador: 1 agencia = N clientes) → `agencias-partner-onepager.pdf` (+ HTML). Oferta "Agencia Partner Fundadora" (10 plazas): rappel **15% de la comisión Channelad** desde el 1er cliente, **20% a partir de 5 clientes activos** (≈3%→4% del presupuesto de campaña; el 25% se RESERVA como palanca de negociación, no publicado — coherente con los tiers del deck Getalink y su guardarraíl del 30%), 1ª campaña de cada cliente nuevo sin comisión (hereda marca fundadora), reporting white-label manual.

---

## 6. Calendario operativo

### Semana 1 (10–16 jun) — Reactivar + desbloquear
- 🔴 **CRÍTICO (verificación, vía sin admin):** chomon rechazó el admin-add → pivote a **código en descripción** (no notifica a seguidores, no toca permisos). Mensaje con los 16 códigos listo en `_mensaje-chomon-codigos.md` — enviárselo y, según pegue códigos: `node _wa-verify-cocina-desc.js chomon@gmail.com --apply` (promueve a plata; lectura 16/16 verificada en vivo el 10-jun). **Modelo de publicación resultante: chomon publica él mismo el contenido de campaña y nosotros verificamos la publicación como seguidores** → pactar con él un SLA de publicación (24-48h) antes de comprometer fechas con marcas. Tarea #1 de la semana.
- Enviar rate card Cosori (buscar contacto marketing ES vía LinkedIn, no form genérico).
- Follow-up F1 vencidos: Jata, NoCocinoMás (Rubén).
- Enviar email Wetaca (ya redactado).
- Llamadas: Create/IKOHS, Taurus MyCook, Bendito Tupper, Qchara (orden ya decidido).

### Semana 2 (17–23 jun) — Volumen Tier A/B
- Daily 5 a régimen: completar llamadas Tier A (Lékué, Ibili, Orbegozo) y Tier B restante (MiPlato, MenuDiet, ApetEat, Fresh Greens vía founder).
- Crear rate cards Create/IKOHS + meal-prep genérico.
- Primer deck LinkedIn publicado.
- Sembrar Cecotec (email a info@ + LinkedIn a marketing, sin esperar respuesta rápida).

### Semanas 3–4 (24 jun–7 jul) — Propuestas y primer cierre
- Objetivo: 5 propuestas enviadas, 1 campaña fundadora firmada.
- Abrir Tier C (apps, vía LinkedIn) y Tier D (founders DTC).
- F2 de todo lo de semana 1.
- Si hay firma: ejecutar campaña → settlement 15 días → **caso de éxito**.

### Mes 2 (jul) — Caso de éxito como palanca
- Reactivar "dormidos" con métricas reales de la primera campaña.
- Cerrar campañas 2 y 3 (idealmente: 1 electro + 1 meal-prep + 1 app = tres categorías sin conflicto de exclusividad).
- Evaluar apertura Tier E (Alemania) si hay caso ES publicado.

### Mes 3 (ago–sep) — Renovación y escala
- Primera renovación a precio completo (+20%) — valida el modelo de negocio entero.
- Outreach DE si procede; ampliar inventario (más creadores de cocina → más inventario que vender).

---

## 7. Manejo de objeciones (las 5 que van a salir)

1. **"¿Y si no funciona?"** → Escrow: solo pagas si se publica y se verifica; reembolso si no. + código/link de atribución por canal para medir conversión real.
2. **"¿Cómo sé que esos suscriptores son reales?"** → Cifras leídas en vivo de la API de WhatsApp (no autodeclaradas); enseñar el canal en el móvil en la llamada.
3. **"Es caro."** → Reframe CPM: 1.686 € por llegar a 1,9M suscriptores opt-in ≈ CPM ~0,9 € sobre subs (vs 20 €+ en medios). Y la 1ª campaña va sin el 20% de comisión.
4. **"¿Exclusividad?"** (meal-prep) → Sí negociable: exclusividad de categoría con compromiso de X campañas o sobreprecio. Usarla como cierre, no regalarla.
5. **"Ya hacemos influencers en Instagram."** → No compite: esto es push directo a 1,9M personas que han pedido recibir recetas, sin algoritmo de por medio (ángulo del deck "el algoritmo no decide").

---

## 8. Riesgos y dependencias

| Riesgo | Impacto | Mitigación |
|---|---|---|
| chomon no pega los códigos (o tarda) | **Bloqueante** para el badge verificado | Son 15 min sin tocar permisos ni notificar a nadie; es SU dinero también (cobra 100% del precio base). Si se enfría: pausar cierres, seguir llenando pipeline |
| Canales aún `bronce/pendiente_verificacion` en marketplace | Marca que mire la ficha ve "no verificado" | Códigos-en-descripción los sube a plata score 70 (oro reservado a admin directo). Hasta entonces, vender con el PDF, no con la ficha pública |
| chomon no publica una campaña a tiempo (modelo creator-publishes) | Incumplir fecha pactada con la marca | SLA de publicación pactado con él + verificación automática de publicación (sesión seguidora lee los posts); escrow protege a la marca si no sale |
| Wetaca exige exclusividad amplia | Mata Tier B entero | Acotar exclusividad a "meal-prep a domicilio ES" + límite temporal (p.ej. 3 meses) |
| Dependencia de un solo creador (chomon) | Concentración de inventario | Mes 2-3: onboarding de 2º-3er creador de cocina (el flujo ya está construido) |
| Estacionalidad agosto (España se para) | Mes 3 flojo en cierres | Cargar cierres en jun-jul; agosto = preparar DE + materiales + renovaciones sep |
| WhatsApp anti-abuso | Sesión de monitorización caída | La sesión wweb (+34674709388) solo LEE como seguidor (riesgo mínimo); nunca Baileys-pairing con número del creador |

---

## 9. KPIs semanales (revisión viernes, 15 min)

- Toques nuevos (target 25/sem) · Tasa llamada→persona de marketing identificada · Propuestas enviadas · Pipeline por etapa (CRM) · Días desde último avance del bloqueo chomon.
- Regla: si en 2 semanas una etapa no convierte (p.ej. 20 llamadas y 0 emails directos conseguidos), se cambia el guion, no se insiste.
