# Blog SEO — Auditoría y plan de acción (2026-05-27)

## TL;DR
- Local desincronizado: `public/blog/index.html` muestra 31 artículos, live (dist) muestra 35. Causa: el index local quedó comiteado de una versión vieja, mientras CI regenera 35.
- Notion define **3 pilares vivos** (Telegram, WhatsApp, Discord) y la calculadora aparece como *linkbait* en `/recursos/calculadora-precio` — actualmente en `/blog/calculadora-precios-publicidad`.
- **Decisión nueva (usuario)**: la calculadora pasa a ser el **4º pilar** del blog, eje de captura de leads por SEO.
- Bug crítico: 4 posts en inglés emiten `og:locale: es_ES`.
- Calculator route NO está prerenderizada → bots sin JS leen el `<title>` del home.

## Estado del blog (snapshot)

| Métrica                       | Local stale | Live (dist) | Tras este fix |
|-------------------------------|-------------|-------------|---------------|
| Artículos en index            | 31          | 35          | 35            |
| Lectura total                 | 426 min     | 479 min     | 479 min       |
| Pilares destacados            | 0 (solo "Featured") | 0   | 4             |
| Categorías con color propio   | 1 (purple)  | 1           | 4             |
| Filtros en index              | No          | No          | Sí (vanilla JS) |
| `og:locale` correcto por lang | No          | No          | Sí            |
| Calculator prerenderizada     | No          | No          | Sí            |
| Schema con wordCount          | No          | No          | Sí            |

## Notion — estructura objetivo

Notion confirma:

- Cluster TELEGRAM → pilar `como-monetizar-canal-telegram` (vol 500-1.200/mes)
- Cluster WHATSAPP → pilar `como-monetizar-canal-whatsapp` (vol 300-600/mes)
- Cluster DISCORD → pilar `como-monetizar-servidor-discord` (vol 200-450/mes)
- Cluster TRANSVERSAL → comparativas y conversión
- Cluster INSTAGRAM → nuevo, en planificación

Notion lista `channelad.io/recursos/calculadora-precio — Herramienta CPM (linkbait)` como página de conversión, no como pilar. **Promoción**: la calculadora pasa a ser el 4º pilar del cluster transversal con su propia categoría visual.

## Cambios que se aplican ahora

### A. Calculadora como pilar (lead capture)

1. Cambiar `category` de `"Guias"` → `"Herramientas"` en:
   - `content/blog/calculadora-precios-publicidad.md`
   - `client/src/ui/pages/blog/blogPosts.js`
2. Subir `priority` de la calculadora en sitemap de `0.7` → `0.9`.
3. Añadir `/blog/calculadora-precios-publicidad` a `scripts/prerender-routes.js` con title/desc propios. Crawlers HTML-only verán el meta correcto en lugar del home.
4. En el index del blog, destacarla en sección "Empezar aquí · Pilares" con CTA propia ("Calcula tu tarifa →") y badge naranja `#f59e0b`.
5. Cross-linking: posts de cluster Telegram/WhatsApp/Discord enlazarán a la calculadora desde el primer scroll (lo añadiremos en una segunda pasada manual sobre los markdown; este PR introduce el inline-CTA opcional vía `{{calculator_cta}}`).

### B. Rediseño de cards en `/blog`

- Sección nueva "Empezar aquí — Pilares" con 4 cards grandes (telegram, whatsapp, discord, calculadora).
- Sección "Todos los artículos" con filtros de categoría (Todos / Guías / Monetización / Comparativas / Herramientas).
- Color por categoría:
  - Guias → azul `#3b82f6`
  - Monetizacion → verde `#10b981`
  - Comparativas → morado `#7C3AED`
  - Herramientas → ámbar `#f59e0b`
- Plataforma como segundo badge (Telegram/WhatsApp/Discord) cuando el post tiene `platform`.
- Stats con fecha humana: "Mayo 2026" en lugar de "2026-05".

### C. Fixes técnicos SEO

1. `og:locale` mapeado por `{{lang}}` en `_template.html`: `es` → `es_ES`, `en` → `en_US`. Bug que afecta 4 posts EN.
2. Article schema: añadir `wordCount` (calculado del markdown) y `articleSection` (= category).
3. TOC sticky auto-generado desde `h2` con `IntersectionObserver` (>10 min de lectura).
4. Mejora del `BreadcrumbList`: incluir categoría como nivel intermedio (Inicio › Blog › Herramientas › ...).

### D. Saneo del repo

- Regenerar `public/blog/*.html` localmente y commitearlo (la rama main vive así por convención del proyecto — ver `project_deploy`).
- Validar que `dist/blog/` no se commitea (ya está en gitignore).

## Quick wins futuros (no se hacen en este PR)

- OG image dinámica por post (3 templates por platform).
- Tag pages clickables (`/blog/tag/<slug>`).
- Newsletter signup widget en post-CTA.
- Búsqueda interna con Pagefind.
- Migración a URLs jerárquicas `/blog/telegram/<slug>` con 301 redirects (alto riesgo, posponer).

## Métricas a monitorizar (GSC + GA4)

- Impresiones/clicks de la calculadora a 30 días.
- Conversiones de email vía `/api/calculator/lead` con `source=blog_calculator`.
- Bounce rate y dwell time en posts pilar (esperamos +20% en dwell por TOC + cross-links a calculadora).
- Pageviews por categoría tras el filtro (estimación: +15% pageviews/sesión por navegabilidad).

## Antes / Después

```
ANTES                                  DESPUÉS
─────                                  ───────
/blog                                  /blog
  ├─ Featured (último post)              ├─ Pilares (4 cards: 3 platforms + calc)
  └─ Grid de 31 articulos                ├─ Filtros (5 categorías)
                                         └─ Grid de 35 articulos
                                            con color por categoría +
                                            plataforma badge

Calculadora                            Calculadora
  ├─ category: Guias                     ├─ category: Herramientas (pilar)
  ├─ sitemap priority 0.7                ├─ sitemap priority 0.9
  ├─ sin prerender                       ├─ prerenderizada
  └─ misma card que el resto             └─ destacada con badge "Herramienta"

og:locale = "es_ES" siempre            og:locale por lang del post
Article schema sin wordCount           Article schema con wordCount + articleSection
```
