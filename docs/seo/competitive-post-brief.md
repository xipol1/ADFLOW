# Brief compartido — Posts comparativos para el blog de Channelad

> Este documento es la **única fuente de verdad** del guideline editorial para posts comparativos del blog (categoría "Comparativas"). Léelo entero antes de redactar.

## Quién es Channelad

- Marketplace de publicidad en canales cerrados: **Telegram, WhatsApp Channels, Discord, Instagram Broadcasts** (Newsletter próximo).
- Modelo: el canal owner da acceso admin → Channelad publica en el momento exacto pactado y lee métricas reales (views, reacciones, forwards) directamente como admin. Pago en escrow.
- Comisión: 20% estándar, 18% Partner API, 15% para volumen >€20K/mes.
- Métricas propietarias: **CAS** (Channel Authority Score 0-100), CAF, CTF, CER, CVS, CAP. Análogas a Trust Flow/Domain Authority pero para canales cerrados.
- CPM base por plataforma: WhatsApp **€20**, Newsletter **€28**, Instagram **€22**, Telegram **€14**, Discord **€9**, Blog **€8**.
- Primer foco geográfico: español (ES + LATAM). En segunda fase, EN global.
- Posicionamiento: *"Channelad no vende anuncios. Channelad es el experto en publicidad en Telegram, Discord y WhatsApp."*

## Tono editorial (de la página `09 · Marketing` de Notion)

- **Experto pero accesible.** Datos sobre opinión. Directo. Sin fluff.
- **Primera persona singular** en el hook y donde aporte experiencia ("escribí", "probé", "vi"). Tercera persona neutra en tablas y secciones de datos.
- **Honesto pero claro en diferencias**. Reconoce dónde gana el competidor. Nunca digas "X es peor"; di "X tiene Y limitación cuando A".
- Sin emojis en el cuerpo (sí en hooks puntuales si aportan).
- Sin frases tipo "en este artículo veremos…". Entras al grano.

## Estructura obligatoria (1.500–2.000 palabras)

```markdown
---
title: "[TÍTULO ≤60 chars]"
description: "[DESC ≤160 chars, action-oriented]"
slug: "[slug-kebab]"
date: "[YYYY-MM-DD]"
dateModified: "[YYYY-MM-DD]"
category: "Comparativas"
readTime: "[12-16] min"
lang: "es"
keywords: ["[6-8 keywords; la principal y sus variantes]"]
---

[Hook personal de 2-3 párrafos. Experiencia real testeando ambas. Mencionar
un número o anécdota concreta.]

## ¿Qué es [COMPETIDOR]?
[150-200 palabras: qué hace, para quién, modelo de negocio, mercado principal.]

## [COMPETIDOR] vs Channelad: tabla comparativa
[Tabla markdown con header. 8+ filas. Criterios sugeridos:
 - Foco de mercado / idiomas soportados
 - Plataformas cubiertas (TG/WA/DC/IG/Newsletter)
 - Pago / escrow
 - Verificación de métricas (declaradas vs admin access)
 - Modelo de cobro (comisión %, SaaS, ambos)
 - CPM benchmark publicado
 - Tipo de canales (públicos/privados/cerrados)
 - Soporte / idioma del onboarding
 - Métricas propietarias
 - API B2B disponible]

## Cuándo elegir [COMPETIDOR]
[3-4 escenarios concretos donde el competidor es la opción correcta. Honestidad.]

## Cuándo elegir Channelad
[3-4 escenarios donde Channelad gana. Basados en diferenciadores reales: acceso admin, escrow, español primero, CAS, etc.]

## Comisiones y precios reales
[Subsección con datos numéricos. Si no tienes el dato del competidor, decirlo
explícitamente: "El SaaS de X no publica su tarifa pública; última estimación
pública de [fuente] era $499/mes en [año]". JAMÁS inventes números.]

## Veredicto: ¿uno, otro o ambos?
[Cierre con recomendación honesta. La mayoría de veces es "ambos para casos
distintos". Mencionar al menos un caso real plausible.]

## Preguntas frecuentes
[4 Q&A. Respuestas de 80-120 palabras cada una. Las preguntas son las que
una persona real escribiría en Google: "[competidor] vs channelad", "es seguro
[competidor]", "alternativa española a [competidor]", "cuánto cuesta [competidor]".]
```

## Reglas duras

1. **Internal-links obligatorios** (mínimo 3):
   - `/blog/calculadora-precios-publicidad` (en CTA o en frase natural sobre "calcular tarifa")
   - Al menos un pilar relevante: `/blog/como-monetizar-canal-telegram`, `/blog/como-monetizar-canal-whatsapp`, `/blog/como-monetizar-servidor-discord`
   - Un post de comparativa adyacente si aplica (`/blog/telega-in-alternatives`, `/blog/channelad-vs-meta-ads`, etc.)
2. **CTA final** hacia `/para-anunciantes` (si el target del post es marca/anunciante) o `/para-canales` (si es creator).
3. **NUNCA inventes datos del competidor.** Si no lo sabes, di "no publica X" o "según [fuente pública]". Usa WebFetch si necesitas verificar un dato concreto.
4. **NUNCA difames.** Reconocer dónde gana el competidor es lo que hace creíble el post.
5. **Tablas markdown** con `|---|` y header. Sin tablas HTML.

## Referencia: posts comparativos que ya funcionan

Lee al menos uno entero antes de redactar — clava el tono:
- `content/blog/telega-in-alternatives.md` (EN, lista de 5 competidores)
- `content/blog/channelad-vs-meta-ads.md` (EN, formato 1v1)
- `content/blog/discord-vs-telegram-anunciantes.md` (ES, comparativa de plataformas)

## FAQ — formato de salida obligatorio

Tras crear el `.md`, devuelve el objeto FAQ como JS válido (sin trailing comma) listo para `client/src/ui/pages/blog/blogPosts.js`:

```js
{
  slug: '[slug]',
  title: '[title]',
  description: '[description]',
  category: 'Comparativas',
  platform: '[telegram|whatsapp|discord|newsletter|instagram|all]',
  date: '[YYYY-MM-DD]',
  dateModified: '[YYYY-MM-DD]',
  readTime: '[N] min',
  lang: 'es',
  keywords: ['kw1', 'kw2', ...],
  faq: [
    { question: '...', answer: '...' },
    { question: '...', answer: '...' },
    { question: '...', answer: '...' },
    { question: '...', answer: '...' },
  ],
},
```

`platform`: usa la plataforma principal del competidor (TG/WA/DC/...). Si el competidor cubre varias por igual, usa `'all'`.

## Checklist final antes de devolver

- [ ] Frontmatter completo con todos los campos
- [ ] 1.500-2.000 palabras (cuenta aprox)
- [ ] Hook personal en primera persona
- [ ] Tabla comparativa con 8+ criterios
- [ ] 3-4 escenarios "cuándo elegir [competidor]" + 3-4 "cuándo elegir Channelad"
- [ ] Sección "Comisiones y precios reales" sin números inventados
- [ ] 4 FAQ con respuestas de 80-120 palabras
- [ ] Mínimo 3 internal-links a otros posts/páginas de channelad.io
- [ ] CTA final hacia /para-anunciantes o /para-canales
- [ ] El competidor sale bien parado en al menos un escenario
