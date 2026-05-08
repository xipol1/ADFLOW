import React, { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import NavBar from '../navigation/NavBar'
import ScarcityBanner from '../components/landing/ScarcityBanner'
import { getFeatureFlag } from '../../flags/featureFlags'

export default function AppLayout() {
  const { pathname } = useLocation()
  const isLanding = pathname === '/'
  const isFullWidth = pathname === '/marketplace'
  // Scarcity banner — shown on the surfaces that render a hero with #hero-cta:
  //   - /para-anunciantes (always, advertiser variant)
  //   - /                 (only when landingUnification flag ON, advertiser variant)
  //   - /para-canales     (always, creator variant)
  // The banner anchors to #hero-cta; if the page doesn't render that target,
  // don't show the banner here.
  const landingUnificationEnabled = getFeatureFlag('landingUnification')
  const isAdvertiserSurface =
    pathname === '/para-anunciantes' || (pathname === '/' && landingUnificationEnabled)
  const isCreatorSurface = pathname === '/para-canales'
  const showScarcityBanner = isAdvertiserSurface || isCreatorSurface
  const scarcityVariant = isCreatorSurface ? 'creator' : 'advertiser'

  // Sync initial theme from localStorage so CSS vars apply before NavBar mounts
  useEffect(() => {
    const saved = localStorage.getItem('channelad-theme')
    document.documentElement.dataset.theme = saved === 'dark' ? 'dark' : 'light'
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', transition: 'background .3s, color .3s' }}>
      {showScarcityBanner && <ScarcityBanner variant={scarcityVariant} />}
      <NavBar />
      <main style={isLanding || isFullWidth ? {} : { maxWidth: '1100px', margin: '0 auto', padding: '32px 24px 48px' }}>
        <Outlet />
      </main>
    </div>
  )
}
