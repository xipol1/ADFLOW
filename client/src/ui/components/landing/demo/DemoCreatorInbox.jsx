import React from 'react'
import { Check, MessageSquare, X, Shield } from 'lucide-react'

const PROPOSALS = [
  {
    advertiser: 'NorthFlow',
    advertiserInitials: 'NF',
    advertiserColor: '#7C3AED',
    verified: true,
    platform: 'Telegram',
    platformColor: '#229ED9',
    price: 480,
    deadline: 'Vie 15 nov',
    preview: '"Comparte tu proceso real de scoring de leads B2B. Nuestro CRM convierte 3× mejor en pipeline de SaaS — adjuntamos UTM y código promo CHANNELAD20."',
    status: 'new',
  },
  {
    advertiser: 'Stripe Connect',
    advertiserInitials: 'SC',
    advertiserColor: '#635BFF',
    verified: true,
    platform: 'Newsletter',
    platformColor: '#F59E0B',
    price: 720,
    deadline: 'Lun 18 nov',
    preview: '"Caso de estudio: cómo una startup B2B redujo el churn al 4% con escrow on-chain. Pieza editorial 800 palabras + CTA opcional al final."',
    status: 'pending',
  },
  {
    advertiser: 'Linear',
    advertiserInitials: 'L',
    advertiserColor: '#5E6AD2',
    verified: true,
    platform: 'Discord',
    platformColor: '#5865F2',
    price: 390,
    deadline: 'Mié 13 nov',
    preview: '"Mensaje en tu canal de devs sobre la nueva integración Linear↔Slack. Te enviamos 3 variantes de copy y eliges cuál encaja mejor."',
    status: 'new',
  },
]

export default function DemoCreatorInbox() {
  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14, paddingBottom: 14,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'rgba(34,197,94,0.10)', color: '#16a34a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MessageSquare size={16} strokeWidth={2.2} />
          </div>
          <div>
            <h3 style={{
              fontSize: 14, fontWeight: 700, margin: 0,
              color: 'var(--text)', letterSpacing: '-0.01em',
            }}>
              Inbox
            </h3>
            <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
              3 propuestas pendientes · 1.590 € en escrow
            </p>
          </div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700,
          padding: '4px 9px', borderRadius: 6,
          background: 'rgba(34,197,94,0.12)', color: '#16a34a',
          letterSpacing: '0.04em',
        }}>
          ↑ 2 NUEVAS
        </span>
      </div>

      {/* Proposal list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {PROPOSALS.map((p, i) => (
          <div
            key={`${p.advertiser}-${i}`}
            style={{
              background: 'var(--surface)',
              border: `1px solid ${p.status === 'new' ? 'rgba(34,197,94,0.30)' : 'var(--border)'}`,
              borderRadius: 12,
              padding: 14,
              boxShadow: p.status === 'new'
                ? '0 0 0 1px rgba(34,197,94,0.10), 0 8px 24px -16px rgba(34,197,94,0.30)'
                : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: p.advertiserColor, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
              }}>
                {p.advertiserInitials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {p.advertiser}
                  {p.verified && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      fontSize: 9, fontWeight: 600,
                      background: 'rgba(34,197,94,0.12)', color: '#16a34a',
                      padding: '1px 6px', borderRadius: 4,
                      letterSpacing: '0.04em',
                    }}>
                      <Shield size={8} strokeWidth={2.6} />
                      KYC
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  <span style={{ color: p.platformColor, fontWeight: 600 }}>{p.platform}</span> · publicar antes de {p.deadline}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: 17, fontWeight: 700, color: 'var(--text)',
                  letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums',
                }}>
                  {p.price} €
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>en escrow</div>
              </div>
            </div>

            <p style={{
              fontSize: 12, color: 'var(--muted)',
              lineHeight: 1.5, margin: '0 0 10px',
              fontStyle: 'italic',
              borderLeft: '2px solid var(--border)', paddingLeft: 10,
            }}>
              {p.preview}
            </p>

            <div style={{ display: 'flex', gap: 6 }}>
              <button style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '6px 12px', borderRadius: 7,
                background: '#16a34a', color: '#fff',
                border: 'none', cursor: 'default',
                fontSize: 11, fontWeight: 600,
              }}>
                <Check size={12} strokeWidth={2.6} /> Aceptar
              </button>
              <button style={{
                padding: '6px 12px', borderRadius: 7,
                background: 'var(--bg2)', color: 'var(--text)',
                border: '1px solid var(--border)', cursor: 'default',
                fontSize: 11, fontWeight: 600,
              }}>
                Negociar
              </button>
              <button style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '6px 12px', borderRadius: 7,
                background: 'transparent', color: 'var(--muted)',
                border: 'none', cursor: 'default',
                fontSize: 11, fontWeight: 500,
              }}>
                <X size={12} strokeWidth={2.6} /> Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
