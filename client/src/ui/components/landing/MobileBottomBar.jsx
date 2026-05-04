import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { FONT_BODY } from '../../theme/tokens'

/**
 * Sticky bottom CTA shown only on mobile after the user scrolls past the hero.
 * Disappears when near the FinalCTA section to avoid duplication.
 */
export default function MobileBottomBar() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onScroll = () => {
      const scrolled = window.scrollY > 700
      // Hide when within ~600px of the bottom (where the FinalCTA lives)
      const nearBottom = window.innerHeight + window.scrollY > document.documentElement.scrollHeight - 600
      setVisible(scrolled && !nearBottom)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mobile-bottom-bar"
          style={{
            position: 'fixed',
            left: 0, right: 0,
            bottom: 0,
            zIndex: 80,
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderTop: '1px solid rgba(15,23,42,0.08)',
            boxShadow: '0 -4px 16px rgba(15,23,42,0.06)',
            padding: '10px 14px calc(10px + env(safe-area-inset-bottom)) 14px',
            alignItems: 'center', gap: 10,
            fontFamily: FONT_BODY,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 700,
              color: 'var(--text)', letterSpacing: '-0.01em',
              lineHeight: 1.2,
            }}>
              Empieza gratis
            </div>
            <div style={{
              fontSize: 11, color: 'var(--muted)', marginTop: 1,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              Sin tarjeta · Escrow Stripe
            </div>
          </div>
          <motion.a
            href="/auth/register"
            whileTap={{ scale: 0.96 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
              color: '#fff', textDecoration: 'none',
              padding: '12px 18px', borderRadius: 12,
              fontSize: 14, fontWeight: 600,
              boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
              whiteSpace: 'nowrap',
            }}
          >
            Empezar
            <ArrowRight size={14} strokeWidth={2.5} />
          </motion.a>

          <style>{`
            .mobile-bottom-bar { display: none; }
            @media (max-width: 720px) and (pointer: coarse), (max-width: 480px) {
              .mobile-bottom-bar { display: flex !important; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
