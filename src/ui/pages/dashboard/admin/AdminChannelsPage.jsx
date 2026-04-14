import React, { useState, useEffect, useCallback } from 'react'
import { Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import apiService from '../../../../../services/api'

const D = 'Sora, sans-serif'
const PLATFORMS = ['', 'telegram', 'whatsapp', 'discord', 'instagram']
const PLAT_LABELS = { '': 'Todas', telegram: 'Telegram', whatsapp: 'WhatsApp', discord: 'Discord', instagram: 'Instagram' }
const PLAT_COLORS = { telegram: '#2AABEE', whatsapp: '#25D366', discord: '#5865F2', instagram: '#E1306C' }
const NIVEL_COLORS = { BRONZE: '#CD7F32', SILVER: '#C0C0C0', GOLD: '#F0B429', PLATINUM: '#E5E4E2', DIAMOND: '#B9F2FF' }

const fmtNum = (n) => { if (n == null) return '—'; if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`; if (n >= 1e3) return `${(n/1e3).toFixed(1)}K`; return String(n) }

export default function AdminChannelsPage() {
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [platform, setPlatform] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = { page, limit: 20 }
    if (search) params.search = search
    if (platform) params.platform = platform
    const res = await apiService.getAdminChannels(params)
    if (res?.success) {
      setChannels(res.data)
      setTotal(res.pagination?.total || 0)
      setTotalPages(res.pagination?.totalPages || 1)
    }
    setLoading(false)
  }, [page, search, platform])

  useEffect(() => { load() }, [load])

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <h1 style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, fontFamily: D, margin: '0 0 20px' }}>Canales</h1>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted2)' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Buscar canal..."
            style={{ width: '100%', padding: '10px 12px 10px 34px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 13, outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg3)', borderRadius: 10, padding: 3 }}>
          {PLATFORMS.map(p => (
            <button key={p} onClick={() => { setPlatform(p); setPage(1) }}
              style={{ background: platform === p ? 'var(--accent-dim)' : 'transparent', color: platform === p ? 'var(--accent)' : 'var(--muted2)', border: platform === p ? '1px solid var(--accent)44' : '1px solid transparent', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: platform === p ? 700 : 500, cursor: 'pointer' }}>
              {PLAT_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Canal', 'Plataforma', 'Subs', 'CAS', 'Nivel', 'CPM', 'Status', 'Claimed'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--muted2)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center' }}><Loader2 size={20} style={{ color: 'var(--muted2)', animation: 'spin 1s linear infinite' }} /></td></tr>
            ) : channels.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--muted2)' }}>Sin resultados</td></tr>
            ) : channels.map(c => (
              <tr key={c._id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 16px', color: 'var(--text)', fontWeight: 600, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nombreCanal || '—'}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ background: `${PLAT_COLORS[c.plataforma] || '#64748b'}14`, color: PLAT_COLORS[c.plataforma] || '#64748b', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{c.plataforma}</span>
                </td>
                <td style={{ padding: '10px 16px', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmtNum(c.seguidores)}</td>
                <td style={{ padding: '10px 16px', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700 }}>{c.CAS ?? '—'}</td>
                <td style={{ padding: '10px 16px' }}>
                  {c.nivel && <span style={{ color: NIVEL_COLORS[c.nivel] || 'var(--muted2)', fontSize: 11, fontWeight: 700 }}>{c.nivel}</span>}
                </td>
                <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>€{Number(c.CPMDinamico || 0).toFixed(1)}</td>
                <td style={{ padding: '10px 16px', color: c.status === 'activo' ? '#10B981' : 'var(--muted2)', fontSize: 12, fontWeight: 600 }}>{c.status || '—'}</td>
                <td style={{ padding: '10px 16px', color: c.claimed ? '#10B981' : 'var(--muted2)', fontSize: 12 }}>{c.claimed ? 'Si' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', cursor: page === 1 ? 'not-allowed' : 'pointer', color: 'var(--text-secondary)' }}><ChevronLeft size={14} /></button>
          <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{page} / {totalPages} ({total})</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', cursor: page === totalPages ? 'not-allowed' : 'pointer', color: 'var(--text-secondary)' }}><ChevronRight size={14} /></button>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
