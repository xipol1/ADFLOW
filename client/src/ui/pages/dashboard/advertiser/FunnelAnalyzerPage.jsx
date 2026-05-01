import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Filter, Eye, MousePointer, Target, DollarSign,
  AlertCircle, TrendingDown, TrendingUp, Lightbulb, Sparkles,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import apiService from '../../../../services/api'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE } from '../../../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'
const purpleAlpha = (o) => `var(--accent-dim, rgba(139,92,246,${o}))`

// Industry-typical drop-off rates as benchmarks
const BENCHMARKS = {
  imp_to_click:  2.0,   // % CTR
  click_to_lead: 30,    // % of clicks who land + engage
  lead_to_conv:  10,    // % of engaged who convert
}

const fmtNum = (n) => n == null ? '—' : Number(n).toLocaleString('es')
const fmtPct = (n) => n == null ? '—' : `${n.toFixed(2)}%`
const fmtMoney = (n) => `€${Math.round(n || 0).toLocaleString('es')}`

// ─── Funnel stage row ──────────────────────────────────────────────────────
function FunnelStage({ stage, value, max, color, conversion, benchmark, isLast }) {
  const widthPct = max > 0 ? Math.max(8, (value / max) * 100) : 8
  const cVsBench = conversion != null && benchmark != null
    ? ((conversion - benchmark) / benchmark) * 100
    : null
  const Icon = stage.icon

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Stage bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 140, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          <Icon size={14} color={color} />
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{stage.label}</span>
        </div>
        <div style={{
          flex: 1, height: 36, position: 'relative',
          background: 'var(--bg2)', borderRadius: 6, overflow: 'hidden',
        }}>
          <div style={{
            width: `${widthPct}%`, height: '100%',
            background: `linear-gradient(90deg, ${color}80, ${color})`,
            borderRadius: 6, transition: 'width .5s ease',
            display: 'flex', alignItems: 'center', paddingLeft: 12, gap: 8,
          }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 800, color: '#fff' }}>
              {fmtNum(value)}
            </span>
          </div>
        </div>
        <div style={{ width: 100, textAlign: 'right', flexShrink: 0 }}>
          {conversion != null && (
            <div style={{
              fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 800, color: 'var(--text)',
            }}>
              {fmtPct(conversion)}
            </div>
          )}
          {cVsBench != null && (
            <div style={{
              fontSize: 10, fontWeight: 700,
              color: cVsBench >= 0 ? OK : ERR,
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3,
            }}>
              {cVsBench >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
              {cVsBench >= 0 ? '+' : ''}{cVsBench.toFixed(0)}% vs media
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Drop-off connector ─────────────────────────────────────────────────────
function DropOffArrow({ from, to, label }) {
  const dropPct = from > 0 ? ((from - to) / from) * 100 : 0
  return (
    <div style={{
      marginLeft: 140, paddingLeft: 24,
      borderLeft: '1px dashed var(--border)',
      paddingTop: 4, paddingBottom: 4,
      fontSize: 11, color: 'var(--muted2)',
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <TrendingDown size={11} />
      <span>{label}: <strong style={{ color: 'var(--text)' }}>−{dropPct.toFixed(1)}%</strong> ({fmtNum(from - to)} perdidos)</span>
    </div>
  )
}


// ─── Main ──────────────────────────────────────────────────────────────────
export default function FunnelAnalyzerPage() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('all')  // 'all' or campaign _id
  const [error, setError] = useState('')

  // Optional manual conversion rate override
  const [convRate, setConvRate] = useState(BENCHMARKS.lead_to_conv)
  const [aov, setAov] = useState(50)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiService.getMyCampaigns().then(res => {
      if (cancelled) return
      if (res?.success) {
        const items = (res.data?.items || res.data || []).filter(c =>
          ['PAID', 'PUBLISHED', 'COMPLETED'].includes(c.status)
        )
        setCampaigns(items)
      } else {
        setError(res?.message || 'No se pudieron cargar las campañas')
      }
      setLoading(false)
    }).catch(e => {
      if (!cancelled) { setError(e.message || 'Error de conexión'); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [])

  // Aggregate the funnel data
  const funnelData = useMemo(() => {
    const filtered = selectedId === 'all'
      ? campaigns
      : campaigns.filter(c => (c._id || c.id) === selectedId)

    const totalSpend = filtered.reduce((s, c) => s + (c.price || 0), 0)
    const impressions = filtered.reduce((s, c) => s + (c.tracking?.impressions || 0), 0)
    const clicks = filtered.reduce((s, c) => s + (c.tracking?.clicks || 0), 0)
    const conversions = filtered.reduce((s, c) => s + (c.tracking?.conversions || 0), 0)

    // If we have no real conversions data, estimate from the assumed rate
    const estimatedConv = conversions > 0
      ? conversions
      : Math.round(clicks * (convRate / 100))

    const revenue = estimatedConv * aov

    // Conversion rates between stages
    const impToClick = impressions > 0 ? (clicks / impressions) * 100 : null
    const clickToConv = clicks > 0 ? (estimatedConv / clicks) * 100 : null

    return {
      campaignCount: filtered.length,
      totalSpend, impressions, clicks, conversions: estimatedConv,
      revenue,
      conversionsAreReal: conversions > 0,
      rates: { impToClick, clickToConv },
      profit: revenue - totalSpend,
      roi: totalSpend > 0 ? ((revenue - totalSpend) / totalSpend) * 100 : 0,
      cpa: estimatedConv > 0 ? totalSpend / estimatedConv : null,
      cpc: clicks > 0 ? totalSpend / clicks : null,
    }
  }, [campaigns, selectedId, convRate, aov])

  // Recommendations based on weakest step
  const recommendations = useMemo(() => {
    const out = []
    const { rates, impressions, clicks, conversions } = funnelData
    if (impressions === 0) return out

    if (rates.impToClick != null && rates.impToClick < BENCHMARKS.imp_to_click) {
      out.push({
        step: 'CTR bajo',
        text: `Tu CTR es ${rates.impToClick.toFixed(2)}% — la media del mercado es ${BENCHMARKS.imp_to_click}%. Mejora el copy o la oferta para captar más atención. Usa el Analizador de anuncios.`,
        action: () => navigate('/advertiser/analyze/ad'),
        actionLabel: 'Mejorar copy',
      })
    } else if (rates.impToClick > BENCHMARKS.imp_to_click * 1.5) {
      out.push({
        step: 'CTR excelente',
        text: `CTR ${rates.impToClick.toFixed(2)}% supera la media (${BENCHMARKS.imp_to_click}%). Tu copy funciona — escala el presupuesto.`,
        positive: true,
      })
    }

    if (rates.clickToConv != null && rates.clickToConv < BENCHMARKS.lead_to_conv * 0.7 && conversions > 0) {
      out.push({
        step: 'Conversión baja',
        text: `Solo ${rates.clickToConv.toFixed(1)}% de los clicks convierten. Revisa la landing page (velocidad, claridad del CTA, fricciones del checkout).`,
      })
    }

    if (impressions > 0 && clicks === 0) {
      out.push({
        step: 'Cero clicks',
        text: 'Tienes impresiones pero ningún click. Es probable que el copy no resuene o el target esté mal alineado.',
      })
    }

    if (clicks > 0 && conversions === 0 && !funnelData.conversionsAreReal) {
      out.push({
        step: 'Sin tracking de conversiones',
        text: 'No hay conversiones registradas. Implementa el píxel de tracking para medir el ROI real, o ajusta la estimación de conversión más abajo.',
      })
    }

    return out
  }, [funnelData, navigate])

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
            <Filter size={20} color={PURPLE} />
          </div>
          <h1 style={{
            fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800,
            color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1, margin: 0,
          }}>
            Funnel Analyzer
          </h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
          Visualiza cómo tu tráfico cae en cada etapa: impresiones → clicks → conversiones → ingresos. Identifica qué arreglar primero.
        </p>
      </div>

      {/* Selector */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 14,
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Analizar:</span>
        <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
          style={{
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '6px 10px', fontSize: 13, color: 'var(--text)',
            fontFamily: FONT_BODY, cursor: 'pointer', minWidth: 240,
          }}>
          <option value="all">Todas mis campañas ({campaigns.length})</option>
          {campaigns.map(c => {
            const id = c._id || c.id
            const name = c.channel?.nombreCanal || c.channel?.nombre || c.channel?.identificadorCanal || 'Canal'
            return <option key={id} value={id}>{name} — €{c.price || 0}</option>
          })}
        </select>
        <span style={{ fontSize: 11, color: 'var(--muted2)' }}>
          {funnelData.campaignCount} campañas analizadas
        </span>
      </div>

      {error && (
        <div role="alert" style={{
          background: `${ERR}10`, border: `1px solid ${ERR}30`, color: ERR,
          borderRadius: 10, padding: '10px 14px', fontSize: 13,
        }}>{error}</div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, height: 400,
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      )}

      {/* Empty */}
      {!loading && campaigns.length === 0 && (
        <div style={{
          background: 'var(--surface)', border: '1px dashed var(--border)',
          borderRadius: 18, padding: '60px 28px', textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: purpleAlpha(0.08), border: `1px solid ${purpleAlpha(0.18)}`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <Sparkles size={28} color={PURPLE} />
          </div>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            No tienes campañas con datos aún
          </h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 460, margin: '0 auto', lineHeight: 1.6 }}>
            Lanza al menos una campaña en estado pagada o publicada para ver el funnel.
          </p>
        </div>
      )}

      {!loading && campaigns.length > 0 && (
        <>
          {/* Funnel viz */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                Funnel completo
              </h3>
              <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--muted)' }}>
                <span><strong style={{ color: 'var(--text)' }}>{fmtMoney(funnelData.totalSpend)}</strong> gastado</span>
                {funnelData.cpc != null && <span>· CPC <strong style={{ color: 'var(--text)' }}>€{funnelData.cpc.toFixed(2)}</strong></span>}
                {funnelData.cpa != null && <span>· CPA <strong style={{ color: 'var(--text)' }}>{fmtMoney(funnelData.cpa)}</strong></span>}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <FunnelStage
                stage={{ label: 'Impresiones', icon: Eye }}
                value={funnelData.impressions}
                max={funnelData.impressions}
                color={BLUE}
              />
              {funnelData.impressions > 0 && funnelData.clicks > 0 && (
                <DropOffArrow from={funnelData.impressions} to={funnelData.clicks} label="No hicieron click" />
              )}
              <FunnelStage
                stage={{ label: 'Clicks', icon: MousePointer }}
                value={funnelData.clicks}
                max={funnelData.impressions}
                color={PURPLE}
                conversion={funnelData.rates.impToClick}
                benchmark={BENCHMARKS.imp_to_click}
              />
              {funnelData.clicks > 0 && funnelData.conversions > 0 && (
                <DropOffArrow from={funnelData.clicks} to={funnelData.conversions} label="No convirtieron" />
              )}
              <FunnelStage
                stage={{ label: 'Conversiones', icon: Target }}
                value={funnelData.conversions}
                max={funnelData.impressions}
                color={OK}
                conversion={funnelData.rates.clickToConv}
                benchmark={BENCHMARKS.lead_to_conv}
              />
              <FunnelStage
                stage={{ label: 'Ingresos est.', icon: DollarSign }}
                value={funnelData.revenue}
                max={funnelData.impressions}
                color={WARN}
              />
            </div>

            {!funnelData.conversionsAreReal && (
              <div style={{
                marginTop: 14, padding: '10px 12px',
                background: `${BLUE}08`, border: `1px solid ${BLUE}25`, borderRadius: 8,
                fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 6, alignItems: 'flex-start', lineHeight: 1.5,
              }}>
                <AlertCircle size={12} color={BLUE} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  Sin tracking de conversiones real — usamos una estimación del <strong style={{ color: 'var(--text)' }}>{convRate.toFixed(1)}%</strong> sobre los clicks.
                  Implementa el píxel de tracking para datos reales o ajusta la tasa abajo.
                </span>
              </div>
            )}
          </div>

          {/* ROI banner */}
          <div style={{
            background: funnelData.roi >= 0 ? `${OK}08` : `${ERR}08`,
            border: `1px solid ${funnelData.roi >= 0 ? OK : ERR}30`,
            borderRadius: 14, padding: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                ROI estimado
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{
                  fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 900,
                  color: funnelData.roi >= 0 ? OK : ERR, letterSpacing: '-0.03em', lineHeight: 1,
                }}>
                  {funnelData.roi > 0 ? '+' : ''}{funnelData.roi.toFixed(0)}%
                </span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {funnelData.profit >= 0 ? `+${fmtMoney(funnelData.profit)}` : `${fmtMoney(funnelData.profit)}`} sobre {fmtMoney(funnelData.totalSpend)}
                </span>
              </div>
            </div>
          </div>

          {/* Advanced */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 16,
          }}>
            <button onClick={() => setShowAdvanced(v => !v)}
              style={{
                background: 'none', border: 'none', color: PURPLE,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, fontFamily: FONT_BODY,
                width: '100%', textAlign: 'left',
              }}>
              {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              Ajustar tasa de conversión y AOV
            </button>
            {showAdvanced && (
              <div style={{
                marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)',
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14,
              }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    Tasa de conversión asumida (%)
                  </label>
                  <input type="number" step="0.5" min="0" max="100"
                    value={convRate} onChange={e => setConvRate(Math.max(0, Number(e.target.value) || 0))}
                    style={{
                      width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--text)',
                      fontFamily: FONT_BODY, outline: 'none',
                    }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    Valor medio por venta (€)
                  </label>
                  <input type="number" step="1" min="0"
                    value={aov} onChange={e => setAov(Math.max(0, Number(e.target.value) || 0))}
                    style={{
                      width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--text)',
                      fontFamily: FONT_BODY, outline: 'none',
                    }} />
                </div>
              </div>
            )}
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div style={{
              background: `${PURPLE}06`, border: `1px solid ${purpleAlpha(0.25)}`,
              borderRadius: 14, padding: 18,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Lightbulb size={16} color={PURPLE} />
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                  Recomendaciones para mejorar el funnel
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recommendations.map((r, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                    padding: '10px 12px',
                    background: r.positive ? `${OK}08` : 'var(--surface)',
                    border: `1px solid ${r.positive ? `${OK}30` : 'var(--border)'}`,
                    borderRadius: 10, fontSize: 12.5,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: r.positive ? OK : PURPLE, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                        {r.step}
                      </div>
                      <div style={{ color: 'var(--text)', lineHeight: 1.5 }}>{r.text}</div>
                    </div>
                    {r.action && r.actionLabel && (
                      <button onClick={r.action} style={{
                        background: PURPLE, color: '#fff', border: 'none', borderRadius: 8,
                        padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        fontFamily: FONT_BODY, flexShrink: 0,
                      }}>{r.actionLabel}</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
