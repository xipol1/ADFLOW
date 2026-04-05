import React, { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import NavBar from '../navigation/NavBar'

export default function AppLayout() {
  const { pathname } = useLocation()
  const isLanding = pathname === '/'
  const isFullWidth = pathname === '/marketplace'

  // Sync initial theme from localStorage so CSS vars apply before NavBar mounts
  useEffect(() => {
    const saved = localStorage.getItem('channelad-theme') || localStorage.getItem('adflow-theme')
    document.documentElement.dataset.theme = saved === 'dark' ? 'dark' : 'light'
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', transition: 'background .3s, color .3s' }}>
      <NavBar />
      <main style={isLanding || isFullWidth ? {} : { maxWidth: '1100px', margin: '0 auto', padding: '32px 24px 48px' }}>
        <Outlet />
      </main>
    </div>
  )
}
