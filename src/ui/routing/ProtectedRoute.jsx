import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { PURPLE as A, purpleAlpha as AG, FONT_DISPLAY as D } from '../theme/tokens'

export default function ProtectedRoute({ children, allowedRoles = [], requireBeta = false }) {
  const { isAuthenticated, loading, user, betaAccess } = useAuth()

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
  // Beta wall: users without betaAccess trying to reach /advertiser or
  // /creator get bounced to /dashboard with a state flag. DashboardPage
  // reads the flag and renders a banner + limited view (verify channel +
  // invite friends) instead of the full role dashboard.
  if (requireBeta && !betaAccess) {
    return <Navigate to="/dashboard" state={{ betaWall: true }} replace />
  }
  return children
}
