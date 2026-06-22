# Outreach de captación de canales

Flujo de bajo coste (~0 € de medios) para convertir el backlog de canales ya
descubiertos (y sin reclamar) en creadores verificados que cobran campañas.

La idea: **no captamos a ciegas**. Ya tenemos cientos de canales scrapeados en la
base de datos (`Canal` con `claimed: false`). Este flujo los prioriza por valor y
da el guion para contactar a sus dueños con el gancho que mejor convierte:

> "Tu canal ya está en Channelad, valorado en ~X €/mes. Recláma­lo y empieza a cobrar."

## 1. Generar la lista de objetivos

```bash
# Nicho cocina/dieta en WhatsApp (nuestro vertical ancla):
node scripts/build-outreach-list.js --niche cocina --platform whatsapp

# Telegram, canales medianos+:
node scripts/build-outreach-list.js --platform telegram --min-followers 5000 --limit 200

# Filtro por palabras clave a medida:
node scripts/build-outreach-list.js --keywords cocina,recetas,airfryer --platform all
```

Salida: `outreach/lists/outreach-<nicho>-<plataforma>-<fecha>.csv`, **ordenada de
mayor a menor ingreso estimado** (contacta primero a los que más valen tu tiempo).
La columna `eur_per_post` / `eur_per_month` usa el **mismo modelo de precios que la
calculadora pública** (`client/src/ui/lib/channelPricing.js`), así que la cifra del
mensaje coincide con lo que el dueño verá si la calcula él mismo en `/para-canales`.

Comprobación rápida sin DB: `node scripts/build-outreach-list.js --self-test`.

## 2. Contactar (plantillas en `outreach/templates/`)

- `telegram.md`, `whatsapp.md`, `discord.md` — DM corto + seguimiento.
- Personaliza SIEMPRE los placeholders con los datos reales de la fila del CSV:
  `{{name}}`, `{{followers}}`, `{{eur_per_post}}`, `{{eur_per_month}}`, `{{public_url}}`, `{{claim_url}}`.
- Nada de copia-pega masivo idéntico: 1 línea genuina sobre su canal sube mucho la respuesta.

### Deep link de "reclama tu canal" (`claim_url`)

El CSV trae una columna `claim_url` con un enlace directo a reclamar **ese** canal
concreto (`/claim/<id>` → flujo de 3 pasos, ya en producción). Es el mayor salto de
conversión del outreach: el dueño no aterriza en una landing genérica, sino en "este
es tu canal, recláma­lo". La plantilla de Telegram ya lo usa como CTA.

⚠️ Hoy el claim solo funciona en **Telegram** (verificación por descripción vía MTProto).
Para WhatsApp/Discord la columna va vacía y el outreach usa `signup_url` (/para-canales)
+ onboarding manual, hasta cablear su claim (WhatsApp espera al sidecar de Baileys;
Discord puede ir por su OAuth de propiedad ya existente).

## 3. La regla de oro

No metas creadores en un escaparate vacío. A cada creador que diga "sí",
**emparéjalo con una primera campaña real** (oferta marca fundadora: 1ª campaña
gratis para el anunciante) en ≤2 semanas. Cobra → testimonio → referido. El motor
de referidos (`?ref=` en el dashboard del creador) ya existe: dáselo a quien cobre.

## 4. Métricas (la que importa)

No cuentes "registrados", cuenta **creadores que han cobrado al menos una vez**.
Embudo a seguir, semana a semana:

`contactados → registrados → canal verificado → primera campaña cobrada`

## Reabastecer el backlog (discovery)

La lista se nutre de `Canal` descubiertos por los scrapers. Ese discovery ahora
corre **gratis en GitHub Actions** (`.github/workflows/discovery-jobs.yml`), no en
Vercel (donde moría por el límite de 60 s). Si la lista sale corta, lanza el job
de discovery a mano desde la pestaña Actions → "Discovery & Intel Jobs" → Run.

> Las CSV generadas en `outreach/lists/` NO se versionan (datos de scraping, cambian
> a diario). Las plantillas y este README sí.
