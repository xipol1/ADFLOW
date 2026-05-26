# Edit · `client/src/ui/pages/dashboard/advertiser/NewCampaignPage.jsx` · FormatSelector + editors

## Qué hace

Inyecta el wizard con soporte de formato rico. Añade:
- Estado para `format`, `media[]`, `buttons[]`, `embed`
- Reset automático cuando cambia la plataforma del canal
- Validación que exige media subida cuando el formato lo pide
- `FormatSelector` arriba del Step 2 (Contenido)
- `MediaUploader` / `InlineButtonsEditor` / `EmbedEditor` condicionales
  dentro de la Section de contenido
- Payload rico en `createCampaign`

## Prerequisitos

- `client/src/config/postFormats.js` existe (Wave 1)
- `client/src/ui/components/format/FormatEditor.jsx` existe (Wave 3 new/)
- `client/src/services/api.js` tiene `uploadCampaignMedia` (edit 07)

## Paso 1 · Imports

Localiza los imports al principio del fichero. Añade:

```jsx
import {
  FormatSelector, MediaUploader, InlineButtonsEditor, EmbedEditor,
} from '../../../components/format/FormatEditor'
import {
  getFormat as getPostFormat, getPlatformFormats,
} from '../../../../config/postFormats'
```

## Paso 2 · Estado del componente

Localiza el bloque inicial de `useState` en el componente principal:

```jsx
const [content, setContent] = useState('')
const [targetUrl, setTargetUrl] = useState('')
const [selectedDate, setSelectedDate] = useState(null)
const [linkFormat, setLinkFormat] = useState('domain')
const [linkSlug, setLinkSlug] = useState('')
const [showAdvanced, setShowAdvanced] = useState(false)
```

Sustituye por:

```jsx
const [content, setContent] = useState('')
const [targetUrl, setTargetUrl] = useState('')
const [selectedDate, setSelectedDate] = useState(null)
const [linkFormat, setLinkFormat] = useState('domain')
const [linkSlug, setLinkSlug] = useState('')
const [showAdvanced, setShowAdvanced] = useState(false)

// ── Rich post payload (format + media + buttons + embed) ─────────────────
const [format, setFormat] = useState('text')
const [media, setMedia] = useState([])
const [buttons, setButtons] = useState([])
const [embed, setEmbed] = useState(null)
const channelPlatform = String(channel?.plataforma || '').toLowerCase()
useEffect(() => {
  if (!channelPlatform) return
  const formats = getPlatformFormats(channelPlatform)
  if (!formats.find((f) => f.id === format)) {
    setFormat(formats[0].id)
    setMedia([]); setButtons([]); setEmbed(null)
  }
}, [channelPlatform])
const formatDef = getPostFormat(channelPlatform, format)
const formatNeedsMedia = formatDef?.fields?.includes('media')
const formatNeedsButtons = formatDef?.fields?.includes('buttons')
const formatNeedsEmbed = formatDef?.fields?.includes('embed')
```

## Paso 3 · Validación

Localiza:

```jsx
const isContentValid = content.trim().length >= 30
```

Sustituye por:

```jsx
// Texto >= 30 chars Y, si el formato pide media, toda la media tiene
// que estar subida (sin items en 'uploading' o 'error').
const mediaOk = (() => {
  if (!formatNeedsMedia) return true
  const cfg = formatDef?.media || {}
  if ((cfg.min || 0) > media.length) return false
  if ((cfg.max || Infinity) < media.length) return false
  return media.every((m) => !m._status || m._status === 'uploaded')
})()
const buttonsOk = (() => {
  if (!formatNeedsButtons) return true
  if (buttons.length === 0) return false
  return buttons.every((b) => b.label?.trim() && /^https?:\/\//.test(b.url || ''))
})()
const isContentValid = content.trim().length >= 30 && mediaOk && buttonsOk
```

## Paso 4 · Payload de createCampaign

Localiza:

```jsx
const res = await apiService.createCampaign({
  channel: channel.id || channel._id,
  content: content.trim(),
  targetUrl: targetUrl.trim(),
  deadline: selectedDate.date,
  publishDate: selectedDate.date,
  trackingLinkFormat: linkFormat,
  trackingLinkSlug: linkFormat === 'custom' ? linkSlug : undefined,
})
```

Sustituye por:

```jsx
const res = await apiService.createCampaign({
  channel: channel.id || channel._id,
  content: content.trim(),
  targetUrl: targetUrl.trim(),
  deadline: selectedDate.date,
  publishDate: selectedDate.date,
  trackingLinkFormat: linkFormat,
  trackingLinkSlug: linkFormat === 'custom' ? linkSlug : undefined,
  // Payload rico — el backend persiste y el dispatcher entrega a cada API
  format,
  media: media
    .filter((m) => !m._status || m._status === 'uploaded')
    .map((m) => ({ type: m.type, url: m.url, caption: m.caption || '' })),
  buttons,
  embed,
})
```

## Paso 5 · UI en el Step 2 (Contenido)

Localiza la `<style>` con `@keyframes sectionReveal` justo antes del primer
`<Section>` de Step 2.

Justo **después de la `<style>`** (antes del `<Section sectionRef={contentRef}...`)
inserta:

```jsx
{/* Format selector arriba de las Sections */}
<div style={{
  padding: 14, borderRadius: 14,
  background: 'var(--bg)', border: '1px solid var(--border)',
}}>
  <FormatSelector platform={channelPlatform} value={format} onChange={setFormat} />
</div>
```

Después dentro de la Section de contenido, **justo después** del
`<CopyAnalyzerCompact />` (o inmediatamente antes), añade los editores
condicionales:

```jsx
{formatNeedsMedia && (
  <div style={{ marginTop: 14 }}>
    <MediaUploader format={formatDef} value={media} onChange={setMedia} />
  </div>
)}
{formatNeedsButtons && (
  <div style={{ marginTop: 14 }}>
    <InlineButtonsEditor format={formatDef} value={buttons} onChange={setButtons} />
  </div>
)}
{formatNeedsEmbed && (
  <div style={{ marginTop: 14 }}>
    <EmbedEditor value={embed} onChange={setEmbed} />
  </div>
)}
```

## Verificación

1. Selecciona un canal Telegram → el FormatSelector muestra 5 opciones
2. Click en "Imagen + botones" → aparecen MediaUploader + InlineButtonsEditor
3. Sin media subida, el botón "Siguiente" queda deshabilitado
4. Sube una imagen → la barra de progreso púrpura aparece y al terminar
   el item queda en estado `uploaded`
5. Crear campaña → en la BD ves `campaign.media[0].url` apuntando a R2
