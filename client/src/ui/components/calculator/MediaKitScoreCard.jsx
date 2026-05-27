import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'
import { FONT_DISPLAY, FONT_BODY, GREEN } from '../../theme/tokens'
import { scoreMediaKit } from '../../lib/mediaKitScore'

// ─── MediaKitScoreCard ──────────────────────────────────────────────────────
// Tarjeta en Step 4 que muestra el score "media-kit ready" del canal.
//
// Estructura:
//   - Score grande (0-100) + band ("Listo / Mejorable / Necesita trabajo")
//   - Barra de progreso del score
//   - Top 3 acciones si score < 90 (los items que más peso aportan y fallan)
//   - Botón "Ver checklist completo" → expande la lista de los 9 items con ✓/✗
//
// Snapshot esperado: el mismo que el resto de la calc + opcionales (name,
// description, profileImage, verified) que vienen del analyzer cuando hay
// link analizado.
export default function MediaKitScoreCard({ snapshot, accent = GREEN }) {
  const [showAll, setShowAll] = useState(false)
  const { score, items, topActions, band } = scoreMediaKit(snapshot)

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '20px 22px',
      marginTop: 22,
      fontFamily: FONT_BODY,
    }}>
      {/* Header: score grande + band */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.1em', color: 'var(--muted)', margin: '0 0 4px',
          }}>
            Media-kit ready
          </p>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
            ¿Está tu canal listo para captar anunciantes serios?
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 'clamp(28px, 4vw, 38px)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: band.color,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {score}<span style={{ fontSize: '0.55em', color: 'var(--muted)', fontWeight: 600 }}>/100</span>
          </div>
          <p style={{
            fontSize: 11, fontWeight: 600, color: band.color,
            margin: '6px 0 0', textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {band.label}
          </p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div style={{
        position: 'relative', height: 8, background: 'var(--bg2)',
        borderRadius: 999, overflow: 'hidden', marginBottom: 18,
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'absolute', top: 0, left: 0, height: '100%',
            background: band.color, borderRadius: 999,
          }}
        />
      </div>

      {/* Top 3 acciones (solo si hay algo que mejorar) */}
      {topActions.length > 0 && (
        <div style={{ marginBottom: showAll ? 18 : 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Lightbulb size={14} strokeWidth={2.4} style={{ color: accent }} />
            <p style={{
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.1em', color: 'var(--muted)', margin: 0,
            }}>
              {topActions.length === 1 ? 'Próxima acción' : `Top ${topActions.length} acciones para subir tu score`}
            </p>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
            {topActions.map((a, i) => (
              <li
                key={a.id}
                style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  padding: '12px 14px', borderRadius: 10,
                  background: 'var(--bg2)',
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: 999,
                  background: accent, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, flexShrink: 0, fontFamily: FONT_BODY,
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 13, fontWeight: 600, color: 'var(--text)',
                    margin: '0 0 4px', lineHeight: 1.4,
                  }}>
                    {a.label}
                  </p>
                  <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0, lineHeight: 1.55 }}>
                    {a.action}
                  </p>
                </div>
                <span style={{
                  fontSize: 10.5, fontWeight: 700, color: 'var(--muted)',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '3px 7px', flexShrink: 0,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  +{a.weight}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Toggle checklist completo */}
      <button
        type="button"
        onClick={() => setShowAll(!showAll)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--muted)', fontSize: 12.5, fontWeight: 500,
          padding: '6px 0', fontFamily: FONT_BODY,
        }}
      >
        {showAll ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {showAll ? 'Ocultar checklist completo' : 'Ver checklist completo (9 items)'}
      </button>

      {showAll && (
        <motion.ul
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.25 }}
          style={{
            listStyle: 'none', padding: 0, margin: '10px 0 0',
            display: 'grid', gap: 6,
          }}
        >
          {items.map((it) => (
            <li
              key={it.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0', borderBottom: '1px solid var(--border)',
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: 999,
                background: it.ok ? `${band.color}22` : 'var(--bg2)',
                color: it.ok ? band.color : 'var(--muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {it.ok ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
              </div>
              <span style={{
                flex: 1, fontSize: 13, lineHeight: 1.45,
                color: it.ok ? 'var(--text)' : 'var(--muted)',
                textDecoration: it.ok ? 'none' : 'none',
              }}>
                {it.label}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600, color: 'var(--muted)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                +{it.weight}
              </span>
            </li>
          ))}
        </motion.ul>
      )}
    </div>
  )
}
