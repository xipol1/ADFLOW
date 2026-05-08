import React from 'react'
import { CheckCircle2, ArrowRight, Building2, Hash } from 'lucide-react'

export default function DemoCreatorPayout() {
  return (
    <div>
      {/* Success header */}
      <div style={{
        textAlign: 'center', padding: '12px 0 18px',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(34,197,94,0.14)', color: '#16a34a',
          marginBottom: 10,
        }}>
          <CheckCircle2 size={30} strokeWidth={2.2} />
        </div>
        <h3 style={{
          fontSize: 17, fontWeight: 700,
          color: 'var(--text)', margin: '0 0 4px',
          letterSpacing: '-0.015em',
        }}>
          Retiro confirmado
        </h3>
        <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
          Referencia: <code style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text)' }}>PAY-20261108-A4C7</code>
        </p>
      </div>

      {/* Big amount */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(34,197,94,0.10) 0%, rgba(34,197,94,0.02) 100%)',
        border: '1px solid rgba(34,197,94,0.18)',
        borderRadius: 14,
        padding: '18px 20px',
        textAlign: 'center',
        marginBottom: 14,
      }}>
        <p style={{
          fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: 'var(--muted)', margin: '0 0 6px',
        }}>
          Importe transferido
        </p>
        <div style={{
          fontSize: 42, fontWeight: 800, color: 'var(--text)',
          letterSpacing: '-0.04em', lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}>
          312,00 €
        </div>
      </div>

      {/* Flow: escrow → balance → bank */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 6, marginBottom: 16,
      }}>
        <FlowChip label="Escrow" sub="Stripe Connect" filled />
        <ArrowRight size={14} strokeWidth={2.4} style={{ color: 'var(--muted)', flexShrink: 0 }} />
        <FlowChip label="Balance" sub="Channelad" filled />
        <ArrowRight size={14} strokeWidth={2.4} style={{ color: 'var(--muted)', flexShrink: 0 }} />
        <FlowChip label="Tu banco" sub="ES12 ●●●● 4421" filled active />
      </div>

      {/* Detail rows */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 14,
      }}>
        <Row icon={Building2} label="Cuenta destino" value="ES12 4521 ●●●● ●●●● 4421" sub="Banco Santander · SEPA" />
        <Row icon={Hash} label="Tipo de transferencia" value="SEPA Instant" sub="Sin comisiones bancarias" />
        <Row icon={CheckCircle2} label="Llega a tu banco" value="Mañana, 9 nov" sub="Antes de las 14:00 CET" lastRow />
      </div>

      <div style={{
        marginTop: 12,
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '9px 12px',
        background: 'rgba(34,197,94,0.08)',
        borderRadius: 9,
        fontSize: 11, color: '#15803d', fontWeight: 600,
      }}>
        <CheckCircle2 size={12} strokeWidth={2.4} />
        Sin comisiones bancarias · Sin retenciones · 100% del precio que tú fijaste
      </div>
    </div>
  )
}

function FlowChip({ label, sub, filled = false, active = false }) {
  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: active ? 'rgba(34,197,94,0.10)' : (filled ? 'var(--bg2)' : 'transparent'),
      border: `1px solid ${active ? 'rgba(34,197,94,0.30)' : 'var(--border)'}`,
      borderRadius: 10, padding: '8px 10px',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700,
        color: active ? '#16a34a' : 'var(--text)',
        letterSpacing: '-0.01em',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 9, color: 'var(--muted)', marginTop: 2,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {sub}
      </div>
    </div>
  )
}

function Row({ icon: Icon, label, value, sub, lastRow }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 11,
      paddingBottom: lastRow ? 0 : 11,
      marginBottom: lastRow ? 0 : 10,
      borderBottom: lastRow ? 'none' : '1px solid var(--border)',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: 'var(--bg2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={13} strokeWidth={2.2} style={{ color: 'var(--muted)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
          {label}
        </div>
        <div style={{
          fontSize: 13, color: 'var(--text)', fontWeight: 600, marginTop: 2,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>
        )}
      </div>
    </div>
  )
}
