import React, { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import NavBar from '../navigation/NavBar'
import ScarcityBanner from '../components/landing/ScarcityBanner'

export default function AppLayout() {
  const { pathname } = useLocation()
  const isLanding = pathname === '/'
  const isFullWidth = pathname === '/marketplace'
  // Scarcity banner only shows on the advertiser landing surfaces (root +
  // /para-anunciantes). Pre-launch hook tied to the hero email capture.
  const showScarcityBanner = pathname === '/' || pathname === '/para-anunciantes'

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
