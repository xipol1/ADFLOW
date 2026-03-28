import React from 'react'
import { useNavigate } from 'react-router-dom'

const A  = '#8b5cf6'
const AG = (o) => `rgba(139,92,246,${o})`
const F  = "'Inter', system-ui, sans-serif"
const D  = "'Sora', system-ui, sans-serif"

const StatCard = ({ icon, label, value, sub, color }) => (
  <div style={{
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '16px', padding: '20px 24px',
  }}>
    <div style={{ fontSize: '22px', marginBottom: '8px' }}>{icon}</div>
    <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: D, color: color || 'var(--text)', letterSpacing: '-0.02em' }}>{value}</div>
    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginTop: '2px' }}>{label}</div>
    {sub && <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{sub}</div>}
  </div>
)

const ActionCard = ({ icon, label, desc, onClick, primary }) => (
  <button onClick={onClick} style={{
    background: primary ? A : 'var(--surface)',
    border: `1px solid ${primary ? A : 'var(--border)'}`,
    borderRadius: '14px', padding: '18px 20px',
    cursor: 'pointer', textAlign: 'left', width: '100%',
    display: 'flex', alignItems: 'center', gap: '14px',
    transition: 'transform .15s, box-shadow .15s',
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = primary ? `0 8px 24px ${AG(0.3)}` : '0 4px 16px rgba(0,0,0,0.12)' }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
  >
    <div style={{
      width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0,
      background: primary ? 'rgba(255,255,255,0.15)' : AG(0.12),
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
    }}>{icon}</div>
    <div>
      <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: D, color: primary ? '#fff' : 'var(--text)', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '12px', color: primary ? 'rgba(255,255,255,0.7)' : 'var(--muted)' }}>{desc}</div>
    </div>
  </button>
)

export default function AdvertiserDashboard({ user }) {
  const navigate = useNavigate()
  const nombre = user?.nombre || user?.email?.split('@')[0] || 'Anunciante'

  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: D, fontSize: '26px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: '6px' }}>
          Hola, {nombre} 👋
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)' }}>
          Gestiona tus campañas y descubre canales para anunciarte.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
        <StatCard icon="📣" label="Campañas activas" value="0" sub="Crea tu primera campaña" />
        <StatCard icon="📡" label="Canales guardados" value="0" sub="Guarda canales favoritos" />
        <StatCard icon="💸" label="Presupuesto gastado" value="$0" sub="Este mes" color={A} />
      </div>

      {/* Quick actions */}
      <div>
        <h2 style={{ fontFamily: D, fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>
          Acciones rápidas
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <ActionCard primary icon="🔍" label="Explorar canales" desc="WhatsApp, Telegram, Discord y más" onClick={() => navigate('/marketplace')} />
          <ActionCard icon="📋" label="Crear solicitud" desc="Contacta a un creador con tu propuesta" onClick={() => navigate('/marketplace')} />
          <ActionCard icon="📊" label="Ver estadísticas" desc="Rendimiento de tus campañas" onClick={() => {}} />
        </div>
      </div>

      {/* Empty campaigns state */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '48px 40px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '44px', marginBottom: '14px' }}>📣</div>
        <h3 style={{ fontFamily: D, fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
          Aún no tienes campañas
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--muted)', maxWidth: '360px', margin: '0 auto 22px', lineHeight: 1.6 }}>
          Empieza explorando canales y contacta creadores para publicitar tu marca en WhatsApp, Telegram y más.
        </p>
        <button onClick={() => navigate('/marketplace')} style={{
          background: A, color: '#fff', border: 'none', borderRadius: '10px',
          padding: '12px 26px', fontSize: '14px', fontWeight: 600,
          fontFamily: F, cursor: 'pointer', transition: 'background .2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = '#7c3aed' }}
          onMouseLeave={e => { e.currentTarget.style.background = A }}
        >
          Explorar el marketplace →
        </button>
      </div>
    </div>
  )
}
