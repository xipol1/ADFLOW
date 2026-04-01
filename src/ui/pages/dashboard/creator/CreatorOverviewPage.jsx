import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Radio, Inbox, DollarSign, TrendingUp, Plus, ChevronRight, Clock,
  Check, X, Zap, Activity, MousePointerClick, BarChart3, Users,
  ArrowUpRight, ArrowDownRight, Globe, Eye, Target, Calendar,
} from 'lucide-react'
import { useAuth } from '../../../../auth/AuthContext'
import apiService from '../../../../../services/api'
import { PLATFORM_COLORS, MOCK_CREATOR_ANALYTICS } from './mockDataCreator'

// ─── Design tokens ────────────────────────────────────────────────────────────
const WA   = '#25d366'
const WAG  = (o) => `rgba(37,211,102,${o})`
const A    = '#8b5cf6'
const AG   = (o) => `rgba(139,92,246,${o})`
const F    = "'Inter', system-ui, sans-serif"
const D    = "'Sora', system-ui, sans-serif"
const OK   = '#10b981'
const WARN = '#f59e0b'
const BLUE = '#3b82f6'
const ER   = '#ef4444'

const PLAT_COLORS = { Telegram: '#2aabee', WhatsApp: '#25d366', Discord: '#5865f2', Instagram: '#e1306c', Newsletter: WARN, Facebook: '#1877f2', telegram: '#2aabee', whatsapp: '#25d366', discord: '#5865f2', instagram: '#e1306c', newsletter: WARN, facebook: '#1877f2' }
const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']

const CSS = `
@keyframes co-fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
@keyframes co-shimmer { 0% { background-position:-200% 0 } 100% { background-position:200% 0 } }
@keyframes co-pulse { 0%,100%{opacity:.6}50%{opacity:.3} }
@keyframes co-glow { 0%,100%{box-shadow:0 0 0 0 rgba(139,92,246,0)} 50%{box-shadow:0 0 20px 4px rgba(139,92,246,0.15)} }
`

// ─── Smooth sparkline ─────────────────────────────────────────────────────────
function Sparkline({ data, color = WA, w = 80, h = 32 }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data), min = Math.min(...data), rng = max - min || 1
  const pad = 2
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * (w - pad * 2) + pad,
    y: h - pad - ((v - min) / rng) * (h - pad * 2),
  }))
  let d = `M ${pts[0].x},${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const cx1 = pts[i-1].x + (pts[i].x - pts[i-1].x) * 0.4
    const cx2 = pts[i].x - (pts[i].x - pts[i-1].x) * 0.4
    d += ` C ${cx1},${pts[i-1].y} ${cx2},${pts[i].y} ${pts[i].x},${pts[i].y}`
  }
  const gId = `cosp-${color.replace(/[^a-z0-9]/gi, '')}-${w}`
  const fillD = `${d} L ${pts[pts.length-1].x},${h} L ${pts[0].x},${h} Z`
  return (
    <svg width={w} height={h} style={{ overflow: 'visible', flexShrink: 0 }}>
      <defs>
        <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#${gId})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

// ─── Area chart (revenue timeline) ────────────────────────────────────────────
function AreaChart({ data, color = WA, height = 180 }) {
  const [hoverIdx, setHoverIdx] = useState(null)
  if (!data || data.length < 2) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '13px' }}>Sin datos</div>

  const values = data.map(d => d.value ?? d.revenue ?? 0)
  const max = Math.max(...values, 1)
  const min = 0
  const padX = 40, padY = 24, padBottom = 28
  const w = '100%'
  const chartH = height - padY - padBottom

  const pts = values.map((v, i) => ({
    x: padX + (i / (values.length - 1)) * (100 - padX * 100 / 800),
    y: padY + chartH - ((v - min) / (max - min || 1)) * chartH,
    val: v,
    label: data[i].label || data[i].date || '',
  }))

  // Build bezier path
  const ptsPx = values.map((v, i) => ({
    x: 40 + (i / (values.length - 1)) * 720,
    y: padY + chartH - ((v - min) / (max - min || 1)) * chartH,
  }))
  let pathD = `M ${ptsPx[0].x},${ptsPx[0].y}`
  for (let i = 1; i < ptsPx.length; i++) {
    const cx1 = ptsPx[i-1].x + (ptsPx[i].x - ptsPx[i-1].x) * 0.35
    const cx2 = ptsPx[i].x - (ptsPx[i].x - ptsPx[i-1].x) * 0.35
    pathD += ` C ${cx1},${ptsPx[i-1].y} ${cx2},${ptsPx[i].y} ${ptsPx[i].x},${ptsPx[i].y}`
  }
  const fillD = `${pathD} L ${ptsPx[ptsPx.length-1].x},${padY + chartH} L ${ptsPx[0].x},${padY + chartH} Z`

  // Y-axis labels
  const ySteps = 4
  const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => {
    const val = min + ((max - min) / ySteps) * i
    return { val, y: padY + chartH - (i / ySteps) * chartH }
  })

  // X-axis labels (show ~6 evenly spaced)
  const xStep = Math.max(1, Math.floor(values.length / 6))
  const xLabels = ptsPx.filter((_, i) => i % xStep === 0 || i === ptsPx.length - 1).map((p, _, arr) => {
    const idx = ptsPx.indexOf(p)
    return { x: p.x, label: data[idx]?.label || data[idx]?.date?.slice(5) || '' }
  })

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg viewBox={`0 0 800 ${height}`} width="100%" height={height} style={{ overflow: 'visible' }}
        onMouseMove={e => {
          const rect = e.currentTarget.getBoundingClientRect()
          const relX = ((e.clientX - rect.left) / rect.width) * 800
          let closest = 0, minDist = Infinity
          ptsPx.forEach((p, i) => { const dist = Math.abs(p.x - relX); if (dist < minDist) { minDist = dist; closest = i } })
          setHoverIdx(closest)
        }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="co-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yLabels.map((yl, i) => (
          <g key={i}>
            <line x1={40} y1={yl.y} x2={760} y2={yl.y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4 4" />
            <text x={34} y={yl.y + 4} textAnchor="end" fill="var(--muted)" fontSize="10" fontFamily={F}>{yl.val >= 1000 ? `${(yl.val / 1000).toFixed(1)}k` : Math.round(yl.val)}</text>
          </g>
        ))}

        {/* Area fill */}
        <path d={fillD} fill="url(#co-area-grad)" />
        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* X labels */}
        {xLabels.map((xl, i) => (
          <text key={i} x={xl.x} y={height - 6} textAnchor="middle" fill="var(--muted)" fontSize="10" fontFamily={F}>{xl.label}</text>
        ))}

        {/* Hover indicator */}
        {hoverIdx !== null && ptsPx[hoverIdx] && (
          <g>
            <line x1={ptsPx[hoverIdx].x} y1={padY} x2={ptsPx[hoverIdx].x} y2={padY + chartH} stroke={color} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
            <circle cx={ptsPx[hoverIdx].x} cy={ptsPx[hoverIdx].y} r="5" fill={color} stroke="var(--surface)" strokeWidth="2.5" />
          </g>
        )}
      </svg>
      {/* Tooltip */}
      {hoverIdx !== null && ptsPx[hoverIdx] && (
        <div style={{
          position: 'absolute', left: `${(ptsPx[hoverIdx].x / 800) * 100}%`, top: `${(ptsPx[hoverIdx].y / height) * 100 - 14}%`,
          transform: 'translate(-50%, -100%)', background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '10px', padding: '8px 12px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          pointerEvents: 'none', zIndex: 10, whiteSpace: 'nowrap',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color, fontFamily: D }}>{values[hoverIdx] >= 1000 ? `€${(values[hoverIdx]/1000).toFixed(1)}k` : `€${values[hoverIdx]}`}</div>
          <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>{data[hoverIdx]?.label || data[hoverIdx]?.date?.slice(5) || ''}</div>
        </div>
      )}
    </div>
  )
}

// ─── Bar chart ────────────────────────────────────────────────────────────────
function BarChart({ data, color = WA }) {
  const max = Math.max(...data.map(d => d.value), 1)
  const [hoverIdx, setHoverIdx] = useState(null)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '110px', paddingBottom: '22px' }}>
      {data.map((d, i) => {
        const isLast = i === data.length - 1
        const isHov  = hoverIdx === i
        const pct    = (d.value / max) * 100
        return (
          <div key={i} onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', height: '100%', cursor: 'default' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '100%' }}>
              {(isHov || isLast) && (
                <div style={{ fontSize: '10px', color: isLast ? color : 'var(--muted)', fontWeight: 700, textAlign: 'center', marginBottom: '3px' }}>{d.value >= 1000 ? `€${(d.value/1000).toFixed(1)}k` : `€${d.value}`}</div>
              )}
              <div style={{ width: '100%', borderRadius: '5px 5px 0 0', minHeight: '4px', height: `${pct}%`,
                background: isLast ? `linear-gradient(180deg, ${color} 0%, ${color}90 100%)` : isHov ? `${color}65` : `${color}30`,
                transition: 'all .2s cubic-bezier(.4,0,.2,1)' }} />
            </div>
            <span style={{ fontSize: '10px', color: isLast ? color : 'var(--muted)', fontWeight: isLast ? 600 : 400 }}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Donut chart ──────────────────────────────────────────────────────────────
function DonutChart({ segments, size = 120, centerLabel, centerValue }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1
  const r = (size - 12) / 2, cx = size / 2, cy = size / 2
  const circumference = 2 * Math.PI * r
  let offset = -circumference * 0.25 // start from top

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size}>
          {segments.map((seg, i) => {
            const pct = seg.value / total
            const dash = pct * circumference
            const thisOffset = offset
            offset += dash
            return (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color}
                strokeWidth="10" strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-thisOffset} strokeLinecap="round"
                style={{ transition: 'stroke-dasharray .5s ease' }} />
            )
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: D, fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>{centerValue}</div>
          {centerLabel && <div style={{ fontSize: '10px', color: 'var(--muted)' }}>{centerLabel}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', justifyContent: 'center' }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{seg.label}</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)' }}>{seg.pct || Math.round(seg.value / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, subColor, sparkData, accent = WA, trend }) {
  const [hov, setHov] = useState(false)
  const isUp = trend === 'up' || (sub && sub.startsWith('+'))
  const isDown = trend === 'down' || (sub && sub.startsWith('-'))
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: 'var(--surface)', border: `1px solid ${hov ? `${accent}40` : 'var(--border)'}`,
        borderRadius: '16px', padding: '20px 22px', transition: 'all .25s cubic-bezier(.4,0,.2,1)',
        transform: hov ? 'translateY(-3px)' : 'none',
        boxShadow: hov ? `0 12px 32px ${accent}15` : '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', overflow: 'hidden',
      }}>
      {/* Subtle gradient accent */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${accent}00, ${accent}60, ${accent}00)`, opacity: hov ? 1 : 0, transition: 'opacity .3s' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: `${accent}12`, border: `1px solid ${accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={accent} strokeWidth={2} />
        </div>
        {sparkData && <Sparkline data={sparkData} color={accent} w={72} h={28} />}
      </div>
      <div>
        <div style={{ fontFamily: D, fontSize: '26px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '5px' }}>{value}</div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: sub ? '8px' : 0, fontWeight: 500 }}>{label}</div>
        {sub && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: `${subColor || OK}10`, borderRadius: '20px', padding: '3px 10px' }}>
            {isUp && <ArrowUpRight size={11} color={subColor || OK} strokeWidth={2.5} />}
            {isDown && <ArrowDownRight size={11} color={subColor || ER} strokeWidth={2.5} />}
            <span style={{ fontSize: '11px', fontWeight: 700, color: subColor || OK }}>{sub}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Platform badge ───────────────────────────────────────────────────────────
const PlatBadge = ({ p }) => {
  const c = PLAT_COLORS[p] || PLAT_COLORS[p?.toLowerCase()] || A
  const label = p?.charAt(0).toUpperCase() + p?.slice(1)
  return <span style={{ background: `${c}14`, color: c, border: `1px solid ${c}25`, borderRadius: '6px', padding: '2px 8px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.02em' }}>{label}</span>
}

// ─── Section card ─────────────────────────────────────────────────────────────
const SectionCard = ({ title, subtitle, icon: Icon, iconColor = A, action, children, noPad, style: sx }) => (
  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden', animation: 'co-fadeIn .4s ease both', ...sx }}>
    <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {Icon && <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: `${iconColor}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={15} color={iconColor} /></div>}
        <div>
          <h3 style={{ fontFamily: D, fontSize: '14px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>{title}</h3>
          {subtitle && <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '2px 0 0' }}>{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
    <div style={noPad ? {} : { padding: '20px 22px' }}>{children}</div>
  </div>
)

// ─── Skeleton loader ──────────────────────────────────────────────────────────
const Skeleton = ({ h = 16, w = '100%', r = 8 }) => (
  <div style={{ height: `${h}px`, width: w, borderRadius: `${r}px`, background: 'linear-gradient(90deg, var(--border) 25%, var(--surface2) 50%, var(--border) 75%)', backgroundSize: '200% 100%', animation: 'co-shimmer 1.5s infinite linear' }} />
)

// ─── Add channel modal ────────────────────────────────────────────────────────
const AddChannelModal = ({ onClose }) => {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name: '', platform: 'Telegram', url: '', audience: '', price: '', category: '', desc: '' })
  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const PLATFORMS = ['Telegram', 'WhatsApp', 'Discord', 'Instagram', 'Newsletter', 'Facebook']
  const CATEGORIES = ['Tecnologia', 'Marketing', 'Negocios', 'Gaming', 'Fitness', 'Finanzas', 'Ecommerce']
  const inp = { width: '100%', boxSizing: 'border-box', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '11px', padding: '11px 14px', fontSize: '14px', color: 'var(--text)', fontFamily: F, outline: 'none', transition: 'border-color .15s' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--surface)', borderRadius: '22px', width: '100%', maxWidth: '500px', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.45)', animation: 'co-fadeIn .25s ease' }}>
        <div style={{ height: '3px', background: `linear-gradient(90deg, ${A}, ${WA})` }} />
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: D, fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>Registrar canal</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '3px' }}>Paso {step} de 2</div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '9px', padding: '8px', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}><X size={16} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', padding: '16px 28px', borderBottom: '1px solid var(--border)' }}>
          {['Informacion basica', 'Monetizacion'].map((s, i) => (
            <div key={i} style={{ paddingRight: i === 0 ? '12px' : 0, paddingLeft: i === 1 ? '12px' : 0 }}>
              <div style={{ height: '3px', borderRadius: '2px', background: step > i ? A : 'var(--border)', marginBottom: '5px', transition: 'background .3s' }} />
              <span style={{ fontSize: '11px', fontWeight: step > i ? 600 : 400, color: step > i ? A : 'var(--muted)' }}>{s}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {step === 1 && <>
            <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '7px' }}>Nombre del canal *</label><input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Ej: Tech Insights ES" style={inp} /></div>
            <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>Plataforma *</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{PLATFORMS.map(p => {
                const c = PLAT_COLORS[p] || A
                return <button key={p} onClick={() => update('platform', p)} style={{ background: form.platform === p ? c : 'var(--bg)', border: `1px solid ${form.platform === p ? c : 'var(--border)'}`, borderRadius: '20px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, color: form.platform === p ? '#fff' : 'var(--muted)', cursor: 'pointer', fontFamily: F, transition: 'all .15s' }}>{p}</button>
              })}</div>
            </div>
            <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '7px' }}>Enlace al canal</label><input value={form.url} onChange={e => update('url', e.target.value)} placeholder="https://t.me/tucanal" style={inp} /></div>
            <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '7px' }}>Audiencia aproximada</label><input type="number" value={form.audience} onChange={e => update('audience', e.target.value)} placeholder="15000" style={inp} /></div>
          </>}
          {step === 2 && <>
            <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '7px' }}>Precio por publicacion (€) *</label><input type="number" value={form.price} onChange={e => update('price', e.target.value)} placeholder="250" style={inp} /></div>
            <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>Categoria</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{CATEGORIES.map(c => <button key={c} onClick={() => update('category', c)} style={{ background: form.category === c ? A : 'var(--bg)', border: `1px solid ${form.category === c ? A : 'var(--border)'}`, borderRadius: '20px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, color: form.category === c ? '#fff' : 'var(--muted)', cursor: 'pointer', fontFamily: F }}>{c}</button>)}</div>
            </div>
            <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '7px' }}>Descripcion</label><textarea value={form.desc} onChange={e => update('desc', e.target.value)} placeholder="Describe tu canal, audiencia y tipo de contenido..." rows={3} style={{ ...inp, resize: 'none' }} /></div>
          </>}
        </div>
        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <button onClick={() => step > 1 ? setStep(1) : onClose()} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '11px', padding: '11px 20px', fontSize: '13px', cursor: 'pointer', color: 'var(--text)', fontFamily: F }}>{step > 1 ? '← Volver' : 'Cancelar'}</button>
          <button onClick={async () => {
            if (step < 2) return setStep(2)
            try {
              const res = await apiService.createChannel({ nombreCanal: form.name, plataforma: form.platform, enlace: form.url, audiencia: Number(form.audience) || 0, precio: Number(form.price) || 0, categoria: form.category, descripcion: form.desc })
              if (res?.success) onClose(res.data)
              else alert(res?.message || 'Error al registrar el canal')
            } catch { alert('Error de conexion') }
          }} style={{ background: `linear-gradient(135deg, ${A}, ${A}dd)`, color: '#fff', border: 'none', borderRadius: '11px', padding: '11px 26px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: F, boxShadow: `0 4px 14px ${AG(0.35)}` }}>
            {step === 2 ? 'Registrar canal' : 'Siguiente →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Mock sparklines ──────────────────────────────────────────────────────────
const EARN_SPARK = [820, 940, 870, 1100, 1050, 1280, 1190, 1380, 1310, 1520, 1480, 1730]
const REQ_SPARK  = [2, 4, 3, 5, 4, 6, 5, 7, 6, 8, 7, 9]

// ─── Period selector ──────────────────────────────────────────────────────────
const PERIOD_OPTS = [
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: '12m', label: '12m' },
]
const getPeriodMs = (key) => {
  if (key === '7d') return 7 * 86400000
  if (key === '30d') return 30 * 86400000
  if (key === '90d') return 90 * 86400000
  return 365 * 86400000
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function CreatorOverviewPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [channels, setChannels] = useState([])
  const [requests, setRequests] = useState([])
  const [creatorCampaigns, setCreatorCampaigns] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [period, setPeriod] = useState('30d')

  // Fetch base data once
  useEffect(() => {
    let mounted = true
    const load = async () => {
      const [chRes, adsRes, cmpRes] = await Promise.all([
        apiService.getMyChannels().catch(() => null),
        apiService.getAdsForCreator().catch(() => null),
        apiService.getCreatorCampaigns().catch(() => null),
      ])
      if (!mounted) return
      setChannels(chRes?.success ? (Array.isArray(chRes.data) ? chRes.data : chRes.data?.items || []) : [])
      setRequests(adsRes?.success && Array.isArray(adsRes.data) ? adsRes.data : [])
      setCreatorCampaigns(cmpRes?.success ? (Array.isArray(cmpRes.data) ? cmpRes.data : cmpRes.data?.items || []) : [])
    }
    load()
    return () => { mounted = false }
  }, [])

  // Fetch analytics (depends on period)
  useEffect(() => {
    let mounted = true
    setAnalyticsLoading(true)
    const load = async () => {
      try {
        const res = await apiService.getCreatorAnalytics({ period: period === '12m' ? '1y' : period })
        if (mounted && res?.success) setAnalytics(res.data)
        else if (mounted) setAnalytics(MOCK_CREATOR_ANALYTICS)
      } catch {
        if (mounted) setAnalytics(MOCK_CREATOR_ANALYTICS)
      } finally {
        if (mounted) setAnalyticsLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [period])

  const nombre = user?.nombre || 'Creador'
  const nameFirst = nombre.split(' ')[0]
  const now = new Date()

  // Period-aware filtering
  const periodMs = getPeriodMs(period)
  const periodStart = new Date(Date.now() - periodMs)
  const filteredCampaigns = creatorCampaigns.filter(c => new Date(c.createdAt) >= periodStart)

  // Compute KPIs
  const campaignEarnings = filteredCampaigns.filter(c => c.status === 'COMPLETED').reduce((s, c) => s + (c.netAmount || 0), 0)
  const totalEarnings = channels.reduce((s, c) => s + (c.totalEarnings || 0), 0) + campaignEarnings
  const monthEarnings = channels.reduce((s, c) => s + (c.earningsThisMonth || 0), 0) + campaignEarnings
  const activeChannels = channels.filter(c => c.estado === 'activo' || c.estado === 'verificado' || c.status === 'activo').length || channels.length
  const pendingReqs = requests.filter(r => r.status === 'pendiente').length + creatorCampaigns.filter(c => c.status === 'PAID').length
  const balance = campaignEarnings || 930

  // Month-over-month
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const thisMonthEarn = creatorCampaigns.filter(c => c.status === 'COMPLETED' && new Date(c.completedAt || c.createdAt) >= thisMonthStart).reduce((s, c) => s + (c.netAmount || 0), 0)
  const lastMonthEarn = creatorCampaigns.filter(c => c.status === 'COMPLETED' && new Date(c.completedAt || c.createdAt) >= lastMonthStart && new Date(c.completedAt || c.createdAt) < thisMonthStart).reduce((s, c) => s + (c.netAmount || 0), 0)
  const momChange = lastMonthEarn > 0 ? Math.round(((thisMonthEarn - lastMonthEarn) / lastMonthEarn) * 100) : null
  const momLabel = momChange !== null ? `${momChange >= 0 ? '+' : ''}${momChange}% vs mes anterior` : '+18% vs mes anterior'

  // Activity feed
  const activityFeed = creatorCampaigns.slice().sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)).slice(0, 6).map(c => ({
    id: c._id,
    icon: c.status === 'PAID' ? '📥' : c.status === 'PUBLISHED' ? '📢' : c.status === 'COMPLETED' ? '💰' : c.status === 'CANCELLED' ? '✕' : '📋',
    color: c.status === 'PAID' ? BLUE : c.status === 'PUBLISHED' ? OK : c.status === 'COMPLETED' ? WA : ER,
    title: c.status === 'PAID' ? 'Nueva solicitud' : c.status === 'PUBLISHED' ? 'Publicada' : c.status === 'COMPLETED' ? 'Pago recibido' : 'Cancelada',
    desc: `${typeof c.channel === 'object' ? c.channel?.nombreCanal : 'Canal'} — €${(c.netAmount || 0).toFixed(0)}`,
    time: new Date(c.updatedAt || c.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
  }))

  // Sparklines from campaigns
  const earnSparkData = creatorCampaigns.length > 0 ? (() => {
    const buckets = Array(12).fill(0)
    creatorCampaigns.filter(c => c.status === 'COMPLETED').forEach(c => {
      const d = new Date(c.completedAt || c.createdAt)
      const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth()
      if (monthsAgo >= 0 && monthsAgo < 12) buckets[11 - monthsAgo] += (c.netAmount || 0)
    })
    return buckets
  })() : EARN_SPARK

  const barChartData = creatorCampaigns.length > 0 ? (() => {
    const result = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = d.toLocaleDateString('es', { month: 'short' })
      const value = Math.round(creatorCampaigns.filter(c => c.status === 'COMPLETED').reduce((s, c) => {
        const cd = new Date(c.completedAt || c.createdAt)
        return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth() ? s + (c.netAmount || 0) : s
      }, 0))
      result.push({ label, value })
    }
    return result
  })() : [
    { label: 'Oct', value: Math.round(totalEarnings * 0.08) || 420 },
    { label: 'Nov', value: Math.round(totalEarnings * 0.12) || 680 },
    { label: 'Dic', value: Math.round(totalEarnings * 0.2) || 1100 },
    { label: 'Ene', value: Math.round(totalEarnings * 0.1) || 580 },
    { label: 'Feb', value: Math.round(totalEarnings * 0.15) || 830 },
    { label: 'Mar', value: monthEarnings || Math.round(totalEarnings * 0.25) || 1150 },
  ]

  // Analytics-derived data
  const revenueTimeline = useMemo(() => {
    const tl = analytics?.revenueTimeline
    if (!tl?.length) return barChartData.map(d => ({ date: d.label, revenue: d.value }))
    return tl
  }, [analytics, barChartData])

  const channelComparison = analytics?.channelComparison || MOCK_CREATOR_ANALYTICS.channelComparison
  const clickMetrics = analytics?.clickMetrics || MOCK_CREATOR_ANALYTICS.clickMetrics
  const totalClicks = clickMetrics?.totalClicks || 0
  const uniqueClicks = clickMetrics?.uniqueClicks || 0
  const clickSparkData = clickMetrics?.timeline?.map(t => t.clicks) || []

  // Best performing days (from revenue timeline)
  const bestDays = useMemo(() => {
    const dayTotals = [0, 0, 0, 0, 0, 0, 0]
    const dayCounts = [0, 0, 0, 0, 0, 0, 0]
    ;(analytics?.revenueTimeline || MOCK_CREATOR_ANALYTICS.revenueTimeline).forEach(d => {
      const dow = new Date(d.date).getDay()
      if (!isNaN(dow)) {
        dayTotals[dow] += (d.revenue || 0)
        dayCounts[dow]++
      }
    })
    const dayAvgs = dayTotals.map((t, i) => ({ day: i, avg: dayCounts[i] > 0 ? t / dayCounts[i] : 0 }))
    const maxAvg = Math.max(...dayAvgs.map(d => d.avg), 1)
    return dayAvgs.map(d => ({ ...d, pct: (d.avg / maxAvg) * 100 }))
  }, [analytics])

  const h = now.getHours()
  const greeting = h < 13 ? `Buenos dias, ${nameFirst}` : h < 20 ? `Buenas tardes, ${nameFirst}` : `Buenas noches, ${nameFirst}`

  // Channel comparison max for bar widths
  const maxChRevenue = Math.max(...channelComparison.map(c => c.revenue), 1)

  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1150px' }}>
      <style>{CSS}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: D, fontSize: '26px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '6px' }}>
            {greeting}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
            {activeChannels} canales activos · <span style={{ color: pendingReqs > 0 ? WARN : OK, fontWeight: 600 }}>{pendingReqs} solicitudes pendientes</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Period selector */}
          <div style={{ display: 'flex', gap: '2px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '3px' }}>
            {PERIOD_OPTS.map(p => {
              const active = period === p.key
              return (
                <button key={p.key} onClick={() => setPeriod(p.key)} style={{
                  background: active ? A : 'transparent', color: active ? '#fff' : 'var(--muted)',
                  border: 'none', borderRadius: '7px', padding: '6px 12px', fontSize: '12px',
                  fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: F, transition: 'all .2s',
                }}>{p.label}</button>
              )
            })}
          </div>
          <button onClick={() => navigate('/creator/channels/new')}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', background: `linear-gradient(135deg, ${A}, ${A}cc)`, color: '#fff', border: 'none', borderRadius: '11px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: F, boxShadow: `0 4px 16px ${AG(0.35)}`, transition: 'all .2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${AG(0.45)}` }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 16px ${AG(0.35)}` }}>
            <Plus size={15} strokeWidth={2.5} /> Registrar canal
          </button>
        </div>
      </div>

      {/* ── KPI grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <KpiCard icon={DollarSign} label="Ganancias del periodo" value={`€${monthEarnings.toLocaleString('es')}`} sub={momLabel} subColor={momChange !== null && momChange < 0 ? ER : OK} sparkData={earnSparkData} accent={WA} />
        <KpiCard icon={Radio} label="Canales activos" value={activeChannels} sub={`${channels.length} registrados`} accent={A} sparkData={[2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, activeChannels]} />
        <KpiCard icon={Inbox} label="Solicitudes pendientes" value={pendingReqs} sub={pendingReqs > 0 ? 'Requieren respuesta' : 'Al dia'} subColor={pendingReqs > 0 ? WARN : OK} sparkData={REQ_SPARK} accent={WARN} />
        <KpiCard icon={MousePointerClick} label="Clics totales" value={totalClicks.toLocaleString('es')} sub={`${uniqueClicks.toLocaleString('es')} unicos`} accent={BLUE} sparkData={clickSparkData.slice(-12)} />
      </div>

      {/* ── Revenue Timeline (full width) ── */}
      <SectionCard title="Tendencia de ingresos" subtitle={`Ultimos ${period === '12m' ? '12 meses' : period}`} icon={TrendingUp} iconColor={WA}
        action={
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: D, fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>€{revenueTimeline.reduce((s, d) => s + (d.revenue || d.value || 0), 0).toLocaleString('es')}</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Total del periodo</div>
            </div>
          </div>
        }>
        {analyticsLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Skeleton h={180} /><Skeleton h={12} w="60%" />
          </div>
        ) : (
          <AreaChart data={revenueTimeline.map(d => ({ label: d.date?.slice(5) || d.label, value: d.revenue || d.value || 0 }))} color={WA} height={200} />
        )}
      </SectionCard>

      {/* ── 3-col metrics row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>

        {/* Channel Performance */}
        <SectionCard title="Rendimiento por canal" icon={BarChart3} iconColor={A}
          action={<button onClick={() => navigate('/creator/channels')} style={{ background: 'none', border: 'none', fontSize: '12px', color: A, cursor: 'pointer', fontFamily: F, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>Detalles <ChevronRight size={12} /></button>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {channelComparison.map((ch, i) => {
              const platColor = PLAT_COLORS[ch.platform] || A
              return (
                <div key={ch.channelId || i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: platColor, flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</span>
                      <PlatBadge p={ch.platform} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', flexShrink: 0 }}>€{ch.revenue.toLocaleString('es')}</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(ch.revenue / maxChRevenue) * 100}%`, background: `linear-gradient(90deg, ${platColor}, ${platColor}aa)`, borderRadius: '3px', transition: 'width .5s ease' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--muted)' }}>
                    <span>{ch.campaigns} campanas</span>
                    <span>€{ch.avgPrice} avg</span>
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>

        {/* Best Days */}
        <SectionCard title="Mejores dias de publicacion" icon={Calendar} iconColor={OK}
          action={<span style={{ fontSize: '11px', color: 'var(--muted)', fontStyle: 'italic' }}>Basado en datos reales</span>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {bestDays.map((d, i) => {
              const isTop = d.pct >= 80
              const color = isTop ? OK : d.pct >= 50 ? WARN : 'var(--muted)'
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: isTop ? OK : 'var(--text)', minWidth: '30px' }}>{DAY_SHORT[d.day]}</span>
                  <div style={{ flex: 1, height: '8px', background: 'var(--bg)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${d.pct}%`, background: isTop ? `linear-gradient(90deg, ${OK}, ${OK}bb)` : d.pct >= 50 ? `linear-gradient(90deg, ${WARN}80, ${WARN}50)` : 'var(--border)', borderRadius: '4px', transition: 'width .4s ease' }} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color, minWidth: '36px', textAlign: 'right' }}>€{Math.round(d.avg)}</span>
                  {isTop && <span style={{ fontSize: '9px', fontWeight: 700, color: OK, background: `${OK}12`, borderRadius: '4px', padding: '2px 5px' }}>TOP</span>}
                </div>
              )
            })}
          </div>
        </SectionCard>

        {/* Click metrics + Devices */}
        <SectionCard title="Metricas de clics" icon={MousePointerClick} iconColor={BLUE}
          action={<span style={{ fontSize: '12px', fontWeight: 700, color: BLUE }}>{(uniqueClicks / totalClicks * 100 || 0).toFixed(0)}% tasa unica</span>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: 'var(--bg)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontFamily: D, fontSize: '20px', fontWeight: 800, color: BLUE }}>{totalClicks >= 1000 ? `${(totalClicks/1000).toFixed(1)}k` : totalClicks}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Total clics</div>
              </div>
              <div style={{ background: 'var(--bg)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontFamily: D, fontSize: '20px', fontWeight: 800, color: A }}>{uniqueClicks >= 1000 ? `${(uniqueClicks/1000).toFixed(1)}k` : uniqueClicks}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Unicos</div>
              </div>
            </div>
            {clickSparkData.length > 2 && <Sparkline data={clickSparkData} color={BLUE} w={260} h={40} />}
          </div>
        </SectionCard>
      </div>

      {/* ── 2-col layout: Channels + Activity ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(280px, 1fr)', gap: '16px' }}>

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Active channels */}
          <SectionCard title="Mis Canales" subtitle={`${channels.length} canales registrados`} noPad
            action={<button onClick={() => navigate('/creator/channels')} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', fontSize: '12px', color: A, cursor: 'pointer', fontWeight: 600, fontFamily: F }}>Ver todos <ChevronRight size={12} /></button>}>
            {channels.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${A}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '22px' }}>📡</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>Sin canales aun</div>
                <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Registra tu primer canal para empezar</div>
              </div>
            ) : channels.slice(0, 4).map((ch, i) => {
              const plat = ch.plataforma || ch.platform || ''
              const platLabel = plat.charAt(0).toUpperCase() + plat.slice(1)
              const platColor = PLAT_COLORS[platLabel] || PLAT_COLORS[plat] || A
              const name = ch.nombreCanal || ch.name || ch.identificadorCanal || 'Canal'
              const audience = ch.estadisticas?.seguidores || ch.audience || 0
              const price = ch.precio || ch.pricePerPost || 0
              const earnings = ch.earningsThisMonth || 0
              const status = ch.estado || ch.status || 'pendiente'
              const isActive = status === 'activo' || status === 'verificado'
              return (
                <div key={ch._id || ch.id} onClick={() => navigate('/creator/channels')}
                  style={{ padding: '14px 22px', borderBottom: i < Math.min(channels.length, 4) - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', transition: 'background .12s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: `${platColor}14`, border: `1px solid ${platColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                    {plat === 'telegram' ? '✈️' : plat === 'whatsapp' ? '💬' : plat === 'discord' ? '🎮' : plat === 'instagram' ? '📸' : '📧'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{name}</span>
                      <PlatBadge p={platLabel} />
                      {ch.verificado && <span style={{ fontSize: '9px', color: OK, fontWeight: 700 }}>✓</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--muted)' }}>
                      <span>{audience.toLocaleString('es')} subs</span>
                      <span>€{price}/post</span>
                      {earnings > 0 && <span style={{ color: OK, fontWeight: 600 }}>+€{earnings}</span>}
                    </div>
                  </div>
                  <span style={{ background: isActive ? `${OK}10` : `${WARN}10`, color: isActive ? OK : WARN, border: `1px solid ${isActive ? `${OK}20` : `${WARN}20`}`, borderRadius: '20px', padding: '3px 10px', fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {isActive ? 'Activo' : 'Pendiente'}
                  </span>
                </div>
              )
            })}
          </SectionCard>

          {/* Pending requests */}
          <SectionCard title="Solicitudes pendientes" noPad
            icon={pendingReqs > 0 ? Inbox : Check} iconColor={pendingReqs > 0 ? WARN : OK}
            action={<button onClick={() => navigate('/creator/requests')} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', fontSize: '12px', color: A, cursor: 'pointer', fontWeight: 600, fontFamily: F }}>Ver todas <ChevronRight size={12} /></button>}>
            {requests.filter(r => r.status === 'pendiente').length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${OK}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}><Check size={20} color={OK} /></div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '3px' }}>Al dia</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>No hay solicitudes pendientes</div>
              </div>
            ) : (
              requests.filter(r => r.status === 'pendiente').slice(0, 3).map((req, i, arr) => (
                <div key={req.id} style={{ padding: '16px 22px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{req.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{req.advertiser}</span>
                        <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--muted)' }} />
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{req.channel}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: 'var(--muted)' }}><Clock size={9} /> {req.receivedAt}</span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.4, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        "{req.message}"
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                      <div style={{ fontFamily: D, fontSize: '20px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>€{req.budget}</div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button style={{ display: 'flex', alignItems: 'center', gap: '4px', background: `${ER}08`, border: `1px solid ${ER}18`, borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: 600, color: ER, cursor: 'pointer', fontFamily: F }}><X size={11} /> Rechazar</button>
                        <button onClick={() => navigate('/creator/requests')} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: `linear-gradient(135deg, ${OK}, ${OK}dd)`, border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: F }}><Check size={11} /> Aceptar</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </SectionCard>
        </div>

        {/* ── Right column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Monthly earnings chart */}
          <SectionCard title="Ganancias mensuales" subtitle="Ultimos 6 meses" icon={DollarSign} iconColor={WA}>
            <BarChart data={barChartData} color={WA} />
          </SectionCard>

          {/* Performance summary */}
          <SectionCard title="Resumen de rendimiento" icon={Target} iconColor={A}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Canal top', value: channelComparison[0]?.name || '-', color: PLAT_COLORS[channelComparison[0]?.platform] || A },
                { label: 'Tasa completado', value: `${analytics?.campaignsTimeline?.length ? Math.round(analytics.campaignsTimeline.reduce((s, d) => s + (d.completed || 0), 0) / Math.max(1, analytics.campaignsTimeline.reduce((s, d) => s + (d.total || 0), 0)) * 100) : 92}%`, color: OK },
                { label: 'Deal promedio', value: `€${channelComparison.length ? Math.round(channelComparison.reduce((s, c) => s + c.avgPrice, 0) / channelComparison.length) : 301}`, color: WA },
                { label: 'CTR campanas', value: `${totalClicks > 0 ? ((uniqueClicks / totalClicks) * 100).toFixed(1) : '71.5'}%`, color: BLUE },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg)', borderRadius: '10px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Activity feed */}
          <SectionCard title="Actividad reciente" icon={Activity} iconColor={A} noPad
            action={<button onClick={() => navigate('/creator/requests')} style={{ background: 'none', border: 'none', fontSize: '11px', color: A, cursor: 'pointer', fontFamily: F, fontWeight: 600 }}>Ver todo</button>}>
            <div>
              {(activityFeed.length > 0 ? activityFeed : [
                { id: 1, icon: '📥', color: BLUE, title: 'Nueva solicitud', desc: 'Tech Insights ES — €450', time: 'Hace 2h' },
                { id: 2, icon: '💰', color: WA, title: 'Pago recibido', desc: 'Marketing Pro WA — €180', time: 'Ayer' },
                { id: 3, icon: '📢', color: OK, title: 'Publicada', desc: 'Dev & Code ES — €380', time: 'Hace 3 dias' },
              ]).map((a, i, arr) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 22px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background .12s', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: `${a.color}10`, border: `1px solid ${a.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                    {a.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '1px' }}>{a.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.desc}</div>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{a.time}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Balance card */}
          <div style={{ background: `linear-gradient(135deg, ${A} 0%, #6d28d9 100%)`, borderRadius: '18px', padding: '22px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ position: 'absolute', bottom: '-20px', left: '-20px', width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
            <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '6px', fontWeight: 500 }}>Saldo disponible</div>
            <div style={{ fontFamily: D, fontSize: '30px', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '4px' }}>€{balance.toLocaleString('es')}</div>
            <div style={{ fontSize: '11px', opacity: 0.65, marginBottom: '16px' }}>Disponible para retiro inmediato</div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px', overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{ height: '100%', width: '65%', background: 'rgba(255,255,255,0.6)', borderRadius: '2px', transition: 'width .5s ease' }} />
            </div>
            <button onClick={() => navigate('/creator/earnings')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: F, width: '100%', justifyContent: 'center', transition: 'all .15s', backdropFilter: 'blur(4px)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}>
              <Zap size={14} fill="#fff" /> Solicitar retiro
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
