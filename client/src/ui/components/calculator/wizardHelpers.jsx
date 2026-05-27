import React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { FONT_BODY, FONT_DISPLAY, GREEN } from '../../theme/tokens'

// ─── Helpers visuales compartidos por los dos wizards ───────────────────────
// (ChannelCalculator y WhatsAppQuestionnaire). Mantenerlos aquí evita la
// deriva de estilos entre ambos flujos.

// ── ProgressBar ──────────────────────────────────────────────────────────────
// Barra superior con N segmentos iguales. El segmento actual se rellena.
export function ProgressBar({ current, total, accent = GREEN }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 999,
              background: i <= current ? accent : 'var(--bg2)',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>
      <p style={{
        fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.1em', color: 'var(--muted)', margin: 0,
        fontFamily: FONT_BODY,
      }}>
        Paso {current + 1} de {total}
      </p>
    </div>
  )
}

// ── ChoiceCard ───────────────────────────────────────────────────────────────
// Card grande tipo "radio button visual". Acepta icon, label, descripción.
export function ChoiceCard({ option, selected, onSelect, accent = GREEN, compact = false }) {
  const Icon = option.Icon
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(option.id)}
      whileTap={{ scale: 0.98 }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        width: '100%',
        padding: compact ? '14px 16px' : '18px 20px',
        borderRadius: 14,
        border: `1px solid ${selected ? accent : 'var(--border)'}`,
        background: selected ? `${accent}10` : 'var(--surface)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s',
        fontFamily: FONT_BODY,
        outline: 'none',
      }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = 'var(--bg2)' }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'var(--surface)' }}
    >
      {Icon && (
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: selected ? `${accent}18` : 'var(--bg2)',
          color: selected ? accent : 'var(--muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.2s',
        }}>
          <Icon size={18} strokeWidth={2.2} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 600, color: 'var(--text)',
          marginBottom: option.sub || option.description ? 4 : 0,
        }}>
          {option.label}
        </div>
        {(option.sub || option.description) && (
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
            {option.sub || option.description}
          </div>
        )}
      </div>
      {selected && (
        <CheckCircle2 size={18} style={{ color: accent, flexShrink: 0 }} strokeWidth={2.4} />
      )}
    </motion.button>
  )
}

// ── PillCard ─────────────────────────────────────────────────────────────────
// Card mediana solo con label (para grids tipo nicho/formato).
// Acepta un badge opcional ("PREMIUM ×1,5").
export function PillCard({ option, selected, onSelect, badge, accent = GREEN }) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(option.id)}
      whileTap={{ scale: 0.96 }}
      style={{
        padding: '16px 12px',
        borderRadius: 12,
        border: `1px solid ${selected ? accent : 'var(--border)'}`,
        background: selected ? `${accent}10` : 'var(--surface)',
        cursor: 'pointer',
        fontFamily: FONT_BODY,
        outline: 'none',
        transition: 'all 0.2s',
        textAlign: 'center',
        minHeight: 64,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{
        fontSize: 13.5,
        fontWeight: selected ? 600 : 500,
        color: selected ? accent : 'var(--text)',
        lineHeight: 1.3,
      }}>
        {option.label}
      </div>
      {badge && (
        <div style={{
          fontSize: 10,
          color: 'var(--muted)',
          marginTop: 4,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          fontWeight: 600,
        }}>
          {badge}
        </div>
      )}
    </motion.button>
  )
}

// ── WizardSlider ─────────────────────────────────────────────────────────────
// Slider con label arriba y valor formateado destacado. Tamaño "blog/wizard"
// (más compacto que el slider del grid 2-col).
export function WizardSlider({ label, value, min, max, step, onChange, formatValue, accent = GREEN, hint }) {
  const display = formatValue ? formatValue(value) : value.toLocaleString('es-ES')
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <label style={{
          fontSize: 14, fontWeight: 500, color: 'var(--text)',
          fontFamily: FONT_BODY,
        }}>{label}</label>
        <span style={{
          fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700,
          color: accent, letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
        }}>{display}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%', accentColor: accent, height: 6, cursor: 'pointer',
        }}
      />
      {hint && (
        <p style={{
          fontSize: 12, color: 'var(--muted)', margin: '8px 0 0',
          fontFamily: FONT_BODY,
        }}>{hint}</p>
      )}
    </div>
  )
}

// ── WizardFooter ─────────────────────────────────────────────────────────────
// Navegación inferior con botón atrás + continuar (con estado disabled).
export function WizardFooter({ onBack, onNext, canAdvance, backLabel = 'Atrás', nextLabel = 'Continuar', accent = GREEN }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      gap: 12, marginTop: 28, paddingTop: 22,
      borderTop: '1px solid var(--border)',
    }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          padding: '12px 22px',
          fontSize: 14, fontWeight: 500,
          background: 'transparent', color: 'var(--muted)',
          border: '1px solid var(--border)', borderRadius: 11,
          cursor: 'pointer', fontFamily: FONT_BODY,
        }}
      >
        {backLabel}
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!canAdvance}
        style={{
          padding: '12px 24px',
          fontSize: 14, fontWeight: 600,
          background: canAdvance ? accent : 'var(--bg2)',
          color: canAdvance ? '#fff' : 'var(--muted)',
          border: 'none', borderRadius: 11,
          cursor: canAdvance ? 'pointer' : 'not-allowed',
          fontFamily: FONT_BODY,
          boxShadow: canAdvance ? `0 6px 16px ${accent}48` : 'none',
          transition: 'all 0.2s',
        }}
      >
        {nextLabel}
      </button>
    </div>
  )
}
