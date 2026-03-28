import React, { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

export default function NavBar() {
  const { isAuthenticated, user, logout, isAnunciante, isCreador, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [isDark, setIsDark] = useState(true)

  // Init theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('adflow-theme')
    const dark = saved !== 'light'
    setIsDark(dark)
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.dataset.theme = next ? 'dark' : 'light'
    localStorage.setItem('adflow-theme', next ? 'dark' : 'light')
  }

  const onLogout = () => { logout(); navigate('/') }

  const handleSearch = () => {
    const q = searchValue.trim()
    if (q) {
      navigate(`/marketplace?q=${encodeURIComponent(q)}`)
      setSearchValue('')
    } else {
      navigate('/marketplace')
    }
  }

  const dashboardPath = isCreador ? '/creator' : isAdmin ? '/dashboard' : '/advertiser'
  const sellPath = isAuthenticated ? (isCreador ? '/creator/channels' : '/creator') : '/auth/register'

  const navBg = isDark ? 'rgba(5,5,5,0.88)' : 'rgba(255,255,255,0.9)'
  const navBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const linkColor = isDark ? '#86868b' : '#6e6e73'
  const linkHover = isDark ? '#f5f5f7' : '#1d1d1f'
  const searchBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'
  const searchBorder = searchFocused
    ? isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.2)'
    : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'
  const inputColor = isDark ? '#f5f5f7' : '#1d1d1f'
  const logoColor = isDark ? '#f5f5f7' : '#1d1d1f'

  return (
    <header style={{
      display: 'flex', alignItems: 'center',
      padding: '0 40px', height: '60px',
      background: navBg,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${navBorder}`,
      position: 'sticky', top: 0, zIndex: 100,
      gap: '24px',
      transition: 'background .3s, border-color .3s',
    }}>

      {/* Logo */}
      <Link to="/" style={{
        fontFamily: "'Sora', sans-serif", fontWeight: 700,
        fontSize: '19px', letterSpacing: '-0.4px',
        textDecoration: 'none', color: logoColor,
        flexShrink: 0, transition: 'color .3s',
      }}>
        Ad<span style={{ color: '#8b5cf6' }}>flow</span>
      </Link>

      {/* Nav links + compact search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {[['/marketplace', 'Explorar'], [sellPath, 'Vender']].map(([to, label]) => (
          <NavLink key={label} to={to} style={{
            color: linkColor, textDecoration: 'none',
            padding: '6px 12px', fontSize: '14px', borderRadius: '6px',
            transition: 'color .15s, background .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = linkHover; e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}
            onMouseLeave={e => { e.currentTarget.style.color = linkColor; e.currentTarget.style.background = 'transparent' }}
          >{label}</NavLink>
        ))}

        {/* Compact search — always visible */}
        <div style={{
          display: 'flex', alignItems: 'center',
          background: searchBg,
          border: `1px solid ${searchBorder}`,
          borderRadius: '8px', height: '34px', width: '200px',
          padding: '0 10px', gap: '7px',
          opacity: searchFocused ? 1 : 0.7, transition: 'all .2s', marginLeft: '8px',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            style={{ color: isDark ? '#48484a' : '#aeaeb2', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="text" placeholder="Buscar canales..."
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: '13px', color: inputColor,
              fontFamily: "'Inter', sans-serif", minWidth: 0,
            }}
          />
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Theme toggle + auth */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {/* Day/night toggle */}
        <button onClick={toggleTheme} title={isDark ? 'Modo claro' : 'Modo oscuro'} style={{
          width: '34px', height: '34px', borderRadius: '8px',
          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)'}`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '15px', marginRight: '8px',
          transition: 'background .2s, border-color .2s',
        }}>
          {isDark ? '☀️' : '🌙'}
        </button>

        {isAuthenticated ? (
          <>
            <NavLink to={dashboardPath}
              style={({ isActive }) => ({ color: isActive ? '#8b5cf6' : linkColor, textDecoration: 'none', padding: '6px 12px', fontSize: '14px' })}>
              Dashboard
            </NavLink>
            <span style={{ color: linkColor, padding: '6px 8px', fontSize: '13px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.nombre || user?.email?.split('@')[0] || user?.email}
            </span>
            <button onClick={onLogout} style={{
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
              borderRadius: '6px', padding: '6px 14px',
              background: 'transparent', cursor: 'pointer',
              fontSize: '13px', fontWeight: 500, color: linkColor,
              transition: 'color .15s, border-color .15s',
            }}>Salir</button>
          </>
        ) : (
          <>
            <NavLink to="/auth/login" style={{
              color: linkColor, textDecoration: 'none',
              padding: '6px 14px', fontSize: '14px', borderRadius: '6px',
              transition: 'color .15s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = linkHover}
              onMouseLeave={e => e.currentTarget.style.color = linkColor}
            >Iniciar sesión</NavLink>
            <NavLink to="/auth/register" style={{
              background: '#8b5cf6', color: '#fff',
              textDecoration: 'none', padding: '7px 16px',
              borderRadius: '7px', fontSize: '14px', fontWeight: 600,
              transition: 'background .15s, transform .15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#7c3aed'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#8b5cf6'; e.currentTarget.style.transform = 'none' }}
            >Registrarse</NavLink>
          </>
        )}
      </nav>
    </header>
  )
}
