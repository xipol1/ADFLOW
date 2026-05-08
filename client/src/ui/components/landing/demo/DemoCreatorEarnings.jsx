import React from 'react'
import { Wallet, TrendingUp, Calendar } from 'lucide-react'

const PAYOUTS = [
  { date: 'vie 8 nov', amount: 312, advertiser: 'NorthFlow', status: 'paid' },
  { date: 'mar 5 nov', amount: 480, advertiser: 'Linear',    status: 'paid' },
  { date: 'lun 28 oct', amount: 215, advertiser: 'Stripe',    status: 'paid' },
]

const SPARK = [180, 220, 260, 240, 300, 320, 380, 420, 440, 480, 540, 580]

function Sparkline({ points, color = '#16a34a' }) {
  const W = 320
  const H = 56
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const step = W / (points.length - 1)
  const ys = points.map((v) => H - 4 - ((v - min) / range) * (H - 8))
  const path = ys.map((y, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(2)},${y.toFixed(2)}`).join(' ')
  const area = `${path} L${W},${H} L0,${H} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 56, display: 'block' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="creatorEarningsFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#creatorEarningsFill)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function DemoCreatorEarnings() {
  return (
    <div>
      {/* Big balance + sparkline */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(34,197,94,0.10) 0%, rgba(34,197,94,0.02) 100%)',
        border: '1px solid rgba(34,197,94,0.18)',
        borderRadius: 14,
        padding: 18,
        marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Wallet size={13} strokeWidth={2.2} style={{ color: '#16a34a' }} />
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
            Balance disponible
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{
            fontSize: 38, fontWeight: 800, color: 'var(--text)',
            letterSpacing: '-0.035em', lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}>
            1.247 €
          </span>
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#16a34a',
            background: 'rgba(34,197,94,0.14)',
            padding: '3px 8px', borderRadius: 5,
          }}>
            ↑ 22% mes
          </span>
        </div>
        <Sparkline points={SPARK} />
        <p style={{ fontSize: 10, color: 'var(--muted)', margin: '4px 0 0' }}>
          Últimos 30 días · Próximo payout viernes 15 nov
        </p>
      </div>

      {/* Pipeline + recent payouts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '10px 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Calendar size={11} strokeWidth={2.4} style={{ color: 'var(--muted)' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Próximo mes
            </span>
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
            840 €
          </div>
          <p style={{ fontSize: 10, color: 'var(--muted)', margin: '2px 0 0' }}>
            3 propuestas en escrow
          </p>
        </div>
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '10px 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <TrendingUp size={11} strokeWidth={2.4} style={{ color: 'var(--muted)' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              CPM medio
            </span>
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
            14,80 €
          </div>
          <p style={{ fontSize: 10, color: '#16a34a', margin: '2px 0 0' }}>
            +18% vs mediana B2B SaaS
          </p>
        </div>
      </div>

      {/* Recent payouts */}
      <div>
        <p style={{
          fontSize: 10, fontWeight: 700, color: 'var(--muted)',
          textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px',
        }}>
          Pagos recientes
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {PAYOUTS.map((p, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 12px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 9,
              fontSize: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#16a34a',
                }} />
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{p.advertiser}</span>
                <span style={{ color: 'var(--muted)' }}>· {p.date}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 13, fontWeight: 700, color: 'var(--text)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {p.amount} €
                </span>
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  padding: '2px 6px', borderRadius: 4,
                  background: 'rgba(34,197,94,0.14)', color: '#16a34a',
                  letterSpacing: '0.04em',
                }}>
                  PAGADO
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
