import React from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { OnboardingProvider, useOnboarding } from './OnboardingContext'

const F = "'Inter', system-ui, sans-serif"
const D = "'Sora', system-ui, sans-serif"
const A = '#8b5cf6'

const STEPS = [
  { path: 'register', label: 'Cuenta' },
  { path: 'channel', label: 'Canal' },
  { path: 'verify', label: 'Verificar' },
  { path: 'success', label: 'Listo' },
]

function ProgressDots() {
  const location = useLocation()
  const current = STEPS.findIndex(s => location.pathname.includes(s.path))

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginBottom: '32px' }}>
      {STEPS.map((s, i) => {
        const done = i < current
        const active = i === current
        return (
          <React.Fragment key={s.path}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: active ? '32px' : '10px',
                height: '10px',
                borderRadius: active ? '5px' : '50%',
                background: done ? A : active ? A : 'var(--border-med)',
                transition: 'all .3s ease',
                opacity: done ? 0.5 : 1,
              }} />
              <span style={{
                fontSize: '10px',
                fontWeight: active ? 700 : 400,
                color: done || active ? A : 'var(--muted2)',
                fontFamily: F,
                transition: 'color .3s',
              }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ width: '24px', height: '1px', background: done ? A : 'var(--border)', marginBottom: '18px', transition: 'background .3s' }} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

function InnerLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const isFirst = location.pathname.includes('register')
  const isSuccess = location.pathname.includes('success')

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px 60px',
      fontFamily: F,
    }}>
      {/* Back button */}
      {!isFirst && !isSuccess && (
        <button
          onClick={() => navigate(-1)}
          style={{
            position: 'absolute', top: '20px', left: '20px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '13px', fontFamily: F,
          }}
        >
          <ChevronLeft size={16} /> Volver
        </button>
      )}

      {/* Logo */}
      <Link to="/" style={{
        fontFamily: D, fontWeight: 700, fontSize: '22px',
        letterSpacing: '-0.4px', textDecoration: 'none',
        color: 'var(--text)', marginBottom: '32px',
      }}>
        Ad<span style={{ color: A }}>flow</span>
      </Link>

      {/* Progress */}
      {!isSuccess && <ProgressDots />}

      {/* Content */}
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <Outlet />
      </div>

      {/* Footer */}
      <p style={{ marginTop: 'auto', paddingTop: '40px', fontSize: '11px', color: 'var(--muted2)' }}>
        &copy; 2026 Adflow
      </p>
    </div>
  )
}

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <InnerLayout />
    </OnboardingProvider>
  )
}
