import React from 'react'
import { motion } from 'framer-motion'
import { Shield, BadgeCheck, Headphones, Globe } from 'lucide-react'
import { FONT_DISPLAY, MAX_W } from '../../theme/tokens'
import { PLATFORM_BRAND } from '../../theme/tokens'

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }
const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } }

const PLATFORMS = [
  { key: 'whatsapp',  label: 'WhatsApp' },
  { key: 'telegram',  label: 'Telegram' },
  { key: 'discord',   label: 'Discord' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook',  label: 'Facebook' },
  { key: 'youtube',   label: 'YouTube' },
  { key: 'newsletter',label: 'Newsletter' },
]

const TRUST_BADGES = [
  { icon: Shield,     label: 'Pagos protegidos con escrow' },
  { icon: BadgeCheck,  label: 'Canales verificados' },
  { icon: Headphones, label: 'Soporte humano en 24h' },
  { icon: Globe,      label: '15+ paises' },
]

export default function SocialProofStrip() {
  return (
    <section style={{
      background: 'var(--bg2)',
      borderTop: '1px solid var(--border)',
      borderBottom: '1px solid var(--border)',
      padding: '40px 0',
    }}>
      <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
        {/* Platform strip */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
        >
          <motion.span variants={fadeUp} style={{
            display: 'block', fontSize: '13px', color: 'var(--muted)', fontWeight: 500,
            textAlign: 'center', marginBottom: '20px', padding: '0 24px',
          }}>
            Canales en las plataformas que ya usas
          </motion.span>

          <div className="social-proof-platforms" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '24px', flexWrap: 'wrap', padding: '0 24px', marginBottom: '28px',
          }}>
            {PLATFORMS.map(p => {
              const brand = PLATFORM_BRAND[p.key]
              return (
                <motion.div
                  key={p.key}
                  variants={fadeUp}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontSize: '13px', fontWeight: 600, color: 'var(--muted)',
                    cursor: 'default', transition: 'color 0.2s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = brand?.color || 'var(--text)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                >
                  <span style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: brand?.color || '#888', flexShrink: 0,
                  }} />
                  {p.label}
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
          className="social-proof-badges"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '20px', flexWrap: 'wrap', padding: '0 24px',
          }}
        >
          {TRUST_BADGES.map((b, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary, var(--muted))',
              }}
            >
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'var(--accent-surface, rgba(124,58,237,0.04))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent)', flexShrink: 0,
              }}>
                <b.icon size={16} strokeWidth={2} />
              </div>
              {b.label}
            </motion.div>
          ))}
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .social-proof-platforms {
            overflow-x: auto;
            flex-wrap: nowrap !important;
            justify-content: flex-start !important;
            padding: 0 24px !important;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .social-proof-platforms::-webkit-scrollbar { display: none; }
          .social-proof-badges {
            gap: 16px !important;
            font-size: 12px !important;
          }
          .social-proof-badges > div {
            font-size: 12px !important;
          }
        }
      `}</style>
    </section>
  )
}
