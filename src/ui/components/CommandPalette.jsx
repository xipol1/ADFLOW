import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, LayoutDashboard, Radio, Inbox, Wallet, BarChart3,
  Settings, Zap, Megaphone, ShieldAlert, Users, ArrowRight,
  FileText, HelpCircle, Moon, Sun, X,
} from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { PURPLE, purpleAlpha, GREEN, greenAlpha, FONT_BODY, FONT_DISPLAY } from '../theme/tokens'

// ── Command definitions ───────────────────────────────────────────────────────
const COMMANDS = {
  advertiser: [
    { id: 'adv-dash',      label: 'Dashboard',       desc: 'Ver resumen general',     icon: LayoutDashboard, path: '/advertiser',           keywords: 'inicio home overview resumen' },
    { id: 'adv-explore',   label: 'Explorar canales', desc: 'Buscar canales',          icon: Search,          path: '/advertiser/explore',    keywords: 'buscar channels busqueda marketplace' },
    { id: 'adv-autobuy',   label: 'Auto-Buy',        desc: 'Compra automatica',       icon: Zap,             path: '/advertiser/autobuy',    keywords: 'automatico auto compra rapida' },
    { id: 'adv-campaigns', label: 'Mis Campanas',    desc: 'Gestionar campanas',      icon: BarChart3,       path: '/advertiser/campaigns',  keywords: 'campana campaign lista gestion' },
    { id: 'adv-ads',       label: 'Solicitudes',     desc: 'Ver solicitudes',         icon: Megaphone,       path: '/advertiser/ads',        keywords: 'solicitud anuncio ad peticion' },
    { id: 'adv-finances',  label: 'Finanzas',        desc: 'Transacciones y saldo',   icon: Wallet,          path: '/advertiser/finances',   keywords: 'finanzas dinero saldo transaccion pago balance' },
    { id: 'adv-referrals', label: 'Referidos',       desc: 'Programa de referidos',   icon: Users,           path: '/advertiser/referrals',  keywords: 'referido invitar amigo programa' },
    { id: 'adv-disputes',  label: 'Disputas',        desc: 'Resolver disputas',       icon: ShieldAlert,     path: '/advertiser/disputes',   keywords: 'disputa problema reclamo queja' },
    { id: 'adv-settings',  label: 'Configuracion',   desc: 'Ajustes de cuenta',       icon: Settings,        path: '/advertiser/settings',   keywords: 'configurar ajustes perfil cuenta settings' },
    { id: 'adv-notifs',    label: 'Notificaciones',  desc: 'Ver todas las alertas',   icon: Inbox,           path: '/advertiser/notifications', keywords: 'notificacion alerta aviso mensaje' },
  ],
  creator: [
    { id: 'cre-dash',      label: 'Dashboard',       desc: 'Ver resumen general',     icon: LayoutDashboard, path: '/creator',              keywords: 'inicio home overview resumen' },
    { id: 'cre-channels',  label: 'Mis Canales',     desc: 'Gestionar canales',       icon: Radio,           path: '/creator/channels',     keywords: 'canal channel gestionar lista' },
    { id: 'cre-requests',  label: 'Solicitudes',     desc: 'Ver solicitudes',         icon: Inbox,           path: '/creator/requests',     keywords: 'solicitud peticion ad anuncio' },
    { id: 'cre-earnings',  label: 'Ganancias',       desc: 'Ingresos y pagos',        icon: Wallet,          path: '/creator/earnings',     keywords: 'ganancia ingreso pago retiro dinero balance' },
    { id: 'cre-referrals', label: 'Referidos',       desc: 'Programa de referidos',   icon: Users,           path: '/creator/referrals',    keywords: 'referido invitar amigo programa' },
    { id: 'cre-disputes',  label: 'Disputas',        desc: 'Resolver disputas',       icon: ShieldAlert,     path: '/creator/disputes',     keywords: 'disputa problema reclamo queja' },
    { id: 'cre-settings',  label: 'Configuracion',   desc: 'Ajustes de cuenta',       icon: Settings,        path: '/creator/settings',     keywords: 'configurar ajustes perfil cuenta settings' },
    { id: 'cre-notifs',    label: 'Notificaciones',  desc: 'Ver todas las alertas',   icon: Inbox,           path: '/creator/notifications', keywords: 'notificacion alerta aviso mensaje' },
  ],
}

const ACTIONS = [
  { id: 'act-theme',  label: 'Cambiar tema',       desc: 'Modo claro / oscuro',    icon: Moon, action: 'toggle-theme', keywords: 'tema theme dark light oscuro claro' },
  { id: 'act-help',   label: 'Ayuda y soporte',    desc: 'Centro de ayuda',        icon: HelpCircle, path: '/soporte', keywords: 'ayuda help soporte contacto' },
  { id: 'act-terms',  label: 'Terminos de uso',    desc: 'Documentos legales',     icon: FileText, path: '/terminos', keywords: 'terminos legal privacidad politica' },
]


export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const navigate = useNavigate()
  const { user, isCreador } = useAuth()

  const role = isCreador ? 'creator' : 'advertiser'
  const accent = isCreador ? GREEN : PURPLE
  const alpha = isCreador ? greenAlpha : purpleAlpha

  // Keyboard shortcut to open
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(v => !v)
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Filter results
  const allCommands = useMemo(() => [
    ...(COMMANDS[role] || []),
    ...ACTIONS,
  ], [role])

  const results = useMemo(() => {
    if (!query.trim()) return allCommands
    const q = query.toLowerCase()
    return allCommands.filter(cmd =>
      cmd.label.toLowerCase().includes(q) ||
      cmd.desc.toLowerCase().includes(q) ||
      cmd.keywords.toLowerCase().includes(q)
    )
  }, [query, allCommands])

  // Reset selection when results change
  useEffect(() => { setSelectedIdx(0) }, [results])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const items = listRef.current.children
    if (items[selectedIdx]) {
      items[selectedIdx].scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIdx])

  const execute = useCallback((cmd) => {
    if (cmd.action === 'toggle-theme') {
      const current = document.documentElement.dataset.theme
      const next = current === 'dark' ? 'light' : 'dark'
      document.documentElement.dataset.theme = next
      localStorage.setItem('adflow-theme', next)
    } else if (cmd.path) {
      navigate(cmd.path)
    }
    setOpen(false)
  }, [navigate])

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      e.preventDefault()
      execute(results[selectedIdx])
    }
  }

  if (!open) return null

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '15vh',
        animation: '_cmd_fadeIn 120ms ease forwards',
      }}
    >
      <style>{`
        @keyframes _cmd_fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes _cmd_slideIn { from { opacity:0; transform:translateY(-12px) scale(0.97); } to { opacity:1; transform:none; } }
      `}</style>

      <div style={{
        width: '100%', maxWidth: '560px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '18px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.05)',
        overflow: 'hidden',
        animation: '_cmd_slideIn 180ms ease forwards',
      }}>
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
        }}>
          <Search size={18} color={accent} strokeWidth={2} style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar paginas, acciones..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: '15px', color: 'var(--text)', fontFamily: FONT_BODY,
            }}
          />
          <kbd style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '6px', padding: '2px 8px',
            fontSize: '11px', color: 'var(--muted)',
            fontFamily: FONT_BODY, fontWeight: 500,
          }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: '360px', overflowY: 'auto', padding: '6px' }}>
          {results.length === 0 ? (
            <div style={{
              padding: '28px 16px', textAlign: 'center',
              color: 'var(--muted)', fontSize: '13px', fontFamily: FONT_BODY,
            }}>
              Sin resultados para "{query}"
            </div>
          ) : results.map((cmd, i) => {
            const Icon = cmd.icon
            const isSelected = i === selectedIdx
            return (
              <button
                key={cmd.id}
                onClick={() => execute(cmd)}
                onMouseEnter={() => setSelectedIdx(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  width: '100%', padding: '10px 14px',
                  background: isSelected ? alpha(0.1) : 'transparent',
                  border: 'none', borderRadius: '10px',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'background .08s',
                }}
              >
                <div style={{
                  width: '34px', height: '34px', borderRadius: '9px',
                  background: isSelected ? alpha(0.15) : 'var(--bg)',
                  border: `1px solid ${isSelected ? alpha(0.3) : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'all .08s',
                }}>
                  <Icon size={16} color={isSelected ? accent : 'var(--muted)'} strokeWidth={1.8} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '13px', fontWeight: 600, fontFamily: FONT_BODY,
                    color: isSelected ? accent : 'var(--text)',
                  }}>
                    {cmd.label}
                  </div>
                  <div style={{
                    fontSize: '11px', color: 'var(--muted)',
                    fontFamily: FONT_BODY, marginTop: '1px',
                  }}>
                    {cmd.desc}
                  </div>
                </div>
                {isSelected && (
                  <ArrowRight size={14} color={accent} strokeWidth={2} style={{ flexShrink: 0, opacity: 0.6 }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Footer hint */}
        <div style={{
          padding: '10px 20px',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '16px',
          fontSize: '11px', color: 'var(--muted2)', fontFamily: FONT_BODY,
        }}>
          <span><kbd style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 5px', fontSize: '10px' }}>↑↓</kbd> navegar</span>
          <span><kbd style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 5px', fontSize: '10px' }}>↵</kbd> abrir</span>
          <span><kbd style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 5px', fontSize: '10px' }}>esc</kbd> cerrar</span>
        </div>
      </div>
    </div>
  )
}
