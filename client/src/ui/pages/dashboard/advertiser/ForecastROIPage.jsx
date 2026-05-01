import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calculator, TrendingUp, Eye, MousePointer, Target,
  DollarSign, Calendar, Sparkles, ArrowRight, Info,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import apiService from '../../../../services/api'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE } from '../../../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'
const purpleAlpha = (o) => `var(--accent-dim, rgba(139,92,246,${o}))`

// ─── Mirror of server config/nicheBenchmarks.js ─────────────────────────────
// Kept in sync manually. CTR is [p25, p50, p75, p90].
const NICHE_BENCHMARKS = {
  crypto:          { ctr: [0.010, 0.022, 0.045, 0.080] },
  finanzas:        { ctr: [0.008, 0.018, 0.035, 0.060] },
  tecnologia:      { ctr: [0.006, 0.014, 0.028, 0.050] },
  marketing:       { ctr: [0.007, 0.016, 0.032, 0.055] },
  ecommerce:       { ctr: [0.012, 0.025, 0.050, 0.090] },
  salud:           { ctr: [0.009, 0.020, 0.040, 0.065] },
  entretenimiento: { ctr: [0.015, 0.030, 0.060, 0.100] },
  noticias:        { ctr: [0.004, 0.010, 0.020, 0.035] },
  deporte:         { ctr: [0.011, 0.024, 0.048, 0.080] },
  educacion:       { ctr: [0.008, 0.018, 0.036, 0.060] },
  lifestyle:       { ctr: [0.010, 0.021, 0.042, 0.070] },
  otros:           { ctr: [0.007, 0.016, 0.032, 0.055] },
}

const CPM_BASE = {
  whatsapp:   20, newsletter: 28, instagram: 22, telegram: 14,
  facebook:   13, discord:    9,  blog:      8,
}

const NICHE_LIST = [
  { key: 'crypto',          label: 'Cripto',          emoji: '₿' },
  { key: 'finanzas',        label: 'Finanzas',        emoji: '💰' },
  { key: 'tecnologia',      label: 'Tecnología',      emoji: '💻' },
  { key: 'marketing',       label: 'Marketing',       emoji: '📣' },
  { key: 'ecommerce',       label: 'Ecommerce',       emoji: '🛒' },
  { key: 'salud',           label: 'Salud',           emoji: '🩺' },
  { key: 'entretenimiento', label: 'Entretenimiento', emoji: '🎬' },
  { key: 'noticias',        label: 'Noticias',        emoji: '📰' },
  { key: 'deporte',         label: 'Deporte',         emoji: '⚽' },
  { key: 'educacion',       label: 'Educación',       emoji: '🎓' },
  { key: 'lifestyle',       label: 'Lifestyle',       emoji: '🌿' },
  { key: 'otros',           label: 'Otros',           emoji: '🗂️' },
]

const PLATFORM_LIST = [
  { key: '',           label: 'Cualquiera' },
  { key: 'telegram',   label: 'Telegram' },
  { key: 'whatsapp',   label: 'WhatsApp' },
  { key: 'instagram',  label: 'Instagram' },
  { key: 'newsletter', label: 'Newsletter' },
  { key: 'discord',    label: 'Discord' },
]

const SCENARIOS = [
  { key: 'conservative', label: 'Conservador',  ctrPctIdx: 0, convMul: 0.6, color: WARN },
  { key: 'realistic',    label: 'Realista',     ctrPctIdx: 1, convMul: 1.0, color: BLUE },
  { key: 'optimistic',   label: 'Optimista',    ctrPctIdx: 2, convMul: 1.4, color: OK },
]

// ─── Forecast calculation ──────────────────────────────────────────────────
function forecast({ budget, niche, platform, durationDays, conversionRate, aov, realCpm }) {
  const benchmark = NICHE_BENCHMARKS[niche] || NICHE_BENCHMARKS.otros
  // Use real CPM if available, else fallback to platform base * niche multiplier
  const cpm = realCpm != null && realCpm > 0
    ? realCpm
    : (platform && CPM_BASE[platform]) || 18

  return SCENARIOS.map(s => {
    const ctr = benchmark.ctr[s.ctrPctIdx]
    const impressions = Math.round((budget / cpm) * 1000)
    const clicks = Math.round(impressions * ctr)
    const convRate = (conversionRate / 100) * s.convMul
    const conversions = Math.round(clicks * convRate)
    const revenue = conversions * aov
    const profit = revenue - budget
    const roi = budget > 0 ? (profit / budget) * 100 : 0
    const cpa = conversions > 0 ? budget / conversions : null
    const cpcEffective = clicks > 0 ? budget / clicks : null
    return {
      ...s,
      cpm, ctr,
      impressions, clicks, conversions, revenue, profit, roi, cpa,
      cpcEffective,
      perDayBudget: budget / Math.max(1, durationDays),
      perDayClicks: clicks / Math.max(1, durationDays),
    }
  })
}

// ─── Stat card ──────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sublabel, color = PURPLE }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Icon size={14} color={color} />
        <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
      </div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
        {value}
      </div>
      {sublabel && (
        <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 3 }}>
          {sublabel}
        </div>
      )}
    </div>
  )
}

// ─── Funnel bar ─────────────────────────────────────────────────────────────
function FunnelBar({ label, value, max, color, fmt }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 110, fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ flex: 1, height: 28, background: 'var(--bg2)', borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: `linear-gradient(90deg, ${color}80, ${color})`,
          borderRadius: 6, transition: 'width .5s ease',
          display: 'flex', alignItems: 'center', paddingLeft: 10,
        }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 12, fontWeight: 700, color: '#fff' }}>
            {fmt ? fmt(value) : value.toLocaleString('es')}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────
export default function ForecastROIPage() {
  const navigate = useNavigate()
  const [budget, setBudget] = useState(500)
  const [niche, setNiche] = useState('finanzas')
  const [platform, setPlatform] = useState('')
  const [duration, setDuration] = useState(30)
  const [conversionRate, setConversionRate] = useState(3.5)
  const [aov, setAov] = useState(50)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [realCpm, setRealCpm] = useState(null)

  // Fetch real niche CPM when niche changes
  useEffect(() => {
    let cancelled = false
    setRealCpm(null)
    apiService.getNicheTrends(niche, 30).then(res => {
      if (cancelled) return
      const v = res?.success ? res.data?.cpmPromedio : null
      if (v != null && v > 0) setRealCpm(Number(v))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [niche])

  const scenarios = useMemo(
    () => forecast({ budget, niche, platform, durationDays: duration, conversionRate, aov, realCpm }),
    [budget, niche, platform, duration, conversionRate, aov, realCpm]
  )

  const realistic = scenarios.find(s => s.key === 'realistic')
  const fmtMoney = (v) => `€${Math.round(v).toLocaleString('es')}`
  const fmtNum = (v) => Number(v).toLocaleString('es')

  return (
    <div style={{ fontFamily: FONT_BODY, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100 }}>

      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: purpleAlpha(0.12), border: `1px solid ${purpleAlpha(0.25)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Calculator size={20} color={PURPLE} />
          </div>
          <h1 style={{
            fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800,
            color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1, margin: 0,
          }}>
            Forecaster de ROI
          </h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
          Estima impresiones, clicks, conversiones y ROI antes de lanzar — basado en benchmarks reales del nicho y CPM medio del mercado.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 320px) 1fr', gap: 20 }}>

        {/* ── Inputs (left) ─────────────────────────────────────────────── */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, padding: 20, alignSelf: 'start',
          position: 'sticky', top: 12,
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            Parámetros
          </div>

          {/* Budget */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              Presupuesto total
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: 'var(--muted)' }}>€</span>
              <input
                type="number" min="50" max="50000" step="50"
                value={budget} onChange={e => setBudget(Math.max(50, Number(e.target.value) || 0))}
                style={{
                  flex: 1, background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '8px 10px', fontSize: 14, color: 'var(--text)',
                  fontFamily: FONT_BODY, outline: 'none',
                }}
              />
            </div>
            <input
              type="range" min="50" max="5000" step="50"
              value={Math.min(5000, budget)} onChange={e => setBudget(Number(e.target.value))}
              style={{ width: '100%', accentColor: PURPLE }}
            />
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              {[100, 250, 500, 1000, 2500].map(p => (
                <button key={p} onClick={() => setBudget(p)} style={{
                  flex: 1, background: budget === p ? purpleAlpha(0.15) : 'var(--bg2)',
                  color: budget === p ? PURPLE : 'var(--muted)',
                  border: `1px solid ${budget === p ? purpleAlpha(0.3) : 'var(--border)'}`,
                  borderRadius: 6, padding: '4px 0', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', fontFamily: FONT_BODY,
                }}>{p}</button>
              ))}
            </div>
          </div>

          {/* Niche */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              Nicho
            </label>
            <select value={niche} onChange={e => setNiche(e.target.value)}
              style={{
                width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--text)',
                fontFamily: FONT_BODY, outline: 'none', cursor: 'pointer',
              }}>
              {NICHE_LIST.map(n => <option key={n.key} value={n.key}>{n.emoji} {n.label}</option>)}
            </select>
          </div>

          {/* Platform */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              Plataforma
            </label>
            <select value={platform} onChange={e => setPlatform(e.target.value)}
              style={{
                width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--text)',
                fontFamily: FONT_BODY, outline: 'none', cursor: 'pointer',
              }}>
              {PLATFORM_LIST.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>

          {/* Duration */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              Duración (días)
            </label>
            <input type="number" min="1" max="365" value={duration} onChange={e => setDuration(Math.max(1, Number(e.target.value) || 1))}
              style={{
                width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '8px 10px', fontSize: 14, color: 'var(--text)',
                fontFamily: FONT_BODY, outline: 'none',
              }}
            />
          </div>

          {/* Advanced */}
          <button onClick={() => setShowAdvanced(v => !v)} style={{
            background: 'none', border: 'none', color: PURPLE,
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4, fontFamily: FONT_BODY,
          }}>
            {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {showAdvanced ? 'Ocultar' : 'Mostrar'} parámetros avanzados
          </button>

          {showAdvanced && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                  Tasa de conversión (%)
                </label>
                <input type="number" min="0.1" max="50" step="0.1" value={conversionRate}
                  onChange={e => setConversionRate(Math.max(0, Number(e.target.value) || 0))}
                  style={{
                    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '8px 10px', fontSize: 14, color: 'var(--text)',
                    fontFamily: FONT_BODY, outline: 'none',
                  }}
                />
                <div style={{ fontSize: 10, color: 'var(--muted2)', marginTop: 3 }}>
                  Por defecto: 3.5% (industry baseline)
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                  Valor medio por venta (€)
                </label>
                <input type="number" min="0" step="1" value={aov}
                  onChange={e => setAov(Math.max(0, Number(e.target.value) || 0))}
                  style={{
                    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '8px 10px', fontSize: 14, color: 'var(--text)',
                    fontFamily: FONT_BODY, outline: 'none',
                  }}
                />
                <div style={{ fontSize: 10, color: 'var(--muted2)', marginTop: 3 }}>
                  Para calcular ingresos esperados
                </div>
              </div>
            </div>
          )}

          {/* Source indicator */}
          <div style={{
            padding: '10px 12px', background: 'var(--bg2)', borderRadius: 8,
            fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'flex-start', gap: 6, lineHeight: 1.5,
          }}>
            <Info size={11} style={{ marginTop: 2, flexShrink: 0 }} />
            <span>
              CPM medio: <strong style={{ color: 'var(--text)' }}>€{Number(realistic.cpm).toFixed(2)}</strong>
              {realCpm != null ? ' (datos reales del nicho)' : ' (estimación por plataforma)'}<br/>
              CTR base: <strong style={{ color: 'var(--text)' }}>{(realistic.ctr * 100).toFixed(2)}%</strong> (mediana del nicho)
            </span>
          </div>
        </div>

        {/* ── Results (right) ───────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Realistic stats */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10,
          }}>
            <StatCard icon={Eye}          label="Impresiones"  value={fmtNum(realistic.impressions)}  sublabel={`${fmtNum(Math.round(realistic.impressions / duration))} /día`} color={BLUE} />
            <StatCard icon={MousePointer} label="Clicks"        value={fmtNum(realistic.clicks)}       sublabel={`CTR ${(realistic.ctr * 100).toFixed(2)}%`} color={PURPLE} />
            <StatCard icon={Target}       label="Conversiones"  value={fmtNum(realistic.conversions)}  sublabel={realistic.cpa ? `CPA ${fmtMoney(realistic.cpa)}` : ''} color={OK} />
            <StatCard icon={DollarSign}   label="Ingresos est."  value={fmtMoney(realistic.revenue)}    sublabel={`AOV €${aov}`} color={WARN} />
          </div>

          {/* ROI banner */}
          <div style={{
            background: realistic.roi >= 0 ? `${OK}10` : `${ERR}10`,
            border: `1px solid ${realistic.roi >= 0 ? OK : ERR}40`,
            borderRadius: 14, padding: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                ROI estimado (escenario realista)
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{
                  fontFamily: FONT_DISPLAY, fontSize: 38, fontWeight: 900,
                  color: realistic.roi >= 0 ? OK : ERR, letterSpacing: '-0.04em', lineHeight: 1,
                }}>
                  {realistic.roi > 0 ? '+' : ''}{realistic.roi.toFixed(0)}%
                </span>
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>
                  {realistic.profit >= 0 ? `Beneficio ${fmtMoney(realistic.profit)}` : `Pérdida ${fmtMoney(-realistic.profit)}`}
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate('/advertiser/campaigns/new')}
              style={{
                background: PURPLE, color: '#fff', border: 'none', borderRadius: 11,
                padding: '12px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Sparkles size={14} /> Lanzar campaña <ArrowRight size={12} />
            </button>
          </div>

          {/* Funnel */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 18,
          }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
              Funnel del escenario realista
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <FunnelBar label="Impresiones" value={realistic.impressions} max={realistic.impressions} color={BLUE} />
              <FunnelBar label="Clicks"      value={realistic.clicks}      max={realistic.impressions} color={PURPLE} />
              <FunnelBar label="Conversiones" value={realistic.conversions} max={realistic.impressions} color={OK} />
            </div>
          </div>

          {/* Scenarios comparison */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 18,
          }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
              Comparación de escenarios
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
              {scenarios.map(s => (
                <div key={s.key} style={{
                  background: `${s.color}06`, border: `1px solid ${s.color}30`,
                  borderRadius: 10, padding: 14,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: s.color,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>{s.label}</span>
                    <span style={{
                      fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800, color: s.color,
                    }}>
                      {s.roi > 0 ? '+' : ''}{s.roi.toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--muted)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Impresiones</span>
                      <span style={{ color: 'var(--text)', fontWeight: 600 }}>{fmtNum(s.impressions)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Clicks</span>
                      <span style={{ color: 'var(--text)', fontWeight: 600 }}>{fmtNum(s.clicks)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Conversiones</span>
                      <span style={{ color: 'var(--text)', fontWeight: 600 }}>{fmtNum(s.conversions)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>CPA</span>
                      <span style={{ color: 'var(--text)', fontWeight: 600 }}>{s.cpa ? fmtMoney(s.cpa) : '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Ingresos</span>
                      <span style={{ color: 'var(--text)', fontWeight: 600 }}>{fmtMoney(s.revenue)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{
            background: 'var(--bg2)', borderRadius: 10, padding: 12,
            fontSize: 11, color: 'var(--muted2)', display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5,
          }}>
            <Info size={12} color="var(--muted2)" style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              Las estimaciones se basan en CTR mediano del nicho ({(realistic.ctr * 100).toFixed(2)}%) y CPM medio del mercado.
              Los resultados reales varían según calidad del copy, landing page, segmentación y temporada.
              El escenario realista usa la mediana p50, conservador p25, optimista p75.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
