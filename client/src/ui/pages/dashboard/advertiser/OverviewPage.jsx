import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, TrendingUp, TrendingDown, DollarSign, Megaphone,
  Activity, Clock, AlertTriangle, CheckCircle2, MessageSquare,
  ArrowRight, Sparkles,
} from 'lucide-react'
import { useAuth } from '../../../../auth/AuthContext'
import apiService from '../../../../services/api'
import {
  FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE,
} from '../../../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'
const purpleAlpha = (o) => `var(--accent-dim, rgba(139,92,246,${o}))`
import DashboardModule from '../../../components/DashboardModule'


// ─── Time-aware greeting ──────────────────────────────────────────────────────
function getGreeting(name) {
  const h = new Date().getHours()
  if (h >= 5 && h < 13)  return { text: `Buenos días, ${name}`, emoji: '☀️' }
  if (h >= 13 && h < 20) return { text: `Buenas tardes, ${name}`, emoji: '🌤️' }
  return                         { text: `Buenas noches, ${name}`, emoji: '🌙' }
}


// ─── KPI Card (simplified, no mock sparkline) ─────────────────────────────────
function KpiCard({ icon: Icon, label, value, change, changeLabel, accent = PURPLE, sublabel }) {
  const [hovered, setHovered] = useState(false)
  const isPositive = change > 0
  const TrendIcon = isPositive ? TrendingUp : TrendingDown
  const trendColor = isPositive ? OK : ERR

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${hovered ? purpleAlpha(0.35) : 'var(--border)'}`,
        borderRadius: '16px',
        padding: '22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        transition: 'border-color .2s, box-shadow .2s, transform .2s',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? `0 8px 32px ${purpleAlpha(0.1)}` : '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '11px',
          background: `${accent}15`, border: `1px solid ${accent}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={accent} strokeWidth={2} />
        </div>
        {change !== undefined && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '3px',
            background: `${trendColor}12`, border: `1px solid ${trendColor}25`,
            borderRadius: '20px', padding: '2px 8px',
          }}>
            <TrendIcon size={11} color={trendColor} strokeWidth={2.5} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: trendColor }}>
              {isPositive ? '+' : ''}{change}%
            </span>
          </div>
        )}
      </div>

      <div>
        <div style={{
          fontSize: '28px', fontWeight: 800, fontFamily: FONT_DISPLAY, color: 'var(--text)',
          letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '4px',
        }}>
          {value}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{label}</div>
        {sublabel && <div style={{ fontSize: '11px', color: 'var(--muted2)', marginTop: '4px' }}>{sublabel}</div>}
        {changeLabel && change !== undefined && (
          <div style={{ fontSize: '11px', color: 'var(--muted2)', marginTop: '6px' }}>{changeLabel}</div>
        )}
      </div>
    </div>
  )
}


// ─── Bar chart (monthly spend) ────────────────────────────────────────────────
function BarChart({ data }) {
  const [hoverIdx, setHoverIdx] = useState(null)
  if (!data || data.length === 0) {
    return (
      <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
        Sin datos de gasto este periodo
      </div>
    )
  }
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '120px', paddingBottom: '20px' }}>
      {data.map((d, i) => {
        const isLast = i === data.length - 1
        const isHov  = hoverIdx === i
        const pct    = (d.value / max) * 100

        return (
          <div key={i}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', cursor: 'default' }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '100%' }}>
              {(isHov || isLast) && (
                <div style={{ fontSize: '11px', color: isLast ? PURPLE : 'var(--muted)', fontWeight: 700, textAlign: 'center', marginBottom: '4px' }}>
                  €{d.value}
                </div>
              )}
              <div style={{
                width: '100%', borderRadius: '6px 6px 0 0', minHeight: '4px',
                height: `${pct}%`,
                background: isLast
                  ? `linear-gradient(180deg, ${purpleAlpha(0.9)} 0%, ${PURPLE} 100%)`
                  : isHov
                    ? purpleAlpha(0.5)
                    : purpleAlpha(0.3),
                transition: 'background .15s, height .4s cubic-bezier(.4,0,.2,1)',
              }} />
            </div>
            <span style={{ fontSize: '10px', color: isLast ? PURPLE : 'var(--muted)', fontWeight: isLast ? 600 : 400, whiteSpace: 'nowrap' }}>
              {d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}


// ─── Campaign row ─────────────────────────────────────────────────────────────
function CampaignRow({ ad, isLast }) {
  const [hovered, setHovered] = useState(false)
  const navigate = useNavigate()

  const statusCfg = {
    DRAFT:      { color: WARN, bg: `${WARN}12`, label: 'Borrador'  },
    PAID:       { color: BLUE, bg: `${BLUE}12`, label: 'Pagada'    },
    PUBLISHED:  { color: OK,   bg: `${OK}12`,   label: 'Activa'    },
    COMPLETED:  { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', label: 'Completada' },
    CANCELLED:  { color: ERR,  bg: `${ERR}12`,  label: 'Cancelada' },
  }[ad.status] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', label: ad.status }

  const channelName = typeof ad.channel === 'object' ? ad.channel?.nombreCanal : ad.channel || ''
  const views = ad.tracking?.impressions || ad.views || 0
  const clicks = ad.tracking?.clicks || ad.clicks || 0
  const ctr = views > 0 ? ((clicks / views) * 100).toFixed(1) : (ad.ctr || 0)
  const spent = ad.price || ad.spent || ad.budget || 0

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 80px 72px 72px 80px',
        alignItems: 'center',
        padding: '13px 20px',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        background: hovered ? 'var(--bg2)' : 'transparent',
        transition: 'background .12s',
        cursor: 'pointer',
        gap: '12px',
      }}
      onClick={() => navigate('/advertiser/campaigns')}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ad.title || ad.content?.slice(0, 50) || 'Campaña'}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{channelName}</div>
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500 }}>{Number(views).toLocaleString('es')}</div>
      <div style={{ fontSize: '13px', color: Number(ctr) > 4 ? OK : 'var(--text)', fontWeight: 600 }}>{ctr}%</div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>€{spent}</div>
      <span style={{
        background: statusCfg.bg, color: statusCfg.color,
        border: `1px solid ${statusCfg.color}35`,
        borderRadius: '20px', padding: '3px 9px', fontSize: '11px', fontWeight: 600,
        whiteSpace: 'nowrap', display: 'inline-block',
      }}>
        {statusCfg.label}
      </span>
    </div>
  )
}


// ─── Action card (Requiere atención) ───────────────────────────────────────────
function ActionCard({ icon: Icon, color, count, title, description, ctaLabel, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${hovered ? color : 'var(--border)'}`,
        borderRadius: 14,
        padding: 18,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'border-color .15s, transform .15s, box-shadow .15s',
        transform: hovered ? 'translateY(-1px)' : 'none',
        boxShadow: hovered ? `0 6px 20px ${color}20` : 'none',
        fontFamily: FONT_BODY,
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `${color}15`, border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        position: 'relative',
      }}>
        <Icon size={20} color={color} strokeWidth={2} />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: -6, right: -6,
            minWidth: 20, height: 20, padding: '0 6px',
            background: color, color: '#fff',
            borderRadius: 10, fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--surface)',
          }}>{count}</span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', marginBottom: 2, fontFamily: FONT_DISPLAY }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>
          {description}
        </div>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        color: hovered ? color : 'var(--muted)',
        fontSize: 12, fontWeight: 600, flexShrink: 0,
        transition: 'color .15s',
      }}>
        {ctaLabel}
        <ArrowRight size={14} />
      </div>
    </button>
  )
}


// ─── Main page ────────────────────────────────────────────────────────────────
export default function OverviewPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [monthlySpend, setMonthlySpend] = useState([])
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [campsRes, txRes] = await Promise.all([
          apiService.getMyCampaigns().catch(() => null),
          apiService.getMyTransactions().catch(() => null),
        ])
        if (!mounted) return
        if (campsRes?.success) {
          const items = Array.isArray(campsRes.data) ? campsRes.data : Array.isArray(campsRes.data?.items) ? campsRes.data.items : []
          setCampaigns(items)
          // Sum unread chat messages from each campaign if exposed by API
          const unread = items.reduce((s, c) => s + (c.unreadMessages || c.unreadCount || 0), 0)
          setUnreadMessages(unread)
        }
        if (txRes?.success) {
          const txItems = Array.isArray(txRes.data) ? txRes.data : Array.isArray(txRes.data?.items) ? txRes.data.items : []
          const labels = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
          const buckets = {}
          txItems.forEach(tx => {
            const d = new Date(tx.paidAt || tx.createdAt)
            if (isNaN(d.getTime())) return
            const key = `${d.getFullYear()}-${d.getMonth()}`
            if (!buckets[key]) buckets[key] = { label: labels[d.getMonth()], value: 0, ts: d.getTime() }
            buckets[key].value += Math.abs(tx.amount || 0)
          })
          const sorted = Object.values(buckets).sort((a, b) => a.ts - b.ts).slice(-6)
          if (sorted.length > 0) setMonthlySpend(sorted)
        }
      } catch (err) {
        console.error('OverviewPage.load failed:', err)
      }
      if (mounted) setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  const nombre   = user?.nombre || user?.name || 'Usuario'
  const greeting = getGreeting(nombre.split(' ')[0])

  // ─── KPIs from real data ─────────────────────────────────────────────────────
  const totalSpend = campaigns
    .filter(c => c.status !== 'DRAFT' && c.status !== 'CANCELLED')
    .reduce((s, c) => s + (c.price || c.spent || 0), 0)
  const activeAds = campaigns.filter(c => c.status === 'PUBLISHED' || c.status === 'PAID').length
  const totalViews = campaigns.reduce((s, c) => s + (c.tracking?.impressions || c.views || 0), 0)
  const totalClicks = campaigns.reduce((s, c) => s + (c.tracking?.clicks || c.clicks || 0), 0)
  const avgCtr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0'

  // Prev-month delta (compute if we have at least 2 months)
  const spendDelta = (() => {
    if (monthlySpend.length < 2) return undefined
    const cur = monthlySpend[monthlySpend.length - 1].value
    const prev = monthlySpend[monthlySpend.length - 2].value
    if (prev === 0) return undefined
    return Math.round(((cur - prev) / prev) * 100)
  })()

  // ─── Action items ────────────────────────────────────────────────────────────
  const draftsCount = campaigns.filter(c => c.status === 'DRAFT').length
  const publishedCount = campaigns.filter(c => c.status === 'PUBLISHED').length

  const actionItems = []
  if (draftsCount > 0) {
    actionItems.push({
      icon: AlertTriangle, color: WARN, count: draftsCount,
      title: 'Campañas pendientes de pago',
      description: `Activa el escrow para que ${draftsCount === 1 ? 'tu campaña pase' : 'tus campañas pasen'} a publicación.`,
      ctaLabel: 'Pagar', onClick: () => navigate('/advertiser/campaigns?tab=borrador'),
    })
  }
  if (publishedCount > 0) {
    actionItems.push({
      icon: CheckCircle2, color: OK, count: publishedCount,
      title: 'Campañas listas para liberar',
      description: `${publishedCount === 1 ? 'Una campaña ha sido publicada' : `${publishedCount} campañas han sido publicadas`} y esperan tu confirmación para liberar el pago al creador.`,
      ctaLabel: 'Revisar', onClick: () => navigate('/advertiser/campaigns?tab=publicada'),
    })
  }
  if (unreadMessages > 0) {
    actionItems.push({
      icon: MessageSquare, color: BLUE, count: unreadMessages,
      title: 'Mensajes sin leer',
      description: `Tienes ${unreadMessages} ${unreadMessages === 1 ? 'mensaje nuevo' : 'mensajes nuevos'} de creadores en tus campañas.`,
      ctaLabel: 'Ver chat', onClick: () => navigate('/advertiser/campaigns'),
    })
  }
  if (campaigns.length === 0) {
    actionItems.push({
      icon: Sparkles, color: PURPLE, count: 0,
      title: 'Lanza tu primera campaña',
      description: 'Empieza explorando nuestros canales o usa Auto-Buy para que la IA encuentre los mejores para ti.',
      ctaLabel: 'Empezar', onClick: () => navigate('/advertiser/explore'),
    })
  }

  return (
    <div style={{ fontFamily: FONT_BODY, display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1200px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '28px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
              {greeting.text}
            </h1>
            <span style={{ fontSize: '24px' }}>{greeting.emoji}</span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.5 }}>
            {activeAds > 0
              ? <>Tienes <span style={{ color: PURPLE, fontWeight: 600 }}>{activeAds} {activeAds === 1 ? 'campaña activa' : 'campañas activas'}</span> ahora mismo</>
              : 'Resumen de tu actividad'}
          </p>
        </div>
        <button
          onClick={() => navigate('/advertiser/campaigns/new')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: PURPLE, color: '#fff', border: 'none', borderRadius: '12px',
            padding: '11px 20px', fontSize: '14px', fontWeight: 600,
            cursor: 'pointer', fontFamily: FONT_BODY, boxShadow: `0 4px 16px ${purpleAlpha(0.35)}`,
            transition: 'transform .15s, box-shadow .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${purpleAlpha(0.4)}` }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 16px ${purpleAlpha(0.35)}` }}
        >
          <Plus size={16} strokeWidth={2.5} /> Nueva campaña
        </button>
      </div>

      {/* ── KPI grid (3 cards) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <KpiCard
          icon={DollarSign}
          label="Gasto este mes"
          value={`€${totalSpend.toLocaleString('es')}`}
          change={spendDelta}
          changeLabel={spendDelta !== undefined ? 'vs mes anterior' : undefined}
          accent={PURPLE}
        />
        <KpiCard
          icon={Megaphone}
          label="Campañas activas"
          value={activeAds}
          sublabel={`${campaigns.length} totales`}
          accent={OK}
        />
        <KpiCard
          icon={Activity}
          label="CTR promedio"
          value={`${avgCtr}%`}
          sublabel={`${totalClicks.toLocaleString('es')} clicks · ${totalViews.toLocaleString('es')} vistas`}
          accent={BLUE}
        />
      </div>

      {/* ── Requiere atención ── */}
      {actionItems.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <h2 style={{
              fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700,
              color: 'var(--text)', letterSpacing: '-0.02em', margin: 0,
            }}>
              Requiere atención
            </h2>
            <span style={{
              fontSize: 11, fontWeight: 700, color: PURPLE,
              background: purpleAlpha(0.12), border: `1px solid ${purpleAlpha(0.25)}`,
              borderRadius: 20, padding: '2px 8px',
            }}>
              {actionItems.length}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
            {actionItems.map((item, i) => (
              <ActionCard key={i} {...item} />
            ))}
          </div>
        </div>
      )}

      {/* ── 2-col main layout: Spend chart + Recent campaigns ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.6fr)', gap: '20px' }}>

        {/* Monthly spend chart */}
        <DashboardModule
          title="Gasto mensual"
          icon={DollarSign}
          tooltip="Gasto acumulado en campañas publicadas y completadas por mes."
          linkTo="/advertiser/finances"
          linkLabel="Ver detalle"
        >
          <BarChart data={monthlySpend} />
        </DashboardModule>

        {/* Recent campaigns table */}
        <DashboardModule
          title="Campañas recientes"
          icon={Megaphone}
          tooltip={`${campaigns.length} campañas en total. Haz clic para ver el detalle.`}
          linkTo="/advertiser/campaigns"
          linkLabel="Ver todas"
          noPadding
        >
          {campaigns.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
                Aún no tienes campañas
              </div>
              <button
                onClick={() => navigate('/advertiser/campaigns/new')}
                style={{
                  background: purpleAlpha(0.1), color: PURPLE,
                  border: `1px solid ${purpleAlpha(0.3)}`, borderRadius: 8,
                  padding: '8px 16px', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: FONT_BODY,
                }}
              >
                Crear primera campaña
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 72px 72px 80px', padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', gap: '12px' }}>
                {['Campaña', 'Vistas', 'CTR', 'Gasto', 'Estado'].map(h => (
                  <div key={h} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                ))}
              </div>
              {campaigns.slice(0, 5).map((ad, i) => (
                <CampaignRow
                  key={ad.id || ad._id}
                  ad={ad}
                  isLast={i === Math.min(4, campaigns.length - 1)}
                />
              ))}
            </>
          )}
        </DashboardModule>
      </div>
    </div>
  )
}
