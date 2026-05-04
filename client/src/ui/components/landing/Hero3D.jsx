import React, { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, Search, BarChart3, Send, Shield, Zap, Users, TrendingUp,
  Target, Layout, FlaskConical, Megaphone, PieChart, Globe, LineChart,
  MousePointerClick, Wallet, CreditCard, Eye, Bell, MessageSquare,
  ArrowUpRight, Activity, Sparkles, Mail, PlayCircle, Megaphone as MegaIcon, DollarSign,
} from 'lucide-react'
import { FONT_DISPLAY, FONT_BODY, MAX_W } from '../../theme/tokens'

const spring = [0.22, 1, 0.36, 1]
const revealUp = {
  hidden: { opacity: 0, y: 60 },
  visible: (d = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.8, ease: spring, delay: d } }),
}

/* ── Module data with chart types ──────────────────────────────── */
const DASHBOARD_MODULES = [
  { icon: Layout, label: 'Overview', color: '#8b5cf6', value: 12, suffix: ' activas', sub: 'Campanas', chart: 'line', live: true },
  { icon: Search, label: 'Marketplace', color: '#3b82f6', value: 2847, suffix: '', sub: 'Canales', chart: 'bar' },
  { icon: BarChart3, label: 'Analytics', color: '#10b981', value: 34, prefix: '+', suffix: '%', sub: 'CTR medio', chart: 'area', live: true },
  { icon: FlaskConical, label: 'A/B Testing', color: '#f59e0b', value: 3, suffix: ' tests', sub: 'En curso', chart: 'line' },
  { icon: Target, label: 'ROI Forecast', color: '#ef4444', value: 4.2, suffix: 'x', sub: 'ROAS previsto', chart: 'area', decimals: 1 },
  { icon: Users, label: 'Audiencias', color: '#06b6d4', value: 1.2, suffix: 'M', sub: 'Alcance total', chart: 'bar', decimals: 1 },
  { icon: PieChart, label: 'Cohorts', color: '#ec4899', value: 8, suffix: ' segmentos', sub: 'Activos', chart: 'line' },
  { icon: Globe, label: 'Heatmap', color: '#14b8a6', value: 23, suffix: ' nichos', sub: 'Mapeados', chart: 'bar' },
  { icon: LineChart, label: 'Monitor', color: '#8b5cf6', valueText: 'LIVE', sub: 'Real-time', chart: 'pulse', live: true },
  { icon: Send, label: 'Bulk Launch', color: '#f97316', value: 50, suffix: '+', sub: 'Campanas/dia', chart: 'area' },
  { icon: MessageSquare, label: 'Inbox', color: '#6366f1', value: 3, suffix: ' nuevos', sub: 'Mensajes', chart: 'line', live: true },
  { icon: CreditCard, label: 'Finanzas', color: '#10b981', valueText: 'Escrow', sub: 'Protegido', chart: 'shield' },
]

const SIDEBAR_ITEMS = [
  { icon: Layout, label: 'Dashboard', active: true },
  { icon: Search, label: 'Explorar' },
  { icon: Megaphone, label: 'Campanas' },
  { icon: BarChart3, label: 'Analytics' },
  { icon: FlaskConical, label: 'A/B Tests' },
  { icon: Target, label: 'ROI' },
  { icon: Users, label: 'Audiencias' },
  { icon: Wallet, label: 'Finanzas' },
]

/* ── Mini chart variants ───────────────────────────────────────── */
function MiniChart({ color, type, delay, animate }) {
  const [seed, setSeed] = useState(0)

  useEffect(() => {
    if (!animate) return
    const t = setInterval(() => setSeed(s => s + 1), 2400)
    return () => clearInterval(t)
  }, [animate])

  const generate = () => {
    const arr = []
    for (let i = 0; i < 9; i++) {
      arr.push(20 + Math.random() * 50 + Math.sin((i + seed) * 0.8) * 10)
    }
    return arr
  }

  const points = React.useMemo(generate, [seed])

  if (type === 'pulse') {
    return (
      <div style={{ width: 96, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <motion.div
            key={i}
            animate={{ height: ['8px', '24px', '8px'] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.15,
            }}
            style={{
              width: 4,
              borderRadius: 2,
              background: color,
              opacity: 0.85,
            }}
          />
        ))}
      </div>
    )
  }

  if (type === 'shield') {
    return (
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color,
        }}
      >
        <Shield size={16} strokeWidth={2.2} />
      </motion.div>
    )
  }

  if (type === 'bar') {
    return (
      <svg width="96" height="40" viewBox="0 0 96 40" fill="none">
        {points.map((y, i) => (
          <motion.rect
            key={i}
            x={i * 11 + 2}
            width={7}
            rx={1.5}
            initial={false}
            animate={{ y: 40 - (y * 0.5), height: y * 0.5 }}
            transition={{ duration: 0.8, ease: spring, delay: i * 0.04 }}
            fill={color}
          />
        ))}
      </svg>
    )
  }

  // line / area
  const path = points.map((y, i) => `${i === 0 ? 'M' : 'L'}${i * 12},${40 - y * 0.5}`).join(' ')
  const areaPath = `${path} L96,40 L0,40 Z`
  const gradId = `grad-${color.replace('#', '')}-${type}`

  return (
    <svg width="96" height="40" viewBox="0 0 96 40" fill="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {type === 'area' && (
        <motion.path
          d={areaPath}
          fill={`url(#${gradId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: delay + 0.5 }}
        />
      )}
      <motion.path
        key={seed}
        d={path}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.2, delay: animate ? 0 : delay + 0.5, ease: spring }}
      />
      {/* End dot */}
      <motion.circle
        cx={96}
        cy={40 - points[8] * 0.5}
        r={2.5}
        fill={color}
        initial={{ scale: 0 }}
        animate={{ scale: [1, 1.4, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  )
}

/* ── Animated counter ──────────────────────────────────────────── */
function AnimatedValue({ value, prefix = '', suffix = '', valueText, decimals = 0, isLive }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (valueText) return
    let frame
    const t0 = performance.now()
    const duration = 1800
    const startVal = display
    const animate = (now) => {
      const p = Math.min((now - t0) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setDisplay(startVal + (value - startVal) * ease)
      if (p < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [value, valueText])

  if (valueText) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {isLive && (
          <motion.span
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }}
          />
        )}
        {valueText}
      </span>
    )
  }

  let formatted
  if (decimals > 0) {
    formatted = display.toFixed(decimals)
  } else if (display >= 1000) {
    formatted = Math.round(display).toLocaleString()
  } else {
    formatted = Math.round(display).toString()
  }

  return <span>{prefix}{formatted}{suffix}</span>
}

/* ── Module card with glow + live tick ─────────────────────────── */
function ModuleCard({ mod, index, isHovered, onHover, isCursorOn }) {
  const Icon = mod.icon
  const [tick, setTick] = useState(0)

  // Live modules tick their value periodically
  useEffect(() => {
    if (!mod.live) return
    const t = setInterval(() => setTick(t => t + 1), 3200)
    return () => clearInterval(t)
  }, [mod.live])

  const liveValue = mod.live && typeof mod.value === 'number'
    ? mod.value + (tick % 3 === 0 ? 1 : 0)
    : mod.value

  const isActive = isHovered || isCursorOn

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 1.0 + index * 0.05, duration: 0.55, ease: spring }}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
      whileHover={{ y: -3 }}
      style={{
        position: 'relative',
        background: isActive
          ? `linear-gradient(135deg, ${mod.color}14 0%, #ffffff 100%)`
          : '#ffffff',
        border: `1px solid ${isActive ? mod.color + '50' : 'rgba(15,23,42,0.08)'}`,
        borderRadius: '12px',
        padding: '14px',
        cursor: 'default',
        transition: 'background 0.3s, border-color 0.3s, box-shadow 0.3s',
        boxShadow: isActive
          ? `0 8px 24px ${mod.color}25, 0 0 0 1px ${mod.color}30, inset 0 1px 0 #fff`
          : '0 1px 2px rgba(15,23,42,0.04), 0 0 0 1px rgba(15,23,42,0.02)',
        overflow: 'hidden',
      }}
    >
      {/* Glow halo behind card when active */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              inset: -1,
              borderRadius: 12,
              background: `radial-gradient(circle at 30% 0%, ${mod.color}20 0%, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      {/* Live dot */}
      {mod.live && (
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 6, height: 6, borderRadius: '50%',
            background: '#22c55e',
            boxShadow: '0 0 8px #22c55e',
            zIndex: 2,
          }}
        />
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '10px',
        }}>
          <motion.div
            animate={isActive ? { scale: 1.08, rotate: [0, -3, 3, 0] } : { scale: 1, rotate: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              width: '28px', height: '28px', borderRadius: '7px',
              background: `${mod.color}14`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: mod.color,
            }}
          >
            <Icon size={14} strokeWidth={2} />
          </motion.div>
          <MiniChart color={mod.color} type={mod.chart} delay={index * 0.06} animate={mod.live} />
        </div>
        <div style={{
          fontSize: '17px', fontWeight: 700, color: 'var(--text)',
          fontFamily: FONT_DISPLAY, letterSpacing: '-0.02em',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <AnimatedValue
            value={liveValue}
            prefix={mod.prefix}
            suffix={mod.suffix}
            valueText={mod.valueText}
            decimals={mod.decimals}
            isLive={mod.chart === 'shield' ? false : mod.live}
          />
        </div>
        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
          {mod.sub}
        </div>
        <div style={{
          fontSize: '10px', color: mod.color, marginTop: '4px', fontWeight: 700,
        }}>
          {mod.label}
        </div>
      </div>
    </motion.div>
  )
}

/* ── Animated cursor that visits cards ─────────────────────────── */
function PhantomCursor({ targetIndex, gridRef, onArrive }) {
  const x = useMotionValue(40)
  const y = useMotionValue(40)
  const sx = useSpring(x, { stiffness: 60, damping: 18 })
  const sy = useSpring(y, { stiffness: 60, damping: 18 })

  useEffect(() => {
    if (targetIndex == null || !gridRef.current) return
    const cards = gridRef.current.querySelectorAll('[data-card]')
    const card = cards[targetIndex]
    if (!card) return
    const grid = gridRef.current.getBoundingClientRect()
    const c = card.getBoundingClientRect()
    const tx = c.left - grid.left + c.width * 0.6
    const ty = c.top - grid.top + c.height * 0.5
    x.set(tx)
    y.set(ty)
    const t = setTimeout(onArrive, 1400)
    return () => clearTimeout(t)
  }, [targetIndex, gridRef, onArrive, x, y])

  return (
    <motion.div
      style={{
        position: 'absolute', left: 0, top: 0,
        x: sx, y: sy,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      <svg width="22" height="22" viewBox="0 0 22 22" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }}>
        <path
          d="M3 2 L3 16 L7 13 L9.5 19 L12 18 L9.5 12 L15 12 Z"
          fill="#fff"
          stroke="#1a1a1a"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  )
}

/* ── Dashboard mockup ─────────────────────────────────────────── */
function DashboardMockup() {
  const [hoveredModule, setHoveredModule] = useState(null)
  const [cursorTarget, setCursorTarget] = useState(null)
  const gridRef = useRef(null)
  const containerRef = useRef(null)

  // Mouse parallax
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [4, -4]), { stiffness: 80, damping: 20 })
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-4, 4]), { stiffness: 80, damping: 20 })

  const handleMouseMove = (e) => {
    if (!containerRef.current) return
    const r = containerRef.current.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width - 0.5)
    my.set((e.clientY - r.top) / r.height - 0.5)
  }
  const handleMouseLeave = () => { mx.set(0); my.set(0) }

  // Phantom cursor cycle
  useEffect(() => {
    let i = 0
    const order = [1, 4, 8, 11, 2, 6, 9, 0]
    const visit = () => {
      setCursorTarget(order[i % order.length])
      i++
    }
    const initial = setTimeout(visit, 2200)
    const interval = setInterval(visit, 2800)
    return () => { clearTimeout(initial); clearInterval(interval) }
  }, [])

  const handleCursorArrive = () => {
    setHoveredModule(cursorTarget)
    setTimeout(() => setHoveredModule(null), 900)
  }

  return (
    <motion.div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, delay: 0.4, ease: spring }}
      style={{
        perspective: '1600px',
        width: '100%', maxWidth: '1000px', margin: '0 auto',
        position: 'relative',
      }}
    >
      {/* Floating wrapper */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <motion.div
          style={{
            rotateX: rotX,
            rotateY: rotY,
            transformStyle: 'preserve-3d',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            boxShadow: `
              0 80px 140px -30px rgba(124,58,237,0.18),
              0 40px 80px -20px rgba(0,0,0,0.12),
              0 20px 40px -10px rgba(0,0,0,0.08),
              0 0 0 1px rgba(124,58,237,0.06),
              inset 0 1px 0 rgba(255,255,255,0.8)
            `,
            overflow: 'hidden',
            position: 'relative',
          }}
        >

          {/* Title bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '14px 20px',
            background: 'var(--bg2)',
            borderBottom: '1px solid var(--border)',
            position: 'relative',
            zIndex: 1,
          }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <motion.div whileHover={{ scale: 1.2 }} style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
              <motion.div whileHover={{ scale: 1.2 }} style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
              <motion.div whileHover={{ scale: 1.2 }} style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
            </div>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '4px 16px',
                fontSize: '11px', color: 'var(--muted)', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <Shield size={10} style={{ color: '#22c55e' }} />
                app.channelad.io/advertiser
              </div>
            </div>
            <div style={{ width: 50 }} />
          </div>

          <div style={{ display: 'flex', minHeight: '440px', position: 'relative', zIndex: 1 }}>
            {/* Sidebar */}
            <div className="dashboard-mockup-sidebar" style={{
              width: '180px', flexShrink: 0,
              borderRight: '1px solid var(--border)',
              padding: '16px 10px',
              background: 'var(--bg)',
              display: 'flex', flexDirection: 'column', gap: '2px',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 10px', marginBottom: '12px',
              }}>
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    width: '28px', height: '28px', borderRadius: '8px',
                    background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '11px', fontWeight: 700,
                    fontFamily: FONT_DISPLAY,
                    boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
                  }}
                >
                  C
                </motion.div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', fontFamily: FONT_DISPLAY }}>
                  Channelad
                </span>
              </div>
              {SIDEBAR_ITEMS.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + i * 0.05, duration: 0.4, ease: spring }}
                  whileHover={{ x: 3 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 10px', borderRadius: '8px',
                    background: item.active ? 'rgba(124,58,237,0.08)' : 'transparent',
                    color: item.active ? '#7C3AED' : 'var(--muted)',
                    fontSize: '12px', fontWeight: item.active ? 600 : 500,
                    cursor: 'default',
                    transition: 'background 0.2s',
                    position: 'relative',
                  }}
                >
                  {item.active && (
                    <motion.div
                      layoutId="sidebar-active"
                      style={{
                        position: 'absolute', left: 0, top: '50%',
                        width: 3, height: 16, borderRadius: 2,
                        background: '#7C3AED',
                        transform: 'translateY(-50%)',
                      }}
                    />
                  )}
                  <item.icon size={14} strokeWidth={item.active ? 2.2 : 1.8} />
                  {item.label}
                </motion.div>
              ))}
            </div>

            {/* Main content */}
            <div style={{ flex: 1, padding: '20px', overflow: 'hidden', position: 'relative' }}>
              {/* Top bar */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '20px',
              }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', fontFamily: FONT_DISPLAY, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
                    Panel de control
                    <motion.span
                      animate={{ opacity: [1, 0.4, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 9, fontWeight: 600, color: '#22c55e',
                        background: 'rgba(34,197,94,0.1)',
                        border: '1px solid rgba(34,197,94,0.25)',
                        borderRadius: 6, padding: '2px 6px',
                        textTransform: 'uppercase', letterSpacing: 0.6,
                      }}
                    >
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                      Live
                    </motion.span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                    4 mayo 2026 · Todas las metricas en tiempo real
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <motion.div
                    whileHover={{ y: -2 }}
                    style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--muted)', position: 'relative',
                    }}
                  >
                    <Bell size={14} />
                    <motion.span
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                      style={{
                        position: 'absolute', top: 4, right: 4,
                        width: 7, height: 7, borderRadius: '50%',
                        background: '#ef4444',
                        boxShadow: '0 0 6px #ef4444',
                      }}
                    />
                  </motion.div>
                  <motion.div
                    whileHover={{ y: -2 }}
                    style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--muted)',
                    }}
                  >
                    <Activity size={14} />
                  </motion.div>
                </div>
              </div>

              {/* Module grid */}
              <div
                ref={gridRef}
                className="dashboard-mockup-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '10px',
                  position: 'relative',
                }}
              >
                {DASHBOARD_MODULES.map((mod, i) => (
                  <div key={i} data-card>
                    <ModuleCard
                      mod={mod}
                      index={i}
                      isHovered={hoveredModule === i}
                      onHover={setHoveredModule}
                      isCursorOn={cursorTarget === i && hoveredModule === i}
                    />
                  </div>
                ))}

                <PhantomCursor
                  targetIndex={cursorTarget}
                  gridRef={gridRef}
                  onArrive={handleCursorArrive}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Reflection underneath */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: -60, left: '8%', right: '8%',
          height: 80,
          background: 'radial-gradient(ellipse at center top, rgba(124,58,237,0.15) 0%, transparent 70%)',
          filter: 'blur(20px)',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />

      {/* Floating badges */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{
          opacity: 1, x: 0,
          y: [0, -10, 0],
        }}
        transition={{
          opacity: { delay: 1.6, duration: 0.6, ease: spring },
          x: { delay: 1.6, duration: 0.6, ease: spring },
          y: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1.6 },
        }}
        className="hero-floating-badge"
        style={{
          position: 'absolute', left: '-30px', top: '38%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '14px', padding: '12px 16px',
          boxShadow: '0 16px 48px rgba(34,197,94,0.18), 0 0 0 1px rgba(34,197,94,0.08)',
          display: 'flex', alignItems: 'center', gap: '10px',
          fontSize: '12px', fontWeight: 600, color: 'var(--text)',
          zIndex: 10,
        }}
      >
        <motion.div
          animate={{ rotate: [0, 8, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'rgba(34,197,94,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Shield size={16} style={{ color: '#22c55e' }} />
        </motion.div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            Escrow activo
            <motion.span
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e' }}
            />
          </div>
          <div style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 400 }}>Pago 100% protegido</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{
          opacity: 1, x: 0,
          y: [0, -10, 0],
        }}
        transition={{
          opacity: { delay: 1.9, duration: 0.6, ease: spring },
          x: { delay: 1.9, duration: 0.6, ease: spring },
          y: { duration: 4.6, repeat: Infinity, ease: 'easeInOut', delay: 2.2 },
        }}
        className="hero-floating-badge"
        style={{
          position: 'absolute', right: '-30px', top: '24%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '14px', padding: '12px 16px',
          boxShadow: '0 16px 48px rgba(139,92,246,0.18), 0 0 0 1px rgba(139,92,246,0.08)',
          display: 'flex', alignItems: 'center', gap: '10px',
          fontSize: '12px', fontWeight: 600, color: 'var(--text)',
          zIndex: 10,
        }}
      >
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'rgba(139,92,246,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ArrowUpRight size={16} style={{ color: '#8b5cf6' }} />
        </motion.div>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ color: '#8b5cf6' }}>+34%</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>CTR</span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 400 }}>vs. media del sector</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: 1, y: 0,
        }}
        transition={{ delay: 2.2, duration: 0.6, ease: spring }}
        className="hero-floating-badge"
        style={{
          position: 'absolute', right: '6%', bottom: '-22px',
          background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '12px', padding: '10px 14px',
          boxShadow: '0 16px 48px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
          display: 'flex', alignItems: 'center', gap: '8px',
          fontSize: '11px', fontWeight: 600, color: '#fff',
          zIndex: 10,
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles size={14} />
        </motion.div>
        <span>IA optimizando 24/7</span>
      </motion.div>
    </motion.div>
  )
}

/* ── Quick Onboarding: role toggle + email + OAuth + demo ─────── */
function QuickOnboarding() {
  const [role, setRole] = useState('advertiser')
  const [email, setEmail] = useState('')
  const [showVideo, setShowVideo] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    const params = new URLSearchParams({ role, email }).toString()
    window.location.href = `/auth/register?${params}`
  }

  const accent = role === 'advertiser' ? '#7C3AED' : '#22c55e'
  const accentLabel = role === 'advertiser' ? 'Anunciante' : 'Creator'
  const ctaText = role === 'advertiser' ? 'Empezar a anunciar' : 'Registrar mi canal'

  return (
    <div style={{ maxWidth: 540, margin: '0 auto' }}>
      {/* Role toggle */}
      <div
        role="tablist"
        style={{
          display: 'inline-flex', position: 'relative',
          background: '#fff',
          border: '1px solid rgba(15,23,42,0.08)',
          borderRadius: 12,
          padding: 4,
          marginBottom: 18,
          boxShadow: '0 4px 16px rgba(15,23,42,0.04)',
        }}
      >
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          style={{
            position: 'absolute', top: 4, bottom: 4,
            left: role === 'advertiser' ? 4 : '50%',
            width: 'calc(50% - 4px)',
            background: role === 'advertiser'
              ? 'linear-gradient(135deg, #7C3AED, #A855F7)'
              : 'linear-gradient(135deg, #22c55e, #10b981)',
            borderRadius: 9,
            boxShadow: `0 4px 12px ${role === 'advertiser' ? 'rgba(124,58,237,0.3)' : 'rgba(34,197,94,0.3)'}`,
            zIndex: 0,
          }}
        />
        {[
          { id: 'advertiser', label: 'Soy anunciante', Icon: MegaIcon },
          { id: 'creator',    label: 'Tengo un canal', Icon: DollarSign },
        ].map(opt => (
          <button
            key={opt.id}
            role="tab"
            onClick={() => setRole(opt.id)}
            style={{
              position: 'relative', zIndex: 1,
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 22px', borderRadius: 9,
              background: 'transparent', border: 'none',
              fontSize: 14, fontWeight: 600,
              color: role === opt.id ? '#fff' : 'var(--muted)',
              cursor: 'pointer',
              transition: 'color 0.25s',
              fontFamily: FONT_BODY,
            }}
          >
            <opt.Icon size={15} strokeWidth={2.2} />
            {opt.label}
          </button>
        ))}
      </div>

      {/* Quick onboarding form */}
      <form onSubmit={submit} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#fff',
        border: '1px solid rgba(15,23,42,0.08)',
        borderRadius: 14,
        padding: 6,
        boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
        maxWidth: 480, margin: '0 auto 14px',
      }}
      className="hero-onboard-form"
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 12px', flex: 1, minWidth: 0,
        }}>
          <Mail size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com"
            style={{
              flex: 1, minWidth: 0,
              border: 'none', outline: 'none', background: 'transparent',
              fontSize: 14, padding: '12px 0',
              fontFamily: FONT_BODY, color: 'var(--text)',
            }}
          />
        </div>
        <motion.button
          type="submit"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: role === 'advertiser'
              ? 'linear-gradient(135deg, #7C3AED, #A855F7)'
              : 'linear-gradient(135deg, #22c55e, #10b981)',
            color: '#fff', border: 'none',
            padding: '10px 18px', borderRadius: 10,
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontFamily: FONT_BODY,
            boxShadow: `0 4px 12px ${role === 'advertiser' ? 'rgba(124,58,237,0.3)' : 'rgba(34,197,94,0.3)'}`,
          }}
        >
          {ctaText}
          <ArrowRight size={14} strokeWidth={2.5} />
        </motion.button>
      </form>

      {/* OAuth + demo */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 10, flexWrap: 'wrap', marginBottom: 16,
      }}>
        <motion.a
          href="/auth/google"
          whileHover={{ y: -2 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#fff', color: 'var(--text)',
            padding: '10px 16px', borderRadius: 10,
            border: '1px solid rgba(15,23,42,0.1)',
            fontSize: 13, fontWeight: 600,
            textDecoration: 'none',
            boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 18 18">
            <path d="M16.51 8.18c0-.59-.05-1.16-.15-1.71H8.85v3.24h4.3c-.19 1-.75 1.85-1.6 2.42v2.01h2.59c1.51-1.39 2.37-3.45 2.37-5.96z" fill="#4285F4"/>
            <path d="M8.85 16.5c2.16 0 3.97-.72 5.29-1.94l-2.59-2.01c-.72.48-1.64.77-2.7.77-2.08 0-3.84-1.4-4.47-3.29H1.71v2.07c1.31 2.6 4 4.4 7.14 4.4z" fill="#34A853"/>
            <path d="M4.38 10.03A4.97 4.97 0 014.12 8.5c0-.53.09-1.05.26-1.53V4.9H1.71A8.49 8.49 0 00.85 8.5c0 1.37.33 2.67.86 3.6l2.67-2.07z" fill="#FBBC05"/>
            <path d="M8.85 3.71c1.18 0 2.23.4 3.06 1.2l2.29-2.29C12.81 1.32 11 .5 8.85.5 5.71.5 3.02 2.3 1.71 4.9l2.67 2.07c.63-1.89 2.39-3.26 4.47-3.26z" fill="#EA4335"/>
          </svg>
          Google
        </motion.a>

        <motion.a
          href="/auth/whatsapp"
          whileHover={{ y: -2 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#fff', color: 'var(--text)',
            padding: '10px 16px', borderRadius: 10,
            border: '1px solid rgba(15,23,42,0.1)',
            fontSize: 13, fontWeight: 600,
            textDecoration: 'none',
            boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          WhatsApp
        </motion.a>

        <span style={{ fontSize: 13, color: 'var(--muted)' }}>o</span>

        <motion.button
          type="button"
          onClick={() => setShowVideo(true)}
          whileHover={{ y: -2 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'transparent', color: 'var(--text)',
            padding: '10px 16px', borderRadius: 10,
            border: '1px solid rgba(15,23,42,0.1)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: FONT_BODY,
          }}
        >
          <PlayCircle size={16} style={{ color: accent }} />
          Ver demo (90 seg)
        </motion.button>
      </div>

      {/* Friction reducers */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 6, flexWrap: 'wrap',
        fontSize: 13, color: 'var(--muted)',
      }}>
        {(role === 'advertiser'
          ? ['Sin tarjeta', 'Escrow Stripe', 'Metricas reales']
          : ['Cobro automatico', 'Sin exclusividad', '5% por referido']
        ).map((t, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span style={{ color: 'rgba(15,23,42,0.15)', margin: '0 4px' }}>·</span>}
            <span>{t}</span>
          </React.Fragment>
        ))}
      </div>

      {/* Hidden video modal mount */}
      {showVideo && (
        <div
          onClick={() => setShowVideo(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 150,
            background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 880, aspectRatio: '16/9',
              background: '#000', borderRadius: 16, overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', textAlign: 'center', padding: 40,
              boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
            }}
          >
            <div>
              <PlayCircle size={48} style={{ marginBottom: 12, opacity: 0.7 }} />
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Demo en preparacion</div>
              <div style={{ fontSize: 14, opacity: 0.7 }}>El video estara listo muy pronto.</div>
            </div>
          </div>
        </div>
      )}

      {/* Hint to keep accent badge visible */}
      <div
        aria-hidden
        style={{
          position: 'absolute', left: '-9999px',
          color: accent,
        }}
      >{accentLabel}</div>
    </div>
  )
}

/* ── Single scroll-narrative label (hooks must be at top level) ── */
function ScrollLabel({ progress, phase }) {
  const opacity = useTransform(
    progress,
    [phase.range[0] - 0.05, phase.range[0], phase.range[1], phase.range[1] + 0.05],
    [0, 1, 1, 0]
  )
  const y = useTransform(progress, [phase.range[0], phase.range[1]], [10, -10])
  return (
    <motion.div
      style={{
        position: 'absolute',
        left: phase.x, top: phase.y,
        opacity, y,
        pointerEvents: 'none',
        zIndex: 12,
      }}
      className="hero-scroll-narrative"
    >
      <div style={{
        background: '#fff',
        border: `1px solid ${phase.color}30`,
        borderRadius: 10,
        padding: '8px 14px',
        boxShadow: `0 12px 28px ${phase.color}25, 0 0 0 1px ${phase.color}10`,
        display: 'flex', alignItems: 'center', gap: 10,
        minWidth: 160,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: phase.color,
          boxShadow: `0 0 8px ${phase.color}`,
        }} />
        <div>
          <div style={{
            fontSize: 11, fontWeight: 700,
            color: phase.color, fontFamily: FONT_DISPLAY,
            textTransform: 'uppercase', letterSpacing: 0.5,
          }}>{phase.label}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{phase.sub}</div>
        </div>
      </div>
    </motion.div>
  )
}

const NARRATIVE_PHASES = [
  { label: 'Marketplace', sub: 'Encuentra el canal ideal', x: '20%', y: '30%', range: [0, 0.33], color: '#3b82f6' },
  { label: 'Campana',     sub: 'Lanza con escrow seguro',  x: '50%', y: '20%', range: [0.33, 0.66], color: '#7C3AED' },
  { label: 'Resultados',  sub: 'Mide en tiempo real',       x: '78%', y: '32%', range: [0.66, 1], color: '#10b981' },
]

function ScrollNarrative({ progress }) {
  return (
    <>
      {NARRATIVE_PHASES.map((p, i) => (
        <ScrollLabel key={i} progress={progress} phase={p} />
      ))}
    </>
  )
}

/* ── Hero ──────────────────────────────────────────────────────── */
export default function Hero3D() {
  const sectionRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200])

  return (
    <section
      ref={sectionRef}
      style={{
        position: 'relative', minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        padding: 'clamp(100px, 16vw, 140px) 20px clamp(80px, 10vw, 120px)',
      }}
    >
      <div className="hero-mesh-1" />
      <div className="hero-mesh-2" />
      <div className="hero-mesh-3" />

      {/* Animated background grid */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(to right, rgba(124,58,237,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(124,58,237,0.05) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          pointerEvents: 'none',
        }}
      />

      <motion.div style={{ y: heroY, width: '100%' }}>
        {/* Text content */}
        <div style={{
          maxWidth: '780px', margin: '0 auto',
          textAlign: 'center', position: 'relative', zIndex: 2,
          marginBottom: 'clamp(48px, 7vw, 72px)',
        }}>
          <motion.div variants={revealUp} custom={0.1} initial="hidden" animate="visible">
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '10px',
              padding: '6px 16px 6px 8px', borderRadius: '99px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              boxShadow: '0 4px 16px rgba(124,58,237,0.08)',
              marginBottom: '28px',
              fontSize: '13px', color: 'var(--muted)', fontWeight: 500,
            }}>
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'rgba(124,58,237,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Zap size={14} style={{ color: 'var(--accent)' }} />
              </motion.div>
              <span>Tu centro de control de campanas</span>
            </div>
          </motion.div>

          <h1 className="sr-only">Channelad — Publicidad en comunidades de WhatsApp, Telegram y Discord</h1>
          <motion.div variants={revealUp} custom={0.3} initial="hidden" animate="visible" aria-hidden="true">
            <div style={{
              fontFamily: FONT_DISPLAY, fontWeight: 700,
              fontSize: 'clamp(36px, 5.5vw, 68px)',
              lineHeight: 1.05, letterSpacing: '-0.04em',
              margin: '0 0 20px',
            }}>
              <div>Un dashboard.</div>
              <div><span className="gradient-text">Todas tus campanas.</span></div>
            </div>
          </motion.div>

          <motion.p
            variants={revealUp} custom={0.5} initial="hidden" animate="visible"
            style={{
              fontFamily: FONT_BODY, fontSize: 'clamp(15px, 3.5vw, 18px)', lineHeight: 1.7,
              color: 'var(--muted)', fontWeight: 400,
              maxWidth: '580px', margin: '0 auto 32px',
              letterSpacing: '-0.01em',
            }}
          >
            Marketplace, analytics, A/B testing, forecast de ROI y pagos protegidos con escrow.
            Todo en una sola plataforma para comunidades de WhatsApp, Telegram y Discord.
          </motion.p>

          <motion.div variants={revealUp} custom={0.7} initial="hidden" animate="visible">
            <QuickOnboarding />
          </motion.div>
        </div>

        {/* 3D Dashboard Mockup */}
        <div style={{ position: 'relative', maxWidth: MAX_W, margin: '0 auto', padding: '0 20px' }}>
          <DashboardMockup />
          <ScrollNarrative progress={scrollYProgress} />
        </div>
      </motion.div>

      <style>{`
        .dashboard-mockup-sidebar { display: flex; }
        @media (max-width: 900px) {
          .dashboard-mockup-sidebar { display: none !important; }
          .dashboard-mockup-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .dashboard-mockup-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .hero-floating-badge { display: none !important; }
        }
      `}</style>
    </section>
  )
}
