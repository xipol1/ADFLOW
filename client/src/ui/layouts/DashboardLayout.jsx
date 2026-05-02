/**
 * DashboardLayout — Unified layout for Advertiser & Creator dashboards.
 * Parameterized by role. Includes responsive mobile drawer, notifications,
 * collapsible sidebar, breadcrumbs, and premium interactions.
 */
import React, { useState, useEffect, useRef, useCallback, Component } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Search, Zap, Megaphone, Wallet, BarChart3,
  Settings, LogOut, Menu, Bell, X, ChevronRight, ChevronDown, ShieldAlert,
  Users, AlertTriangle, Radio, Inbox, Sun, Moon,
  Shield, Database, DollarSign, FileText, HelpCircle, Plus,
  Columns3, Map, Calculator, Target, ClipboardList, Calendar,
  Activity, Filter, Bookmark, Layers, FlaskConical,
  Rocket, Hash, PieChart, GitCompare, User as UserIcon, MessageSquare,
} from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import apiService from '../../services/api'
import { relTime } from '../utils/relTime'
import CommandPalette from '../components/CommandPalette'
import InboxBell from '../components/InboxBell'
import GlobalSearchBar from '../components/GlobalSearchBar'
import EmailVerificationBanner from '../components/EmailVerificationBanner'
import FiscalDataBanner from '../components/FiscalDataBanner'
import OnboardingWizard, { shouldShowOnboarding, resetOnboarding } from '../components/OnboardingWizard'
import {
  PURPLE, purpleAlpha, GREEN, greenAlpha,
  FONT_BODY, FONT_DISPLAY, EASE, NOTIF_TYPE,
} from '../theme/tokens'


// ─── Constants ────────────────────────────────────────────────────────────────
const MOBILE_BP = 768
const SIDEBAR_W = 240
const SIDEBAR_COLLAPSED_W = 68
const HEADER_H = 56

// ─── Role configuration ──────────────────────────────────────────────────────
// fullOnly: true = only visible for full-access users (demo/admin accounts)
const ROLE_CONFIG = {
  advertiser: {
    color: PURPLE,
    alpha: purpleAlpha,
    label: 'Anunciante',
    basePath: '/advertiser',
    nav: [
      { group: null, items: [
        { path: '',          icon: LayoutDashboard, label: 'Dashboard',    end: true },
        { path: '/explore',  icon: Search,          label: 'Explorar',     fullOnly: true },
        { path: '/autobuy',  icon: Zap,             label: 'Auto-Buy',     fullOnly: true },
      ]},
      { group: 'Campañas', items: [
        { path: '/campaigns',          icon: Megaphone, label: 'Mis Campañas',   fullOnly: true },
        { path: '/campaigns/new',      icon: Plus,      label: 'Nueva Campaña',  fullOnly: true },
        { path: '/campaigns/bulk',     icon: Rocket,    label: 'Bulk Launcher',  fullOnly: true },
        { path: '/campaigns/calendar', icon: Calendar,  label: 'Calendario',     fullOnly: true },
      ]},
      { group: 'Análisis de canales', items: [
        { path: '/analyze/channel',   icon: BarChart3,    label: 'Analizar canal',    fullOnly: true },
        { path: '/analyze/compare',   icon: Columns3,     label: 'Comparar canales',  fullOnly: true },
        { path: '/analyze/lookalike', icon: Target,       label: 'Canales similares', fullOnly: true },
        { path: '/analyze/audit',     icon: ClipboardList,label: 'Auditoría bulk',    fullOnly: true },
        { path: '/analyze/watchlist', icon: Bookmark,     label: 'Watchlist',         fullOnly: true },
        { path: '/analyze/overlap',   icon: Layers,       label: 'Audiencias',        fullOnly: true },
        { path: '/analyze/audience',  icon: PieChart,     label: 'Insights audiencia',fullOnly: true },
        { path: '/analyze/niches',    icon: Map,          label: 'Heatmap de nichos', fullOnly: true },
        { path: '/analyze/topics',    icon: Hash,         label: 'Topic Research',    fullOnly: true },
      ]},
      { group: 'Análisis de rendimiento', items: [
        { path: '/analyze/ad',        icon: Megaphone,    label: 'Analizar anuncio',  fullOnly: true },
        { path: '/analyze/abtest',    icon: FlaskConical, label: 'A/B Test Lab',      fullOnly: true },
        { path: '/analyze/realtime',  icon: Activity,     label: 'Tiempo real',       fullOnly: true },
        { path: '/analyze/funnel',    icon: Filter,       label: 'Funnel',            fullOnly: true },
        { path: '/analyze/cohorts',   icon: Users,        label: 'Cohortes',          fullOnly: true },
        { path: '/analyze/forecast',  icon: Calculator,   label: 'Forecaster ROI',    fullOnly: true },
        { path: '/analyze/reports',   icon: LayoutDashboard, label: 'Report Studio',  fullOnly: true },
      ]},
      { group: 'Cuenta', items: [
        { path: '/finances', icon: Wallet,          label: 'Finanzas',     fullOnly: true },
        { path: '/referrals',icon: Users,           label: 'Referidos'             },
        { path: '/settings', icon: Settings,        label: 'Configuración', fullOnly: true },
      ]},
    ],
    bottomNav: [],
  },
  creator: {
    color: GREEN,
    alpha: greenAlpha,
    label: 'Creador',
    basePath: '/creator',
    nav: [
      { group: null, items: [
        { path: '',          icon: LayoutDashboard, label: 'Dashboard',    end: true },
        { path: '/channels', icon: Radio,           label: 'Mis Canales'             },
        { path: '/inbox',    icon: MessageSquare,   label: 'Inbox',        badge: true, fullOnly: true },
      ]},
      { group: 'WhatsApp', items: [
        { path: '/channels/link-whatsapp', icon: Radio,       label: 'Vincular canal'     },
        { path: '/whatsapp-audit',         icon: ShieldAlert, label: 'Registro de accesos'},
      ]},
      { group: 'Análisis', items: [
        { path: '/analytics',icon: BarChart3,       label: 'Analytics',    fullOnly: true },
        { path: '/audience', icon: Users,           label: 'Audiencia',    fullOnly: true },
        { path: '/compare',  icon: GitCompare,      label: 'Comparar',     fullOnly: true },
        { path: '/earnings', icon: Wallet,          label: 'Ganancias',    fullOnly: true },
        { path: '/pricing',  icon: DollarSign,      label: 'Pricing Optimizer', fullOnly: true },
        { path: '/abtest',   icon: FlaskConical,    label: 'A/B Testing',  fullOnly: true },
        { path: '/reports',  icon: FileText,        label: 'Reports Studio', fullOnly: true },
      ]},
      { group: 'Marca', items: [
        { path: '/profile',  icon: UserIcon,        label: 'Perfil público' },
      ]},
      { group: 'Gestión', items: [
        { path: '/requests', icon: Inbox,           label: 'Solicitudes',  badge: true, fullOnly: true },
        { path: '/referrals',icon: Users,           label: 'Referidos'               },
        { path: '/disputes', icon: ShieldAlert,     label: 'Disputas',     fullOnly: true },
      ]},
    ],
    bottomNav: [
      { path: '/settings', icon: Settings, label: 'Configuración', fullOnly: true },
    ],
  },
  admin: {
    color: '#EF4444',
    alpha: (o) => `rgba(239,68,68,${o})`,
    label: 'Admin',
    basePath: '/admin',
    nav: [
      { group: null, items: [
        { path: '',            icon: LayoutDashboard, label: 'Overview',     end: true },
      ]},
      { group: 'Gestión', items: [
        { path: '/users',      icon: Users,           label: 'Usuarios'              },
        { path: '/channels',   icon: Radio,           label: 'Canales'               },
        { path: '/campaigns',  icon: Megaphone,       label: 'Campañas'              },
        { path: '/disputes',   icon: ShieldAlert,     label: 'Disputas'              },
      ]},
      { group: 'Sistema', items: [
        { path: '/finances',   icon: DollarSign,      label: 'Finanzas'              },
        { path: '/scoring',    icon: Database,         label: 'Scoring'               },
      ]},
    ],
    bottomNav: [
      { path: '/settings', icon: Settings, label: 'Configuración' },
    ],
  },
}


// ─── Responsive hook ─────────────────────────────────────────────────────────
function useIsMobile(bp = MOBILE_BP) {
  const [mobile, setMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < bp : false
  )
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp - 1}px)`)
    const handler = (e) => setMobile(e.matches)
    mq.addEventListener('change', handler)
    setMobile(mq.matches)
    return () => mq.removeEventListener('change', handler)
  }, [bp])
  return mobile
}


// ─── Error Boundary ──────────────────────────────────────────────────────────
class PageErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null } }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(err, info) { console.error('Dashboard page crash:', err, info) }
  render() {
    if (this.state.hasError) {
      const color = this.props.accentColor || PURPLE
      return (
        <div style={{ padding: '60px 28px', textAlign: 'center', fontFamily: FONT_BODY }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'rgba(239,68,68,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <AlertTriangle size={24} color="#ef4444" />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px', fontFamily: FONT_DISPLAY }}>
            Algo salio mal
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '20px' }}>
            {this.state.error?.message || 'Error inesperado'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              background: color, color: '#fff', border: 'none',
              borderRadius: '10px', padding: '10px 24px',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              fontFamily: FONT_BODY,
            }}
          >
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}


// ─── NavTooltip ──────────────────────────────────────────────────────────────
function NavTooltip({ label, visible, children }) {
  return (
    <div style={{ position: 'relative', display: 'block' }}>
      {children}
      {visible && (
        <div style={{
          position: 'absolute', left: 'calc(100% + 12px)', top: '50%',
          transform: 'translateY(-50%)',
          background: 'var(--text)', color: 'var(--bg)',
          fontSize: '12px', fontWeight: 500, fontFamily: FONT_BODY,
          padding: '5px 10px', borderRadius: '7px',
          whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 999,
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        }}>
          {label}
          <div style={{
            position: 'absolute', right: '100%', top: '50%',
            transform: 'translateY(-50%)',
            border: '5px solid transparent',
            borderRightColor: 'var(--text)',
          }} />
        </div>
      )}
    </div>
  )
}


// ─── SidebarLink ─────────────────────────────────────────────────────────────
function SidebarLink({ to, icon: Icon, label, end, collapsed, accentColor, accentAlpha, badge, badgeCount, onNavigate }) {
  const [hovered, setHovered] = useState(false)
  const [tipVisible, setTipVisible] = useState(false)

  return (
    <NavLink
      to={to}
      end={end}
      style={{ textDecoration: 'none', display: 'block' }}
      onClick={onNavigate}
    >
      {({ isActive }) => (
        <NavTooltip label={label} visible={collapsed && tipVisible}>
          <div
            onMouseEnter={() => { setHovered(true); if (collapsed) setTipVisible(true) }}
            onMouseLeave={() => { setHovered(false); setTipVisible(false) }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: collapsed ? '10px 0' : '10px 14px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: '10px',
              cursor: 'pointer',
              position: 'relative',
              background: isActive
                ? accentAlpha(0.12)
                : hovered
                  ? 'var(--surface2, rgba(255,255,255,0.04))'
                  : 'transparent',
              borderLeft: `3px solid ${isActive ? accentColor : 'transparent'}`,
              color: isActive ? accentColor : hovered ? 'var(--text)' : 'var(--muted)',
              fontFamily: FONT_BODY,
              fontSize: '14px',
              fontWeight: isActive ? 600 : 400,
              letterSpacing: isActive ? '-0.01em' : '0',
              transition: 'background 150ms ease, color 150ms ease, border-color 150ms ease',
              userSelect: 'none',
              marginLeft: collapsed ? 0 : '-3px',
            }}
          >
            <Icon
              size={18}
              strokeWidth={isActive ? 2.2 : 1.8}
              style={{ flexShrink: 0, transition: 'color 150ms ease' }}
            />
            {!collapsed && (
              <span style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {label}
              </span>
            )}
            {!collapsed && badge && badgeCount > 0 && (
              <span style={{
                background: accentColor, color: '#fff',
                borderRadius: '20px', padding: '1px 7px',
                fontSize: '11px', fontWeight: 700, flexShrink: 0,
              }}>
                {badgeCount}
              </span>
            )}
            {!collapsed && isActive && !badge && (
              <ChevronRight size={13} strokeWidth={2.5} style={{ opacity: 0.5, flexShrink: 0 }} />
            )}

            {/* Collapsed badge dot */}
            {collapsed && badge && badgeCount > 0 && (
              <span style={{
                position: 'absolute', top: '6px', right: '6px',
                width: '8px', height: '8px', borderRadius: '50%',
                background: accentColor,
                border: '2px solid var(--surface)',
              }} />
            )}
          </div>
        </NavTooltip>
      )}
    </NavLink>
  )
}


// ─── LogoutButton ────────────────────────────────────────────────────────────
function LogoutButton({ collapsed, onClick }) {
  const [hovered, setHovered] = useState(false)
  const [tipVisible, setTipVisible] = useState(false)

  return (
    <NavTooltip label="Cerrar sesion" visible={collapsed && tipVisible}>
      <button
        onClick={onClick}
        onMouseEnter={() => { setHovered(true); if (collapsed) setTipVisible(true) }}
        onMouseLeave={() => { setHovered(false); setTipVisible(false) }}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: collapsed ? '10px 0' : '10px 14px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: '10px', cursor: 'pointer', width: '100%',
          background: hovered ? 'rgba(239,68,68,0.08)' : 'transparent',
          border: 'none',
          borderLeft: '3px solid transparent',
          color: hovered ? '#ef4444' : 'var(--muted)',
          fontSize: '14px', fontFamily: FONT_BODY, fontWeight: 400,
          transition: 'background 150ms ease, color 150ms ease',
          marginLeft: collapsed ? 0 : '-3px',
        }}
      >
        <LogOut size={18} strokeWidth={1.8} style={{ flexShrink: 0 }} />
        {!collapsed && <span>Cerrar sesion</span>}
      </button>
    </NavTooltip>
  )
}


// ─── ToggleButton ────────────────────────────────────────────────────────────
function ToggleButton({ collapsed, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
      style={{
        background: hovered ? 'var(--bg2)' : 'transparent',
        border: `1px solid ${hovered ? 'var(--border-med)' : 'var(--border)'}`,
        borderRadius: '8px', padding: '6px', cursor: 'pointer',
        color: hovered ? 'var(--text)' : 'var(--muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        transition: 'background 150ms ease, border-color 150ms ease, color 150ms ease',
      }}
    >
      <Menu size={15} strokeWidth={2} />
    </button>
  )
}


// ─── Avatar ──────────────────────────────────────────────────────────────────
function Avatar({ initials, size = 42, accentColor, accentAlpha }) {
  return (
    <div style={{
      width: `${size}px`, height: `${size}px`,
      borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${accentAlpha(0.35)} 0%, ${accentAlpha(0.18)} 100%)`,
      border: `1.5px solid ${accentAlpha(0.45)}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: `${Math.round(size * 0.31)}px`,
      fontWeight: 700, color: accentColor, fontFamily: FONT_DISPLAY,
      letterSpacing: '0.02em',
      boxShadow: `0 0 0 3px ${accentAlpha(0.08)}`,
    }}>
      {initials}
    </div>
  )
}


// ─── Notification type mapping (campana.* → emoji + color) ───────────────────
const NOTIF_MAP = {
  'campana.nueva':       { emoji: '📥', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  'campana.completada':  { emoji: '💰', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  'campana.publicada':   { emoji: '📢', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  'campana.cancelada':   { emoji: '✕',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  'campana.mensaje':     { emoji: '💬', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  'campana.pagada':      { emoji: '💳', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  'success':             { emoji: '✅', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  'info':                { emoji: 'ℹ️',  color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  'warning':             { emoji: '⚠️', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
}

// Map notification type to a navigation path
function notifNavPath(n, role) {
  const tipo = n.type || n.tipo || ''
  if (tipo.startsWith('campana.')) {
    return role === 'creator' ? '/creator/requests' : '/advertiser/campaigns'
  }
  return role === 'creator' ? '/creator' : '/advertiser'
}

// ─── NotificationBell ────────────────────────────────────────────────────────
function NotificationBell({ notifications, accentColor, accentAlpha, onNavigate, role }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(notifications)
  const [bellHovered, setBellHovered] = useState(false)
  const ref = useRef(null)

  useEffect(() => { setItems(notifications) }, [notifications])

  const unread = items.filter(n => !n.read && !n.leida).length

  useEffect(() => {
    if (!open) return
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function markAllRead() {
    setItems(prev => prev.map(n => ({ ...n, read: true, leida: true })))
    apiService.request('/notifications/leer-todas', { method: 'PUT' }).catch(() => {})
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        onMouseEnter={() => setBellHovered(true)}
        onMouseLeave={() => setBellHovered(false)}
        style={{
          background: bellHovered ? 'var(--bg2)' : 'var(--bg)',
          border: `1px solid ${open ? accentAlpha(0.4) : 'var(--border)'}`,
          borderRadius: '10px', padding: '8px', cursor: 'pointer',
          color: open ? accentColor : bellHovered ? 'var(--text)' : 'var(--muted)',
          display: 'flex', alignItems: 'center', position: 'relative',
          transition: 'background 150ms ease, border-color 150ms ease, color 150ms ease',
        }}
      >
        <Bell size={18} strokeWidth={open ? 2.2 : 1.8} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: '-5px', right: '-5px',
            background: accentColor, color: '#fff',
            borderRadius: '50%', width: '17px', height: '17px',
            fontSize: '10px', fontWeight: 700, fontFamily: FONT_BODY,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg)', lineHeight: 1,
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          width: '360px', maxWidth: 'calc(100vw - 40px)',
          background: 'var(--surface)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04)',
          zIndex: 200, overflow: 'hidden',
          animation: 'notif-in 160ms ease forwards',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px 12px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>
                Notificaciones
              </span>
              {unread > 0 && (
                <span style={{
                  background: accentAlpha(0.15), color: accentColor,
                  borderRadius: '20px', padding: '1px 7px',
                  fontSize: '11px', fontWeight: 700, fontFamily: FONT_BODY,
                }}>
                  {unread} nuevas
                </span>
              )}
            </div>
            <button
              onClick={markAllRead}
              style={{
                background: 'none', border: 'none',
                fontSize: '12px', fontWeight: 500,
                color: unread > 0 ? accentColor : 'var(--muted)',
                cursor: unread > 0 ? 'pointer' : 'default',
                fontFamily: FONT_BODY, padding: '2px 0',
                opacity: unread > 0 ? 1 : 0.5,
              }}
            >
              Marcar todas leidas
            </button>
          </div>

          {/* List */}
          <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
            {items.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px', fontFamily: FONT_BODY }}>
                Sin notificaciones
              </div>
            ) : items.slice(0, 8).map((n, i) => {
              const isRead = n.read || n.leida
              const tc = NOTIF_MAP[n.type || n.tipo] || NOTIF_MAP[n.tipo] || NOTIF_MAP.info
              return (
                <div
                  key={n.id || n._id || i}
                  style={{
                    padding: '12px 16px',
                    borderBottom: i < Math.min(items.length, 8) - 1 ? '1px solid var(--border)' : 'none',
                    background: isRead ? 'transparent' : accentAlpha(0.04),
                    display: 'flex', gap: '11px', alignItems: 'flex-start',
                    transition: 'background 150ms ease', cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg2)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = isRead ? 'transparent' : accentAlpha(0.04) }}
                  onClick={() => {
                    // Mark as read
                    if (!isRead) {
                      apiService.markNotificationAsRead?.(n._id || n.id).catch(() => {})
                      setItems(prev => prev.map(x =>
                        (x._id || x.id) === (n._id || n.id) ? { ...x, read: true, leida: true } : x
                      ))
                    }
                    // Navigate to the relevant page
                    const path = notifNavPath(n, role)
                    if (path && onNavigate) {
                      onNavigate(path)
                      setOpen(false)
                    }
                  }}
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: tc.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontSize: '15px', lineHeight: 1,
                  }}>
                    {tc.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px', fontFamily: FONT_BODY }}>
                      {n.title || n.titulo || 'Notificacion'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.45, fontFamily: FONT_BODY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {n.desc || n.mensaje || n.message || ''}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted2)', marginTop: '5px', fontFamily: FONT_BODY }}>
                      {relTime(n.time || n.createdAt)}
                    </div>
                  </div>
                  {!isRead && (
                    <div style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      background: accentColor, flexShrink: 0, marginTop: '5px',
                    }} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <button
              onClick={() => { onNavigate?.(role === 'creator' ? '/creator/notifications' : '/advertiser/notifications'); setOpen(false) }}
              style={{
                background: 'none', border: 'none',
                fontSize: '12px', color: accentColor, cursor: 'pointer',
                fontFamily: FONT_BODY, fontWeight: 500,
              }}
            >
              Ver todas las notificaciones
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


// ─── Mobile overlay backdrop ─────────────────────────────────────────────────
function Backdrop({ visible, onClick }) {
  if (!visible) return null
  return (
    <div
      onClick={onClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 40,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        animation: 'backdrop-in 200ms ease forwards',
      }}
    />
  )
}


// ─── Theme toggle ────────────────────────────────────────────────────────────
function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return true
    const saved = localStorage.getItem('channelad-theme')
    return saved === 'dark'
  })

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.dataset.theme = next ? 'dark' : 'light'
    localStorage.setItem('channelad-theme', next ? 'dark' : 'light')
  }

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: '10px', padding: '8px', cursor: 'pointer',
        color: 'var(--muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 150ms ease, border-color 150ms ease, color 150ms ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-med)'; e.currentTarget.style.color = 'var(--text)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}
    >
      {isDark ? <Sun size={16} strokeWidth={1.8} /> : <Moon size={16} strokeWidth={1.8} />}
    </button>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// MAIN LAYOUT
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardLayout({ role = 'advertiser' }) {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.advertiser
  const { user, logout, isFullAccess } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile()

  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [pendingCount, setPendingCount] = useState(0)
  const [showOnboarding, setShowOnboarding] = useState(() => shouldShowOnboarding(role, user?.tipoPerfil))

  // Fetch notifications (polling)
  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      try {
        const res = await apiService.request('/notifications')
        if (!cancelled && res?.success) setNotifications(res.data || [])
      } catch (err) { console.error('DashboardLayout.fetchNotifications failed:', err) }

      // Creator: also fetch pending requests count
      if (role === 'creator') {
        try {
          const res = await apiService.getAdsForCreator()
          if (!cancelled && res?.success && Array.isArray(res.data)) {
            setPendingCount(res.data.filter(a => (a.estado || a.status) === 'pendiente').length)
          }
        } catch (err) { console.error('DashboardLayout.fetchPendingCount failed:', err) }
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [role])

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  // Close drawer on desktop
  useEffect(() => { if (!isMobile) setDrawerOpen(false) }, [isMobile])

  const nombre = user?.nombre || user?.email?.split('@')[0] || 'Usuario'
  const email = user?.email || ''
  const initials = nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const onLogout = () => { logout(); navigate('/') }

  // Resolve full paths — filter restricted items for limited-access users.
  // Nav is now grouped: [{ group: string|null, items: [...] }, ...]
  const visibleNavGroups = cfg.nav.map(g => ({
    group: g.group,
    items: (g.items || []).filter(n => isFullAccess || !n.fullOnly).map(n => ({
      ...n,
      to: cfg.basePath + n.path,
    })),
  })).filter(g => g.items.length > 0)

  // Flat list for breadcrumb + currentPage lookup
  const flatNav = visibleNavGroups.flatMap(g => g.items)
  const visibleBottomNav = isFullAccess ? cfg.bottomNav : cfg.bottomNav.filter(n => !n.fullOnly)
  const fullBottomNav = visibleBottomNav.map(n => ({
    ...n,
    to: cfg.basePath + n.path,
  }))
  const allNav = [...flatNav, ...fullBottomNav]

  // Collapsible groups — persist user choice in localStorage per role
  const groupsStorageKey = `channelad-sidebar-groups-${role}`
  const [expandedGroups, setExpandedGroups] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(groupsStorageKey) || '{}')
      // Default: expand the group containing the current route, all expanded otherwise
      const defaults = {}
      visibleNavGroups.forEach(g => {
        if (g.group) {
          // If we have a stored value, use it; else expand by default
          defaults[g.group] = stored[g.group] !== undefined ? stored[g.group] : true
        }
      })
      // Always force-expand the group with the active route
      const activeGroup = visibleNavGroups.find(g =>
        g.group && g.items.some(item => location.pathname === item.to || (item.end ? false : location.pathname.startsWith(item.to + '/')))
      )
      if (activeGroup) defaults[activeGroup.group] = true
      return defaults
    } catch { return {} }
  })

  const toggleGroup = useCallback((groupName) => {
    setExpandedGroups(prev => {
      const next = { ...prev, [groupName]: !prev[groupName] }
      try { localStorage.setItem(groupsStorageKey, JSON.stringify(next)) } catch {}
      return next
    })
  }, [groupsStorageKey])

  // Find current page for breadcrumb
  const currentPage = allNav.find(n =>
    n.end ? location.pathname === n.to : location.pathname.startsWith(n.to) && n.to !== cfg.basePath
  ) || allNav[0]

  const sidebarW = isMobile ? SIDEBAR_W : (collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W)
  const showCollapsed = !isMobile && collapsed

  const closeMobileNav = () => setDrawerOpen(false)

  // ── Sidebar content (shared between desktop and mobile) ────────────────
  const sidebarContent = (
    <>
      {/* Logo + toggle */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: showCollapsed ? 'center' : 'space-between',
        padding: showCollapsed ? '0 14px' : '0 16px 0 20px',
        height: `${HEADER_H}px`,
        borderBottom: '1px solid var(--border)',
        flexShrink: 0, gap: '8px',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          overflow: 'hidden', flex: showCollapsed ? '0 0 auto' : '1',
        }}>
          {/* Logo */}
          <img
            src="/logo.svg"
            alt="Channelad"
            style={{ height: showCollapsed ? '24px' : '30px', width: 'auto', display: 'block', flexShrink: 0 }}
          />
        </div>

        {!isMobile && (
          <ToggleButton collapsed={collapsed} onClick={() => setCollapsed(v => !v)} />
        )}
        {isMobile && (
          <button
            onClick={() => setDrawerOpen(false)}
            style={{
              background: 'transparent', border: 'none', padding: '6px',
              cursor: 'pointer', color: 'var(--muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={18} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* User section */}
      <div style={{
        borderBottom: '1px solid var(--border)', flexShrink: 0,
        padding: showCollapsed ? '14px 10px' : '14px 16px',
        display: 'flex', alignItems: 'center', gap: '10px',
        overflow: 'hidden',
        justifyContent: showCollapsed ? 'center' : 'flex-start',
      }}>
        <Avatar
          initials={initials}
          size={showCollapsed ? 36 : 42}
          accentColor={cfg.color}
          accentAlpha={cfg.alpha}
        />
        {!showCollapsed && (
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '1px' }}>
              <span style={{
                fontSize: '14px', fontWeight: 700, fontFamily: FONT_DISPLAY,
                color: 'var(--text)', whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '110px',
              }}>
                {nombre}
              </span>
              <span style={{
                background: cfg.alpha(0.12), border: `1px solid ${cfg.alpha(0.25)}`,
                color: cfg.color, borderRadius: '20px', padding: '1px 7px',
                fontSize: '10px', fontWeight: 700, fontFamily: FONT_BODY,
                letterSpacing: '0.02em', whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {cfg.label}
              </span>
            </div>
            <div style={{
              fontSize: '11.5px', color: 'var(--muted)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              fontFamily: FONT_BODY,
            }}>
              {email}
            </div>
          </div>
        )}
      </div>

      {/* Main nav */}
      <nav style={{
        flex: 1,
        padding: showCollapsed ? '10px 8px' : '10px 10px',
        display: 'flex', flexDirection: 'column', gap: '2px',
        overflowY: 'auto', overflowX: 'hidden',
      }}>
        {visibleNavGroups.map((g, gi) => {
          const isCollapsibleGroup = !!g.group  // null = no group, always expanded
          const isExpanded = !isCollapsibleGroup || expandedGroups[g.group] !== false
          // When sidebar is icon-only, always show items (the group label is hidden anyway)
          const showItems = showCollapsed || isExpanded

          return (
            <div key={g.group || `g${gi}`}>
              {/* Group label — clickable to toggle when sidebar expanded */}
              {!showCollapsed && g.group && (
                <button
                  onClick={() => toggleGroup(g.group)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: gi === 0 ? '2px 13px 6px' : '12px 13px 6px',
                    fontFamily: FONT_BODY,
                  }}
                  onMouseEnter={e => { e.currentTarget.firstChild.style.color = 'var(--muted)' }}
                  onMouseLeave={e => { e.currentTarget.firstChild.style.color = 'var(--muted2)' }}
                >
                  <span style={{
                    fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: 'var(--muted2)',
                    userSelect: 'none', transition: 'color .15s',
                  }}>{g.group}</span>
                  <ChevronDown
                    size={12}
                    color="var(--muted2)"
                    style={{
                      transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                      transition: 'transform .2s',
                    }}
                  />
                </button>
              )}
              {/* Collapsed: tiny separator between groups */}
              {showCollapsed && gi > 0 && (
                <div style={{ height: 1, background: 'var(--border)', margin: '6px 8px' }} />
              )}
              {showItems && g.items.map(item => (
                <SidebarLink
                  key={item.to}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                  end={item.end}
                  collapsed={showCollapsed}
                  accentColor={cfg.color}
                  accentAlpha={cfg.alpha}
                  badge={item.badge}
                  badgeCount={pendingCount}
                  onNavigate={isMobile ? closeMobileNav : undefined}
                />
              ))}
            </div>
          )
        })}
      </nav>

      {/* Bottom nav */}
      <div style={{
        padding: showCollapsed ? '10px 8px' : '10px 10px',
        borderTop: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0,
      }}>
        {fullBottomNav.map(item => (
          <SidebarLink
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            collapsed={showCollapsed}
            accentColor={cfg.color}
            accentAlpha={cfg.alpha}
            onNavigate={isMobile ? closeMobileNav : undefined}
          />
        ))}
        <LogoutButton collapsed={showCollapsed} onClick={onLogout} />
      </div>
    </>
  )


  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: 'var(--bg)', fontFamily: FONT_BODY, position: 'relative',
    }}>
      {/* Keyframe injection */}
      <style>{`
        @keyframes notif-in {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes backdrop-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes drawer-in {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border-med, rgba(255,255,255,0.1)); border-radius: 99px; }
      `}</style>

      {/* ── Mobile backdrop ──────────────────────────────────────────────── */}
      <Backdrop visible={isMobile && drawerOpen} onClick={() => setDrawerOpen(false)} />

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside style={{
        width: isMobile ? `${SIDEBAR_W}px` : `${collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W}px`,
        flexShrink: 0,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: isMobile ? 'fixed' : 'sticky',
        top: 0,
        left: 0,
        height: '100vh',
        transition: isMobile
          ? 'transform 250ms cubic-bezier(.4,0,.2,1)'
          : `width 250ms ${EASE}`,
        transform: isMobile
          ? (drawerOpen ? 'translateX(0)' : 'translateX(-100%)')
          : 'none',
        overflow: 'hidden',
        zIndex: isMobile ? 50 : 30,
        boxShadow: isMobile && drawerOpen ? '4px 0 24px rgba(0,0,0,0.3)' : 'none',
      }}>
        {sidebarContent}
      </aside>

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        minWidth: 0, overflow: 'hidden',
        /* On mobile, take full width */
        width: isMobile ? '100%' : undefined,
      }}>

        {/* ── Top bar ──────────────────────────────────────────────────── */}
        <header style={{
          height: `${HEADER_H}px`,
          background: 'rgba(var(--surface-rgb, 17,17,17), 0.85)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isMobile ? '0 16px' : '0 24px',
          position: 'sticky', top: 0, zIndex: 20,
          gap: '12px', flexShrink: 0,
        }}>
          {/* Left: hamburger (mobile) + breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isMobile && (
              <button
                onClick={() => setDrawerOpen(true)}
                style={{
                  background: 'transparent', border: 'none',
                  padding: '6px', cursor: 'pointer', color: 'var(--muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Menu size={20} strokeWidth={2} />
              </button>
            )}
            {/* Breadcrumb: Role > Group > Page */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
              <NavLink to={cfg.basePath} style={{ color: 'var(--muted)', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color = cfg.color}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
              >
                {cfg.label}
              </NavLink>
              {currentPage && currentPage.to !== cfg.basePath && (
                <>
                  <span style={{ color: 'var(--muted2)', fontSize: 10 }}>›</span>
                  <span style={{ color: 'var(--text)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <currentPage.icon size={13} color={cfg.color} strokeWidth={2} />
                    {currentPage.label}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right: search + theme + notifications + role badge + avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Global search bar (replaces Cmd+K trigger) */}
            {!isMobile && (
              <GlobalSearchBar compact />
            )}
            {/* Reopen onboarding wizard */}
            <button
              type="button"
              onClick={() => { resetOnboarding(role); setShowOnboarding(true) }}
              aria-label="Ver tutorial de onboarding"
              title="Ver tutorial"
              style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'transparent', border: '1px solid var(--border)',
                cursor: 'pointer', color: 'var(--muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background .15s, color .15s, border-color .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = cfg.color; e.currentTarget.style.borderColor = cfg.alpha(0.3) }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <HelpCircle size={16} strokeWidth={2} />
            </button>
            <ThemeToggle />
            {role === 'advertiser' && (
              <InboxBell accentColor={cfg.color} accentAlpha={cfg.alpha} role={role} />
            )}
            <NotificationBell
              notifications={notifications}
              accentColor={cfg.color}
              accentAlpha={cfg.alpha}
              role={role}
              onNavigate={(path) => navigate(path)}
            />

            {/* Role badge (hidden on mobile for space) */}
            {!isMobile && (
              <div style={{
                background: cfg.alpha(0.1),
                border: `1px solid ${cfg.alpha(0.22)}`,
                borderRadius: '20px', padding: '4px 12px',
                fontSize: '11.5px', fontWeight: 600,
                color: cfg.color, fontFamily: FONT_BODY,
                letterSpacing: '0.02em', userSelect: 'none',
              }}>
                {cfg.label}
              </div>
            )}

            {/* Avatar chip */}
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: `linear-gradient(135deg, ${cfg.alpha(0.35)} 0%, ${cfg.alpha(0.18)} 100%)`,
              border: `1.5px solid ${cfg.alpha(0.4)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 700, color: cfg.color,
              fontFamily: FONT_DISPLAY, cursor: 'default',
              userSelect: 'none', flexShrink: 0,
            }}>
              {initials}
            </div>
          </div>
        </header>

        {/* ── Page content ──────────────────────────────────────────────── */}
        <main style={{
          flex: 1,
          padding: isMobile ? '20px 16px' : '28px',
          overflowY: 'auto', overflowX: 'hidden',
        }}>
          <EmailVerificationBanner />
          <FiscalDataBanner />
          <PageErrorBoundary accentColor={cfg.color}>
            <Outlet />
          </PageErrorBoundary>
        </main>
      </div>

      {/* ── Global overlays ──────────────────────────────────────────────── */}
      <CommandPalette />
      {showOnboarding && (
        <OnboardingWizard
          role={role}
          tipoPerfil={user?.tipoPerfil}
          onClose={() => setShowOnboarding(false)}
        />
      )}
    </div>
  )
}
