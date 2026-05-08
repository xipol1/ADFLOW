import React, { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Check, X, TrendingUp, Users, Target, Clock, Shield, Zap,
  Coins, CalendarClock, Lock, BadgeCheck, Activity,
} from 'lucide-react'
import { FONT_DISPLAY, FONT_BODY, MAX_W } from '../../theme/tokens'

const spring = [0.22, 1, 0.36, 1]

// Two narratives — advertiser frames "Paid Ads vs Channelad", creator frames
// "Networks tradicionales vs Channelad". Same component, props pick the data.
const VARIANTS = {
  advertiser: {
    eyebrow: 'Comparativa real',
    title: 'Paid Ads vs. Channelad',
    subtitle: 'Lo que pagas en Meta y Google Ads vs. lo que consigues en comunidades reales.',
    accent: '#7C3AED',
    accentSoft: 'rgba(124,58,237,0.15)',
    accentRgb: '124,58,237',
    leftCard: { eyebrow: 'Lo de siempre', title: 'Meta & Google Ads', letter: '×' },
    rightCard: { eyebrow: 'La nueva forma', title: 'Channelad', letter: 'C' },
    rows: [
      { icon: TrendingUp, label: 'CTR medio',
        left: { val: '0.5–2%', good: false }, right: { val: '15–45%', good: true } },
      { icon: Users, label: 'Confianza del usuario',
        left: { val: 'Baja (anuncio)', good: false }, right: { val: 'Alta (líder)', good: true } },
      { icon: Target, label: 'Segmentación',
        left: { val: 'Algoritmo opaco', good: false }, right: { val: 'Por nicho real', good: true } },
      { icon: Clock, label: 'Tiempo de setup',
        left: { val: '2–7 días', good: false }, right: { val: '< 5 minutos', good: true } },
      { icon: Shield, label: 'Protección del pago',
        left: { val: 'Pago por adelantado', good: false }, right: { val: 'Escrow Stripe', good: true } },
      { icon: Zap, label: 'Verificación de entrega',
        left: { val: 'Reportes opacos', good: false }, right: { val: 'Tracking links', good: true } },
    ],
  },
  creator: {
    eyebrow: 'Channelad vs alternativas',
    title: 'Lo que pagas por monetizar tu comunidad.',
    subtitle: 'Comparación honesta frente a las networks tradicionales — comisión real, plazos de cobro y libertad operativa.',
    accent: '#22c55e',
    accentSoft: 'rgba(34,197,94,0.15)',
    accentRgb: '34,197,94',
    leftCard: { eyebrow: 'Lo de siempre', title: 'Networks tradicionales', letter: '×' },
    rightCard: { eyebrow: 'La nueva forma', title: 'Channelad', letter: 'C' },
    rows: [
      { icon: Coins, label: 'Comisión al creador',
        left: { val: '30–50% sobre tu precio', good: false }, right: { val: '0% · la pagamos del anunciante', good: true } },
      { icon: CalendarClock, label: 'Plazo de cobro',
        left: { val: '60–90 días post-publicación', good: false }, right: { val: '24–48h (escrow auto)', good: true } },
      { icon: Clock, label: 'Verificación inicial del canal',
        left: { val: '1–4 semanas (manual)', good: false }, right: { val: '5 minutos (tracking link)', good: true } },
      { icon: Lock, label: 'Exclusividad',
        left: { val: 'Sí, contractual', good: false }, right: { val: 'No, nunca', good: true } },
      { icon: BadgeCheck, label: 'Anunciantes verificados',
        left: { val: 'Variable, sin KYC', good: false }, right: { val: 'KYC + escrow obligatorio', good: true } },
      { icon: Activity, label: 'Métricas en tiempo real',
        left: { val: 'PDF mensual', good: false }, right: { val: 'Dashboard live 24/7', good: true } },
    ],
  },
}

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

export default function ComparisonSection({
  background = 'var(--bg2)',
  sectionId = 'comparativa',
  variant = 'advertiser',
} = {}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const cfg = VARIANTS[variant] || VARIANTS.advertiser

  return (
    <section
      ref={ref}
      id={sectionId}
      style={{
        background,
        padding: 'clamp(72px,10vw,140px) clamp(16px, 4vw, 24px)',
      }}
    >
      <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 'clamp(36px, 6vw, 56px)' }}>
          <p style={{
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.12em', color: cfg.accent, marginBottom: 16,
          }}>
            {cfg.eyebrow}
          </p>
          <h2 style={{
            fontFamily: FONT_DISPLAY, fontWeight: 700,
            fontSize: 'clamp(24px, 4vw, 44px)',
            lineHeight: 1.08, letterSpacing: '-0.03em',
            margin: '0 0 16px', color: 'var(--text)',
          }}>
            {cfg.title}
          </h2>
          <p style={{
            fontFamily: FONT_BODY, fontSize: 16, color: 'var(--muted)',
            maxWidth: 560, margin: '0 auto', lineHeight: 1.6,
          }}>
            {cfg.subtitle}
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
          {/* Left card — "lo de siempre" */}
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
              }}>{cfg.leftCard.letter}</div>
              <div>
                <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  {cfg.leftCard.eyebrow}
                </div>
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, margin: '2px 0 0', letterSpacing: '-0.02em' }}>
                  {cfg.leftCard.title}
                </h3>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {cfg.rows.map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
                >
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 500 }}>
                    {r.label}
                  </div>
                  <Cell data={r.left} />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right card — Channelad (highlighted) */}
          <motion.div
            whileHover={{ y: -4 }}
            style={{
              background: '#fff',
              border: `2px solid ${cfg.accent}`,
              borderRadius: 20,
              padding: 'clamp(20px, 3vw, 32px)',
              boxShadow: `0 24px 60px rgba(${cfg.accentRgb},0.15), 0 0 0 1px rgba(${cfg.accentRgb},0.1)`,
              position: 'relative',
            }}
          >
            <div style={{
              position: 'absolute', top: -12, right: 24,
              background: `linear-gradient(135deg, ${cfg.accent}, ${cfg.accent}cc)`,
              color: '#fff', fontSize: 11, fontWeight: 700,
              padding: '4px 12px', borderRadius: 6,
              textTransform: 'uppercase', letterSpacing: 0.6,
              boxShadow: `0 4px 12px rgba(${cfg.accentRgb},0.3)`,
            }}>
              Recomendado
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
              paddingBottom: 16, borderBottom: '1px solid rgba(15,23,42,0.06)',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `linear-gradient(135deg, ${cfg.accent}, ${cfg.accent}cc)`,
                color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700, fontFamily: FONT_DISPLAY,
              }}>{cfg.rightCard.letter}</div>
              <div>
                <div style={{ fontSize: 11, color: cfg.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  {cfg.rightCard.eyebrow}
                </div>
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, margin: '2px 0 0', letterSpacing: '-0.02em' }}>
                  {cfg.rightCard.title}
                </h3>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {cfg.rows.map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.15 + i * 0.05, duration: 0.4 }}
                >
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 500 }}>
                    {r.label}
                  </div>
                  <Cell data={r.right} />
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
