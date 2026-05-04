import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export default function VideoDemoModal({ open, onClose, src }) {
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

            {src ? (
              <video
                src={src}
                autoPlay
                controls
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontFamily: 'system-ui',
                background: 'radial-gradient(circle at center, rgba(124,58,237,0.3) 0%, transparent 70%)',
                textAlign: 'center', padding: 40,
              }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Demo en preparacion</div>
                  <div style={{ fontSize: 14, opacity: 0.7 }}>El video del dashboard estara disponible muy pronto.</div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
