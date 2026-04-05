import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight } from 'lucide-react'

export default function AnnouncementBar() {
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -44, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -44, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="announcement-bar"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '10px', minHeight: '44px', padding: '8px 40px 8px 16px',
          background: 'var(--bg2)',
          borderBottom: '1px solid var(--border)',
          fontSize: '13px', color: 'var(--muted)',
          position: 'relative', zIndex: 101,
          flexWrap: 'wrap',
        }}
      >
        <span style={{
          fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em',
          padding: '3px 10px', borderRadius: '99px',
          background: 'rgba(16,185,129,0.1)',
          color: '#10b981', flexShrink: 0,
        }}>
          Lanzamiento
        </span>

        <span className="announcement-text" style={{ textAlign: 'center' }}>
          Pre-registro abierto — registrate y acumula creditos con referidos antes de que abra el marketplace.
        </span>

        <a
          href="/auth/register"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            color: 'var(--accent)', fontWeight: 600, fontSize: '13px',
            flexShrink: 0, textDecoration: 'none',
          }}
        >
          Registrarme
          <ArrowRight size={13} strokeWidth={2.5} />
        </a>

        <button
          onClick={() => setVisible(false)}
          style={{
            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted2)', padding: '4px',
            borderRadius: '6px', display: 'flex',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--muted2)'}
        >
          <X size={14} />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
