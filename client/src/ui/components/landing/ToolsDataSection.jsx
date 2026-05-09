import React, { useRef, useState, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Search, Globe, Users, Eye, BarChart3, PieChart, LineChart, TrendingUp,
  Target, FlaskConical, Sparkles, Layers, Send, Megaphone, MousePointerClick, LayoutGrid,
  ArrowRight,
} from 'lucide-react'
import { FONT_DISPLAY, FONT_BODY, MAX_W } from '../../theme/tokens'

const spring = [0.22, 1, 0.36, 1]
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } }
const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: spring } } }

// Reusable count-up — increments to target once the element scrolls into view.
function useCountUp(target, duration = 2000) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current) {
          started.current = true
          const t0 = performance.now()
          const tick = (now) => {
            const p = Math.min((now - t0) / duration, 1)
            const ease = 1 - Math.pow(1 - p, 3)
            setCount(Math.round(target * ease))
            if (p < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.3 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [target, duration])

  return [count, ref]
}

// 4 hard proof points stamped at the top of the section.
const STATS = [
  { value: 2500, suffix: '+', label: 'Canales con métricas propias' },
  { value: 7, label: 'Plataformas integradas' },
  { value: 30, suffix: '+', label: 'Herramientas operativas' },
  { value: 6, label: 'Métricas propietarias' },
]

// 4 categories — mirror DashboardShowcase colors for visual continuity.
// Each item: tool name + lucide icon + the concrete data point that tool surfaces.
const CATEGORIES = [
  {
    id: 'discovery',
    n: '01',
    label: 'Descubrimiento',
    color: '#3b82f6',
    summary: 'Verás antes de pagar: CPM histórico, audiencia real (sin bots) y saturación de tu nicho.',
    items: [
      { icon: Search,  tool: 'Marketplace',     data: 'CPM histórico de +2.500 canales con métricas propias · filtro por nicho/región/precio' },
      { icon: Globe,   tool: 'Niche Heatmap',   data: 'Saturación % en 23 nichos y 80+ sub-nichos · oportunidades por trimestre' },
      { icon: Users,   tool: 'Lookalike',       data: 'Score de similitud 0–100 con canales que ya te funcionan' },
      { icon: Eye,     tool: 'Channel Audit',   data: '6 métricas propias (CAS, CAF, CTF, CER, CVS, CAP) sin bots ni padding' },
    ],
  },
  {
    id: 'analysis',
    n: '02',
    label: 'Análisis',
    color: '#10b981',
    summary: 'Verás durante la campaña: CTR en vivo, CPM real vs anunciado y audiencia que realmente convierte.',
    items: [
      { icon: BarChart3, tool: 'Analytics dashboard', data: 'Clicks únicos, CPC, alcance y engagement actualizados cada 30s' },
      { icon: PieChart,  tool: 'Cohort Analysis',     data: '8 segmentos por comportamiento: high-intent, navegantes, churn, etc.' },
      { icon: LineChart, tool: 'Realtime Monitor',    data: 'Curva de impresiones live · alerta si CTR cae bajo el baseline' },
      { icon: TrendingUp, tool: 'Audience Insights',  data: '15+ métricas demográficas y de interés por canal y campaña' },
    ],
  },
  {
    id: 'optimization',
    n: '03',
    label: 'Optimización',
    color: '#f59e0b',
    summary: 'Verás antes de escalar: ROAS previsto, mejor copy y canales que no duplican audiencia.',
    items: [
      { icon: Target,       tool: 'ROI Forecast',     data: 'ROAS predicho con intervalo de confianza al 95% · backtested 6m' },
      { icon: FlaskConical, tool: 'A/B Test Lab',     data: '3 tests en paralelo · significancia estadística sin esperar 30 días' },
      { icon: Sparkles,     tool: 'Copy Analyzer',    data: 'Score 0–100 por canal · sugerencias de hooks y CTAs por nicho' },
      { icon: Layers,       tool: 'Audience Overlap', data: '% de solapamiento entre canales · evita pagar por la misma audiencia 2 veces' },
    ],
  },
  {
    id: 'execution',
    n: '04',
    label: 'Ejecución',
    color: '#8b5cf6',
    summary: 'Verás al cerrar: ROI por canal, comparativa vs presupuesto y export listo para tu CRM o BI.',
    items: [
      { icon: Send,              tool: 'Bulk Launcher',     data: '50+ campañas simultáneas con copy variado y presupuesto por canal' },
      { icon: Megaphone,         tool: 'Campaign Builder',  data: 'Wizard 4 pasos: canal → copy → presupuesto → escrow' },
      { icon: MousePointerClick, tool: 'Auto-Buy',          data: 'Reglas: "si CPM < X € y score > Y → comprar slot" · set & forget' },
      { icon: LayoutGrid,        tool: 'Report Studio',     data: 'PDF custom con tu marca · envío programado a tu equipo o cliente' },
    ],
  },
]

function StatChip({ stat, index }) {
  const target = stat.value
  const [count, ref] = useCountUp(target)
  const display = count >= 10000
    ? `${(count / 1000).toFixed(1)}K`.replace('.0K', 'K')
    : count.toLocaleString('es-ES')

  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '20px 22px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 'clamp(26px, 3.4vw, 36px)',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: 'var(--text)',
          lineHeight: 1,
        }}
      >
        {display}
        {stat.suffix || ''}
      </div>
      <div
        style={{
          fontSize: 12,
          color: 'var(--muted)',
          marginTop: 8,
          fontWeight: 500,
        }}
      >
        {stat.label}
      </div>
    </motion.div>
  )
}

function CategoryCard({ cat, index }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: spring }}
      style={{
        position: 'relative',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 22,
        padding: 'clamp(26px, 3vw, 34px)',
        transition: 'border-color .3s, box-shadow .3s',
        boxShadow: '0 8px 24px -16px rgba(15,23,42,0.18)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${cat.color}35`
        e.currentTarget.style.boxShadow = `0 18px 50px -22px ${cat.color}40, 0 0 0 1px ${cat.color}10`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.boxShadow = '0 8px 24px -16px rgba(15,23,42,0.18)'
      }}
    >
      {/* Number chip */}
      <div
        style={{
          position: 'absolute',
          top: -12,
          left: 26,
          minWidth: 32,
          height: 26,
          padding: '0 9px',
          borderRadius: 8,
          background: cat.color,
          color: '#fff',
          fontFamily: FONT_DISPLAY,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 4px 14px -4px ${cat.color}80`,
        }}
      >
        {cat.n}
      </div>

      {/* Category title */}
      <h3
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: 'var(--text)',
          margin: '0 0 22px',
          lineHeight: 1.1,
        }}
      >
        {cat.label}
      </h3>

      {/* Tool rows: icon | tool name → data point */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
        {cat.items.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.tool}
              style={{
                display: 'grid',
                gridTemplateColumns: '36px auto 1fr',
                alignItems: 'flex-start',
                gap: 12,
                paddingBottom: 12,
                borderBottom: '1px dashed var(--border)',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `${cat.color}12`,
                  color: cat.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={17} strokeWidth={2} />
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text)',
                  whiteSpace: 'nowrap',
                  paddingTop: 9,
                }}
              >
                {item.tool}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--muted)',
                  lineHeight: 1.5,
                  paddingTop: 8,
                }}
              >
                {item.data}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary "Verás:" strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          padding: '14px 16px',
          borderRadius: 12,
          background: `${cat.color}08`,
          border: `1px solid ${cat.color}22`,
        }}
      >
        <ArrowRight
          size={16}
          strokeWidth={2.4}
          style={{ color: cat.color, flexShrink: 0, marginTop: 2 }}
        />
        <p
          style={{
            margin: 0,
            fontSize: 13.5,
            color: 'var(--text)',
            lineHeight: 1.55,
            fontWeight: 500,
          }}
        >
          {cat.summary}
        </p>
      </div>
    </motion.div>
  )
}

export default function ToolsDataSection({ background = 'var(--bg)' } = {}) {
  const sectionRef = useRef(null)
  const inView = useInView(sectionRef, { once: true, margin: '-80px' })

  return (
    <section
      ref={sectionRef}
      style={{
        background,
        padding: 'clamp(80px, 10vw, 140px) clamp(16px, 4vw, 24px)',
      }}
    >
      <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(32px, 4vw, 48px)' }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: '#8B5CF6',
              marginBottom: 16,
            }}
          >
            Lo que verás con cada herramienta
          </p>
          <h2
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 'clamp(28px, 4.4vw, 48px)',
              lineHeight: 1.06,
              letterSpacing: '-0.035em',
              margin: '0 0 16px',
              color: 'var(--text)',
              maxWidth: 760,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Datos que ningún competidor expone
          </h2>
          <p
            style={{
              fontFamily: FONT_BODY,
              fontSize: 16,
              color: 'var(--muted)',
              maxWidth: 620,
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            Channelad procesa señales públicas y privadas de cada canal para devolverte
            métricas accionables. Esto es lo que verás en el dashboard al usar cada categoría.
          </p>
        </div>

        {/* Stat chips */}
        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={stagger}
          className="tools-data-stats"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 14,
            marginBottom: 'clamp(48px, 6vw, 72px)',
          }}
        >
          {STATS.map((s, i) => (
            <StatChip key={s.label} stat={s} index={i} />
          ))}
        </motion.div>

        {/* Category cards */}
        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={stagger}
          className="tools-data-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 18,
          }}
        >
          {CATEGORIES.map((cat, i) => (
            <CategoryCard key={cat.id} cat={cat} index={i} />
          ))}
        </motion.div>

        <p
          style={{
            textAlign: 'center',
            marginTop: 40,
            fontSize: 13,
            color: 'var(--muted)',
            maxWidth: 620,
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: 1.6,
          }}
        >
          Datos verificables, auditables y exportables. La metodología detrás de cada métrica
          está documentada en <span style={{ color: 'var(--accent)' }}>el whitepaper</span>.
        </p>

        <style>{`
          @media (max-width: 900px) {
            .tools-data-stats { grid-template-columns: repeat(2, 1fr) !important; }
            .tools-data-grid { grid-template-columns: 1fr !important; }
          }
          @media (max-width: 480px) {
            .tools-data-stats { grid-template-columns: 1fr 1fr !important; }
          }
        `}</style>
      </div>
    </section>
  )
}
