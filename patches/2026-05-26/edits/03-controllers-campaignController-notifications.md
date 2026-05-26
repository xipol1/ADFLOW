# Edit · `controllers/campaignController.js` · Email en notificaciones críticas

## Qué hace este cambio

Añade `'email'` al array `canales` de las llamadas a `notifySafe` que
corresponden a eventos críticos del ciclo de vida de una campaña, donde
no podemos asumir que el destinatario esté conectado al dashboard:

- `campana.nueva` — al channel owner cuando recibe una solicitud
- `campana.publicada` — al advertiser cuando el creator confirma
- `campana.completada` — a ambos cuando se libera el escrow
- `campana.cancelada` — al channel owner cuando el advertiser cancela
- `campana.expirada` — al advertiser (vive en `lib/campaignCron.js`)

NO añadimos email a `campana.mensaje` (chat messages) ni propuestas de
cambio — son demasiado chatty para email y la UI realtime ya los maneja.

Los `notificationService.filtrarCanalesPorPreferencias` filtra el canal
'email' si el usuario lo tiene deshabilitado, así que añadir 'email' a
los defaults no fuerza el envío contra preferencias.

## Cómo aplicarlo

Localiza cada bloque `notifySafe({...})` en `controllers/campaignController.js`
con los `tipo` listados arriba. Para cada uno, sustituye:

```js
canales: ['database', 'realtime'],
```

por:

```js
canales: ['database', 'realtime', 'email'],
```

### Bloques afectados (6 sitios en el controller)

| `tipo` | Sustituir |
|---|---|
| `campana.nueva` (createCampaign, ~línea 132) | ✅ |
| `campana.publicada` (confirmCampaign, ~línea 406) | ✅ |
| `campana.completada` (completeCampaign — advertiser side, ~línea 552) | ✅ |
| `campana.completada` (completeCampaign — creator side, ~línea 563) | ✅ |
| `campana.cancelada` (cancelCampaign, ~línea 661) | ✅ |
| `campana.nueva` (autoBuy bulk — ~línea 1163) | ✅ |

### Bloques NO afectados (no email)

| `tipo` | Razón |
|---|---|
| `campana.mensaje` (sendMessage, ~línea 780) | chat events, demasiado frecuente |
| `campana.mensaje` (suggestionPropose, ~línea 921) | suggestion event, idem |
| `campana.mensaje` (suggestionAccept/reject, ~línea 1013) | idem |

## Cambio paralelo en `lib/campaignCron.js`

Localiza la llamada a `notificationService.enviarNotificacion` con
`tipo: 'campana.expirada'` (en el paso "1. Expire campaigns past deadline"
del cron). Cambia:

```js
canales: ['database', 'realtime'],
```

por:

```js
canales: ['database', 'realtime', 'email'],
```

## Verificación

Sin disparar emails reales (en dev/test sin SMTP configurado):

```bash
node -e "
const fs = require('fs');
const c = fs.readFileSync('controllers/campaignController.js', 'utf8');
const cron = fs.readFileSync('lib/campaignCron.js', 'utf8');
const emailEvents = ['campana.nueva', 'campana.publicada', 'campana.completada', 'campana.cancelada', 'campana.expirada'];
emailEvents.forEach(tipo => {
  const idx = (c + cron).indexOf(\`tipo: '\${tipo}'\`);
  if (idx < 0) { console.log('NOT FOUND:', tipo); return; }
  // Snippet ±100 chars around the event
  const window = (c + cron).slice(idx, idx + 200);
  const hasEmail = window.includes(\"'email'\");
  console.log(\`\${hasEmail ? '✅' : '❌'} \${tipo}\`);
});
"
```

Esperado: ✅ en los 5 eventos.
