import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Wallet, TrendingUp, ArrowDownLeft, ArrowUpRight, Download, Plus, CheckCircle, Clock, AlertCircle, BarChart3, Receipt, CreditCard } from 'lucide-react'
import apiService from '../../../../services/api'
import { SkeletonPage } from '../../../components/Skeleton'
import EmptyState from '../../../components/EmptyState'
import {
  PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY, OK, WARN, BLUE,
} from '../../../theme/tokens'
import MetricCard, { computeDelta } from '../../../components/MetricCard'


// ─── Tab config ───────────────────────────────────────────────────────────────
const FIN_TABS = [
  { key: 'resumen',       label: 'Resumen',        icon: BarChart3 },
  { key: 'transacciones', label: 'Transacciones',  icon: Receipt },
  { key: 'pagos',         label: 'Métodos de pago', icon: CreditCard },
]


// ─── Status config ───────────────────────────────────────────────────────────
// Mirrors the Transaccion model. A tipo:'pago' row moves pending → escrow →
// paid, where 'paid' means the escrow was RELEASED to the creator (both
// campaignController and disputeController flip escrow→paid on release).
// There is no 'released' status in the model — the old key here never matched,
// which is why "Liberado a creadores" was permanently €0 while released money
// was being reported as "En escrow".
const STATUS_CFG = {
  pending:    { label: 'Pendiente',   color: WARN, icon: Clock },
  processing: { label: 'Procesando',  color: WARN, icon: Clock },
  escrow:     { label: 'En escrow',   color: BLUE, icon: Clock },
  paid:       { label: 'Liberado',    color: OK,   icon: CheckCircle },
  refunded:   { label: 'Reembolsado', color: '#ef4444', icon: AlertCircle },
  failed:     { label: 'Fallido',     color: '#ef4444', icon: AlertCircle },
}

// ─── Enhanced bar chart ────────────────────────────────────────────────────────
const BarChart = ({ data }) => {
  const max = Math.max(...data.map(d => d.value), 1)
  const [hoverIdx, setHoverIdx] = useState(null)

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
                  ? `linear-gradient(180deg, ${purpleAlpha(1)} 0%, #7c3aed 100%)`
                  : isHov ? purpleAlpha(0.55) : purpleAlpha(0.3),
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

// ─── Transaction type icon ─────────────────────────────────────────────────────
function TxIcon({ type }) {
  const cfg = {
    escrow:   { icon: '🔒', color: BLUE, bg: `${BLUE}12` },
    released: { icon: '📢', color: PURPLE, bg: purpleAlpha(0.1) },
    pending:  { icon: '🕓', color: WARN, bg: `${WARN}12` },
    payout:   { icon: '💸', color: OK,   bg: `${OK}12`   },
    refund:   { icon: '↩️', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    recarga:  { icon: '💳', color: OK,   bg: `${OK}12`   },
    referral: { icon: '🎁', color: OK,   bg: `${OK}12`   },
  }[type] || { icon: '💰', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' }

  return (
    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
      {cfg.icon}
    </div>
  )
}

// NOTE: the "Recargar saldo" modal lived here and was removed deliberately.
// It drove POST /api/transacciones/create-checkout-session, which charged a
// real card for a balance that main has no way to credit or spend. The
// endpoint now returns 503 unless WALLET_TOPUP_ENABLED === 'true'; restore
// this UI together with the spendable wallet from feat/track-b-wallet.

// ─── Helper: normalize API transactions to display format ─────────────────────
// A tipo:'pago' row is advertiser spend; everything else is money or credit
// coming IN and must never be counted as spend or as escrow.
const isSpendTx = tx => !tx.tipo || tx.tipo === 'pago'

// Money the advertiser has paid that is still held by the platform.
const isEscrowTx = tx => isSpendTx(tx) && tx.status === 'escrow'

// Money the advertiser paid that has since been released to the creator.
const isReleasedTx = tx => isSpendTx(tx) && tx.status === 'paid'

function normalizeTx(tx) {
  const id = tx._id || tx.id
  const date = tx.paidAt || tx.createdAt
  const dateStr = date ? new Date(date).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
  const status = tx.status || 'pending'
  const amount = tx.amount || 0

  // The API returns `tipo` (Transaccion model), never `type`. Reading `tx.type`
  // meant every row was typed 'escrow', which broke the filters and the icons.
  let type
  if (tx.tipo === 'recarga') type = 'recarga'
  else if (tx.tipo === 'referral') type = 'referral'
  else if (tx.tipo === 'retiro') type = 'payout'
  else if (tx.tipo === 'reembolso' || status === 'refunded') type = 'refund'
  else if (status === 'paid') type = 'released'
  else if (status === 'escrow') type = 'escrow'
  else type = 'pending'

  // Build description from campaign info
  let desc = ''
  if (tx.description) {
    desc = tx.description.slice(0, 60)
  } else if (tx.campaign?.content) {
    desc = tx.campaign.content.slice(0, 60)
  } else if (tx.campaign?.channel?.nombreCanal) {
    desc = `Campaña — ${tx.campaign.channel.nombreCanal}`
  } else if (type === 'refund') {
    desc = 'Reembolso de campaña'
  } else if (type === 'recarga') {
    desc = 'Recarga de saldo'
  } else if (type === 'referral') {
    desc = 'Crédito por referido'
  } else if (type === 'payout') {
    desc = 'Retiro'
  } else {
    desc = 'Pago de campaña'
  }

  // Negative = out of the advertiser's pocket.
  const incoming = type === 'refund' || type === 'recarga' || type === 'referral'
  return { id, date: dateStr, desc, type, amount: incoming ? Math.abs(amount) : -Math.abs(amount), status }
}

// ─── Helper: build monthly spend from transactions ────────────────────────────
function buildMonthlySpend(transactions) {
  const months = {}
  const labels = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  transactions.forEach(tx => {
    const d = new Date(tx.paidAt || tx.createdAt)
    if (isNaN(d.getTime())) return
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (!months[key]) months[key] = { label: `${labels[d.getMonth()]}`, value: 0, ts: d.getTime() }
    // Campaign spend only: recargas, referral credits, retiros and refunds are
    // not money spent on campaigns.
    if (isSpendTx(tx) && tx.status !== 'refunded') months[key].value += Math.abs(tx.amount || 0)
  })
  return Object.values(months).sort((a, b) => a.ts - b.ts).slice(-12)
}

// ─── Spending breakdown from transactions ─────────────────────────────────────
function buildPlatformBreakdown(transactions) {
  // Channel.plataforma is stored lowercase ('telegram'); map to the display
  // name so it matches PLAT_COLORS and never renders as raw/"Otros" when known.
  const PLAT_LABELS = { telegram: 'Telegram', whatsapp: 'WhatsApp', instagram: 'Instagram', discord: 'Discord', newsletter: 'Newsletter', facebook: 'Facebook', linkedin: 'LinkedIn' }
  const byPlatform = {}
  let total = 0
  transactions.forEach(tx => {
    if (!isSpendTx(tx) || tx.status === 'refunded') return
    const raw = tx.campaign?.channel?.plataforma
    const plat = raw
      ? (PLAT_LABELS[String(raw).toLowerCase()] || (String(raw).charAt(0).toUpperCase() + String(raw).slice(1)))
      : 'Otros'
    const amt = Math.abs(tx.amount || 0)
    byPlatform[plat] = (byPlatform[plat] || 0) + amt
    total += amt
  })
  const PLAT_COLORS = { Telegram: '#2aabee', Instagram: '#e1306c', Newsletter: '#f59e0b', Discord: '#5865f2', WhatsApp: '#25d366', Facebook: '#1877f2' }
  return Object.entries(byPlatform)
    .sort((a, b) => b[1] - a[1])
    .map(([label, amount]) => ({
      label,
      amount: Math.round(amount),
      pct: total > 0 ? Math.round((amount / total) * 100) : 0,
      color: PLAT_COLORS[label] || '#94a3b8',
    }))
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function FinancesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [txFilter, setTxFilter] = useState('todos')
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [rawTx, setRawTx] = useState([])
  const [activeTab, setActiveTab] = useState(() => {
    const t = searchParams.get('tab')
    return FIN_TABS.find(x => x.key === t) ? t : 'resumen'
  })

  const handleTabChange = (key) => {
    setActiveTab(key)
    if (key === 'resumen') searchParams.delete('tab')
    else searchParams.set('tab', key)
    setSearchParams(searchParams, { replace: true })
  }

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await apiService.getMyTransactions()
        if (!mounted) return
        if (res?.success) {
          const items = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.items) ? res.data.items : []
          setRawTx(items)
          setTransactions(items.map(normalizeTx))
        }
      } catch (err) { console.error('FinancesPage.loadTransactions failed:', err) /* empty state */ }
      if (mounted) setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  // Escrow = campaign money paid and still held by the platform. This used to
  // be `status === 'paid'`, which summed released payments, recargas, referral
  // credits and retiros — everything except the escrow it claimed to show.
  const balance     = rawTx.filter(isEscrowTx).reduce((s, t) => s + Math.abs(t.amount || 0), 0)
  const totalSpend  = rawTx.filter(t => isSpendTx(t) && t.status !== 'refunded' && t.status !== 'pending')
                           .reduce((s, t) => s + Math.abs(t.amount || 0), 0)
  const txCount     = transactions.length

  const monthlyData = buildMonthlySpend(rawTx)
  const platformBreakdown = buildPlatformBreakdown(rawTx)

  // Breakdown by transaction status (escrow, released, refunded, etc.) for the
  // hover popover on the "En escrow" card
  const statusBreakdown = (() => {
    const buckets = {}
    rawTx.filter(isSpendTx).forEach(tx => {
      const k = tx.status || 'other'
      if (!buckets[k]) buckets[k] = 0
      buckets[k] += Math.abs(tx.amount || 0)
    })
    const colors = { escrow: BLUE, paid: OK, pending: WARN, processing: WARN, refunded: '#ef4444', failed: '#ef4444', other: '#94a3b8' }
    const labels = { escrow: 'En escrow', paid: 'Liberado', pending: 'Pendiente', processing: 'Procesando', refunded: 'Reembolsado', failed: 'Fallido', other: 'Otros' }
    return Object.entries(buckets)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ label: labels[k] || k, value: v, color: colors[k] || '#94a3b8' }))
      .sort((a, b) => b.value - a.value)
  })()

  // Breakdown by month for the "Gasto total" card popover
  const monthBreakdown = monthlyData.slice(-6).map(m => ({
    label: m.label,
    value: m.value,
    color: PURPLE,
  })).filter(m => m.value > 0)

  // ── Sparkline + delta helpers (last 6 months bucketed) ──────────────────────
  const monthlySparkSpend = monthlyData.map(m => m.value)
  const monthlySparkReleased = (() => {
    const labels = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    const buckets = {}
    rawTx.filter(isReleasedTx).forEach(t => {
      const d = new Date(t.paidAt || t.createdAt)
      if (isNaN(d.getTime())) return
      const k = `${d.getFullYear()}-${d.getMonth()}`
      if (!buckets[k]) buckets[k] = { ts: d.getTime(), v: 0 }
      buckets[k].v += Math.abs(t.amount || 0)
    })
    return Object.values(buckets).sort((a,b) => a.ts - b.ts).slice(-6).map(b => b.v)
  })()
  const monthlySparkBalance = (() => {
    // running escrow balance per month bucket
    const labels = []
    const buckets = {}
    rawTx.forEach(t => {
      const d = new Date(t.paidAt || t.createdAt)
      if (isNaN(d.getTime())) return
      const k = `${d.getFullYear()}-${d.getMonth()}`
      if (!buckets[k]) buckets[k] = { ts: d.getTime(), v: 0 }
      if (isEscrowTx(t)) buckets[k].v += Math.abs(t.amount || 0)
    })
    return Object.values(buckets).sort((a,b) => a.ts - b.ts).slice(-6).map(b => b.v)
  })()

  const spendDelta = computeDelta(
    monthlySparkSpend[monthlySparkSpend.length - 1],
    monthlySparkSpend[monthlySparkSpend.length - 2],
  )
  const releasedTotal = rawTx.filter(isReleasedTx).reduce((s,t) => s + Math.abs(t.amount||0), 0)
  const releasedDelta = computeDelta(
    monthlySparkReleased[monthlySparkReleased.length - 1],
    monthlySparkReleased[monthlySparkReleased.length - 2],
  )
  const balanceDelta = computeDelta(
    monthlySparkBalance[monthlySparkBalance.length - 1],
    monthlySparkBalance[monthlySparkBalance.length - 2],
  )

  const filteredTx = transactions.filter(tx => {
    if (txFilter === 'todos') return true
    if (txFilter === 'escrow') return tx.type === 'escrow' || tx.type === 'pending'
    if (txFilter === 'released') return tx.type === 'released'
    if (txFilter === 'refund') return tx.type === 'refund' || tx.type === 'payout'
    return tx.type === txFilter
  })

  if (loading) {
    return <SkeletonPage />
  }

  return (
    <div style={{ fontFamily: FONT_BODY, display: 'flex', flexDirection: 'column', gap: '26px', maxWidth: '1100px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '28px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: '4px' }}>Finanzas</h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)' }}>
            {activeTab === 'resumen' && 'Tu saldo, gasto mensual y rendimiento por plataforma'}
            {activeTab === 'transacciones' && 'Historial completo de movimientos y facturas'}
            {activeTab === 'pagos' && 'Tarjetas guardadas y métodos de pago'}
          </p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '2px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '3px', width: 'fit-content' }}>
        {FIN_TABS.map(({ key, label, icon: Icon }) => {
          const active = activeTab === key
          return (
            <button key={key} onClick={() => handleTabChange(key)} style={{
              background: active ? PURPLE : 'transparent',
              color: active ? '#fff' : 'var(--muted)',
              border: 'none', borderRadius: '9px', padding: '8px 14px',
              fontSize: '13px', fontWeight: active ? 600 : 400,
              cursor: 'pointer', fontFamily: FONT_BODY,
              transition: 'all .18s ease',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <Icon size={13} />
              {label}
            </button>
          )
        })}
      </div>

      {/* ── RESUMEN tab content ── */}
      {activeTab === 'resumen' && (<React.Fragment>

      {/* ── Balance + KPI row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>

        {/* Balance hero card */}
        <div style={{ background: `linear-gradient(135deg, ${PURPLE} 0%, #7c3aed 100%)`, borderRadius: '18px', padding: '24px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ position: 'absolute', bottom: '-30px', right: '20px', width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <Wallet size={20} color="rgba(255,255,255,0.7)" style={{ marginBottom: '12px' }} />
          <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '6px' }}>Saldo en escrow</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: '38px', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '8px' }}>
            €{Math.abs(balance).toLocaleString('es')}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.7 }}>Fondos retenidos en campañas activas</div>
          <div style={{ marginTop: '16px', fontSize: '12px', opacity: 0.7, lineHeight: 1.5 }}>
            Cada campaña se paga con tarjeta al contratarla.
          </div>
        </div>

        {/* KPI cards — Stripe-style with sparklines + deltas + drill-down */}
        <MetricCard
          icon={TrendingUp}
          label="Gasto total"
          value={`€${totalSpend.toLocaleString('es')}`}
          sublabel={`${txCount} transacciones`}
          accent={BLUE}
          delta={spendDelta}
          deltaLabel="vs mes anterior"
          spark={monthlySparkSpend}
          breakdown={monthBreakdown}
          breakdownTitle="Por mes (últimos 6)"
          breakdownFormat="currency"
        />
        <MetricCard
          icon={ArrowDownLeft}
          label="En escrow"
          value={`€${Math.abs(balance).toLocaleString('es')}`}
          sublabel="Retenido en campañas"
          accent={PURPLE}
          delta={balanceDelta}
          deltaLabel="vs mes anterior"
          spark={monthlySparkBalance}
          breakdown={statusBreakdown}
          breakdownTitle="Por estado de pago"
          breakdownFormat="currency"
        />
        <MetricCard
          icon={ArrowUpRight}
          label="Liberado a creadores"
          value={`€${releasedTotal.toLocaleString('es', { maximumFractionDigits: 0 })}`}
          sublabel="Pagado a creadores"
          accent={OK}
          delta={releasedDelta}
          deltaLabel="vs mes anterior"
          spark={monthlySparkReleased}
          breakdown={platformBreakdown.map(p => ({ label: p.label, value: p.amount, color: p.color }))}
          breakdownTitle="Por plataforma"
          breakdownFormat="currency"
        />
      </div>

      {/* ── 2-col: chart + breakdown ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>

        {/* Monthly spend chart */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Gasto mensual</h2>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '18px' }}>Histórico de gasto en campañas</p>
          <BarChart data={monthlyData} />
        </div>

        {/* Spending breakdown */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', padding: '22px' }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>Desglose por plataforma</h2>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '18px' }}>Histórico</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {platformBreakdown.map(cat => (
              <div key={cat.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color }} />
                    <span style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500 }}>{cat.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{cat.pct}%</span>
                    <span style={{ fontFamily: FONT_DISPLAY, fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>€{cat.amount}</span>
                  </div>
                </div>
                <div style={{ height: '5px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${cat.pct}%`, background: `linear-gradient(90deg, ${cat.color} 0%, ${cat.color}80 100%)`, borderRadius: '3px', transition: 'width .5s ease' }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>Total</span>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: '16px', fontWeight: 800, color: PURPLE }}>€{platformBreakdown.reduce((s, c) => s + c.amount, 0).toLocaleString('es')}</span>
          </div>
        </div>
      </div>

      </React.Fragment>)}

      {/* ── TRANSACCIONES tab content ── */}
      {activeTab === 'transacciones' && (<React.Fragment>

      {/* ── Transactions ── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>Historial de transacciones</h2>
            <p style={{ fontSize: '12px', color: 'var(--muted)' }}>{transactions.length} movimientos registrados</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '9px', overflow: 'hidden' }}>
              {['todos', 'escrow', 'released', 'refund'].map(f => (
                <button key={f} onClick={() => setTxFilter(f)} style={{
                  background: txFilter === f ? purpleAlpha(0.12) : 'transparent', border: 'none',
                  padding: '6px 14px', fontSize: '12px', fontWeight: txFilter === f ? 600 : 400,
                  color: txFilter === f ? PURPLE : 'var(--muted)', cursor: 'pointer', fontFamily: FONT_BODY,
                  borderRight: f !== 'refund' ? '1px solid var(--border)' : 'none',
                }}>
                  {f === 'todos' ? 'Todos' : f === 'escrow' ? 'Escrow' : f === 'released' ? 'Liberados' : 'Reembolsos'}
                </button>
              ))}
            </div>
            <button style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '9px', padding: '7px 14px', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', cursor: 'pointer', fontFamily: FONT_BODY }}>
              <Download size={13} /> Exportar CSV
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '620px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
                {['Transacción', 'Fecha', 'Tipo', 'Importe', 'Estado'].map(h => (
                  <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTx.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '0' }}>
                    <EmptyState
                      icon={Wallet}
                      title="Sin transacciones"
                      description={txFilter === 'todos' ? 'Aun no tienes movimientos. Apareceran aqui cuando contrates tu primera campana.' : 'No hay transacciones en esta categoria.'}
                    />
                  </td>
                </tr>
              ) : filteredTx.map((tx, i) => {
                const sCfg = STATUS_CFG[tx.status] || STATUS_CFG.pending
                const SIcon = sCfg.icon
                return (
                  <tr key={tx.id || i}
                    style={{ borderBottom: i < filteredTx.length - 1 ? '1px solid var(--border)' : 'none' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg2)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <td style={{ padding: '15px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <TxIcon type={tx.type} />
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.desc}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                            #{String(tx.id).slice(-6).padStart(6, '0')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '15px 20px', fontSize: '13px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={11} />
                        {tx.date}
                      </div>
                    </td>
                    <td style={{ padding: '15px 20px' }}>
                      <span style={{
                        background: tx.type === 'refund' ? 'rgba(239,68,68,0.1)' : purpleAlpha(0.1),
                        color: tx.type === 'refund' ? '#ef4444' : PURPLE,
                        border: `1px solid ${tx.type === 'refund' ? 'rgba(239,68,68,0.3)' : purpleAlpha(0.3)}`,
                        borderRadius: '6px', padding: '3px 9px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap',
                      }}>
                        {tx.type === 'escrow' ? 'Escrow' : tx.type === 'payout' ? 'Pago' : tx.type === 'refund' ? 'Reembolso' : tx.type === 'recarga' ? 'Recarga' : 'Cargo'}
                      </span>
                    </td>
                    <td style={{ padding: '15px 20px' }}>
                      <span style={{ fontFamily: FONT_DISPLAY, fontSize: '15px', fontWeight: 800, color: tx.amount > 0 ? OK : 'var(--text)', whiteSpace: 'nowrap' }}>
                        {tx.amount > 0 ? '+' : ''}€{Math.abs(tx.amount).toLocaleString('es')}
                      </span>
                    </td>
                    <td style={{ padding: '15px 20px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', background: `${sCfg.color}12`, color: sCfg.color, borderRadius: '6px', padding: '3px 9px', fontSize: '11px', fontWeight: 600, width: 'fit-content' }}>
                        <SIcon size={10} strokeWidth={2.5} /> {sCfg.label}
                      </span>
                    </td>
                    <td style={{ padding: '15px 12px' }}>
                      <button onClick={() => apiService.downloadInvoice(tx.id || tx._id)} title="Descargar factura" style={{
                        background: 'none', border: '1px solid var(--border)', borderRadius: '6px',
                        padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                        fontSize: '11px', color: 'var(--muted)', fontFamily: FONT_BODY,
                      }}>
                        <Download size={11} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      </React.Fragment>)}

      {/* ── PAGOS tab content ── */}
      {activeTab === 'pagos' && (<React.Fragment>

      {/* ── Payment methods ── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', padding: '22px' }}>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>Métodos de pago</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: purpleAlpha(0.04), border: `1px solid ${purpleAlpha(0.2)}`, borderRadius: '13px', padding: '15px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ background: purpleAlpha(0.12), border: `1px solid ${purpleAlpha(0.25)}`, borderRadius: '9px', padding: '8px 13px', fontSize: '13px', fontWeight: 800, color: PURPLE, letterSpacing: '0.05em' }}>VISA</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>•••• •••• •••• 4242</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Expira 12/2027 · Tarjeta principal</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ background: `${OK}12`, color: OK, border: `1px solid ${OK}25`, borderRadius: '6px', padding: '3px 9px', fontSize: '11px', fontWeight: 600 }}>
                ● Activa
              </span>
            </div>
          </div>

          <button style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            background: 'transparent', border: `2px dashed ${purpleAlpha(0.3)}`, borderRadius: '13px', padding: '15px',
            fontSize: '13px', fontWeight: 600, color: PURPLE, cursor: 'pointer', fontFamily: FONT_BODY,
            transition: 'border-color .15s, background .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = PURPLE; e.currentTarget.style.background = purpleAlpha(0.04) }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = purpleAlpha(0.3); e.currentTarget.style.background = 'transparent' }}
          >
            <Plus size={15} /> Añadir método de pago
          </button>
        </div>
      </div>

      </React.Fragment>)}

    </div>
  )
}
