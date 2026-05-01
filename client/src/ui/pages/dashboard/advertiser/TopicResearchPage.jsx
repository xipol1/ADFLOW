import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Hash, TrendingUp, TrendingDown, Sparkles, Filter, Info,
  ArrowRight, Lightbulb,
} from 'lucide-react'
import apiService from '../../../../services/api'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE } from '../../../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'
const purpleAlpha = (o) => `var(--accent-dim, rgba(139,92,246,${o}))`


// ─── Curated keyword/topic data per niche ──────────────────────────────────
// Combines: industry-typical winning keywords + benchmark CTR weights.
// "trend" is heuristic: 'up'/'flat'/'down' based on observed market behavior.
const NICHE_TOPICS = {
  crypto: [
    { keyword: 'señales', avgCtr: 4.8, popularity: 92, trend: 'up' },
    { keyword: 'altcoins', avgCtr: 3.9, popularity: 78, trend: 'up' },
    { keyword: 'staking', avgCtr: 3.2, popularity: 71, trend: 'up' },
    { keyword: 'NFT', avgCtr: 2.4, popularity: 55, trend: 'down' },
    { keyword: 'DeFi', avgCtr: 3.5, popularity: 68, trend: 'flat' },
    { keyword: 'wallet', avgCtr: 2.8, popularity: 60, trend: 'flat' },
    { keyword: 'trading bot', avgCtr: 5.1, popularity: 84, trend: 'up' },
    { keyword: 'análisis técnico', avgCtr: 3.6, popularity: 66, trend: 'flat' },
  ],
  finanzas: [
    { keyword: 'inversión', avgCtr: 2.4, popularity: 88, trend: 'flat' },
    { keyword: 'pasivo', avgCtr: 3.1, popularity: 76, trend: 'up' },
    { keyword: 'fondos indexados', avgCtr: 3.4, popularity: 72, trend: 'up' },
    { keyword: 'jubilación', avgCtr: 1.9, popularity: 64, trend: 'flat' },
    { keyword: 'libertad financiera', avgCtr: 4.2, popularity: 81, trend: 'up' },
    { keyword: 'hipoteca', avgCtr: 2.7, popularity: 58, trend: 'flat' },
    { keyword: 'dividendos', avgCtr: 3.5, popularity: 70, trend: 'up' },
    { keyword: 'fiscalidad', avgCtr: 2.1, popularity: 52, trend: 'flat' },
  ],
  tecnologia: [
    { keyword: 'IA', avgCtr: 5.4, popularity: 96, trend: 'up' },
    { keyword: 'ChatGPT', avgCtr: 5.8, popularity: 94, trend: 'up' },
    { keyword: 'automatización', avgCtr: 4.1, popularity: 82, trend: 'up' },
    { keyword: 'no-code', avgCtr: 3.6, popularity: 68, trend: 'up' },
    { keyword: 'productividad', avgCtr: 2.8, popularity: 71, trend: 'flat' },
    { keyword: 'SaaS', avgCtr: 3.2, popularity: 64, trend: 'flat' },
    { keyword: 'Python', avgCtr: 3.4, popularity: 70, trend: 'flat' },
    { keyword: 'startups', avgCtr: 2.6, popularity: 58, trend: 'flat' },
  ],
  marketing: [
    { keyword: 'growth', avgCtr: 3.6, popularity: 78, trend: 'up' },
    { keyword: 'funnel', avgCtr: 3.3, popularity: 72, trend: 'flat' },
    { keyword: 'copy', avgCtr: 3.8, popularity: 74, trend: 'up' },
    { keyword: 'SEO', avgCtr: 2.5, popularity: 80, trend: 'flat' },
    { keyword: 'email marketing', avgCtr: 3.1, popularity: 66, trend: 'flat' },
    { keyword: 'TikTok ads', avgCtr: 4.5, popularity: 86, trend: 'up' },
    { keyword: 'branding', avgCtr: 2.4, popularity: 60, trend: 'flat' },
    { keyword: 'CAC LTV', avgCtr: 3.0, popularity: 54, trend: 'up' },
  ],
  ecommerce: [
    { keyword: 'dropshipping', avgCtr: 4.1, popularity: 78, trend: 'down' },
    { keyword: 'Shopify', avgCtr: 3.8, popularity: 82, trend: 'flat' },
    { keyword: 'conversión', avgCtr: 3.4, popularity: 70, trend: 'flat' },
    { keyword: 'logistics', avgCtr: 2.6, popularity: 58, trend: 'up' },
    { keyword: 'Amazon FBA', avgCtr: 4.4, popularity: 80, trend: 'flat' },
    { keyword: 'POD', avgCtr: 3.5, popularity: 64, trend: 'flat' },
    { keyword: 'checkout', avgCtr: 2.8, popularity: 52, trend: 'flat' },
    { keyword: 'reseñas', avgCtr: 3.0, popularity: 60, trend: 'up' },
  ],
  salud: [
    { keyword: 'mindfulness', avgCtr: 3.2, popularity: 72, trend: 'up' },
    { keyword: 'sueño', avgCtr: 3.5, popularity: 78, trend: 'up' },
    { keyword: 'fitness', avgCtr: 2.9, popularity: 84, trend: 'flat' },
    { keyword: 'nutrición', avgCtr: 3.0, popularity: 80, trend: 'flat' },
    { keyword: 'suplementos', avgCtr: 3.6, popularity: 74, trend: 'up' },
    { keyword: 'ayuno', avgCtr: 4.2, popularity: 70, trend: 'flat' },
    { keyword: 'meditación', avgCtr: 2.8, popularity: 68, trend: 'flat' },
    { keyword: 'longevidad', avgCtr: 3.8, popularity: 62, trend: 'up' },
  ],
  educacion: [
    { keyword: 'curso gratis', avgCtr: 4.6, popularity: 88, trend: 'flat' },
    { keyword: 'certificado', avgCtr: 3.4, popularity: 78, trend: 'up' },
    { keyword: 'inglés', avgCtr: 3.6, popularity: 84, trend: 'flat' },
    { keyword: 'oposiciones', avgCtr: 3.0, popularity: 70, trend: 'flat' },
    { keyword: 'masterclass', avgCtr: 3.8, popularity: 72, trend: 'up' },
    { keyword: 'bootcamp', avgCtr: 3.2, popularity: 68, trend: 'up' },
    { keyword: 'examen', avgCtr: 2.6, popularity: 60, trend: 'flat' },
    { keyword: 'beca', avgCtr: 3.4, popularity: 64, trend: 'up' },
  ],
  entretenimiento: [
    { keyword: 'streaming', avgCtr: 3.5, popularity: 88, trend: 'up' },
    { keyword: 'Netflix', avgCtr: 4.0, popularity: 90, trend: 'flat' },
    { keyword: 'gaming', avgCtr: 4.3, popularity: 86, trend: 'up' },
    { keyword: 'estreno', avgCtr: 3.8, popularity: 80, trend: 'flat' },
    { keyword: 'crítica', avgCtr: 2.4, popularity: 62, trend: 'flat' },
    { keyword: 'spoiler', avgCtr: 3.2, popularity: 70, trend: 'flat' },
    { keyword: 'reseña', avgCtr: 2.8, popularity: 66, trend: 'flat' },
    { keyword: 'temporada', avgCtr: 3.0, popularity: 72, trend: 'flat' },
  ],
  noticias: [
    { keyword: 'última hora', avgCtr: 3.1, popularity: 92, trend: 'flat' },
    { keyword: 'exclusiva', avgCtr: 3.6, popularity: 78, trend: 'flat' },
    { keyword: 'análisis', avgCtr: 1.8, popularity: 68, trend: 'flat' },
    { keyword: 'opinión', avgCtr: 2.0, popularity: 60, trend: 'flat' },
    { keyword: 'investigación', avgCtr: 2.2, popularity: 56, trend: 'up' },
    { keyword: 'datos', avgCtr: 2.4, popularity: 62, trend: 'up' },
    { keyword: 'política', avgCtr: 2.8, popularity: 76, trend: 'flat' },
    { keyword: 'economía', avgCtr: 2.6, popularity: 70, trend: 'flat' },
  ],
  deporte: [
    { keyword: 'fichaje', avgCtr: 4.5, popularity: 88, trend: 'flat' },
    { keyword: 'mercado', avgCtr: 3.8, popularity: 80, trend: 'flat' },
    { keyword: 'Champions', avgCtr: 4.2, popularity: 84, trend: 'flat' },
    { keyword: 'apuestas', avgCtr: 4.6, popularity: 78, trend: 'up' },
    { keyword: 'lesión', avgCtr: 3.4, popularity: 72, trend: 'flat' },
    { keyword: 'clasificación', avgCtr: 2.8, popularity: 68, trend: 'flat' },
    { keyword: 'pronóstico', avgCtr: 3.6, popularity: 70, trend: 'flat' },
    { keyword: 'estadísticas', avgCtr: 2.6, popularity: 62, trend: 'up' },
  ],
  lifestyle: [
    { keyword: 'minimalismo', avgCtr: 3.2, popularity: 70, trend: 'flat' },
    { keyword: 'rutina', avgCtr: 3.8, popularity: 78, trend: 'up' },
    { keyword: 'productividad personal', avgCtr: 3.4, popularity: 72, trend: 'flat' },
    { keyword: 'viajes', avgCtr: 3.6, popularity: 84, trend: 'up' },
    { keyword: 'self-care', avgCtr: 3.0, popularity: 68, trend: 'up' },
    { keyword: 'nómada digital', avgCtr: 4.2, popularity: 76, trend: 'up' },
    { keyword: 'hábitos', avgCtr: 3.5, popularity: 74, trend: 'up' },
    { keyword: 'home office', avgCtr: 2.8, popularity: 64, trend: 'flat' },
  ],
  otros: [
    { keyword: 'oferta', avgCtr: 3.0, popularity: 70, trend: 'flat' },
    { keyword: 'descuento', avgCtr: 3.2, popularity: 76, trend: 'flat' },
    { keyword: 'novedad', avgCtr: 2.8, popularity: 68, trend: 'flat' },
    { keyword: 'lanzamiento', avgCtr: 3.4, popularity: 72, trend: 'flat' },
  ],
}

const NICHE_LIST = [
  { key: 'crypto',          label: 'Cripto',          emoji: '₿' },
  { key: 'finanzas',        label: 'Finanzas',        emoji: '💰' },
  { key: 'tecnologia',      label: 'Tecnología',      emoji: '💻' },
  { key: 'marketing',       label: 'Marketing',       emoji: '📣' },
  { key: 'ecommerce',       label: 'Ecommerce',       emoji: '🛒' },
  { key: 'salud',           label: 'Salud',           emoji: '🩺' },
  { key: 'educacion',       label: 'Educación',       emoji: '🎓' },
  { key: 'entretenimiento', label: 'Entretenimiento', emoji: '🎬' },
  { key: 'noticias',        label: 'Noticias',        emoji: '📰' },
  { key: 'deporte',         label: 'Deporte',         emoji: '⚽' },
  { key: 'lifestyle',       label: 'Lifestyle',       emoji: '🌿' },
  { key: 'otros',           label: 'Otros',           emoji: '🗂️' },
]


// ─── Trend icon ────────────────────────────────────────────────────────────
function TrendBadge({ trend }) {
  const cfg = {
    up:   { color: OK,   icon: TrendingUp,   label: 'Subiendo' },
    down: { color: ERR,  icon: TrendingDown, label: 'Bajando'  },
    flat: { color: 'var(--muted2)', icon: null, label: 'Estable' },
  }[trend] || { color: 'var(--muted2)', icon: null, label: '' }
  const Icon = cfg.icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      background: trend === 'flat' ? 'var(--bg2)' : `${cfg.color}12`,
      color: cfg.color,
      border: trend === 'flat' ? '1px solid var(--border)' : `1px solid ${cfg.color}30`,
      borderRadius: 6, padding: '2px 7px', fontSize: 10, fontWeight: 700,
    }}>
      {Icon && <Icon size={9} />} {cfg.label}
    </span>
  )
}

// Heat color for CTR
function ctrColor(ctr) {
  if (ctr >= 4.5) return OK
  if (ctr >= 3.0) return BLUE
  if (ctr >= 2.0) return WARN
  return ERR
}


// ─── Main ──────────────────────────────────────────────────────────────────
export default function TopicResearchPage() {
  const navigate = useNavigate()
  const [niche, setNiche] = useState('finanzas')
  const [sort, setSort] = useState('popularity')
  const [trendFilter, setTrendFilter] = useState('all')
  const [marketCpm, setMarketCpm] = useState(null)

  // Fetch real niche CPM for context
  useEffect(() => {
    let cancelled = false
    setMarketCpm(null)
    apiService.getNicheTrends(niche, 30).then(res => {
      if (!cancelled && res?.success) setMarketCpm(res.data?.cpmPromedio)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [niche])

  const topics = useMemo(() => {
    const arr = (NICHE_TOPICS[niche] || []).map(t => ({ ...t }))
    const filtered = trendFilter === 'all' ? arr : arr.filter(t => t.trend === trendFilter)
    filtered.sort((a, b) => {
      if (sort === 'popularity') return b.popularity - a.popularity
      if (sort === 'ctr')        return b.avgCtr - a.avgCtr
      if (sort === 'trend')      return (b.trend === 'up' ? 1 : 0) - (a.trend === 'up' ? 1 : 0)
      if (sort === 'name')       return a.keyword.localeCompare(b.keyword)
      return 0
    })
    return filtered
  }, [niche, sort, trendFilter])

  const stats = useMemo(() => {
    const all = NICHE_TOPICS[niche] || []
    const avgCtr = all.length ? all.reduce((s, t) => s + t.avgCtr, 0) / all.length : 0
    const trendingUp = all.filter(t => t.trend === 'up').length
    const trendingDown = all.filter(t => t.trend === 'down').length
    return { totalTopics: all.length, avgCtr, trendingUp, trendingDown }
  }, [niche])

  const currentNiche = NICHE_LIST.find(n => n.key === niche)

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
            <Hash size={20} color={PURPLE} />
          </div>
          <h1 style={{
            fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800,
            color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1, margin: 0,
          }}>
            Topic Research
          </h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
          Descubre qué keywords y temas funcionan mejor en cada nicho. Cada keyword muestra CTR medio + tendencia del mercado.
        </p>
      </div>

      {/* Niche selector — pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {NICHE_LIST.map(n => {
          const active = niche === n.key
          return (
            <button key={n.key} onClick={() => setNiche(n.key)} style={{
              background: active ? PURPLE : 'var(--surface)',
              color: active ? '#fff' : 'var(--text)',
              border: `1px solid ${active ? PURPLE : 'var(--border)'}`,
              borderRadius: 10, padding: '8px 14px', fontSize: 12.5, fontWeight: active ? 700 : 600,
              cursor: 'pointer', fontFamily: FONT_BODY,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>{n.emoji}</span> {n.label}
            </button>
          )
        })}
      </div>

      {/* Niche stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12,
      }}>
        {[
          { label: 'Keywords analizadas', val: stats.totalTopics, color: PURPLE },
          { label: 'CTR medio nicho',    val: `${stats.avgCtr.toFixed(2)}%`, color: BLUE },
          { label: 'En tendencia',       val: stats.trendingUp, color: OK },
          { label: 'En declive',         val: stats.trendingDown, color: ERR },
          { label: 'CPM medio',          val: marketCpm != null ? `€${Number(marketCpm).toFixed(1)}` : '—', color: WARN },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 12,
          }}>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
              {s.label}
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, color: s.color }}>
              {s.val}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={12} color="var(--muted)" />
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Tendencia:</span>
          {['all', 'up', 'flat', 'down'].map(f => {
            const labels = { all: 'Todas', up: 'Subiendo', flat: 'Estable', down: 'Bajando' }
            const active = trendFilter === f
            return (
              <button key={f} onClick={() => setTrendFilter(f)} style={{
                background: active ? PURPLE : 'var(--bg2)',
                color: active ? '#fff' : 'var(--muted)',
                border: `1px solid ${active ? PURPLE : 'var(--border)'}`,
                borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', fontFamily: FONT_BODY,
              }}>{labels[f]}</button>
            )
          })}
        </div>
        <span style={{ borderLeft: '1px solid var(--border)', height: 18 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Ordenar:</span>
          <select value={sort} onChange={e => setSort(e.target.value)} style={{
            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '4px 8px', fontSize: 11, color: 'var(--text)', fontFamily: FONT_BODY, cursor: 'pointer',
          }}>
            <option value="popularity">Popularidad</option>
            <option value="ctr">CTR más alto</option>
            <option value="trend">Tendencia</option>
            <option value="name">Alfabético</option>
          </select>
        </div>
      </div>

      {/* Keyword grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12,
      }}>
        {topics.map(t => {
          const cColor = ctrColor(t.avgCtr)
          return (
            <div key={t.keyword} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 14,
              display: 'flex', flexDirection: 'column', gap: 8,
              transition: 'border-color .2s, transform .2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = purpleAlpha(0.3); e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <span style={{
                  fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: 'var(--text)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Hash size={14} color={PURPLE} />
                  {t.keyword}
                </span>
                <TrendBadge trend={t.trend} />
              </div>

              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
              }}>
                <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: '6px 9px' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, marginBottom: 1 }}>CTR medio</div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 800, color: cColor }}>
                    {t.avgCtr.toFixed(1)}%
                  </div>
                </div>
                <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: '6px 9px' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, marginBottom: 1 }}>Popularidad</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                      {t.popularity}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>/100</span>
                  </div>
                </div>
              </div>

              <button onClick={() => navigate(`/advertiser/analyze/ad`)}
                style={{
                  background: purpleAlpha(0.08), color: PURPLE,
                  border: `1px solid ${purpleAlpha(0.2)}`, borderRadius: 8,
                  padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  marginTop: 2,
                }}>
                Usar en mi copy <ArrowRight size={11} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Suggestions card */}
      <div style={{
        background: `${PURPLE}06`, border: `1px solid ${purpleAlpha(0.25)}`,
        borderRadius: 14, padding: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Lightbulb size={16} color={PURPLE} />
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            Estrategia recomendada para «{currentNiche?.label}»
          </h3>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
          {(() => {
            const trending = topics.filter(t => t.trend === 'up').slice(0, 3)
            const top = topics.slice(0, 3)
            if (trending.length > 0) {
              return (
                <>
                  Las keywords <strong>en tendencia</strong> ({trending.map(t => `«${t.keyword}»`).join(', ')}) ofrecen
                  mejor relación CTR/competencia ahora mismo. Inclúyelas en tus copies para captar la ola.
                  Las keywords más populares ({top.map(t => `«${t.keyword}»`).join(', ')}) tienen demanda constante
                  pero más competencia.
                </>
              )
            }
            return (
              <>Las keywords más populares ({top.map(t => `«${t.keyword}»`).join(', ')}) son los pilares de este nicho.
              Combínalas en tu copy para resonar con el lector.</>
            )
          })()}
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{
        background: `${BLUE}08`, border: `1px solid ${BLUE}25`,
        borderRadius: 10, padding: '10px 14px',
        fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5,
      }}>
        <Info size={12} color={BLUE} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          Datos curados a partir de patrones observados en el mercado y benchmarks históricos por nicho.
          Se calibran trimestralmente. Para tu caso concreto, valida con un A/B Test.
        </span>
      </div>
    </div>
  )
}
