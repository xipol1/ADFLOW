import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY } from '../theme/tokens'

export default function ComingSoon({ feature }) {
  const { isCreador } = useAuth()
  const referralsPath = isCreador ? '/creator/referrals' : '/advertiser/referrals'

  return (
    <div style={{
      fontFamily: FONT_BODY,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '70vh', padding: '40px 20px',
    }}>
      <div style={{
        textAlign: 'center', maxWidth: '480px',
      }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '20px',
          background: purpleAlpha(0.08),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', fontSize: '36px',
        }}>
          🚀
        </div>

        <h2 style={{
          fontFamily: FONT_DISPLAY, fontSize: '26px', fontWeight: 800,
          color: 'var(--text)', marginBottom: '12px', lineHeight: 1.2,
        }}>
          {feature || 'Esta seccion'} estara disponible pronto
        </h2>

        <p style={{
          fontSize: '15px', color: 'var(--muted)', lineHeight: 1.7,
          marginBottom: '32px',
        }}>
          Estamos preparando todo para ofrecerte la mejor experiencia.
          Mientras tanto, invita a otros creadores y anunciantes para
          ganar creditos desde el primer dia.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to={referralsPath} style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: PURPLE, color: '#fff',
            borderRadius: '10px', padding: '12px 24px',
            fontSize: '14px', fontWeight: 600, textDecoration: 'none',
            fontFamily: FONT_BODY,
          }}>
            Invitar amigos y ganar creditos
          </Link>

          <Link to={isCreador ? '/creator/channels' : '/advertiser'} style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'var(--surface)', color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: '10px', padding: '12px 24px',
            fontSize: '14px', fontWeight: 600, textDecoration: 'none',
            fontFamily: FONT_BODY,
          }}>
            {isCreador ? 'Verificar mis canales' : 'Volver al inicio'}
          </Link>
        </div>

        <p style={{
          fontSize: '12px', color: 'var(--muted)', marginTop: '32px',
          opacity: 0.7,
        }}>
          Los creditos que acumules ahora se podran usar cuando abramos el marketplace.
        </p>
      </div>
    </div>
  )
}
