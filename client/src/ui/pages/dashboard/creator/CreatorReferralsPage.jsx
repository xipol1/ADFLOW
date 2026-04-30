import React, { useState, useEffect } from 'react'
import { Copy, Check, Users, DollarSign, TrendingUp, Gift, ChevronRight, Wallet } from 'lucide-react'
import apiService from '../../../../services/api'
import { ErrorBanner } from '../shared/DashComponents'
import {
  GREEN, GREEN_DARK, greenAlpha, PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE, TRANSITION,
} from '../../../theme/tokens'


// ─── Aliases ──────────────────────────────────────────────────────────────────
const F = FONT_BODY
const D = FONT_DISPLAY


// ─── Bar chart (gradient bars like FinancesPage) ─────────────────────────────
function EarningsChart({ data }) {
  const max = Math.max(...data.map(d => d.amount), 1)
  const [hoverIdx, setHoverIdx] = useState(null)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '120px', paddingBottom: '20px' }}>
      {data.map((d, i) => {
        const isLast = i === data.length - 1
        const isHov = hoverIdx === i
        const pct = (d.amount / max) * 100

        return (
          <div
            key={i}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', cursor: 'default' }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '100%' }}>
              {(isHov || isLast) && (
                <div style={{
                  fontSize: '11px', color: isLast ? PURPLE : 'var(--muted)',
                  fontWeight: 700, textAlign: 'center', marginBottom: '4px', fontFamily: F,
                }}>
                  €{d.amount}
                </div>
              )}
              <div style={{
                width: '100%', borderRadius: '6px 6px 0 0', minHeight: '4px',
                height: `${Math.max(pct, 3)}%`,
                background: isLast
                  ? `linear-gradient(180deg, ${greenAlpha(1)} 0%, ${GREEN_DARK} 100%)`
                  : isHov ? greenAlpha(0.55) : greenAlpha(0.3),
                transition: 'background .15s, height .4s cubic-bezier(.4,0,.2,1)',
              }} />
            </div>
            <span style={{
              fontSize: '10px', color: isLast ? PURPLE : 'var(--muted)',
              fontWeight: isLast ? 600 : 400, whiteSpace: 'nowrap', fontFamily: F,
            }}>
              {d.month}
            </span>
          </div>
        )
      })}
    </div>
  )
}


// ─── Tier config ─────────────────────────────────────────────────────────────
const TIERS = [
  { key: 'normal',  label: 'Normal',  desc: 'Gana creditos para lanzar campanas gratis' },
  { key: 'power',   label: 'Power',   desc: 'Ahora puedes retirar parte de tus ganancias' },
  { key: 'partner', label: 'Partner', desc: 'Monetiza completamente tu red' },
]

function tierIndex(tier) {
  const idx = TIERS.findIndex(t => t.key === tier)
  return idx >= 0 ? idx : 0
}


// ─── Loading skeleton ────────────────────────────────────────────────────────
function Skeleton({ w = '100%', h = 16, r = 8, style: extra }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg, var(--border) 25%, var(--surface) 50%, var(--border) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      ...extra,
    }} />
  )
}


// ─── Main component ──────────────────────────────────────────────────────────
export default function CreatorReferralsPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)
  const [copied, setCopied] = useState(false)
  const [convertAmount, setConvertAmount] = useState('')
  const [converting, setConverting] = useState(false)
  const [convertMsg, setConvertMsg] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFetchError(null)
    apiService.getReferralStats().then(res => {
      if (cancelled) return
      if (res?.success && res.data) {
        setStats(res.data)
      } else {
        setStats({
          referralCode: res?.data?.referralCode || '------',
          creditsBalance: 0, cashBalance: 0, tier: 'normal',
          gmvGenerated: 0, referralCount: 0, conversionRate: 0,
          referrals: [], monthlyEarnings: [],
          tierProgress: { current: 'normal', nextTier: 'power', referralsNeeded: 5, gmvNeeded: 5000 },
        })
      }
    }).catch(() => {
      if (!cancelled) setFetchError('No se pudieron cargar los datos de referidos.')
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [retryKey])

  const copyLink = () => {
    const link = `${window.location.origin}/auth/register?ref=${stats?.referralCode || ''}`
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleConvert = async () => {
    const amt = parseFloat(convertAmount)
    if (!amt || amt <= 0) return
    setConverting(true)
    setConvertMsg(null)
    try {
      const res = await apiService.convertReferralCredits(amt)
      if (res?.success) {
        setConvertMsg({ type: 'success', text: `€${amt.toFixed(2)} convertidos exitosamente` })
        setStats(prev => ({ ...prev, creditsBalance: res.data.creditsBalance, cashBalance: res.data.cashBalance }))
        setConvertAmount('')
      } else {
        setConvertMsg({ type: 'error', text: res?.message || 'Error al convertir' })
      }
    } catch {
      setConvertMsg({ type: 'error', text: 'Error de conexion' })
    } finally {
      setConverting(false)
    }
  }

  const data = stats || {
    referralCode: '------',
    creditsBalance: 0, cashBalance: 0, tier: 'normal',
    gmvGenerated: 0, referralCount: 0, conversionRate: 0,
    referrals: [],
    monthlyEarnings: [
      { month: 'Oct', amount: 0 }, { month: 'Nov', amount: 0 }, { month: 'Dic', amount: 0 },
      { month: 'Ene', amount: 0 }, { month: 'Feb', amount: 0 }, { month: 'Mar', amount: 0 },
    ],
    tierProgress: { current: 'normal', nextTier: 'power', referralsNeeded: 5, gmvNeeded: 5000 },
  }

  const referralLink = `${window.location.origin}/auth/register?ref=${data.referralCode}`
  const currentTierIdx = tierIndex(data.tier)
  const canConvert = data.tier !== 'normal'
  const CONVERT_PRESETS = [25, 50, 100]


  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '32px', maxWidth: '1120px', margin: '0 auto', fontFamily: F }}>
        <style>{`@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
        <Skeleton w="220px" h={32} style={{ marginBottom: '8px' }} />
        <Skeleton w="340px" h={16} style={{ marginBottom: '32px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '26px' }}>
          <Skeleton h={170} r={18} />
          {[1, 2, 3].map(i => <Skeleton key={i} h={150} r={18} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) 1fr', gap: '20px', marginBottom: '26px' }}>
          <Skeleton h={240} r={18} />
          <Skeleton h={240} r={18} />
        </div>
        <Skeleton h={160} r={18} style={{ marginBottom: '26px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <Skeleton h={220} r={18} />
          <Skeleton h={220} r={18} />
        </div>
      </div>
    )
  }


  // ── Error state ───────────────────────────────────────────────────────────
  if (fetchError) {
    return (
      <div style={{ padding: '32px', maxWidth: '1120px', margin: '0 auto', fontFamily: F }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: D, fontSize: '28px', fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.04em' }}>
            Invita y gana
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '6px 0 0', fontFamily: F }}>
            Gana creditos y conviertelos en campanas o dinero
          </p>
        </div>
        <ErrorBanner message={fetchError} onRetry={() => setRetryKey(k => k + 1)} />
      </div>
    )
  }


  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '32px', maxWidth: '1120px', margin: '0 auto', fontFamily: F, display: 'flex', flexDirection: 'column', gap: '26px' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 style={{ fontFamily: D, fontSize: '28px', fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.04em' }}>
          Invita y gana
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '6px 0 0', fontFamily: F }}>
          Gana creditos y conviertelos en campanas o dinero
        </p>
      </div>

      {/* ── Credits Hero + KPI Cards ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>

        {/* Credits hero card */}
        <div style={{
          background: `linear-gradient(135deg, ${PURPLE} 0%, ${GREEN_DARK} 100%)`,
          borderRadius: '18px', padding: '24px', color: '#fff',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ position: 'absolute', bottom: '-30px', right: '20px', width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <Gift size={20} color="rgba(255,255,255,0.7)" style={{ marginBottom: '12px' }} />
          <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '6px' }}>Creditos disponibles</div>
          <div style={{ fontFamily: D, fontSize: '38px', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '8px' }}>
            €{data.creditsBalance.toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.7 }}>Usa tus creditos en campanas o conviertelos a dinero</div>
        </div>

        {/* KPI cards */}
        {[
          { icon: DollarSign, label: 'Disponible para retirar', val: `€${data.cashBalance.toFixed(2)}`, sub: data.tier !== 'normal' ? 'Retirable' : 'Requiere nivel Power', color: OK, subColor: data.tier !== 'normal' ? OK : WARN },
          { icon: TrendingUp, label: 'Campanas generadas', val: `€${data.gmvGenerated.toFixed(0)}`, sub: `${data.referralCount} referidos`, color: BLUE },
          { icon: Users, label: 'Referidos activos', val: `${data.referralCount}`, sub: `Nivel ${data.tier.charAt(0).toUpperCase() + data.tier.slice(1)}`, color: WARN },
        ].map(({ icon: Icon, label, val, sub, color, subColor }) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', padding: '22px', transition: 'border-color .15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = greenAlpha(0.3) }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
              <Icon size={17} color={color} />
            </div>
            <div style={{ fontFamily: D, fontSize: '24px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: '3px' }}>{val}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>{label}</div>
            {sub && <div style={{ display: 'inline-flex', fontSize: '11px', fontWeight: 600, color: subColor || color, background: `${subColor || color}12`, borderRadius: '20px', padding: '2px 8px' }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* ── 2-col: Chart + Referral Link ───────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) 1fr', gap: '20px' }}>

        {/* Monthly earnings chart */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <h2 style={{ fontFamily: D, fontSize: '15px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              Evolucion de ganancias
            </h2>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '18px', margin: '4px 0 18px' }}>Historico de creditos generados por referidos</p>
          <EarningsChart data={data.monthlyEarnings} />
          <div style={{
            display: 'flex', alignItems: 'center', gap: '24px',
            paddingTop: '16px', borderTop: '1px solid var(--border)', marginTop: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: GREEN }} />
              <span style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: F }}>
                Creditos: <span style={{ color: 'var(--text)', fontWeight: 600 }}>€{data.creditsBalance.toFixed(2)}</span>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: OK }} />
              <span style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: F }}>
                Retirable: <span style={{ color: 'var(--text)', fontWeight: 600 }}>€{data.cashBalance.toFixed(2)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Referral link card */}
        <div style={{
          background: `linear-gradient(135deg, ${greenAlpha(0.08)} 0%, ${greenAlpha(0.03)} 100%)`,
          border: `1px solid ${greenAlpha(0.18)}`,
          borderRadius: '18px', padding: '22px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '90px', height: '90px', borderRadius: '50%', background: greenAlpha(0.06) }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '11px',
              background: greenAlpha(0.15), display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Users size={17} color={PURPLE} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', fontFamily: D }}>
                Invitar anunciantes
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: F }}>
                Comparte tu enlace y gana por cada referido
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'var(--bg)', borderRadius: '10px',
            border: '1px solid var(--border)', padding: '4px 4px 4px 14px',
          }}>
            <span style={{
              flex: 1, fontSize: '13px', color: 'var(--muted)', fontFamily: F,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              userSelect: 'all',
            }}>
              {referralLink}
            </span>
            <button
              onClick={copyLink}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 20px', borderRadius: '8px', border: 'none',
                background: copied ? OK : PURPLE,
                color: '#fff', fontSize: '13px', fontWeight: 600, fontFamily: F,
                cursor: 'pointer', transition: 'background .15s, transform .15s', flexShrink: 0,
                boxShadow: copied ? 'none' : `0 3px 10px ${greenAlpha(0.3)}`,
              }}
              onMouseEnter={e => { if (!copied) e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: F, marginTop: '14px', lineHeight: 1.5 }}>
            Cada anunciante que se registre con tu enlace te genera creditos automaticamente.
          </div>
        </div>
      </div>

      {/* ── Tier Progress Card ─────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '18px', padding: '22px',
      }}>
        <h2 style={{ fontFamily: D, fontSize: '15px', fontWeight: 700, color: 'var(--text)', margin: '0 0 24px' }}>
          Nivel de referidos
        </h2>

        {/* Tier steps */}
        <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative', marginBottom: '24px' }}>
          {TIERS.map((tier, i) => {
            const isActive = i <= currentTierIdx
            const isCurrent = i === currentTierIdx
            return (
              <div key={tier.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                {/* connecting line */}
                {i < TIERS.length - 1 && (
                  <div style={{
                    position: 'absolute', top: '19px', left: '50%', right: '-50%',
                    height: '3px', zIndex: 0,
                    background: i < currentTierIdx
                      ? `linear-gradient(90deg, ${PURPLE}, ${PURPLE})`
                      : 'var(--border)',
                    transition: 'background .3s',
                  }} />
                )}

                {/* circle */}
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: isActive
                    ? `linear-gradient(135deg, ${PURPLE}, ${GREEN_DARK})`
                    : 'var(--bg)',
                  border: isActive ? 'none' : '2px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 1, position: 'relative',
                  boxShadow: isCurrent ? `0 0 0 4px ${greenAlpha(0.2)}` : 'none',
                  transition: 'box-shadow .3s, background .3s',
                }}>
                  {isActive ? (
                    <Check size={16} color="#fff" strokeWidth={2.5} />
                  ) : (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--muted)' }} />
                  )}
                </div>

                {/* label + description */}
                <div style={{ marginTop: '12px', textAlign: 'center' }}>
                  <div style={{
                    fontSize: '14px', fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? PURPLE : isActive ? 'var(--text)' : 'var(--muted)',
                    fontFamily: D, marginBottom: '4px',
                  }}>
                    {tier.label}
                  </div>
                  <div style={{
                    fontSize: '11px', color: 'var(--muted)', fontFamily: F,
                    maxWidth: '160px', lineHeight: '1.4',
                  }}>
                    {tier.desc}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Progress text */}
        {data.tierProgress && data.tierProgress.nextTier && (
          <div style={{
            fontSize: '13px', color: 'var(--muted)', fontFamily: F,
            padding: '12px 16px', borderRadius: '10px',
            background: greenAlpha(0.06), border: `1px solid ${greenAlpha(0.12)}`,
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <ChevronRight size={14} color={PURPLE} />
            <span>
              {data.tierProgress.referralsNeeded > 0 ? (
                <>Te faltan <strong style={{ color: GREEN }}>{data.tierProgress.referralsNeeded} referidos</strong> para desbloquear <strong style={{ color: 'var(--text)' }}>{data.tierProgress.nextTier.charAt(0).toUpperCase() + data.tierProgress.nextTier.slice(1)}</strong></>
              ) : data.tierProgress.gmvNeeded > 0 ? (
                <>Genera <strong style={{ color: GREEN }}>€{data.tierProgress.gmvNeeded?.toLocaleString()}</strong> en campanas de tus referidos para desbloquear <strong style={{ color: 'var(--text)' }}>{data.tierProgress.nextTier.charAt(0).toUpperCase() + data.tierProgress.nextTier.slice(1)}</strong></>
              ) : null}
            </span>
          </div>
        )}
      </div>

      {/* ── 2-col: Convert + Referrals List ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Convert credits card */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '18px', padding: '22px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: `${OK}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={17} color={OK} />
            </div>
            <div>
              <h2 style={{ fontFamily: D, fontSize: '15px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Convertir creditos</h2>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 0' }}>Convierte tus creditos a saldo retirable</p>
            </div>
          </div>

          {canConvert ? (
            <>
              {/* Rate display */}
              <div style={{
                background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px',
                padding: '14px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: F }}>Tasa de conversion</span>
                <span style={{ fontFamily: D, fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>1 credito = €1.00</span>
              </div>

              {/* Preset amount buttons */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Selecciona un importe
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '8px' }}>
                  {[...CONVERT_PRESETS, data.creditsBalance].map((amt, i) => {
                    const isAll = i === CONVERT_PRESETS.length
                    const label = isAll ? 'Todo' : `€${amt}`
                    const selected = convertAmount === String(amt)
                    return (
                      <button key={i} onClick={() => setConvertAmount(String(amt))} style={{
                        background: selected ? PURPLE : 'var(--bg)',
                        border: `1px solid ${selected ? PURPLE : 'var(--border)'}`,
                        borderRadius: '11px', padding: '10px 8px',
                        fontFamily: D, fontSize: '14px', fontWeight: 700,
                        color: selected ? '#fff' : 'var(--text)',
                        cursor: 'pointer',
                        boxShadow: selected ? `0 3px 10px ${greenAlpha(0.3)}` : 'none',
                        transition: 'all .15s',
                      }}>
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Custom amount input */}
              <div style={{ position: 'relative', marginBottom: '14px' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '16px', fontFamily: D, fontWeight: 700 }}>€</span>
                <input
                  type="number"
                  placeholder="Cantidad personalizada"
                  value={convertAmount}
                  onChange={e => setConvertAmount(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '12px 14px 12px 32px',
                    borderRadius: '11px', border: '1px solid var(--border)',
                    background: 'var(--bg)', color: 'var(--text)',
                    fontSize: '16px', fontWeight: 700, fontFamily: D, outline: 'none',
                    transition: 'border-color .15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = greenAlpha(0.5) }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleConvert}
                disabled={converting || !convertAmount}
                style={{
                  width: '100%', padding: '13px', borderRadius: '11px', border: 'none',
                  background: converting ? greenAlpha(0.5) : PURPLE,
                  color: '#fff', fontSize: '14px', fontWeight: 700, fontFamily: F,
                  cursor: converting ? 'wait' : 'pointer',
                  transition: TRANSITION,
                  opacity: !convertAmount ? 0.5 : 1,
                  boxShadow: `0 4px 14px ${greenAlpha(0.35)}`,
                }}
                onMouseEnter={e => { if (!converting && convertAmount) e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
              >
                {converting ? 'Convirtiendo...' : 'Convertir a dinero'}
              </button>

              {convertMsg && (
                <div style={{
                  fontSize: '13px', fontFamily: F, fontWeight: 500,
                  color: convertMsg.type === 'success' ? OK : ERR,
                  padding: '8px 12px', borderRadius: '8px', marginTop: '10px',
                  background: convertMsg.type === 'success' ? `${OK}12` : `${ERR}12`,
                }}>
                  {convertMsg.text}
                </div>
              )}
            </>
          ) : (
            <div style={{
              textAlign: 'center', padding: '32px 16px',
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px',
                background: greenAlpha(0.08), display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px',
              }}>
                <Gift size={22} color={PURPLE} strokeWidth={1.5} />
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', fontFamily: D, marginBottom: '6px' }}>
                Nivel Normal
              </div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: F, lineHeight: 1.5 }}>
                Gana creditos para lanzar campanas gratis. Desbloquea nivel <strong style={{ color: GREEN }}>Power</strong> para retirar dinero.
              </div>
            </div>
          )}
        </div>

        {/* Referrals list */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '18px', overflow: 'hidden',
        }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontFamily: D, fontSize: '15px', fontWeight: 700, color: 'var(--text)', margin: 0, marginBottom: '2px' }}>
                Tus referidos
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>{data.referrals.length} registrados</p>
            </div>
            <span style={{
              fontSize: '12px', fontWeight: 600, color: GREEN, fontFamily: F,
              padding: '4px 10px', borderRadius: '20px', background: greenAlpha(0.1),
            }}>
              {data.referrals.length}
            </span>
          </div>

          {data.referrals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '16px',
                background: greenAlpha(0.08), display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <Users size={24} color={PURPLE} strokeWidth={1.5} />
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', fontFamily: D, marginBottom: '6px' }}>
                Aun no tienes referidos
              </div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: F }}>
                Comparte tu enlace para empezar a ganar creditos.
              </div>
            </div>
          ) : (
            <div>
              {/* Table header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 110px',
                padding: '10px 20px', background: 'var(--bg)',
                borderBottom: '1px solid var(--border)',
              }}>
                {['Usuario', 'Fecha', 'Gasto', 'Estado'].map(h => (
                  <span key={h} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {h}
                  </span>
                ))}
              </div>

              {/* Table rows */}
              {data.referrals.map((ref, i) => (
                <ReferralRow key={ref.id || i} referral={ref} isLast={i === data.referrals.length - 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


// ─── Status config ──────────────────────────────────────────────────────────
const STATUS_MAP = {
  active:     { label: 'Activo',     color: OK,   bg: `${OK}15`,   border: `${OK}30` },
  converting: { label: 'Comprando',  color: BLUE, bg: `${BLUE}15`, border: `${BLUE}30` },
  engaged:    { label: 'Explorando', color: WARN, bg: `${WARN}15`, border: `${WARN}30` },
  verified:   { label: 'Verificado', color: GREEN, bg: greenAlpha(0.12), border: greenAlpha(0.25) },
  registered: { label: 'Registrado', color: 'var(--muted)', bg: 'var(--bg)', border: 'var(--border)' },
}

// ─── Milestone dots ─────────────────────────────────────────────────────────
function MilestoneDots({ milestones }) {
  if (!milestones) return null
  const steps = [
    { key: 'registered', tip: 'Registrado' },
    { key: 'emailVerified', tip: 'Email verificado' },
    { key: 'hasChannel', tip: 'Canal creado' },
    { key: 'createdCampaign', tip: 'Campana creada' },
    { key: 'paidCampaign', tip: 'Campana pagada' },
    { key: 'completedCampaign', tip: 'Campana completada' },
  ]
  return (
    <div style={{ display: 'flex', gap: '3px', marginTop: '4px' }} title={steps.filter(s => milestones[s.key]).map(s => s.tip).join(' > ')}>
      {steps.map(s => (
        <div key={s.key} style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: milestones[s.key] ? OK : 'var(--border)',
          transition: 'background .2s',
        }} />
      ))}
    </div>
  )
}

// ─── Referral row ────────────────────────────────────────────────────────────
function ReferralRow({ referral, isLast }) {
  const [hovered, setHovered] = useState(false)
  const st = STATUS_MAP[referral.status] || STATUS_MAP.registered
  const dateStr = (referral.joinedAt || referral.createdAt)
    ? new Date(referral.joinedAt || referral.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
    : referral.date || '-'
  const displayName = referral.nombre || referral.name || referral.email || 'Usuario'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 110px',
        padding: '14px 20px', alignItems: 'center',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        background: hovered ? 'var(--bg2)' : 'transparent',
        transition: 'background .15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: greenAlpha(0.12), display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: 700, color: GREEN, fontFamily: D,
        }}>
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <span style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text)', fontFamily: F, display: 'block' }}>
            {displayName}
          </span>
          <MilestoneDots milestones={referral.milestones} />
        </div>
      </div>

      <span style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: F }}>
        {dateStr}
      </span>

      <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)', fontFamily: D }}>
        €{(referral.gmvGenerated || referral.gmv || referral.spent || 0).toFixed(2)}
      </span>

      <div>
        <span style={{
          fontSize: '11px', fontWeight: 600, fontFamily: F,
          padding: '4px 10px', borderRadius: '20px',
          color: st.color,
          background: st.bg,
          border: `1px solid ${st.border}`,
        }}>
          {st.label}
        </span>
      </div>
    </div>
  )
}
