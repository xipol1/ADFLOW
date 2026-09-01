# Posts retirados

Artículos que ya no se publican: cada uno tiene un 301 permanente en `vercel.json`
apuntando a la página que absorbió su intención de búsqueda (PRs #124 y #126,
"retire zero-traffic comparison clones" / "fuse comparison clones into hubs").

Se guardan aquí, fuera de `content/blog/`, por dos razones:

1. `scripts/build-blog.js` solo lee `content/blog/*.md`, así que estando aquí no
   se regeneran ni entran en el índice, el sitemap ni el RSS. Mientras vivieron
   en la carpeta principal, cada build volvía a publicar 13 URLs que respondían
   301: el 20% del sitemap y 95 enlaces internos apuntando a un salto.
2. El texto sigue disponible por si alguna sección merece fusionarse en el hub
   de destino en lugar de perderse.

Si algún día se recupera uno: quita su redirect de `vercel.json` y mueve el `.md`
de vuelta a `content/blog/`. El build tiene un guardarraíl (`loadRetiredSlugs`)
que se niega a publicar un slug que siga teniendo un 301.
