import React from 'react'
import { motion } from 'framer-motion'
import { Wallet, Megaphone, ArrowRight, Check } from 'lucide-react'
import { FONT_DISPLAY, FONT_BODY, GREEN, PURPLE } from '../../theme/tokens'

// ─── RoleSelectionScreen ────────────────────────────────────────────────────
// Pantalla inicial que aparece antes del wizard cuando la calculadora se
// usa de forma genérica (no en /para-canales ni /para-anunciantes). Le
// pregunta al usuario qué quiere hacer y le da contexto de cada flujo
// antes de meterle en los 4 pasos.
//
// Cuando elige una opción, se llama a onSelect(role) y el componente padre
// arranca el wizard con ese role.

const ROLES = [
  {
    id: 'creator',
    accent: GREEN,
    Icon: Wallet,
    title: 'Soy creador de un canal',
    subtitle: 'Quiero saber cuánto puedo cobrar',
    bullets: [
      'Pega el link de tu canal o introduce los datos a mano',
      'Tarifa por formato (post estándar, fijado, mención, paquetes)',
      'Score "media-kit ready" y benchmark vs tu nicho',
      'Reporte detallado por email opcional',
    ],
    cta: 'Calcular mi tarifa',
  },
  {
    id: 'advertiser',
    accent: PURPLE,
    Icon: Megaphone,
    title: 'Soy anunciante',
    subtitle: 'Quiero saber cuánto alcance compro',
    bullets: [
      'Introduce precio por publicación y cuántas posts planeas',
      'Alcance estimado total y por publicación',
      'Comparativa con Meta / Google Ads al mismo budget',
      'Lista de canales que encajan con tu campaña',
    ],
    cta: 'Calcular mi alcance',
  },
]

export default function RoleSelectionScreen({ onSelect }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{ fontFamily: FONT_BODY }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 'clamp(24px, 4vw, 36px)' }}>
        <p style={{
          fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: 'var(--muted)', margin: '0 0 10px',
        }}>
          Antes de empezar
        </p>
        <h3 style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 'clamp(22px, 3.2vw, 30px)',
          fontWeight: 700, letterSpacing: '-0.025em',
          margin: '0 0 10px', color: 'var(--text)',
        }}>
          ¿Qué quieres calcular?
        </h3>
        <p style={{
          fontSize: 14, color: 'var(--muted)', margin: 0,
          maxWidth: 540, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.55,
        }}>
          La calculadora se adapta a tu lado del marketplace. Elige el que te describe y te guiamos en 4 pasos.
        </p>
      </div>

      {/* Dos cards grandes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 16,
      }}>
        {ROLES.map((r, i) => (
          <RoleCard key={r.id} role={r} delay={i * 0.08} onSelect={() => onSelect(r.id)} />
        ))}
      </div>

      <p style={{
        fontSize: 12, color: 'var(--muted)', textAlign: 'center',
        margin: '20px 0 0', lineHeight: 1.5,
      }}>
        Puedes cambiar de modo en cualquier momento desde el botón del wizard.
      </p>
    </motion.div>
  )
}

function RoleCard({ role, delay, onSelect }) {
  const { Icon, accent } = role
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3, boxShadow: `0 18px 38px -18px ${accent}55` }}
      whileTap={{ scale: 0.99 }}
      style={{
        textAlign: 'left',
        cursor: 'pointer',
        background: 'var(--surface)',
        border: `1px solid var(--border)`,
        borderRadius: 18,
        padding: 'clamp(22px, 3vw, 28px)',
        fontFamily: FONT_BODY,
        boxShadow: `0 8px 20px -12px rgba(15,23,42,0.10)`,
        transition: 'all 0.2s',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Icono + título */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: `${accent}14`, color: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={22} strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 700,
            letterSpacing: '-0.02em', margin: '0 0 4px', color: 'var(--text)',
          }}>
            {role.title}
          </p>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0, lineHeight: 1.45 }}>
            {role.subtitle}
          </p>
        </div>
      </div>

      {/* Bullets */}
      <ul style={{
        listStyle: 'none', padding: 0, margin: 0,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {role.bullets.map((b, i) => (
          <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{
              width: 18, height: 18, borderRadius: 999,
              background: `${accent}18`, color: accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: 2,
            }}>
              <Check size={11} strokeWidth={3} />
            </div>
            <span style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5 }}>
              {b}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA pseudo (el botón entero es clickable) */}
      <div style={{
        marginTop: 4,
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '11px 18px', borderRadius: 11,
        background: accent, color: '#fff',
        fontSize: 14, fontWeight: 600,
        boxShadow: `0 6px 16px ${accent}48`,
        alignSelf: 'flex-start',
      }}>
        {role.cta}
        <ArrowRight size={14} strokeWidth={2.4} />
      </div>
    </motion.button>
  )
}
