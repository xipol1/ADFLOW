import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, ArrowRight } from 'lucide-react'
import { useOnboarding, clearOnboarding } from './OnboardingContext'

const A = '#8b5cf6'
const AD = '#7c3aed'
const AG = (o) => `rgba(139,92,246,${o})`
const OK = '#10b981'
const F = "'Inter', system-ui, sans-serif"
const D = "'Sora', system-ui, sans-serif"

const PLATFORM_NAMES = { telegram: 'Telegram', whatsapp: 'WhatsApp', discord: 'Discord', instagram: 'Instagram' }
const PLATFORM_COLORS = { telegram: '#2aabee', whatsapp: '#25d366', discord: '#5865f2', instagram: '#e1306c' }

// Simple confetti using CSS animations
function Confetti() {
  const [particles] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 1.5 + Math.random() * 1.5,
      color: [A, OK, '#f59e0b', '#3b82f6', '#ec4899'][Math.floor(Math.random() * 5)],
      size: 4 + Math.random() * 6,
    }))
  )

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 100, overflow: 'hidden' }}>
        {particles.map(p => (
          <div key={p.id} style={{
            position: 'absolute',
            top: '-10px',
            left: `${p.x}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: p.id % 3 === 0 ? '50%' : '2px',
            background: p.color,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
          }} />
        ))}
      </div>
    </>
  )
}

export default function SuccessStep() {
  const navigate = useNavigate()
  const { state } = useOnboarding()
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 4000)
    return () => clearTimeout(t)
  }, [])

  const handleGo = () => {
    clearOnboarding()
    navigate('/creator', { replace: true })
  }

  const pColor = PLATFORM_COLORS[state.platform] || A

  return (
    <div style={{ textAlign: 'center' }}>
      {showConfetti && <Confetti />}

      {/* Success icon */}
      <div style={{
        width: '80px', height: '80px', borderRadius: '50%',
        background: `${OK}15`, border: `2px solid ${OK}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 24px',
        animation: 'pop-in .5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      }}>
        <CheckCircle size={40} color={OK} />
      </div>

      <style>{`
        @keyframes pop-in {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <h1 style={{
        fontFamily: D, fontSize: '32px', fontWeight: 700,
        letterSpacing: '-0.03em', color: 'var(--text)',
        marginBottom: '8px',
      }}>
        Tu canal esta activo
      </h1>
      <p style={{ fontSize: '16px', color: 'var(--muted)', marginBottom: '32px', lineHeight: 1.5 }}>
        Ya puedes recibir campañas de anunciantes
      </p>

      {/* Channel recap card */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '24px', marginBottom: '32px',
        textAlign: 'left',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: `${pColor}15`, border: `1px solid ${pColor}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px',
          }}>
            {state.platform === 'telegram' ? '\u2708\uFE0F' : state.platform === 'whatsapp' ? '\uD83D\uDCAC' : state.platform === 'discord' ? '\uD83C\uDFAE' : '\uD83D\uDCF8'}
          </div>
          <div>
            <div style={{ fontFamily: D, fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
              {state.channelName || 'Tu canal'}
            </div>
            <div style={{ fontSize: '13px', color: pColor, fontWeight: 600 }}>
              {PLATFORM_NAMES[state.platform] || state.platform}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{
            flex: 1, background: `${OK}08`, borderRadius: '10px', padding: '12px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '11px', color: OK, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
              Estado
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: OK }}>Activo</div>
          </div>
          <div style={{
            flex: 1, background: AG(0.06), borderRadius: '10px', padding: '12px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '11px', color: A, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
              Verificado
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: A }}>Si</div>
          </div>
        </div>
      </div>

      {/* What's next */}
      <div style={{
        background: AG(0.06), border: `1px solid ${AG(0.15)}`,
        borderRadius: '12px', padding: '16px', marginBottom: '28px',
        textAlign: 'left',
      }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: A, marginBottom: '8px' }}>
          Que sigue
        </div>
        <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6 }}>
          Estamos buscando campañas para tu canal. Las primeras oportunidades llegan en 24-72h.
          Mientras tanto, puedes completar tu perfil y configurar precios.
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={handleGo}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          background: A, color: '#fff', border: 'none',
          borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: 700,
          cursor: 'pointer', fontFamily: F, transition: 'all .2s',
          boxShadow: `0 4px 16px ${AG(0.35)}`,
        }}
        onMouseEnter={e => e.currentTarget.style.background = AD}
        onMouseLeave={e => e.currentTarget.style.background = A}
      >
        Ir al dashboard <ArrowRight size={16} />
      </button>
    </div>
  )
}
