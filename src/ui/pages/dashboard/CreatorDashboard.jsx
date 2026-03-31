import React from 'react'
import { useNavigate } from 'react-router-dom'
import { PURPLE as A, GREEN as WA, purpleAlpha as AG, FONT_BODY as F, FONT_DISPLAY as D } from '../../theme/tokens'

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

const ActionCard = ({ icon, label, desc, onClick, primary, color }) => {
  const bg = color || A
  return (
    <button onClick={onClick} style={{
      background: primary ? bg : 'var(--surface)',
      border: `1px solid ${primary ? bg : 'var(--border)'}`,
      borderRadius: '14px', padding: '18px 20px',
      cursor: 'pointer', textAlign: 'left', width: '100%',
      display: 'flex', alignItems: 'center', gap: '14px',
      transition: 'transform .15s, box-shadow .15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)' }}
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
}

export default function CreatorDashboard({ user }) {
  const navigate = useNavigate()
  const nombre = user?.nombre || user?.email?.split('@')[0] || 'Creador'

  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: D, fontSize: '26px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: '6px' }}>
          Hola, {nombre} 👋
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)' }}>
          Gestiona tus canales, revisa solicitudes y controla tus ingresos.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
        <StatCard icon="📡" label="Canales registrados" value="0" sub="Añade tu primer canal" />
        <StatCard icon="📥" label="Solicitudes pendientes" value="0" sub="Sin solicitudes nuevas" />
        <StatCard icon="💰" label="Ingresos totales" value="$0" sub="Este mes" color={A} />
      </div>

      {/* Quick actions */}
      <div>
        <h2 style={{ fontFamily: D, fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>
          Acciones rápidas
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <ActionCard primary icon="➕" label="Registrar canal" desc="Añade tu canal de WhatsApp, Telegram o más" onClick={() => {}} />
          <ActionCard icon="📥" label="Ver solicitudes" desc="Revisa propuestas de anunciantes" onClick={() => {}} />
          <ActionCard icon="💸" label="Solicitar retiro" desc="Retira tus ganancias cuando quieras" onClick={() => {}} />
        </div>
      </div>

      {/* Tips for new creators */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '28px 28px',
      }}>
        <h3 style={{ fontFamily: D, fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>
          Cómo empezar como creador
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { n: '1', title: 'Registra tu canal', desc: 'Añade tu canal de WhatsApp, Telegram, Discord o YouTube con sus métricas reales.', icon: '📡' },
            { n: '2', title: 'Define tu tarifa', desc: 'Establece el precio por publicación o mención patrocinada en tu comunidad.', icon: '💰' },
            { n: '3', title: 'Recibe solicitudes', desc: 'Los anunciantes te contactarán directamente con propuestas de campaña.', icon: '📥' },
          ].map(({ n, title, desc, icon }) => (
            <div key={n} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                background: AG(0.12), border: `1px solid ${AG(0.25)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 700, color: A, fontFamily: D,
              }}>{n}</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>{icon} {title}</div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => {}} style={{
          marginTop: '20px', background: A, color: '#fff', border: 'none',
          borderRadius: '10px', padding: '11px 22px', fontSize: '14px', fontWeight: 600,
          fontFamily: F, cursor: 'pointer', transition: 'background .2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = '#7c3aed' }}
          onMouseLeave={e => { e.currentTarget.style.background = A }}
        >
          Registrar mi primer canal →
        </button>
      </div>
    </div>
  )
}
