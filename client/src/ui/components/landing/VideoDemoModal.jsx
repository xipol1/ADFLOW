import React from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export default function VideoDemoModal({ open, onClose, src = '/demo.mp4', poster = '/demo-poster.webp' }) {
  if (typeof document === 'undefined') return null
  return createPortal(<VideoModalInner open={open} onClose={onClose} src={src} poster={poster} />, document.body)
}

function VideoModalInner({ open, onClose, src, poster }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 150,
            background: 'rgba(15,23,42,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%', maxWidth: 960,
              aspectRatio: '16 / 9',
              background: '#000',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
            }}
          >
            <button
              onClick={onClose}
              aria-label="Cerrar video"
              style={{
                position: 'absolute', top: -44, right: 0,
                background: 'rgba(255,255,255,0.15)',
                border: 'none', borderRadius: 8,
                width: 36, height: 36,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', cursor: 'pointer',
                backdropFilter: 'blur(8px)',
              }}
            ><X size={18} /></button>

            <video
              src={src}
              poster={poster}
              autoPlay
              controls
              playsInline
              preload="none"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
