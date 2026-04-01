import React, { useState, useEffect } from 'react'
import { Copy, Check, Users, DollarSign, TrendingUp, Gift, ChevronRight, ArrowUpRight } from 'lucide-react'
import apiService from '../../../../../services/api'
import {
  PURPLE, PURPLE_DARK, purpleAlpha, FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE, TRANSITION,
} from '../../../theme/tokens'


// ─── Aliases ──────────────────────────────────────────────────────────────────
const F = FONT_BODY
const D = FONT_DISPLAY


// ─── Bar chart ────────────────────────────────────────────────────────────────
function EarningsChart({ data }) {
  const max = Math.max(...data.map(d => d.amount), 1)
  const [hoverIdx, setHoverIdx] = useState(null)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '120px', paddingBottom: '24px' }}>
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
                  ? `linear-gradient(180deg, ${purpleAlpha(1)} 0%, ${PURPLE_DARK} 100%)`
                  : isHov ? purpleAlpha(0.55) : purpleAlpha(0.25),
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


// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, color }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${hovered ? purpleAlpha(0.35) : 'var(--border)'}`,
        borderRadius: '16px',
        padding: '24px',
        display: 'flex', flexDirection: 'column', gap: '14px',
        transition: 'border-color .2s, box-shadow .2s, transform .2s',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? `0 8px 32px ${purpleAlpha(0.1)}` : '0 1px 4px rgba(0,0,0,0.06)',
        cursor: 'default', position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '16px',
        background: hovered ? purpleAlpha(0.03) : 'transparent',
        transition: 'background .2s', pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '11px',
          background: `${color}15`, border: `1px solid ${color}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={color} strokeWidth={2} />
        </div>
        <ArrowUpRight size={14} color="var(--muted)" style={{ opacity: hovered ? 1 : 0, transition: 'opacity .2s' }} />
      </div>

      <div style={{ zIndex: 1 }}>
        <div style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: F, fontWeight: 500, marginBottom: '6px', letterSpacing: '0.02em' }}>
          {label}
        </div>
        <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text)', fontFamily: D, letterSpacing: '-0.02em' }}>
          {value}
        </div>
      </div>
    </div>
  )
}


// ─── Tier step ────────────────────────────────────────────────────────────────
const TIERS = [
  { key: 'normal',  label: 'Normal',  desc: 'Gana creditos para lanzar campanas gratis' },
  { key: 'power',   label: 'Power',   desc: 'Ahora puedes retirar parte de tus ganancias' },
  { key: 'partner', label: 'Partner', desc: 'Monetiza completamente tu red' },
]

function tierIndex(tier) {
  const idx = TIERS.findIndex(t => t.key === tier)
  return idx >= 0 ? idx : 0
}


// ─── Loading skeleton ─────────────────────────────────────────────────────────
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


// ─── Main component ───────────────────────────────────────────────────────────
export default function ReferralsPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [convertAmount, setConvertAmount] = useState('')
  const [converting, setConverting] = useState(false)
  const [convertMsg, setConvertMsg] = useState(null)

  useEffect(() => {
    apiService.getReferralStats().then(res => {
      if (res?.success) setStats(res.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

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

  // Mock data fallback
  const data = stats || {
    referralCode: 'ADF3X9',
    creditsBalance: 0,
    cashBalance: 0,
    tier: 'normal',
    gmvGenerated: 0,
    referralCount: 0,
    conversionRate: 0,
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


  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '32px', maxWidth: '1120px', margin: '0 auto', fontFamily: F }}>
        <style>{`@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
        <Skeleton w="220px" h={32} style={{ marginBottom: '8px' }} />
        <Skeleton w="340px" h={16} style={{ marginBottom: '32px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
          {[1,2,3,4].map(i => <Skeleton key={i} h={130} r={16} />)}
        </div>
        <Skeleton h={260} r={16} style={{ marginBottom: '24px' }} />
        <Skeleton h={120} r={16} style={{ marginBottom: '24px' }} />
        <Skeleton h={160} r={16} />
      </div>
    )
  }


  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '32px', maxWidth: '1120px', margin: '0 auto', fontFamily: F }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontFamily: D, fontSize: '28px', fontWeight: 800,
          color: 'var(--text)', margin: 0, letterSpacing: '-0.02em',
        }}>
          Invita y gana
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '6px 0 0', fontFamily: F }}>
          Gana creditos y conviertelos en campanas o dinero
        </p>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <KpiCard
          icon={Gift}
          label="Creditos disponibles"
          value={`€${data.creditsBalance.toFixed(2)}`}
          color={PURPLE}
        />
        <KpiCard
          icon={DollarSign}
          label="Disponible para retirar"
          value={`€${data.cashBalance.toFixed(2)}`}
          color={OK}
        />
        <KpiCard
          icon={TrendingUp}
          label="Total generado"
          value={`€${data.gmvGenerated.toFixed(2)}`}
          color={BLUE}
        />
        <KpiCard
          icon={Users}
          label="Referidos activos"
          value={`${data.referralCount}`}
          color={WARN}
        />
      </div>

      {/* ── Earnings Chart Card ────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '24px', marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: D, fontSize: '18px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            Evolucion de ganancias
          </h2>
        </div>

        <EarningsChart data={data.monthlyEarnings} />

        <div style={{
          display: 'flex', alignItems: 'center', gap: '24px',
          paddingTop: '16px', borderTop: '1px solid var(--border)', marginTop: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: PURPLE }} />
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: F }}>
              Creditos disponibles: <span style={{ color: 'var(--text)', fontWeight: 600 }}>€{data.creditsBalance.toFixed(2)}</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: OK }} />
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: F }}>
              Retirable: <span style={{ color: 'var(--text)', fontWeight: 600 }}>€{data.cashBalance.toFixed(2)}</span>
            </span>
          </div>
        </div>

        {/* Convert section */}
        <div style={{ marginTop: '20px' }}>
          {canConvert ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <input
                  type="number"
                  placeholder="Cantidad a convertir"
                  value={convertAmount}
                  onChange={e => setConvertAmount(e.target.value)}
                  style={{
                    flex: 1, maxWidth: '200px', padding: '10px 14px',
                    borderRadius: '10px', border: '1px solid var(--border)',
                    background: 'var(--bg)', color: 'var(--text)',
                    fontSize: '14px', fontFamily: F, outline: 'none',
                    transition: 'border-color .2s',
                  }}
                  onFocus={e => e.target.style.borderColor = PURPLE}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <button
                  onClick={handleConvert}
                  disabled={converting || !convertAmount}
                  style={{
                    padding: '10px 20px', borderRadius: '10px', border: 'none',
                    background: converting ? purpleAlpha(0.5) : PURPLE,
                    color: '#fff', fontSize: '14px', fontWeight: 600, fontFamily: F,
                    cursor: converting ? 'wait' : 'pointer',
                    transition: TRANSITION, opacity: !convertAmount ? 0.5 : 1,
                  }}
                >
                  {converting ? 'Convirtiendo...' : 'Convertir a dinero'}
                </button>
              </div>
              {convertMsg && (
                <div style={{
                  fontSize: '13px', fontFamily: F, fontWeight: 500,
                  color: convertMsg.type === 'success' ? OK : ERR,
                  padding: '8px 12px', borderRadius: '8px',
                  background: convertMsg.type === 'success' ? `${OK}12` : `${ERR}12`,
                  display: 'inline-block',
                }}>
                  {convertMsg.text}
                </div>
              )}
            </div>
          ) : (
            <div style={{
              fontSize: '13px', color: 'var(--muted)', fontFamily: F,
              padding: '12px 16px', borderRadius: '10px',
              background: purpleAlpha(0.06), border: `1px solid ${purpleAlpha(0.12)}`,
            }}>
              <Gift size={14} style={{ marginRight: '6px', verticalAlign: '-2px' }} color={PURPLE} />
              Gana creditos para lanzar campanas gratis
            </div>
          )}
        </div>
      </div>

      {/* ── Referral Link Card ─────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${purpleAlpha(0.08)} 0%, ${purpleAlpha(0.03)} 100%)`,
        border: `1px solid ${purpleAlpha(0.18)}`,
        borderRadius: '16px', padding: '24px', marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: purpleAlpha(0.15), display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Users size={18} color={PURPLE} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', fontFamily: D }}>
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
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              background: copied ? OK : PURPLE,
              color: '#fff', fontSize: '13px', fontWeight: 600, fontFamily: F,
              cursor: 'pointer', transition: 'background .2s', flexShrink: 0,
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>

      {/* ── Tier Progress Card ─────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '24px', marginBottom: '24px',
      }}>
        <h2 style={{ fontFamily: D, fontSize: '18px', fontWeight: 700, color: 'var(--text)', margin: '0 0 24px' }}>
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
                    position: 'absolute', top: '18px', left: '50%', right: '-50%',
                    height: '3px', zIndex: 0,
                    background: i < currentTierIdx
                      ? `linear-gradient(90deg, ${PURPLE}, ${PURPLE})`
                      : 'var(--border)',
                    transition: 'background .3s',
                  }} />
                )}

                {/* circle */}
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: isActive
                    ? `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})`
                    : 'var(--bg)',
                  border: isActive ? 'none' : '2px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 1, position: 'relative',
                  boxShadow: isCurrent ? `0 0 0 4px ${purpleAlpha(0.2)}` : 'none',
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
            background: purpleAlpha(0.06), border: `1px solid ${purpleAlpha(0.12)}`,
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <ChevronRight size={14} color={PURPLE} />
            <span>
              Te faltan <strong style={{ color: PURPLE }}>{data.tierProgress.referralsNeeded} referidos</strong> y{' '}
              <strong style={{ color: PURPLE }}>€{data.tierProgress.gmvNeeded?.toLocaleString()}</strong> en GMV para desbloquear{' '}
              <strong style={{ color: 'var(--text)' }}>{data.tierProgress.nextTier.charAt(0).toUpperCase() + data.tierProgress.nextTier.slice(1)}</strong>
            </span>
          </div>
        )}
      </div>

      {/* ── Referrals List ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: D, fontSize: '18px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            Tus referidos
          </h2>
          <span style={{
            fontSize: '12px', fontWeight: 600, color: PURPLE, fontFamily: F,
            padding: '4px 10px', borderRadius: '20px', background: purpleAlpha(0.1),
          }}>
            {data.referrals.length}
          </span>
        </div>

        {data.referrals.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '48px 24px',
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: purpleAlpha(0.08), display: 'flex', alignItems: 'center', justifyContent: 'center',
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
              display: 'grid', gridTemplateColumns: '2fr 1fr 100px',
              padding: '10px 16px', borderRadius: '8px',
              background: 'var(--bg)',
            }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Usuario
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Gasto generado
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>
                Estado
              </span>
            </div>

            {/* Table rows */}
            {data.referrals.map((ref, i) => (
              <ReferralRow key={ref.id || i} referral={ref} isLast={i === data.referrals.length - 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


// ─── Referral row ─────────────────────────────────────────────────────────────
function ReferralRow({ referral, isLast }) {
  const [hovered, setHovered] = useState(false)
  const isActive = referral.status === 'active' || referral.active

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid', gridTemplateColumns: '2fr 1fr 100px',
        padding: '14px 16px', alignItems: 'center',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        background: hovered ? purpleAlpha(0.03) : 'transparent',
        transition: 'background .15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: purpleAlpha(0.12), display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: 700, color: PURPLE, fontFamily: D,
        }}>
          {(referral.name || referral.email || '?').charAt(0).toUpperCase()}
        </div>
        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', fontFamily: F }}>
          {referral.name || referral.email || 'Usuario'}
        </span>
      </div>

      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', fontFamily: F }}>
        €{(referral.gmv || referral.spent || 0).toFixed(2)}
      </span>

      <div style={{ textAlign: 'right' }}>
        <span style={{
          fontSize: '11px', fontWeight: 600, fontFamily: F,
          padding: '4px 10px', borderRadius: '20px',
          color: isActive ? OK : 'var(--muted)',
          background: isActive ? `${OK}15` : 'var(--bg)',
          border: `1px solid ${isActive ? `${OK}30` : 'var(--border)'}`,
        }}>
          {isActive ? 'Activo' : 'Inactivo'}
        </span>
      </div>
    </div>
  )
}
