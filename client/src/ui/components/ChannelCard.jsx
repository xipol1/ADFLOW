import React, { useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { Bookmark } from 'lucide-react'
import {
  CASBadge,
  ScoreGauge,
  CPMBadge,
  ConfianzaBadge,
  FraudFlag,
  CASHistoryChart,
} from './scoring'
import { C, plataformaIcon } from '../theme/tokens'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtSeg = (n) => {
  if (n == null || Number.isNaN(n)) return '--'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(n)
}

const ctfColorByRatio = (ratio) => {
  if (ratio == null) return 'var(--muted)'
  if (ratio >= 0.6) return C.ok
  if (ratio >= 0.5) return C.warn
  return C.alert
}

// ─── Button primitives ───────────────────────────────────────────────────────
const btnBase = {
  fontFamily: 'inherit',
  borderRadius: 8,
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 150ms',
  whiteSpace: 'nowrap',
}

const OutlineBtn = ({ children, onClick, color = 'var(--muted)' }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick && onClick(e) }}
    style={{
      ...btnBase,
      background: 'transparent',
      color,
      border: `1px solid ${'var(--border-med, rgba(0,0,0,0.08))'}`,
    }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.teal; e.currentTarget.style.color = C.teal }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-med, rgba(0,0,0,0.08))'; e.currentTarget.style.color = color }}
  >
    {children}
  </button>
)

const FilledBtn = ({ children, onClick, size = 'sm' }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick && onClick(e) }}
    style={{
      ...btnBase,
      background: C.teal,
      color: '#fff',
      border: 'none',
      fontWeight: 700,
      padding: size === 'md' ? '8px 16px' : '6px 12px',
      fontSize: size === 'md' ? 13 : 12,
    }}
    onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.1)' }}
    onMouseLeave={(e) => { e.currentTarget.style.filter = 'none' }}
  >
    {children}
  </button>
)

const AlertBtn = ({ children, onClick }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick && onClick(e) }}
    style={{
      ...btnBase,
      background: C.alertDim,
      color: C.alert,
      border: `1px solid ${C.alert}44`,
    }}
  >
    {children}
  </button>
)

// ─── Loading skeleton ────────────────────────────────────────────────────────
function Skeleton({ variant = 'standard' }) {
  const compact = variant === 'compact'
  return (
    <div
      className="animate-pulse"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: compact ? 12 : 16,
        height: compact ? 64 : undefined,
      }}
    >
      {compact ? (
        <div className="flex items-center" style={{ gap: 12 }}>
          <div style={{ width: 40, height: 40, background: 'var(--bg2)', borderRadius: 10 }} />
          <div style={{ flex: 1, height: 10, background: 'var(--bg2)', borderRadius: 4 }} />
          <div style={{ width: 60, height: 18, background: 'var(--bg2)', borderRadius: 999 }} />
        </div>
      ) : (
        <>
          <div className="flex justify-between mb-3">
            <div style={{ height: 14, background: 'var(--bg2)', borderRadius: 4, width: 128 }} />
            <div style={{ height: 24, background: 'var(--bg2)', borderRadius: 999, width: 64 }} />
          </div>
          <div style={{ height: 6, background: 'var(--bg2)', borderRadius: 999, marginBottom: 12 }} />
          <div className="flex" style={{ gap: 8, marginBottom: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: 10, background: 'var(--bg2)', borderRadius: 4, width: 48 }} />
            ))}
          </div>
          <div
            className="flex justify-between"
            style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}
          >
            <div style={{ height: 10, background: 'var(--bg2)', borderRadius: 4, width: 80 }} />
            <div style={{ height: 22, background: 'var(--bg2)', borderRadius: 6, width: 96 }} />
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function ChannelCard({
  canal,
  variant = 'standard',
  mode = 'marketplace',
  disponible = true,
  selected = false,
  saved = false,
  onSelect,
  onCTA,
  onSave,
}) {
  const [hover, setHover] = useState(false)
  const { user } = useAuth()

  // Loading state
  if (!canal) return <Skeleton variant={variant} />

  // Safe destructuring with fallbacks
  const {
    id,
    nombre,
    plataforma,
    nicho,
    seguidores,
    CAS,
    CAF,
    CTF,
    CER,
    CVS,
    CAP,
    nivel,
    CPMDinamico,
    verificacion = {},
    antifraude = {},
    benchmark,
  } = canal

  const { confianzaScore, tipoAcceso } = verificacion
  const { ratioCTF_CAF, flags = [] } = antifraude

  // Mask channel name for non-authenticated users
  const displayName = user ? (nombre || '—') : (nombre ? nombre.slice(0, 2) + '***' : '—')

  const pIcon = plataformaIcon[plataforma] || '📡'
  const hasCAS = CAS != null && !Number.isNaN(CAS)
  const hasCPM = CPMDinamico != null && !Number.isNaN(CPMDinamico) && CPMDinamico > 0

  // Border & shadow based on state
  const borderColor = selected
    ? C.teal
    : hover
    ? `${C.teal}66`
    : 'var(--border)'

  const cardStyle = {
    background: 'var(--surface)',
    border: `1px solid ${borderColor}`,
    borderRadius: 16,
    overflow: 'hidden',
    cursor: onSelect ? 'pointer' : 'default',
    transition: 'all 200ms cubic-bezier(.22,1,.36,1)',
    transform: hover && variant !== 'compact' ? 'translateY(-2px)' : 'none',
    boxShadow:
      hover && variant !== 'compact'
        ? '0 8px 24px rgba(0,212,184,0.08)'
        : 'none',
    boxSizing: 'border-box',
  }

  if (selected) cardStyle.outline = `1px solid ${C.teal}33`

  // ── COMPACT variant ────────────────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={onSelect ? () => onSelect(canal) : undefined}
        style={{ ...cardStyle, height: 64 }}
        className="flex items-center"
      >
        <div className="flex items-center" style={{ gap: 12, padding: '0 16px', width: '100%', overflow: 'hidden' }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{pIcon}</span>
          <div
            className="font-medium truncate"
            style={{ color: 'var(--text)', fontSize: 13, minWidth: 0, maxWidth: 180 }}
          >
            @{displayName}
          </div>
          {hasCAS && <CASBadge CAS={CAS} nivel={nivel} size="xs" />}
          <span className="font-mono truncate" style={{ color: 'var(--muted2, #475569)', fontSize: 11, flex: 1, minWidth: 0 }}>
            {plataforma} · {fmtSeg(seguidores)}
          </span>
          {hasCPM && (
            <span className="font-mono" style={{ color: C.teal, fontSize: 12, flexShrink: 0 }}>
              €{Number(CPMDinamico).toFixed(1)}/1K
            </span>
          )}
          <ConfianzaBadge score={confianzaScore} fuente={tipoAcceso} />
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: 999,
              background: disponible ? C.ok : C.warn,
              flexShrink: 0,
            }}
          />
        </div>
      </div>
    )
  }

  // ── STANDARD + FEATURED variants ───────────────────────────────────────
  const featured = variant === 'featured'

  const headerBg = featured
    ? 'linear-gradient(180deg, rgba(0,212,184,0.06) 0%, transparent 100%)'
    : 'transparent'

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onSelect ? () => onSelect(canal) : undefined}
      style={cardStyle}
    >
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '16px 16px 12px',
          background: headerBg,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="flex items-center" style={{ gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 14, color: 'var(--muted2, #475569)' }}>{pIcon}</span>
            <span
              className="font-medium truncate"
              style={{
                color: 'var(--text)',
                fontSize: featured ? 16 : 14,
                maxWidth: 170,
              }}
            >
              @{displayName}
            </span>
          </div>
          <div className="font-mono" style={{ color: 'var(--muted2, #475569)', fontSize: 11 }}>
            {plataforma || '--'}
            {nicho && ` · ${nicho}`}
            {seguidores != null && ` · ${fmtSeg(seguidores)}`}
          </div>
        </div>

        <div className="flex flex-col items-end" style={{ gap: 6 }}>
          {hasCAS ? (
            <CASBadge CAS={CAS} nivel={nivel} size="md" />
          ) : (
            <span
              className="font-mono"
              style={{
                color: 'var(--muted2, #475569)',
                fontSize: 11,
                padding: '4px 10px',
                border: '1px dashed var(--border)',
                borderRadius: 999,
              }}
            >
              CAS --
            </span>
          )}
          {!disponible && (
            <span
              className="font-mono"
              style={{
                background: C.warnDim,
                color: C.warn,
                border: `1px solid ${C.warn}4D`,
                borderRadius: 999,
                padding: '2px 8px',
                fontSize: 10,
                fontWeight: 600,
              }}
            >
              Ocupado
            </span>
          )}
        </div>
      </div>

      {/* ── SCORE STRIP ────────────────────────────────────────────── */}
      {hasCAS && (
        <div style={{ padding: '0 16px 12px' }}>
          <ScoreGauge CAS={CAS} nivel={nivel} showLabel={false} height={5} />
          <div
            className="flex font-mono"
            style={{ gap: 12, marginTop: 8, fontSize: 11, color: 'var(--muted2, #475569)' }}
          >
            {CAF != null && (
              <span>
                CAF <span style={{ color: 'var(--muted)' }}>{Math.round(CAF)}</span>
              </span>
            )}
            {CTF != null && (
              <span>
                CTF{' '}
                <span style={{ color: ctfColorByRatio(ratioCTF_CAF) }}>
                  {ratioCTF_CAF != null && ratioCTF_CAF < 0.5 && '⚠ '}
                  {Math.round(CTF)}
                </span>
              </span>
            )}
            {CAP != null && (
              <span>
                CAP <span style={{ color: 'var(--muted)' }}>{Math.round(CAP)}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── FEATURED: mini history chart ───────────────────────────── */}
      {featured && Array.isArray(canal.historial) && canal.historial.length >= 2 && (
        <div style={{ padding: '0 8px 12px' }}>
          <CASHistoryChart data={canal.historial} height={80} />
        </div>
      )}

      {/* ── ECONOMICS ──────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between"
        style={{ padding: '0 16px 12px', gap: 8 }}
      >
        {hasCPM ? (
          <CPMBadge CPM={CPMDinamico} plataforma={plataforma} size="sm" />
        ) : (
          <span className="font-mono" style={{ color: 'var(--muted2, #475569)', fontSize: 12 }}>
            CPM --
          </span>
        )}
        {benchmark?.deltaPct != null && (
          <span
            className="font-mono"
            style={{
              color: benchmark.deltaPct >= 0 ? C.ok : C.warn,
              fontSize: 11,
            }}
          >
            {benchmark.deltaPct >= 0 ? '+' : ''}
            {Math.round(benchmark.deltaPct)}% vs nicho
          </span>
        )}
      </div>

      {/* ── TRUST ──────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between"
        style={{ padding: '0 16px 12px', gap: 8 }}
      >
        <ConfianzaBadge score={confianzaScore} fuente={tipoAcceso} showScore />
        {(() => {
          if (ratioCTF_CAF == null) {
            return (
              <span className="flex items-center font-mono" style={{ gap: 6, fontSize: 11, color: 'var(--muted2, #475569)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--muted2)' }} />
                Sin datos
              </span>
            )
          }
          if (ratioCTF_CAF < 0.5) {
            return (
              <span className="flex items-center font-mono" style={{ gap: 6, fontSize: 11, color: C.alert }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: C.alert }} />
                En revisión
              </span>
            )
          }
          if (ratioCTF_CAF < 0.6) {
            return (
              <span className="flex items-center font-mono" style={{ gap: 6, fontSize: 11, color: C.warn }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: C.warn }} />
                Ratio bajo
              </span>
            )
          }
          return (
            <span className="flex items-center font-mono" style={{ gap: 6, fontSize: 11, color: C.ok }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: C.ok }} />
              Verificado
            </span>
          )
        })()}
      </div>

      {/* ── FRAUD BANNER ───────────────────────────────────────────── */}
      {ratioCTF_CAF != null && ratioCTF_CAF < 0.6 && (
        <div style={{ padding: '0 16px 12px' }}>
          <FraudFlag ratioCTF_CAF={ratioCTF_CAF} flags={flags} />
        </div>
      )}

      {/* ── FOOTER ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
          gap: 8,
        }}
      >
        <span
          className="font-mono flex items-center"
          style={{ gap: 5, fontSize: 11, color: disponible ? C.ok : C.warn }}
        >
          <span style={{ fontSize: 8 }}>●</span>
          {disponible ? 'Disponible' : 'Ocupado'}
        </span>

        <div className="flex" style={{ gap: 6 }}>
          {mode === 'marketplace' && (
            <OutlineBtn onClick={() => onCTA && onCTA(canal)}>Ver canal →</OutlineBtn>
          )}
          {mode === 'advertiser' && (
            <>
              {onSave && (
                <button
                  onClick={(e) => { e.stopPropagation(); onSave(canal) }}
                  title={saved ? 'Guardado' : 'Guardar canal'}
                  style={{
                    ...btnBase,
                    background: saved ? C.tealDim : 'transparent',
                    color: saved ? C.teal : 'var(--muted2)',
                    border: `1px solid ${saved ? C.teal + '44' : 'var(--border-med, rgba(0,0,0,0.08))'}`,
                    padding: '6px 8px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Bookmark size={13} fill={saved ? C.teal : 'none'} />
                </button>
              )}
              <OutlineBtn onClick={onSelect ? () => onSelect(canal) : undefined}>Ver</OutlineBtn>
              <FilledBtn
                size={featured ? 'md' : 'sm'}
                onClick={() => onCTA && onCTA(canal)}
              >
                Campaña →
              </FilledBtn>
            </>
          )}
          {mode === 'creator' && (
            <>
              <OutlineBtn onClick={onSelect ? () => onSelect(canal) : undefined}>Analytics</OutlineBtn>
              <OutlineBtn onClick={() => onCTA && onCTA(canal)}>Compartir ↗</OutlineBtn>
            </>
          )}
          {mode === 'admin' && (
            <>
              <OutlineBtn onClick={onSelect ? () => onSelect(canal) : undefined}>Gestionar</OutlineBtn>
              {Array.isArray(flags) && flags.length > 0 && (
                <AlertBtn onClick={() => onCTA && onCTA(canal)}>Flag ⚠</AlertBtn>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
