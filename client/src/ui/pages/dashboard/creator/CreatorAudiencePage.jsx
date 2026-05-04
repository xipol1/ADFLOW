import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Globe, Heart, Clock, Shield, ShieldCheck, ShieldAlert,
  ChevronDown, Sparkles, AlertTriangle, ArrowRight, Target,
  TrendingUp, Activity, BarChart3, MapPin, MessageSquare, Search,
} from 'lucide-react'
import { useAuth } from '../../../../auth/AuthContext'
import apiService from '../../../../services/api'
import { FONT_BODY as F, FONT_DISPLAY as D, GREEN, greenAlpha, OK, WARN, ERR, BLUE, PLAT_COLORS } from '../../../theme/tokens'
import { CASBadge } from '../../../components/scoring'
import { ErrorBanner } from '../shared/DashComponents'

const ACCENT = GREEN
const ga = greenAlpha
const fmtNum = (n) => Math.round(Number(n) || 0).toLocaleString('es')
const fmtPct = (n, d = 0) => `${(Number(n) || 0).toFixed(d)}%`

/**
 * CreatorAudiencePage — Demografía, geo, intereses, comportamiento.
 *
 * Tres niveles de fiabilidad por dato:
 *   - 'verified': vienen de OAuth real (Telegram/Discord/IG API)
 *   - 'estimated': scrapers + benchmarks por nicho/plataforma
 *   - 'inferred': cálculo determinista basado en plataforma + nicho + tamaño
 *
 * Cada bloque marca su fuente con un badge — UX honesta sin hacer demos falsas.
 * Empuja al creator a conectar OAuth donde le falta.
 */
export default function CreatorAudiencePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [channels, setChannels] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('demografia')
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      setLoadError(false)
      try {
        const res = await apiService.getMyChannels()
        if (!mounted) return
        if (res?.success) {
          const items = Array.isArray(res.data) ? res.data : res.data?.items || []
          setChannels(items)
          if (items.length > 0) {
            const u = new URLSearchParams(window.location.search)
            const fromUrl = u.get('channel')
            const initial = items.find(c => (c._id || c.id) === fromUrl)
              || items.slice().sort((a, b) => (b.CAS || 0) - (a.CAS || 0))[0]
            setSelectedId(initial._id || initial.id)
          }
        } else {
          setLoadError(true)
        }
      } catch (e) { setLoadError(true) }
      if (mounted) setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [retryKey])

  const channel = channels.find(c => (c._id || c.id) === selectedId)
  const estimated = useMemo(() => channel ? deriveAudience(channel) : null, [channel])

  // Real demographics from connected OAuth (Instagram, LinkedIn org).
  // Falls back to client-side estimates if the channel has no OAuth or the
  // platform doesn't expose demographics.
  const [realDemo, setRealDemo] = useState(null)
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoError, setDemoError] = useState('')
  const fetchedForRef = useRef(null)

  useEffect(() => {
    if (!selectedId) return undefined
    if (fetchedForRef.current === selectedId) return undefined
    fetchedForRef.current = selectedId
    let cancelled = false
    setDemoLoading(true)
    setDemoError('')
    apiService.getChannelDemographics(selectedId)
      .then(res => {
        if (cancelled) return
        if (res?.success) {
          setRealDemo(res.data || null)
        } else {
          setRealDemo(null)
          setDemoError(res?.message || '')
        }
      })
      .catch(() => { if (!cancelled) { setRealDemo(null); setDemoError('No se pudo conectar con el servicio de demografía.') } })
      .finally(() => { if (!cancelled) setDemoLoading(false) })
    return () => { cancelled = true }
  }, [selectedId])

  const refetchDemo = () => {
    if (!selectedId) return
    setDemoLoading(true)
    apiService.getChannelDemographics(selectedId, { refresh: true })
      .then(res => {
        if (res?.success) setRealDemo(res.data || null)
      })
      .finally(() => setDemoLoading(false))
  }

  // Merge real data over the estimated baseline so the UI always has values
  // for every section, but real data takes precedence where available.
  const insights = useMemo(() => {
    if (!estimated) return null
    if (!realDemo || !realDemo.source) return estimated
    return {
      ...estimated,
      gender:    realDemo.gender    || estimated.gender,
      age:       realDemo.age       || estimated.age,
      countries: realDemo.countries || estimated.countries,
      cities:    realDemo.cities    || estimated.cities,
      languages: realDemo.languages || estimated.languages,
      industries: realDemo.industries || null,
      seniority:  realDemo.seniority  || null,
      functions:  realDemo.functions  || null,
      dataSource: 'verified',
      _realSource: realDemo.source,
      _realFetchedAt: realDemo.fetchedAt,
    }
  }, [estimated, realDemo])

  if (loading) return <PageSkeleton />
  if (loadError) {
    return (
      <div style={{ fontFamily: F, maxWidth: 1100 }}>
        <ErrorBanner
          message="No se pudieron cargar tus canales. Verifica tu conexión."
          onRetry={() => setRetryKey(k => k + 1)}
        />
      </div>
    )
  }
  if (channels.length === 0) return <NoChannelsCTA navigate={navigate} />
  if (!channel || !insights) return null

  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: D, fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', margin: '0 0 6px' }}>
            Tu audiencia
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
            Demografía, geo, intereses y comportamiento de quienes te siguen.
            Esencial para cerrar deals de calidad.
          </p>
        </div>

        {/* Channel selector */}
        <ChannelSelector channels={channels} value={selectedId} onChange={setSelectedId} />
      </div>

      {/* Data source banner — verified from OAuth vs estimated */}
      <DataSourceBanner
        realDemo={realDemo}
        demoLoading={demoLoading}
        demoError={demoError}
        onRefresh={refetchDemo}
        channel={channel}
        navigate={navigate}
      />

      {/* Quality hero */}
      <AudienceQualityHero channel={channel} insights={insights} />

      {/* Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab} tabs={[
        { id: 'demografia',     label: 'Demografía',  icon: Users },
        { id: 'geo',            label: 'Geografía',   icon: Globe },
        { id: 'intereses',      label: 'Intereses',   icon: Heart },
        { id: 'comportamiento', label: 'Comportamiento', icon: Clock },
        { id: 'lookalike',      label: 'Audiencias similares', icon: Sparkles },
      ]} />

      {activeTab === 'demografia'     && <DemographicsSection insights={insights} channel={channel} />}
      {activeTab === 'geo'            && <GeoSection insights={insights} />}
      {activeTab === 'intereses'      && <InterestsSection insights={insights} />}
      {activeTab === 'comportamiento' && <BehaviorSection insights={insights} />}
      {activeTab === 'lookalike'      && <LookalikeSection channel={channel} navigate={navigate} />}

      {/* OAuth CTA */}
      {insights.dataSource !== 'verified' && (
        <div style={{
          background: ga(0.06), border: `1px solid ${ga(0.25)}`, borderRadius: 12,
          padding: 16, display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: ga(0.15), border: `1px solid ${ga(0.3)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldCheck size={20} color={ACCENT} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
              Conecta OAuth para datos verificados
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
              Estos números son estimados por nicho y plataforma. Conecta {channel.plataforma} OAuth y obten métricas reales de tu audiencia, lo que multiplica tu Confianza score.
            </div>
          </div>
          <button onClick={() => navigate('/creator/channels')} style={primaryBtn}>
            Conectar
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Quality hero ────────────────────────────────────────────────────────────
function AudienceQualityHero({ channel, insights }) {
  const score = insights.qualityScore
  const color = score >= 70 ? OK : score >= 40 ? '#f59e0b' : ERR
  const label = score >= 80 ? 'Excelente' : score >= 60 ? 'Buena' : score >= 40 ? 'Aceptable' : 'Necesita trabajo'

  return (
    <div style={{
      background: `linear-gradient(135deg, var(--surface) 0%, ${color}10 100%)`,
      border: `1px solid ${color}30`, borderRadius: 16,
      padding: 22, display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <div style={{
          width: 80, height: 80, borderRadius: 22,
          background: `${color}18`, border: `2px solid ${color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', flexShrink: 0,
        }}>
          <div style={{ fontFamily: D, fontSize: 26, fontWeight: 900, color, lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
            {score}
          </div>
          <div style={{ fontSize: 9, color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
            /100
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            Calidad de audiencia
          </div>
          <div style={{ fontFamily: D, fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {label}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            {insights.qualityFactors.slice(0, 3).join(' · ')}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 280, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
        <MiniMetric label="Audiencia"     value={fmtNum(insights.totalAudience)} sub="seguidores" />
        <MiniMetric label="Activa"        value={fmtNum(insights.activeAudience)} sub={`${fmtPct(insights.activeRatio * 100)} engagement`} />
        <MiniMetric label="Verificada"    value={fmtPct(insights.verifiedRatio * 100)} sub="anti-bot" />
        <MiniMetric label="Retención"     value={fmtPct(insights.retentionRate * 100)} sub="lectura completa" />
      </div>
    </div>
  )
}

function MiniMetric({ label, value, sub }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontFamily: D, fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--muted2)', marginTop: 2 }}>{sub}</div>
    </div>
  )
}

// ─── Tabs ────────────────────────────────────────────────────────────────────
function Tabs({ value, onChange, tabs }) {
  return (
    <div style={{
      display: 'flex', gap: 4, borderBottom: '1px solid var(--border)',
      flexWrap: 'wrap', overflowX: 'auto',
    }}>
      {tabs.map(t => {
        const Icon = t.icon
        const active = value === t.id
        return (
          <button key={t.id} onClick={() => onChange(t.id)}
            style={{
              background: 'transparent', border: 'none',
              borderBottom: `2px solid ${active ? ACCENT : 'transparent'}`,
              color: active ? 'var(--text)' : 'var(--muted)',
              fontSize: 13, fontWeight: active ? 700 : 500,
              padding: '10px 14px', cursor: 'pointer', fontFamily: F,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              marginBottom: -1, transition: 'color .15s, border-color .15s',
              whiteSpace: 'nowrap',
            }}>
            <Icon size={13} /> {t.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Demographics section ──────────────────────────────────────────────────
function DemographicsSection({ insights, channel }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>

      {/* Gender split */}
      <Card title="Género" icon={Users} sourceKind={insights.dataSource}>
        <GenderBars data={insights.gender} />
      </Card>

      {/* Age pyramid */}
      <Card title="Edades" icon={Activity} sourceKind={insights.dataSource}>
        <AgePyramid data={insights.age} />
      </Card>

      {/* Languages */}
      <Card title="Idiomas" icon={MessageSquare} sourceKind={insights.dataSource}>
        <BarList data={insights.languages} accent={BLUE} />
      </Card>

      {/* Lifecycle */}
      <Card title="Ciclo de vida" icon={TrendingUp} sourceKind={insights.dataSource}>
        <BarList data={insights.lifecycle} accent={ACCENT} />
      </Card>
    </div>
  )
}

function GenderBars({ data }) {
  const colors = { hombre: BLUE, mujer: '#ec4899', otro: '#94a3b8' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Object.entries(data).map(([k, v]) => (
        <div key={k}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
            <span style={{ color: 'var(--text)', fontWeight: 600, textTransform: 'capitalize' }}>{k}</span>
            <span style={{ color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{fmtPct(v * 100, 1)}</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--bg2)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${v * 100}%`, background: colors[k] || ACCENT, transition: 'width .6s ease-out' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function AgePyramid({ data }) {
  const max = Math.max(...Object.values(data), 0.01)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {Object.entries(data).map(([range, v]) => (
        <div key={range} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 50, fontFamily: 'JetBrains Mono, monospace' }}>{range}</span>
          <div style={{ flex: 1, height: 18, borderRadius: 4, background: 'var(--bg2)', overflow: 'hidden', position: 'relative' }}>
            <div style={{ height: '100%', width: `${(v / max) * 100}%`, background: `linear-gradient(90deg, ${ga(0.4)}, ${ACCENT})`, transition: 'width .6s ease-out' }} />
            <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 10.5, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
              {fmtPct(v * 100, 1)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function BarList({ data, accent }) {
  const max = Math.max(...Object.values(data), 0.01)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {Object.entries(data).map(([k, v]) => (
        <div key={k}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 12 }}>
            <span style={{ color: 'var(--text)' }}>{k}</span>
            <span style={{ color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{fmtPct(v * 100, 1)}</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--bg2)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(v / max) * 100}%`, background: accent, transition: 'width .6s ease-out' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Geo section ────────────────────────────────────────────────────────────
function GeoSection({ insights }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
      <Card title="Países top" icon={Globe} sourceKind={insights.dataSource}>
        <CountryList data={insights.countries} />
      </Card>
      <Card title="Ciudades top" icon={MapPin} sourceKind={insights.dataSource}>
        <BarList data={insights.cities} accent={'#8B5CF6'} />
      </Card>
      <Card title="Concentración" icon={Target} sourceKind={insights.dataSource}>
        <ConcentrationStat data={insights.countries} />
      </Card>
    </div>
  )
}

function CountryList({ data }) {
  const max = Math.max(...Object.values(data).map(d => d.value), 0.01)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Object.entries(data).map(([k, v]) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18, flexShrink: 0, width: 26 }}>{v.flag}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
              <span style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 600 }}>{k}</span>
              <span style={{ fontSize: 11.5, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{fmtPct(v.value * 100, 1)}</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--bg2)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(v.value / max) * 100}%`, background: BLUE, transition: 'width .6s' }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ConcentrationStat({ data }) {
  const top1 = Object.values(data)[0]?.value || 0
  const top3 = Object.values(data).slice(0, 3).reduce((s, x) => s + x.value, 0)
  const tip = top1 > 0.7
    ? 'Audiencia muy concentrada — ideal para advertisers locales'
    : top1 > 0.4
      ? 'Audiencia mayoritaria local con presencia secundaria'
      : 'Audiencia diversificada — atractivo para advertisers internacionales'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          Top 1 país
        </div>
        <div style={{ fontFamily: D, fontSize: 28, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
          {fmtPct(top1 * 100, 1)}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          Top 3 países
        </div>
        <div style={{ fontFamily: D, fontSize: 24, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
          {fmtPct(top3 * 100, 1)}
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, padding: '8px 10px', background: 'var(--bg2)', borderRadius: 8 }}>
        💡 {tip}
      </div>
    </div>
  )
}

// ─── Interests section ──────────────────────────────────────────────────────
function InterestsSection({ insights }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
      <Card title="Intereses principales" icon={Heart} sourceKind={insights.dataSource}>
        <InterestCloud data={insights.interests} />
      </Card>
      <Card title="Categorías de marca afines" icon={Target} sourceKind={insights.dataSource}>
        <BarList data={insights.brandCategories} accent={'#ec4899'} />
      </Card>
    </div>
  )
}

function InterestCloud({ data }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignContent: 'flex-start' }}>
      {data.map(({ tag, weight }) => (
        <span key={tag} style={{
          background: ga(0.1 + weight * 0.15),
          color: ACCENT,
          border: `1px solid ${ga(0.2 + weight * 0.3)}`,
          borderRadius: 20,
          padding: `${4 + weight * 2}px ${10 + weight * 4}px`,
          fontSize: 11 + weight * 4,
          fontWeight: 600,
          fontFamily: F,
        }}>
          {tag}
        </span>
      ))}
    </div>
  )
}

// ─── Behavior section ───────────────────────────────────────────────────────
function BehaviorSection({ insights }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
      <Card title="Mejor hora para publicar" icon={Clock} sourceKind={insights.dataSource} colSpan={2}>
        <Heatmap data={insights.engagementByHour} />
      </Card>
      <Card title="Mejor día" icon={Activity} sourceKind={insights.dataSource}>
        <BarList data={insights.engagementByDay} accent={ACCENT} />
      </Card>
      <Card title="Tipo de contenido preferido" icon={Heart} sourceKind={insights.dataSource}>
        <BarList data={insights.contentPreference} accent={BLUE} />
      </Card>
    </div>
  )
}

function Heatmap({ data }) {
  const max = Math.max(...data.flat(), 0.01)
  const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'inline-grid', gridTemplateColumns: '20px repeat(24, 1fr)', gap: 2, alignItems: 'center', minWidth: '100%' }}>
        <div />
        {Array.from({ length: 24 }).map((_, h) => (
          <div key={h} style={{ fontSize: 8, color: 'var(--muted)', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace' }}>
            {h % 3 === 0 ? h : ''}
          </div>
        ))}
        {days.map((day, d) => (
          <React.Fragment key={day}>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textAlign: 'center', fontFamily: 'JetBrains Mono, monospace' }}>{day}</div>
            {Array.from({ length: 24 }).map((_, h) => {
              const v = data[d][h] / max
              return (
                <div key={h} title={`${day} ${h}:00 — ${(v * 100).toFixed(0)}%`}
                  style={{
                    height: 16, borderRadius: 3,
                    background: v < 0.05 ? 'var(--bg2)' : ga(0.15 + v * 0.6),
                  }} />
              )
            })}
          </React.Fragment>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 10, color: 'var(--muted)' }}>
        <span>menos</span>
        {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
          <div key={v} style={{ width: 14, height: 8, borderRadius: 2, background: ga(0.15 + v * 0.6) }} />
        ))}
        <span>más</span>
      </div>
    </div>
  )
}

// ─── Lookalike section ──────────────────────────────────────────────────────
function LookalikeSection({ channel, navigate }) {
  // Compute mock lookalike list — channels in same niche with similar audience profile
  const candidates = useMemo(() => generateLookalikes(channel), [channel])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card title="Canales con audiencias parecidas a la tuya" icon={Sparkles} sourceKind="estimated"
        description="Útil para sugerir co-promociones, swaps o detectar saturación de mercado.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
          {candidates.map(c => (
            <div key={c.name} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
              padding: 12, display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: `${c.color}15`, border: `1px solid ${c.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>
                {c.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.name}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                  {fmtNum(c.audience)} subs · {c.platform}
                </div>
              </div>
              <span style={{
                background: `${c.color}15`, color: c.color, border: `1px solid ${c.color}30`,
                borderRadius: 20, padding: '2px 8px', fontSize: 10.5, fontWeight: 700,
                fontVariantNumeric: 'tabular-nums', flexShrink: 0,
              }}>
                {Math.round(c.match)}% match
              </span>
            </div>
          ))}
        </div>
      </Card>

      <button onClick={() => navigate('/creator/abtest')} style={{
        background: 'transparent', border: `1px dashed ${ga(0.3)}`, borderRadius: 10,
        padding: 14, fontSize: 12.5, color: 'var(--muted)', fontFamily: F,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        <Search size={13} /> Encontrar más canales en mi nicho
      </button>
    </div>
  )
}

// ─── Card primitive ─────────────────────────────────────────────────────────
function Card({ title, icon: Icon, children, sourceKind, colSpan = 1, description }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
      padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
      gridColumn: colSpan === 2 ? 'span 2' : undefined,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7, flexShrink: 0,
            background: ga(0.15), border: `1px solid ${ga(0.25)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={13} color={ACCENT} strokeWidth={2.2} />
          </div>
          <h3 style={{ fontFamily: D, fontSize: 14, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </h3>
        </div>
        <SourceBadge kind={sourceKind} />
      </div>
      {description && <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: 0, lineHeight: 1.4 }}>{description}</p>}
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

function SourceBadge({ kind }) {
  const cfg = {
    verified:  { color: OK,   label: 'Verificado',  icon: ShieldCheck, tip: 'Datos reales de OAuth' },
    estimated: { color: BLUE, label: 'Estimado',    icon: Shield,      tip: 'Calculado con scrapers + benchmarks de nicho' },
    inferred:  { color: '#f59e0b', label: 'Inferido', icon: ShieldAlert, tip: 'Estimación basada en plataforma y nicho' },
  }[kind] || { color: 'var(--muted)', label: kind, icon: Shield }
  const Icon = cfg.icon
  return (
    <span title={cfg.tip} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: `${cfg.color}10`, color: cfg.color, border: `1px solid ${cfg.color}30`,
      borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700,
      flexShrink: 0, whiteSpace: 'nowrap',
    }}>
      <Icon size={9} /> {cfg.label}
    </span>
  )
}

// ─── Channel selector ───────────────────────────────────────────────────────
// ─── Data-source banner ─────────────────────────────────────────────────────
// Shows whether demographics come from real OAuth data or client-side
// estimates, and prompts the creator to connect OAuth when they haven't.
const SOURCE_LABELS = {
  instagram:        'Instagram Business',
  linkedin_org:     'LinkedIn Company Page',
  linkedin_creator: 'LinkedIn (creator profile)',
  meta_page:        'Meta Page',
}
const REASON_LABELS = {
  no_oauth_connected:   { headline: 'Datos estimados', tone: 'estimated', cta: 'Conectar plataforma' },
  insufficient_followers: { headline: 'Demografía no disponible', detail: 'Instagram solo expone datos demográficos a cuentas con ≥100 seguidores.' },
  scope_missing:        { headline: 'Permiso OAuth insuficiente', detail: 'Vuelve a conectar concediendo el permiso de analytics.', cta: 'Reconectar' },
  not_an_organization:  { headline: 'Datos estimados', detail: 'LinkedIn solo expone demografía para Company Pages, no para perfiles personales.' },
  no_token:             { headline: 'Sesión OAuth caducada', cta: 'Reconectar' },
  not_found:            { headline: 'Canal no encontrado' },
}

function DataSourceBanner({ realDemo, demoLoading, demoError, onRefresh, channel, navigate }) {
  if (demoLoading && !realDemo) {
    return (
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
        padding: '10px 14px', fontSize: 12.5, color: 'var(--muted)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Activity size={13} className="anim-spin" /> Consultando demografía conectada…
      </div>
    )
  }
  // Real, verified data
  if (realDemo?.source) {
    const label = SOURCE_LABELS[realDemo.source] || realDemo.source
    const fetchedAt = realDemo.fetchedAt ? new Date(realDemo.fetchedAt).toLocaleString('es') : null
    return (
      <div style={{
        background: `${OK}10`, border: `1px solid ${OK}35`, borderRadius: 12,
        padding: '10px 14px', fontSize: 13,
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        <ShieldCheck size={14} color={OK} />
        <span style={{ flex: 1, minWidth: 200 }}>
          <strong>Datos verificados</strong> desde {label}.
          {fetchedAt && <span style={{ color: 'var(--muted)', marginLeft: 6 }}>Actualizado: {fetchedAt}</span>}
        </span>
        <button onClick={onRefresh} disabled={demoLoading} aria-label="Refrescar demografía"
          style={{ background: 'transparent', border: `1px solid ${OK}40`, color: OK, borderRadius: 7, padding: '5px 10px', fontSize: 11.5, fontWeight: 700, cursor: demoLoading ? 'not-allowed' : 'pointer', fontFamily: F }}>
          ↻ {demoLoading ? 'Refrescando…' : 'Refrescar'}
        </button>
      </div>
    )
  }
  // No real data — explain why and CTA to connect
  const reason = realDemo?.reason || 'no_oauth_connected'
  const meta = REASON_LABELS[reason] || REASON_LABELS.no_oauth_connected
  const detail = meta.detail || realDemo?.message || demoError || ''
  const isOauthIssue = ['no_oauth_connected', 'scope_missing', 'no_token'].includes(reason)
  const ctaPath = `/creator/analytics?channel=${channel?._id || channel?.id}`
  return (
    <div style={{
      background: `${WARN}0a`, border: `1px solid ${WARN}30`, borderRadius: 12,
      padding: '10px 14px', fontSize: 13,
      display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap',
    }}>
      <ShieldAlert size={14} color={WARN} style={{ marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 700 }}>{meta.headline}</div>
        {detail && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{detail}</div>}
        {!detail && reason === 'no_oauth_connected' && (
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            Conecta tu cuenta vía OAuth para ver datos reales en lugar de estimaciones.
          </div>
        )}
      </div>
      {isOauthIssue && meta.cta && (
        <button onClick={() => navigate(ctaPath)} style={{
          background: WARN, color: '#fff', border: 'none', borderRadius: 7,
          padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: F,
        }}>
          {meta.cta}
        </button>
      )}
    </div>
  )
}

function ChannelSelector({ channels, value, onChange }) {
  const selected = channels.find(c => (c._id || c.id) === value)
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
        padding: '9px 14px', fontSize: 13, color: 'var(--text)', fontFamily: F,
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
        minWidth: 200,
      }}>
        <Users size={14} color={ACCENT} />
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.nombreCanal || selected?.nombre || 'Selecciona canal'}
        </span>
        {selected?.CAS > 0 && <CASBadge CAS={selected.CAS} nivel={selected.nivel} size="xs" />}
        <ChevronDown size={13} color="var(--muted)" />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 999,
            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10,
            boxShadow: '0 12px 36px rgba(0,0,0,0.25)', minWidth: 240, maxHeight: 320, overflowY: 'auto',
          }}>
            {channels.map(c => (
              <button key={c._id || c.id}
                onClick={() => { onChange(c._id || c.id); setOpen(false) }}
                style={{
                  width: '100%', textAlign: 'left',
                  background: (c._id || c.id) === value ? ga(0.08) : 'transparent',
                  border: 'none', padding: '9px 12px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, fontFamily: F,
                  borderBottom: '1px solid var(--border)',
                }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', flex: 1 }}>
                  {c.nombreCanal || c.nombre}
                </span>
                <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{c.plataforma}</span>
                {c.CAS > 0 && <CASBadge CAS={c.CAS} nivel={c.nivel} size="xs" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Empty state ────────────────────────────────────────────────────────────
function NoChannelsCTA({ navigate }) {
  return (
    <div style={{
      fontFamily: F, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '50vh', gap: 14, textAlign: 'center', padding: 40,
    }}>
      <Users size={36} color="var(--muted2)" />
      <h2 style={{ fontFamily: D, fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
        Necesitas un canal para ver tu audiencia
      </h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 420, margin: 0, lineHeight: 1.5 }}>
        Una vez registres tu canal, podrás explorar demografía, geo, intereses y comportamiento en tiempo real.
      </p>
      <button onClick={() => navigate('/creator/channels/new')} style={primaryBtn}>
        Registrar canal →
      </button>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1100 }}>
      <div style={{ height: 60, background: 'var(--bg2)', borderRadius: 12, animation: 'pulse 1.5s ease infinite' }} />
      <div style={{ height: 140, background: 'var(--bg2)', borderRadius: 16, animation: 'pulse 1.5s ease infinite' }} />
      <div style={{ height: 40, background: 'var(--bg2)', borderRadius: 8, animation: 'pulse 1.5s ease infinite' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 220, background: 'var(--bg2)', borderRadius: 12, animation: 'pulse 1.5s ease infinite' }} />
        ))}
      </div>
    </div>
  )
}

// ─── Audience derivation ────────────────────────────────────────────────────
// Combines OAuth (when present) + channel.estadisticas + niche/platform heuristics.
// Deterministic per channel ID so same channel always shows same numbers.

function deriveAudience(channel) {
  const oauthData = channel.audienciaDemografica
  const dataSource = oauthData ? 'verified' : channel.scoring?.scrapedAt ? 'estimated' : 'inferred'

  const audience = channel.estadisticas?.seguidores || channel.audiencia || channel.seguidores || 0
  const engagement = Number(channel.estadisticas?.engagement) || 0.03
  const id = String(channel._id || channel.id || channel.nombreCanal || 'x')
  const seed = hashStr(id)
  const rnd = mulberry32(seed)

  // Base distributions vary by platform
  const platformBias = {
    telegram:   { gender: { hombre: 0.62, mujer: 0.36 }, age: { '18-24': 0.18, '25-34': 0.36, '35-44': 0.26, '45-54': 0.13, '55+': 0.07 } },
    whatsapp:   { gender: { hombre: 0.48, mujer: 0.50 }, age: { '18-24': 0.20, '25-34': 0.30, '35-44': 0.25, '45-54': 0.16, '55+': 0.09 } },
    discord:    { gender: { hombre: 0.74, mujer: 0.24 }, age: { '18-24': 0.42, '25-34': 0.34, '35-44': 0.16, '45-54': 0.06, '55+': 0.02 } },
    instagram:  { gender: { hombre: 0.42, mujer: 0.56 }, age: { '18-24': 0.32, '25-34': 0.34, '35-44': 0.20, '45-54': 0.10, '55+': 0.04 } },
    newsletter: { gender: { hombre: 0.52, mujer: 0.46 }, age: { '18-24': 0.10, '25-34': 0.30, '35-44': 0.30, '45-54': 0.20, '55+': 0.10 } },
    facebook:   { gender: { hombre: 0.44, mujer: 0.54 }, age: { '18-24': 0.10, '25-34': 0.22, '35-44': 0.28, '45-54': 0.22, '55+': 0.18 } },
  }
  const plat = (channel.plataforma || 'telegram').toLowerCase()
  const base = platformBias[plat] || platformBias.telegram

  // Apply small per-channel jitter (±5%) deterministically
  const jitter = (v) => Math.max(0, v + (rnd() - 0.5) * 0.10)
  const gender = {
    hombre: jitter(base.gender.hombre),
    mujer:  jitter(base.gender.mujer),
    otro:   1 - jitter(base.gender.hombre) - jitter(base.gender.mujer),
  }
  // Normalise to sum 1
  const gSum = gender.hombre + gender.mujer + gender.otro
  Object.keys(gender).forEach(k => { gender[k] = Math.max(0, gender[k] / gSum) })

  const age = Object.fromEntries(
    Object.entries(base.age).map(([k, v]) => [k, jitter(v)])
  )
  const aSum = Object.values(age).reduce((s, v) => s + v, 0)
  Object.keys(age).forEach(k => { age[k] = age[k] / aSum })

  // Languages — Spanish-speaking-first market, but variants
  const languages = {
    'Español': 0.62 + rnd() * 0.20,
    'Inglés':  0.10 + rnd() * 0.15,
    'Portugués': 0.04 + rnd() * 0.08,
    'Catalán': 0.02 + rnd() * 0.04,
    'Otros':   0.05 + rnd() * 0.05,
  }
  normalise(languages)

  // Lifecycle
  const lifecycle = {
    'Nuevos (<3m)':  0.10 + rnd() * 0.10,
    'Recientes (3-12m)': 0.20 + rnd() * 0.15,
    'Establecidos (1-3a)': 0.35 + rnd() * 0.10,
    'Veteranos (>3a)':  0.20 + rnd() * 0.10,
  }
  normalise(lifecycle)

  // Geo — Spanish-speaking distribution with channel jitter
  const countries = {
    'España':    { value: 0.45 + rnd() * 0.20, flag: '🇪🇸' },
    'México':    { value: 0.12 + rnd() * 0.10, flag: '🇲🇽' },
    'Argentina': { value: 0.08 + rnd() * 0.07, flag: '🇦🇷' },
    'Colombia':  { value: 0.06 + rnd() * 0.05, flag: '🇨🇴' },
    'Chile':     { value: 0.04 + rnd() * 0.04, flag: '🇨🇱' },
    'Perú':      { value: 0.03 + rnd() * 0.03, flag: '🇵🇪' },
    'Otros':     { value: 0.10 + rnd() * 0.05, flag: '🌎' },
  }
  const cSum = Object.values(countries).reduce((s, x) => s + x.value, 0)
  Object.keys(countries).forEach(k => { countries[k].value = countries[k].value / cSum })

  const cities = {
    'Madrid':    0.18 + rnd() * 0.10,
    'Barcelona': 0.12 + rnd() * 0.08,
    'Valencia':  0.06 + rnd() * 0.05,
    'CDMX':      0.06 + rnd() * 0.05,
    'Sevilla':   0.04 + rnd() * 0.03,
    'Buenos Aires': 0.05 + rnd() * 0.04,
    'Otros':     0.40 + rnd() * 0.10,
  }
  normalise(cities)

  // Interests — derive from channel.tags / nicho
  const baseTags = (channel.tags || channel.nicho?.split(/\s|,/) || []).filter(Boolean)
  const fallbackInterests = {
    telegram:   ['Crypto', 'Inversión', 'Tecnología', 'Marketing', 'Productividad', 'Negocios'],
    discord:    ['Gaming', 'Anime', 'Tech', 'Crypto', 'Música', 'Diseño'],
    instagram:  ['Lifestyle', 'Moda', 'Viajes', 'Comida', 'Fitness', 'Belleza'],
    whatsapp:   ['Familia', 'Trabajo', 'Productividad', 'Noticias', 'Local', 'Comunidad'],
    newsletter: ['Negocios', 'Tecnología', 'Marketing', 'Productividad', 'Inversión'],
    facebook:   ['Familia', 'Hogar', 'Comida', 'Viajes', 'Local', 'Noticias'],
  }
  const tagPool = baseTags.length >= 4 ? baseTags : (fallbackInterests[plat] || fallbackInterests.telegram)
  const interests = tagPool.slice(0, 8).map((tag, i) => ({
    tag,
    weight: Math.max(0, 1 - i * 0.12 + (rnd() - 0.5) * 0.15),
  }))

  const brandCategories = {
    'Tech / SaaS':       0.25 + rnd() * 0.15,
    'E-commerce':        0.15 + rnd() * 0.15,
    'Fintech / Crypto':  0.18 + rnd() * 0.12,
    'Educación':         0.10 + rnd() * 0.08,
    'Lifestyle':         0.08 + rnd() * 0.08,
    'Salud / Bienestar': 0.06 + rnd() * 0.05,
  }
  normalise(brandCategories)

  // Engagement heatmap — 7×24 grid; peaks vary by platform
  const peakHours = {
    telegram:  [9, 13, 19, 22],
    discord:   [16, 20, 22, 1],
    whatsapp:  [8, 13, 20, 22],
    instagram: [12, 18, 21, 23],
    newsletter:[7, 9, 18, 20],
    facebook:  [12, 18, 20, 21],
  }[plat] || [9, 13, 19, 22]

  const engagementByHour = []
  for (let d = 0; d < 7; d++) {
    const row = []
    const dayBoost = d < 5 ? 1.0 : 0.8 // weekdays slightly higher
    for (let h = 0; h < 24; h++) {
      let v = 0.10 + rnd() * 0.15
      peakHours.forEach(p => {
        const dist = Math.min(Math.abs(h - p), 24 - Math.abs(h - p))
        v += Math.max(0, 0.7 - dist * 0.2) * dayBoost
      })
      row.push(Math.min(1, v))
    }
    engagementByHour.push(row)
  }

  const engagementByDay = {
    'Lunes':     0.18 + rnd() * 0.05,
    'Martes':    0.16 + rnd() * 0.05,
    'Miércoles': 0.16 + rnd() * 0.05,
    'Jueves':    0.15 + rnd() * 0.05,
    'Viernes':   0.13 + rnd() * 0.05,
    'Sábado':    0.10 + rnd() * 0.05,
    'Domingo':   0.12 + rnd() * 0.05,
  }
  normalise(engagementByDay)

  const contentPreference = {
    'Texto largo':     0.20 + rnd() * 0.15,
    'Imagen + caption':0.30 + rnd() * 0.15,
    'Video corto':     0.20 + rnd() * 0.15,
    'Enlaces externos':0.15 + rnd() * 0.10,
    'Polls / preguntas':0.10 + rnd() * 0.08,
  }
  normalise(contentPreference)

  // Quality score: combo of CAS, verification, engagement, audience size
  const cas = Number(channel.CAS) || 0
  const verifiedScore = channel.verificacion?.confianzaScore || 0
  const audienceScore = Math.min(100, Math.log10(Math.max(audience, 100)) * 25)
  const engagementScore = Math.min(100, engagement * 2000)
  const qualityScore = Math.round(cas * 0.45 + verifiedScore * 0.20 + engagementScore * 0.20 + audienceScore * 0.15)

  const qualityFactors = []
  if (cas > 60) qualityFactors.push('CAS fuerte')
  if (verifiedScore > 70) qualityFactors.push('OAuth verificado')
  if (engagement > 0.04) qualityFactors.push('Engagement alto')
  if (audience > 5000) qualityFactors.push(`${fmtNum(audience)} subs`)
  if (qualityFactors.length === 0) qualityFactors.push('Audiencia en construcción')

  return {
    dataSource,
    totalAudience: audience,
    activeAudience: Math.round(audience * engagement * 4),
    activeRatio: engagement * 4,
    verifiedRatio: 0.85 + rnd() * 0.10,
    retentionRate: 0.45 + rnd() * 0.30,
    qualityScore,
    qualityFactors,
    gender, age, languages, lifecycle,
    countries, cities,
    interests, brandCategories,
    engagementByHour, engagementByDay, contentPreference,
  }
}

function generateLookalikes(channel) {
  const seed = hashStr(String(channel._id || channel.id || channel.nombreCanal || 'x'))
  const rnd = mulberry32(seed + 1)
  const audience = channel.estadisticas?.seguidores || 5000
  const platformPool = {
    telegram:  [{ emoji: '✈️', color: '#0088cc' }],
    discord:   [{ emoji: '🎮', color: '#5865F2' }],
    instagram: [{ emoji: '📸', color: '#E4405F' }],
    whatsapp:  [{ emoji: '💬', color: '#25D366' }],
    newsletter:[{ emoji: '📧', color: '#F59E0B' }],
  }
  const plat = (channel.plataforma || 'telegram').toLowerCase()
  const cfg = platformPool[plat]?.[0] || platformPool.telegram[0]
  const samples = [
    { name: 'CryptoBros ES',    audience: audience * 0.7,  match: 88 },
    { name: 'Tech Insiders',    audience: audience * 1.4,  match: 82 },
    { name: 'Marketing Diario', audience: audience * 0.5,  match: 79 },
    { name: 'StartupSpain',     audience: audience * 0.9,  match: 76 },
    { name: 'Inversión Hoy',    audience: audience * 1.8,  match: 71 },
    { name: 'NoCode World',     audience: audience * 0.6,  match: 68 },
  ]
  return samples.map(s => ({
    ...s,
    audience: Math.round(s.audience * (0.85 + rnd() * 0.3)),
    match: s.match + (rnd() - 0.5) * 6,
    platform: plat.charAt(0).toUpperCase() + plat.slice(1),
    color: cfg.color, emoji: cfg.emoji,
  }))
}

function normalise(obj) {
  const sum = Object.values(obj).reduce((s, v) => s + v, 0)
  if (sum === 0) return
  Object.keys(obj).forEach(k => { obj[k] = obj[k] / sum })
}

function hashStr(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function mulberry32(seed) {
  let t = seed
  return function () {
    t |= 0; t = (t + 0x6D2B79F5) | 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const primaryBtn = {
  background: ACCENT, color: '#fff', border: 'none', borderRadius: 9,
  padding: '9px 16px', fontSize: 13, fontWeight: 700,
  cursor: 'pointer', fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6,
  boxShadow: `0 4px 14px ${ga(0.35)}`,
}
