import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

const A  = '#8b5cf6'
const AG = (o) => `rgba(139,92,246,${o})`
const D  = "'Sora', system-ui, sans-serif"

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, loading, user } = useAuth()

  // Show a spinner while verifying the token (prevents flash of redirect)
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '16px',
      }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          border: `3px solid ${AG(0.15)}`,
          borderTop: `3px solid ${A}`,
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ fontFamily: D, fontSize: '14px', color: 'var(--muted)' }}>Cargando…</span>
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/auth/login" replace />
  const rol = user?.rol || user?.role || ''
  if (allowedRoles.length > 0 && !allowedRoles.includes(rol)) return <Navigate to="/" replace />
  return children
}

