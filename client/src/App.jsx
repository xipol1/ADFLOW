import React, { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { GoogleOAuthProvider } from '@react-oauth/google'
import AppRoutes from './routes/AppRoutes'
import { AuthProvider } from './auth/AuthContext'
import { NotificationsProvider } from './hooks/useNotifications'
import { ToastProvider } from './components/ui/Toast'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export default function App() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    // In dev, never run a service worker — it caches stale bundles and
    // breaks Vite's HMR. Unregister any leftover from a prior run.
    if (import.meta.env.DEV) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister())
      })
      return
    }
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])

  const content = (
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <NotificationsProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </NotificationsProvider>
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  )

  // Wrap with GoogleOAuthProvider only if client ID is configured
  if (!GOOGLE_CLIENT_ID) return content
  return <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{content}</GoogleOAuthProvider>
}
