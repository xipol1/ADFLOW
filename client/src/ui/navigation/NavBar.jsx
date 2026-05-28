import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  Menu as MenuIcon, X as XIcon, ChevronDown, ChevronRight, ArrowRight,
  Search, Sun, Moon, LogOut, LayoutDashboard,
  TrendingUp, Megaphone, Cpu, Coins, HeartPulse, BookOpen,
  Sparkles, Wallet, ShieldCheck, Lock,
  BarChart3, Calculator, FileSearch, FileText,
  HelpCircle, AtSign, Layers, Briefcase,
} from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'

// ─── Top-level mega menu definitions ─────────────────────────────────
// Each mega is rendered with up to 4 columns: 3 content columns +
// optionally a CTA panel pinned on the right. Sections are typed so the
// renderer can pick the right visual treatment (icon row, dot row, etc).

const MEGA_CREATORS = {
  cols: [
    {
      label: 'Cómo monetizar',
      items: [
        { label: 'Para creadores',  to: '/para-canales',  Icon: Wallet },
        { label: '0% comisión',     to: '/para-canales#comision', Icon: Sparkles },
        { label: 'Pago en escrow',  to: '/para-canales#escrow', Icon: ShieldCheck },
        { label: 'Verificación',    to: '/para-canales#verificacion', Icon: Lock },
      ],
    },
    {
      label: 'Por plataforma',
      items: [
        { label: 'WhatsApp',   to: '/whatsapp',                       dot: '#25d366' },
        { label: 'Telegram',   to: '/blog/monetizar-canal-telegram-espana', dot: '#2aabee' },
        { label: 'Discord',    to: '/blog/como-monetizar-servidor-discord', dot: '#5865f2' },
        { label: 'Newsletter', to: '/blog/monetizar-newsletter-substack-vs-propia', dot: '#f59e0b' },
      ],
    },
    {
      label: 'Herramientas',
      items: [
        { label: 'Calculadora de precios', to: '/blog/calculadora-precios-publicidad', Icon: Calculator },
        { label: 'Casos de éxito',         to: '/blog/casos-exito-monetizar-telegram-channelad', Icon: FileText },
        { label: 'Media kit',              to: '/blog/media-kit-canal-telegram', Icon: Briefcase },
      ],
    },
  ],
  cta: {
    eyebrow: 'Pre-registro · cohorte septiembre',
    title: 'Channel One',
    body: '1.000 slots prioritarios · 0% comisión primer trimestre.',
    to: '/channel-one',
    label: 'Reservar slot',
    accent: true,
  },
}

const MEGA_ADVERTISERS = {
  cols: [
    {
      label: 'Cómo anunciarte',
      items: [
        { label: 'Para anunciantes',  to: '/para-anunciantes',           Icon: Megaphone },
        { label: 'Cómo funciona',     to: '/para-anunciantes#como-funciona', Icon: Sparkles },
        { label: 'Canales verificados', to: '/audit',                    Icon: ShieldCheck },
        { label: 'Pago en escrow',    to: '/para-anunciantes#escrow',    Icon: Lock },
      ],
    },
    {
      label: 'Por plataforma',
      items: [
        { label: 'Telegram',   to: '/blog/como-anunciarse-en-telegram',  dot: '#2aabee' },
        { label: 'WhatsApp',   to: '/blog/como-anunciarse-en-whatsapp',  dot: '#25d366' },
        { label: 'Discord',    to: '/blog/publicidad-en-discord-guia-completa', dot: '#5865f2' },
        { label: 'Newsletter', to: '/blog/publicidad-newsletters-espana-guia',  dot: '#f59e0b' },
      ],
    },
    {
      label: 'Herramientas para marcas',
      items: [
        { label: 'Audit gratis',     to: '/audit',         Icon: FileSearch },
        { label: 'Benchmark CPM',    to: '/benchmark',     Icon: TrendingUp },
        { label: 'Niche heatmap',    to: '/herramientas',  Icon: Layers },
        { label: 'Comparativas',     to: '/blog?category=Comparativas', Icon: FileText },
      ],
    },
  ],
  cta: {
    eyebrow: 'Plan Free · 20% comisión',
    title: 'Empieza gratis',
    body: 'Sin tarjeta. Pro a 15% con 14 días gratis cuando crezcas.',
    to: '/auth/register',
    label: 'Crear cuenta',
  },
}

const MEGA_RESOURCES = {
  cols: [
    {
      label: 'Blog & guías',
      items: [
        { label: 'Todo el blog',  to: '/blog',                            Icon: BookOpen },
        { label: 'Guías',         to: '/blog?category=Guias',             Icon: FileText },
        { label: 'Comparativas',  to: '/blog?category=Comparativas',      Icon: Layers },
        { label: 'Casos de éxito', to: '/blog/casos-exito-monetizar-telegram-channelad', Icon: Sparkles },
      ],
    },
    {
      label: 'Datos & herramientas',
      items: [
        { label: 'Catálogo herramientas', to: '/herramientas',  Icon: Layers },
        { label: 'Benchmark CPM',         to: '/benchmark',     Icon: TrendingUp },
        { label: 'Calculadora de precios', to: '/blog/calculadora-precios-publicidad', Icon: Calculator },
        { label: 'Audit gratis',          to: '/audit',         Icon: FileSearch },
      ],
    },
    {
      label: 'Sobre Channelad',
      items: [
        { label: 'Qué es Channelad', to: '/que-es-channelad',  Icon: HelpCircle },
        { label: 'Rankings',         to: '/rankings',          Icon: BarChart3 },
        { label: 'Soporte',          to: '/soporte',           Icon: AtSign },
      ],
    },
  ],
  cta: {
    eyebrow: 'Cohorte exclusiva',
    title: 'Founding cohort',
    body: '150 plazas con 18% de comisión vitalicio.',
    to: '/founding',
    label: 'Ver founding',
  },
}

const TOP_NAV = [
  { id: 'creators',    label: 'Para creadores',    mega: MEGA_CREATORS },
  { id: 'advertisers', label: 'Para anunciantes',  mega: MEGA_ADVERTISERS },
  { id: 'resources',   label: 'Recursos',          mega: MEGA_RESOURCES },
  { id: 'pricing',     label: 'Pricing',           to: '/pricing' },
]

// ─── Mega menu component ────────────────────────────────────────────
function MegaMenu({ entry, isOpen, onOpen, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    const onEsc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [isOpen, onClose])

  if (entry.to) {
    return (
      <NavLink
        to={entry.to}
        style={({ isActive }) => ({
          color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
          textDecoration: 'none', padding: '6px 12px', fontSize: 13,
          fontWeight: 500, borderRadius: 6, transition: 'color .15s',
        })}
      >
        {entry.label}
      </NavLink>
    )
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => (isOpen ? onClose() : onOpen())}
        aria-expanded={isOpen}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          color: isOpen ? 'var(--text)' : 'var(--text-secondary)',
          padding: '6px 12px', fontSize: 13, fontWeight: 500,
          borderRadius: 6, border: 'none', cursor: 'pointer',
          background: isOpen ? 'var(--bg3)' : 'transparent',
          transition: 'all .15s',
        }}
      >
        {entry.label}
        <ChevronDown size={12} strokeWidth={2.4} style={{
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform .2s',
        }} />
      </button>

      {isOpen && (
        <div
          role="menu"
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: -16,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 18,
            width: entry.mega.cta ? 720 : 560,
            boxShadow: '0 24px 60px -16px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.06)',
            zIndex: 200,
            display: 'grid',
            gridTemplateColumns: entry.mega.cta ? 'repeat(3, 1fr) 1.05fr' : 'repeat(3, 1fr)',
            gap: 18,
          }}
        >
          {entry.mega.cols.map((col) => (
            <div key={col.label}>
              <p style={{
                fontSize: 10, fontWeight: 700, color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: '0.12em',
                margin: '0 0 10px',
              }}>
                {col.label}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {col.items.map((it) => (
                  <Link
                    key={it.label} to={it.to} onClick={onClose}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 9,
                      padding: '7px 8px', borderRadius: 8,
                      fontSize: 13, color: 'var(--text)', textDecoration: 'none',
                      transition: 'background .15s, color .15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg3)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    {it.Icon ? (
                      <it.Icon size={14} strokeWidth={2} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                    ) : it.dot ? (
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', background: it.dot, flexShrink: 0,
                      }} />
                    ) : null}
                    <span>{it.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {entry.mega.cta && <MegaCTA cta={entry.mega.cta} onClose={onClose} />}
        </div>
      )}
    </div>
  )
}

function MegaCTA({ cta, onClose }) {
  const accent = cta.accent
  return (
    <Link
      to={cta.to} onClick={onClose}
      style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: 18, borderRadius: 12, textDecoration: 'none',
        background: accent ? 'rgba(37,211,102,0.08)' : 'var(--bg2)',
        border: `1px solid ${accent ? 'rgba(37,211,102,0.30)' : 'var(--border)'}`,
        color: 'var(--text)', minHeight: 140,
        transition: 'transform .2s, box-shadow .2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = accent
          ? '0 12px 28px -10px rgba(37,211,102,0.30)'
          : '0 12px 28px -10px rgba(0,0,0,0.10)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div>
        {cta.eyebrow && (
          <p style={{
            fontSize: 10, fontWeight: 700, color: '#1ea952',
            textTransform: 'uppercase', letterSpacing: '0.12em',
            margin: '0 0 6px',
          }}>{cta.eyebrow}</p>
        )}
        <h4 style={{
          fontSize: 15, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.01em',
        }}>{cta.title}</h4>
        <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
          {cta.body}
        </p>
      </div>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        marginTop: 12, fontSize: 12, fontWeight: 600,
        color: accent ? '#1ea952' : 'var(--accent)',
      }}>
        {cta.label} <ArrowRight size={13} strokeWidth={2.4} />
      </span>
    </Link>
  )
}

// ─── User menu (auth) — replaces theme toggle + dashboard + logout ──
function UserMenu({ user, dashboardPath, onLogout, isDark, toggleTheme }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const initials = (user?.name || user?.email || '?').slice(0, 2).toUpperCase()

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Cuenta"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '4px 10px 4px 4px', borderRadius: 999,
          background: open ? 'var(--bg3)' : 'transparent',
          border: '1px solid var(--border)', cursor: 'pointer',
          transition: 'background .15s',
        }}
      >
        <span style={{
          width: 26, height: 26, borderRadius: '50%',
          background: 'var(--accent)', color: '#080C10',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700,
        }}>{initials}</span>
        <ChevronDown size={12} strokeWidth={2.4} style={{ color: 'var(--muted)' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 8, width: 220, zIndex: 200,
          boxShadow: '0 16px 40px -12px rgba(0,0,0,0.18)',
        }}>
          {user?.email && (
            <div style={{
              padding: '8px 10px 10px', borderBottom: '1px solid var(--border)', marginBottom: 6,
            }}>
              <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
                {user.name || 'Mi cuenta'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
            </div>
          )}
          <Link to={dashboardPath} onClick={() => setOpen(false)} style={menuItemStyle}>
            <LayoutDashboard size={14} strokeWidth={2} /> Dashboard
          </Link>
          <button onClick={() => { toggleTheme(); }} style={{ ...menuItemStyle, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            {isDark ? <Sun size={14} strokeWidth={2} /> : <Moon size={14} strokeWidth={2} />}
            {isDark ? 'Modo claro' : 'Modo oscuro'}
          </button>
          <button onClick={() => { setOpen(false); onLogout() }} style={{ ...menuItemStyle, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', color: '#dc2626' }}>
            <LogOut size={14} strokeWidth={2} /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

const menuItemStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 9,
  padding: '8px 10px', borderRadius: 8, fontSize: 13,
  color: 'var(--text)', textDecoration: 'none',
  transition: 'background .12s',
}

// ─── Mobile drawer with accordion sections ──────────────────────────
function MobileDrawer({ open, onClose, topNav, isAuthenticated, dashboardPath, onLogout }) {
  const [expanded, setExpanded] = useState(null) // id of expanded section
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[99]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="absolute top-0 right-0 h-full overflow-y-auto"
        style={{
          width: 'min(340px, 100vw)', background: 'var(--surface)',
          borderLeft: '1px solid var(--border)', padding: 18,
          display: 'flex', flexDirection: 'column', gap: 4,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button onClick={onClose} aria-label="Cerrar menú" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', padding: 4,
          }}><XIcon /></button>
        </div>

        {/* Channel One pill — always at top, the most active promo */}
        <Link to="/channel-one" onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 14px', borderRadius: 12, marginBottom: 10,
            background: 'rgba(37,211,102,0.10)', border: '1px solid rgba(37,211,102,0.30)',
            color: '#1ea952', textDecoration: 'none', fontWeight: 600, fontSize: 15,
          }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: '#25d366',
            animation: 'nav-co-pulse 1.8s infinite', flexShrink: 0,
          }} />
          Channel One
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, opacity: 0.85 }}>
            Pre-registro
          </span>
        </Link>

        {/* Marketplace — prominent, mirrors the left desktop button */}
        <Link to="/marketplace" onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 14px', borderRadius: 12, marginBottom: 12,
            background: 'var(--bg3)', border: '1px solid var(--border)',
            color: 'var(--text)', textDecoration: 'none', fontWeight: 600, fontSize: 15,
          }}>
          <Search size={16} strokeWidth={2.2} style={{ color: 'var(--muted)' }} />
          Marketplace
          <ArrowRight size={14} strokeWidth={2.4} style={{ marginLeft: 'auto', color: 'var(--muted)' }} />
        </Link>

        {topNav.map((entry) => {
          if (entry.to) {
            return (
              <Link key={entry.id} to={entry.to} onClick={onClose}
                style={{ padding: '11px 14px', fontSize: 15, fontWeight: 500, color: 'var(--text)', textDecoration: 'none' }}
              >{entry.label}</Link>
            )
          }
          const isExp = expanded === entry.id
          return (
            <div key={entry.id} style={{ borderRadius: 8, overflow: 'hidden' }}>
              <button onClick={() => setExpanded(isExp ? null : entry.id)}
                aria-expanded={isExp}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 14px', background: 'transparent', border: 'none',
                  fontSize: 15, fontWeight: 500, color: 'var(--text)', cursor: 'pointer', textAlign: 'left',
                }}>
                {entry.label}
                <ChevronRight size={14} strokeWidth={2.4}
                  style={{ transform: isExp ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .2s', color: 'var(--muted)' }} />
              </button>
              {isExp && (
                <div style={{ paddingLeft: 14, paddingBottom: 8, borderLeft: '2px solid var(--border)', marginLeft: 14 }}>
                  {entry.mega.cols.map((col) => (
                    <div key={col.label} style={{ marginBottom: 6 }}>
                      <p style={{
                        fontSize: 10, fontWeight: 700, color: 'var(--muted)',
                        textTransform: 'uppercase', letterSpacing: '0.1em', margin: '8px 0 4px 8px',
                      }}>{col.label}</p>
                      {col.items.map((it) => (
                        <Link key={it.label} to={it.to} onClick={onClose}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '7px 8px', fontSize: 13, color: 'var(--text-secondary)',
                            textDecoration: 'none', width: '100%',
                          }}
                        >
                          {it.Icon ? <it.Icon size={13} strokeWidth={2} style={{ color: 'var(--muted)' }} />
                            : it.dot ? <span style={{ width: 7, height: 7, borderRadius: '50%', background: it.dot }} />
                            : null}
                          {it.label}
                        </Link>
                      ))}
                    </div>
                  ))}
                  {entry.mega.cta && (
                    <Link to={entry.mega.cta.to} onClick={onClose}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        margin: '6px 0 10px 8px', fontSize: 12, fontWeight: 600,
                        color: entry.mega.cta.accent ? '#1ea952' : 'var(--accent)',
                        textDecoration: 'none',
                      }}>
                      {entry.mega.cta.label} <ArrowRight size={12} strokeWidth={2.4} />
                    </Link>
                  )}
                </div>
              )}
            </div>
          )
        })}

        <div style={{ borderTop: '1px solid var(--border)', margin: '14px 0 10px' }} />

        {isAuthenticated ? (
          <>
            <Link to={dashboardPath} onClick={onClose}
              style={{ padding: '11px 14px', fontSize: 15, fontWeight: 500, color: 'var(--accent)', textDecoration: 'none' }}
            >Mi Dashboard</Link>
            <button onClick={onLogout}
              style={{
                padding: '11px 14px', fontSize: 15, fontWeight: 500,
                color: 'var(--text-secondary)', background: 'none', border: 'none',
                cursor: 'pointer', textAlign: 'left', width: '100%',
              }}
            >Cerrar sesión</button>
          </>
        ) : (
          <>
            <Link to="/auth/login" onClick={onClose}
              style={{ padding: '11px 14px', fontSize: 15, fontWeight: 500, color: 'var(--text)', textDecoration: 'none' }}
            >Iniciar sesión</Link>
            <Link to="/auth/register" onClick={onClose}
              style={{
                marginTop: 6, padding: '12px 14px', borderRadius: 12, textAlign: 'center',
                background: 'var(--accent)', color: '#080C10',
                fontSize: 15, fontWeight: 600, textDecoration: 'none',
              }}>Registrarse</Link>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main NavBar ─────────────────────────────────────────────────────
export default function NavBar() {
  const { isAuthenticated, user, logout, isCreador, isAdmin } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const [isDark, setIsDark] = useState(false)
  const [openMega, setOpenMega] = useState(null) // id of open mega
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('channelad-theme')
    const dark = saved === 'dark'
    setIsDark(dark)
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [])

  // Subtle scroll elevation (Stripe pattern), no hide-on-scroll.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  // Close megas on route change.
  useEffect(() => { setOpenMega(null); setMobileOpen(false) }, [pathname])

  const toggleTheme = useCallback(() => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.dataset.theme = next ? 'dark' : 'light'
    localStorage.setItem('channelad-theme', next ? 'dark' : 'light')
  }, [isDark])

  const onLogout = () => { logout(); navigate('/'); setMobileOpen(false) }
  const dashboardPath = isCreador ? '/creator' : isAdmin ? '/dashboard' : '/advertiser'

  return (
    <>
      <header
        className="nav-header"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          padding: '0 clamp(16px, 4vw, 40px)', height: 60,
          background: 'var(--bg)',
          borderBottom: `1px solid ${scrolled ? 'var(--border)' : 'transparent'}`,
          boxShadow: scrolled ? '0 1px 0 var(--border), 0 6px 20px -16px rgba(0,0,0,0.15)' : 'none',
          position: 'sticky', top: 0, zIndex: 100,
          gap: 16,
          transition: 'border-color .2s, box-shadow .2s',
        }}
      >
        {/* ─── LEFT: Logo + Marketplace ─── */}
        <div className="nav-left" style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0 }}>
          <Link to="/" aria-label="Channelad"
            style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}
          >
            <img src="/logo.svg" alt="Channelad" style={{ height: 26, width: 'auto', display: 'block' }} />
          </Link>

          <NavLink to="/marketplace"
            className="nav-marketplace-btn"
            style={({ isActive }) => ({
              display: 'inline-flex', alignItems: 'center', gap: 7,
              color: isActive ? 'var(--accent)' : 'var(--text)',
              textDecoration: 'none', padding: '6px 14px',
              fontSize: 13, fontWeight: 600,
              borderRadius: 8,
              background: isActive ? 'var(--accent-dim)' : 'var(--bg3)',
              border: `1px solid ${isActive ? 'var(--accent-border)' : 'var(--border)'}`,
              transition: 'background .15s, border-color .15s, color .15s',
              whiteSpace: 'nowrap',
            })}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-border)' }}
            onMouseLeave={(e) => {
              const active = e.currentTarget.getAttribute('aria-current') === 'page'
              e.currentTarget.style.borderColor = active ? 'var(--accent-border)' : 'var(--border)'
            }}
          >
            <Search size={13} strokeWidth={2.2} style={{ color: 'var(--muted)' }} />
            Marketplace
          </NavLink>
        </div>

        {/* ─── CENTER: top-level mega menus ─── */}
        <nav className="nav-desktop-links" aria-label="Principal"
          style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}
        >
          {TOP_NAV.map((entry) => (
            <MegaMenu
              key={entry.id} entry={entry}
              isOpen={openMega === entry.id}
              onOpen={() => setOpenMega(entry.id)}
              onClose={() => setOpenMega(null)}
            />
          ))}
        </nav>

        {/* ─── RIGHT: Channel One pill + search + auth ─── */}
        <div className="nav-right-cluster" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          justifyContent: 'flex-end', minWidth: 0,
        }}>
          <NavLink to="/channel-one"
            className="nav-channel-one"
            style={({ isActive }) => ({
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px 6px 10px', fontSize: 13, fontWeight: 600,
              color: '#1ea952',
              background: isActive ? 'rgba(37,211,102,0.20)' : 'rgba(37,211,102,0.10)',
              border: '1px solid rgba(37,211,102,0.30)',
              borderRadius: 999, textDecoration: 'none',
              transition: 'background .15s',
              whiteSpace: 'nowrap', flexShrink: 0,
            })}
          >
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: '#25d366',
              animation: 'nav-co-pulse 1.8s infinite', flexShrink: 0,
            }} />
            Channel One
          </NavLink>

          <nav className="nav-desktop-right" aria-label="Cuenta"
            style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
          >
            {isAuthenticated ? (
              <UserMenu
                user={user}
                dashboardPath={dashboardPath}
                onLogout={onLogout}
                isDark={isDark} toggleTheme={toggleTheme}
              />
            ) : (
              <>
                <Link to="/auth/login"
                  style={{
                    fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)',
                    textDecoration: 'none', padding: '6px 12px', borderRadius: 6,
                  }}
                >Iniciar sesión</Link>
                <Link to="/auth/register"
                  style={{
                    fontSize: 13, fontWeight: 600, color: '#080C10',
                    background: 'var(--accent)', textDecoration: 'none',
                    padding: '8px 16px', borderRadius: 10, transition: 'transform .15s, box-shadow .15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 18px -8px var(--accent)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
                >Registrarse</Link>
              </>
            )}
          </nav>

          {/* Mobile hamburger lives in right cluster on mobile */}
          <button className="nav-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            style={{
              display: 'none', background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text)', padding: 4,
            }}
          >
            {mobileOpen ? <XIcon /> : <MenuIcon />}
          </button>
        </div>
      </header>

      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        topNav={TOP_NAV}
        isAuthenticated={isAuthenticated}
        dashboardPath={dashboardPath}
        onLogout={onLogout}
      />

      <style>{`
        @keyframes nav-co-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(37,211,102,0.6); }
          70%  { box-shadow: 0 0 0 5px rgba(37,211,102,0); }
          100% { box-shadow: 0 0 0 0 rgba(37,211,102,0); }
        }
        @media (max-width: 1024px) {
          .nav-channel-one { display: none !important; }
        }
        @media (max-width: 900px) {
          .nav-marketplace-btn { display: none !important; }
        }
        @media (max-width: 768px) {
          .nav-header {
            display: flex !important;
            justify-content: space-between !important;
          }
          .nav-desktop-links, .nav-desktop-right { display: none !important; }
          .nav-mobile-toggle { display: flex !important; }
        }
      `}</style>
    </>
  )
}
