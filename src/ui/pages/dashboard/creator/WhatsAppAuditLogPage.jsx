/**
 * WhatsAppAuditLogPage
 *
 * Shows every operation ChannelAd has performed against the user's linked
 * WhatsApp sessions. This is the "trust instrument" — if anything unusual
 * ever happens, the user can see it here and export it as evidence.
 *
 * Features:
 *   - Paginated list of audit entries
 *   - Filter by session, action type, success/failure
 *   - Export current view to JSON and CSV
 *   - Human-readable summaries with timestamps
 */

import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Shield,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react'
import apiService from '../../../../../services/api'
import { FONT_BODY, FONT_DISPLAY, PURPLE, purpleAlpha, GREEN } from '../../../theme/tokens'

const ACTION_LABELS = {
  'session.created': { label: 'Sesión iniciada', icon: '🔐' },
  'session.qr_generated': { label: 'QR generado', icon: '📱' },
  'session.connected': { label: 'Sesión conectada', icon: '✅' },
  'session.disconnected': { label: 'Sesión desconectada', icon: '🔌' },
  'session.revoked': { label: 'Sesión revocada', icon: '🛑' },
  'session.error': { label: 'Error en sesión', icon: '⚠️' },
  'newsletter.list_fetched': { label: 'Lista de canales leída', icon: '📋' },
  'newsletter.metadata_fetched': { label: 'Datos de canal leídos', icon: '📊' },
  'newsletter.subscribers_fetched': { label: 'Seguidores leídos', icon: '👥' },
  'newsletter.post_metrics_fetched': { label: 'Métricas de post leídas', icon: '📈' },
  'newsletter.linked_to_canal': { label: 'Canal vinculado', icon: '🔗' },
  'newsletter.unlinked_from_canal': { label: 'Canal desvinculado', icon: '⛓️‍💥' },
  'post.published': { label: 'Post publicado', icon: '📤' },
  'consent.accepted': { label: 'Consentimiento aceptado', icon: '✍️' },
  'consent.withdrawn': { label: 'Consentimiento retirado', icon: '🚫' },
}

const ACTION_FILTERS = [
  { value: '', label: 'Todas las acciones' },
  { value: 'session.connected', label: 'Conexiones' },
  { value: 'newsletter.metadata_fetched', label: 'Lecturas de datos' },
  { value: 'newsletter.post_metrics_fetched', label: 'Métricas de posts' },
  { value: 'post.published', label: 'Publicaciones' },
  { value: 'session.revoked', label: 'Revocaciones' },
]

export default function WhatsAppAuditLogPage() {
  const [entries, setEntries] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [offset, setOffset] = useState(0)
  const [sessions, setSessions] = useState([])
  const [sessionFilter, setSessionFilter] = useState('')

  const limit = 50

  useEffect(() => {
    loadSessions()
  }, [])

  useEffect(() => {
    loadEntries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sessionFilter, offset])

  const loadSessions = async () => {
    try {
      const res = await apiService.request('/baileys/sessions')
      setSessions(res?.sessions || [])
    } catch (_) {}
  }

  const loadEntries = async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('limit', String(limit))
      params.set('offset', String(offset))
      if (filter) params.set('action', filter)
      if (sessionFilter) params.set('sessionId', sessionFilter)

      const res = await apiService.request(`/baileys/audit?${params.toString()}`)
      if (res?.success) {
        setEntries(res.entries || [])
        setTotal(res.total || 0)
      } else {
        setError(res?.message || 'Error al cargar el registro')
      }
    } catch (err) {
      setError(err.message || 'Error al cargar el registro')
    } finally {
      setLoading(false)
    }
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' })
    downloadBlob(blob, `whatsapp-audit-${Date.now()}.json`)
  }

  const exportCsv = () => {
    const headers = ['timestamp', 'action', 'summary', 'success', 'ip']
    const rows = entries.map((e) => [
      new Date(e.createdAt).toISOString(),
      e.action,
      (e.summary || '').replace(/"/g, '""'),
      e.success ? 'true' : 'false',
      e.ip || '',
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    downloadBlob(blob, `whatsapp-audit-${Date.now()}.csv`)
  }

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ fontFamily: FONT_BODY, padding: '32px 24px', maxWidth: '1040px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link to="/creator/channels" style={{ fontSize: '13px', color: 'var(--muted)', textDecoration: 'none' }}>
          ← Volver a mis canales
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: purpleAlpha(0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={22} style={{ color: PURPLE }} />
          </div>
          <div>
            <h1
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: '26px',
                fontWeight: 700,
                color: 'var(--text)',
                margin: 0,
                letterSpacing: '-0.5px',
              }}
            >
              Registro de accesos a WhatsApp
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '4px 0 0' }}>
              Cada operación que Channelad realiza contra tu WhatsApp queda aquí. Inmutable y auditable.
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
          }}
        >
          <Filter size={14} style={{ color: 'var(--muted)' }} />
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value)
              setOffset(0)
            }}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '13px',
              color: 'var(--text)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {ACTION_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {sessions.length > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
            }}
          >
            <select
              value={sessionFilter}
              onChange={(e) => {
                setSessionFilter(e.target.value)
                setOffset(0)
              }}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '13px',
                color: 'var(--text)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">Todas las sesiones</option>
              {sessions.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.alias || s.deviceNumber || s._id.slice(-6)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ flex: 1 }} />

        <button
          onClick={loadEntries}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            fontSize: '13px',
            color: 'var(--text)',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={13} />
          Refrescar
        </button>

        <button
          onClick={exportJson}
          disabled={entries.length === 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            fontSize: '13px',
            color: 'var(--text)',
            cursor: entries.length ? 'pointer' : 'not-allowed',
            opacity: entries.length ? 1 : 0.5,
          }}
        >
          <Download size={13} />
          JSON
        </button>

        <button
          onClick={exportCsv}
          disabled={entries.length === 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            fontSize: '13px',
            color: 'var(--text)',
            cursor: entries.length ? 'pointer' : 'not-allowed',
            opacity: entries.length ? 1 : 0.5,
          }}
        >
          <Download size={13} />
          CSV
        </button>
      </div>

      {/* List */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : entries.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            overflow: 'hidden',
          }}
        >
          {entries.map((e, idx) => (
            <AuditRow key={e._id || idx} entry={e} isLast={idx === entries.length - 1} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '16px',
            fontSize: '13px',
            color: 'var(--muted)',
          }}
        >
          <span>
            Mostrando {offset + 1}–{Math.min(offset + limit, total)} de {total}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              style={paginationBtnStyle(offset === 0)}
            >
              Anterior
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              style={paginationBtnStyle(offset + limit >= total)}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function AuditRow({ entry, isLast }) {
  const action = ACTION_LABELS[entry.action] || { label: entry.action, icon: '📌' }
  const time = new Date(entry.createdAt)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        padding: '16px 20px',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: entry.success ? purpleAlpha(0.08) : 'rgba(239,68,68,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: '18px',
        }}
      >
        {action.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{action.label}</span>
          {entry.success ? (
            <CheckCircle2 size={12} style={{ color: GREEN }} />
          ) : (
            <XCircle size={12} style={{ color: '#EF4444' }} />
          )}
        </div>
        {entry.summary && (
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '2px 0 4px', lineHeight: 1.5 }}>
            {entry.summary}
          </p>
        )}
        {!entry.success && entry.errorMessage && (
          <p style={{ fontSize: '12px', color: '#EF4444', margin: '2px 0 4px', fontFamily: 'monospace' }}>
            {entry.errorMessage}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: 'var(--muted2)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={11} />
            {time.toLocaleString('es-ES')}
          </span>
          {entry.ip && <span>IP: {entry.ip}</span>}
        </div>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}>
      <div
        style={{
          width: '32px',
          height: '32px',
          border: '3px solid var(--border)',
          borderTopColor: PURPLE,
          borderRadius: '50%',
          margin: '0 auto 12px',
          animation: 'spin 1s linear infinite',
        }}
      />
      <p style={{ fontSize: '14px', margin: 0 }}>Cargando registro...</p>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function ErrorState({ message }) {
  return (
    <div
      style={{
        background: 'rgba(239,68,68,0.06)',
        border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: '12px',
        padding: '20px',
        textAlign: 'center',
        color: '#EF4444',
        fontSize: '14px',
      }}
    >
      {message}
    </div>
  )
}

function EmptyState({ filter }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        padding: '60px 20px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: purpleAlpha(0.08),
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          fontSize: '24px',
        }}
      >
        📋
      </div>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
        {filter ? 'No hay entradas con este filtro' : 'Aún no hay operaciones registradas'}
      </h3>
      <p style={{ fontSize: '13px', color: 'var(--muted)', maxWidth: '360px', margin: '0 auto', lineHeight: 1.6 }}>
        {filter
          ? 'Prueba a cambiar el filtro o refresca la página.'
          : 'Cuando vincules un canal de WhatsApp, todas las operaciones de lectura y escritura aparecerán aquí.'}
      </p>
    </div>
  )
}

const paginationBtnStyle = (disabled) => ({
  padding: '6px 14px',
  fontSize: '13px',
  fontWeight: 500,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: disabled ? 'var(--muted2)' : 'var(--text)',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.6 : 1,
})
