import React from 'react'
import { Lock, CreditCard, Shield, ArrowRight } from 'lucide-react'

/**
 * Step 2 ("Paga seguro") demo — campaign confirmation + Stripe payment +
 * escrow protection block. Static mockup, decorative CTA only.
 */
export default function DemoEscrowPayment() {
  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          paddingBottom: 14,
          borderBottom: '1px solid var(--border)',
          marginBottom: 18,
          gap: 12,
        }}
      >
        <div>
          <p
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'var(--muted)',
              fontWeight: 600,
              margin: 0,
              marginBottom: 4,
            }}
          >
            Confirmar campaña
          </p>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0, letterSpacing: '-0.015em' }}>
            Q4_Test · Canal #042
          </h3>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(124, 58, 237, 0.10)',
            color: '#7C3AED',
            padding: '4px 10px',
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 600,
            border: '1px solid rgba(124, 58, 237, 0.18)',
          }}
        >
          <Lock size={11} strokeWidth={2.4} />
          Pago protegido
        </span>
      </div>

      {/* Channel summary */}
      <div
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 14,
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 5,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: '#fff',
                background: '#229ED9',
                marginBottom: 8,
                display: 'inline-block',
              }}
            >
              TELEGRAM
            </span>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 6 }}>
              Canal #042 · Tecnología
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              Tecnología · ES · 18.342 suscriptores
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: 9,
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Precio
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              1.247 €
            </div>
          </div>
        </div>
      </div>

      {/* Payment method */}
      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '12px 14px',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'var(--surface)',
        }}
      >
        <div
          style={{
            width: 36,
            height: 24,
            borderRadius: 4,
            background: 'linear-gradient(135deg, #635BFF 0%, #4F46E5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          <CreditCard size={12} strokeWidth={2.4} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>
            •••• •••• •••• 4242
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
            Stripe Connect · Conexión cifrada
          </div>
        </div>
        <span
          style={{
            fontSize: 10,
            color: '#16a34a',
            fontWeight: 600,
            background: 'rgba(34,197,94,0.12)',
            padding: '3px 8px',
            borderRadius: 4,
          }}
        >
          ✓ Verificado
        </span>
      </div>

      {/* Escrow box — the focal trust element */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(124,58,237,0.10) 100%)',
          border: '1px solid rgba(124, 58, 237, 0.20)',
          borderRadius: 12,
          padding: 14,
          marginBottom: 16,
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: '#7C3AED',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          <Shield size={16} strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
            Escrow activado
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.55 }}>
            Tus fondos quedan retenidos hasta que la publicación se verifica.
            Reembolso automático si el canal no publica en 48h.
          </div>
        </div>
      </div>

      {/* Total + CTA */}
      <div
        style={{
          paddingTop: 14,
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--muted)',
            fontWeight: 600,
          }}
        >
          Total a retener
        </span>
        <span
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--text)',
            letterSpacing: '-0.02em',
            fontFamily: "'Sora', system-ui, sans-serif",
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          1.247,00 €
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          background: 'linear-gradient(180deg, #8B5CF6 0%, #7C3AED 100%)',
          color: '#fff',
          padding: '12px 0',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'default',
          userSelect: 'none',
          letterSpacing: '-0.005em',
          boxShadow:
            '0 1px 0 0 rgba(255,255,255,0.18) inset, 0 8px 20px -6px rgba(124,58,237,0.45)',
        }}
      >
        Confirmar y pagar 1.247 €
        <ArrowRight size={14} strokeWidth={2.4} />
      </div>
    </div>
  )
}
