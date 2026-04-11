import React, { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { PURPLE, PURPLE_DARK, purpleAlpha, GREEN } from '../theme/tokens'
import GlobalSearchBar from '../components/GlobalSearchBar'

function MenuIcon({ size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
}
function XIcon({ size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
}
function ChevronDownIcon({ size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
}

const EXPLORE_CATEGORIES = [
  { icon: '\u{1F6D2}', label: 'Ecommerce', param: 'Ecommerce' },
  { icon: '\u{1F4AA}', label: 'Fitness', param: 'Fitness' },
  { icon: '\u{1F4C8}', label: 'Marketing', param: 'Marketing' },
  { icon: '\u{1F3AE}', label: 'Gaming', param: 'Gaming' },
  { icon: '\u{1F916}', label: 'IA & Tech', param: 'IA & Tech' },
  { icon: '\u{1F4DA}', label: 'Educacion', param: 'Educacion' },
]

const EXPLORE_PLATFORMS = [
  { icon: '\u{1F4AC}', label: 'WhatsApp', color: '#25d366' },
  { icon: '\u2708\uFE0F', label: 'Telegram', color: '#2aabee' },
  { icon: '\u{1F3AE}', label: 'Discord', color: '#5865f2' },
  { icon: '\u{1F4F8}', label: 'Instagram', color: '#e1306c' },
  { icon: '\u{1F4D8}', label: 'Facebook', color: '#1877f2' },
  { icon: '\u{1F4E7}', label: 'Newsletter', color: '#f59e0b' },
]

export default function NavBar() {
  const { isAuthenticated, user, logout, isAnunciante, isCreador, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [isDark, setIsDark] = useState(false)
  const [megaOpen, setMegaOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [headerVisible, setHeaderVisible] = useState(true)
  const megaRef = useRef(null)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const saved = localStorage.getItem('channelad-theme')
    const dark = saved === 'dark'
    setIsDark(dark)
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [])

  useEffect(() => {
    const close = (e) => { if (megaRef.current && !megaRef.current.contains(e.target)) setMegaOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  // Hide on scroll down, show on scroll up
  useEffect(() => {
    const threshold = 10
    const onScroll = () => {
      const y = window.scrollY
      if (mobileOpen) { lastScrollY.current = y; return }
      if (y < 80) { setHeaderVisible(true) }
      else if (y > lastScrollY.current + threshold) { setHeaderVisible(false); setMegaOpen(false) }
      else if (y < lastScrollY.current - threshold) { setHeaderVisible(true) }
      lastScrollY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [mobileOpen])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.dataset.theme = next ? 'dark' : 'light'
    localStorage.setItem('channelad-theme', next ? 'dark' : 'light')
  }

  const onLogout = () => { logout(); navigate('/'); setMobileOpen(false) }
  const closeMobile = () => setMobileOpen(false)

  const dashboardPath = isCreador ? '/creator' : isAdmin ? '/dashboard' : '/advertiser'

  const navBg = isDark ? 'rgba(5,5,5,0.92)' : 'rgba(255,255,255,0.92)'
  const navBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const linkColor = isDark ? '#86868b' : '#6e6e73'
  const linkHover = isDark ? '#f5f5f7' : '#1d1d1f'
  const logoColor = isDark ? '#f5f5f7' : '#1d1d1f'

  const navLinkStyle = {
    color: linkColor, textDecoration: 'none',
    padding: '7px 14px', fontSize: '14px', borderRadius: '8px',
    transition: 'color .15s, background .15s', fontWeight: 500,
  }

  return (
    <>
      <header className="nav-header" style={{
        display: 'flex', alignItems: 'center',
        padding: '0 clamp(16px, 4vw, 40px)', height: '64px',
        background: navBg,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: `1px solid ${navBorder}`,
        position: 'sticky', top: 0, zIndex: 100,
        gap: '8px',
        transform: headerVisible ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform .35s cubic-bezier(.22,1,.36,1), background .3s, border-color .3s',
      }}>

        {/* Logo */}
        <Link to="/" style={{
          fontFamily: "'Sora', sans-serif", fontWeight: 700,
          fontSize: '20px', letterSpacing: '-0.5px',
          textDecoration: 'none', color: logoColor,
          flexShrink: 0, transition: 'opacity .2s',
          marginRight: '20px',
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Channel<span className="accent-shift-color">ad</span>
        </Link>

        {/* Desktop nav links */}
        <div className="nav-desktop-links" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {/* Explorar with mega-menu */}
          <div ref={megaRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMegaOpen(!megaOpen)}
              style={{
                ...navLinkStyle,
                background: megaOpen ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)') : 'transparent',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '5px',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = linkHover; e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}
              onMouseLeave={e => { if (!megaOpen) { e.currentTarget.style.color = linkColor; e.currentTarget.style.background = 'transparent' } }}
            >
              Explorar
              <ChevronDownIcon size={14} />
            </button>

            {/* Mega menu dropdown */}
            {megaOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', left: '-20px',
                background: isDark ? '#111' : '#fff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                borderRadius: '14px', padding: '20px',
                width: '420px',
                boxShadow: isDark
                  ? '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)'
                  : '0 20px 60px rgba(0,0,0,0.12)',
                zIndex: 200,
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px',
              }}>
                <div>
                  <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: PURPLE, marginBottom: '10px' }}>
                    Categorias
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {EXPLORE_CATEGORIES.map(cat => (
                      <Link key={cat.label} to={`/marketplace?category=${encodeURIComponent(cat.param)}`}
                        onClick={() => setMegaOpen(false)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '8px 10px', borderRadius: '8px',
                          fontSize: '13px', color: isDark ? '#ccc' : '#444',
                          transition: 'background .15s, color .15s', textDecoration: 'none',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = isDark ? '#fff' : '#000' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isDark ? '#ccc' : '#444' }}
                      >
                        <span style={{ fontSize: '16px' }}>{cat.icon}</span>
                        {cat.label}
                      </Link>
                    ))}
                  </div>
                </div>

                <div>
                  <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: PURPLE, marginBottom: '10px' }}>
                    Plataformas
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {EXPLORE_PLATFORMS.map(plat => (
                      <Link key={plat.label} to={`/marketplace?platform=${encodeURIComponent(plat.label)}`}
                        onClick={() => setMegaOpen(false)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '8px 10px', borderRadius: '8px',
                          fontSize: '13px', color: isDark ? '#ccc' : '#444',
                          transition: 'background .15s, color .15s', textDecoration: 'none',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = isDark ? '#fff' : '#000' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isDark ? '#ccc' : '#444' }}
                      >
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: plat.color, flexShrink: 0 }} />
                        {plat.label}
                      </Link>
                    ))}
                  </div>

                  <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                    <Link to="/marketplace" onClick={() => setMegaOpen(false)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: '13px', fontWeight: 600, color: PURPLE,
                        padding: '6px 10px', borderRadius: '8px',
                        transition: 'background .15s', textDecoration: 'none',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = purpleAlpha(0.08)}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      Ver todo el marketplace
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Blog link — uses <a> for full page load (static HTML, not SPA) */}
          <a href="/blog" style={{
            textDecoration: 'none', padding: '7px 16px',
            fontSize: '13px', fontWeight: 600, borderRadius: '9px',
            color: '#b45309',
            background: isDark ? 'rgba(180,83,9,0.1)' : 'rgba(180,83,9,0.06)',
            border: `1px solid ${isDark ? 'rgba(180,83,9,0.2)' : 'rgba(180,83,9,0.12)'}`,
            transition: 'all .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(180,83,9,0.18)' : 'rgba(180,83,9,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(180,83,9,0.1)' : 'rgba(180,83,9,0.06)'; e.currentTarget.style.transform = 'none' }}
          >Blog</a>
        </div>

        {/* Global search bar */}
        <div className="nav-search-bar" style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 16px', minWidth: 0 }}>
          <GlobalSearchBar />
        </div>

        {/* Para Marcas / Para Creadores — always visible */}
        <div className="nav-audience-buttons" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <NavLink to="/para-anunciantes" style={{
            textDecoration: 'none', padding: '7px 16px',
            fontSize: '13px', fontWeight: 600, borderRadius: '9px',
            color: PURPLE,
            background: isDark ? 'rgba(139,92,246,0.1)' : 'rgba(124,58,237,0.06)',
            border: `1px solid ${isDark ? 'rgba(139,92,246,0.2)' : 'rgba(124,58,237,0.12)'}`,
            transition: 'all .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(139,92,246,0.18)' : 'rgba(124,58,237,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(139,92,246,0.1)' : 'rgba(124,58,237,0.06)'; e.currentTarget.style.transform = 'none' }}
          >Para Marcas</NavLink>
          <NavLink to="/para-canales" style={{
            textDecoration: 'none', padding: '7px 16px',
            fontSize: '13px', fontWeight: 600, borderRadius: '9px',
            color: GREEN,
            background: isDark ? 'rgba(37,211,102,0.1)' : 'rgba(37,211,102,0.06)',
            border: `1px solid ${isDark ? 'rgba(37,211,102,0.2)' : 'rgba(37,211,102,0.12)'}`,
            transition: 'all .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(37,211,102,0.18)' : 'rgba(37,211,102,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(37,211,102,0.1)' : 'rgba(37,211,102,0.06)'; e.currentTarget.style.transform = 'none' }}
          >Para Creadores</NavLink>
        </div>

        {/* Desktop right side */}
        <nav className="nav-desktop-right" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
          <button onClick={toggleTheme} title={isDark ? 'Modo claro' : 'Modo oscuro'} style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '15px', transition: 'background .2s, border-color .2s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}
          >
            {isDark ? '\u2600\uFE0F' : '\u{1F319}'}
          </button>

          {isAuthenticated ? (
            <>
              <NavLink to={dashboardPath}
                style={({ isActive }) => ({ ...navLinkStyle, color: isActive ? PURPLE : linkColor })}>
                Dashboard
              </NavLink>
              <span style={{ color: linkColor, padding: '6px 8px', fontSize: '13px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.nombre || user?.email?.split('@')[0] || user?.email}
              </span>
              <button onClick={onLogout} style={{
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
                borderRadius: '8px', padding: '7px 16px',
                background: 'transparent', cursor: 'pointer',
                fontSize: '13px', fontWeight: 500, color: linkColor,
                transition: 'color .15s, border-color .15s, background .15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = linkHover }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = linkColor }}
              >Salir</button>
            </>
          ) : (
            <>
              <NavLink to="/auth/login" style={navLinkStyle}
                onMouseEnter={e => e.currentTarget.style.color = linkHover}
                onMouseLeave={e => e.currentTarget.style.color = linkColor}
              >Iniciar sesion</NavLink>
              <NavLink to="/auth/register" className="cta-shift" style={{
                color: '#fff', textDecoration: 'none', padding: '8px 20px',
                borderRadius: '10px', fontSize: '14px', fontWeight: 600,
                transition: 'transform .15s',
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >Empezar gratis</NavLink>
            </>
          )}
        </nav>

        {/* Mobile: theme toggle + hamburger */}
        <div className="nav-mobile-buttons" style={{ display: 'none', alignItems: 'center', gap: '6px' }}>
          <button onClick={toggleTheme} style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '15px',
          }}>
            {isDark ? '\u2600\uFE0F' : '\u{1F319}'}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
            style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: mobileOpen ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') : 'transparent',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isDark ? '#f5f5f7' : '#1d1d1f',
              transition: 'background .15s',
            }}
          >
            {mobileOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          onClick={closeMobile}
          style={{
            position: 'fixed', inset: 0, top: '64px',
            background: 'rgba(0,0,0,0.4)',
            zIndex: 99, animation: 'fadeIn .2s ease',
          }}
        />
      )}

      {/* Mobile drawer */}
      <div
        className="nav-mobile-drawer"
        style={{
          position: 'fixed', top: '64px', right: 0,
          width: '100%', maxWidth: '320px',
          height: 'calc(100vh - 64px)',
          background: isDark ? '#0a0a0a' : '#fff',
          borderLeft: `1px solid ${navBorder}`,
          zIndex: 100,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform .3s cubic-bezier(.22,1,.36,1)',
          overflowY: 'auto', WebkitOverflowScrolling: 'touch',
          display: 'flex', flexDirection: 'column',
          padding: '8px 0',
        }}
      >
        {/* Audience CTAs at top of drawer */}
        <div style={{ padding: '8px 16px 16px', display: 'flex', gap: '8px' }}>
          <Link to="/para-anunciantes" onClick={closeMobile}
            style={{
              flex: 1, textAlign: 'center', padding: '12px 8px', borderRadius: '12px',
              fontSize: '13px', fontWeight: 600, textDecoration: 'none',
              color: PURPLE,
              background: isDark ? 'rgba(139,92,246,0.1)' : 'rgba(124,58,237,0.06)',
              border: `1px solid ${isDark ? 'rgba(139,92,246,0.2)' : 'rgba(124,58,237,0.12)'}`,
            }}>
            Para Marcas
          </Link>
          <Link to="/para-canales" onClick={closeMobile}
            style={{
              flex: 1, textAlign: 'center', padding: '12px 8px', borderRadius: '12px',
              fontSize: '13px', fontWeight: 600, textDecoration: 'none',
              color: GREEN,
              background: isDark ? 'rgba(37,211,102,0.1)' : 'rgba(37,211,102,0.06)',
              border: `1px solid ${isDark ? 'rgba(37,211,102,0.2)' : 'rgba(37,211,102,0.12)'}`,
            }}>
            Para Creadores
          </Link>
        </div>

        <div style={{ height: '1px', background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', margin: '0 16px 8px' }} />

        {/* Nav links */}
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: PURPLE, padding: '8px 12px' }}>
            Explorar
          </p>
          {EXPLORE_CATEGORIES.map(cat => (
            <Link key={cat.label} to={`/marketplace?category=${encodeURIComponent(cat.param)}`}
              onClick={closeMobile}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 12px', borderRadius: '10px',
                fontSize: '14px', color: isDark ? '#ccc' : '#444',
                textDecoration: 'none', transition: 'background .15s',
              }}
            >
              <span style={{ fontSize: '16px' }}>{cat.icon}</span>
              {cat.label}
            </Link>
          ))}

          <div style={{ height: '1px', background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', margin: '8px 12px' }} />

          <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: PURPLE, padding: '8px 12px' }}>
            Plataformas
          </p>
          {EXPLORE_PLATFORMS.map(plat => (
            <Link key={plat.label} to={`/marketplace?platform=${encodeURIComponent(plat.label)}`}
              onClick={closeMobile}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 12px', borderRadius: '10px',
                fontSize: '14px', color: isDark ? '#ccc' : '#444',
                textDecoration: 'none',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: plat.color, flexShrink: 0 }} />
              {plat.label}
            </Link>
          ))}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Auth section at bottom */}
        <div style={{ padding: '16px', borderTop: `1px solid ${navBorder}` }}>
          {isAuthenticated ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: linkColor, padding: '4px 0' }}>
                {user?.nombre || user?.email?.split('@')[0] || user?.email}
              </span>
              <Link to={dashboardPath} onClick={closeMobile}
                style={{
                  display: 'block', textAlign: 'center',
                  padding: '12px', borderRadius: '10px',
                  background: purpleAlpha(0.1), color: PURPLE,
                  fontSize: '14px', fontWeight: 600, textDecoration: 'none',
                }}>
                Dashboard
              </Link>
              <button onClick={onLogout} style={{
                width: '100%', padding: '12px', borderRadius: '10px',
                border: `1px solid ${navBorder}`, background: 'transparent',
                fontSize: '14px', fontWeight: 500, color: linkColor,
                cursor: 'pointer',
              }}>
                Salir
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link to="/auth/register" onClick={closeMobile}
                className="cta-shift"
                style={{
                  display: 'block', textAlign: 'center',
                  color: '#fff', padding: '13px', borderRadius: '10px',
                  fontSize: '14px', fontWeight: 600, textDecoration: 'none',
                }}>
                Empezar gratis
              </Link>
              <Link to="/auth/login" onClick={closeMobile}
                style={{
                  display: 'block', textAlign: 'center',
                  padding: '12px', borderRadius: '10px',
                  border: `1px solid ${navBorder}`,
                  fontSize: '14px', fontWeight: 500, color: linkColor,
                  textDecoration: 'none',
                }}>
                Iniciar sesion
              </Link>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @media (max-width: 768px) {
          .nav-desktop-links { display: none !important; }
          .nav-desktop-right { display: none !important; }
          .nav-mobile-buttons { display: flex !important; }
          .nav-audience-buttons { display: none !important; }
        }
      `}</style>
    </>
  )
}
