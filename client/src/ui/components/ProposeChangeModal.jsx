import React, { useState, useMemo } from 'react'
import { Sparkles, X, AlertTriangle } from 'lucide-react'
import { analyzeCopy } from '../lib/copyAnalyzer'
import CopyAnalyzerCompact from './CopyAnalyzerCompact'
import { FONT_BODY as F, FONT_DISPLAY as D, OK, ERR, WARN } from '../theme/tokens'

const PURPLE = '#8B5CF6'

/**
 * Modal that lets either party (advertiser or creator) propose a replacement
 * for the campaign's `content`. Live-scored against the channel's historical
 * benchmarks, with an optional comment explaining why.
 *
 * Props:
 *   campaign      — the campaign doc; used for current content + channel id
 *   onClose       — close handler
 *   onSubmit({ proposedContent, comment, scoreBefore, scoreAfter }) — submit
 *
 * Used from both CreatorRequestsPage (creator side) and CampaignsPage
 * (advertiser side) — the contract is symmetric, the backend figures out
 * who's proposing from req.usuario.
 */
export default function ProposeChangeModal({ campaign, onClose, onSubmit }) {
  const channelId = campaign?.channel?._id || campaign?.channel
  const [proposed, setProposed] = useState(campaign?.content || '')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const baseScore = useMemo(
    () => analyzeCopy(campaign?.content || '').score,
    [campaign?.content]
  )
  const proposedScore = useMemo(() => analyzeCopy(proposed).score, [proposed])

  const isUnchanged = proposed.trim() === (campaign?.content || '').trim()
  const tooLong = proposed.length > 5000
  const empty = !proposed.trim()

  const handleSubmit = async () => {
    if (submitting || isUnchanged || tooLong || empty) return
    setSubmitting(true)
    try {
      await onSubmit({
        proposedContent: proposed.trim(),
        comment: comment.trim() || null,
        scoreBefore: baseScore,
        scoreAfter: proposedScore,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      backdropFilter: 'blur(6px)',
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 18, width: '100%', maxWidth: 620,
        maxHeight: '90vh', overflow: 'auto', padding: 22, fontFamily: F,
        boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={15} color={PURPLE} />
          </div>
          <h2 style={{ fontFamily: D, fontSize: 17, fontWeight: 800, color: 'var(--text)', margin: 0, flex: 1 }}>
            Proponer cambio en el texto
          </h2>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--muted)',
          }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 14 }}>
          Edita el texto del anuncio. La otra parte podrá aceptar o rechazar tu propuesta.
          El score se actualiza en tiempo real con datos de este canal.
        </div>

        {campaign?.status === 'PAID' && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: `${WARN}10`, border: `1px solid ${WARN}40`,
            borderRadius: 10, padding: '10px 12px', marginBottom: 14,
            fontSize: 12, color: WARN, lineHeight: 1.5,
          }}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ color: 'var(--text)' }}>
              <strong style={{ color: WARN }}>Esta campaña ya está pagada.</strong>{' '}
              Los cambios al texto se aplican al contenido que se publicará.
              No se permite cambiar el dominio del enlace después del pago.
            </span>
          </div>
        )}

        <label style={{ display: 'block', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Texto propuesto
          </div>
          <textarea
            value={proposed}
            onChange={e => setProposed(e.target.value)}
            placeholder="Texto del anuncio..."
            rows={6}
            maxLength={5000}
            style={{
              width: '100%', boxSizing: 'border-box', background: 'var(--bg)',
              border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px',
              fontSize: 13, color: 'var(--text)', fontFamily: F, resize: 'vertical', lineHeight: 1.5,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            <span>{proposed.length}/5000 chars</span>
            {baseScore != null && proposedScore != null && (
              <span>
                Score: {baseScore} → <strong style={{
                  color: proposedScore >= baseScore ? OK : ERR,
                }}>{proposedScore}</strong>
              </span>
            )}
          </div>
          <CopyAnalyzerCompact text={proposed} channelId={channelId} />
        </label>

        <label style={{ display: 'block', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Comentario (opcional)
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="¿Por qué propones este cambio?"
            rows={2}
            maxLength={2000}
            style={{
              width: '100%', boxSizing: 'border-box', background: 'var(--bg)',
              border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px',
              fontSize: 12.5, color: 'var(--text)', fontFamily: F, resize: 'vertical',
            }}
          />
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{
            background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)',
            borderRadius: 9, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: F,
          }}>
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || isUnchanged || tooLong || empty}
            style={{
              background: PURPLE, color: '#fff', border: 'none',
              borderRadius: 9, padding: '8px 16px', fontSize: 13, fontWeight: 700,
              cursor: (submitting || isUnchanged || tooLong || empty) ? 'default' : 'pointer',
              fontFamily: F,
              opacity: (isUnchanged || tooLong || empty) ? 0.5 : 1,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
            <Sparkles size={13} />
            {submitting ? 'Enviando...' : isUnchanged ? 'Sin cambios' : 'Enviar propuesta'}
          </button>
        </div>
      </div>
    </div>
  )
}
