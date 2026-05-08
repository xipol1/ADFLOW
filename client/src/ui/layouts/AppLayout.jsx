import React, { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import NavBar from '../navigation/NavBar'
import ScarcityBanner from '../components/landing/ScarcityBanner'
import { getFeatureFlag } from '../../flags/featureFlags'

export default function AppLayout() {
  const { pathname } = useLocation()
  const isLanding = pathname === '/'
  const isFullWidth = pathname === '/marketplace'
  // Scarcity banner only shows where the unified landing (ForBrandsPage) is
  // actually rendered: /para-anunciantes always, and "/" only when the
  // landingUnification flag is ON. Otherwise "/" serves the legacy LandingPage
  // and the banner's #hero-cta target doesn't exist.
  const landingUnificationEnabled = getFeatureFlag('landingUnification')
  const showScarcityBanner =
    pathname === '/para-anunciantes' || (pathname === '/' && landingUnificationEnabled)

  // Sync initial theme from localStorage so CSS vars apply before NavBar mounts
  useEffect(() => {
    const saved = localStorage.getItem('channelad-theme')
    document.documentElement.dataset.theme = saved === 'dark' ? 'dark' : 'light'
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', transition: 'background .3s, color .3s' }}>
      {showScarcityBanner && <ScarcityBanner />}
      <NavBar />
      <main style={isLanding || isFullWidth ? {} : { maxWidth: '1100px', margin: '0 auto', padding: '32px 24px 48px' }}>
        <Outlet />
      </main>
    </div>
  )
}
