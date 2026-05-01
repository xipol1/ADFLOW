import React, { useState, useMemo, useRef, useEffect } from 'react'
import { ChevronUp, ChevronDown, Settings2, Check, MessageCircle } from 'lucide-react'
import { FONT_BODY, FONT_DISPLAY, PURPLE, purpleAlpha, OK, WARN, ERR, BLUE } from '../../../theme/tokens'

const STATUS_CFG = {
  DRAFT:      { color: WARN, label: 'Borrador'   },
  PAID:       { color: BLUE, label: 'Pagada'     },
  PUBLISHED:  { color: OK,   label: 'Activa'     },
  COMPLETED:  { color: '#94a3b8', label: 'Completada' },
  CANCELLED:  { color: ERR,  label: 'Cancelada'  },
  EXPIRED:    { color: '#94a3b8', label: 'Expirada' },
  DISPUTED:   { color: ERR,  label: 'Disputa'    },
}

const STORAGE_KEY = 'channelad-campaigns-columns-v1'

// All available columns. The user picks which to show.
// Order in this array = display order.
const ALL_COLUMNS = [
  { key: 'channel',    label: 'Canal',        width: 180, sortable: true,  required: true },
  { key: 'content',    label: 'Contenido',    width: 280, sortable: false },
  { key: 'platform',   label: 'Plataforma',   width: 110, sortable: true },
  { key: 'category',   label: 'Categoría',    width: 130, sortable: true },
  { key: 'price',      label: 'Precio',       width: 90,  sortable: true,  align: 'right' },
  { key: 'views',      label: 'Vistas',       width: 90,  sortable: true,  align: 'right' },
  { key: 'clicks',     label: 'Clicks',       width: 80,  sortable: true,  align: 'right' },
  { key: 'ctr',        label: 'CTR',          width: 70,  sortable: true,  align: 'right' },
  { key: 'cpc',        label: 'CPC',          width: 80,  sortable: true,  align: 'right' },
  { key: 'cpm',        label: 'CPM',          width: 80,  sortable: true,  align: 'right' },
  { key: 'createdAt',  label: 'Creada',       width: 110, sortable: true },
  { key: 'publishedAt',label: 'Publicada',    width: 110, sortable: true },
  { key: 'status',     label: 'Estado',       width: 100, sortable: true },
  { key: 'messages',   label: 'Mensajes',     width: 80,  sortable: true,  align: 'right' },
]

const DEFAULT_VISIBLE = ['channel', 'content', 'price', 'views', 'ctr', 'createdAt', 'status']

function loadVisibleColumns() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_VISIBLE
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr) || arr.length === 0) return DEFAULT_VISIBLE
    // Ensure required columns are always present
    const required = ALL_COLUMNS.filter(c => c.required).map(c => c.key)
    const missing = required.filter(k => !arr.includes(k))
    return missing.length > 0 ? [...missing, ...arr] : arr
  } catch { return DEFAULT_VISIBLE }
}

function saveVisibleColumns(arr) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)) } catch {}
}

function getColumnValue(col, c) {
  switch (col.key) {
    case 'channel':     return c.channel?.nombreCanal || c.channel?.plataforma || 'Canal'
    case 'content':     return (c.content || '').slice(0, 60)
    case 'platform':    return c.channel?.plataforma || '—'
    case 'category':    return c.channel?.categoria || '—'
    case 'price':       return Number(c.price || 0)
    case 'views':       return Number(c.tracking?.impressions || c.views || 0)
    case 'clicks':      return Number(c.tracking?.clicks || c.clicks || 0)
    case 'ctr':       {
      const v = Number(c.tracking?.impressions || c.views || 0)
      const k = Number(c.tracking?.clicks || c.clicks || 0)
      return v > 0 ? (k / v) * 100 : 0
    }
    case 'cpc':       {
      const k = Number(c.tracking?.clicks || c.clicks || 0)
      const p = Number(c.price || 0)
      return k > 0 ? p / k : 0
    }
    case 'cpm':       {
      const v = Number(c.tracking?.impressions || c.views || 0)
      const p = Number(c.price || 0)
      return v > 0 ? (p / v) * 1000 : 0
    }
    case 'createdAt':   return c.createdAt ? new Date(c.createdAt).getTime() : 0
    case 'publishedAt': return c.publishedAt ? new Date(c.publishedAt).getTime() : 0
    case 'status':      return c.status || ''
    case 'messages':    return Number(c.messageCount || c.unreadMessages || 0)
    default: return ''
  }
}

function renderCellValue(col, c) {
  const raw = getColumnValue(col, c)
  switch (col.key) {
    case 'channel':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{raw}</span>
          {c.channel?.plataforma && (
            <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{c.channel.plataforma}</span>
          )}
        </div>
      )
    case 'content':
      return <span style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{raw}</span>
    case 'price':       return <strong style={{ fontFamily: FONT_DISPLAY, fontSize: 13, color: 'var(--text)' }}>€{raw}</strong>
    case 'views':       return raw ? raw.toLocaleString('es') : '—'
    case 'clicks':      return raw ? raw.toLocaleString('es') : '—'
    case 'ctr':         return raw > 0 ? <span style={{ color: raw > 4 ? OK : 'var(--text)', fontWeight: raw > 4 ? 700 : 400 }}>{raw.toFixed(1)}%</span> : '—'
    case 'cpc':         return raw > 0 ? `€${raw.toFixed(2)}` : '—'
    case 'cpm':         return raw > 0 ? `€${raw.toFixed(2)}` : '—'
    case 'createdAt':   return raw ? new Date(raw).toLocaleDateString('es', { day: 'numeric', month: 'short' }) : '—'
    case 'publishedAt': return raw ? new Date(raw).toLocaleDateString('es', { day: 'numeric', month: 'short' }) : '—'
    case 'status':    {
      const cfg = STATUS_CFG[raw] || { color: '#94a3b8', label: raw }
      return (
        <span style={{ background: `${cfg.color}14`, color: cfg.color, border: `1px solid ${cfg.color}35`, borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
          {cfg.label}
        </span>
      )
    }
    case 'messages':    return raw > 0 ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: PURPLE, fontWeight: 600 }}><MessageCircle size={11} /> {raw}</span> : '—'
    default: return raw
  }
}

// ─── Column picker dropdown ───────────────────────────────────────────────────
function ColumnPicker({ visibleCols, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const toggle = (key) => {
    const col = ALL_COLUMNS.find(c => c.key === key)
    if (col?.required) return
    if (visibleCols.includes(key)) {
      onChange(visibleCols.filter(k => k !== key))
    } else {
      // Insert at position matching ALL_COLUMNS order
      const targetIdx = ALL_COLUMNS.findIndex(c => c.key === key)
      const newSet = new Set([...visibleCols, key])
      const ordered = ALL_COLUMNS.map(c => c.key).filter(k => newSet.has(k))
      onChange(ordered)
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: open ? purpleAlpha(0.12) : 'var(--bg2)',
          color: open ? PURPLE : 'var(--text)',
          border: `1px solid ${open ? purpleAlpha(0.3) : 'var(--border)'}`,
          borderRadius: 9, padding: '7px 12px', fontSize: 12.5, fontWeight: 600,
          cursor: 'pointer', fontFamily: FONT_BODY,
        }}
      >
        <Settings2 size={13} /> Columnas ({visibleCols.length})
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 36, right: 0, zIndex: 30,
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 6, minWidth: 220,
          boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
          maxHeight: 380, overflow: 'auto',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 10px 4px' }}>
            Mostrar columnas
          </div>
          {ALL_COLUMNS.map(col => {
            const visible = visibleCols.includes(col.key)
            return (
              <button key={col.key} onClick={() => toggle(col.key)} disabled={col.required}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  padding: '8px 10px', borderRadius: 6, border: 'none',
                  background: 'transparent', cursor: col.required ? 'default' : 'pointer',
                  fontSize: 12.5, color: col.required ? 'var(--muted2)' : 'var(--text)',
                  fontFamily: FONT_BODY, textAlign: 'left',
                }}
                onMouseEnter={e => { if (!col.required) e.currentTarget.style.background = 'var(--bg2)' }}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span>{col.label}{col.required ? ' (obligatoria)' : ''}</span>
                {visible && <Check size={13} color={PURPLE} strokeWidth={2.5} />}
              </button>
            )
          })}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, padding: 4, display: 'flex', gap: 4 }}>
            <button onClick={() => onChange(DEFAULT_VISIBLE)}
              style={{ flex: 1, fontSize: 11, color: 'var(--muted)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', fontFamily: FONT_BODY, fontWeight: 600 }}
            >
              Por defecto
            </button>
            <button onClick={() => onChange(ALL_COLUMNS.map(c => c.key))}
              style={{ flex: 1, fontSize: 11, color: PURPLE, background: purpleAlpha(0.1), border: `1px solid ${purpleAlpha(0.3)}`, borderRadius: 6, padding: '6px 8px', cursor: 'pointer', fontFamily: FONT_BODY, fontWeight: 600 }}
            >
              Todas
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Table View ──────────────────────────────────────────────────────────
export default function CampaignsTableView({ campaigns, onRowClick, selectedId }) {
  const [visibleCols, setVisibleColsState] = useState(loadVisibleColumns)
  const [sortKey, setSortKey] = useState('createdAt')
  const [sortDir, setSortDir] = useState('desc')

  const setVisibleCols = (cols) => {
    setVisibleColsState(cols)
    saveVisibleColumns(cols)
  }

  const cols = useMemo(() => visibleCols.map(k => ALL_COLUMNS.find(c => c.key === k)).filter(Boolean), [visibleCols])

  const sortedRows = useMemo(() => {
    const col = ALL_COLUMNS.find(c => c.key === sortKey)
    if (!col || !col.sortable) return campaigns
    const dir = sortDir === 'asc' ? 1 : -1
    return [...campaigns].sort((a, b) => {
      const va = getColumnValue(col, a)
      const vb = getColumnValue(col, b)
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
      return String(va).localeCompare(String(vb)) * dir
    })
  }, [campaigns, sortKey, sortDir])

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          {sortedRows.length} campaña{sortedRows.length === 1 ? '' : 's'}
        </div>
        <ColumnPicker visibleCols={visibleCols} onChange={setVisibleCols} />
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT_BODY, fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              {cols.map(col => {
                const isSort = col.sortable && sortKey === col.key
                return (
                  <th key={col.key}
                    onClick={() => col.sortable && handleSort(col.key)}
                    style={{
                      textAlign: col.align || 'left', padding: '11px 14px',
                      fontSize: 10.5, fontWeight: 700, color: 'var(--muted)',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      borderBottom: '1px solid var(--border)',
                      cursor: col.sortable ? 'pointer' : 'default',
                      whiteSpace: 'nowrap', userSelect: 'none',
                      minWidth: col.width,
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {col.label}
                      {isSort && (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr><td colSpan={cols.length} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Sin campañas</td></tr>
            ) : (
              sortedRows.map(c => {
                const isSel = selectedId === c._id || selectedId === c.id
                return (
                  <tr key={c._id || c.id}
                    onClick={() => onRowClick && onRowClick(c)}
                    style={{
                      cursor: onRowClick ? 'pointer' : 'default',
                      background: isSel ? purpleAlpha(0.05) : 'transparent',
                      transition: 'background .12s',
                    }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--bg2)' }}
                    onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}
                  >
                    {cols.map(col => (
                      <td key={col.key} style={{
                        padding: '12px 14px',
                        textAlign: col.align || 'left',
                        borderBottom: '1px solid var(--border)',
                        color: 'var(--text)',
                        maxWidth: col.width,
                      }}>
                        {renderCellValue(col, c)}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
