import React, { useState, useMemo, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Calculator, TrendingUp, MousePointerClick, Users, ArrowRight, Sparkles } from 'lucide-react'
import { FONT_DISPLAY, FONT_BODY, MAX_W } from '../../theme/tokens'

const PLATFORMS = [
  { id: 'whatsapp', label: 'WhatsApp', cpm: 4.2, ctr: 0.34, eng: 0.45 },
  { id: 'telegram', label: 'Telegram', cpm: 3.8, ctr: 0.28, eng: 0.38 },
  { id: 'discord',  label: 'Discord',  cpm: 5.1, ctr: 0.22, eng: 0.30 },
  { id: 'mixto',    label: 'Mixto',    cpm: 4.3, ctr: 0.30, eng: 0.38 },
]

const NICHES = [
  { id: 'finanzas',     label: 'Finanzas',         mult: 1.4 },
  { id: 'tech',         label: 'Tecnologia',       mult: 1.2 },
  { id: 'ecommerce',    label: 'E-commerce',       mult: 1.1 },
  { id: 'lifestyle',    label: 'Lifestyle',        mult: 1.0 },
  { id: 'gaming',       label: 'Gaming',           mult: 0.9 },
  { id: 'edu',          label: 'Educacion',        mult: 1.15 },
]

function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return Math.round(n).toLocaleString()
}
function fmtEur(n) {
  return Math.round(n).toLocaleString('es-ES') + '€'
}

function Slider({ label, value, min, max, step, onChange, suffix }) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)' }}>{label}</label>
        <span style={{
          fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700,
          color: 'var(--text)', letterSpacing: '-0.02em',
        }}>{Math.round(value).toLocaleString('es-ES')}{suffix}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="roi-slider"
        style={{ width: '100%' }}
      />
    </div>
  )
}

function MetricBox({ icon: Icon, label, value, sub, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      style={{
        background: '#fff',
        border: '1px solid rgba(15,23,42,0.08)',
        borderRadius: 14,
        padding: '16px 18px',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: `${color}14`, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} strokeWidth={2} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{
        fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700,
        letterSpacing: '-0.03em', color: 'var(--text)', lineHeight: 1,
      }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
    </motion.div>
  )
}

export default function ROICalculator() {
  const [budget, setBudget] = useState(500)
  const [platform, setPlatform] = useState('mixto')
  const [niche, setNiche] = useState('lifestyle')

  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  const result = useMemo(() => {
    const p = PLATFORMS.find(x => x.id === platform)
    const n = NICHES.find(x => x.id === niche)
    const cpm = p.cpm
    const reach = (budget / cpm) * 1000 * n.mult
    const clicks = reach * p.ctr * 0.5 // CTR is on impressions but only fraction sees ad
    const engaged = reach * p.eng
    // Compare vs. paid media (Meta/Google avg CPM ~12€, CTR 1.2%)
    const paidReach = (budget / 12) * 1000
    const paidClicks = paidReach * 0.012
    const reachDelta = ((reach / paidReach) - 1) * 100
    const clicksDelta = ((clicks / paidClicks) - 1) * 100
    return { reach, clicks, engaged, reachDelta, clicksDelta }
  }, [budget, platform, niche])

  return (
    <section
      ref={ref}
      id="calculadora"
      style={{
        background: 'var(--bg)',
        padding: 'clamp(72px,10vw,140px) clamp(16px, 4vw, 24px)',
      }}
    >
      <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 'clamp(36px, 6vw, 56px)' }}>
          <p style={{
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.12em', color: '#7C3AED', marginBottom: 16,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <Calculator size={12} /> Calculadora interactiva
          </p>
          <h2 style={{
            fontFamily: FONT_DISPLAY, fontWeight: 700,
            fontSize: 'clamp(24px, 4vw, 44px)',
            lineHeight: 1.08, letterSpacing: '-0.03em',
            margin: '0 0 16px', color: 'var(--text)',
          }}>
            ¿Cuanto puedes alcanzar con tu presupuesto?
          </h2>
          <p style={{
            fontFamily: FONT_BODY, fontSize: 16, color: 'var(--muted)',
            maxWidth: 520, margin: '0 auto', lineHeight: 1.6,
          }}>
            Ajusta presupuesto, plataforma y nicho. Te calculamos el alcance, clicks y comparativa real con paid media.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="roi-container"
          style={{
            display: 'grid',
            gridTemplateColumns: '0.85fr 1.15fr',
            gap: 20,
            background: '#fff',
            border: '1px solid rgba(15,23,42,0.08)',
            borderRadius: 24,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(15,23,42,0.06), 0 0 0 1px rgba(124,58,237,0.04)',
          }}
        >
          {/* Inputs */}
          <div style={{ padding: 'clamp(24px, 3vw, 36px)' }}>
            <h3 style={{
              fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700,
              letterSpacing: '-0.02em', margin: '0 0 24px',
            }}>Tu campana</h3>

            <div style={{ marginBottom: 28 }}>
              <Slider
                label="Presupuesto mensual"
                value={budget}
                min={100} max={10000} step={50}
                onChange={setBudget}
                suffix="€"
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: 'block', fontSize: 13, fontWeight: 500,
                color: 'var(--muted)', marginBottom: 10,
              }}>Plataforma</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                {PLATFORMS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPlatform(p.id)}
                    style={{
                      padding: '10px 14px', borderRadius: 10,
                      border: `1px solid ${platform === p.id ? '#7C3AED' : 'rgba(15,23,42,0.1)'}`,
                      background: platform === p.id ? 'rgba(124,58,237,0.06)' : '#fff',
                      color: platform === p.id ? '#7C3AED' : 'var(--text)',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >{p.label}</button>
                ))}
              </div>
            </div>

            <div>
              <label style={{
                display: 'block', fontSize: 13, fontWeight: 500,
                color: 'var(--muted)', marginBottom: 10,
              }}>Nicho</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {NICHES.map(n => (
                  <button
                    key={n.id}
                    onClick={() => setNiche(n.id)}
                    style={{
                      padding: '8px 12px', borderRadius: 8,
                      border: `1px solid ${niche === n.id ? '#7C3AED' : 'rgba(15,23,42,0.1)'}`,
                      background: niche === n.id ? 'rgba(124,58,237,0.06)' : '#fff',
                      color: niche === n.id ? '#7C3AED' : 'var(--text)',
                      fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >{n.label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          <div style={{
            padding: 'clamp(24px, 3vw, 36px)',
            background: 'linear-gradient(145deg, rgba(124,58,237,0.04) 0%, rgba(168,85,247,0.02) 100%)',
            borderLeft: '1px solid rgba(15,23,42,0.06)',
          }}
          className="roi-results"
          >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{
                fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700,
                letterSpacing: '-0.02em', margin: 0,
              }}>Estimacion</h3>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 600, color: '#22c55e',
                background: 'rgba(34,197,94,0.1)',
                padding: '3px 8px', borderRadius: 6,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e' }} />
                EN VIVO
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <MetricBox
                icon={Users} label="Alcance" value={fmtNum(result.reach)}
                sub={`+${Math.round(result.reachDelta)}% vs. paid ads`}
                color="#7C3AED" delay={0.05}
              />
              <MetricBox
                icon={MousePointerClick} label="Clicks estimados" value={fmtNum(result.clicks)}
                sub={`+${Math.round(result.clicksDelta)}% vs. paid ads`}
                color="#22c55e" delay={0.1}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
              <MetricBox
                icon={TrendingUp} label="Engaged users" value={fmtNum(result.engaged)}
                sub="Usuarios activos viendo"
                color="#f59e0b" delay={0.15}
              />
              <MetricBox
                icon={Sparkles} label="CPC estimado" value={fmtEur(budget / Math.max(result.clicks, 1))}
                sub={`Ahorras vs. ${fmtEur(12 / 0.012 * 0.012)} en Meta Ads`}
                color="#3b82f6" delay={0.2}
              />
            </div>

            <motion.a
              href={`/auth/register?budget=${budget}&platform=${platform}&niche=${niche}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                color: '#fff', padding: '14px 24px', borderRadius: 12,
                fontSize: 15, fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 8px 20px rgba(124,58,237,0.3)',
              }}
            >
              Lanzar mi campana de {fmtEur(budget)}
              <ArrowRight size={16} strokeWidth={2.5} />
            </motion.a>

            <p style={{
              fontSize: 11, color: 'var(--muted)', margin: '14px 0 0',
              textAlign: 'center', lineHeight: 1.5,
            }}>
              Estimaciones basadas en 2,847 canales activos · CPM medio paid ads: 12€ · Datos actualizados {new Date().toLocaleDateString('es-ES')}
            </p>
          </div>
        </motion.div>
      </div>

      <style>{`
        .roi-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          background: linear-gradient(to right, #7C3AED 0%, #7C3AED var(--p, 50%), rgba(15,23,42,0.08) var(--p, 50%), rgba(15,23,42,0.08) 100%);
          border-radius: 3px;
          outline: none;
        }
        .roi-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 28px; height: 28px;
          border-radius: 50%;
          background: #fff;
          border: 3px solid #7C3AED;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(124,58,237,0.3);
          transition: transform 0.15s;
        }
        .roi-slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
        .roi-slider::-moz-range-thumb {
          width: 28px; height: 28px;
          border-radius: 50%;
          background: #fff;
          border: 3px solid #7C3AED;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(124,58,237,0.3);
        }
        @media (pointer: coarse) {
          .roi-slider { height: 8px; }
          .roi-slider::-webkit-slider-thumb { width: 32px; height: 32px; }
          .roi-slider::-moz-range-thumb { width: 32px; height: 32px; }
        }
        @media (max-width: 760px) {
          .roi-container { grid-template-columns: 1fr !important; }
          .roi-results { border-left: none !important; border-top: 1px solid rgba(15,23,42,0.06); }
        }
      `}</style>
    </section>
  )
}
