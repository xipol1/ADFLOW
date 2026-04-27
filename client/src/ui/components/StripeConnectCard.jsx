import React, { useState, useEffect } from 'react'
import { CheckCircle, ExternalLink, AlertCircle, Loader2 } from 'lucide-react'
import apiService from '../../services/api'
import { GREEN, greenAlpha, OK, WARN, ERR, FONT_BODY, FONT_DISPLAY } from '../theme/tokens'

const F = FONT_BODY
const D = FONT_DISPLAY
const A = GREEN
const AG = greenAlpha

export default function StripeConnectCard() {
  const [status, setStatus] = useState(null) // null = loading, false = not connected, object = connected
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiService.payoutStatus().then(res => {
      if (res?.success && res.data?.connected) setStatus(res.data)
      else setStatus(false)
    }).catch(() => setStatus(false)).finally(() => setLoading(false))
  }, [])

  const handleOnboard = async () => {
    setActionLoading(true)
    setError('')
    const res = await apiService.payoutOnboard()
    setActionLoading(false)
    if (res?.success && res.data?.url) {
      window.location.href = res.data.url
    } else if (res?.success && res.data?.alreadyOnboarded) {
      setStatus(res.data.status)
    } else {
      setError(res?.message || 'Error al conectar con Stripe')
    }
  }

  const handleDashboard = async () => {
    setActionLoading(true)
    const res = await apiService.payoutDashboardLink()
    setActionLoading(false)
    if (res?.success && res.data?.url) {
      window.open(res.data.url, '_blank')
    }
  }

  const cardStyle = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '16px', overflow: 'hidden',
  }

  if (loading) {
    return (
      <div style={{ ...cardStyle, padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
        <Loader2 size={16} color={A} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Verificando cuenta de Stripe...</span>
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      <div style={{
        padding: '18px 22px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <span style={{ fontSize: '18px' }}>💳</span>
        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', fontFamily: D }}>Stripe Connect</span>
        {status && status.payoutsEnabled && (
          <span style={{ marginLeft: 'auto', background: `${OK}12`, color: OK, borderRadius: '8px', padding: '3px 10px', fontSize: '11px', fontWeight: 600 }}>Activo</span>
        )}
      </div>

      <div style={{ padding: '22px' }}>
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: ERR, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {!status ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>Conecta tu cuenta para recibir pagos</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
                Stripe Connect te permite recibir pagos directamente en tu cuenta bancaria cuando se completan campanas.
              </div>
            </div>
            <button onClick={handleOnboard} disabled={actionLoading} style={{
              background: '#635bff', color: '#fff', border: 'none', borderRadius: '10px',
              padding: '11px 22px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              fontFamily: F, display: 'flex', alignItems: 'center', gap: '8px',
              opacity: actionLoading ? 0.6 : 1, whiteSpace: 'nowrap',
            }}>
              {actionLoading ? 'Conectando...' : 'Conectar con Stripe'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={18} color={OK} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: OK }}>Cuenta conectada</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  Pagos: {status.payoutsEnabled ? 'Activos' : 'Pendientes de verificacion'} | Cargos: {status.chargesEnabled ? 'Activos' : 'Pendientes'}
                </div>
              </div>
            </div>
            {!status.payoutsEnabled && (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: WARN }}>
                Completa la verificacion de tu cuenta para empezar a recibir pagos.
                <button onClick={handleOnboard} disabled={actionLoading} style={{
                  background: WARN, color: '#fff', border: 'none', borderRadius: '6px',
                  padding: '4px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  fontFamily: F, marginLeft: '8px',
                }}>Completar</button>
              </div>
            )}
            <button onClick={handleDashboard} disabled={actionLoading} style={{
              background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', gap: '8px',
              alignSelf: 'flex-start',
            }}>
              <ExternalLink size={14} /> Ver panel de Stripe
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
