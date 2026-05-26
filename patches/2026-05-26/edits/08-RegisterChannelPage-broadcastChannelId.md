# Edit · `client/src/ui/pages/dashboard/creator/RegisterChannelPage.jsx` · campo Broadcast Channel ID

## Qué hace

Añade un campo de texto condicional (sólo cuando `platform === 'instagram'`)
en el Step 2 (Info) del onboarding de canal. Permite al creador declarar
el ID de su Instagram Broadcast Channel.

## Cómo aplicarlo

### Paso 1 · Estado del form

Localiza:

```jsx
const [form, setForm] = useState({ name: '', url: '', category: 'Tecnologia', desc: '', price: '' })
```

Sustituye por:

```jsx
const [form, setForm] = useState({ name: '', url: '', category: 'Tecnologia', desc: '', price: '', broadcastChannelId: '' })
```

### Paso 2 · Campo condicional en el render

Localiza el bloque de `URL / enlace del canal` en Step 2:

```jsx
<div>
  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
    URL / enlace del canal
  </label>
  <input className="rcp-inp" value={form.url} onChange={e => update('url', e.target.value)}
    placeholder={platform === 'telegram' ? 'https://t.me/tucanal' : platform === 'instagram' ? 'https://instagram.com/tuuser' : 'URL de tu canal'}
    style={inp} />
</div>

<div>
  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>Categoria</label>
```

Sustituye por (sin tocar el `<div>` de URL ni el `<div>` de Categoria,
inserta el bloque condicional **entre los dos**):

```jsx
<div>
  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
    URL / enlace del canal
  </label>
  <input className="rcp-inp" value={form.url} onChange={e => update('url', e.target.value)}
    placeholder={platform === 'telegram' ? 'https://t.me/tucanal' : platform === 'instagram' ? 'https://instagram.com/tuuser' : 'URL de tu canal'}
    style={inp} />
</div>

{platform === 'instagram' && (
  <div style={{ background: AG(0.05), border: `1px solid ${AG(0.18)}`, borderRadius: '12px', padding: '14px' }}>
    <label style={{ fontSize: '12px', fontWeight: 700, color: A, display: 'block', marginBottom: '4px' }}>
      Broadcast Channel ID
      <span style={{ color: 'var(--muted)', fontWeight: 500, marginLeft: 6, fontSize: '11px' }}>(opcional pero recomendado)</span>
    </label>
    <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 8px', lineHeight: 1.4 }}>
      Si tu canal es <strong>unidireccional</strong> (canal de difusión 1-a-muchos), pega aquí su ID o el enlace de invitación. Es el formato premium con mayor CTR.
    </p>
    <input
      className="rcp-inp"
      value={form.broadcastChannelId}
      onChange={e => update('broadcastChannelId', e.target.value)}
      placeholder="https://ig.me/j/AbCd1234... o el ID puro"
      style={inp}
    />
  </div>
)}

<div>
  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>Categoria</label>
```

### Paso 3 · Enviar al backend

Localiza la llamada `apiService.updateChannel(channelId, { ... })` en
`handleSaveInfo`:

```js
const res = await apiService.updateChannel(channelId, {
  nombreCanal: form.name.trim(),
  descripcion: form.desc.trim(),
  categoria: form.category,
  precio: Number(form.price),
  identificadorCanal: form.url.trim() || createdChannel.identificadorCanal,
})
```

Sustituye por:

```js
const res = await apiService.updateChannel(channelId, {
  nombreCanal: form.name.trim(),
  descripcion: form.desc.trim(),
  categoria: form.category,
  precio: Number(form.price),
  identificadorCanal: form.url.trim() || createdChannel.identificadorCanal,
  // Solo se manda si el canal es Instagram y el creador rellenó el campo.
  // El controller lo persiste en identificadores.broadcastChannelId tras
  // limpiar la URL si fuera necesario.
  ...(platform === 'instagram' && form.broadcastChannelId?.trim()
    ? { broadcastChannelId: form.broadcastChannelId.trim() }
    : {}),
})
```

## Verificación

En el navegador, registra un canal Instagram, pega un ID/URL en el campo
nuevo y guarda. Después en MongoDB:

```js
db.canales.findOne({ plataforma: 'instagram' }, { 'identificadores.broadcastChannelId': 1 })
// Esperado: { _id: ..., identificadores: { broadcastChannelId: 'AbCd1234' } }
```
