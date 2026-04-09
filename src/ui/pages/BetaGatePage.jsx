import React from 'react'
import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY } from '../theme/tokens'

// Shown when an authenticated user tries to enter the /advertiser or
// /creator dashboard but does not have the `betaAccess` flag. Does not
// log the user out — just blocks the route.
export default function BetaGatePage() {
  const { user, logout, isCreador } = useAuth()
  const referralsPath = isCreador ? '/creator/referrals' : '/advertiser/referrals'

  return (
    <div
      style={{
        fontFamily: FONT_BODY,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        padding: '40px 20px',
        background: 'var(--bg)',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          maxWidth: 520,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '48px 36px',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: purpleAlpha(0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}
        >
          <Lock size={30} color={PURPLE} strokeWidth={2} />
        </div>

        <h1
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 26,
            fontWeight: 800,
            color: 'var(--text)',
            marginBottom: 12,
            lineHeight: 1.2,
          }}
        >
          Estás en lista de espera
        </h1>

        <p
          style={{
            fontSize: 15,
            color: 'var(--muted)',
            lineHeight: 1.7,
            marginBottom: 28,
          }}
        >
          Channelad está en beta cerrada. Te avisaremos en cuanto abramos
          tu perfil a <strong style={{ color: 'var(--text)' }}>{user?.email}</strong>.
          Mientras tanto, puedes acumular créditos invitando a amigos.
        </p>

        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: 24,
          }}
        >
          <Link
            to={referralsPath}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: PURPLE,
              color: '#fff',
              borderRadius: 10,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Invitar amigos y ganar créditos
          </Link>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--surface)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Volver al inicio
          </Link>
        </div>

        <button
          onClick={logout}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--muted)',
            fontSize: 12,
            cursor: 'pointer',
            textDecoration: 'underline',
            fontFamily: FONT_BODY,
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
