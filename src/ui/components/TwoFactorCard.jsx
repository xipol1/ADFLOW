import React, { useState } from 'react'
import { Shield, CheckCircle, AlertCircle, Copy, Download, X } from 'lucide-react'
import apiService from '../../../services/api'
import { PURPLE, purpleAlpha, GREEN, greenAlpha, OK, ERR, WARN, FONT_BODY, FONT_DISPLAY } from '../theme/tokens'

const F = FONT_BODY
const D = FONT_DISPLAY

export default function TwoFactorCard({ accentColor = GREEN, accentAlpha = greenAlpha }) {
  const A = accentColor
  const AG = accentAlpha

  const [step, setStep] = useState('idle') // idle | setup | verify | enabled | disable
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [backupCodes, setBackupCodes] = useState([])
  const [disablePassword, setDisablePassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)

  const handleSetup = async () => {
    setLoading(true)
    setError('')
    const res = await apiService.setup2FA()
    setLoading(false)
    if (res?.success) {
      setQrCode(res.data.qrCode)
      setSecret(res.data.secret)
      setStep('setup')
    } else {
      setError(res?.message || 'Error al configurar 2FA')
      if (res?.message?.includes('ya esta activado')) setIs2FAEnabled(true)
    }
  }

  const handleVerify = async () => {
    if (code.length < 6) { setError('Introduce un codigo de 6 digitos'); return }
    setLoading(true)
    setError('')
    const res = await apiService.verify2FA(code)
    setLoading(false)
    if (res?.success) {
      setBackupCodes(res.data?.backupCodes || [])
      setIs2FAEnabled(true)
      setStep('verify')
    } else {
      setError(res?.message || 'Codigo invalido')
    }
  }

  const handleDisable = async () => {
    if (!disablePassword) { setError('Introduce tu contrasena'); return }
    setLoading(true)
    setError('')
    const res = await apiService.disable2FA(disablePassword)
    setLoading(false)
    if (res?.success) {
      setIs2FAEnabled(false)
      setStep('idle')
      setDisablePassword('')
    } else {
      setError(res?.message || 'Contrasena incorrecta')
    }
  }

  const downloadBackupCodes = () => {
    const text = `Channelad - Codigos de respaldo 2FA\n${'='.repeat(40)}\n\n${backupCodes.join('\n')}\n\nGuarda estos codigos en un lugar seguro.\nCada codigo solo se puede usar una vez.`
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'channelad-backup-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const cardStyle = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '16px', overflow: 'hidden',
  }
  const headerStyle = {
    padding: '18px 22px', borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', gap: '10px',
  }
  const bodyStyle = { padding: '22px' }
  const btnPrimary = {
    background: A, color: '#fff', border: 'none', borderRadius: '10px',
    padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: F,
  }
  const btnSecondary = {
    background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: F,
  }
  const inputStyle = {
    width: '100%', boxSizing: 'border-box', background: 'var(--bg)',
    border: '1px solid var(--border)', borderRadius: '10px',
    padding: '10px 14px', fontSize: '16px', color: 'var(--text)',
    fontFamily: 'monospace', letterSpacing: '0.2em', textAlign: 'center',
    outline: 'none',
  }

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <Shield size={16} color={A} />
        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', fontFamily: D }}>Autenticacion de dos factores</span>
        {is2FAEnabled && <span style={{ marginLeft: 'auto', background: `${OK}12`, color: OK, borderRadius: '8px', padding: '3px 10px', fontSize: '11px', fontWeight: 600 }}>Activo</span>}
      </div>

      <div style={bodyStyle}>
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: ERR, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* IDLE: Not enabled, show activate button */}
        {step === 'idle' && !is2FAEnabled && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>Protege tu cuenta</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Usa una app como Google Authenticator o Authy para generar codigos temporales</div>
            </div>
            <button onClick={handleSetup} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Configurando...' : 'Activar 2FA'}
            </button>
          </div>
        )}

        {/* IDLE: Already enabled, show disable option */}
        {step === 'idle' && is2FAEnabled && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={18} color={OK} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: OK }}>2FA activo — tu cuenta esta protegida</span>
            </div>
            <button onClick={() => setStep('disable')} style={btnSecondary}>Desactivar 2FA</button>
          </div>
        )}

        {/* SETUP: Show QR code + manual secret */}
        {step === 'setup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
            <div style={{ fontSize: '14px', color: 'var(--text)', textAlign: 'center', fontWeight: 500 }}>
              Escanea este codigo QR con tu app de autenticacion
            </div>
            {qrCode && <img src={qrCode} alt="QR Code" style={{ width: '200px', height: '200px', borderRadius: '12px', border: '1px solid var(--border)' }} />}
            <div style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center' }}>
              O introduce este codigo manualmente:
              <div style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginTop: '6px', background: 'var(--bg)', padding: '8px 16px', borderRadius: '8px', letterSpacing: '0.1em', userSelect: 'all' }}>
                {secret}
              </div>
            </div>
            <div style={{ width: '100%', maxWidth: '240px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px', textAlign: 'center' }}>Introduce el codigo de 6 digitos</div>
              <input
                type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000" maxLength={6} style={inputStyle} autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setStep('idle'); setError('') }} style={btnSecondary}>Cancelar</button>
              <button onClick={handleVerify} disabled={loading || code.length < 6} style={{ ...btnPrimary, opacity: loading || code.length < 6 ? 0.5 : 1 }}>
                {loading ? 'Verificando...' : 'Verificar y activar'}
              </button>
            </div>
          </div>
        )}

        {/* VERIFY: Show backup codes */}
        {step === 'verify' && backupCodes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <CheckCircle size={32} color={OK} />
            <div style={{ fontSize: '16px', fontWeight: 700, color: OK, fontFamily: D }}>2FA activado correctamente</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center', maxWidth: '360px' }}>
              Guarda estos codigos de respaldo en un lugar seguro. Los necesitaras si pierdes acceso a tu app de autenticacion. Cada codigo solo se puede usar una vez.
            </div>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontFamily: 'monospace', fontSize: '14px', fontWeight: 600, color: 'var(--text)', letterSpacing: '0.08em' }}>
              {backupCodes.map((c, i) => <div key={i}>{c}</div>)}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={downloadBackupCodes} style={{ ...btnSecondary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Download size={14} /> Descargar
              </button>
              <button onClick={() => { setStep('idle'); setBackupCodes([]) }} style={btnPrimary}>Listo</button>
            </div>
          </div>
        )}

        {/* DISABLE: Ask for password */}
        {step === 'disable' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '13px', color: WARN, fontWeight: 500 }}>Introduce tu contrasena para desactivar 2FA</div>
            <input
              type="password" value={disablePassword}
              onChange={e => setDisablePassword(e.target.value)}
              placeholder="Tu contrasena actual" style={{ ...inputStyle, textAlign: 'left', fontFamily: F, letterSpacing: 'normal', fontSize: '14px' }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setStep('idle'); setError(''); setDisablePassword('') }} style={btnSecondary}>Cancelar</button>
              <button onClick={handleDisable} disabled={loading} style={{ ...btnPrimary, background: ERR, opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Desactivando...' : 'Desactivar 2FA'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
