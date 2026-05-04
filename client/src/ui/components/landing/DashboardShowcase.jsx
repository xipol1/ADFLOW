import React, { useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Search, BarChart3, Target, FlaskConical, Users, PieChart, Globe, LineChart,
  Send, Megaphone, TrendingUp, Eye, Zap, MousePointerClick, Layers,
  LayoutGrid, ArrowRight, Sparkles,
} from 'lucide-react'
import { FONT_DISPLAY, FONT_BODY, MAX_W } from '../../theme/tokens'

const spring = [0.22, 1, 0.36, 1]
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } } }
const cardReveal = {
  hidden: { opacity: 0, y: 30, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: spring } },
}

const CATEGORIES = [
  {
    id: 'discovery',
    label: 'Descubrimiento',
    icon: Search,
    color: '#3b82f6',
    tools: [
      { icon: Search, name: 'Marketplace', desc: 'Filtra 2,800+ canales por nicho, plataforma y precio', metric: '2,847 canales' },
      { icon: Globe, name: 'Niche Heatmap', desc: 'Mapa de calor interactivo con 23 nichos y sub-nichos', metric: '23 nichos' },
      { icon: Users, name: 'Lookalike Channels', desc: 'Encuentra canales similares a los que ya te funcionan', metric: '95% precision' },
      { icon: Eye, name: 'Channel Audit', desc: 'Audita metricas reales de cualquier canal antes de comprar', metric: 'Datos verificados' },
    ],
  },
  {
    id: 'analysis',
    label: 'Analisis',
    icon: BarChart3,
    color: '#10b981',
    tools: [
      { icon: BarChart3, name: 'Analytics Dashboard', desc: 'Clicks, CPC, alcance y engagement en tiempo real', metric: 'Real-time' },
      { icon: PieChart, name: 'Cohort Analysis', desc: 'Segmenta audiencias por comportamiento y engagement', metric: '8 segmentos' },
      { icon: LineChart, name: 'Realtime Monitor', desc: 'Monitoriza el rendimiento de campanas al instante', metric: 'Live data' },
      { icon: TrendingUp, name: 'Audience Insights', desc: 'Datos demograficos y de interes de cada canal', metric: '15+ metricas' },
    ],
  },
  {
    id: 'optimization',
    label: 'Optimizacion',
    icon: Target,
    color: '#f59e0b',
    tools: [
      { icon: Target, name: 'ROI Forecast', desc: 'Prediccion de ROAS antes de invertir un centimo', metric: '4.2x ROAS' },
      { icon: FlaskConical, name: 'A/B Test Lab', desc: 'Testea copys, creativos y segmentos antes de escalar', metric: '3 tests activos' },
      { icon: Sparkles, name: 'Copy Analyzer', desc: 'IA que analiza y puntua tu texto publicitario por canal', metric: 'Score 0-100' },
      { icon: Layers, name: 'Audience Overlap', desc: 'Detecta solapamiento entre audiencias de canales', metric: 'Evita duplicados' },
    ],
  },
  {
    id: 'execution',
    label: 'Ejecucion',
    icon: Send,
    color: '#8b5cf6',
    tools: [
      { icon: Send, name: 'Bulk Launcher', desc: 'Lanza 50+ campanas simultaneas con un solo click', metric: '50+ / dia' },
      { icon: Megaphone, name: 'Campaign Builder', desc: 'Wizard guiado: canal, copy, presupuesto y pago seguro', metric: '4 pasos' },
      { icon: MousePointerClick, name: 'Auto-Buy', desc: 'Reglas automaticas para comprar en canales que cumplen criterios', metric: 'Set & forget' },
      { icon: LayoutGrid, name: 'Report Studio', desc: 'Informes personalizados exportables en PDF', metric: 'Custom reports' },
    ],
  },
]

function ToolCard({ tool, categoryColor, index }) {
  const [isHovered, setIsHovered] = useState(false)
  const Icon = tool.icon

  return (
    <motion.div
      variants={cardReveal}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isHovered ? `${categoryColor}06` : 'var(--surface)',
        border: `1px solid ${isHovered ? categoryColor + '25' : 'var(--border)'}`,
        borderRadius: '16px',
        padding: '20px',
        cursor: 'default',
        transition: 'all 0.3s cubic-bezier(.22,1,.36,1)',
        transform: isHovered ? 'translateY(-4px)' : 'none',
        boxShadow: isHovered ? `0 12px 32px ${categoryColor}12` : 'var(--shadow-xs)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: `${categoryColor}10`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: categoryColor,
          transition: 'transform 0.3s',
          transform: isHovered ? 'scale(1.1)' : 'none',
        }}>
          <Icon size={18} strokeWidth={2} />
        </div>
        <div style={{
          fontSize: '10px', fontWeight: 600, color: categoryColor,
          background: `${categoryColor}08`,
          padding: '3px 8px', borderRadius: '6px',
          border: `1px solid ${categoryColor}15`,
        }}>
          {tool.metric}
        </div>
      </div>
      <h4 style={{
        fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: '14px',
        margin: '0 0 6px', color: 'var(--text)', letterSpacing: '-0.02em',
      }}>
        {tool.name}
      </h4>
      <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
        {tool.desc}
      </p>
    </motion.div>
  )
}

export default function DashboardShowcase() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [activeCategory, setActiveCategory] = useState('discovery')

  const activeCat = CATEGORIES.find(c => c.id === activeCategory)

  return (
    <section
      ref={ref}
      id="dashboard-tour"
      style={{
        background: 'var(--bg)',
        padding: 'clamp(72px,10vw,140px) clamp(16px, 4vw, 24px)',
      }}
    >
      <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(32px, 5vw, 48px)' }}>
          <p style={{
            fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.12em', color: 'var(--accent)', marginBottom: '16px',
          }}>
            +30 herramientas integradas
          </p>
          <h2 style={{
            fontFamily: FONT_DISPLAY, fontWeight: 700,
            fontSize: 'clamp(24px, 4vw, 44px)',
            lineHeight: 1.08, letterSpacing: '-0.03em',
            margin: '0 0 16px', color: 'var(--text)',
          }}>
            Todo lo que necesitas, en un solo lugar
          </h2>
          <p style={{
            fontFamily: FONT_BODY, fontSize: '16px', color: 'var(--muted)',
            maxWidth: '520px', margin: '0 auto', lineHeight: 1.6,
          }}>
            Desde el descubrimiento de canales hasta el informe final.
            Sin cambiar de herramienta, sin integraciones complicadas.
          </p>
        </div>

        {/* Category tabs */}
        <div className="showcase-tabs" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '8px', flexWrap: 'wrap',
          marginBottom: 'clamp(28px, 4vw, 40px)',
        }}>
          {CATEGORIES.map(cat => {
            const isActive = cat.id === activeCategory
            const CatIcon = cat.icon
            return (
              <motion.button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  padding: '10px 18px', borderRadius: '12px',
                  border: `1px solid ${isActive ? cat.color + '40' : 'var(--border)'}`,
                  background: isActive ? `${cat.color}10` : 'var(--surface)',
                  color: isActive ? cat.color : 'var(--muted)',
                  fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.25s',
                  fontFamily: FONT_BODY,
                }}
              >
                <CatIcon size={15} strokeWidth={2} />
                {cat.label}
              </motion.button>
            )
          })}
        </div>

        {/* Tool cards grid */}
        <motion.div
          key={activeCategory}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={stagger}
          className="showcase-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '14px',
          }}
        >
          {activeCat.tools.map((tool, i) => (
            <ToolCard
              key={tool.name}
              tool={tool}
              categoryColor={activeCat.color}
              index={i}
            />
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <div style={{ textAlign: 'center', marginTop: 'clamp(32px, 5vw, 48px)' }}>
          <motion.a
            href="/auth/register"
            className="cta-shift"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              color: '#fff',
              padding: '14px 28px', borderRadius: '12px',
              fontSize: '15px', fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Acceder al dashboard
            <ArrowRight size={16} strokeWidth={2.5} />
          </motion.a>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .showcase-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 520px) {
          .showcase-grid { grid-template-columns: 1fr !important; }
          .showcase-tabs {
            flex-wrap: nowrap !important;
            justify-content: flex-start !important;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            margin-left: -16px;
            margin-right: -16px;
            padding: 4px 16px 12px;
            mask-image: linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent);
            -webkit-mask-image: linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent);
          }
          .showcase-tabs::-webkit-scrollbar { display: none; }
          .showcase-tabs button { scroll-snap-align: center; flex-shrink: 0; }
        }
      `}</style>
    </section>
  )
}
