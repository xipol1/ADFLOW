import React, { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { LazyMotion, domAnimation } from 'framer-motion'
import { GoogleOAuthProvider } from '@react-oauth/google'
import AppRoutes from './routes/AppRoutes'
import { AuthProvider } from './auth/AuthContext'
import { NotificationsProvider } from './hooks/useNotifications'
import { ToastProvider } from './components/ui/Toast'
import PlanGateProvider from './ui/components/PlanGateProvider'

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

  // LazyMotion + the `m` component (used across the landing/critical path)
  // load only the `domAnimation` feature bundle (~17KB) instead of the full
  // framer-motion runtime (~110KB min, ~96KB gzip). Features that need layout
  // animations or scroll/spring motion values (Hero3D, SubscriptionTiers3D)
  // live exclusively under the lazy /herramientas route, so domAnimation is
  // sufficient for everything on the first-paint path.
  //
  // Intentionally NOT `strict`: a handful of below-the-fold, lazy-loaded leaf
  // components (calculator wizard, demos) still import the full `motion`
  // component. Those resolve their own features and must keep working when
  // rendered inside this provider, which `strict` would forbid.
  const content = (
    <HelmetProvider>
      <LazyMotion features={domAnimation}>
        <BrowserRouter>
          <AuthProvider>
            <NotificationsProvider>
              <ToastProvider>
                <AppRoutes />
                <PlanGateProvider />
              </ToastProvider>
            </NotificationsProvider>
          </AuthProvider>
        </BrowserRouter>
      </LazyMotion>
    </HelmetProvider>
  )

  // Wrap with GoogleOAuthProvider only if client ID is configured
  if (!GOOGLE_CLIENT_ID) return content
  return <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{content}</GoogleOAuthProvider>
}
