import React, { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Check, X, TrendingUp, Users, Target, Clock, Shield, Zap } from 'lucide-react'
import { FONT_DISPLAY, FONT_BODY, MAX_W } from '../../theme/tokens'

const spring = [0.22, 1, 0.36, 1]

const ROWS = [
  { icon: TrendingUp, label: 'CTR medio',
    paid: { val: '0.5–2%', good: false },
    channel: { val: '15–45%', good: true } },
  { icon: Users, label: 'Confianza del usuario',
    paid: { val: 'Baja (anuncio)', good: false },
    channel: { val: 'Alta (lider)', good: true } },
  { icon: Target, label: 'Segmentacion',
    paid: { val: 'Algoritmo opaco', good: false },
    channel: { val: 'Por nicho real', good: true } },
  { icon: Clock, label: 'Tiempo de setup',
    paid: { val: '2–7 dias', good: false },
    channel: { val: '< 5 minutos', good: true } },
  { icon: Shield, label: 'Proteccion del pago',
    paid: { val: 'Pago por adelantado', good: false },
    channel: { val: 'Escrow Stripe', good: true } },
  { icon: Zap, label: 'Verificacion de entrega',
    paid: { val: 'Reportes opacos', good: false },
    channel: { val: 'Tracking links', good: true } },
]

function Cell({ data }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 14,
      color: data.good ? '#10b981' : '#ef4444',
      fontWeight: 600,
    }}>
      {data.good
        ? <Check size={16} strokeWidth={3} />
        : <X size={16} strokeWidth={3} />
      }
      <span style={{ color: 'var(--text)', fontWeight: 500 }}>{data.val}</span>
    </div>
  )
}

export default function ComparisonSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section
      ref={ref}
      id="comparativa"
      style={{
        background: 'var(--bg2)',
        padding: 'clamp(72px,10vw,140px) clamp(16px, 4vw, 24px)',
      }}
    >
      <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 'clamp(36px, 6vw, 56px)' }}>
          <p style={{
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.12em', color: '#7C3AED', marginBottom: 16,
          }}>
            Comparativa real
          </p>
          <h2 style={{
            fontFamily: FONT_DISPLAY, fontWeight: 700,
            fontSize: 'clamp(24px, 4vw, 44px)',
            lineHeight: 1.08, letterSpacing: '-0.03em',
            margin: '0 0 16px', color: 'var(--text)',
          }}>
            Paid Ads vs. Channelad
          </h2>
          <p style={{
            fontFamily: FONT_BODY, fontSize: 16, color: 'var(--muted)',
            maxWidth: 540, margin: '0 auto', lineHeight: 1.6,
          }}>
            Lo que pagas en Meta y Google Ads vs. lo que consigues en comunidades reales.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: spring }}
          className="cmp-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            position: 'relative',
          }}
        >
          {/* Paid Ads card */}
          <div style={{
            background: '#fff',
            border: '1px solid rgba(15,23,42,0.08)',
            borderRadius: 20,
            padding: 'clamp(20px, 3vw, 32px)',
            opacity: 0.92,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
              paddingBottom: 16, borderBottom: '1px solid rgba(15,23,42,0.06)',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 700, fontFamily: FONT_DISPLAY,
              }}>×</div>
              <div>
                <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  Lo de siempre
                </div>
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, margin: '2px 0 0', letterSpacing: '-0.02em' }}>
                  Meta &amp; Google Ads
                </h3>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {ROWS.map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
                >
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 500 }}>
                    {r.label}
                  </div>
                  <Cell data={r.paid} />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Channelad card */}
          <motion.div
            whileHover={{ y: -4 }}
            style={{
              background: '#fff',
              border: '2px solid #7C3AED',
              borderRadius: 20,
              padding: 'clamp(20px, 3vw, 32px)',
              boxShadow: '0 24px 60px rgba(124,58,237,0.15), 0 0 0 1px rgba(124,58,237,0.1)',
              position: 'relative',
            }}
          >
            <div style={{
              position: 'absolute', top: -12, right: 24,
              background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
              color: '#fff', fontSize: 11, fontWeight: 700,
              padding: '4px 12px', borderRadius: 6,
              textTransform: 'uppercase', letterSpacing: 0.6,
              boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
            }}>
              Recomendado
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
              paddingBottom: 16, borderBottom: '1px solid rgba(15,23,42,0.06)',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700, fontFamily: FONT_DISPLAY,
              }}>C</div>
              <div>
                <div style={{ fontSize: 11, color: '#7C3AED', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  La nueva forma
                </div>
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, margin: '2px 0 0', letterSpacing: '-0.02em' }}>
                  Channelad
                </h3>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {ROWS.map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.15 + i * 0.05, duration: 0.4 }}
                >
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 500 }}>
                    {r.label}
                  </div>
                  <Cell data={r.channel} />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* VS badge */}
          <div className="cmp-vs" style={{
            position: 'absolute', left: '50%', top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 56, height: 56, borderRadius: '50%',
            background: '#fff', border: '1px solid rgba(15,23,42,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700,
            color: 'var(--muted)', letterSpacing: '-0.02em',
            boxShadow: '0 8px 20px rgba(15,23,42,0.06)',
            zIndex: 2, pointerEvents: 'none',
          }}>VS</div>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 760px) {
          .cmp-grid { grid-template-columns: 1fr !important; }
          .cmp-vs { display: none !important; }
        }
      `}</style>
    </section>
  )
}
