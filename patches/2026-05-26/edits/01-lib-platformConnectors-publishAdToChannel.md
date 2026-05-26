# Edit · `lib/platformConnectors.js` · `publishAdToChannel`

## Qué hace este cambio

Cambia la signature de la función pública `publishAdToChannel` para que
acepte un objeto `campaign` completo en vez de `content` + `targetUrl`
sueltos. Esto permite que los conectores reciban `media[]`, `buttons[]`,
`embed` y `format` y los rendericen nativamente en cada API (Telegram
sendPhoto/sendMediaGroup/reply_markup, Discord embed custom, WhatsApp
header+cta_url, Facebook /photos/videos, LinkedIn assets API).

Back-compat: si un caller externo aún llama con `(channel, content, targetUrl)`
(3 strings), el shim del principio detecta el tipo de `campaignOrContent`
y construye un objeto campaign mínimo, así no se rompe nada.

## Cómo aplicarlo

Localiza la función `async function publishAdToChannel(channel, content, targetUrl)`
en `lib/platformConnectors.js` (busca por `function publishAdToChannel`) y
**sustitúyela completa por el bloque de abajo**. El resto del archivo
queda como está.

## Bloque nuevo

```js
/**
 * Publish a campaign to its target channel.
 *
 * Signature accepts a full campaign object now (instead of content/targetUrl
 * directly) so the rich payload — media[], buttons[], embed, format — can
 * reach the per-platform integrations. Old call sites that still pass two
 * strings keep working via the back-compat block below.
 *
 *   publishAdToChannel(channel, campaign)        ← new
 *   publishAdToChannel(channel, content, target) ← legacy, deprecated
 */
async function publishAdToChannel(channel, campaignOrContent, targetUrlArg) {
  const platform = normalizePlatform(channel.plataforma);
  const creds = getDecryptedCreds(channel);

  // Back-compat: callers que pasan (channel, content, targetUrl) se
  // mapean al objeto campaign con media/buttons/embed vacíos. Callers
  // nuevos pasan el documento entero y leemos todos los campos.
  const campaign = (typeof campaignOrContent === 'string')
    ? { content: campaignOrContent, targetUrl: targetUrlArg, media: [], buttons: [], embed: null, format: 'text' }
    : (campaignOrContent || {});

  const content = String(campaign.content || '').trim();
  const targetUrl = String(campaign.targetUrl || '').trim();
  const media = Array.isArray(campaign.media) ? campaign.media : [];
  const buttons = Array.isArray(campaign.buttons) ? campaign.buttons : [];
  const embed = campaign.embed || null;
  const format = String(campaign.format || 'text');

  if (!isAllowed(platform)) {
    const err = new Error(
      isExplicitlyRejected(platform)
        ? `Publicación no soportada para "${platform}" (plataforma no integrada).`
        : `Publicación no soportada para plataforma "${platform}".`
    );
    err.code = 'PLATFORM_NOT_SUPPORTED';
    throw err;
  }

  switch (platform) {
    case 'telegram': {
      const chatId = channel.identificadores?.chatId || channel.identificadorCanal;
      if (!creds.botToken || !chatId) throw new Error('Telegram: credenciales incompletas');
      const telegram = new TelegramAPI(creds.botToken);
      return telegram.publishAd(chatId, content, targetUrl, { media, buttons, format });
    }
    case 'discord': {
      const botToken = creds.botToken || creds.accessToken;
      const channelId = channel.identificadores?.channelId || channel.identificadorCanal;
      if (!botToken || !channelId) throw new Error('Discord: credenciales incompletas');
      const discord = new DiscordAPI(botToken);
      return discord.publishAd(channelId, content, targetUrl, { embed, media, format });
    }
    case 'whatsapp': {
      const to = channel.identificadores?.phoneNumber || channel.identificadorCanal;
      if (!creds.accessToken || !creds.phoneNumberId || !to) throw new Error('WhatsApp: credenciales incompletas');
      const whatsapp = new WhatsAppAPI(creds.accessToken, creds.phoneNumberId);
      return whatsapp.publishAd(to, content, targetUrl, { media, buttons, format });
    }
    case 'facebook': {
      const pageId = channel.identificadorCanal;
      if (!creds.accessToken || !pageId) throw new Error('Facebook: credenciales incompletas');
      const facebook = new FacebookAPI();
      return facebook.publishPost(creds.accessToken, pageId, content, targetUrl, { media, buttons, format });
    }
    case 'linkedin': {
      const linkedinUrn = channel.identificadores?.linkedinUrn;
      if (!creds.accessToken || !linkedinUrn) throw new Error('LinkedIn: credenciales incompletas');
      const linkedin = new LinkedInAPI(creds.accessToken);
      return linkedin.publishAd(linkedinUrn, content, targetUrl, { media, buttons, format });
    }
    default:
      throw new Error(`Publicación de anuncios no soportada para plataforma "${platform}"`);
  }
}
```

## Verificación post-aplicación

```bash
node -e "
const { publishAdToChannel } = require('./lib/platformConnectors');
console.log('arity:', publishAdToChannel.length); // espera 3
// Llamada con campaign object (nueva signature) sin credenciales válidas
publishAdToChannel(
  { plataforma: 'telegram', identificadorCanal: '@x' },
  { content: 'hi', targetUrl: 'https://x.com', media: [], buttons: [] }
).catch(e => console.log('expected error:', e.message));
// Llamada legacy (3 strings) — sigue funcionando vía shim
publishAdToChannel({ plataforma: 'telegram', identificadorCanal: '@x' }, 'hi', 'https://x.com')
  .catch(e => console.log('legacy still works:', e.message));
"
```

Salida esperada:
```
arity: 3
expected error: Telegram: credenciales incompletas
legacy still works: Telegram: credenciales incompletas
```
