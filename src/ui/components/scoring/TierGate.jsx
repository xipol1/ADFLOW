import React from 'react'
import { Lock } from 'lucide-react'
import { C, tierAbove } from '../../theme/tokens'

// Locks children behind a plan tier. If the current tier is equal or above
// the required tier, renders children untouched. Otherwise blurs them and
// shows an upgrade overlay.
export default function TierGate({
  requiredTier,
  currentTier,
  children,
  feature,
  onUpgrade,
}) {
  if (tierAbove(currentTier, requiredTier)) return children

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          filter: 'blur(4px)',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {children}
      </div>
      <div
        className="flex items-center justify-center"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(11,17,32,0.55)',
          backdropFilter: 'blur(2px)',
        }}
      >
        <div
          className="text-center"
          style={{
            background: 'var(--surface)',
            border: `1px solid ${'var(--border-med)'}`,
            borderRadius: 12,
            padding: 24,
            maxWidth: 320,
          }}
        >
          <div className="flex justify-center mb-3">
            <Lock size={22} color={C.teal} />
          </div>
          <div style={{ color: 'var(--text)', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
            Disponible en el plan {requiredTier} y superior
          </div>
          {feature && (
            <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 14 }}>
              {feature}
            </div>
          )}
          <button
            onClick={onUpgrade}
            style={{
              background: C.teal,
              color: 'var(--bg)',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Actualizar plan →
          </button>
        </div>
      </div>
    </div>
  )
}
