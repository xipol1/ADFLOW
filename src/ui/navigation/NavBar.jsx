import React, { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import GlobalSearchBar from '../components/GlobalSearchBar'

function MenuIcon({ size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
}
function XIcon({ size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
}

const NAV_LINKS = [
  { to: '/explore', label: 'Explorar' },
  { to: '/rankings', label: 'Rankings' },
]

const NAV_CATEGORIES = [
  { icon: '💰', label: 'Finanzas', to: '/explore?categories=finanzas' },
  { icon: '📈', label: 'Marketing', to: '/explore?categories=marketing' },
  { icon: '🤖', label: 'Tech', to: '/explore?categories=tecnologia' },
  { icon: '₿', label: 'Crypto', to: '/explore?categories=cripto' },
  { icon: '🏥', label: 'Salud', to: '/explore?categories=salud' },
  { icon: '📚', label: 'Educacion', to: '/explore?categories=educacion' },
]

const NAV_PLATFORMS = [
  { icon: '✈️', label: 'Telegram', color: '#2aabee', to: '/explore?platforms=telegram' },
  { icon: '💬', label: 'WhatsApp', color: '#25d366', to: '/explore?platforms=whatsapp' },
  { icon: '🎮', label: 'Discord', color: '#5865f2', to: '/explore?platforms=discord' },
  { icon: '📧', label: 'Newsletter', color: '#f59e0b', to: '/explore?platforms=newsletter' },
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

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      if (mobileOpen) { lastScrollY.current = y; return }
      if (y < 80) setHeaderVisible(true)
      else if (y > lastScrollY.current + 10) { setHeaderVisible(false); setMegaOpen(false) }
      else if (y < lastScrollY.current - 10) setHeaderVisible(true)
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

  return (
    <>
      <header
        className="nav-header"
        style={{
          display: 'flex', alignItems: 'center',
          padding: '0 clamp(16px, 4vw, 40px)', height: '56px',
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, zIndex: 100,
          gap: '8px',
          transform: headerVisible ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'transform .3s ease',
        }}
      >
        {/* Logo */}
        <Link to="/" style={{
          fontFamily: "var(--font-mono)", fontWeight: 500,
          fontSize: '16px', letterSpacing: '-0.3px',
          textDecoration: 'none', color: 'var(--text)',
          flexShrink: 0, marginRight: '20px',
        }}>
          Channel<span style={{ color: 'var(--accent)' }}>ad</span>
        </Link>

        {/* Desktop nav */}
        <div className="nav-desktop-links" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to} to={to}
              style={({ isActive }) => ({
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                textDecoration: 'none', padding: '6px 12px', fontSize: '13px',
                fontWeight: 500, borderRadius: '6px', transition: 'color .15s',
              })}
            >
              {label}
            </NavLink>
          ))}

          {/* Mega menu trigger */}
          <div ref={megaRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMegaOpen(!megaOpen)}
              style={{
                color: 'var(--text-secondary)', padding: '6px 12px', fontSize: '13px',
                fontWeight: 500, borderRadius: '6px', border: 'none', cursor: 'pointer',
                background: megaOpen ? 'var(--bg3)' : 'transparent',
                display: 'flex', alignItems: 'center', gap: '4px', transition: 'all .15s',
              }}
            >
              Categorias
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
            </button>

            {megaOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: '-12px',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '12px', padding: '16px',
                width: '380px', boxShadow: 'var(--shadow-xl)', zIndex: 200,
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
              }}>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>Categorias</p>
                  {NAV_CATEGORIES.map((cat) => (
                    <Link key={cat.label} to={cat.to} onClick={() => setMegaOpen(false)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors hover:bg-[var(--bg3)]"
                      style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                    >
                      <span>{cat.icon}</span> {cat.label}
                    </Link>
                  ))}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>Plataformas</p>
                  {NAV_PLATFORMS.map((p) => (
                    <Link key={p.label} to={p.to} onClick={() => setMegaOpen(false)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors hover:bg-[var(--bg3)]"
                      style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} /> {p.label}
                    </Link>
                  ))}
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                    <Link to="/explore" onClick={() => setMegaOpen(false)}
                      className="flex items-center gap-1 px-2 py-1 text-[13px] font-semibold"
                      style={{ color: 'var(--accent)', textDecoration: 'none' }}
                    >
                      Ver todos los canales →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          <a href="/blog" className="text-[13px] font-medium px-3 py-1.5 rounded-md" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Blog</a>
        </div>

        {/* Search */}
        <div className="nav-search-bar" style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 12px', minWidth: 0 }}>
          <GlobalSearchBar />
        </div>

        {/* Audience buttons */}
        <div className="nav-audience-buttons" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <NavLink to="/para-anunciantes" className="text-[13px] font-semibold px-3 py-1.5 rounded-lg"
            style={{ color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', textDecoration: 'none', transition: 'all .15s', whiteSpace: 'nowrap' }}
          >Para Marcas</NavLink>
          <NavLink to="/para-canales" className="text-[13px] font-semibold px-3 py-1.5 rounded-lg"
            style={{ color: '#25d366', background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.18)', textDecoration: 'none', transition: 'all .15s', whiteSpace: 'nowrap' }}
          >Para Creadores</NavLink>
        </div>

        {/* Right side */}
        <nav className="nav-desktop-right" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button onClick={toggleTheme} title={isDark ? 'Modo claro' : 'Modo oscuro'} style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'var(--bg3)', border: '1px solid var(--border)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', transition: 'all .15s',
          }}>
            {isDark ? '☀️' : '🌙'}
          </button>

          {isAuthenticated ? (
            <>
              <NavLink to={dashboardPath}
                className="text-[13px] font-medium px-3 py-1.5 rounded-md"
                style={({ isActive }) => ({ color: isActive ? 'var(--accent)' : 'var(--text-secondary)', textDecoration: 'none' })}
              >Dashboard</NavLink>
              <button onClick={onLogout} className="text-[13px] font-medium px-3 py-1.5 rounded-md"
                style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
              >Salir</button>
            </>
          ) : (
            <>
              <Link to="/auth/login" className="text-[13px] font-medium px-3 py-1.5 rounded-md"
                style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
              >Iniciar sesion</Link>
              <Link to="/auth/register" className="text-[13px] font-semibold px-4 py-2 rounded-lg"
                style={{ background: 'var(--accent)', color: '#080C10', textDecoration: 'none', transition: 'all .15s' }}
              >Registrarse</Link>
            </>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button className="nav-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', padding: '4px' }}
        >
          {mobileOpen ? <XIcon /> : <MenuIcon />}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[99]">
          <div className="absolute inset-0 bg-black/50" onClick={closeMobile} />
          <div className="absolute top-0 right-0 w-[280px] h-full overflow-y-auto p-5 flex flex-col gap-1"
            style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}
          >
            <div className="flex justify-end mb-4">
              <button onClick={closeMobile} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><XIcon /></button>
            </div>

            {NAV_LINKS.map(({ to, label }) => (
              <Link key={to} to={to} onClick={closeMobile}
                className="block px-3 py-2.5 rounded-md text-[15px] font-medium"
                style={{ color: 'var(--text)', textDecoration: 'none' }}
              >{label}</Link>
            ))}
            <a href="/blog" onClick={closeMobile} className="block px-3 py-2.5 rounded-md text-[15px] font-medium" style={{ color: 'var(--text)', textDecoration: 'none' }}>Blog</a>

            <div className="my-3" style={{ borderTop: '1px solid var(--border)' }} />

            <p className="px-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Categorias</p>
            {NAV_CATEGORIES.map((cat) => (
              <Link key={cat.label} to={cat.to} onClick={closeMobile}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm"
                style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
              ><span>{cat.icon}</span> {cat.label}</Link>
            ))}

            <div className="my-3" style={{ borderTop: '1px solid var(--border)' }} />

            {isAuthenticated ? (
              <>
                <Link to={dashboardPath} onClick={closeMobile} className="block px-3 py-2.5 rounded-md text-[15px] font-medium" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Mi Dashboard</Link>
                <button onClick={onLogout} className="text-left px-3 py-2.5 rounded-md text-[15px] font-medium" style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}>Cerrar sesion</button>
              </>
            ) : (
              <>
                <Link to="/auth/login" onClick={closeMobile} className="block px-3 py-2.5 rounded-md text-[15px] font-medium" style={{ color: 'var(--text)', textDecoration: 'none' }}>Iniciar sesion</Link>
                <Link to="/auth/register" onClick={closeMobile} className="block px-3 py-2.5 rounded-lg text-[15px] font-semibold text-center mt-2" style={{ background: 'var(--accent)', color: '#080C10', textDecoration: 'none' }}>Registrarse</Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile styles */}
      <style>{`
        @media (max-width: 768px) {
          .nav-desktop-links, .nav-desktop-right, .nav-search-bar, .nav-audience-buttons { display: none !important; }
          .nav-mobile-toggle { display: flex !important; }
        }
      `}</style>
    </>
  )
}
