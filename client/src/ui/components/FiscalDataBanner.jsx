import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { FONT_BODY, FONT_DISPLAY } from '../theme/tokens'
import { FileText, ArrowRight, AlertTriangle } from 'lucide-react'

/**
 * FiscalDataBanner — Recordatorio para que el usuario complete sus datos
 * fiscales (razón social, NIF/CIF, dirección...) antes de poder crear
 * campañas (advertiser) o solicitar pagos (creator).
 *
 * Siempre se muestra en la parte superior del dashboard cuando
 * `user.datosFacturacion.completado === false`. La acción primaria lleva
 * directamente al tab de Facturación dentro de Settings.
 *
 * Se oculta automáticamente:
 *  - Si el usuario es admin (no opera fiscalmente).
 *  - Si el email no está verificado (el otro banner ya bloquea el acceso).
 *  - Si el usuario ya está en la página de settings (evita duplicar info).
 */
export default function FiscalDataBanner() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  if (!user) return null
  if (user.role === 'admin') return null
  if (user.emailVerificado === false) return null
  if (user.datosFacturacion?.completado === true) return null

  // Para creators, este recordatorio ya está incluido como paso 8 del
  // onboarding checklist en el dashboard — no duplicar.
  if (user.role === 'creator') return null

  // Si ya están en settings, no mostrar el banner para no estorbar.
  if (/\/(advertiser|creator)\/settings/.test(location.pathname)) return null

  const isCreator = user.role === 'creator'
  const targetPath = isCreator
    ? '/creator/settings?tab=cobros'
    : '/advertiser/settings?tab=facturacion'

  const accent = '#7c3aed'
  const accentBg = 'rgba(124,58,237,0.12)'
  const accentBorder = 'rgba(124,58,237,0.28)'

  const message = isCreator
    ? 'Para poder cobrar tus campañas necesitamos tus datos fiscales. Sin ellos no podemos emitir factura recibida ni transferir tus ganancias.'
    : 'Para crear campañas necesitamos tus datos fiscales (razón social, NIF/CIF y dirección). Es un requisito legal para emitir factura.'

  return (
    <div
      style={{
        position: 'relative',
        background: `linear-gradient(135deg, ${accentBg} 0%, rgba(124,58,237,0.04) 100%)`,
        border: `1px solid ${accentBorder}`,
        borderRadius: '12px',
        padding: '18px 22px',
        marginBottom: '20px',
        fontFamily: FONT_BODY,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap' }}>
        <div
          style={{
            background: accentBg,
            borderRadius: '10px',
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <FileText size={22} style={{ color: accent }} />
        </div>

        <div style={{ flex: 1, minWidth: '240px' }}>
          <h3
            style={{
              margin: '0 0 4px',
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--text)',
              fontFamily: FONT_DISPLAY,
            }}
          >
            Completa tus datos fiscales
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
            {message}
          </p>

          <button
            onClick={() => navigate(targetPath)}
            style={{
              marginTop: '12px',
              background: accent,
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: FONT_BODY,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Completar ahora
            <ArrowRight size={14} />
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: accentBg,
            borderRadius: '8px',
            padding: '6px 12px',
            flexShrink: 0,
          }}
        >
          <AlertTriangle size={14} style={{ color: accent }} />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: accent,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Acción requerida
          </span>
        </div>
      </div>
    </div>
  )
}
