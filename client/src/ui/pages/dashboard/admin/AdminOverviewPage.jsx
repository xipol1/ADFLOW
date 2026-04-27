import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Radio, Megaphone, ShieldAlert, DollarSign, TrendingUp,
  Clock, CheckCircle, AlertTriangle, Loader2, UserPlus, Eye,
} from 'lucide-react'
import apiService from '../../../../services/api'

const ADMIN_RED = '#EF4444'
const redAlpha = (o) => `rgba(239,68,68,${o})`
const D = 'Sora, sans-serif'

function KpiCard({ icon: Icon, label, value, sub, color = ADMIN_RED }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} style={{ color }} />
        </div>
        <span style={{ color: 'var(--muted2)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      </div>
      <span style={{ color: 'var(--text)', fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{value}</span>
      {sub && <div style={{ color: 'var(--muted2)', fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function SectionCard({ title, children, action }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700, margin: 0, fontFamily: D }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

export default function AdminOverviewPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false
    apiService.getAdminOverview().then(res => {
      if (!cancelled && res?.success) setData(res.data)
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Loader2 size={28} style={{ color: ADMIN_RED, animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const k = data?.kpis || {}

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, fontFamily: D, margin: 0 }}>Panel de Administracion</h1>
        <p style={{ color: 'var(--muted2)', fontSize: 13, marginTop: 4 }}>Vista general del sistema</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <KpiCard icon={Users} label="Usuarios" value={k.totalUsers || 0} sub={`+${k.newUsers7d || 0} esta semana`} color="#3B82F6" />
        <KpiCard icon={Radio} label="Canales" value={k.totalChannels || 0} sub={`${k.activeChannels || 0} activos`} color="#10B981" />
        <KpiCard icon={Megaphone} label="Campanas" value={k.totalCampaigns || 0} sub={`${k.activeCampaigns || 0} activas`} color="#8B5CF6" />
        <KpiCard icon={CheckCircle} label="Completadas" value={k.completedCampaigns || 0} color="#10B981" />
        <KpiCard icon={ShieldAlert} label="Disputas abiertas" value={k.openDisputes || 0} color={ADMIN_RED} />
        <KpiCard icon={DollarSign} label="Revenue total" value={`€${(k.totalRevenue || 0).toLocaleString('es')}`} color="#F59E0B" />
        <KpiCard icon={AlertTriangle} label="Candidatos pendientes" value={k.pendingCandidates || 0} color="#F97316" />
        <KpiCard icon={UserPlus} label="Nuevos 30d" value={k.newUsers30d || 0} color="#3B82F6" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <SectionCard title="Usuarios recientes" action={
          <button onClick={() => navigate('/admin/users')} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 12px', fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>Ver todos</button>
        }>
          {(data?.recentUsers || []).map(u => (
            <div key={u._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>{u.nombre || u.email}</div>
                <div style={{ color: 'var(--muted2)', fontSize: 11 }}>{u.email} · {u.rol}</div>
              </div>
              <span style={{ color: 'var(--muted2)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                {new Date(u.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
              </span>
            </div>
          ))}
          {(!data?.recentUsers?.length) && <div style={{ color: 'var(--muted2)', fontSize: 13, textAlign: 'center', padding: 20 }}>Sin usuarios</div>}
        </SectionCard>

        <SectionCard title="Campanas recientes" action={
          <button onClick={() => navigate('/admin/campaigns')} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 12px', fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>Ver todas</button>
        }>
          {(data?.recentCampaigns || []).map(c => (
            <div key={c._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>{c.channel?.nombreCanal || '—'}</div>
                <div style={{ color: 'var(--muted2)', fontSize: 11 }}>{c.status} · €{c.price || 0}</div>
              </div>
              <span style={{ color: 'var(--muted2)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                {new Date(c.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
              </span>
            </div>
          ))}
          {(!data?.recentCampaigns?.length) && <div style={{ color: 'var(--muted2)', fontSize: 13, textAlign: 'center', padding: 20 }}>Sin campanas</div>}
        </SectionCard>
      </div>
    </div>
  )
}
