import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Wallet, TrendingUp, ArrowDownLeft, ArrowUpRight, Download, Plus, X, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react'
import apiService from '../../../../../services/api'
import { SkeletonPage } from '../../../components/Skeleton'
import EmptyState from '../../../components/EmptyState'
import {
  PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY, OK, WARN, BLUE,
} from '../../../theme/tokens'


// ─── Status config ───────────────────────────────────────────────────────────
const STATUS_CFG = {
  pending:  { label: 'Pendiente',  color: WARN, icon: Clock },
  paid:     { label: 'En escrow',  color: BLUE, icon: Clock },
  released: { label: 'Liberado',   color: OK,   icon: CheckCircle },
  refunded: { label: 'Reembolsado',color: '#ef4444', icon: AlertCircle },
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
    escrow:  { icon: '🔒', color: BLUE, bg: `${BLUE}12` },
    payout:  { icon: '💸', color: OK,   bg: `${OK}12`   },
    refund:  { icon: '↩️', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    recarga: { icon: '💳', color: OK,   bg: `${OK}12`   },
    cargo:   { icon: '📢', color: PURPLE,    bg: purpleAlpha(0.1)     },
  }[type] || { icon: '💰', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' }

  return (
    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
      {cfg.icon}
    </div>
  )
}

// ─── Recharge modal ────────────────────────────────────────────────────────────
const RechargeModal = ({ onClose }) => {
  const [amount, setAmount] = useState(500)
  const [step, setStep]     = useState(1)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const PRESETS = [100, 250, 500, 1000]

  const handleRecharge = async () => {
    setProcessing(true)
    setError('')
    try {
      const res = await apiService.createCheckoutSession(amount)
      if (res?.success) {
        if (res.simulated) {
          // Stripe not configured — show success screen
          setStep(2)
        } else if (res.url) {
          // Redirect to Stripe Checkout
          window.location.href = res.url
        }
      } else {
        setError(res?.message || 'Error al procesar el pago')
      }
    } catch {
      setError('No se pudo conectar con el servidor de pagos')
    }
    setProcessing(false)
  }

  if (step === 2) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'var(--surface)', borderRadius: '22px', padding: '44px', maxWidth: '380px', width: '100%', textAlign: 'center', boxShadow: '0 32px 80px rgba(0,0,0,0.45)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: `${OK}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={28} color={OK} strokeWidth={2} />
          </div>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>Recarga exitosa</h3>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px', lineHeight: 1.6 }}>
            Se han añadido <strong style={{ color: PURPLE }}>€{amount}</strong> a tu saldo disponible.
          </p>
          <p style={{ fontSize: '13px', color: 'var(--muted2)', marginBottom: '28px' }}>El saldo está listo para usar en campañas.</p>
          <button onClick={onClose} style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: '12px', padding: '13px 32px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: FONT_BODY, boxShadow: `0 4px 16px ${purpleAlpha(0.35)}` }}>
            Perfecto, gracias
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--surface)', borderRadius: '22px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.45)' }}>
        <div style={{ height: '4px', background: `linear-gradient(90deg, ${PURPLE} 0%, #7c3aed 100%)` }} />
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>Recargar saldo</h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '3px' }}>El saldo se acredita de forma instantánea</p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '9px', padding: '8px', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selecciona un importe</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {PRESETS.map(amt => (
                <button key={amt} onClick={() => setAmount(amt)} style={{
                  background: amount === amt ? PURPLE : 'var(--bg)',
                  border: `1px solid ${amount === amt ? PURPLE : 'var(--border)'}`,
                  borderRadius: '11px', padding: '12px 8px',
                  fontFamily: FONT_DISPLAY, fontSize: '16px', fontWeight: 800,
                  color: amount === amt ? '#fff' : 'var(--text)',
                  cursor: 'pointer',
                  boxShadow: amount === amt ? `0 3px 10px ${purpleAlpha(0.3)}` : 'none',
                  transition: 'all .15s',
                }}>
                  €{amt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>O introduce un importe</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '18px', fontFamily: FONT_DISPLAY, fontWeight: 700 }}>€</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(Math.max(10, Number(e.target.value)))}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--bg)', border: '1px solid var(--border-med)',
                  borderRadius: '12px', padding: '13px 14px 13px 36px',
                  fontSize: '20px', fontWeight: 800, color: 'var(--text)', fontFamily: FONT_DISPLAY, outline: 'none',
                  transition: 'border-color .15s',
                }}
                onFocus={e => { e.target.style.borderColor = purpleAlpha(0.5) }}
                onBlur={e => { e.target.style.borderColor = 'var(--border-med)' }}
              />
            </div>
          </div>

          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: purpleAlpha(0.1), border: `1px solid ${purpleAlpha(0.2)}`, borderRadius: '8px', padding: '7px 11px', fontSize: '12px', fontWeight: 800, color: PURPLE, letterSpacing: '0.05em' }}>VISA</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>•••• •••• •••• 4242</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Expira 12/2027</div>
            </div>
            <span style={{ background: `${OK}12`, color: OK, borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>Principal</span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose} style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '11px', padding: '13px', fontSize: '14px', cursor: 'pointer', color: 'var(--text)', fontFamily: FONT_BODY }}>
              Cancelar
            </button>
            {error && (
              <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '8px', textAlign: 'center', width: '100%' }}>
                {error}
              </div>
            )}
            <button
              onClick={handleRecharge}
              disabled={processing}
              style={{ flex: 2, background: processing ? purpleAlpha(0.6) : PURPLE, border: 'none', borderRadius: '11px', padding: '13px', fontSize: '14px', fontWeight: 700, cursor: processing ? 'not-allowed' : 'pointer', color: '#fff', fontFamily: FONT_BODY, boxShadow: `0 4px 14px ${purpleAlpha(0.35)}`, transition: 'transform .15s' }}
              onMouseEnter={e => { if (!processing) e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
            >
              {processing ? 'Procesando...' : `Recargar €${amount}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Helper: normalize API transactions to display format ─────────────────────
function normalizeTx(tx) {
  const id = tx._id || tx.id
  const date = tx.paidAt || tx.createdAt
  const dateStr = date ? new Date(date).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
  const type = tx.type || 'escrow'
  const status = tx.status || 'pending'
  const amount = tx.amount || 0

  // Build description from campaign info
  let desc = ''
  if (tx.campaign?.content) {
    desc = tx.campaign.content.slice(0, 60)
  } else if (tx.campaign?.channel?.nombreCanal) {
    desc = `Campaña — ${tx.campaign.channel.nombreCanal}`
  } else {
    desc = type === 'refund' ? 'Reembolso de campaña' : 'Pago de campaña'
  }

  return { id, date: dateStr, desc, type, amount: type === 'refund' ? Math.abs(amount) : -Math.abs(amount), status }
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
    if (tx.type !== 'refund') months[key].value += Math.abs(tx.amount || 0)
  })
  return Object.values(months).sort((a, b) => a.ts - b.ts).slice(-12)
}

// ─── Spending breakdown from transactions ─────────────────────────────────────
function buildPlatformBreakdown(transactions) {
  const byPlatform = {}
  let total = 0
  transactions.forEach(tx => {
    if (tx.type === 'refund') return
    const plat = tx.campaign?.channel?.plataforma || 'Otros'
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
  const [showRecharge, setShowRecharge] = useState(false)
  const [showRechargeSuccess, setShowRechargeSuccess] = useState(false)
  const [txFilter, setTxFilter] = useState('todos')
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [rawTx, setRawTx] = useState([])

  // Handle Stripe redirect callback
  useEffect(() => {
    const recharge = searchParams.get('recharge')
    if (recharge === 'success') {
      setShowRechargeSuccess(true)
      setSearchParams({}, { replace: true })
    }
  }, [])

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
      } catch { /* empty state */ }
      if (mounted) setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  const balance     = rawTx.filter(t => t.status === 'paid').reduce((s, t) => s + (t.amount || 0), 0)
  const totalSpend  = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const txCount     = transactions.length

  const monthlyData = buildMonthlySpend(rawTx)
  const platformBreakdown = buildPlatformBreakdown(rawTx)

  const filteredTx = transactions.filter(tx => {
    if (txFilter === 'todos') return true
    if (txFilter === 'escrow') return tx.type === 'escrow'
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
          <p style={{ fontSize: '14px', color: 'var(--muted)' }}>Controla tu saldo, gasto y métodos de pago</p>
        </div>
        <button
          onClick={() => setShowRecharge(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: PURPLE, color: '#fff', border: 'none', borderRadius: '12px', padding: '11px 22px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: FONT_BODY, boxShadow: `0 4px 16px ${purpleAlpha(0.35)}`, transition: 'transform .15s, box-shadow .15s' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${purpleAlpha(0.4)}` }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 16px ${purpleAlpha(0.35)}` }}
        >
          <Plus size={16} strokeWidth={2.5} /> Recargar saldo
        </button>
      </div>

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
          <button
            onClick={() => setShowRecharge(true)}
            style={{ marginTop: '16px', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '9px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: FONT_BODY }}
          >
            Añadir fondos →
          </button>
        </div>

        {/* KPI cards */}
        {[
          { icon: TrendingUp, label: 'Gasto total', val: `€${totalSpend.toLocaleString('es')}`, sub: `${txCount} transacciones`, color: BLUE },
          { icon: ArrowDownLeft, label: 'En escrow', val: `€${Math.abs(balance).toLocaleString('es')}`, sub: 'Retenido en campañas', color: PURPLE },
          { icon: ArrowUpRight, label: 'Liberado', val: `€${rawTx.filter(t => t.status === 'released').reduce((s,t) => s + Math.abs(t.amount||0), 0).toLocaleString('es', {maximumFractionDigits: 0})}`, sub: 'Pagado a creadores', color: OK, subColor: OK },
        ].map(({ icon: Icon, label, val, sub, color, subColor }) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', padding: '22px', transition: 'border-color .15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = purpleAlpha(0.3) }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
              <Icon size={17} color={color} />
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: '24px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: '3px' }}>{val}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '11px', color: subColor || 'var(--muted2)', fontWeight: subColor ? 600 : 400 }}>{sub}</div>
          </div>
        ))}
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

      {/* ── Transactions ── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>Historial de transacciones</h2>
            <p style={{ fontSize: '12px', color: 'var(--muted)' }}>{transactions.length} movimientos registrados</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '9px', overflow: 'hidden' }}>
              {['todos', 'escrow', 'refund'].map(f => (
                <button key={f} onClick={() => setTxFilter(f)} style={{
                  background: txFilter === f ? purpleAlpha(0.12) : 'transparent', border: 'none',
                  padding: '6px 14px', fontSize: '12px', fontWeight: txFilter === f ? 600 : 400,
                  color: txFilter === f ? PURPLE : 'var(--muted)', cursor: 'pointer', fontFamily: FONT_BODY,
                  borderRight: f !== 'refund' ? '1px solid var(--border)' : 'none',
                }}>
                  {f === 'todos' ? 'Todos' : f === 'escrow' ? 'Escrow' : 'Reembolsos'}
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
                      description={txFilter === 'todos' ? 'Aun no tienes movimientos. Recarga saldo para empezar a invertir en campanas.' : 'No hay transacciones en esta categoria.'}
                      actionLabel={txFilter === 'todos' ? 'Recargar saldo' : undefined}
                      onAction={txFilter === 'todos' ? () => setShowRecharge(true) : undefined}
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
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

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

      {showRecharge && <RechargeModal onClose={() => setShowRecharge(false)} />}
    </div>
  )
}
