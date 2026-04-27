import React, { useState, useEffect } from 'react'
import { Database, Loader2, Activity, Clock, CheckCircle, XCircle } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import apiService from '../../../../services/api'

const D = 'Sora, sans-serif'
const BUCKET_LABELS = { 0: '0-19', 20: '20-39', 40: '40-59', 60: '60-79', 80: '80-100' }
const BUCKET_COLORS = { 0: '#EF4444', 20: '#F59E0B', 40: '#3B82F6', 60: '#10B981', 80: '#F0B429' }

export default function AdminScoringPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false
    apiService.getAdminScoring().then(res => {
      if (!cancelled && res?.success) setData(res.data)
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Loader2 size={28} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const distribution = (data?.distribution || []).map(d => ({
    label: BUCKET_LABELS[d._id] || `${d._id}+`,
    count: d.count,
    fill: BUCKET_COLORS[d._id] || 'var(--accent)',
  }))

  const fmtDate = (d) => d ? new Date(d).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <h1 style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, fontFamily: D, margin: '0 0 20px' }}>Scoring & Sistema</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 16px' }}>
          <span style={{ color: 'var(--muted2)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Canales scored</span>
          <div style={{ color: 'var(--text)', fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: 6 }}>{data?.totalScored || 0}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 16px' }}>
          <span style={{ color: 'var(--muted2)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>CAS medio</span>
          <div style={{ color: 'var(--text)', fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: 6 }}>{Number(data?.avgCAS || 0).toFixed(1)}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 16px' }}>
          <span style={{ color: 'var(--muted2)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Ultimo cron</span>
          <div style={{ color: 'var(--text)', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)', marginTop: 6 }}>
            {data?.recentLogs?.[0] ? fmtDate(data.recentLogs[0].startedAt) : '—'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <h3 style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700, margin: '0 0 16px', fontFamily: D }}>Distribucion CAS</h3>
          {distribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted2)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted2)' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border-med)', borderRadius: 8, fontSize: 12, fontFamily: 'var(--font-mono)' }} />
                <Bar dataKey="count" name="Canales" radius={[4, 4, 0, 0]}>
                  {distribution.map((d, i) => (
                    <rect key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ color: 'var(--muted2)', textAlign: 'center', padding: 40, fontSize: 13 }}>Sin datos de scoring</div>}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <h3 style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700, margin: '0 0 16px', fontFamily: D }}>Historial de cron</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(data?.recentLogs || []).length === 0 && (
              <div style={{ color: 'var(--muted2)', textAlign: 'center', padding: 20, fontSize: 13 }}>Sin logs</div>
            )}
            {(data?.recentLogs || []).map((log, i) => {
              const ok = log.status === 'completed' || log.status === 'success'
              return (
                <div key={log._id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  {ok ? <CheckCircle size={14} style={{ color: '#10B981', flexShrink: 0 }} /> : <XCircle size={14} style={{ color: '#EF4444', flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{fmtDate(log.startedAt)}</div>
                    <div style={{ color: 'var(--muted2)', fontSize: 11 }}>
                      {log.scored != null && `${log.scored} canales`}
                      {log.duration != null && ` · ${(log.duration / 1000).toFixed(1)}s`}
                      {log.error && ` · Error: ${log.error}`}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
