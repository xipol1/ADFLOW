import React, { useState, useEffect, useMemo } from 'react'
import {
  Sparkles, Copy, Check, Plus, Edit3, Trash2, Search,
  FileText, Hash, Link2, Image as ImgIcon, MessageSquare,
  Wand2, Save, Star, BookmarkCheck, Download, Upload as ImportIcon, X,
} from 'lucide-react'
import { FONT_BODY as F, FONT_DISPLAY as D, GREEN, greenAlpha, OK, BLUE, WARN } from '../../../theme/tokens'
import { useConfirm } from '../shared/DashComponents'

const ACCENT = GREEN
const ga = greenAlpha
const TEMPLATES_KEY = 'channelad-creator-templates-v1'
const DRAFTS_KEY = 'channelad-creator-drafts-v1'

function exportTemplates(templates) {
  const payload = templates.map(({ id, ...rest }) => rest)
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `channelad-templates-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(link.href)
}

const ghostBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  background: 'var(--surface)', color: 'var(--muted)',
  border: '1px solid var(--border)', borderRadius: 8,
  padding: '7px 12px', fontSize: 12, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
}

const DEFAULT_TEMPLATES = [
  { id: 't1', category: 'hook', title: 'Hook curiosidad', text: '🚨 {brand} acaba de lanzar algo que no esperabas. Si te dedicas a {sector}, esto te interesa.' },
  { id: 't2', category: 'hook', title: 'Hook problema', text: '¿Cansado de {pain_point}? Después de probar {brand} durante {timeframe}, te cuento mi experiencia honesta.' },
  { id: 't3', category: 'hook', title: 'Hook estadística', text: 'El {percent}% de {audience} tiene este problema. {brand} lo resuelve con {solution}.' },
  { id: 't4', category: 'cta',  title: 'CTA suave',     text: 'Si te ha resonado, échale un vistazo aquí: {link}\n\nUsa el código {code} para tener {discount}.' },
  { id: 't5', category: 'cta',  title: 'CTA urgente',   text: '🔥 Solo durante {duration}: {discount} con el código {code}\n\n→ {link}\n\nNo es para siempre.' },
  { id: 't6', category: 'reply',title: 'Aceptar oferta', text: 'Hola, gracias por la propuesta. La acepto y publico en las próximas {hours}h. Te confirmo cuando esté arriba.' },
  { id: 't7', category: 'reply',title: 'Rechazar cordial',text: 'Hola, gracias por pensar en mí. Por temas de calendario / encaje no encajamos en esta ocasión. Para otra vez será.' },
  { id: 't8', category: 'reply',title: 'Pedir más info', text: 'Hola, antes de aceptar necesito un poco más de contexto: {questions}.' },
  { id: 't9', category: 'post', title: 'Reseña honesta',  text: 'Llevo {time} usando {brand} y aquí va mi opinión sin filtros:\n\n✅ Lo bueno:\n- {pro1}\n- {pro2}\n\n⚠ Lo mejorable:\n- {con1}\n\nPara qué tipo de usuario lo recomiendo: {audience}.\n\nLink: {link}' },
  { id: 't10', category: 'post',title: 'Caso de uso',     text: 'Hoy os enseño cómo {action} con {brand}.\n\n1. {step1}\n2. {step2}\n3. {step3}\n\nResultado: {outcome}.\n\nQuieres probarlo? {link}' },
]

const CATEGORIES = [
  { id: 'all',   label: 'Todos',     icon: FileText },
  { id: 'hook',  label: 'Hooks',     icon: Sparkles },
  { id: 'cta',   label: 'CTAs',      icon: Link2 },
  { id: 'post',  label: 'Posts',     icon: MessageSquare },
  { id: 'reply', label: 'Respuestas', icon: MessageSquare },
]

/**
 * CreatorContentStudioPage — Templates + drafts + AI-assist (placeholder).
 *
 * 10 templates por defecto agrupados en hook/cta/post/reply. El creator
 * puede crear los suyos, editarlos y guardarlos. Drafts personales en
 * localStorage. Sección AI-assist marcada como BETA — pide a un endpoint
 * que (cuando exista) generará variaciones con Claude API.
 */
export default function CreatorContentStudioPage() {
  const [view, setView] = useState('templates') // 'templates' | 'drafts' | 'ai'
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [templates, setTemplates] = useState(() => loadJSON(TEMPLATES_KEY, DEFAULT_TEMPLATES))
  const [drafts, setDrafts] = useState(() => loadJSON(DRAFTS_KEY, []))
  const [editing, setEditing] = useState(null)
  const [copyId, setCopyId] = useState(null)
  const { confirm, dialog: confirmDialog } = useConfirm()

  const filtered = useMemo(() => {
    let list = templates
    if (filter !== 'all') list = list.filter(t => t.category === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(t => t.title.toLowerCase().includes(q) || t.text.toLowerCase().includes(q))
    }
    return list
  }, [templates, filter, search])

  const copy = (text, id) => {
    try {
      navigator.clipboard.writeText(text)
      setCopyId(id)
      setTimeout(() => setCopyId(null), 1500)
    } catch {}
  }

  const saveTemplate = (t) => {
    const next = t.id ? templates.map(x => x.id === t.id ? t : x) : [...templates, { ...t, id: `t-${Date.now()}` }]
    setTemplates(next); saveJSON(TEMPLATES_KEY, next); setEditing(null)
  }
  const removeTemplate = async (id) => {
    const ok = await confirm({
      title: 'Eliminar template',
      message: '¿Eliminar este template? No se puede deshacer.',
      confirmLabel: 'Eliminar',
      tone: 'danger',
    })
    if (!ok) return
    const next = templates.filter(t => t.id !== id)
    setTemplates(next); saveJSON(TEMPLATES_KEY, next)
  }

  const addDraft = () => {
    const next = [{ id: `d-${Date.now()}`, title: 'Nueva idea', text: '', tags: [], updatedAt: Date.now() }, ...drafts]
    setDrafts(next); saveJSON(DRAFTS_KEY, next)
  }
  const updateDraft = (id, patch) => {
    const next = drafts.map(d => d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d)
    setDrafts(next); saveJSON(DRAFTS_KEY, next)
  }
  const removeDraft = (id) => {
    const next = drafts.filter(d => d.id !== id)
    setDrafts(next); saveJSON(DRAFTS_KEY, next)
  }

  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1100 }}>
      {confirmDialog}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontFamily: D, fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', margin: 0 }}>
              Content Studio
            </h1>
          </div>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
            Templates, drafts y asistente IA para escribir más rápido y mejor.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 2, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
          {[
            { id: 'templates', label: 'Templates', icon: FileText },
            { id: 'drafts',    label: 'Drafts',    icon: Edit3, count: drafts.length },
            { id: 'ai',        label: 'IA Assist', icon: Wand2 },
          ].map(v => {
            const Icon = v.icon
            const active = view === v.id
            return (
              <button key={v.id} onClick={() => setView(v.id)} style={{
                background: active ? ACCENT : 'transparent',
                color: active ? '#fff' : 'var(--muted)',
                border: 'none', borderRadius: 8, padding: '7px 13px',
                fontSize: 12.5, fontWeight: active ? 700 : 500,
                cursor: 'pointer', fontFamily: F, transition: 'all .15s',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                <Icon size={12} /> {v.label}
                {v.count > 0 && <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 10, padding: '0 5px', fontSize: 10 }}>{v.count}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {view === 'templates' && (
        <>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={13} color="var(--muted)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar template…"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '8px 12px 8px 32px', fontSize: 13, fontFamily: F, outline: 'none',
                }} />
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {CATEGORIES.map(c => {
                const Icon = c.icon
                const active = filter === c.id
                return (
                  <button key={c.id} onClick={() => setFilter(c.id)} style={{
                    background: active ? ga(0.12) : 'var(--surface)',
                    color: active ? ACCENT : 'var(--muted)',
                    border: `1px solid ${active ? ga(0.3) : 'var(--border)'}`,
                    borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: active ? 700 : 500,
                    cursor: 'pointer', fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}>
                    <Icon size={11} /> {c.label}
                  </button>
                )
              })}
            </div>
            <button onClick={() => setEditing({ category: filter === 'all' ? 'post' : filter, title: '', text: '' })} style={primaryBtn}>
              <Plus size={13} /> Nuevo template
            </button>
            <button
              type="button"
              onClick={() => exportTemplates(templates)}
              title="Exportar todos los templates a JSON"
              style={ghostBtn}
            >
              <Download size={12} /> Exportar
            </button>
            <label style={{ ...ghostBtn, cursor: 'pointer' }}>
              <ImportIcon size={12} /> Importar
              <input
                type="file"
                accept="application/json,.json"
                onChange={async e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  try {
                    const txt = await file.text()
                    const parsed = JSON.parse(txt)
                    if (!Array.isArray(parsed)) throw new Error('JSON inválido')
                    const incoming = parsed
                      .filter(t => t && typeof t === 'object' && t.title && t.text)
                      .map(t => ({
                        id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                        category: t.category || 'post',
                        title: String(t.title).slice(0, 120),
                        text: String(t.text).slice(0, 5000),
                      }))
                    if (incoming.length === 0) {
                      alert('El archivo no contiene templates válidos.')
                      return
                    }
                    const next = [...templates, ...incoming]
                    setTemplates(next)
                    saveJSON(TEMPLATES_KEY, next)
                    alert(`Importados ${incoming.length} templates.`)
                  } catch {
                    alert('No se pudo leer el archivo. Asegúrate de que sea un JSON exportado desde Channelad.')
                  }
                  e.target.value = ''
                }}
                style={{ display: 'none' }}
                aria-label="Seleccionar archivo JSON de templates"
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {filtered.map(t => (
              <TemplateCard key={t.id} t={t} onCopy={() => copy(t.text, t.id)} copied={copyId === t.id}
                onEdit={() => setEditing(t)} onRemove={() => removeTemplate(t.id)} />
            ))}
          </div>
        </>
      )}

      {view === 'drafts' && (
        <DraftsView drafts={drafts} onAdd={addDraft} onUpdate={updateDraft} onRemove={removeDraft} />
      )}

      {view === 'ai' && <AIAssist onSaveDraft={(text) => { addDraft(); updateDraft(drafts[0]?.id, { text }) }} />}

      {editing && <TemplateEditor template={editing} onSave={saveTemplate} onClose={() => setEditing(null)} />}
    </div>
  )
}

function TemplateCard({ t, onCopy, copied, onEdit, onRemove }) {
  const cat = CATEGORIES.find(c => c.id === t.category)
  const Icon = cat?.icon || FileText
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
      padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: ga(0.12), border: `1px solid ${ga(0.25)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={13} color={ACCENT} strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t.title}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
            {cat?.label}
          </div>
        </div>
      </div>
      <div style={{
        background: 'var(--bg2)', borderRadius: 8, padding: 10,
        fontSize: 12, color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap',
        maxHeight: 110, overflow: 'hidden', position: 'relative',
      }}>
        {t.text}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, background: 'linear-gradient(transparent, var(--bg2))', pointerEvents: 'none' }} />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onCopy} style={{
          flex: 1, background: copied ? `${OK}15` : ga(0.1),
          color: copied ? OK : ACCENT, border: `1px solid ${copied ? OK : ga(0.3)}`,
          borderRadius: 8, padding: '7px 10px', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', fontFamily: F, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        }}>
          {copied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
        </button>
        <button onClick={onEdit} title="Editar" style={iconBtn}><Edit3 size={12} /></button>
        {!t.id?.startsWith('t') || Number(t.id?.replace('t', '')) > 10 ? (
          <button onClick={onRemove} title="Eliminar" style={{ ...iconBtn, color: ERR_COLOR }}><Trash2 size={12} /></button>
        ) : null}
      </div>
    </div>
  )
}

function DraftsView({ drafts, onAdd, onUpdate, onRemove }) {
  const [selected, setSelected] = useState(drafts[0]?.id || null)
  const current = drafts.find(d => d.id === selected) || drafts[0]

  return (
    <div className="ccs-drafts-shell" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 14, minHeight: 500 }}>
      <style>{`
        @media (max-width: 720px) {
          .ccs-drafts-shell { grid-template-columns: 1fr !important; min-height: auto !important; }
          .ccs-drafts-list { max-height: 240px; }
        }
      `}</style>
      <div className="ccs-drafts-list" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
          <button onClick={onAdd} style={{ ...primaryBtn, width: '100%', justifyContent: 'center' }}>
            <Plus size={13} /> Nuevo draft
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {drafts.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
              No tienes drafts aún. Crea uno para empezar.
            </div>
          ) : drafts.map(d => (
            <button key={d.id} onClick={() => setSelected(d.id)} style={{
              width: '100%', textAlign: 'left',
              background: current?.id === d.id ? ga(0.08) : 'transparent',
              border: 'none', borderBottom: '1px solid var(--border)',
              borderLeft: `3px solid ${current?.id === d.id ? ACCENT : 'transparent'}`,
              padding: '10px 13px', cursor: 'pointer', fontFamily: F,
              display: 'flex', flexDirection: 'column', gap: 2,
            }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.title || 'Sin título'}
              </span>
              <span style={{ fontSize: 10.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.text?.slice(0, 50) || 'Vacío'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column' }}>
        {!current ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: 'var(--muted)' }}>
            <Edit3 size={32} color="var(--muted2)" />
            <div style={{ fontSize: 13 }}>Selecciona o crea un draft</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <input value={current.title} onChange={e => onUpdate(current.id, { title: e.target.value })}
                placeholder="Título"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontFamily: D, fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em',
                }} />
              <button onClick={() => onRemove(current.id)} title="Eliminar" style={{ ...iconBtn, color: ERR_COLOR }}>
                <Trash2 size={13} />
              </button>
            </div>
            <textarea value={current.text} onChange={e => onUpdate(current.id, { text: e.target.value })}
              placeholder="Empieza a escribir tu post…"
              style={{
                flex: 1, background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)',
                borderRadius: 9, padding: 14, fontSize: 13, fontFamily: F, lineHeight: 1.6,
                outline: 'none', resize: 'none', minHeight: 300,
              }} />
            {/* Tags editor */}
            <DraftTagsEditor tags={current.tags || []} onChange={tags => onUpdate(current.id, { tags })} />

            {/* Char limits per platform */}
            <PlatformLimits text={current.text} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 11, color: 'var(--muted)' }}>
              <span>{current.text.length} caracteres · ~{Math.ceil(current.text.length / 5)} palabras</span>
              <button onClick={() => navigator.clipboard.writeText(current.text)} style={{
                background: ga(0.1), color: ACCENT, border: `1px solid ${ga(0.3)}`,
                borderRadius: 7, padding: '5px 11px', fontSize: 11, fontWeight: 700,
                cursor: 'pointer', fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
                <Copy size={11} /> Copiar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Tags editor for drafts ──────────────────────────────────────────────────
function DraftTagsEditor({ tags, onChange }) {
  const [input, setInput] = useState('')
  const addTag = (raw) => {
    const t = String(raw || '').trim().toLowerCase().replace(/[^a-z0-9-_áéíóúñ\s]/gi, '')
    if (!t || tags.includes(t)) return
    onChange([...tags, t])
    setInput('')
  }
  return (
    <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
      {tags.map(t => (
        <span key={t} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: ga(0.1), color: ACCENT, border: `1px solid ${ga(0.3)}`,
          borderRadius: 999, padding: '3px 4px 3px 9px', fontSize: 11, fontWeight: 600,
        }}>
          #{t}
          <button onClick={() => onChange(tags.filter(x => x !== t))} aria-label={`Quitar etiqueta ${t}`}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: ACCENT, padding: 0, lineHeight: 0, display: 'flex' }}>
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input) }
          if (e.key === 'Backspace' && !input && tags.length > 0) onChange(tags.slice(0, -1))
        }}
        placeholder={tags.length === 0 ? 'Añadir etiqueta…' : '+'}
        aria-label="Añadir etiqueta"
        style={{
          background: 'transparent', border: 'none', outline: 'none',
          fontSize: 11.5, fontFamily: F, color: 'var(--text)', padding: '4px 6px', minWidth: 100,
        }}
      />
    </div>
  )
}

// ─── Platform character limits ──────────────────────────────────────────────
const PLATFORM_LIMITS = [
  { id: 'telegram',  name: 'Telegram',  max: 4096 },
  { id: 'whatsapp',  name: 'WhatsApp',  max: 4096 },
  { id: 'discord',   name: 'Discord',   max: 2000 },
  { id: 'twitter',   name: 'X / Twitter', max: 280 },
  { id: 'instagram', name: 'Instagram', max: 2200 },
  { id: 'linkedin',  name: 'LinkedIn',  max: 3000 },
]
function PlatformLimits({ text }) {
  const len = (text || '').length
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 6,
      marginTop: 10, padding: 10, background: 'var(--bg2)', borderRadius: 9,
    }}>
      {PLATFORM_LIMITS.map(p => {
        const pct = Math.min(100, Math.round((len / p.max) * 100))
        const over = len > p.max
        const color = over ? ERR_COLOR : pct > 80 ? '#f59e0b' : OK
        return (
          <div key={p.id} title={`${len} de ${p.max} caracteres`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, marginBottom: 3 }}>
              <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{p.name}</span>
              <span style={{ color, fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                {over ? `+${len - p.max}` : `${p.max - len}`}
              </span>
            </div>
            <div style={{ height: 3, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: color, transition: 'width .2s, background .2s' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AIAssist({ onSaveDraft }) {
  const [prompt, setPrompt] = useState('')
  const [tone, setTone] = useState('casual')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState('')

  const generate = async () => {
    if (!prompt.trim()) return
    setGenerating(true)
    setResult('')
    // Simula latencia + respuesta hasta tener endpoint con Claude
    await new Promise(r => setTimeout(r, 1200))
    const samples = [
      `🚀 Acabo de probar ${prompt} y aquí va mi opinión sin filtros.\n\nLo bueno:\n- Setup de menos de 5 minutos\n- Curva de aprendizaje suave\n- Soporte responde rápido\n\nLo mejorable:\n- Precio podría bajar para early-stage\n- Faltan integraciones con [tu stack]\n\nSi te dedicas a [tu nicho], merece la pena la prueba gratis: {link}`,
      `Llevo ${'2 semanas'} usando ${prompt} y os comparto qué he aprendido:\n\n1. Por qué lo elegí: [motivo]\n2. Lo que más me ha sorprendido: [detalle]\n3. Lo que cambiaría: [crítica honesta]\n\nMi recomendación: si {audiencia objetivo}, dale una oportunidad. Para todo lo demás, hay alternativas mejores.\n\n→ {link}`,
    ]
    setResult(samples[Math.floor(Math.random() * samples.length)])
    setGenerating(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        background: ga(0.06), border: `1px solid ${ga(0.3)}`, borderRadius: 12,
        padding: 14, display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: ga(0.15), border: `1px solid ${ga(0.3)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Wand2 size={18} color={ACCENT} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            IA Assistant
            <span style={{ background: ga(0.15), color: ACCENT, border: `1px solid ${ga(0.3)}`, borderRadius: 20, padding: '1px 7px', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.04em' }}>BETA</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3, lineHeight: 1.5 }}>
            Describe el producto/marca y genera variaciones de post en segundos. Próximamente con datos reales de tu audiencia.
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
          Producto o marca a promocionar
        </label>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
          placeholder="Ej: Notion AI — herramienta de productividad con IA para tomar notas y escribir docs"
          rows={3}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)',
            borderRadius: 8, padding: 11, fontSize: 13, fontFamily: F, outline: 'none', resize: 'vertical',
          }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Tono:</label>
          {['casual', 'profesional', 'enérgico', 'analítico', 'storytelling'].map(t => (
            <button key={t} onClick={() => setTone(t)} style={{
              background: tone === t ? ga(0.12) : 'var(--bg2)',
              color: tone === t ? ACCENT : 'var(--muted)',
              border: `1px solid ${tone === t ? ga(0.3) : 'var(--border)'}`,
              borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: tone === t ? 700 : 500,
              cursor: 'pointer', fontFamily: F, textTransform: 'capitalize',
            }}>{t}</button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={generate} disabled={!prompt.trim() || generating} style={{
            ...primaryBtn,
            opacity: (!prompt.trim() || generating) ? 0.5 : 1,
            cursor: (!prompt.trim() || generating) ? 'not-allowed' : 'pointer',
          }}>
            <Sparkles size={13} /> {generating ? 'Generando…' : 'Generar'}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ background: 'var(--surface)', border: `1px solid ${ga(0.25)}`, borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={12} /> Variación generada
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => navigator.clipboard.writeText(result)} style={iconBtn}>
                <Copy size={12} /> Copiar
              </button>
              <button onClick={() => onSaveDraft(result)} style={primaryBtn}>
                <Save size={12} /> Guardar como draft
              </button>
            </div>
          </div>
          <div style={{
            background: 'var(--bg2)', borderRadius: 9, padding: 14,
            fontSize: 13, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap',
          }}>
            {result}
          </div>
        </div>
      )}
    </div>
  )
}

function TemplateEditor({ template, onSave, onClose }) {
  const [t, setT] = useState(template)
  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: F,
    }}>
      <div style={{
        width: 520, maxWidth: '100%', background: 'var(--bg)',
        border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden',
        display: 'flex', flexDirection: 'column', maxHeight: '90vh',
      }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontFamily: D, fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
            {t.id ? 'Editar template' : 'Nuevo template'}
          </h3>
          <button onClick={onClose} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--muted)' }}>×</button>
        </div>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={lbl}>Categoría</label>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                <button key={c.id} onClick={() => setT({ ...t, category: c.id })} style={{
                  background: t.category === c.id ? ga(0.12) : 'var(--bg2)',
                  color: t.category === c.id ? ACCENT : 'var(--muted)',
                  border: `1px solid ${t.category === c.id ? ga(0.3) : 'var(--border)'}`,
                  borderRadius: 7, padding: '5px 11px', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: F,
                }}>{c.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={lbl}>Título</label>
            <input value={t.title} onChange={e => setT({ ...t, title: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={lbl}>Texto · usa {`{variables}`} para placeholders</label>
            <textarea value={t.text} onChange={e => setT({ ...t, text: e.target.value })}
              rows={8} style={{ ...inputStyle, resize: 'vertical', fontFamily: F, lineHeight: 1.5 }} />
          </div>
        </div>
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: F }}>
            Cancelar
          </button>
          <button onClick={() => onSave(t)} disabled={!t.title || !t.text} style={{
            ...primaryBtn,
            opacity: (!t.title || !t.text) ? 0.5 : 1,
            cursor: (!t.title || !t.text) ? 'not-allowed' : 'pointer',
          }}>
            <Save size={12} /> Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

const ERR_COLOR = '#ef4444'
const lbl = { fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }
const inputStyle = {
  background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: F, outline: 'none',
  width: '100%', boxSizing: 'border-box',
}
const primaryBtn = {
  background: ACCENT, color: '#fff', border: 'none', borderRadius: 8,
  padding: '8px 13px', fontSize: 12.5, fontWeight: 700,
  cursor: 'pointer', fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 5,
  boxShadow: `0 4px 14px ${ga(0.35)}`,
}
const iconBtn = {
  background: 'var(--bg2)', color: 'var(--muted)', border: '1px solid var(--border)',
  borderRadius: 7, padding: '6px 9px', fontSize: 11, fontFamily: F, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 4,
}

function loadJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
function saveJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} }
