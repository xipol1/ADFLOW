import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Compass, LineChart, TrendingUp, Rocket, ArrowLeft } from 'lucide-react'
import SEO from '../../components/SEO'
import MotionSection, { fadeUp, staggerItem } from '../../components/landing/MotionSection'
import {
  PURPLE as A,
  purpleAlpha as AG,
  FONT_BODY,
  FONT_DISPLAY,
  MAX_W,
} from '../../theme/tokens'

const F = FONT_BODY
const D = FONT_DISPLAY

// 4 categorías x 4 herramientas. Refleja la suite real disponible bajo
// /advertiser/* (representativa, no exhaustiva).
const TOOLKIT_CATEGORIES = [
  {
    n: '01',
    icon: Compass,
    color: '#7C3AED',
    title: 'Descubrir',
    desc: 'Encuentra los canales que tu audiencia ya está siguiendo.',
    tools: ['Marketplace', 'Heatmap de nichos', 'Canales similares', 'Auditoría bulk'],
  },
  {
    n: '02',
    icon: LineChart,
    color: '#3b82f6',
    title: 'Analizar',
    desc: 'Mide audiencia, calidad y rendimiento con datos verificados.',
    tools: ['Analytics dashboard', 'Cohort analysis', 'Monitor en tiempo real', 'Audience Insights'],
  },
  {
    n: '03',
    icon: TrendingUp,
    color: '#f59e0b',
    title: 'Optimizar',
    desc: 'Aprende qué funciona y replica los wins en cada campaña.',
    tools: ['Forecaster ROI', 'A/B Test Lab', 'Copy Analyzer', 'Solapamiento de audiencias'],
  },
  {
    n: '04',
    icon: Rocket,
    color: '#16a34a',
    title: 'Ejecutar',
    desc: 'Lanza, automatiza y escala en una decena de canales a la vez.',
    tools: ['Bulk Launcher', 'Campaign Builder', 'Auto-Buy', 'Report Studio'],
  },
]

export default function HerramientasPage() {
  return (
    <main
      data-testid="herramientas-page"
      style={{
        fontFamily: F,
        color: 'var(--text)',
        background:
          'radial-gradient(ellipse 90% 50% at 75% 8%, rgba(124, 58, 237, 0.08) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 15% 30%, rgba(99, 102, 241, 0.05) 0%, transparent 60%), var(--bg)',
        position: 'relative',
        minHeight: '100vh',
      }}
    >
      <SEO
        title="Herramientas para anunciantes"
        description="+30 herramientas en una plataforma: descubrir canales, analizar audiencia, optimizar ROI y ejecutar campañas en comunidades privadas. Todas incluidas en la comisión."
        path="/herramientas"
        type="website"
      />

      {/* ── HERO ─ headline + back-to-landing CTA ─────────────────────── */}
      <MotionSection style={{ padding: '108px 32px 56px', background: 'transparent' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          {/* Back to landing chip */}
          <motion.div variants={fadeUp} style={{ marginBottom: 28 }}>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 999,
                background: AG(0.08),
                border: `1px solid ${AG(0.20)}`,
                color: A,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'background .2s, transform .2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = AG(0.14)
                e.currentTarget.style.transform = 'translateX(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = AG(0.08)
                e.currentTarget.style.transform = 'none'
              }}
            >
              <ArrowLeft size={14} strokeWidth={2.4} />
              Para marcas
            </Link>
          </motion.div>

          <motion.div variants={fadeUp} style={{ maxWidth: 760, marginBottom: 16 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: A,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                marginBottom: 14,
              }}
            >
              Herramientas
            </p>
            <h1
              style={{
                fontFamily: D,
                fontSize: 'clamp(36px, 4.8vw, 60px)',
                fontWeight: 700,
                letterSpacing: '-0.035em',
                color: 'var(--text)',
                marginBottom: 18,
                marginTop: 0,
                lineHeight: 1.05,
              }}
            >
              +30 herramientas en una plataforma
            </h1>
            <p
              style={{
                fontSize: 17,
                color: 'var(--muted)',
                lineHeight: 1.65,
                margin: 0,
                maxWidth: 600,
              }}
            >
              Channelad no es solo un marketplace. Es el sistema operativo completo para descubrir
              canales, analizar audiencia, optimizar ROI y ejecutar campañas en comunidades privadas.
              Todas las herramientas vienen incluidas en la comisión.
            </p>
          </motion.div>
        </div>
      </MotionSection>

      {/* ── TOOLKIT GRID ──────────────────────────────────────────────── */}
      <MotionSection style={{ padding: '40px 32px 100px', background: 'transparent' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}
            className="toolkit-grid"
          >
            {TOOLKIT_CATEGORIES.map((cat) => {
              const Icon = cat.icon
              return (
                <motion.div
                  key={cat.n}
                  variants={staggerItem}
                  whileHover={{ y: -6, transition: { duration: 0.25 } }}
                  style={{
                    position: 'relative',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 20,
                    padding: 'clamp(24px, 3vw, 30px)',
                    transition: 'all 0.35s cubic-bezier(.22,1,.36,1)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `${cat.color}06`
                    e.currentTarget.style.borderColor = `${cat.color}30`
                    e.currentTarget.style.boxShadow = `0 20px 50px ${cat.color}15, 0 0 0 1px ${cat.color}10`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--surface)'
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                  }}
                >
                  {/* Number badge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: -12,
                      left: 22,
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: cat.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: D,
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#fff',
                      boxShadow: `0 4px 12px -4px ${cat.color}80`,
                    }}
                  >
                    {cat.n}
                  </div>

                  {/* Icon */}
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      background: `${cat.color}10`,
                      color: cat.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 16,
                      marginTop: 4,
                    }}
                  >
                    <Icon size={24} strokeWidth={1.9} />
                  </div>

                  <h3
                    style={{
                      fontFamily: D,
                      fontSize: 18,
                      fontWeight: 700,
                      color: 'var(--text)',
                      letterSpacing: '-0.02em',
                      margin: 0,
                      marginBottom: 8,
                    }}
                  >
                    {cat.title}
                  </h3>

                  <p
                    style={{
                      fontSize: 13,
                      color: 'var(--muted)',
                      lineHeight: 1.55,
                      margin: 0,
                      marginBottom: 18,
                    }}
                  >
                    {cat.desc}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {cat.tools.map((tool) => (
                      <div
                        key={tool}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '7px 10px',
                          borderRadius: 8,
                          background: 'var(--bg2)',
                          border: '1px solid var(--border)',
                          fontSize: 12,
                          color: 'var(--text)',
                          fontWeight: 500,
                        }}
                      >
                        <span
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: '50%',
                            background: cat.color,
                            flexShrink: 0,
                          }}
                        />
                        {tool}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )
            })}
          </div>

          <motion.p
            variants={fadeUp}
            style={{
              textAlign: 'center',
              marginTop: 48,
              fontSize: 14,
              color: 'var(--muted)',
              fontWeight: 500,
              maxWidth: 640,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Acceso completo desde el primer día. Todas las herramientas incluidas en la comisión —
            sin add-ons, sin tiers de pago.
          </motion.p>

          {/* Bottom CTA back to landing */}
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 28px',
                borderRadius: 12,
                background: 'linear-gradient(180deg, #8B5CF6 0%, #7C3AED 100%)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow:
                  '0 1px 0 0 rgba(255,255,255,0.18) inset, 0 12px 28px -8px rgba(124,58,237,0.45)',
                transition: 'transform .25s, box-shadow .25s, background .25s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(180deg, #A78BFA 0%, #8B5CF6 100%)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(180deg, #8B5CF6 0%, #7C3AED 100%)'
                e.currentTarget.style.transform = 'none'
              }}
            >
              <ArrowLeft size={16} strokeWidth={2.4} />
              Volver a la landing para marcas
            </Link>
          </div>

          <style>{`
            @media (max-width: 1000px) {
              .toolkit-grid { grid-template-columns: repeat(2, 1fr) !important; }
            }
            @media (max-width: 540px) {
              .toolkit-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </div>
      </MotionSection>
    </main>
  )
}
