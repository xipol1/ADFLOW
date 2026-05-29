import React, { useState, useEffect, useCallback } from 'react'
import {
  Bug, AlertTriangle, AlertOctagon, Clock, ChevronDown, ChevronUp,
  Loader2, Filter, RefreshCw, ExternalLink, X,
} from 'lucide-react'
import apiService from '../../../../services/api'

const ADMIN_RED = '#EF4444'
const D = 'Sora, sans-serif'

const LEVEL_COLORS = {
  fatal: '#DC2626',
  error: '#EF4444',
  warn:  '#F59E0B',
}

const STATUS_COLORS = (s) => (s >= 500 ? '#EF4444' : s >= 400 ? '#F59E0B' : '#6B7280')

const fmtAgo = (d) => {
  if (!d) return '—'
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

const fmtTime = (d) => {
  if (!d) return ''
  return new Date(d).toISOString().replace('T', ' ').slice(0, 19)
}

function Pill({ children, color, bg }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 6,
      fontSize: 11, fontWeight: 600, color, background: bg || `${color}1A`,
      fontFamily: 'var(--font-mono)',
    }}>{children}</span>
  )
}

function SummaryCard({ icon: Icon, label, value, color = ADMIN_RED }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} style={{ color }} />
        </div>
        <span style={{ color: 'var(--muted2)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      </div>
      <span style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{value}</span>
    </div>
  )
}

function ErrorRow({ item, expanded, onToggle }) {
  const statusColor = STATUS_COLORS(item.statusCode || 500)
  const lvlColor = LEVEL_COLORS[item.level] || ADMIN_RED

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 12, marginBottom: 8,
    }}>
      <button onClick={onToggle} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        background: 'transparent', border: 'none', cursor: 'pointer',
        padding: 0, textAlign: 'left',
      }}>
        {expanded ? <ChevronUp size={14} style={{ color: 'var(--muted2)' }} />
                  : <ChevronDown size={14} style={{ color: 'var(--muted2)' }} />}
        <Pill color={lvlColor}>{(item.level || 'error').toUpperCase()}</Pill>
        <Pill color={statusColor}>{item.statusCode || '???'}</Pill>
        <span style={{ color: 'var(--muted2)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{item.method || '?'}</span>
        <span style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600, flex: 1, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.path || '(no path)'}</span>
        <span style={{ color: 'var(--muted2)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={11} />{fmtAgo(item.createdAt)}
        </span>
      </button>

      <div style={{ marginTop: 8, color: 'var(--text)', fontSize: 13, lineHeight: 1.4 }}>
        {item.message}
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 12 }}>
            <Meta label="Cuándo" value={fmtTime(item.createdAt)} />
            <Meta label="UserId" value={item.userId || '—'} />
            <Meta label="IP" value={item.ip || '—'} />
            <Meta label="Context" value={item.context || '—'} />
            <Meta label="User-Agent" value={item.userAgent ? item.userAgent.slice(0, 50) + (item.userAgent.length > 50 ? '…' : '') : '—'} />
          </div>
          {item.stack && (
            <pre style={{
              margin: 0, background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: 10, fontSize: 11, lineHeight: 1.5,
              fontFamily: 'var(--font-mono)', color: 'var(--muted)',
              maxHeight: 280, overflow: 'auto', whiteSpace: 'pre-wrap',
            }}>{item.stack}</pre>
          )}
        </div>
      )}
    </div>
  )
}

function Meta({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{value}</div>
    </div>
  )
}

export default function AdminErrorsPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [items, setItems] = useState([])
  const [summary, setSummary] = useState({ last1h: 0, last24h: 0, topPaths: [], byStatus: [] })
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [expandedId, setExpandedId] = useState(null)

  // Filters
  const [filters, setFilters] = useState({ level: '', path: '', since: '', userId: '' })
  const [showFilters, setShowFilters] = useState(false)

  const fetchErrors = useCallback(async (overridePage) => {
    const page = overridePage ?? pagination.page
    setRefreshing(true)
    try {
      const params = { page, limit: 50 }
      if (filters.level) params.level = filters.level
      if (filters.path) params.path = filters.path
      if (filters.since) params.since = filters.since
      if (filters.userId) params.userId = filters.userId
      const res = await apiService.getAdminErrors(params)
      if (res?.success) {
        setItems(res.data || [])
        setSummary(res.summary || { last1h: 0, last24h: 0, topPaths: [], byStatus: [] })
        setPagination(res.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 })
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filters, pagination.page])

  useEffect(() => { fetchErrors(1) }, []) // initial load only

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(() => fetchErrors(), 30000)
    return () => clearInterval(t)
  }, [fetchErrors])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Loader2 size={28} style={{ color: ADMIN_RED, animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, fontFamily: D, margin: 0 }}>Errores de producción</h1>
          <p style={{ color: 'var(--muted2)', fontSize: 13, marginTop: 4, marginBottom: 0 }}>
            Errores 5xx persistidos a Mongo (TTL 30d). Auto-refresh cada 30s.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowFilters(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: showFilters ? `${ADMIN_RED}14` : 'var(--surface)',
            border: `1px solid ${showFilters ? ADMIN_RED : 'var(--border)'}`,
            color: showFilters ? ADMIN_RED : 'var(--text)',
            borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600,
            cursor: 'pointer',
          }}>
            <Filter size={13} /> Filtros
          </button>
          <button onClick={() => fetchErrors()} disabled={refreshing} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--surface)', border: '1px solid var(--border)',
            color: 'var(--text)', borderRadius: 8, padding: '8px 12px',
            fontSize: 12, fontWeight: 600, cursor: refreshing ? 'wait' : 'pointer',
          }}>
            <RefreshCw size={13} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
            Refrescar
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, margin: '20px 0' }}>
        <SummaryCard icon={Bug} label="Última hora" value={summary.last1h} color={summary.last1h > 0 ? ADMIN_RED : '#10B981'} />
        <SummaryCard icon={AlertTriangle} label="Últimas 24h" value={summary.last24h} color={summary.last24h > 10 ? ADMIN_RED : '#F59E0B'} />
        <SummaryCard icon={AlertOctagon} label="Top status" value={summary.byStatus?.[0] ? `${summary.byStatus[0].statusCode} × ${summary.byStatus[0].count}` : '—'} color="#6366F1" />
        <SummaryCard icon={ExternalLink} label="Path más roto" value={summary.topPaths?.[0] ? `${summary.topPaths[0].path || '/'} × ${summary.topPaths[0].count}` : '—'} color="#8B5CF6" />
      </div>

      {/* Filters */}
      {showFilters && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <FilterInput label="Level" type="select" value={filters.level} onChange={v => setFilters(f => ({ ...f, level: v }))}
              options={[{ value: '', label: 'Todos' }, { value: 'error', label: 'Error' }, { value: 'warn', label: 'Warn' }, { value: 'fatal', label: 'Fatal' }]} />
            <FilterInput label="Path (substring)" value={filters.path} onChange={v => setFilters(f => ({ ...f, path: v }))} placeholder="/api/auth" />
            <FilterInput label="UserId" value={filters.userId} onChange={v => setFilters(f => ({ ...f, userId: v }))} placeholder="6abc123…" />
            <FilterInput label="Desde (horas)" value={filters.since} onChange={v => setFilters(f => ({ ...f, since: v }))} placeholder="24" />
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button onClick={() => fetchErrors(1)} style={{
              background: ADMIN_RED, color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>Aplicar</button>
            <button onClick={() => { setFilters({ level: '', path: '', since: '', userId: '' }); setTimeout(() => fetchErrors(1), 0) }} style={{
              background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}><X size={12} /> Limpiar</button>
          </div>
        </div>
      )}

      {/* Errors list */}
      {items.length === 0 ? (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 48, textAlign: 'center',
        }}>
          <Bug size={36} style={{ color: '#10B981', marginBottom: 12 }} />
          <p style={{ color: 'var(--text)', fontSize: 15, fontWeight: 600, margin: 0 }}>Sin errores en este rango</p>
          <p style={{ color: 'var(--muted2)', fontSize: 12, marginTop: 4 }}>Producción está limpia. Tan a gusto.</p>
        </div>
      ) : (
        <>
          <div>
            {items.map(item => (
              <ErrorRow
                key={item._id}
                item={item}
                expanded={expandedId === item._id}
                onToggle={() => setExpandedId(expandedId === item._id ? null : item._id)}
              />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 20 }}>
              <button disabled={pagination.page <= 1} onClick={() => fetchErrors(pagination.page - 1)} style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--surface)', color: 'var(--text)', fontSize: 12, fontWeight: 600,
                cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                opacity: pagination.page <= 1 ? 0.5 : 1,
              }}>← Anterior</button>
              <span style={{ fontSize: 12, color: 'var(--muted2)' }}>
                Página {pagination.page} de {pagination.totalPages} ({pagination.total} total)
              </span>
              <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchErrors(pagination.page + 1)} style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--surface)', color: 'var(--text)', fontSize: 12, fontWeight: 600,
                cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer',
                opacity: pagination.page >= pagination.totalPages ? 0.5 : 1,
              }}>Siguiente →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function FilterInput({ label, value, onChange, placeholder, type, options }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{label}</label>
      {type === 'select' ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={{
          width: '100%', padding: '7px 10px', borderRadius: 8,
          border: '1px solid var(--border)', background: 'var(--bg)',
          color: 'var(--text)', fontSize: 13,
        }}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{
          width: '100%', padding: '7px 10px', borderRadius: 8,
          border: '1px solid var(--border)', background: 'var(--bg)',
          color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-mono)',
        }} />
      )}
    </div>
  )
}
