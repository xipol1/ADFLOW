import React, { useState, useEffect } from 'react'
import { Download, Wallet, TrendingUp, DollarSign, ArrowUpRight, Clock } from 'lucide-react'
import apiService from '../../../../../services/api'
import { PURPLE, purpleAlpha, GREEN, greenAlpha, FONT_BODY, FONT_DISPLAY, OK as _OK, BLUE as _BLUE, WARN as _WARN } from '../../../theme/tokens'
import { Sparkline, ErrorBanner } from '../shared/DashComponents'

const A  = PURPLE
const AG = purpleAlpha
const WA = GREEN
const WAG = greenAlpha
const F  = FONT_BODY
const D  = FONT_DISPLAY
const OK = _OK
const BLUE = _BLUE
const WARN = _WARN

/* ── Animations ─────────────────────────────────────────────────────────── */
const CSS = `
@keyframes ce-in { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
@keyframes ce-pulse { 0%,100%{opacity:1}50%{opacity:.5} }
`

/* ── Bar chart ────────────────────────────────────────────────────────── */
const BarChart = ({ data }) => {
  const max = Math.max(...data.map(d => d.value), 1)
  const [hoverIdx, setHoverIdx] = useState(null)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '120px', paddingBottom: '20px' }}>
      {data.map((d, i) => {
        const isLast = i === data.length - 1
        const isHov = hoverIdx === i
        const pct = (d.value / max) * 100
        return (
          <div key={i}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', height: '100%', cursor: 'default' }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '100%' }}>
              {(isHov || isLast) && (
                <div style={{ fontSize: '10px', color: isLast ? WA : 'var(--muted)', fontWeight: 700, textAlign: 'center', marginBottom: '3px' }}>€{d.value}</div>
              )}
              <div style={{
                width: '100%', borderRadius: '6px 6px 0 0', minHeight: '4px', height: `${pct}%`,
                background: isLast ? `linear-gradient(180deg, ${WA} 0%, ${WA}90 100%)` : isHov ? `${WA}70` : `${WA}40`,
                transition: 'background .15s, height .3s',
              }} />
            </div>
            <span style={{ fontSize: '10px', color: isLast ? WA : 'var(--muted)', fontWeight: isLast ? 600 : 400 }}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ── KPI Card ──────────────────────────────────────────────────────────── */
function KpiCard({ icon: Icon, label, value, sub, subColor, sparkData, accent = WA }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${hov ? `${accent}55` : 'var(--border)'}`,
        borderRadius: '16px', padding: '22px',
        transition: 'border-color .2s, transform .2s, box-shadow .2s',
        transform: hov ? 'translateY(-2px)' : 'none',
        boxShadow: hov ? `0 8px 28px ${accent}18` : '0 1px 4px rgba(0,0,0,0.05)',
        display: 'flex', flexDirection: 'column', gap: '12px',
        animation: 'ce-in .3s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: `${accent}18`, border: `1px solid ${accent}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={accent} strokeWidth={2} />
        </div>
        {sparkData && <Sparkline data={sparkData} color={accent} />}
      </div>
      <div>
        <div style={{ fontFamily: D, fontSize: '28px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '4px' }}>{value}</div>
        <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: sub ? '6px' : 0 }}>{label}</div>
        {sub && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: `${subColor || OK}12`, borderRadius: '20px', padding: '2px 8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: subColor || OK }}>{sub}</span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Period filter pills ──────────────────────────────────────────── */
const PERIODS = [
  { key: 'month', label: 'Este mes' },
  { key: '3m', label: '3 meses' },
  { key: '6m', label: '6 meses' },
  { key: 'year', label: 'Este año' },
  { key: 'all', label: 'Todo' },
]
const getPeriodStart = (key) => {
  const now = new Date()
  if (key === 'all') return new Date(0)
  if (key === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
  if (key === '3m') { const d = new Date(); d.setMonth(d.getMonth() - 3); return d }
  if (key === '6m') { const d = new Date(); d.setMonth(d.getMonth() - 6); return d }
  if (key === 'year') return new Date(now.getFullYear(), 0, 1)
  return new Date(0)
}

/* ── CSV export helper ───────────────────────────────────────────── */
const exportCSV = (rows) => {
  const header = 'Fecha,Descripcion,Tipo,Importe,Estado\n'
  const body = rows.map(r =>
    `"${r.date}","${r.desc}","${r.amount > 0 ? 'Ingreso' : 'Retiro'}","${r.amount}","${r.status}"`
  ).join('\n')
  const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `adflow-ganancias-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
}

/* ── Transaction Detail Modal ────────────────────────────────────── */
const TxDetailModal = ({ tx, onClose }) => {
  if (!tx) return null
  const printReceipt = () => {
    const w = window.open('', '_blank', 'width=600,height=700')
    w.document.write(`<!DOCTYPE html><html><head><title>Factura Adflow</title>
    <style>body{font-family:Inter,system-ui,sans-serif;padding:40px;color:#111}
    h1{font-size:22px;margin-bottom:4px}
    .label{color:#666;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px}
    .val{font-size:15px;margin-bottom:16px}
    .big{font-size:28px;font-weight:800;color:#25d366}
    hr{border:none;border-top:1px solid #e5e7eb;margin:20px 0}
    .footer{font-size:11px;color:#999;margin-top:32px;text-align:center}
    @media print{button{display:none}}</style></head><body>
    <h1>Adflow</h1><p style="color:#666;font-size:13px">Factura / Recibo</p><hr>
    <div class="label">Fecha</div><div class="val">${tx.date}</div>
    <div class="label">Descripcion</div><div class="val">${tx.desc}</div>
    <div class="label">Estado</div><div class="val">${tx.status}</div>
    ${tx.commission != null ? `<div class="label">Comision plataforma</div><div class="val">€${tx.commission.toFixed(2)} (${Math.round((tx.commissionRate || 0) * 100)}%)</div>` : ''}
    <hr><div class="label">Importe neto</div><div class="big">€${Math.abs(tx.amount).toFixed(2)}</div>
    <div class="footer">Generado por Adflow · ${new Date().toLocaleDateString('es')}</div>
    <br><button onclick="window.print()" style="background:#25d366;color:#fff;border:none;border-radius:8px;padding:10px 24px;font-size:14px;font-weight:700;cursor:pointer">Imprimir</button>
    </body></html>`)
    w.document.close()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--surface)', borderRadius: '24px', width: '100%', maxWidth: '480px', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.35)', animation: 'ce-in .25s ease' }}>
        <div style={{ height: '4px', background: `linear-gradient(90deg, ${WA} 0%, ${OK} 100%)` }} />
        <div style={{ padding: '22px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: D, fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>Detalle de movimiento</h2>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>✕</button>
        </div>
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ textAlign: 'center', padding: '16px', background: WAG(0.06), borderRadius: '16px', border: `1px solid ${WAG(0.15)}` }}>
            <div style={{ fontFamily: D, fontSize: '36px', fontWeight: 800, color: tx.amount > 0 ? WA : 'var(--text)', letterSpacing: '-0.03em' }}>
              {tx.amount > 0 ? '+' : ''}€{Math.abs(tx.amount).toFixed(2)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>{tx.amount > 0 ? 'Ingreso' : 'Retiro'}</div>
          </div>

          {[
            { label: 'Fecha', value: tx.date },
            { label: 'Descripcion', value: tx.desc },
            { label: 'Estado', value: tx.status },
            ...(tx.commission != null ? [{ label: 'Comision', value: `€${tx.commission.toFixed(2)} (${Math.round((tx.commissionRate || 0) * 100)}%)` }] : []),
            ...(tx.campaignId ? [{ label: 'ID Campana', value: tx.campaignId }] : []),
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
              <span style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500, textAlign: 'right', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
            </div>
          ))}

          <button onClick={printReceipt} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px',
            padding: '12px', fontSize: '13px', fontWeight: 600, color: 'var(--text)',
            cursor: 'pointer', fontFamily: F, transition: 'border-color .15s',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = WAG(0.5)}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            🧾 Generar factura / recibo
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Withdraw Modal ──────────────────────────────────────────────────── */
const WithdrawModal = ({ balance, onClose }) => {
  const [amount, setAmount] = useState(balance)
  const [method, setMethod] = useState('bank')
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const doWithdraw = async () => {
    if (amount <= 0 || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const r = await apiService.requestWithdrawal({ amount, method })
      if (r?.success) {
        setDone(true)
      } else {
        setError(r?.message || 'Error al procesar el retiro.')
      }
    } catch {
      setError('Error de conexion. Intenta de nuevo.')
    }
    setSubmitting(false)
  }

  if (done) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
      <div style={{ background: 'var(--surface)', borderRadius: '24px', padding: '40px', maxWidth: '380px', textAlign: 'center', boxShadow: '0 32px 80px rgba(0,0,0,0.35)', animation: 'ce-in .25s ease' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: `${OK}12`, border: `1px solid ${OK}25`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '28px' }}>✅</span>
        </div>
        <h3 style={{ fontFamily: D, fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>¡Retiro solicitado!</h3>
        <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '24px', lineHeight: 1.5 }}>Recibiras €{amount} en tu cuenta en 2-3 dias habiles.</p>
        <button onClick={onClose} style={{ background: WA, color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 28px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: F, boxShadow: `0 4px 14px ${WAG(0.35)}` }}>Cerrar</button>
      </div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--surface)', borderRadius: '24px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.35)', animation: 'ce-in .25s ease' }}>
        <div style={{ height: '4px', background: `linear-gradient(90deg, ${WA} 0%, ${OK} 100%)` }} />
        <div style={{ padding: '22px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontFamily: D, fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>Solicitar retiro</h2>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Se procesara en 2-3 dias habiles</div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>✕</button>
        </div>
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ background: WAG(0.08), border: `1px solid ${WAG(0.25)}`, borderRadius: '14px', padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Saldo disponible</span>
            <span style={{ fontFamily: D, fontSize: '22px', fontWeight: 800, color: WA }}>€{balance.toLocaleString('es')}</span>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '7px' }}>Importe a retirar</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              {[100, 250, 500].filter(v => v <= balance).map(v => (
                <button key={v} onClick={() => setAmount(v)} style={{
                  flex: 1, background: amount === v ? WAG(0.12) : 'var(--bg)',
                  border: `1px solid ${amount === v ? WA : 'var(--border)'}`,
                  borderRadius: '10px', padding: '10px', fontSize: '14px', fontWeight: 700,
                  color: amount === v ? WA : 'var(--text)', cursor: 'pointer', fontFamily: D,
                }}>€{v}</button>
              ))}
              <button onClick={() => setAmount(balance)} style={{
                flex: 1, background: amount === balance ? WAG(0.12) : 'var(--bg)',
                border: `1px solid ${amount === balance ? WA : 'var(--border)'}`,
                borderRadius: '10px', padding: '10px', fontSize: '12px', fontWeight: 600,
                color: amount === balance ? WA : 'var(--muted)', cursor: 'pointer', fontFamily: F,
              }}>Todo</button>
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '16px' }}>€</span>
              <input type="number" value={amount} onChange={e => setAmount(Math.min(balance, Math.max(0, Number(e.target.value))))}
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px 12px 30px', fontSize: '18px', fontWeight: 700, color: 'var(--text)', fontFamily: D, outline: 'none' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>Metodo de cobro</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { id: 'bank', label: 'Cuenta bancaria', desc: '2-3 dias habiles', icon: '🏦' },
                { id: 'paypal', label: 'PayPal', desc: 'Instantaneo', icon: '💳' },
              ].map(m => (
                <button key={m.id} onClick={() => setMethod(m.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: method === m.id ? AG(0.06) : 'var(--bg)',
                  border: `1.5px solid ${method === m.id ? A : 'var(--border)'}`,
                  borderRadius: '12px', padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
                  transition: 'all .15s',
                }}>
                  <span style={{ fontSize: '20px' }}>{m.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{m.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{m.desc}</div>
                  </div>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${method === m.id ? A : 'var(--muted2)'}`, background: method === m.id ? A : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {method === m.id && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ background: '#ef444412', border: '1px solid #ef444430', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#ef4444', fontWeight: 500 }}>{error}</div>
          )}

          <button onClick={doWithdraw} disabled={amount <= 0 || submitting} style={{
            background: amount > 0 && !submitting ? WA : 'var(--muted2)', color: '#fff', border: 'none',
            borderRadius: '14px', padding: '14px', fontSize: '15px', fontWeight: 700,
            cursor: amount > 0 && !submitting ? 'pointer' : 'not-allowed', fontFamily: F,
            boxShadow: amount > 0 ? `0 6px 20px ${WAG(0.35)}` : 'none',
            transition: 'all .15s',
          }}>
            {submitting ? 'Procesando...' : `Retirar €${amount}`}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Sparkline data ──────────────────────────────────────────────────── */
const EARN_SPARK = [820, 940, 870, 1100, 1050, 1280, 1190, 1380, 1310, 1520, 1480, 1730]

/* ═══════════════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════════════ */
export default function CreatorEarningsPage() {
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [selectedTx, setSelectedTx] = useState(null)
  const [period, setPeriod] = useState('all')
  const [campaigns, setCampaigns] = useState([])
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [cmpRes, chRes] = await Promise.all([
          apiService.getCreatorCampaigns().catch(() => null),
          apiService.getMyChannels().catch(() => null),
        ])
        if (!mounted) return
        const cmpData = cmpRes?.success && Array.isArray(cmpRes.data) ? cmpRes.data : []
        const chData = chRes?.success && Array.isArray(chRes.data) ? chRes.data : []
        setCampaigns(cmpData)
        setChannels(chData)
      } catch (err) {
        console.error('CreatorEarningsPage load error:', err)
        if (mounted) setFetchError('No se pudieron cargar los datos. Verifica tu conexion.')
      }
      if (mounted) setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [retryKey])

  // Period filter
  const periodStart = getPeriodStart(period)
  const filteredCampaigns = campaigns.filter(c => {
    const d = new Date(c.completedAt || c.createdAt)
    return d >= periodStart
  })

  // Compute earnings from real campaign data
  const completedCampaigns = filteredCampaigns.filter(c => c.status === 'COMPLETED')
  const paidCampaigns = filteredCampaigns.filter(c => c.status === 'PAID' || c.status === 'PUBLISHED')
  const realEarnings = completedCampaigns.reduce((s, c) => s + (c.netAmount || 0), 0)
  const pendingEarnings = paidCampaigns.reduce((s, c) => s + (c.netAmount || 0), 0)

  const balance = realEarnings
  const totalEarnings = realEarnings
  const thisMonth = realEarnings

  // Build monthly chart from real data
  const monthlyData = (() => {
    const months = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      months[key] = { label: d.toLocaleDateString('es', { month: 'short' }), value: 0 }
    }
    completedCampaigns.forEach(c => {
      const d = new Date(c.completedAt || c.createdAt)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (months[key]) months[key].value += (c.netAmount || 0)
    })
    return Object.values(months).map(m => ({ ...m, value: Math.round(m.value) }))
  })()

  // Build earnings list from campaigns
  const earningsList = filteredCampaigns.map(c => ({
        id: c._id,
        campaignId: c._id,
        date: new Date(c.completedAt || c.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }),
        desc: `${typeof c.channel === 'object' ? c.channel?.nombreCanal : 'Canal'} — ${typeof c.advertiser === 'object' ? c.advertiser?.nombre || c.advertiser?.email : 'Anunciante'}`,
        amount: c.netAmount || 0,
        commission: c.commissionAmount || 0,
        commissionRate: c.commissionRate || 0,
        status: c.status === 'COMPLETED' ? 'completado' : c.status === 'PUBLISHED' ? 'publicado' : c.status === 'CANCELLED' ? 'cancelado' : 'pendiente',
      }))

  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1060px' }}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontFamily: D, fontSize: '28px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: '6px' }}>Ganancias</h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.5 }}>
            Historial de ingresos, métricas financieras y gestión de retiros
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={() => setShowWithdraw(true)} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: WA, color: '#fff', border: 'none', borderRadius: '12px',
          padding: '11px 22px', fontSize: '14px', fontWeight: 700,
          cursor: 'pointer', fontFamily: F, boxShadow: `0 4px 16px ${WAG(0.4)}`,
          transition: 'transform .15s, box-shadow .15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${WAG(0.45)}` }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 16px ${WAG(0.4)}` }}
        >
          <Wallet size={16} strokeWidth={2.5} /> Solicitar retiro
        </button>
        </div>
      </div>

      {fetchError && <ErrorBanner message={fetchError} onRetry={() => { setFetchError(null); setRetryKey(k => k + 1) }} style={{ marginBottom: '20px' }} />}

      {/* Period filter pills */}
      <div style={{ display: 'flex', gap: '2px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '3px', width: 'fit-content' }}>
        {PERIODS.map(p => {
          const active = period === p.key
          return (
            <button key={p.key} onClick={() => setPeriod(p.key)} style={{
              background: active ? WA : 'transparent', color: active ? '#fff' : 'var(--muted)',
              border: 'none', borderRadius: '9px', padding: '8px 14px', fontSize: '13px',
              fontWeight: active ? 600 : 400, cursor: 'pointer', fontFamily: F,
              transition: 'all .18s',
            }}>{p.label}</button>
          )
        })}
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '22px', height: '120px', animation: 'ce-pulse 1.5s infinite' }} />
          ))}
        </div>
      )}

      {!loading && (
        <>
          {/* KPI grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            {/* Balance card — special gradient */}
            <div style={{
              background: `linear-gradient(135deg, ${WA} 0%, #1aa34a 100%)`,
              borderRadius: '16px', padding: '22px', color: '#fff',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              animation: 'ce-in .3s ease',
              boxShadow: `0 8px 32px ${WAG(0.35)}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wallet size={18} color="#fff" />
                </div>
                <span style={{ fontSize: '12px', opacity: 0.85, fontWeight: 500 }}>Saldo disponible</span>
              </div>
              <div style={{ fontFamily: D, fontSize: '34px', fontWeight: 800, letterSpacing: '-0.03em' }}>€{balance.toLocaleString('es')}</div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '6px' }}>Listo para retirar</div>
            </div>

            <KpiCard icon={TrendingUp} label="Ganancias este mes" value={`€${thisMonth.toLocaleString('es')}`} sub="+18% vs mes anterior" sparkData={EARN_SPARK} accent={WA} />
            <KpiCard icon={DollarSign} label="Ganancias totales" value={`€${totalEarnings.toLocaleString('es')}`} sub="Desde el inicio" accent={OK} sparkData={EARN_SPARK.map(v => v * 0.6)} />
            <KpiCard icon={Clock} label="Pendiente de cobro" value={`€${pendingEarnings.toLocaleString('es')}`} sub={`${paidCampaigns.length} campañas`} subColor={WARN} accent={BLUE} />
          </div>

          {/* 2-col layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, 1fr)', gap: '20px' }}>

            {/* Monthly chart */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontFamily: D, fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>Ganancias por mes</h2>
                  <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Últimos 6 meses</p>
                </div>
              </div>
              <div style={{ padding: '16px 24px 20px' }}>
                <BarChart data={monthlyData} />
              </div>
            </div>

            {/* By channel */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ fontFamily: D, fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>Por canal</h2>
                <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Distribución de ingresos</p>
              </div>
              {(channels.length > 0 ? channels : [{ _id: 'empty', nombreCanal: 'Sin canales', earningsThisMonth: 0 }]).map((ch, i, arr) => {
                const chName = ch.nombreCanal || ch.name
                const chEarnings = ch.earningsThisMonth || 0
                const pct = thisMonth > 0 ? Math.round((chEarnings / thisMonth) * 100) : 0
                return (
                  <div key={ch._id || ch.id || i} style={{
                    padding: '16px 24px',
                    borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                    display: 'flex', alignItems: 'center', gap: '14px',
                    transition: 'background .12s', cursor: 'default',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>{chName}</div>
                      <div style={{ height: '6px', background: 'var(--bg2)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: WA, borderRadius: '3px', transition: 'width .4s' }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', fontFamily: D }}>€{chEarnings.toLocaleString('es')}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{pct}%</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Transactions table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontFamily: D, fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>Historial de movimientos</h2>
                <p style={{ fontSize: '12px', color: 'var(--muted)' }}>{earningsList.length} movimientos</p>
              </div>
              <button onClick={() => exportCSV(earningsList)} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px',
                padding: '8px 14px', fontSize: '12px', fontWeight: 600, color: 'var(--muted)',
                cursor: 'pointer', fontFamily: F, transition: 'border-color .15s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = WAG(0.5)}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <Download size={13} /> Exportar CSV
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '520px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
                    {['Fecha', 'Descripción', 'Tipo', 'Importe', 'Estado'].map(h => (
                      <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {earningsList.map((e, i) => (
                    <tr key={e.id || i} onClick={() => setSelectedTx(e)} style={{ borderBottom: i < earningsList.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background .1s', cursor: 'pointer' }}
                      onMouseEnter={ev => { ev.currentTarget.style.background = 'var(--bg2)' }}
                      onMouseLeave={ev => { ev.currentTarget.style.background = 'transparent' }}
                    >
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{e.date}</td>
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--text)', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.desc}</td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          background: e.amount > 0 ? WAG(0.1) : AG(0.08),
                          color: e.amount > 0 ? WA : A,
                          border: `1px solid ${e.amount > 0 ? WAG(0.25) : AG(0.2)}`,
                          borderRadius: '8px', padding: '3px 10px', fontSize: '11px', fontWeight: 600,
                        }}>
                          {e.amount > 0 ? '💰 Ingreso' : '📤 Retiro'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 700, color: e.amount > 0 ? OK : 'var(--text)', fontFamily: D, whiteSpace: 'nowrap' }}>
                        {e.amount > 0 ? '+' : ''}€{Math.abs(e.amount).toLocaleString('es')}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          background: e.status === 'completado' ? `${OK}12` : e.status === 'pendiente' || e.status === 'publicado' ? `${WARN}12` : `${AG(0.08)}`,
                          color: e.status === 'completado' ? OK : e.status === 'pendiente' || e.status === 'publicado' ? WARN : A,
                          borderRadius: '8px', padding: '3px 10px', fontSize: '11px', fontWeight: 600,
                        }}>
                          {e.status === 'completado' ? '✓ Completado' : e.status === 'pendiente' ? 'Pendiente' : e.status === 'publicado' ? 'En curso' : 'Retirado'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showWithdraw && <WithdrawModal balance={balance} onClose={() => setShowWithdraw(false)} />}
      {selectedTx && <TxDetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />}
    </div>
  )
}
