import React, { useState, useMemo, useCallback } from 'react'
import {
  Handshake, Users, TrendingUp, DollarSign, Target, BarChart3,
  AlertTriangle, CheckCircle, ChevronRight, Settings, Layers,
  ArrowUpRight, ArrowDownRight, Info, Zap, Shield, Star,
  Calculator, PieChart, Activity, Award, Briefcase, Globe, Megaphone,
} from 'lucide-react'

// ─── Design tokens (match existing dashboard) ───────────────────────────────
const A    = '#8b5cf6'
const AG   = (o) => `rgba(139,92,246,${o})`
const F    = "'Inter', system-ui, sans-serif"
const D    = "'Sora', system-ui, sans-serif"
const OK   = '#10b981'
const WARN = '#f59e0b'
const ERR  = '#ef4444'
const BLUE = '#3b82f6'
const CYAN = '#06b6d4'
const PINK = '#ec4899'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt  = (n) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
const fmtE = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
const fmtP = (n) => `${(n * 100).toFixed(1)}%`
const pct  = (a, b) => b ? (a / b * 100).toFixed(1) : '0'

// ─── Tab definitions ─────────────────────────────────────────────────────────
const TABS = [
  { id: 'models',      label: 'Modelos',       icon: Layers },
  { id: 'funnel',      label: 'Funnel',        icon: Users },
  { id: 'unit',        label: 'Unit Economics', icon: Calculator },
  { id: 'tiers',       label: 'Tramos',        icon: Award },
  { id: 'projections', label: 'Proyecciones',  icon: TrendingUp },
  { id: 'cac',         label: 'CAC',           icon: DollarSign },
  { id: 'decision',    label: 'Decision',       icon: CheckCircle },
  { id: 'objectives',  label: 'Objetivos',     icon: Target },
]

// ─── Card wrapper ────────────────────────────────────────────────────────────
function Card({ children, title, subtitle, icon: Icon, alert, style }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16,
      padding: 24, ...style,
    }}>
      {(title || Icon) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: subtitle ? 4 : 16 }}>
          {Icon && <Icon size={18} color={A} />}
          <span style={{ fontFamily: D, fontWeight: 700, fontSize: 15, color: 'var(--foreground)' }}>{title}</span>
          {alert && (
            <span style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 600, color: alert === 'danger' ? ERR : WARN,
              background: alert === 'danger' ? `${ERR}15` : `${WARN}15`,
              padding: '3px 8px', borderRadius: 6,
            }}>
              <AlertTriangle size={12} /> Alerta
            </span>
          )}
        </div>
      )}
      {subtitle && <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>{subtitle}</p>}
      {children}
    </div>
  )
}

// ─── Editable input ──────────────────────────────────────────────────────────
function Input({ label, value, onChange, suffix, prefix, type = 'number', min, max, step = 1, help }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
        {help && <span title={help} style={{ marginLeft: 4, cursor: 'help' }}>ⓘ</span>}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {prefix && <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>{prefix}</span>}
        <input
          type={type} value={value} min={min} max={max} step={step}
          onChange={e => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
          style={{
            width: '100%', padding: '6px 10px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--background)',
            fontFamily: F, fontSize: 13, fontWeight: 600, color: 'var(--foreground)',
            outline: 'none', transition: 'border .15s',
          }}
          onFocus={e => e.target.style.borderColor = A}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        {suffix && <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{suffix}</span>}
      </div>
    </div>
  )
}

// ─── Badge ───────────────────────────────────────────────────────────────────
function Badge({ children, color = A }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 6,
      fontSize: 11, fontWeight: 700, background: `${color}18`, color,
    }}>{children}</span>
  )
}

// ─── Progress bar ────────────────────────────────────────────────────────────
function Progress({ value, max, color = A, height = 8 }) {
  const p = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div style={{ width: '100%', height, borderRadius: height, background: 'var(--border)', overflow: 'hidden' }}>
      <div style={{
        width: `${p}%`, height: '100%', borderRadius: height,
        background: `linear-gradient(90deg, ${color}, ${color}dd)`,
        transition: 'width .4s cubic-bezier(.4,0,.2,1)',
      }} />
    </div>
  )
}

// ─── Data table ──────────────────────────────────────────────────────────────
function DataTable({ columns, rows, highlight }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontFamily: F, fontSize: 13 }}>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} style={{
                textAlign: c.align || 'left', padding: '8px 12px', borderBottom: '2px solid var(--border)',
                fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px',
                whiteSpace: 'nowrap',
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{
              background: highlight === ri ? AG(0.06) : ri % 2 === 0 ? 'transparent' : 'var(--background)',
            }}>
              {columns.map((c, ci) => (
                <td key={ci} style={{
                  padding: '10px 12px', borderBottom: '1px solid var(--border)',
                  textAlign: c.align || 'left', fontWeight: ci === 0 ? 600 : 400,
                  color: c.color ? c.color(row[c.key], row) : 'var(--foreground)',
                  whiteSpace: 'nowrap',
                }}>
                  {c.render ? c.render(row[c.key], row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── KPI card ────────────────────────────────────────────────────────────────
function KPI({ label, value, sub, icon: Icon, color = A, trend }) {
  return (
    <div style={{
      padding: 16, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)',
      display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 180,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: `${color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: D, color: 'var(--foreground)' }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: trend === 'up' ? OK : trend === 'down' ? ERR : 'var(--muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
          {trend === 'up' && <ArrowUpRight size={12} />}
          {trend === 'down' && <ArrowDownRight size={12} />}
          {sub}
        </div>}
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function GetalinkPartnershipDashboard() {
  const [tab, setTab] = useState('models')

  // ─── GLOBAL INPUTS (editable) ─────────────────────────────────────────────
  const [inputs, setInputs] = useState({
    // Adflow
    platformCommission: 0.10,        // 10% Adflow takes on each campaign
    monthlyFixedCosts: 2500,         // server, tools, team
    avgCampaignPrice: 250,           // EUR avg campaign
    avgCampaignsPerUser: 2.5,        // campaigns/month per active user
    // Getalink data
    getalinkMediaCount: 20000,
    getalinkAdvertiserCount: 4000,
    getalinkActiveRate: 0.25,        // 25% active
    getalinkMinSpend: 1000,          // min spent by advertisers
    getalinkTicketMin: 150,
    getalinkTicketMax: 400,
    getalinkAffiliateRate: 0.07,     // 7% their standard affiliate
    // Funnel rates
    funnelImpacted: 4000,            // from Getalink's base
    funnelClickRate: 0.12,
    funnelRegisterRate: 0.25,
    funnelActivationRate: 0.30,
    funnelRecurrenceRate: 0.40,
    // Rev share tiers
    tier1Max: 10,   tier1Pct: 0.10,
    tier2Max: 50,   tier2Pct: 0.15,
    tier3Max: 100,  tier3Pct: 0.20,
    tier4Pct: 0.25,
    // Projections
    projConservativeUsers: 30,
    projRealisticUsers: 75,
    projAggressiveUsers: 150,
    // CAC
    marketingBudget: 3000,
    cpaCost: 15,
  })

  const upd = useCallback((k, v) => setInputs(prev => ({ ...prev, [k]: v })), [])

  // ─── DERIVED CALCULATIONS ─────────────────────────────────────────────────
  const calc = useMemo(() => {
    const i = inputs
    const getalinkActive = Math.round(i.getalinkAdvertiserCount * i.getalinkActiveRate)
    const avgTicket = (i.getalinkTicketMin + i.getalinkTicketMax) / 2

    // Funnel
    const clicks = Math.round(i.funnelImpacted * i.funnelClickRate)
    const registrations = Math.round(clicks * i.funnelRegisterRate)
    const activated = Math.round(registrations * i.funnelActivationRate)
    const recurrent = Math.round(activated * i.funnelRecurrenceRate)

    // Unit economics
    const gmvPerUser = i.avgCampaignPrice * i.avgCampaignsPerUser
    const revenuePerUser = gmvPerUser * i.platformCommission
    const revSharePcts = [i.tier1Pct, i.tier2Pct, i.tier3Pct, i.tier4Pct]
    const avgRevShare = revSharePcts.reduce((a, b) => a + b, 0) / revSharePcts.length
    const getalinkSharePerUser = revenuePerUser * avgRevShare
    const netMarginPerUser = revenuePerUser - getalinkSharePerUser

    // Tiers
    const tiers = [
      { label: 'Tier 1', min: 0, max: i.tier1Max, pct: i.tier1Pct, bonus: '-' },
      { label: 'Tier 2', min: i.tier1Max + 1, max: i.tier2Max, pct: i.tier2Pct, bonus: 'Dashboard premium' },
      { label: 'Tier 3', min: i.tier2Max + 1, max: i.tier3Max, pct: i.tier3Pct, bonus: 'Co-branding' },
      { label: 'Tier 4', min: i.tier3Max + 1, max: 999, pct: i.tier4Pct, bonus: 'Exclusividad canal' },
    ]

    // Tier payout calculation
    const calcTierPayout = (users) => {
      let payout = 0
      for (const t of tiers) {
        const inTier = Math.max(0, Math.min(users, t.max) - t.min + 1)
        if (inTier > 0) {
          payout += inTier * revenuePerUser * t.pct
        }
      }
      return payout
    }

    // Break-even
    const breakEvenUsers = netMarginPerUser > 0 ? Math.ceil(i.monthlyFixedCosts / netMarginPerUser) : Infinity
    const breakEvenGMV = breakEvenUsers * gmvPerUser

    // Projections
    const makeScenario = (users) => {
      const gmv = users * gmvPerUser
      const revTotal = users * revenuePerUser
      const revGetalink = calcTierPayout(users)
      const revAdflow = revTotal - revGetalink
      return { users, gmv, revTotal, revAdflow, revGetalink, profitable: revAdflow > i.monthlyFixedCosts }
    }

    const scenarios = {
      conservative: makeScenario(i.projConservativeUsers),
      realistic: makeScenario(i.projRealisticUsers),
      aggressive: makeScenario(i.projAggressiveUsers),
    }

    // CAC
    const cacPerUser = i.marketingBudget / (registrations || 1)
    const cacPerActivated = i.marketingBudget / (activated || 1)
    const cacPerRecurrent = i.marketingBudget / (recurrent || 1)
    const ltvToCAC = (revenuePerUser * 12) / (cacPerActivated || 1)

    // Objectives
    const campaignsNeeded = breakEvenUsers * i.avgCampaignsPerUser
    const channelsNeeded = Math.ceil(campaignsNeeded / 4) // avg 4 campaigns per channel
    const weeklyRegistrations = Math.ceil(breakEvenUsers / (i.funnelActivationRate * 4))

    return {
      getalinkActive, avgTicket,
      clicks, registrations, activated, recurrent,
      gmvPerUser, revenuePerUser, getalinkSharePerUser, netMarginPerUser,
      tiers, avgRevShare, calcTierPayout,
      breakEvenUsers, breakEvenGMV,
      scenarios,
      cacPerUser, cacPerActivated, cacPerRecurrent, ltvToCAC,
      campaignsNeeded, channelsNeeded, weeklyRegistrations,
    }
  }, [inputs])


  // ═══════════════════════════════════════════════════════════════════════════
  //  TAB 1: MODELOS DE COLABORACION
  // ═══════════════════════════════════════════════════════════════════════════
  function TabModels() {
    const models = [
      {
        model: 'Revenue Share', desc: 'Getalink recibe un % de la comision que Adflow cobra en cada campana',
        pros: 'Bajo riesgo, alineacion de incentivos, escalable', cons: 'Revenue lento al inicio',
        complexity: 2, scalability: 5, risk: 'Bajo', rec: true,
      },
      {
        model: 'CPA (Registro)', desc: 'Pago fijo por cada usuario que se registra via Getalink',
        pros: 'Simple, predecible para Getalink', cons: 'Riesgo si usuarios no activan, coste fijo',
        complexity: 1, scalability: 3, risk: 'Medio',
      },
      {
        model: 'CPA Activado', desc: 'Pago solo si el usuario lanza al menos 1 campana',
        pros: 'Solo pagas por valor real', cons: 'Mas complejo de trackear, Getalink prefiere certeza',
        complexity: 3, scalability: 4, risk: 'Bajo',
      },
      {
        model: 'Hibrido (Rev Share + CPA)', desc: 'CPA pequeno por registro + rev share por actividad',
        pros: 'Incentivo inmediato + recurrente', cons: 'Mas complejo de gestionar',
        complexity: 3, scalability: 4, risk: 'Medio',
      },
      {
        model: 'White Label', desc: 'Getalink ofrece Adflow como producto propio con su marca',
        pros: 'Maximo volumen, exclusividad', cons: 'Perdida de marca, alta dependencia',
        complexity: 5, scalability: 5, risk: 'Alto',
      },
      {
        model: 'API Integration', desc: 'Getalink integra la API de Adflow en su plataforma',
        pros: 'Experiencia nativa, friccion minima', cons: 'Requiere desarrollo bilateral',
        complexity: 4, scalability: 5, risk: 'Medio',
      },
      {
        model: 'Co-selling', desc: 'Equipo comercial conjunto para grandes cuentas',
        pros: 'Deals grandes, relacion directa', cons: 'No escala, requiere RRHH',
        complexity: 2, scalability: 2, risk: 'Bajo',
      },
    ]

    const ratingDots = (n, max = 5, color = A) => (
      <div style={{ display: 'flex', gap: 3 }}>
        {Array.from({ length: max }, (_, i) => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%',
            background: i < n ? color : 'var(--border)',
            transition: 'background .2s',
          }} />
        ))}
      </div>
    )

    return (
      <Card title="Modelos de Colaboracion" icon={Layers} subtitle="Evaluacion de estrategias de partnership con Getalink">
        <DataTable
          columns={[
            { label: 'Modelo', key: 'model', render: (v, r) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {v} {r.rec && <Badge color={OK}>Recomendado</Badge>}
              </div>
            )},
            { label: 'Descripcion', key: 'desc' },
            { label: 'Pros', key: 'pros', render: v => <span style={{ color: OK }}>{v}</span> },
            { label: 'Contras', key: 'cons', render: v => <span style={{ color: ERR }}>{v}</span> },
            { label: 'Complejidad', key: 'complexity', align: 'center', render: v => ratingDots(v) },
            { label: 'Escalabilidad', key: 'scalability', align: 'center', render: v => ratingDots(v, 5, OK) },
            { label: 'Riesgo', key: 'risk', render: v => (
              <Badge color={v === 'Bajo' ? OK : v === 'Medio' ? WARN : ERR}>{v}</Badge>
            )},
          ]}
          rows={models}
          highlight={0}
        />
        <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: `${OK}10`, border: `1px solid ${OK}30`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={16} color={OK} />
          <span style={{ fontSize: 12, color: OK, fontWeight: 600 }}>
            Recomendacion: Revenue Share con tramos progresivos. Bajo riesgo, alta escalabilidad y alineacion total de incentivos.
          </span>
        </div>
      </Card>
    )
  }


  // ═══════════════════════════════════════════════════════════════════════════
  //  TAB 2: FUNNEL DE USUARIOS
  // ═══════════════════════════════════════════════════════════════════════════
  function TabFunnel() {
    const steps = [
      { label: 'Impactados', value: inputs.funnelImpacted, key: 'funnelImpacted', color: '#94a3b8', desc: 'Anunciantes en Getalink que ven la oferta' },
      { label: 'Clicks', value: calc.clicks, rate: inputs.funnelClickRate, rateKey: 'funnelClickRate', color: BLUE, desc: 'Hacen click en el CTA' },
      { label: 'Registros', value: calc.registrations, rate: inputs.funnelRegisterRate, rateKey: 'funnelRegisterRate', color: CYAN, desc: 'Completan el registro en Adflow' },
      { label: 'Activados', value: calc.activated, rate: inputs.funnelActivationRate, rateKey: 'funnelActivationRate', color: A, desc: 'Lanzan al menos 1 campana' },
      { label: 'Recurrentes', value: calc.recurrent, rate: inputs.funnelRecurrenceRate, rateKey: 'funnelRecurrenceRate', color: OK, desc: 'Lanzan 2+ campanas' },
    ]

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Editable inputs */}
        <Card title="Parametros del Funnel" icon={Settings} subtitle="Ajusta las tasas de conversion entre cada etapa">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            <Input label="Usuarios impactados" value={inputs.funnelImpacted} onChange={v => upd('funnelImpacted', v)} help="Base de anunciantes de Getalink" />
            <Input label="Tasa click" value={inputs.funnelClickRate} onChange={v => upd('funnelClickRate', v)} step={0.01} suffix="ratio" help="CTR del CTA en Getalink" />
            <Input label="Tasa registro" value={inputs.funnelRegisterRate} onChange={v => upd('funnelRegisterRate', v)} step={0.01} suffix="ratio" help="% de clicks que registran" />
            <Input label="Tasa activacion" value={inputs.funnelActivationRate} onChange={v => upd('funnelActivationRate', v)} step={0.01} suffix="ratio" help="% de registros que lanzan 1+ campana" />
            <Input label="Tasa recurrencia" value={inputs.funnelRecurrenceRate} onChange={v => upd('funnelRecurrenceRate', v)} step={0.01} suffix="ratio" help="% de activados que repiten" />
          </div>
        </Card>

        {/* Funnel visualization */}
        <Card title="Funnel de Conversion" icon={Users}>
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
            {steps.map((s, i) => {
              const maxVal = steps[0].value
              const pctW = Math.max(20, (s.value / maxVal) * 100)
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                  <div style={{
                    width: `${pctW}%`, minWidth: 60, padding: '16px 8px', borderRadius: 10,
                    background: `${s.color}15`, border: `1.5px solid ${s.color}40`,
                    textAlign: 'center', margin: '0 4px',
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 800, fontFamily: D, color: s.color }}>{fmt(s.value)}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: s.color, marginTop: 2 }}>{s.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{s.desc}</div>
                  </div>
                  {i > 0 && (
                    <div style={{
                      position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
                      background: s.color, color: '#fff', fontSize: 10, fontWeight: 700,
                      padding: '2px 6px', borderRadius: 4,
                    }}>
                      {fmtP(s.rate)}
                    </div>
                  )}
                  {i < steps.length - 1 && (
                    <div style={{
                      position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)',
                      color: 'var(--muted)', fontSize: 14,
                    }}>
                      <ChevronRight size={16} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Conversion summary */}
          <div style={{ marginTop: 20, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--background)', fontSize: 12 }}>
              <span style={{ color: 'var(--muted)' }}>Impactado → Registro: </span>
              <strong>{pct(calc.registrations, inputs.funnelImpacted)}%</strong>
            </div>
            <div style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--background)', fontSize: 12 }}>
              <span style={{ color: 'var(--muted)' }}>Registro → Activado: </span>
              <strong>{pct(calc.activated, calc.registrations)}%</strong>
            </div>
            <div style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--background)', fontSize: 12 }}>
              <span style={{ color: 'var(--muted)' }}>Full funnel (Impactado → Recurrente): </span>
              <strong>{pct(calc.recurrent, inputs.funnelImpacted)}%</strong>
            </div>
          </div>
        </Card>
      </div>
    )
  }


  // ═══════════════════════════════════════════════════════════════════════════
  //  TAB 3: UNIT ECONOMICS
  // ═══════════════════════════════════════════════════════════════════════════
  function TabUnitEconomics() {
    const revShareOptions = [0.10, 0.15, 0.20, 0.25, 0.30]

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card title="Parametros" icon={Settings} subtitle="Ajusta los valores base para unit economics">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            <Input label="Precio medio campana" value={inputs.avgCampaignPrice} onChange={v => upd('avgCampaignPrice', v)} prefix="EUR" />
            <Input label="Campanas/mes por usuario" value={inputs.avgCampaignsPerUser} onChange={v => upd('avgCampaignsPerUser', v)} step={0.5} />
            <Input label="Comision Adflow" value={inputs.platformCommission} onChange={v => upd('platformCommission', v)} step={0.01} suffix="ratio" />
            <Input label="Costes fijos mensuales" value={inputs.monthlyFixedCosts} onChange={v => upd('monthlyFixedCosts', v)} prefix="EUR" />
          </div>
        </Card>

        <Card title="Desglose por Anunciante" icon={Calculator}>
          <DataTable
            columns={[
              { label: 'Rev Share %', key: 'pct', render: v => <Badge>{fmtP(v)}</Badge> },
              { label: 'GMV / usuario', key: 'gmv', align: 'right', render: v => fmtE(v) },
              { label: 'Revenue Adflow', key: 'revAdflow', align: 'right', render: v => fmtE(v) },
              { label: 'Pago Getalink', key: 'revGetalink', align: 'right', render: v => <span style={{ color: ERR }}>{fmtE(v)}</span> },
              { label: 'Margen neto', key: 'margin', align: 'right', render: (v) => (
                <span style={{ color: v > 0 ? OK : ERR, fontWeight: 700 }}>{fmtE(v)}</span>
              )},
              { label: 'Margen %', key: 'marginPct', align: 'right', render: v => (
                <span style={{ color: v > 50 ? OK : v > 30 ? WARN : ERR }}>{v.toFixed(1)}%</span>
              )},
            ]}
            rows={revShareOptions.map(pct => {
              const gmv = calc.gmvPerUser
              const revAdflow = calc.revenuePerUser
              const revGetalink = revAdflow * pct
              const margin = revAdflow - revGetalink
              return { pct, gmv, revAdflow, revGetalink, margin, marginPct: (margin / revAdflow) * 100 }
            })}
          />

          {/* Alert if margin too low */}
          {calc.netMarginPerUser < 5 && (
            <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: `${ERR}10`, border: `1px solid ${ERR}30`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={14} color={ERR} />
              <span style={{ fontSize: 12, color: ERR, fontWeight: 600 }}>
                Margen neto por usuario muy bajo ({fmtE(calc.netMarginPerUser)}). Considera reducir el rev share.
              </span>
            </div>
          )}
        </Card>
      </div>
    )
  }


  // ═══════════════════════════════════════════════════════════════════════════
  //  TAB 4: TRAMOS DE COLABORACION
  // ═══════════════════════════════════════════════════════════════════════════
  function TabTiers() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card title="Configuracion de Tramos" icon={Settings} subtitle="Define los tramos progresivos de rev share para Getalink">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: A, marginBottom: 8 }}>Tier 1</h4>
              <Input label="Max usuarios" value={inputs.tier1Max} onChange={v => upd('tier1Max', v)} />
              <Input label="Rev share" value={inputs.tier1Pct} onChange={v => upd('tier1Pct', v)} step={0.01} suffix="ratio" />
            </div>
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: BLUE, marginBottom: 8 }}>Tier 2</h4>
              <Input label="Max usuarios" value={inputs.tier2Max} onChange={v => upd('tier2Max', v)} />
              <Input label="Rev share" value={inputs.tier2Pct} onChange={v => upd('tier2Pct', v)} step={0.01} suffix="ratio" />
            </div>
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: CYAN, marginBottom: 8 }}>Tier 3</h4>
              <Input label="Max usuarios" value={inputs.tier3Max} onChange={v => upd('tier3Max', v)} />
              <Input label="Rev share" value={inputs.tier3Pct} onChange={v => upd('tier3Pct', v)} step={0.01} suffix="ratio" />
            </div>
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: OK, marginBottom: 8 }}>Tier 4 (100+)</h4>
              <Input label="Rev share" value={inputs.tier4Pct} onChange={v => upd('tier4Pct', v)} step={0.01} suffix="ratio" />
            </div>
          </div>
        </Card>

        <Card title="Tabla de Tramos" icon={Award}>
          <DataTable
            columns={[
              { label: 'Tramo', key: 'label', render: v => <Badge>{v}</Badge> },
              { label: 'Usuarios activados', key: 'range' },
              { label: 'Rev Share', key: 'pct', align: 'center', render: v => (
                <span style={{ fontWeight: 700, color: A }}>{fmtP(v)}</span>
              )},
              { label: 'Bonus', key: 'bonus' },
              { label: 'Payout ejemplo (10 users)', key: 'exPayout', align: 'right', render: v => fmtE(v) },
              { label: 'Revenue Adflow', key: 'exRevenue', align: 'right', render: v => (
                <span style={{ color: OK, fontWeight: 600 }}>{fmtE(v)}</span>
              )},
            ]}
            rows={calc.tiers.map(t => {
              const usersInTier = Math.min(10, t.max - t.min + 1)
              const payout = usersInTier * calc.revenuePerUser * t.pct
              const revenue = usersInTier * calc.revenuePerUser - payout
              return {
                ...t,
                range: `${t.min} – ${t.max === 999 ? '∞' : t.max}`,
                exPayout: payout,
                exRevenue: revenue,
              }
            })}
          />

          {/* Total payout simulation */}
          <div style={{ marginTop: 20 }}>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>SIMULACION DE PAYOUT POR VOLUMEN</h4>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[10, 25, 50, 75, 100, 150, 200].map(n => {
                const payout = calc.calcTierPayout(n)
                const revenue = n * calc.revenuePerUser
                const adflowNet = revenue - payout
                return (
                  <div key={n} style={{
                    padding: '10px 14px', borderRadius: 10, background: 'var(--background)',
                    border: '1px solid var(--border)', textAlign: 'center', minWidth: 100,
                  }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{n} usuarios</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: A, marginTop: 2 }}>{fmtE(payout)}</div>
                    <div style={{ fontSize: 10, color: OK }}>Adflow: {fmtE(adflowNet)}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Rev share alert */}
          {inputs.tier4Pct > 0.30 && (
            <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: `${ERR}10`, border: `1px solid ${ERR}30`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={14} color={ERR} />
              <span style={{ fontSize: 12, color: ERR, fontWeight: 600 }}>
                Rev share del Tier 4 ({fmtP(inputs.tier4Pct)}) supera el 30%. Evalua el impacto en margen.
              </span>
            </div>
          )}
        </Card>
      </div>
    )
  }


  // ═══════════════════════════════════════════════════════════════════════════
  //  TAB 5: PROYECCIONES
  // ═══════════════════════════════════════════════════════════════════════════
  function TabProjections() {
    const { conservative: c, realistic: r, aggressive: a } = calc.scenarios

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card title="Ajustar Escenarios" icon={Settings}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <Input label="Conservador (usuarios)" value={inputs.projConservativeUsers} onChange={v => upd('projConservativeUsers', v)} />
            <Input label="Realista (usuarios)" value={inputs.projRealisticUsers} onChange={v => upd('projRealisticUsers', v)} />
            <Input label="Agresivo (usuarios)" value={inputs.projAggressiveUsers} onChange={v => upd('projAggressiveUsers', v)} />
          </div>
        </Card>

        <Card title="Proyeccion de Ingresos Mensuales" icon={TrendingUp}>
          <DataTable
            columns={[
              { label: 'Escenario', key: 'name', render: (v, row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.color }} />
                  <strong>{v}</strong>
                </div>
              )},
              { label: 'Usuarios Activados', key: 'users', align: 'right', render: v => fmt(v) },
              { label: 'GMV Total', key: 'gmv', align: 'right', render: v => fmtE(v) },
              { label: 'Revenue Total', key: 'revTotal', align: 'right', render: v => fmtE(v) },
              { label: 'Revenue Adflow', key: 'revAdflow', align: 'right', render: v => (
                <span style={{ color: OK, fontWeight: 700 }}>{fmtE(v)}</span>
              )},
              { label: 'Pago Getalink', key: 'revGetalink', align: 'right', render: v => (
                <span style={{ color: WARN }}>{fmtE(v)}</span>
              )},
              { label: 'Estado', key: 'profitable', render: v => (
                <Badge color={v ? OK : ERR}>{v ? 'Rentable' : 'No rentable'}</Badge>
              )},
            ]}
            rows={[
              { name: 'Conservador', color: WARN, ...c },
              { name: 'Realista', color: BLUE, ...r },
              { name: 'Agresivo', color: OK, ...a },
            ]}
          />

          {/* Visual bar comparison */}
          <div style={{ marginTop: 24 }}>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 12 }}>COMPARATIVA VISUAL</h4>
            {[
              { label: 'Conservador', data: c, color: WARN },
              { label: 'Realista', data: r, color: BLUE },
              { label: 'Agresivo', data: a, color: OK },
            ].map(s => (
              <div key={s.label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{s.label}</span>
                  <span style={{ fontSize: 12, color: s.data.profitable ? OK : ERR, fontWeight: 700 }}>
                    {fmtE(s.data.revAdflow)} neto
                  </span>
                </div>
                <Progress value={s.data.revAdflow} max={a.revAdflow || 1} color={s.color} />
              </div>
            ))}
            {/* Break-even line */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <div style={{ flex: 1, borderTop: `2px dashed ${ERR}` }} />
              <span style={{ fontSize: 11, color: ERR, fontWeight: 700 }}>Break-even: {fmtE(inputs.monthlyFixedCosts)}</span>
              <div style={{ flex: 1, borderTop: `2px dashed ${ERR}` }} />
            </div>
          </div>
        </Card>
      </div>
    )
  }


  // ═══════════════════════════════════════════════════════════════════════════
  //  TAB 6: CAC
  // ═══════════════════════════════════════════════════════════════════════════
  function TabCAC() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card title="Parametros de Adquisicion" icon={Settings}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            <Input label="Presupuesto marketing" value={inputs.marketingBudget} onChange={v => upd('marketingBudget', v)} prefix="EUR" />
            <Input label="Coste CPA estimado" value={inputs.cpaCost} onChange={v => upd('cpaCost', v)} prefix="EUR" help="Si usaras modelo CPA puro" />
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          <KPI label="CAC por registro" value={fmtE(calc.cacPerUser)} icon={Users} color={BLUE} sub={`${calc.registrations} registros estimados`} />
          <KPI label="CAC por activado" value={fmtE(calc.cacPerActivated)} icon={Zap} color={A} sub={`${calc.activated} activados estimados`} />
          <KPI label="CAC por recurrente" value={fmtE(calc.cacPerRecurrent)} icon={Activity} color={OK} sub={`${calc.recurrent} recurrentes estimados`} />
          <KPI label="LTV:CAC ratio" value={`${calc.ltvToCAC.toFixed(1)}x`} icon={TrendingUp}
            color={calc.ltvToCAC > 3 ? OK : calc.ltvToCAC > 1 ? WARN : ERR}
            sub={calc.ltvToCAC > 3 ? 'Excelente' : calc.ltvToCAC > 1 ? 'Aceptable' : 'No rentable'}
            trend={calc.ltvToCAC > 3 ? 'up' : 'down'}
          />
        </div>

        <Card title="CPA vs Revenue Generado" icon={BarChart3}>
          <DataTable
            columns={[
              { label: 'Metrica', key: 'metric' },
              { label: 'Coste', key: 'cost', align: 'right', render: v => <span style={{ color: ERR }}>{fmtE(v)}</span> },
              { label: 'Revenue (12 meses)', key: 'rev12', align: 'right', render: v => <span style={{ color: OK }}>{fmtE(v)}</span> },
              { label: 'ROI', key: 'roi', align: 'right', render: v => (
                <Badge color={v > 100 ? OK : WARN}>{v.toFixed(0)}%</Badge>
              )},
              { label: 'Payback (meses)', key: 'payback', align: 'right', render: v => (
                <span style={{ fontWeight: 600, color: v <= 3 ? OK : v <= 6 ? WARN : ERR }}>{v.toFixed(1)}</span>
              )},
            ]}
            rows={[
              {
                metric: 'Por registro',
                cost: calc.cacPerUser,
                rev12: calc.revenuePerUser * 12 * inputs.funnelActivationRate,
                roi: ((calc.revenuePerUser * 12 * inputs.funnelActivationRate) / calc.cacPerUser - 1) * 100,
                payback: calc.cacPerUser / (calc.revenuePerUser * inputs.funnelActivationRate || 1),
              },
              {
                metric: 'Por activado',
                cost: calc.cacPerActivated,
                rev12: calc.revenuePerUser * 12,
                roi: ((calc.revenuePerUser * 12) / calc.cacPerActivated - 1) * 100,
                payback: calc.cacPerActivated / (calc.revenuePerUser || 1),
              },
              {
                metric: 'Por recurrente',
                cost: calc.cacPerRecurrent,
                rev12: calc.revenuePerUser * 12 * inputs.avgCampaignsPerUser,
                roi: ((calc.revenuePerUser * 12 * inputs.avgCampaignsPerUser) / calc.cacPerRecurrent - 1) * 100,
                payback: calc.cacPerRecurrent / (calc.revenuePerUser * inputs.avgCampaignsPerUser || 1),
              },
            ]}
          />
        </Card>
      </div>
    )
  }


  // ═══════════════════════════════════════════════════════════════════════════
  //  TAB 7: DECISION MODELO OPTIMO
  // ═══════════════════════════════════════════════════════════════════════════
  function TabDecision() {
    const models = [
      {
        model: 'Revenue Share (tramos)',
        revTotal: calc.scenarios.realistic.revTotal,
        marginAdflow: calc.scenarios.realistic.revAdflow,
        risk: 'Bajo',
        score: 9.2,
        rec: 'Optimo para lanzamiento. Bajo riesgo, alto upside.',
      },
      {
        model: 'CPA por registro',
        revTotal: calc.registrations * inputs.cpaCost,
        marginAdflow: calc.scenarios.realistic.revTotal - (calc.registrations * inputs.cpaCost),
        risk: 'Medio',
        score: 6.5,
        rec: 'Coste fijo predecible pero sin alineacion de incentivos.',
      },
      {
        model: 'CPA activado',
        revTotal: calc.activated * inputs.cpaCost * 2.5,
        marginAdflow: calc.scenarios.realistic.revTotal - (calc.activated * inputs.cpaCost * 2.5),
        risk: 'Bajo',
        score: 7.8,
        rec: 'Buena opcion si Getalink acepta pago diferido.',
      },
      {
        model: 'Hibrido',
        revTotal: (calc.registrations * inputs.cpaCost * 0.5) + calc.scenarios.realistic.revGetalink,
        marginAdflow: calc.scenarios.realistic.revAdflow - (calc.registrations * inputs.cpaCost * 0.5),
        risk: 'Medio',
        score: 7.5,
        rec: 'Compromiso entre certeza y escalabilidad.',
      },
    ]

    return (
      <Card title="Decision de Modelo Optimo" icon={CheckCircle} subtitle="Comparativa final para elegir el modelo de colaboracion">
        <DataTable
          columns={[
            { label: 'Modelo', key: 'model' },
            { label: 'Revenue Total', key: 'revTotal', align: 'right', render: v => fmtE(v) },
            { label: 'Margen Adflow', key: 'marginAdflow', align: 'right', render: v => (
              <span style={{ color: v > 0 ? OK : ERR, fontWeight: 700 }}>{fmtE(v)}</span>
            )},
            { label: 'Riesgo', key: 'risk', render: v => (
              <Badge color={v === 'Bajo' ? OK : v === 'Medio' ? WARN : ERR}>{v}</Badge>
            )},
            { label: 'Score', key: 'score', align: 'center', render: v => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Star size={12} color={WARN} fill={WARN} />
                <span style={{ fontWeight: 700, color: v >= 8 ? OK : v >= 6 ? WARN : ERR }}>{v}</span>
              </div>
            )},
            { label: 'Recomendacion', key: 'rec', render: v => (
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{v}</span>
            )},
          ]}
          rows={models}
          highlight={0}
        />

        <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: `linear-gradient(135deg, ${AG(0.08)}, ${OK}08)`, border: `1px solid ${AG(0.2)}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Award size={18} color={A} />
            <span style={{ fontFamily: D, fontWeight: 700, fontSize: 14, color: A }}>Recomendacion Final</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.6, margin: 0 }}>
            <strong>Revenue Share con tramos progresivos</strong> es el modelo optimo para la colaboracion con Getalink.
            Arrancando al 10% para los primeros {inputs.tier1Max} usuarios y escalando hasta {fmtP(inputs.tier4Pct)} para 100+ usuarios.
            Este modelo alinea incentivos (Getalink gana mas cuantos mas usuarios activos traiga), minimiza el riesgo
            para Adflow (solo pagas sobre revenue real), y permite alcanzar el break-even con <strong>{calc.breakEvenUsers} usuarios activados</strong>.
          </p>
        </div>
      </Card>
    )
  }


  // ═══════════════════════════════════════════════════════════════════════════
  //  TAB 8: OBJETIVOS OPERATIVOS
  // ═══════════════════════════════════════════════════════════════════════════
  function TabObjectives() {
    const weeks = 4
    const weeklyActivated = Math.ceil(calc.breakEvenUsers / weeks)
    const weeklyRegistrations = Math.ceil(weeklyActivated / inputs.funnelActivationRate)
    const weeklyCampaigns = Math.ceil(calc.campaignsNeeded / weeks)

    const objectives = [
      { label: 'Usuarios para break-even', value: calc.breakEvenUsers, icon: Users, color: A, current: 0 },
      { label: 'Campanas necesarias/mes', value: Math.ceil(calc.campaignsNeeded), icon: Megaphone, color: BLUE, current: 0 },
      { label: 'GMV necesario', value: calc.breakEvenGMV, icon: DollarSign, color: OK, format: 'eur', current: 0 },
      { label: 'Canales necesarios', value: calc.channelsNeeded, icon: Globe, color: CYAN, current: 0 },
    ]

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Main KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {objectives.map((o, i) => (
            <div key={i} style={{
              padding: 20, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--card)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${o.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <o.icon size={16} color={o.color} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{o.label}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: D, color: o.color }}>
                {o.format === 'eur' ? fmtE(o.value) : fmt(o.value)}
              </div>
              <Progress value={o.current} max={o.value} color={o.color} height={6} />
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{o.current} / {o.format === 'eur' ? fmtE(o.value) : o.value}</div>
            </div>
          ))}
        </div>

        {/* Weekly targets */}
        <Card title="Objetivos Semanales (4 semanas)" icon={Target}>
          <DataTable
            columns={[
              { label: 'Semana', key: 'week' },
              { label: 'Registros', key: 'registrations', align: 'right', render: v => fmt(v) },
              { label: 'Activados', key: 'activated', align: 'right', render: v => fmt(v) },
              { label: 'Campanas', key: 'campaigns', align: 'right', render: v => fmt(v) },
              { label: 'GMV acum.', key: 'gmvCum', align: 'right', render: v => fmtE(v) },
              { label: 'Revenue acum.', key: 'revCum', align: 'right', render: v => fmtE(v) },
              { label: 'vs Break-even', key: 'vsBE', align: 'center', render: v => (
                <Badge color={v >= 100 ? OK : v >= 75 ? WARN : ERR}>{v.toFixed(0)}%</Badge>
              )},
            ]}
            rows={Array.from({ length: weeks }, (_, i) => {
              const w = i + 1
              const cumActivated = weeklyActivated * w
              const cumCampaigns = weeklyCampaigns * w
              const gmvCum = cumActivated * calc.gmvPerUser
              const revCum = cumActivated * calc.netMarginPerUser
              return {
                week: `Semana ${w}`,
                registrations: weeklyRegistrations,
                activated: weeklyActivated,
                campaigns: weeklyCampaigns,
                gmvCum, revCum,
                vsBE: (revCum / inputs.monthlyFixedCosts) * 100,
              }
            })}
          />
        </Card>

        {/* Pre-registro campaign */}
        <Card title="Campana de Pre-registro" icon={Zap}>
          <div style={{ padding: 16, borderRadius: 10, background: `linear-gradient(135deg, ${AG(0.06)}, ${BLUE}08)`, border: `1px dashed ${AG(0.3)}` }}>
            <h4 style={{ fontFamily: D, fontSize: 14, fontWeight: 700, color: A, marginBottom: 12 }}>Estrategia de Pre-registro</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>MARCAS (Anunciantes)</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, lineHeight: 1.8 }}>
                  <li>Target: {fmt(calc.getalinkActive)} anunciantes activos en Getalink</li>
                  <li>Objetivo registro: {fmt(calc.registrations)} ({pct(calc.registrations, calc.getalinkActive)}% del total activo)</li>
                  <li>Incentivo: 1a campana con 0% comision</li>
                  <li>Acceso anticipado a marketplace de canales</li>
                </ul>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>CANALES (Creadores)</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, lineHeight: 1.8 }}>
                  <li>Target: {fmt(calc.channelsNeeded)} canales necesarios</li>
                  <li>Reclutamiento via Getalink ({fmt(inputs.getalinkMediaCount)} medios)</li>
                  <li>Incentivo: setup gratuito + visibilidad prioritaria</li>
                  <li>Onboarding guiado 1:1 para primeros 50 canales</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Break-even alert */}
          {calc.breakEvenUsers === Infinity ? (
            <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: `${ERR}10`, border: `1px solid ${ERR}30`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} color={ERR} />
              <span style={{ fontSize: 12, color: ERR, fontWeight: 600 }}>
                No se puede alcanzar break-even con los parametros actuales. Revisa costes fijos o rev share.
              </span>
            </div>
          ) : (
            <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: `${OK}10`, border: `1px solid ${OK}30`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={16} color={OK} />
              <span style={{ fontSize: 12, color: OK, fontWeight: 600 }}>
                Break-even alcanzable con {calc.breakEvenUsers} usuarios activados ({fmtE(calc.breakEvenGMV)} GMV).
                Necesitas pre-registrar ~{fmt(Math.ceil(calc.breakEvenUsers / inputs.funnelActivationRate))} usuarios para garantizarlo.
              </span>
            </div>
          )}
        </Card>
      </div>
    )
  }


  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  const renderTab = () => {
    switch (tab) {
      case 'models':      return <TabModels />
      case 'funnel':      return <TabFunnel />
      case 'unit':        return <TabUnitEconomics />
      case 'tiers':       return <TabTiers />
      case 'projections': return <TabProjections />
      case 'cac':         return <TabCAC />
      case 'decision':    return <TabDecision />
      case 'objectives':  return <TabObjectives />
      default:            return null
    }
  }

  return (
    <div style={{ fontFamily: F, color: 'var(--foreground)', maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Handshake size={24} color={A} />
          <h1 style={{ fontFamily: D, fontSize: 22, fontWeight: 800, margin: 0 }}>
            Partnership Dashboard — Getalink
          </h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
          Control de comisiones, proyecciones y estrategia de colaboracion
        </p>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <KPI label="Break-even" value={`${calc.breakEvenUsers} users`} icon={Target} color={calc.breakEvenUsers <= 50 ? OK : calc.breakEvenUsers <= 100 ? WARN : ERR}
          sub={fmtE(calc.breakEvenGMV) + ' GMV necesario'} />
        <KPI label="Margen/usuario" value={fmtE(calc.netMarginPerUser)} icon={DollarSign} color={calc.netMarginPerUser > 10 ? OK : WARN}
          sub={`${pct(calc.netMarginPerUser, calc.revenuePerUser)}% del revenue`} trend={calc.netMarginPerUser > 10 ? 'up' : 'down'} />
        <KPI label="Funnel estimado" value={`${calc.activated} act.`} icon={Users} color={BLUE}
          sub={`De ${fmt(inputs.funnelImpacted)} impactados`} />
        <KPI label="LTV:CAC" value={`${calc.ltvToCAC.toFixed(1)}x`} icon={TrendingUp}
          color={calc.ltvToCAC > 3 ? OK : WARN} sub={calc.ltvToCAC > 3 ? 'Saludable' : 'Ajustar'} trend={calc.ltvToCAC > 3 ? 'up' : 'down'} />
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20, overflowX: 'auto', paddingBottom: 2,
        borderBottom: '1px solid var(--border)',
      }}>
        {TABS.map(t => {
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 14px', borderRadius: '8px 8px 0 0',
              background: active ? AG(0.08) : 'transparent',
              border: 'none', borderBottom: active ? `2px solid ${A}` : '2px solid transparent',
              cursor: 'pointer', fontFamily: F, fontSize: 12, fontWeight: active ? 700 : 500,
              color: active ? A : 'var(--muted)',
              transition: 'all .15s', whiteSpace: 'nowrap',
            }}>
              <t.icon size={14} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {renderTab()}

      {/* Getalink data footer */}
      <div style={{
        marginTop: 32, padding: 16, borderRadius: 12, background: 'var(--background)',
        border: '1px solid var(--border)', fontSize: 11, color: 'var(--muted)',
      }}>
        <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--foreground)' }}>Datos de Getalink (fuente: getalink.com)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
          <span>+{fmt(inputs.getalinkMediaCount)} medios registrados (120+ paises)</span>
          <span>+{fmt(inputs.getalinkAdvertiserCount)} anunciantes ({fmt(calc.getalinkActive)} activos)</span>
          <span>Ticket medio: {fmtE(inputs.getalinkTicketMin)} – {fmtE(inputs.getalinkTicketMax)}</span>
          <span>Programa afiliados: {fmtP(inputs.getalinkAffiliateRate)} comision</span>
          <span>Pagos cada 15 dias, sin minimo de retiro</span>
          <span>Modelo: compra manual de placements (posts patrocinados)</span>
        </div>
      </div>
    </div>
  )
}
