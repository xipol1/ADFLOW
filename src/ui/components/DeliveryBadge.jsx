import React from 'react'
import { CheckCircle, AlertCircle, Clock, MinusCircle } from 'lucide-react'
import { OK, ERR, WARN, FONT_BODY } from '../theme/tokens'

const DELIVERY_STATUS = {
  sent:    { label: 'Entregado',          color: OK,      icon: CheckCircle, bg: `${OK}12` },
  failed:  { label: 'Error de entrega',   color: ERR,     icon: AlertCircle, bg: 'rgba(239,68,68,0.08)' },
  pending: { label: 'Entrega pendiente',  color: WARN,    icon: Clock,       bg: 'rgba(245,158,11,0.08)' },
  skipped: { label: 'Publicacion manual', color: '#6b7280', icon: MinusCircle, bg: 'rgba(107,114,128,0.08)' },
}

export default function DeliveryBadge({ delivery }) {
  if (!delivery || !delivery.status || delivery.status === 'pending' && !delivery.attempts) return null

  const cfg = DELIVERY_STATUS[delivery.status] || DELIVERY_STATUS.pending
  const Icon = cfg.icon

  return (
    <div style={{
      background: cfg.bg,
      border: `1px solid ${cfg.color}20`,
      borderRadius: '10px',
      padding: '10px 14px',
      display: 'flex', flexDirection: 'column', gap: '6px',
      fontFamily: FONT_BODY,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Icon size={14} color={cfg.color} />
        <span style={{ fontSize: '13px', fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
        {delivery.attempts > 0 && (
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>({delivery.attempts} intento{delivery.attempts > 1 ? 's' : ''})</span>
        )}
      </div>
      {delivery.deliveredAt && (
        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
          Entregado: {new Date(delivery.deliveredAt).toLocaleString('es-ES')}
          {delivery.platformMessageId && <span> — ID: {delivery.platformMessageId}</span>}
        </div>
      )}
      {delivery.error && delivery.status === 'failed' && (
        <div style={{ fontSize: '11px', color: ERR, wordBreak: 'break-word' }}>{delivery.error}</div>
      )}
    </div>
  )
}
