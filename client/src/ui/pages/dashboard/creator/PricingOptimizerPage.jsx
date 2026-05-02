import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, Sparkles,
  CheckCircle2, ArrowRight, Info, Lightbulb, Tag,
} from 'lucide-react'
import apiService from '../../../../services/api'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE, GREEN, greenAlpha } from '../../../theme/tokens'

// Use creator green accent (matches CreatorLayout role color)
const ACCENT = GREEN
const accentAlpha = greenAlpha

const fmtMoney = (n) => `€${Math.round(n || 0).toLocaleString('es')}`
const fmtNum = (n) => n == null ? '—' : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)


// ─── CPM base per platform (mirrors server config/nicheBenchmarks.js) ──────
const CPM_BASE = {
  whatsapp: 20, newsletter: 28, instagram: 22, telegram: 14,
  facebook: 13, discord: 9, blog: 8,
}

// Estimated optimal price = CPM_base × CAS_multiplier × audience_factor
// CAS_multiplier: 0.4 (CAS<40) → 1.6 (CAS>=85), linear in between.
function casMultiplier(cas) {
  if (cas == null) return 1.0
  return Math.max(0.4, Math.min(1.6, 0.4 + (cas / 100) * 1.2))
}

// Compute suggested price per post (single send)
function suggestedPrice({ cas, plataforma, seguidores }) {
  const base = CPM_BASE[(plataforma || '').toLowerCase()] || 14
  const mult = casMultiplier(cas)
  // Estimate impressions per post = followers × 0.30 (typical reach)
  const reach = (seguidores || 0) * 0.30
  return Math.round((reach / 1000) * base * mult)
}

// Verdict on current vs suggested
function pricingVerdict(current, suggested) {
  if (!current || !suggested) return { kind: 'unknown', label: 'Sin datos', color: 'var(--muted)' }
  const ratio = current / suggested
  if (ratio < 0.7) return {
    kind: 'underpriced', label: 'Infravalorado',
    color: WARN,
    message: 'Estás cobrando muy poco para tu calidad. Sube el precio.',
  }
  if (ratio < 0.9) return {
    kind: 'low', label: 'Algo bajo',
    color: BLUE,
    message: 'Hay margen para subir el precio sin perder bookings.',
  }
  if (ratio <= 1.15) return {
    kind: 'optimal', label: 'Óptimo',
    color: OK,
    message: 'Tu precio está alineado con la calidad y la plataforma.',
  }
  if (ratio <= 1.4) return {
    kind: 'high', label: 'Algo alto',
    color: WARN,
    message: 'Precio ligeramente por encima del valor estimado. Cuida la conversión de bookings.',
  }
  return {
    kind: 'overpriced', label: 'Sobrevalorado',
    color: ERR,
    message: 'Precio muy por encima del valor estimado. Bajará los bookings notablemente.',
  }
}


// ─── Pricing card ──────────────────────────────────────────────────────────
function PricingCard({ channel, onUpdate, niche, marketCpm }) {
  const cas = channel.CAS ?? channel.scoring?.CAS ?? 50
  const plat = channel.plataforma
  const subs = channel.audiencia ?? channel.seguidores ?? 0
  const current = channel.precio ?? channel.CPMDinamico ?? 0
  const suggested = suggestedPrice({ cas, plataforma: plat, seguidores: subs })
  const verdict = pricingVerdict(current, suggested)
  const VerdictIcon =
    verdict.kind === 'optimal' ? CheckCircle2 :
    verdict.kind === 'overpriced' ? TrendingDown :
    verdict.kind === 'underpriced' ? TrendingUp :
    Info

  const delta = suggested - current
  const deltaPct = current > 0 ? ((delta / current) * 100) : 0

  return (
    <div style={{
      background: 'var(--surface)', border: `1px solid ${verdict.color}30`,
      borderRadius: 14, overflow: 'hidden',
    }}>
      {/* Verdict bar at top */}
      <div style={{ background: verdict.color, height: 3 }} />

      <div style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: accentAlpha(0.12), color: ACCENT,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 800, flexShrink: 0,
          }}>
            {(channel.nombreCanal || channel.nombre || '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {channel.nombreCanal || channel.nombre || channel.identificadorCanal || 'Canal'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
              {plat} · {fmtNum(subs)} subs · CAS {cas}
            </div>
          </div>
          <span style={{
            background: `${verdict.color}15`, color: verdict.color,
            border: `1px solid ${verdict.color}30`,
            borderRadius: 6, padding: '3px 10px', fontSize: 10.5, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
          }}>
            <VerdictIcon size={11} /> {verdict.label}
          </span>
        </div>

        {/* Price comparison */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12,
        }}>
          <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>
              Tu precio actual
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
              {fmtMoney(current)}
            </div>
          </div>
          <div style={{
            background: `${verdict.color}08`, border: `1px solid ${verdict.color}20`,
            borderRadius: 8, padding: '10px 12px',
          }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>
              Precio sugerido
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, color: verdict.color }}>
                {fmtMoney(suggested)}
              </span>
              {deltaPct !== 0 && (
                <span style={{ fontSize: 11, color: verdict.color, fontWeight: 700 }}>
                  {deltaPct > 0 ? '+' : ''}{deltaPct.toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{
          fontSize: 12, color: 'var(--text)', lineHeight: 1.5,
          padding: '8px 10px', background: `${verdict.color}06`, borderRadius: 8,
          marginBottom: 12,
        }}>
          {verdict.message}
        </div>

        {/* Pricing breakdown */}
        <div style={{
          fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 12, flexWrap: 'wrap',
          paddingTop: 8, borderTop: '1px solid var(--border)',
        }}>
          <span>CPM base {plat}: <strong style={{ color: 'var(--text)', fontFamily: 'monospace' }}>€{CPM_BASE[(plat || '').toLowerCase()] || 14}</strong></span>
          <span>Multiplicador CAS: <strong style={{ color: 'var(--text)', fontFamily: 'monospace' }}>×{casMultiplier(cas).toFixed(2)}</strong></span>
          <span>Alcance estimado: <strong style={{ color: 'var(--text)', fontFamily: 'monospace' }}>{fmtNum(Math.round(subs * 0.30))}</strong></span>
        </div>

        {Math.abs(deltaPct) >= 5 && (
          <button onClick={() => onUpdate(channel, suggested)}
            style={{
              marginTop: 12, width: '100%',
              background: ACCENT, color: '#fff', border: 'none', borderRadius: 10,
              padding: '10px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              fontFamily: FONT_BODY,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            <Tag size={13} /> Aplicar {fmtMoney(suggested)} en Mis Canales →
          </button>
        )}
      </div>
    </div>
  )
}


// ─── Main ──────────────────────────────────────────────────────────────────
export default function PricingOptimizerPage() {
  const navigate = useNavigate()
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updateMsg, setUpdateMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    apiService.getMyChannels().then(res => {
      if (cancelled) return
      if (res?.success) {
        const items = res.data?.items || res.data?.canales || res.data || []
        setChannels(Array.isArray(items) ? items : [])
      } else {
        setError(res?.message || 'No se pudieron cargar los canales')
      }
      setLoading(false)
    }).catch(e => {
      if (!cancelled) { setError(e.message || 'Error de conexión'); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [])

  const handleUpdate = (channel, newPrice) => {
    // Copy suggested price to clipboard + navigate to channel detail to apply it manually.
    // The price-update endpoint is on the roadmap; until then we route the user to the
    // existing edit screen with a clear message.
    const id = channel._id || channel.id
    try { navigator.clipboard?.writeText(String(newPrice)) } catch {}
    setUpdateMsg(`Precio sugerido (€${newPrice}) copiado al portapapeles. Pégalo en la edición del canal.`)
    setTimeout(() => setUpdateMsg(''), 5000)
    navigate(`/creator/channels?highlight=${id}`)
  }

  // Aggregate insights
  const summary = useMemo(() => {
    if (channels.length === 0) return null
    let underpriced = 0, optimal = 0, overpriced = 0
    let totalLift = 0  // potential extra revenue if everyone followed suggestion
    for (const c of channels) {
      const sug = suggestedPrice({
        cas: c.CAS ?? c.scoring?.CAS ?? 50,
        plataforma: c.plataforma,
        seguidores: c.audiencia ?? c.seguidores ?? 0,
      })
      const cur = c.precio ?? c.CPMDinamico ?? 0
      const v = pricingVerdict(cur, sug)
      if (v.kind === 'optimal') optimal++
      else if (v.kind === 'overpriced' || v.kind === 'high') overpriced++
      else if (v.kind === 'underpriced' || v.kind === 'low') underpriced++
      if (sug > cur) totalLift += (sug - cur)
    }
    return { underpriced, optimal, overpriced, totalLift, total: channels.length }
  }, [channels])

  return (
    <div style={{ fontFamily: FONT_BODY, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100 }}>

      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: accentAlpha(0.12), border: `1px solid ${accentAlpha(0.25)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <DollarSign size={20} color={ACCENT} />
          </div>
          <h1 style={{
            fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800,
            color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1, margin: 0,
          }}>
            Pricing Optimizer
          </h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
          Te decimos si cobras lo justo por cada canal según tu CAS, audiencia y plataforma. Sube precios sin perder bookings.
        </p>
      </div>

      {/* Toast */}
      {updateMsg && (
        <div style={{
          background: `${OK}10`, border: `1px solid ${OK}30`, color: OK,
          borderRadius: 10, padding: '10px 14px', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <CheckCircle2 size={14} /> {updateMsg}
        </div>
      )}

      {error && (
        <div role="alert" style={{
          background: `${ERR}10`, border: `1px solid ${ERR}30`, color: ERR,
          borderRadius: 10, padding: '10px 14px', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Summary KPIs */}
      {summary && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12,
        }}>
          {[
            { label: 'Canales analizados', val: summary.total, color: ACCENT },
            { label: 'Precio óptimo', val: summary.optimal, color: OK },
            { label: 'Infravalorados', val: summary.underpriced, color: WARN },
            { label: 'Sobrevalorados', val: summary.overpriced, color: ERR },
            { label: 'Margen de subida', val: fmtMoney(summary.totalLift), color: BLUE,
              hint: 'Potencial extra si subes a precio sugerido' },
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
              {s.hint && <div style={{ fontSize: 10, color: 'var(--muted2)', marginTop: 2 }}>{s.hint}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Lift opportunity banner */}
      {summary && summary.totalLift > 0 && (
        <div style={{
          background: `${ACCENT}08`, border: `1px solid ${accentAlpha(0.3)}`,
          borderRadius: 14, padding: 18,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 50, height: 50, borderRadius: 14,
            background: accentAlpha(0.15),
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Lightbulb size={22} color={ACCENT} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: ACCENT, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              Oportunidad
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>
              Podrías cobrar <span style={{ color: ACCENT }}>{fmtMoney(summary.totalLift)} más</span> por publicación
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              Sumando todos los canales que tienes infravalorados.
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, height: 220,
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && channels.length === 0 && (
        <div style={{
          background: 'var(--surface)', border: '1px dashed var(--border)',
          borderRadius: 18, padding: '60px 28px', textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: accentAlpha(0.08), border: `1px solid ${accentAlpha(0.18)}`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <Sparkles size={28} color={ACCENT} />
          </div>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            Aún no tienes canales registrados
          </h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 460, margin: '0 auto 14px', lineHeight: 1.6 }}>
            Registra tu primer canal para empezar a optimizar precios.
          </p>
          <button onClick={() => navigate('/creator/channels/new')}
            style={{
              background: ACCENT, color: '#fff', border: 'none', borderRadius: 10,
              padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>Registrar canal</button>
        </div>
      )}

      {/* Smart pricing suggestions panel — IA-driven, channel-by-channel  */}
      {!loading && channels.length > 0 && <SmartPricingSuggestions channels={channels} navigate={navigate} />}

      {/* Channel cards */}
      {!loading && channels.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 14,
        }}>
          {channels.map(c => (
            <PricingCard key={c._id || c.id} channel={c} onUpdate={handleUpdate} />
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <div style={{
        background: `${BLUE}08`, border: `1px solid ${BLUE}25`,
        borderRadius: 10, padding: '10px 14px',
        fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5,
      }}>
        <Info size={12} color={BLUE} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          El precio sugerido se calcula como <strong style={{ color: 'var(--text)' }}>(seguidores × 0.30 alcance / 1000) × CPM_plataforma × multiplicador_CAS</strong>.
          Es una guía de mercado; ajusta según tu posicionamiento, calidad de contenido y demanda específica.
        </span>
      </div>
    </div>
  )
}

// ─── Smart Pricing Suggestions ──────────────────────────────────────────────
// Rule-based recommendations: identifies underpriced channels with high
// engagement, suggests safe price-up steps, flags pricing risk.

function SmartPricingSuggestions({ channels, navigate }) {
  const suggestions = useMemo(() => {
    const out = []
    for (const c of channels) {
      const cas = c.CAS ?? c.scoring?.CAS ?? 50
      const sug = suggestedPrice({
        cas, plataforma: c.plataforma, seguidores: c.audiencia ?? c.seguidores ?? 0,
      })
      const cur = c.precio ?? c.CPMDinamico ?? 0
      const id = c._id || c.id
      const name = c.nombreCanal || c.nombre || 'Canal'

      if (sug > cur && (sug - cur) >= 5 && cas >= 60) {
        out.push({
          id: `up-${id}`,
          icon: TrendingUp, color: OK, priority: 1,
          title: `Sube ${name} de €${cur} a €${sug}`,
          body: `CAS ${Math.round(cas)} y audiencia engaged. Subida segura — el mercado pagará. +€${sug - cur} por publicación.`,
          cta: 'Aplicar',
          onClick: () => navigate(`/creator/channels?highlight=${id}`),
        })
      } else if (cur > sug * 1.2 && cas < 60) {
        out.push({
          id: `down-${id}`,
          icon: TrendingDown, color: WARN, priority: 3,
          title: `${name} está por encima del mercado`,
          body: `Precio €${cur}, sugerido €${sug}. CAS ${Math.round(cas)} no justifica premium. Riesgo de cero bookings.`,
          cta: 'Revisar',
          onClick: () => navigate(`/creator/channels?highlight=${id}`),
        })
      } else if (cur === 0 || cur == null) {
        out.push({
          id: `no-${id}`,
          icon: AlertTriangle, color: ERR, priority: 0,
          title: `${name} sin precio establecido`,
          body: `Sin precio no aparecerás en explore. Sugerido para empezar: €${sug}.`,
          cta: 'Establecer',
          onClick: () => navigate(`/creator/channels?highlight=${id}`),
        })
      }

      if (cas >= 80 && (c.estadisticas?.engagement || 0) >= 0.05) {
        out.push({
          id: `tier-${id}`,
          icon: Sparkles, color: '#8B5CF6', priority: 2,
          title: `Considera tier premium en ${name}`,
          body: `Engagement ${((c.estadisticas?.engagement || 0) * 100).toFixed(1)}% + CAS ${Math.round(cas)}. Crea bundle "Premium +€${Math.round(sug * 0.4)}" con menciones extra.`,
          cta: 'Ir a A/B Test',
          onClick: () => navigate('/creator/abtest'),
        })
      }
    }
    return out.sort((a, b) => a.priority - b.priority).slice(0, 5)
  }, [channels, navigate])

  if (suggestions.length === 0) return null

  return (
    <div style={{
      background: 'var(--surface)', border: `1px solid ${accentAlpha(0.25)}`,
      borderRadius: 14, padding: 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, background: accentAlpha(0.15),
          border: `1px solid ${accentAlpha(0.3)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={15} color={ACCENT} />
        </div>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Recomendaciones inteligentes
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
            Sugerencias por canal basadas en CAS, engagement y mercado.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {suggestions.map(s => {
          const Icon = s.icon
          return (
            <div key={s.id} onClick={s.onClick} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: `${s.color}08`, border: `1px solid ${s.color}25`,
              borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
              transition: 'background .12s, border-color .12s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = `${s.color}14`; e.currentTarget.style.borderColor = `${s.color}44` }}
              onMouseLeave={e => { e.currentTarget.style.background = `${s.color}08`; e.currentTarget.style.borderColor = `${s.color}25` }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: `${s.color}15`, border: `1px solid ${s.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={13} color={s.color} strokeWidth={2.2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                  {s.title}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>
                  {s.body}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: s.color, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {s.cta} <ArrowRight size={11} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
