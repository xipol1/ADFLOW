import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthContext'

/**
 * /dashboard is a role dispatcher, nothing else.
 *
 * It used to double as the beta wall: when ProtectedRoute bounced a user
 * without betaAccess it sent them here with `state.betaWall`, and this page
 * rendered a banner plus a legacy dashboard whose stats were hardcoded to
 * zero and whose buttons were `onClick={() => {}}`. That wall now lives at
 * /beta as a real page, so everything below is a redirect.
 *
 * Users without access never reach the targets — ProtectedRoute intercepts
 * them at /advertiser and /creator and sends them to /beta.
 */
export default function DashboardPage() {
  const { user } = useAuth()
  const rol = user?.rol || user?.role || ''

  if (rol === 'admin') return <Navigate to="/admin" replace />
  if (rol === 'creator' || rol === 'creador') return <Navigate to="/creator" replace />
  return <Navigate to="/advertiser" replace />
}
