import React, { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, Loader2 } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts'
import apiService from '../../../../services/api'

const D = 'Sora, sans-serif'
const PERIODS = [{ key: '7d', label: '7d' }, { key: '30d', label: '30d' }, { key: '90d', label: '90d' }, { key: '1y', label: '1y' }]
const PIE_COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#64748b', '#EC4899']
const STATUS_LABELS = { COMPLETED: 'Completada', PAID: 'Pagada', PUBLISHED: 'Publicada', CANCELLED: 'Cancelada', DRAFT: 'Borrador', EXPIRED: 'Expirada', DISPUTED: 'Disputada' }

function KpiCard({ label, value, sub, color = 'var(--accent)' }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 16px' }}>
      <span style={{ color: 'var(--muted2)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <div style={{ color: 'var(--text)', fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)', lineHeight: 1, marginTop: 6 }}>{value}</div>
      {sub && <div style={{ color: 'var(--muted2)', fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function AdminFinancesPage() {
  const [period, setPeriod] = useState('30d')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiService.getAdminFinances({ period }).then(res => {
      if (!cancelled && res?.success) setData(res.data)
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [period])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Loader2 size={28} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const timeline = data?.revenueTimeline || []
  const campaignsByStatus = (data?.campaignsByStatus || []).map(c => ({ name: STATUS_LABELS[c._id] || c._id, value: c.count, revenue: c.revenue }))

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, fontFamily: D, margin: 0 }}>Finanzas</h1>
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg3)', borderRadius: 10, padding: 3 }}>
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              style={{ background: period === p.key ? 'var(--accent-dim)' : 'transparent', color: period === p.key ? 'var(--accent)' : 'var(--muted2)', border: period === p.key ? '1px solid var(--accent)44' : '1px solid transparent', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: period === p.key ? 700 : 500, cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        <KpiCard label="Volumen total" value={`€${(data?.totalVolume || 0).toLocaleString('es')}`} />
        <KpiCard label="Comisiones" value={`€${(data?.totalCommissions || 0).toLocaleString('es')}`} sub="Revenue neto de la plataforma" />
        <KpiCard label="Transacciones" value={timeline.reduce((a, r) => a + (r.count || 0), 0)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, marginBottom: 20 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <h3 style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700, margin: '0 0 16px', fontFamily: D }}>Volumen diario</h3>
          {timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted2)' }} tickLine={false} axisLine={false} tickFormatter={d => { const p = d.split('-'); return `${p[2]}/${p[1]}` }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted2)' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border-med)', borderRadius: 8, fontSize: 12, fontFamily: 'var(--font-mono)' }} />
                <Bar dataKey="volume" name="Volumen" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ color: 'var(--muted2)', textAlign: 'center', padding: 40, fontSize: 13 }}>Sin transacciones en este periodo</div>}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <h3 style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700, margin: '0 0 16px', fontFamily: D }}>Campanas por estado</h3>
          {campaignsByStatus.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={campaignsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} strokeWidth={0}>
                    {campaignsByStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {campaignsByStatus.map((c, i) => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{c.name}</span>
                    </div>
                    <span style={{ color: 'var(--text)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{c.value} · €{(c.revenue || 0).toLocaleString('es')}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div style={{ color: 'var(--muted2)', textAlign: 'center', padding: 40, fontSize: 13 }}>Sin datos</div>}
        </div>
      </div>
    </div>
  )
}
