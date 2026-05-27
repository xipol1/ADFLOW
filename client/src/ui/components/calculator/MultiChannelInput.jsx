import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Link2, Plus, X, Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { FONT_DISPLAY, FONT_BODY, GREEN } from '../../theme/tokens'
import { fmtFollowers } from '../../lib/channelPricing'

// ─── MultiChannelInput ──────────────────────────────────────────────────────
// Modo media kit: el creador pega 2-5 URLs de sus canales (Telegram + Substack
// + Discord, p. ej.) y los analizamos en paralelo. Si todos están en el mismo
// nicho (asumido por el wizard) podemos darle una tarifa consolidada y un
// "media kit" listo para enviar a anunciantes.
//
// Decisiones:
//   - Mínimo 2, máximo 5 canales (suficiente para casi cualquier creador
//     real y mantiene el rate-limit del endpoint razonable).
//   - Análisis en paralelo via Promise.all. Si uno falla, los demás siguen
//     y se muestra el error solo en su línea.
//   - WhatsApp en multi-mode: lo permitimos pero advertimos que falta OAuth
//     para datos reales (devolvemos partial).
//
// Props:
//   onAnalyzedAll(channels)  — channels = [{ url, platform, followers, name,
//                                          description, profileImage, verified }]
//                              (solo los exitosos; los partial/error van
//                              también con el flag `status`)
//   onSwitchToSingle()       — el usuario quiere volver al modo 1 canal
//   accent                   — color del bloque

const MAX_CHANNELS = 5
const MIN_CHANNELS = 2

export default function MultiChannelInput({ onAnalyzedAll, onSwitchToSingle, accent = GREEN }) {
  const [links, setLinks] = useState(['', ''])
  const [results, setResults] = useState([])  // [{ url, status, data, error }]
  const [globalState, setGlobalState] = useState('idle') // idle | loading | done | error

  function updateLink(idx, value) {
    const next = [...links]
    next[idx] = value
    setLinks(next)
  }

  function addLink() {
    if (links.length >= MAX_CHANNELS) return
    setLinks([...links, ''])
  }

  function removeLink(idx) {
    if (links.length <= MIN_CHANNELS) return
    setLinks(links.filter((_, i) => i !== idx))
  }

  async function analyzeAll(e) {
    e?.preventDefault?.()
    const cleaned = links.map((l) => l.trim()).filter(Boolean)
    if (cleaned.length < MIN_CHANNELS) {
      setGlobalState('error')
      return
    }

    setGlobalState('loading')
    setResults(cleaned.map((url) => ({ url, status: 'loading' })))

    const settled = await Promise.allSettled(
      cleaned.map((url) =>
        fetch('/api/calculator/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ link: url }),
        })
          .then((r) => r.json())
          .then((d) => ({ url, ...d }))
      )
    )

    const parsed = settled.map((s, i) => {
      const url = cleaned[i]
      if (s.status === 'rejected' || !s.value?.success) {
        return {
          url,
          status: 'error',
          error: s.value?.message || 'No hemos podido analizarlo',
        }
      }
      const data = s.value
      // WhatsApp: el endpoint devuelve redirect_questionnaire; en multi-mode lo
      // tratamos como partial para que no rompa el flow.
      if (data.status === 'redirect_questionnaire' || data.platform === 'whatsapp') {
        return {
          url, status: 'partial', platform: data.platform || 'whatsapp',
          data: data.data || {},
          message: 'WhatsApp requiere OAuth para datos reales (vincular después).',
        }
      }
      if (data.status === 'ok') {
        return {
          url,
          status: 'ok',
          platform: data.platform,
          externalId: data.externalId,
          data: data.data,
        }
      }
      return {
        url,
        status: data.status || 'partial',
        platform: data.platform,
        data: data.data || {},
        message: data.message,
      }
    })

    setResults(parsed)
    setGlobalState('done')

    // Notificar al padre con los canales válidos para el siguiente paso
    const okChannels = parsed.filter((r) => r.status === 'ok' || r.status === 'partial')
    if (okChannels.length >= 1) {
      onAnalyzedAll?.(
        okChannels.map((r) => ({
          url:          r.url,
          platform:     normalizePlatformId(r.platform),
          followers:    r.data?.subscribers || 0,
          name:         r.data?.name || '',
          description:  r.data?.description || '',
          profileImage: r.data?.profileImage || '',
          verified:     !!r.data?.verified,
          status:       r.status,
        }))
      )
    }
  }

  const okCount = results.filter((r) => r.status === 'ok').length

  return (
    <motion.form
      onSubmit={analyzeAll}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        background: `${accent}06`,
        border: `1px solid ${accent}22`,
        borderRadius: 14,
        padding: '20px 22px',
        marginBottom: 22,
        fontFamily: FONT_BODY,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: `${accent}14`, color: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Link2 size={16} strokeWidth={2.3} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            Media kit · varios canales
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
            Pega entre {MIN_CHANNELS} y {MAX_CHANNELS} links. Los analizamos en paralelo y te damos una tarifa consolidada.
          </p>
        </div>
        {onSwitchToSingle && (
          <button
            type="button"
            onClick={onSwitchToSingle}
            style={{
              background: 'none', border: 'none', color: 'var(--muted)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
              fontFamily: FONT_BODY,
            }}
          >
            ← Un solo canal
          </button>
        )}
      </div>

      {/* Inputs dinámicos */}
      <div style={{ display: 'grid', gap: 8 }}>
        {links.map((link, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="url"
              value={link}
              onChange={(e) => updateLink(idx, e.target.value)}
              placeholder={
                idx === 0 ? 'https://t.me/tucanal'
                  : idx === 1 ? 'https://discord.gg/tu-server'
                  : 'https://tuboletin.substack.com'
              }
              disabled={globalState === 'loading'}
              style={{
                flex: 1,
                padding: '11px 14px',
                borderRadius: 10,
                border: `1px solid ${results[idx]?.status === 'error' ? '#ef4444' : 'var(--border)'}`,
                background: 'var(--bg)',
                color: 'var(--text)',
                fontFamily: FONT_BODY,
                fontSize: 13.5,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {links.length > MIN_CHANNELS && (
              <button
                type="button"
                onClick={() => removeLink(idx)}
                disabled={globalState === 'loading'}
                aria-label="Quitar canal"
                style={{
                  width: 38, height: 38,
                  background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 10, color: 'var(--muted)',
                  cursor: globalState === 'loading' ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <X size={14} strokeWidth={2.4} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add channel button */}
      {links.length < MAX_CHANNELS && (
        <button
          type="button"
          onClick={addLink}
          disabled={globalState === 'loading'}
          style={{
            marginTop: 10,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 12px', borderRadius: 8,
            background: 'transparent', color: accent,
            border: `1px dashed ${accent}44`,
            fontSize: 12.5, fontWeight: 600,
            cursor: globalState === 'loading' ? 'not-allowed' : 'pointer',
            fontFamily: FONT_BODY,
          }}
        >
          <Plus size={13} strokeWidth={2.6} />
          Añadir otro canal ({links.length}/{MAX_CHANNELS})
        </button>
      )}

      {/* Botón submit */}
      <div style={{ marginTop: 14 }}>
        <button
          type="submit"
          disabled={globalState === 'loading' || links.filter((l) => l.trim()).length < MIN_CHANNELS}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 22px', borderRadius: 10,
            background: (globalState === 'loading') ? 'var(--bg2)' : accent,
            color: (globalState === 'loading') ? 'var(--muted)' : '#fff',
            fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600,
            border: 'none',
            cursor: (globalState === 'loading') ? 'not-allowed' : 'pointer',
            boxShadow: (globalState === 'loading') ? 'none' : `0 6px 14px ${accent}48`,
          }}
        >
          {globalState === 'loading' ? (
            <>
              <Loader2 size={14} style={{ animation: 'spin 0.9s linear infinite' }} />
              Analizando {links.filter((l) => l.trim()).length} canales…
            </>
          ) : (
            <>
              <Sparkles size={14} strokeWidth={2.4} />
              Analizar todos
            </>
          )}
        </button>
      </div>

      {/* Resultados por canal */}
      {results.length > 0 && (
        <div style={{ marginTop: 16, display: 'grid', gap: 6 }}>
          {results.map((r, i) => (
            <ResultRow key={i} result={r} accent={accent} />
          ))}
          {globalState === 'done' && okCount >= 1 && (
            <p style={{
              fontSize: 12.5, color: accent, fontWeight: 600,
              margin: '10px 0 0',
            }}>
              {okCount} de {results.length} canales analizados — continúa con el wizard para ver la tarifa consolidada.
            </p>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </motion.form>
  )
}

function ResultRow({ result, accent }) {
  const isOk = result.status === 'ok'
  const isPartial = result.status === 'partial'
  const isError = result.status === 'error'
  const isLoading = result.status === 'loading'

  const Icon = isOk ? CheckCircle2 : isError ? AlertCircle : isPartial ? AlertCircle : Loader2
  const color = isOk ? accent : isError ? '#ef4444' : isPartial ? '#f59e0b' : 'var(--muted)'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px', borderRadius: 8,
      background: 'var(--surface)',
      border: `1px solid ${isOk ? `${accent}33` : isError ? 'rgba(239,68,68,0.25)' : isPartial ? 'rgba(245,158,11,0.25)' : 'var(--border)'}`,
      fontSize: 13,
    }}>
      <Icon
        size={15}
        strokeWidth={2.4}
        style={{
          color, flexShrink: 0,
          animation: isLoading ? 'spin 0.9s linear infinite' : 'none',
        }}
      />
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {result.data?.name ? (
          <>
            <strong style={{ color: 'var(--text)' }}>{result.data.name}</strong>
            {result.data.subscribers != null && (
              <span style={{ color: 'var(--muted)' }}> · {fmtFollowers(result.data.subscribers)} subs</span>
            )}
          </>
        ) : (
          <span style={{ color: 'var(--muted)' }}>{result.url}</span>
        )}
        {isError && <span style={{ color: '#ef4444', marginLeft: 6 }}>· {result.error}</span>}
        {isPartial && result.message && <span style={{ color: '#f59e0b', marginLeft: 6 }}>· {result.message}</span>}
      </span>
    </div>
  )
}

function normalizePlatformId(p) {
  if (p === 'whatsapp_channel' || p === 'whatsapp_group') return 'whatsapp'
  if (p === 'telegram' || p === 'discord' || p === 'newsletter' || p === 'whatsapp') return p
  return null
}
