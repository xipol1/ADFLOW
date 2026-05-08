import React from 'react'
import { Clock, Link2, ShieldCheck, CheckCircle2 } from 'lucide-react'

export default function DemoCreatorPublish() {
  return (
    <div>
      {/* Header — campaign + countdown */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14, paddingBottom: 14,
        borderBottom: '1px solid var(--border)',
      }}>
        <div>
          <p style={{
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.12em', color: 'var(--muted)', margin: '0 0 4px',
          }}>
            Campaña aceptada
          </p>
          <h3 style={{
            fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text)',
            letterSpacing: '-0.01em',
          }}>
            Q4_SaaS · NorthFlow → tu canal Telegram
          </h3>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 11px', borderRadius: 999,
          background: 'rgba(245,158,11,0.10)', color: '#b45309',
          fontSize: 10, fontWeight: 600,
        }}>
          <Clock size={11} strokeWidth={2.4} />
          Publicar antes de viernes 15 nov
        </div>
      </div>

      {/* Telegram-style preview of the ad */}
      <div style={{
        background: 'linear-gradient(180deg, #d4ecff 0%, #b3d9ff 100%)',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        position: 'relative',
      }}>
        <p style={{
          fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.1em', color: 'rgba(15,17,21,0.55)', margin: '0 0 10px',
        }}>
          Preview · Telegram
        </p>
        <div style={{
          background: '#fff',
          borderRadius: '12px 12px 12px 4px',
          padding: '10px 12px',
          maxWidth: '90%',
          boxShadow: '0 1px 1px rgba(15,17,21,0.06)',
          position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{
              width: 22, height: 22, borderRadius: '50%',
              background: '#7C3AED', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700,
            }}>NF</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#0F1115' }}>NorthFlow</span>
            <span style={{
              fontSize: 8, fontWeight: 600,
              padding: '1px 5px', borderRadius: 4,
              background: 'rgba(34,197,94,0.14)', color: '#15803d',
              letterSpacing: '0.04em',
            }}>
              PARTNER
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#0F1115', lineHeight: 1.5, margin: '0 0 6px' }}>
            <strong>¿Cómo califico leads B2B sin gastar 4h al día?</strong>
            <br />
            Llevo 3 meses usando <a style={{ color: '#229ED9', textDecoration: 'none' }}>NorthFlow</a> y
            ha cambiado mi pipeline. Su scoring convierte 3× mejor — esto es lo que cambió:
          </p>
          <ul style={{ fontSize: 11, color: 'rgba(15,17,21,0.75)', lineHeight: 1.5, margin: '0 0 6px', paddingLeft: 16 }}>
            <li>Score de intent en tiempo real, no batches semanales</li>
            <li>Integración nativa con HubSpot y Salesforce</li>
            <li>20% de descuento con código <strong>CHANNELAD20</strong></li>
          </ul>
          <p style={{ fontSize: 11, color: '#229ED9', margin: 0, fontWeight: 600 }}>
            👉 northflow.io/channelad
          </p>
          <span style={{
            position: 'absolute', bottom: 4, right: 8,
            fontSize: 9, color: 'rgba(15,17,21,0.4)',
          }}>14:32 · Hoy</span>
        </div>
      </div>

      {/* Tracking link + verification status */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
      }}>
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '10px 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Link2 size={12} strokeWidth={2.4} style={{ color: '#229ED9' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Tracking link
            </span>
          </div>
          <code style={{
            fontSize: 11, color: 'var(--text)', fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            c.io/r/xK9z23
          </code>
          <p style={{ fontSize: 10, color: 'var(--muted)', margin: '4px 0 0' }}>
            Único por canal · UTM auto-añadido
          </p>
        </div>
        <div style={{
          background: 'rgba(34,197,94,0.06)',
          border: '1px solid rgba(34,197,94,0.18)',
          borderRadius: 10,
          padding: '10px 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <ShieldCheck size={12} strokeWidth={2.4} style={{ color: '#16a34a' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Verificación auto
            </span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600, margin: 0 }}>
            3 clicks únicos en 48h
          </p>
          <p style={{ fontSize: 10, color: 'var(--muted)', margin: '4px 0 0' }}>
            Al verificar, el escrow se libera a tu balance.
          </p>
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        marginTop: 12, padding: '10px 12px',
        background: 'rgba(34,197,94,0.08)',
        borderRadius: 9,
        fontSize: 11, color: '#15803d', fontWeight: 600,
      }}>
        <CheckCircle2 size={13} strokeWidth={2.4} />
        Estás listo para publicar. Cuando lo hagas, marca este paso como completado.
      </div>
    </div>
  )
}
