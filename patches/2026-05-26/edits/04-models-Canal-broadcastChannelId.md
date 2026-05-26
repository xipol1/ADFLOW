# Edit · `models/Canal.js` · Campo `broadcastChannelId`

## Qué hace

Añade el campo `broadcastChannelId` en dos sitios del schema de Canal:
- `identificadores.broadcastChannelId` — declaración manual (operativa hoy)
- `botConfig.instagram.broadcastChannelId` — espejo para cuando llegue
  OAuth con scope `instagram_manage_messages` (Meta App Review)

## Cómo aplicarlo

### Paso 1 · En el bloque `identificadores: { ... }`

Localiza:

```js
identificadores: {
  chatId: { type: String, default: '' },
  serverId: { type: String, default: '' },
  phoneNumber: { type: String, default: '' },
  provider: { type: String, default: '' },       // newsletter provider (mailchimp/beehiiv/substack)
  linkedinUrn: { type: String, default: '' },     // urn:li:person:xxx or urn:li:organization:xxx
},
```

Sustituye por:

```js
identificadores: {
  chatId: { type: String, default: '' },
  serverId: { type: String, default: '' },
  phoneNumber: { type: String, default: '' },
  provider: { type: String, default: '' },       // newsletter provider (mailchimp/beehiiv/substack)
  linkedinUrn: { type: String, default: '' },     // urn:li:person:xxx or urn:li:organization:xxx
  // Instagram Broadcast Channel ID (canales unidireccionales). Es el
  // producto principal de Channelad en Instagram. Distinto del IG
  // Business ID — se obtiene vía Graph API `/{ig-user}/broadcast_channels`
  // y requiere el scope `instagram_manage_messages` (ticket pendiente).
  // Mientras tanto el campo se acepta como declaración manual durante
  // el onboarding y se valida luego por el equipo de moderación.
  broadcastChannelId: { type: String, default: '' },
},
```

### Paso 2 · En el bloque `botConfig.instagram: { ... }`

Localiza:

```js
instagram: {
  accessToken: String,
  igUserId: String,
  username: String,
```

Sustituye por:

```js
instagram: {
  accessToken: String,
  igUserId: String,
  username: String,
  // Broadcast Channel ID asociado a esta cuenta IG (cuando aplique).
  // Sigue la convención de identificadores.broadcastChannelId — este
  // espejo en botConfig es para cuando se descubre por OAuth en el
  // futuro (vs. declarado manualmente en onboarding).
  broadcastChannelId: { type: String, default: '' },
```

## Verificación

```bash
node -e "
const M = require('./models/Canal');
const paths = Object.keys(M.schema.paths);
console.log('identificadores.broadcastChannelId:', paths.includes('identificadores.broadcastChannelId'));
console.log('botConfig.instagram.broadcastChannelId:', paths.includes('botConfig.instagram.broadcastChannelId'));
"
```

Esperado: ambos `true`.
