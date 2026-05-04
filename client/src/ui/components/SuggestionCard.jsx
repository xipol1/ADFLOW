import React, { useState, useMemo } from 'react'
import {
  Sparkles, ChevronDown, ChevronUp, Check, X, Clock, AlertCircle,
} from 'lucide-react'
import { FONT_BODY as F, FONT_DISPLAY as D, GREEN, OK, WARN, ERR, BLUE, greenAlpha } from '../theme/tokens'

const ga = greenAlpha
const PURPLE = '#8B5CF6'

const STATUS_LABEL = {
  pending:    { label: 'Pendiente',      color: WARN, bg: `${WARN}15` },
  accepted:   { label: 'Aceptada',       color: OK,   bg: `${OK}15` },
  rejected:   { label: 'Rechazada',      color: ERR,  bg: `${ERR}15` },
  superseded: { label: 'Sustituida',     color: 'var(--muted)', bg: 'var(--bg2)' },
}

/**
 * Render a CampaignMessage of type='suggestion' as a chat-bubble card with
 * inline diff and accept/reject controls.
 *
 * Props:
 *   msg               — the CampaignMessage doc (with .suggestion sub-doc)
 *   currentUserId     — to determine who can resolve (cannot resolve own)
 *   currentContent    — the campaign's current `content` field, to detect
 *                       if the suggestion is "stale" (baseContent diverged)
 *   onResolve(action) — async (action: 'accept' | 'reject') => void
 *   compact           — render minimal version for thread side-rail (default false)
 */
export default function SuggestionCard({ msg, currentUserId, currentContent, onResolve, compact }) {
  const sug = msg?.suggestion
  if (!sug) return null

  const status = STATUS_LABEL[sug.status] || STATUS_LABEL.pending
  const isAuthor = String(msg.sender?._id || msg.sender) === String(currentUserId)
  const canResolve = !isAuthor && sug.status === 'pending'
  const isStale = sug.status === 'pending'
    && sug.baseContent
    && currentContent
    && sug.baseContent !== currentContent

  const [expanded, setExpanded] = useState(sug.status === 'pending')
  const [actionLoading, setActionLoading] = useState(null) // 'accept' | 'reject' | null

  const handleResolve = async (action) => {
    if (actionLoading) return
    setActionLoading(action)
    try { await onResolve?.(action) }
    finally { setActionLoading(null) }
  }

  const scoreBefore = sug.score?.before
  const scoreAfter = sug.score?.after
  const scoreDelta = (Number.isFinite(scoreBefore) && Number.isFinite(scoreAfter))
    ? Math.round(scoreAfter - scoreBefore)
    : null

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${sug.status === 'pending' ? `${PURPLE}44` : 'var(--border)'}`,
      borderRadius: 12,
      padding: compact ? 10 : 12,
      fontFamily: F,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
          background: `${PURPLE}18`, border: `1px solid ${PURPLE}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={11} color={PURPLE} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
          Propuesta de cambio
        </span>
        <span style={{
          background: status.bg, color: status.color,
          borderRadius: 20, padding: '1px 8px',
          fontSize: 10.5, fontWeight: 700,
          border: `1px solid ${status.color}30`,
        }}>
          {status.label}
        </span>
        {scoreDelta != null && (
          <span style={{
            fontSize: 10.5, fontWeight: 700,
            color: scoreDelta > 0 ? OK : scoreDelta < 0 ? ERR : 'var(--muted)',
            background: scoreDelta > 0 ? `${OK}14` : scoreDelta < 0 ? `${ERR}14` : 'var(--bg2)',
            border: `1px solid ${scoreDelta > 0 ? `${OK}30` : scoreDelta < 0 ? `${ERR}30` : 'var(--border)'}`,
            borderRadius: 20, padding: '1px 8px',
          }}>
            {scoreDelta > 0 ? '↑' : scoreDelta < 0 ? '↓' : ''} {scoreBefore}→{scoreAfter}
          </span>
        )}
        <button onClick={() => setExpanded(e => !e)} style={{
          marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--muted)', display: 'flex', alignItems: 'center', padding: 2,
        }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Optional human comment */}
      {msg.text && msg.text !== 'Ha propuesto un cambio en el texto del anuncio' && (
        <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.45 }}>
          {msg.text}
        </div>
      )}

      {/* Stale warning */}
      {isStale && expanded && (
        <div style={{
          background: `${WARN}10`, border: `1px solid ${WARN}30`, borderRadius: 8,
          padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, color: WARN,
        }}>
          <AlertCircle size={11} />
          El texto del anuncio cambió desde esta propuesta — puede no aplicarse limpiamente.
        </div>
      )}

      {/* Diff (collapsible) */}
      {expanded && (
        <DiffView before={sug.baseContent} after={sug.proposedContent} />
      )}

      {/* Resolution metadata */}
      {sug.status !== 'pending' && sug.resolvedAt && (
        <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
          <Clock size={10} />
          Resuelta el {new Date(sug.resolvedAt).toLocaleString('es')}
          {sug.resolutionNote && <span> · "{sug.resolutionNote}"</span>}
        </div>
      )}

      {/* Actions */}
      {canResolve && (
        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
          <button
            onClick={() => handleResolve('accept')}
            disabled={!!actionLoading}
            style={{
              flex: 1, background: OK, color: '#fff', border: 'none', borderRadius: 8,
              padding: '7px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: F,
              opacity: actionLoading ? 0.5 : 1,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
            <Check size={12} strokeWidth={2.5} />
            {actionLoading === 'accept' ? 'Aplicando...' : 'Aceptar'}
          </button>
          <button
            onClick={() => handleResolve('reject')}
            disabled={!!actionLoading}
            style={{
              flex: 1, background: 'var(--bg2)', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: 8,
              padding: '7px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: F,
              opacity: actionLoading ? 0.5 : 1,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
            <X size={12} strokeWidth={2.5} />
            {actionLoading === 'reject' ? '...' : 'Rechazar'}
          </button>
        </div>
      )}

      {isAuthor && sug.status === 'pending' && (
        <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
          Esperando respuesta de la otra parte
        </div>
      )}
    </div>
  )
}

// ─── Diff view ───────────────────────────────────────────────────────────
function DiffView({ before, after }) {
  // Word-level diff. Cheap and good enough for ad copy (1-2 sentences).
  const tokens = useMemo(() => diffWords(before || '', after || ''), [before, after])

  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
      padding: 10, fontSize: 13, lineHeight: 1.55,
      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
    }}>
      {tokens.map((t, i) => {
        if (t.type === 'unchanged') return <span key={i}>{t.value}</span>
        if (t.type === 'added') {
          return <span key={i} style={{
            background: `${OK}22`, color: OK, borderRadius: 3, padding: '0 2px',
          }}>{t.value}</span>
        }
        if (t.type === 'removed') {
          return <span key={i} style={{
            background: `${ERR}22`, color: ERR, borderRadius: 3, padding: '0 2px',
            textDecoration: 'line-through',
          }}>{t.value}</span>
        }
        return null
      })}
    </div>
  )
}

// Minimal word-level diff using LCS. Returns an array of
// { type: 'unchanged' | 'added' | 'removed', value }.
// Keeps spaces attached to the preceding token so output is readable.
function diffWords(a, b) {
  const aw = tokenize(a)
  const bw = tokenize(b)
  const n = aw.length, m = bw.length
  // LCS table
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = aw[i - 1] === bw[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  // Backtrack
  const out = []
  let i = n, j = m
  while (i > 0 && j > 0) {
    if (aw[i - 1] === bw[j - 1]) {
      out.push({ type: 'unchanged', value: aw[i - 1] })
      i--; j--
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      out.push({ type: 'removed', value: aw[i - 1] })
      i--
    } else {
      out.push({ type: 'added', value: bw[j - 1] })
      j--
    }
  }
  while (i > 0) { out.push({ type: 'removed', value: aw[i - 1] }); i-- }
  while (j > 0) { out.push({ type: 'added', value: bw[j - 1] }); j-- }
  return out.reverse()
}

function tokenize(s) {
  // Split keeping whitespace as part of the preceding token
  return s.match(/\S+\s*|\s+/g) || []
}
