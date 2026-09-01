# Auditoría de backlinks — channelad.io (26 agosto 2026)

**Conclusión: el spam existe, es masivo en Ahrefs y no nos está haciendo daño.
Recomendación: NO subir el disavow todavía.**

## Los datos

| Fuente | Qué ve |
|---|---|
| Ahrefs | 161 dominios de referencia · 163 backlinks · DR 0,1 |
| Google Search Console | **2 enlaces externos**, ambos de linkedin.com a la home |

Esa discrepancia es el hallazgo principal: Ahrefs rastrea la web entera y ve la
red de spam; Google, que es quien puntúa, no la cuenta. De 161 dominios, en el
informe de enlaces de Search Console aparecen exactamente cero.

Del perfil de Ahrefs:

- **156 de 161 dominios marcados SPAM** por el propio Ahrefs.
- 87,6% nofollow. Solo 20 dominios dejan 22 enlaces dofollow.
- Ningún dominio de referencia supera DR 52, y ninguna página enlazante tiene UR ≥ 10.
- Primeras apariciones: 24 abril 2026 → 24 agosto 2026, goteo constante.

## Qué son exactamente

Los anchors lo delatan. Los tres más frecuentes:

1. *"Everything channelad.io needs: guest posts and backlinks, on-page SEO, local
   SEO, web development…"* — 34 dominios, 21% del perfil, 0 dofollow.
2. *"High Quality Dofollow Backlinks DA 50 PA 40 Premium PBN Network Service
   channelad.io Rank First Page Google Fast SEO Link Building Buy Backlinks
   Online Cheap"* — 19 dominios, **20 de los 22 enlaces dofollow**.
3. *"channelad.io"* — 13 dominios, 0 dofollow.

No son enlaces que nadie nos haya puesto: son **páginas de venta de servicios SEO
que nos listan como ejemplo**. Las páginas enlazantes tienen 3.100+ dominios
salientes cada una (`archive-hu.com/all/601/16.html`, `onlyhealthydeals.com/all/600/25.html`,
`bripto.shop/proven-manual-outreach-backlinks…`): listados masivos donde
channelad.io es una fila más entre miles de dominios recién registrados.

Los nombres siguen tres o cuatro plantillas generadas: `seopxl-*-lab.shop`,
`*rank*.shop`, `link*collective.shop`, `google seo *.shop`. Es una sola red.

Los 22 dofollow apuntan a la home, a `/blog/publicidad-comunidades-online-guia-anunciantes`
y a `/blog/publicidad-comunidades-vs-redes-sociales` — ninguno a los 13 posts
retirados en la auditoría de blog, así que esa limpieza no perdió nada.

## Por qué no hay que hacer nada (todavía)

1. **No hay acción manual.** Search Console → Acciones manuales: "No se ha
   detectado ningún problema".
2. **Google ya los ignora.** 161 dominios en Ahrefs contra 2 enlaces contados en
   Search Console. SpamBrain neutraliza este tipo de red automáticamente; es la
   política declarada de Google desde 2022.
3. **No los compramos.** El disavow existe para enlaces de pago que no puedes
   retirar, o para salir de una penalización. Ninguno de los dos casos aplica.
4. **No hay caída que explicar.** 41 visitas orgánicas al mes y 14 keywords: no
   hay ranking perdido que atribuir a estos enlaces.

Subir un disavow ahora sería trabajo con riesgo asimétrico: no gana nada (Google
ya los descarta) y una entrada mal puesta sí resta.

## Qué NO funciona: pedir la retirada

Escribir a 159 dominios generados automáticamente para vender enlaces no lleva a
ninguna parte: no hay contacto real detrás, y responder identifica el dominio
como "vivo" ante quien opera la red. No se ha contactado con ninguno.

## Qué sí hacer

1. **Vigilar mensualmente** Search Console → Acciones manuales. Es el único
   disparador que convierte esto en un problema.
2. **Si aparece una acción manual por enlaces artificiales**: subir
   [`disavow-channelad.io.txt`](disavow-channelad.io.txt) (159 dominios, ya
   preparado) en <https://search.google.com/search-console/disavow-links> y pedir
   revisión explicando que es spam no solicitado.
3. **No comprar nunca un paquete de enlaces.** Si alguna de estas redes acaba
   contratada, el perfil pasa de "spam que Google ignora" a "esquema de enlaces
   propio", que sí se penaliza.
4. **El problema real no son los enlaces malos, es la ausencia de buenos**: 20
   dominios followed y DR 0,1. Con 51 guías publicadas, la palanca está en
   conseguir las primeras citas reales (directorios de marketplaces, prensa de
   startups españolas, podcasts del sector, la propia red de creadores) — no en
   limpiar spam que ya está neutralizado.

## Único dominio a revisar a mano

`palmador.ai` — DR 41, tráfico orgánico real, 2 enlaces dofollow, no marcado como
spam. Es el único que parece una cita legítima. Está **excluido** del disavow a
propósito.
