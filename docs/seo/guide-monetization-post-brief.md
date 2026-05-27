# Brief — Posts de Guías y Monetización para Channelad

> Fuente de verdad para posts de categoría **Guias**, **Monetizacion** y **Herramientas**. Léelo antes de redactar. Comparte tono y contexto de Channelad con el brief de comparativas — pero la estructura cambia.

## Contexto Channelad (resumen)

- Marketplace de publicidad en canales cerrados: Telegram, WhatsApp, Discord, Instagram Broadcasts, Newsletter (próximo).
- Acceso admin directo a los canales → métricas verificadas (no declaradas).
- Comisión: 20% estándar, 18% Partner API, 15% volumen >€20K/mes.
- CPM base: WhatsApp €20, Newsletter €28, Instagram €22, Telegram €14, Discord €9, Blog €8.
- Foco geográfico: ES + LATAM primero, EN en fase 2.
- Métricas propietarias: CAS, CAF, CTF, CER, CVS, CAP.
- Posicionamiento: *"Channelad es el experto en publicidad en Telegram, Discord y WhatsApp."*

## Tono editorial

- Experto pero accesible. Datos sobre opinión. Directo. Sin fluff.
- **Primera persona singular** en el hook. Tercera neutra en tablas y datos.
- Sin emojis en el cuerpo.
- Sin "en este artículo veremos…" — entra al grano con un dato o una anécdota.

## Estructura por tipo de post

### A) Guías (`category: Guias`) — 1.800–2.200 palabras

```markdown
---
frontmatter completo (ver más abajo)
---

[Hook personal 2-3 párrafos: tu experiencia con el tema concreto, con un
número o anécdota verificable. NO genérico.]

## ¿Qué es [TEMA]? (definición clara)
[120-180 palabras. Definición operativa, sin academicismos.]

## [Sección 2: contexto/por qué importa ahora]
[Datos del mercado, tendencias 2026, comparativa rápida con el formato más
parecido. 200-300 palabras.]

## [Paso a paso, 5-8 secciones H2 con número o nombre claro]
Cada paso:
- Acción concreta en una frase
- Cómo se hace
- Trampas comunes
- Ejemplo o número real cuando aplica

## Tabla de [precios/CPMs/comparativa/checklist] cuando aporta
Markdown table con header. Mínimo 5 filas.

## Errores comunes (3-5)
Bullets concisos con la lección.

## Recursos / herramientas mencionadas
Lista con internal-links.

## Preguntas frecuentes
4 Q&A. Respuestas 80-120 palabras cada una.
```

### B) Monetización (`category: Monetizacion`) — 1.800–2.200 palabras

Pensado para creators que quieren ganar dinero. Estructura:

```markdown
[Hook personal: "Hace X meses…" con cifra real o anécdota.]

## ¿Cuánto se puede ganar realmente?
[Tabla por nicho/tamaño con cifras concretas. Sin promesas vacías.]

## Los N métodos para monetizar [tema]
Cada método (mínimo 4):
### Método X — [Nombre]
- Cómo funciona
- Requisitos
- Cifras de ingresos típicas
- Pros / contras
- Quién debería usarlo

## Cómo combinar varios métodos
[Diagrama mental o ejemplo de stack típico.]

## Errores que cuestan dinero
3-5 errores con coste estimado.

## Tabla de CPMs/tarifas por nicho
Mínimo 6 nichos. Rangos realistas.

## Preguntas frecuentes
4 Q&A.
```

### C) Herramientas (`category: Herramientas`) — 1.500–1.800 palabras

Como un "stack post". Estructura tipo "las 10 herramientas que uso":

```markdown
[Hook: tu workflow real, cuánto tiempo te ahorra el stack.]

## Categoría 1: [Analytics / Discovery / etc.]
### 1. [Herramienta] — [Para qué]
- Qué resuelve
- Precio
- Alternativa gratuita
- Mi nota personal

## Categoría 2…

## Stack mínimo viable (€0-€20/mes)
Lista de 3-4 imprescindibles.

## Stack profesional (€100+/mes)
Lista expandida.

## Preguntas frecuentes
4 Q&A.
```

## Reglas duras

1. **Internal-links** (mínimo 3-4):
   - `/blog/calculadora-precios-publicidad` en CTA o en mención natural sobre tarifas
   - El pilar de su cluster: `/blog/como-monetizar-canal-{telegram|whatsapp|servidor-discord}`
   - 1-2 posts adyacentes (guías, comparativas relacionadas)
2. **CTA final** hacia `/para-canales` (si el target es creator) o `/para-anunciantes` (si es marca).
3. **NUNCA inventes números**. Si no sabes un dato exacto, di "según mi medición en X canales" o "los rangos públicos del mercado" o "no hay datos oficiales".
4. **Cifras realistas**. Si dices "puedes ganar 500€/mes con 1.000 suscriptores", el lector hace el cálculo: 500€ / 4 posts/mes = 125€/post / 1.000 subs = €125 CPM. Imposible. Sé honesto con los números.
5. **Tablas markdown** con `|---|`. Sin HTML.

## Frontmatter obligatorio

```yaml
---
title: "[≤60 chars con keyword principal]"
description: "[≤160 chars con CTA implícito o gancho]"
slug: "[slug-kebab]"
date: "[YYYY-MM-DD]"
dateModified: "[YYYY-MM-DD]"
category: "Guias" | "Monetizacion" | "Herramientas"
readTime: "[12-18] min"
lang: "es"
keywords: ["[6-8 keywords]"]
---
```

Opcional: `howto: "true"` para guías paso a paso (activa HowTo schema).

## Referencias

Lee antes de redactar al menos uno de estos posts del mismo tipo:
- Guías: `content/blog/crear-canal-telegram-monetizar.md`, `content/blog/media-kit-canal-telegram.md`
- Monetización: `content/blog/como-monetizar-canal-telegram.md`, `content/blog/monetizar-canal-telegram-espana.md`
- Comparativas: ver `competitive-post-brief.md`

## FAQ — formato de salida

Devuelve tras crear el .md:
```js
{
  slug: '[slug]',
  title: '[title]',
  description: '[description]',
  category: 'Guias' | 'Monetizacion' | 'Herramientas',
  platform: '[telegram|whatsapp|discord|instagram|newsletter|all]',
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

## Checklist final

- [ ] Frontmatter completo
- [ ] 1.500-2.200 palabras
- [ ] Hook personal con cifra/anécdota
- [ ] Tabla con datos reales (al menos 1)
- [ ] 4 FAQ con respuestas 80-120 palabras
- [ ] 3-4 internal-links (incluyendo calculadora y pilar)
- [ ] CTA final hacia /para-canales o /para-anunciantes
- [ ] Sin números inventados — usar rangos o "según fuente"
