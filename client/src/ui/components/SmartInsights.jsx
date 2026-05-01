import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Lightbulb, TrendingUp, TrendingDown, AlertTriangle, Sparkles,
  Target, Pause, ArrowRight, ChevronDown, ChevronUp, Zap,
} from 'lucide-react'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE } from '../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'
const pa = (o) => `rgba(139,92,246,${o})`

/**
 * SmartInsights — rule-based suggestions extracted from campaign data.
 *
 * Pure heuristics (no ML, no API): given the same set of `campaigns`,
 * the same insights are produced. This keeps it deterministic, fast,
 * and explainable to the user (each insight links to its source data).
 *
 * Drop-in:
 *   <SmartInsights campaigns={campaigns} creditsBalance={user?.campaignCreditsBalance} />
 */
export default function SmartInsights({
  campaigns = [],
  creditsBalance = 0,
  spendDelta,
  className,
  maxItems = 4,
  startCollapsed = false,
}) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(!startCollapsed)
  const insights = useMemo(() => generateInsights({ campaigns, creditsBalance, spendDelta }), [campaigns, creditsBalance, spendDelta])

  if (insights.length === 0) return null

  const visible = expanded ? insights : insights.slice(0, 1)

  return (
    <div className={className} style={{
      background: 'var(--surface)',
      border: `1px solid ${pa(0.2)}`,
      borderRadius: 14, padding: 16,
      fontFamily: FONT_BODY,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: pa(0.15), border: `1px solid ${pa(0.3)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={14} color={PURPLE} />
          </div>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Insights inteligentes
          </span>
          <span style={{
            fontSize: 10.5, fontWeight: 700, color: PURPLE,
            background: pa(0.12), borderRadius: 20, padding: '1px 7px',
          }}>
            {insights.length}
          </span>
        </div>
        {insights.length > 1 && (
          <button onClick={() => setExpanded(e => !e)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--muted)', fontSize: 11.5, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4, fontFamily: FONT_BODY,
            }}
          >
            {expanded ? <>Ver menos <ChevronUp size={11} /></> : <>Ver todos ({insights.length}) <ChevronDown size={11} /></>}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visible.slice(0, maxItems).map((ins, i) => {
          const Icon = ins.icon
          return (
            <div key={ins.id || i}
              onClick={() => ins.path && navigate(ins.path)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 12px', borderRadius: 10,
                background: `${ins.color}08`,
                border: `1px solid ${ins.color}22`,
                cursor: ins.path ? 'pointer' : 'default',
                transition: 'background .12s, border-color .12s',
              }}
              onMouseEnter={e => { if (ins.path) { e.currentTarget.style.background = `${ins.color}14`; e.currentTarget.style.borderColor = `${ins.color}44` } }}
              onMouseLeave={e => { e.currentTarget.style.background = `${ins.color}08`; e.currentTarget.style.borderColor = `${ins.color}22` }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 7, background: `${ins.color}15`, border: `1px solid ${ins.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={13} color={ins.color} strokeWidth={2.2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                  {ins.title}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>
                  {ins.body}
                </div>
              </div>
              {ins.path && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: ins.color, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                  {ins.cta || 'Ver'} <ArrowRight size={11} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// RULES — pure functions, easy to add/remove. Each returns a { id, ... }
// object or null. The order they're defined here is the order they're shown
// (after sorting by priority).
// ─────────────────────────────────────────────────────────────────────────────

function generateInsights({ campaigns, creditsBalance, spendDelta }) {
  const all = [
    ruleTopPerformers(campaigns),
    ruleUnderperformers(campaigns),
    ruleHighDraftBalance(campaigns),
    ruleSpendSpike(spendDelta, campaigns),
    ruleScaleOpportunity(campaigns),
    ruleCreditsAvailable(creditsBalance),
    ruleStaleCampaigns(campaigns),
  ].filter(Boolean)

  // Sort by priority (lower = higher priority)
  all.sort((a, b) => (a.priority || 50) - (b.priority || 50))
  return all
}

// 1) Top performers worth scaling
function ruleTopPerformers(campaigns) {
  const active = campaigns.filter(c => c.status === 'PUBLISHED' || c.status === 'COMPLETED')
  const withMetrics = active
    .map(c => {
      const views = c.tracking?.impressions || c.views || 0
      const clicks = c.tracking?.clicks || c.clicks || 0
      const ctr = views > 0 ? (clicks / views) * 100 : 0
      return { c, ctr, views }
    })
    .filter(x => x.ctr >= 5 && x.views >= 100)
    .sort((a, b) => b.ctr - a.ctr)
    .slice(0, 3)

  if (withMetrics.length === 0) return null

  const names = withMetrics.map(x => x.c.title || x.c.content?.slice(0, 25) || 'Campaña').join(', ')
  return {
    id: 'top-performers',
    icon: TrendingUp,
    color: OK,
    priority: 10,
    title: `${withMetrics.length} campaña${withMetrics.length === 1 ? '' : 's'} con CTR > 5%`,
    body: `${names} están funcionando muy bien. Considera escalar el presupuesto o duplicar la creatividad.`,
    cta: 'Ver detalle',
    path: '/advertiser/campaigns?tab=publicada',
  }
}

// 2) Underperformers to pause
function ruleUnderperformers(campaigns) {
  const active = campaigns.filter(c => c.status === 'PUBLISHED')
  const losers = active
    .map(c => {
      const views = c.tracking?.impressions || c.views || 0
      const clicks = c.tracking?.clicks || c.clicks || 0
      const ctr = views > 0 ? (clicks / views) * 100 : 0
      const ageDays = (Date.now() - new Date(c.publishedAt || c.createdAt).getTime()) / 86400000
      return { c, ctr, views, ageDays }
    })
    .filter(x => x.ageDays >= 3 && x.views >= 200 && x.ctr < 1)

  if (losers.length === 0) return null
  return {
    id: 'underperformers',
    icon: TrendingDown,
    color: ERR,
    priority: 15,
    title: `${losers.length} campaña${losers.length === 1 ? '' : 's'} con bajo rendimiento`,
    body: `${losers.length === 1 ? 'Hay una campaña' : `Hay ${losers.length} campañas`} con CTR < 1% tras varios días. Considera pausarlas o cambiar la creatividad.`,
    cta: 'Revisar',
    path: '/advertiser/campaigns?tab=publicada',
  }
}

// 3) High balance in DRAFT campaigns (urgent — money tied up unpaid)
function ruleHighDraftBalance(campaigns) {
  const drafts = campaigns.filter(c => c.status === 'DRAFT')
  if (drafts.length === 0) return null
  const total = drafts.reduce((s, c) => s + (c.price || 0), 0)
  if (total < 50) return null
  return {
    id: 'draft-balance',
    icon: AlertTriangle,
    color: WARN,
    priority: 5,
    title: `€${total.toLocaleString('es')} en campañas sin pagar`,
    body: `Tienes ${drafts.length} campaña${drafts.length === 1 ? '' : 's'} en borrador esperando pago. Actívalas para que empiecen a publicarse.`,
    cta: 'Pagar',
    path: '/advertiser/campaigns?tab=borrador',
  }
}

// 4) Spend spike vs prev period
function ruleSpendSpike(spendDelta, campaigns) {
  if (!Number.isFinite(spendDelta)) return null
  if (spendDelta < 50) return null
  const total = campaigns
    .filter(c => c.status !== 'DRAFT' && c.status !== 'CANCELLED')
    .reduce((s, c) => s + (c.price || 0), 0)
  return {
    id: 'spend-spike',
    icon: Zap,
    color: BLUE,
    priority: 20,
    title: `Gasto +${spendDelta}% vs mes anterior`,
    body: `Tu gasto total de €${total.toLocaleString('es')} subió un ${spendDelta}% respecto al periodo anterior. Revisa que esté alineado con tu presupuesto.`,
    cta: 'Ver finanzas',
    path: '/advertiser/finances',
  }
}

// 5) Scale opportunity — completed campaigns with great ROI suggest doubling down
function ruleScaleOpportunity(campaigns) {
  const completed = campaigns.filter(c => c.status === 'COMPLETED')
  if (completed.length < 3) return null
  const channelStats = {}
  completed.forEach(c => {
    const name = typeof c.channel === 'object' ? c.channel?.nombreCanal : c.channel || 'unknown'
    if (!channelStats[name]) channelStats[name] = { views: 0, clicks: 0, spent: 0, count: 0 }
    channelStats[name].views += (c.tracking?.impressions || c.views || 0)
    channelStats[name].clicks += (c.tracking?.clicks || c.clicks || 0)
    channelStats[name].spent += (c.price || 0)
    channelStats[name].count++
  })
  const topChannel = Object.entries(channelStats)
    .map(([name, s]) => ({ name, ...s, ctr: s.views > 0 ? (s.clicks / s.views) * 100 : 0 }))
    .sort((a, b) => b.ctr - a.ctr)[0]

  if (!topChannel || topChannel.ctr < 3 || topChannel.count < 2) return null

  return {
    id: 'scale-opportunity',
    icon: Target,
    color: PURPLE,
    priority: 30,
    title: `${topChannel.name} es tu mejor canal`,
    body: `${topChannel.count} campañas completadas, CTR ${topChannel.ctr.toFixed(1)}%. Considera lanzar más campañas en este canal o canales similares.`,
    cta: 'Ver canales similares',
    path: '/advertiser/analyze/lookalike',
  }
}

// 6) Welcome credits available
function ruleCreditsAvailable(balance) {
  if (!balance || balance < 5) return null
  return {
    id: 'credits-available',
    icon: Sparkles,
    color: OK,
    priority: 25,
    title: `Tienes €${balance} en créditos`,
    body: `Aprovecha tu saldo de bienvenida para tu próxima campaña — se aplica automáticamente al pagar.`,
    cta: 'Lanzar campaña',
    path: '/advertiser/campaigns/new',
  }
}

// 7) Stale campaigns sitting in DRAFT for too long
function ruleStaleCampaigns(campaigns) {
  const stale = campaigns.filter(c => {
    if (c.status !== 'DRAFT') return false
    const days = (Date.now() - new Date(c.createdAt).getTime()) / 86400000
    return days >= 7
  })
  if (stale.length === 0) return null
  return {
    id: 'stale-drafts',
    icon: Pause,
    color: '#94a3b8',
    priority: 60,
    title: `${stale.length} borrador${stale.length === 1 ? '' : 'es'} de hace más de 7 días`,
    body: `Estos borradores llevan tiempo sin actividad. Pulsa para revisarlos y decidir si publicar o eliminar.`,
    cta: 'Revisar',
    path: '/advertiser/campaigns?tab=borrador',
  }
}
