import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Menu, X } from 'lucide-react'
import { FONT_DISPLAY } from '../../theme/tokens'

const NAV = [
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Herramientas', href: '#dashboard-tour' },
  { label: 'Precios', href: '#precios' },
  { label: 'FAQ', href: '#faq' },
]

export default function StickyHeader() {
  const [visible, setVisible] = useState(false)
  const [openMenu, setOpenMenu] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.header
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0,
            zIndex: 100,
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderBottom: '1px solid rgba(15,23,42,0.06)',
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
          }}
        >
          <div style={{
            maxWidth: '1200px', margin: '0 auto',
            padding: '12px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 16,
          }}>
            <a href="/" style={{
              display: 'flex', alignItems: 'center', gap: 10,
              textDecoration: 'none', color: 'var(--text)',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 14, fontWeight: 700,
                fontFamily: FONT_DISPLAY,
                boxShadow: '0 2px 8px rgba(124,58,237,0.25)',
              }}>C</div>
              <span style={{ fontSize: 16, fontWeight: 700, fontFamily: FONT_DISPLAY, letterSpacing: '-0.02em' }}>
                Channelad
              </span>
            </a>

            <nav className="sticky-nav" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
              {NAV.map(n => (
                <a key={n.href} href={n.href} style={{
                  fontSize: 14, fontWeight: 500, color: 'var(--muted)',
                  textDecoration: 'none', transition: 'color 0.2s',
                }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                >{n.label}</a>
              ))}
            </nav>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <a href="/auth/login" className="sticky-login" style={{
                fontSize: 14, fontWeight: 500, color: 'var(--text)',
                textDecoration: 'none',
                padding: '8px 14px', borderRadius: 10,
              }}>Iniciar sesion</a>
              <motion.a
                href="/auth/register"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                  color: '#fff', textDecoration: 'none',
                  padding: '10px 18px', borderRadius: 10,
                  fontSize: 14, fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(124,58,237,0.25)',
                }}
              >
                Empieza gratis
                <ArrowRight size={14} strokeWidth={2.5} />
              </motion.a>
              <button
                aria-label="Abrir menu"
                onClick={() => setOpenMenu(o => !o)}
                className="sticky-burger"
                style={{
                  display: 'none',
                  background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 8, padding: 6, cursor: 'pointer',
                }}
              >
                {openMenu ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {openMenu && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden', borderTop: '1px solid rgba(15,23,42,0.06)' }}
              >
                <div style={{ padding: '12px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {NAV.map(n => (
                    <a key={n.href} href={n.href} onClick={() => setOpenMenu(false)} style={{
                      padding: '10px 12px', borderRadius: 8,
                      fontSize: 14, fontWeight: 500, color: 'var(--text)', textDecoration: 'none',
                    }}>{n.label}</a>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <style>{`
            @media (max-width: 880px) {
              .sticky-nav { display: none !important; }
              .sticky-login { display: none !important; }
              .sticky-burger { display: inline-flex !important; }
            }
          `}</style>
        </motion.header>
      )}
    </AnimatePresence>
  )
}
