import React, { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { FONT_DISPLAY, FONT_BODY, MAX_W } from '../../theme/tokens'

const spring = [0.22, 1, 0.36, 1]
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }
const slideLeft = { hidden: { opacity: 0, x: -40 }, visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: spring } } }
const slideRight = { hidden: { opacity: 0, x: 40 }, visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: spring } } }
const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: spring } } }

const ROWS = [
  { label: 'CPC medio', trad: '\u20AC0.80 \u2013 \u20AC3.50', channelad: '\u20AC0.05 \u2013 \u20AC0.30', winner: 'channelad' },
  { label: 'Engagement', trad: '0.5 \u2013 2%', channelad: '15 \u2013 45%', winner: 'channelad' },
  { label: 'Confianza', trad: 'Anuncio (baja)', channelad: 'Recomendacion (alta)', winner: 'channelad' },
  { label: 'Tiempo de setup', trad: '2 \u2013 5 dias', channelad: '10 minutos', winner: 'channelad' },
  { label: 'Fraude / bots', trad: '20 \u2013 40% falso', channelad: 'Metricas verificadas', winner: 'channelad' },
]

export default function PricingComparison() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section
      ref={ref}
      style={{
        background: 'var(--bg2)',
        padding: 'clamp(72px,10vw,140px) clamp(16px, 4vw, 24px)',
      }}
    >
      <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 'clamp(36px, 6vw, 64px)' }}>
          <p style={{
            fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.12em', color: 'var(--accent)', marginBottom: '16px',
          }}>
            Sin sorpresas
          </p>
          <h2 style={{
            fontFamily: FONT_DISPLAY, fontWeight: 700,
            fontSize: 'clamp(24px, 4vw, 44px)',
            lineHeight: 1.08, letterSpacing: '-0.03em',
            margin: 0, color: 'var(--text)',
          }}>
            Precios claros. Resultados medibles.
          </h2>
        </div>

        <div className="pricing-main-grid" style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 'clamp(24px, 4vw, 56px)', alignItems: 'start',
        }}>
          {/* Comparison table */}
          <motion.div
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            variants={slideLeft}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {/* Header */}
            <div className="pricing-table-header" style={{
              display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: 'var(--muted)',
            }}>
              <div />
              <div>Ads tradicionales</div>
              <div style={{ color: 'var(--accent)' }}>Channelad</div>
            </div>

            {/* Rows */}
            <motion.div variants={stagger} initial="hidden" animate={inView ? 'visible' : 'hidden'}>
              {ROWS.map((row, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="pricing-table-row"
                  style={{
                    display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr',
                    padding: '14px 20px',
                    borderBottom: i < ROWS.length - 1 ? '1px solid var(--border)' : 'none',
                    fontSize: '13px',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontWeight: 500, color: 'var(--text)' }}>{row.label}</div>
                  <div style={{ color: 'var(--muted)' }}>{row.trad}</div>
                  <div style={{
                    color: 'var(--accent)', fontWeight: 600,
                  }}>
                    {row.channelad}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Commission explanation */}
          <motion.div
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            variants={slideRight}
          >
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              padding: 'clamp(24px, 4vw, 36px)',
              boxShadow: 'var(--shadow-sm)',
              marginBottom: '24px',
            }}>
              <h3 style={{
                fontFamily: FONT_DISPLAY, fontWeight: 700,
                fontSize: 'clamp(18px, 3vw, 24px)', letterSpacing: '-0.02em',
                margin: '0 0 16px', color: 'var(--text)',
              }}>
                Comision del 20% al anunciante
              </h3>
              <p style={{
                fontSize: 'clamp(14px, 2.5vw, 17px)', lineHeight: 1.7, color: 'var(--muted)',
                margin: '0 0 24px',
              }}>
                El creador cobra el 100% de su tarifa. Channelad cobra solo al anunciante,
                y solo cuando la campana se verifica con exito.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  'Creador cobra el 100% de su precio',
                  'Escrow via Stripe Connect \u2014 fondos protegidos',
                  'Verificacion automatica con tracking links',
                  'IVA 21% aplicado segun legislacion espanola',
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    fontSize: '14px', color: 'var(--text-secondary, var(--text))',
                  }}>
                    <span style={{
                      width: '20px', height: '20px', borderRadius: '50%',
                      background: 'var(--accent-surface, rgba(124,58,237,0.06))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', color: 'var(--accent)', flexShrink: 0,
                    }}>
                      {'\u2713'}
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <motion.a
              href="/auth/register"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'var(--accent)', color: '#fff',
                padding: '14px 28px', borderRadius: '12px',
                fontSize: '15px', fontWeight: 600,
                textDecoration: 'none',
                boxShadow: 'var(--shadow-btn-glow)',
              }}
            >
              Empieza gratis
            </motion.a>
          </motion.div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .pricing-main-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
        }
        @media (max-width: 480px) {
          .pricing-table-header,
          .pricing-table-row {
            grid-template-columns: 1fr 0.8fr 0.8fr !important;
            padding: 12px 14px !important;
            font-size: 12px !important;
          }
        }
      `}</style>
    </section>
  )
}
