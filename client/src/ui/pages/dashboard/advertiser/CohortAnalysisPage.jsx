import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, TrendingUp, TrendingDown, Calendar, Download,
  Filter, Sparkles, Trophy, AlertTriangle,
} from 'lucide-react'
import apiService from '../../../../services/api'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE } from '../../../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'
const purpleAlpha = (o) => `var(--accent-dim, rgba(139,92,246,${o}))`

const fmtNum = (n) => n == null ? '—' : Number(n).toLocaleString('es')
const fmtMoney = (n) => `€${Math.round(n || 0).toLocaleString('es')}`
const fmtPct = (n) => n == null ? '—' : `${n.toFixed(2)}%`


// ─── ISO week helpers ──────────────────────────────────────────────────────
function startOfWeek(d) {
  const x = new Date(d)
  const day = x.getDay()  // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day  // ISO Monday-start
  x.setDate(x.getDate() + diff)
  x.setHours(0, 0, 0, 0)
  return x
}

function startOfMonth(d) {
  const x = new Date(d)
  x.setDate(1)
  x.setHours(0, 0, 0, 0)
  return x
}

function fmtWeekLabel(d) {
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: '2-digit' })
}


// ─── CSV export ────────────────────────────────────────────────────────────
function downloadCSV(rows, periodLabel) {
  const headers = [periodLabel, 'campañas', 'gasto', 'impresiones', 'clicks', 'conversiones', 'CTR', 'CPC', 'CPA', 'ingresos', 'ROI']
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push([
      r.label,
      r.count,
      r.spend.toFixed(2),
      r.impressions,
      r.clicks,
      r.conversions,
      r.ctr.toFixed(2),
      r.cpc.toFixed(2),
      r.cpa.toFixed(2),
      r.revenue.toFixed(2),
      r.roi.toFixed(2),
    ].join(','))
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `cohort-${Date.now()}.csv`; a.click()
  URL.revokeObjectURL(url)
}


// ─── Cell with color heatmap ───────────────────────────────────────────────
function HeatCell({ value, min, max, formatter, lowerIsBetter }) {
  if (value == null) return <span style={{ color: 'var(--muted2)' }}>—</span>
  const range = max - min || 1
  let intensity = (value - min) / range  // 0..1
  if (lowerIsBetter) intensity = 1 - intensity
  const alpha = 0.05 + intensity * 0.25
  const color = intensity > 0.66 ? OK : intensity > 0.33 ? BLUE : WARN
  return (
    <div style={{
      background: `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`,
      padding: '2px 6px', borderRadius: 4,
      fontFamily: FONT_DISPLAY, fontSize: 12, fontWeight: 700,
      color: 'var(--text)', textAlign: 'right',
    }}>
      {formatter(value)}
    </div>
  )
}


// ─── Main ──────────────────────────────────────────────────────────────────
export default function CohortAnalysisPage() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState('week')  // week | month
  const [aov, setAov] = useState(50)
  const [convFallback, setConvFallback] = useState(3.5)  // % when no real conv data

  useEffect(() => {
    let cancelled = false
    apiService.getMyCampaigns().then(res => {
      if (cancelled) return
      if (res?.success) {
        const items = (res.data?.items || res.data || []).filter(c =>
          ['PUBLISHED', 'COMPLETED'].includes(c.status)
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

  // Bucket campaigns by week or month
  const cohorts = useMemo(() => {
    const buckets = {}  // { 'YYYY-MM-DD': { date, list[] } }
    for (const c of campaigns) {
      const launchStr = c.publishedAt || c.paidAt || c.createdAt
      if (!launchStr) continue
      const launchDate = new Date(launchStr)
      if (isNaN(launchDate.getTime())) continue
      const bucketDate = period === 'week' ? startOfWeek(launchDate) : startOfMonth(launchDate)
      const key = bucketDate.toISOString().slice(0, 10)
      if (!buckets[key]) buckets[key] = { date: bucketDate, list: [] }
      buckets[key].list.push(c)
    }
    // Sort newest first
    return Object.values(buckets)
      .sort((a, b) => b.date - a.date)
      .map(b => {
        const list = b.list
        const spend = list.reduce((s, c) => s + (c.price || 0), 0)
        const impressions = list.reduce((s, c) => s + (c.tracking?.impressions || 0), 0)
        const clicks = list.reduce((s, c) => s + (c.tracking?.clicks || 0), 0)
        const realConv = list.reduce((s, c) => s + (c.tracking?.conversions || 0), 0)
        const conversions = realConv > 0 ? realConv : Math.round(clicks * (convFallback / 100))
        const revenue = conversions * aov

        return {
          date: b.date,
          label: fmtWeekLabel(b.date),
          count: list.length,
          spend, impressions, clicks, conversions, revenue,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          cpc: clicks > 0 ? spend / clicks : 0,
          cpa: conversions > 0 ? spend / conversions : 0,
          roi: spend > 0 ? ((revenue - spend) / spend) * 100 : 0,
          conversionsAreReal: realConv > 0,
        }
      })
  }, [campaigns, period, aov, convFallback])

  // Aggregate stats + best/worst
  const summary = useMemo(() => {
    if (cohorts.length === 0) return null
    const totalSpend = cohorts.reduce((s, c) => s + c.spend, 0)
    const totalRev = cohorts.reduce((s, c) => s + c.revenue, 0)
    const avgRoi = cohorts.reduce((s, c) => s + c.roi, 0) / cohorts.length
    const bestRoi = cohorts.reduce((b, c) => c.roi > b.roi ? c : b, cohorts[0])
    const worstRoi = cohorts.reduce((b, c) => c.roi < b.roi ? c : b, cohorts[0])
    return { totalSpend, totalRev, avgRoi, bestRoi, worstRoi, cohortCount: cohorts.length }
  }, [cohorts])

  // Min/max for heatmap intensity
  const ranges = useMemo(() => {
    const all = cohorts.filter(c => c.count > 0)
    return {
      ctr: { min: Math.min(...all.map(c => c.ctr), 0), max: Math.max(...all.map(c => c.ctr), 1) },
      cpa: { min: Math.min(...all.map(c => c.cpa).filter(v => v > 0), 0), max: Math.max(...all.map(c => c.cpa), 1) },
      roi: { min: Math.min(...all.map(c => c.roi), 0), max: Math.max(...all.map(c => c.roi), 1) },
    }
  }, [cohorts])

  return (
    <div style={{ fontFamily: FONT_BODY, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: purpleAlpha(0.12), border: `1px solid ${purpleAlpha(0.25)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Users size={20} color={PURPLE} />
            </div>
            <h1 style={{
              fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800,
              color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1, margin: 0,
            }}>
              Análisis por cohortes
            </h1>
          </div>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
            Agrupa campañas por semana/mes de lanzamiento y compara su rendimiento agregado.
          </p>
        </div>
        {cohorts.length > 0 && (
          <button onClick={() => downloadCSV(cohorts, period === 'week' ? 'semana' : 'mes')}
            style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 600,
              color: 'var(--text)', cursor: 'pointer', fontFamily: FONT_BODY,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <Download size={12} /> Exportar CSV
          </button>
        )}
      </div>

      {/* Period + advanced */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 14,
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={12} color="var(--muted)" />
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Agrupar por:</span>
          {[
            { key: 'week', label: 'Semana' },
            { key: 'month', label: 'Mes' },
          ].map(p => {
            const active = period === p.key
            return (
              <button key={p.key} onClick={() => setPeriod(p.key)} style={{
                background: active ? PURPLE : 'var(--bg2)',
                color: active ? '#fff' : 'var(--muted)',
                border: `1px solid ${active ? PURPLE : 'var(--border)'}`,
                borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: FONT_BODY,
              }}>{p.label}</button>
            )
          })}
        </div>
        <span style={{ borderLeft: '1px solid var(--border)', paddingLeft: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>AOV €</span>
          <input type="number" min="0" step="1" value={aov} onChange={e => setAov(Math.max(0, Number(e.target.value) || 0))}
            style={{
              width: 70, background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '4px 8px', fontSize: 12, color: 'var(--text)', fontFamily: FONT_BODY, outline: 'none',
            }} />
          <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>Conv. fallback %</span>
          <input type="number" min="0" max="100" step="0.5" value={convFallback} onChange={e => setConvFallback(Math.max(0, Number(e.target.value) || 0))}
            style={{
              width: 60, background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '4px 8px', fontSize: 12, color: 'var(--text)', fontFamily: FONT_BODY, outline: 'none',
            }} />
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
          borderRadius: 14, height: 300,
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      )}

      {/* Empty */}
      {!loading && cohorts.length === 0 && (
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
            No hay campañas con fechas de lanzamiento
          </h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 460, margin: '0 auto', lineHeight: 1.6 }}>
            Necesitas al menos una campaña publicada o completada para construir cohortes.
          </p>
        </div>
      )}

      {/* Summary */}
      {!loading && summary && (
        <>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12,
          }}>
            {[
              { label: 'Cohortes', val: summary.cohortCount, color: PURPLE, icon: Calendar },
              { label: 'Gasto total', val: fmtMoney(summary.totalSpend), color: BLUE, icon: TrendingUp },
              { label: 'Ingresos est.', val: fmtMoney(summary.totalRev), color: WARN, icon: TrendingUp },
              { label: 'ROI medio', val: `${summary.avgRoi > 0 ? '+' : ''}${summary.avgRoi.toFixed(0)}%`, color: summary.avgRoi >= 0 ? OK : ERR, icon: TrendingUp },
            ].map(s => (
              <div key={s.label} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <s.icon size={14} color={s.color} />
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {s.label}
                  </span>
                </div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
                  {s.val}
                </div>
              </div>
            ))}
          </div>

          {/* Best / worst */}
          {summary.cohortCount > 1 && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12,
            }}>
              <div style={{
                background: `${OK}06`, border: `1px solid ${OK}30`,
                borderRadius: 12, padding: 14,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <Trophy size={20} color={OK} />
                <div>
                  <div style={{ fontSize: 11, color: OK, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Mejor cohorte
                  </div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
                    {summary.bestRoi.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    ROI {summary.bestRoi.roi.toFixed(0)}% · CTR {summary.bestRoi.ctr.toFixed(2)}%
                  </div>
                </div>
              </div>
              <div style={{
                background: `${ERR}06`, border: `1px solid ${ERR}30`,
                borderRadius: 12, padding: 14,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <AlertTriangle size={20} color={ERR} />
                <div>
                  <div style={{ fontSize: 11, color: ERR, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Peor cohorte
                  </div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
                    {summary.worstRoi.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    ROI {summary.worstRoi.roi.toFixed(0)}% · CTR {summary.worstRoi.ctr.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cohort table */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, overflow: 'auto',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
                  {[period === 'week' ? 'Semana' : 'Mes', 'Camp.', 'Gasto', 'Imp.', 'Clicks', 'Conv.', 'CTR', 'CPC', 'CPA', 'Ingresos', 'ROI'].map(h => (
                    <th key={h} style={{
                      padding: '10px 12px', textAlign: 'left',
                      fontSize: 11, fontWeight: 700, color: 'var(--muted)',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontSize: 12.5, color: 'var(--text)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {c.label}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text)', textAlign: 'right', fontFamily: 'monospace' }}>{c.count}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text)', textAlign: 'right', fontFamily: 'monospace' }}>{fmtMoney(c.spend)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text)', textAlign: 'right', fontFamily: 'monospace' }}>{fmtNum(c.impressions)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text)', textAlign: 'right', fontFamily: 'monospace' }}>{fmtNum(c.clicks)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, textAlign: 'right', fontFamily: 'monospace' }}>
                      <span style={{ color: c.conversionsAreReal ? 'var(--text)' : 'var(--muted)' }}>
                        {fmtNum(c.conversions)}
                      </span>
                    </td>
                    <td style={{ padding: '6px 8px' }}><HeatCell value={c.ctr} {...ranges.ctr} formatter={fmtPct} /></td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text)', textAlign: 'right', fontFamily: 'monospace' }}>{c.cpc > 0 ? `€${c.cpc.toFixed(2)}` : '—'}</td>
                    <td style={{ padding: '6px 8px' }}><HeatCell value={c.cpa} {...ranges.cpa} formatter={v => `€${v.toFixed(2)}`} lowerIsBetter /></td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text)', textAlign: 'right', fontFamily: 'monospace' }}>{fmtMoney(c.revenue)}</td>
                    <td style={{ padding: '6px 8px' }}><HeatCell value={c.roi} {...ranges.roi} formatter={v => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Disclaimer */}
          {cohorts.some(c => !c.conversionsAreReal) && (
            <div style={{
              background: `${BLUE}08`, border: `1px solid ${BLUE}25`,
              borderRadius: 10, padding: '10px 14px',
              fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5,
            }}>
              <AlertTriangle size={12} color={BLUE} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                Algunas cohortes no tienen conversiones registradas — usamos un fallback del <strong style={{ color: 'var(--text)' }}>{convFallback}%</strong> sobre los clicks.
                Implementa el píxel de tracking para datos reales.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
