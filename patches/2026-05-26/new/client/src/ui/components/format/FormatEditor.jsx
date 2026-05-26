import React, { useMemo, useRef, useState } from 'react'
import {
  X, Plus, Upload, Image as ImageIcon, Film, FileText, Sparkles,
  Bold, Italic, Strikethrough, Code, Link as LinkIcon, AlertCircle,
} from 'lucide-react'
import {
  FONT_BODY, FONT_DISPLAY, PURPLE, purpleAlpha, PLATFORM_BRAND, EASE,
} from '../../theme/tokens'
import {
  getPlatformFormats, getPlatformAddOns, getFormat,
} from '../../../config/postFormats'
import apiService from '../../../services/api'

/* ─── FormatSelector ────────────────────────────────────────────────────── */

export function FormatSelector({ platform, value, onChange }) {
  const formats = useMemo(() => getPlatformFormats(platform), [platform])
  return (
    <div>
      <div style={labelRow}>
        <span style={overlineStyle}>Formato de publicación</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          {formats.length} opciones para {PLATFORM_BRAND[platform]?.label || 'esta plataforma'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        {formats.map((f) => {
          const Icon = f.icon
          const selected = value === f.id
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onChange(f.id)}
              style={{
                textAlign: 'left',
                background: selected ? purpleAlpha(0.08) : 'var(--surface)',
                border: `1.5px solid ${selected ? PURPLE : 'var(--border)'}`,
                borderRadius: 12,
                padding: '12px 12px 10px',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: 6,
                transition: `all .15s ${EASE}`,
                boxShadow: selected ? `0 0 0 3px ${purpleAlpha(0.12)}` : 'none',
                fontFamily: FONT_BODY,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: selected ? PURPLE : purpleAlpha(0.1),
                  color: selected ? '#fff' : PURPLE,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {Icon && <Icon size={15} strokeWidth={2} />}
                </div>
                <span style={multiplierBadge(f.multiplier)}>×{f.multiplier}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{f.label}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>{f.desc}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const multiplierBadge = (m) => {
  const isPremium = m > 1.5
  const isSaver = m < 1
  return {
    fontFamily: FONT_DISPLAY,
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 999,
    background: isPremium ? 'rgba(245,158,11,0.12)' : isSaver ? 'rgba(16,185,129,0.12)' : 'var(--bg)',
    color: isPremium ? '#f59e0b' : isSaver ? '#10b981' : 'var(--muted)',
    border: `1px solid ${isPremium ? 'rgba(245,158,11,0.25)' : isSaver ? 'rgba(16,185,129,0.25)' : 'var(--border)'}`,
  }
}

/* ─── AddOnSelector ─────────────────────────────────────────────────────── */

export function AddOnSelector({ platform, value, onChange }) {
  const addOns = useMemo(() => getPlatformAddOns(platform), [platform])
  if (addOns.length === 0) return null
  const toggle = (id) => {
    const next = value.includes(id) ? value.filter((x) => x !== id) : [...value, id]
    onChange(next)
  }
  return (
    <div>
      <span style={overlineStyle}>Extras (opcional)</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
        {addOns.map((a) => {
          const Icon = a.icon
          const selected = value.includes(a.id)
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => toggle(a.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: selected ? purpleAlpha(0.1) : 'var(--surface)',
                border: `1.5px solid ${selected ? PURPLE : 'var(--border)'}`,
                color: selected ? PURPLE : 'var(--text)',
                borderRadius: 999, padding: '6px 12px',
                cursor: 'pointer', fontFamily: FONT_BODY,
                fontSize: 12, fontWeight: 600,
                transition: `all .15s ${EASE}`,
              }}
            >
              {Icon && <Icon size={12} />}
              {a.label}
              <span style={{ fontSize: 10, color: selected ? PURPLE : 'var(--muted)' }}>+{Math.round(a.bonus * 100)}%</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── PlatformToolbar ──────────────────────────────────────────────────── */

const PLATFORM_TOOLBARS = {
  telegram: [
    { id: 'bold',   icon: Bold,            wrap: ['**', '**'] },
    { id: 'italic', icon: Italic,          wrap: ['__', '__'] },
    { id: 'strike', icon: Strikethrough,   wrap: ['~~', '~~'] },
    { id: 'code',   icon: Code,            wrap: ['`', '`'] },
  ],
  whatsapp: [
    { id: 'bold',   icon: Bold,            wrap: ['*', '*'] },
    { id: 'italic', icon: Italic,          wrap: ['_', '_'] },
    { id: 'strike', icon: Strikethrough,   wrap: ['~', '~'] },
    { id: 'code',   icon: Code,            wrap: ['```', '```'] },
  ],
  discord: [
    { id: 'bold',   icon: Bold,            wrap: ['**', '**'] },
    { id: 'italic', icon: Italic,          wrap: ['*', '*'] },
    { id: 'strike', icon: Strikethrough,   wrap: ['~~', '~~'] },
    { id: 'code',   icon: Code,            wrap: ['`', '`'] },
  ],
}

export function PlatformToolbar({ platform, textareaRef, value, onChange }) {
  const tools = PLATFORM_TOOLBARS[String(platform || '').toLowerCase()]
  if (!tools) return null

  const apply = (wrap) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const before = value.slice(0, start)
    const sel = value.slice(start, end) || 'texto'
    const after = value.slice(end)
    onChange(`${before}${wrap[0]}${sel}${wrap[1]}${after}`)
    requestAnimationFrame(() => {
      ta.focus()
      const newPos = start + wrap[0].length + sel.length + wrap[1].length
      ta.setSelectionRange(newPos, newPos)
    })
  }

  return (
    <div style={{
      display: 'flex', gap: 4,
      padding: '4px 6px',
      background: 'var(--bg)', border: '1px solid var(--border)',
      borderRadius: 10, borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
      borderBottom: 'none',
    }}>
      {tools.map((t) => {
        const Icon = t.icon
        return (
          <button key={t.id} type="button" onClick={() => apply(t.wrap)}
            style={toolBtn} title={t.id}>
            <Icon size={14} />
          </button>
        )
      })}
    </div>
  )
}

const toolBtn = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, borderRadius: 6,
  background: 'transparent', border: 'none',
  color: 'var(--muted)', cursor: 'pointer',
  transition: `background .12s ${EASE}`,
}

/* ─── MediaUploader ─────────────────────────────────────────────────────── */

export function MediaUploader({ format, value = [], onChange }) {
  const cfg = format.media || {}
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [progressByKey, setProgressByKey] = useState({})
  const [errorByKey, setErrorByKey] = useState({})

  const accept = useMemo(() => {
    const map = { image: 'image/*', video: 'video/*', document: '.pdf,.doc,.docx,.ppt,.pptx' }
    return (cfg.types || []).map((t) => map[t]).join(',')
  }, [cfg.types])

  const inferType = (file) =>
    file.type.startsWith('image/') ? 'image' :
    file.type.startsWith('video/') ? 'video' :
    'document'

  const handleFiles = async (files) => {
    const fileArr = Array.from(files || []).slice(0, (cfg.max || 1) - value.length)
    if (fileArr.length === 0) return

    // Optimistic add con blob URLs
    const optimistic = fileArr.map((file) => {
      const key = `up_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      return {
        type: inferType(file),
        url: URL.createObjectURL(file),
        caption: '',
        _localName: file.name,
        _localSize: file.size,
        _file: file,
        _key: key,
        _status: 'uploading',
      }
    })
    const baseValue = [...value, ...optimistic]
    onChange(baseValue)

    // Patch helper que respeta race conditions con functional setter
    const patch = (key, mut) => onChange((curr) => (curr || []).map((m) => (m._key === key ? mut(m) : m)))

    await Promise.all(optimistic.map(async (item) => {
      try {
        const res = await apiService.uploadCampaignMedia(item._file, (loaded, total) => {
          setProgressByKey((p) => ({ ...p, [item._key]: total > 0 ? loaded / total : 0 }))
        })
        if (!res?.success) {
          throw Object.assign(new Error(res?.message || 'Upload failed'), { code: res?.code })
        }
        patch(item._key, (m) => {
          if (m.url?.startsWith('blob:')) URL.revokeObjectURL(m.url)
          return {
            ...m,
            url: res.data.url,
            _status: 'uploaded',
            _remoteKey: res.data.key,
            _mime: res.data.mime,
          }
        })
        setProgressByKey((p) => { const { [item._key]: _, ...rest } = p; return rest })
      } catch (err) {
        setErrorByKey((e) => ({ ...e, [item._key]: err?.message || 'Error al subir' }))
        patch(item._key, (m) => ({ ...m, _status: 'error' }))
      }
    }))
  }

  const remove = (i) => {
    const next = value.slice()
    const removed = next.splice(i, 1)[0]
    if (removed?.url?.startsWith('blob:')) URL.revokeObjectURL(removed.url)
    if (removed?._key) {
      setProgressByKey((p) => { const { [removed._key]: _, ...rest } = p; return rest })
      setErrorByKey((e) => { const { [removed._key]: _, ...rest } = e; return rest })
    }
    onChange(next)
  }

  const canAdd = value.length < (cfg.max || 1)
  const needsMin = (cfg.min || 0) > value.length

  return (
    <div>
      <div style={labelRow}>
        <span style={labelStyle}>
          {cfg.types?.[0] === 'video' ? 'Video' : cfg.types?.[0] === 'document' ? 'Documento' : 'Imagen' + ((cfg.max || 1) > 1 ? 'es' : '')}
        </span>
        <span style={{ fontSize: 11, color: needsMin ? '#ef4444' : 'var(--muted)' }}>
          {value.length}/{cfg.max || 1}{cfg.min ? ` (mín. ${cfg.min})` : ''}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10, marginTop: 8 }}>
        {value.map((m, i) => {
          const uploading = m._status === 'uploading'
          const errored = m._status === 'error'
          const progress = progressByKey[m._key]
          const err = errorByKey[m._key]
          return (
            <div key={m._key || i} style={{
              position: 'relative',
              aspectRatio: '1',
              borderRadius: 12,
              overflow: 'hidden',
              background: 'var(--bg)',
              border: `1px solid ${errored ? '#ef4444' : 'var(--border)'}`,
            }}>
              {m.type === 'image' ? (
                <img src={m.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: uploading ? 0.6 : 1, transition: 'opacity .2s' }} />
              ) : m.type === 'video' ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff', opacity: uploading ? 0.6 : 1 }}>
                  <Film size={28} />
                </div>
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8, opacity: uploading ? 0.6 : 1 }}>
                  <FileText size={28} style={{ color: PURPLE }} />
                  <span style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                    {m._localName || 'doc'}
                  </span>
                </div>
              )}

              {uploading && (
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, background: 'rgba(0,0,0,0.25)' }}>
                  <div style={{ height: '100%', width: `${Math.round((progress || 0) * 100)}%`, background: PURPLE, transition: 'width .2s linear' }} />
                </div>
              )}

              {errored && (
                <div title={err || 'Error al subir'} style={{
                  position: 'absolute', left: 6, bottom: 6,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: 'rgba(239,68,68,0.92)', color: '#fff',
                  padding: '3px 7px', borderRadius: 999,
                  fontSize: 10, fontWeight: 700, fontFamily: FONT_BODY,
                }}>
                  <AlertCircle size={11} /> Error
                </div>
              )}

              <button
                type="button"
                onClick={() => remove(i)}
                style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.65)', color: '#fff',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={12} />
              </button>
            </div>
          )
        })}
        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              handleFiles(e.dataTransfer.files)
            }}
            style={{
              aspectRatio: '1',
              borderRadius: 12,
              background: dragOver ? purpleAlpha(0.08) : 'var(--bg)',
              border: `2px dashed ${dragOver ? PURPLE : 'var(--border)'}`,
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
              color: 'var(--muted)',
              transition: `all .15s ${EASE}`,
            }}
          >
            <Upload size={20} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>Subir</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={(cfg.max || 1) > 1}
        onChange={(e) => handleFiles(e.target.files)}
        style={{ display: 'none' }}
      />
    </div>
  )
}

/* ─── InlineButtonsEditor (Telegram) ────────────────────────────────────── */

export function InlineButtonsEditor({ format, value = [], onChange }) {
  const max = format?.buttons?.max || 4
  const update = (i, patch) => {
    const next = value.slice()
    next[i] = { ...next[i], ...patch }
    onChange(next)
  }
  const add = () => {
    if (value.length >= max) return
    onChange([...value, { label: '', url: '' }])
  }
  const remove = (i) => {
    const next = value.slice()
    next.splice(i, 1)
    onChange(next)
  }
  return (
    <div>
      <div style={labelRow}>
        <span style={labelStyle}>Botones CTA inline</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{value.length}/{max}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        {value.map((b, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr auto', gap: 8 }}>
            <input
              placeholder="Texto del botón"
              value={b.label} maxLength={64}
              onChange={(e) => update(i, { label: e.target.value })}
              style={inputCompact}
            />
            <input
              placeholder="https://destino.com"
              value={b.url}
              onChange={(e) => update(i, { url: e.target.value })}
              style={inputCompact}
            />
            <button type="button" onClick={() => remove(i)}
              style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 10, width: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>
        ))}
        {value.length < max && (
          <button type="button" onClick={add}
            style={{
              display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 6,
              background: 'transparent', border: `1px dashed ${purpleAlpha(0.4)}`,
              color: PURPLE, padding: '8px 14px', borderRadius: 10,
              fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
            <Plus size={14} /> Añadir botón
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── EmbedEditor (Discord) ─────────────────────────────────────────────── */

const DEFAULT_EMBED = { title: '', description: '', color: '#7C3AED', thumbnail: '', image: '', fields: [] }

export function EmbedEditor({ value, onChange }) {
  const e = value || DEFAULT_EMBED
  const update = (patch) => onChange({ ...e, ...patch })

  return (
    <div>
      <span style={labelStyle}>Embed rico</span>
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10, padding: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, borderLeft: `4px solid ${e.color || PURPLE}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: 8 }}>
          <input placeholder="Título del embed" value={e.title} maxLength={256}
            onChange={(ev) => update({ title: ev.target.value })}
            style={inputCompact} />
          <input type="color" value={e.color || '#7C3AED'}
            onChange={(ev) => update({ color: ev.target.value })}
            style={{ ...inputCompact, padding: 4, cursor: 'pointer', height: 38 }} />
        </div>
        <textarea placeholder="Descripción" value={e.description} maxLength={4000} rows={3}
          onChange={(ev) => update({ description: ev.target.value })}
          style={{ ...inputCompact, resize: 'vertical' }} />
        <input placeholder="URL de thumbnail (opcional)" value={e.thumbnail}
          onChange={(ev) => update({ thumbnail: ev.target.value })}
          style={inputCompact} />
      </div>
    </div>
  )
}

/* ─── Newsletter subject + preheader ───────────────────────────────────── */

export function NewsletterFields({ subject, preheader, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <span style={labelStyle}>Asunto del email</span>
        <input placeholder="Una línea que invite a abrir" value={subject || ''} maxLength={200}
          onChange={(e) => onChange({ subject: e.target.value, preheader })}
          style={{ ...inputCompact, marginTop: 6 }} />
      </div>
      <div>
        <span style={labelStyle}>Preheader (vista previa)</span>
        <input placeholder="Texto corto que aparece en la bandeja" value={preheader || ''} maxLength={200}
          onChange={(e) => onChange({ subject, preheader: e.target.value })}
          style={{ ...inputCompact, marginTop: 6 }} />
      </div>
    </div>
  )
}

/* ─── Shared styles ─────────────────────────────────────────────────────── */

const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)',
  textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: FONT_BODY,
}
const overlineStyle = labelStyle
const labelRow = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }
const inputCompact = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--bg)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '10px 12px', fontSize: 13, color: 'var(--text)',
  fontFamily: FONT_BODY, outline: 'none',
}
