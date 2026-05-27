import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Users, Loader2, BarChart3 } from 'lucide-react'
import { FONT_DISPLAY, FONT_BODY, GREEN } from '../../theme/tokens'
import { fmtFollowers } from '../../lib/channelPricing'

// ─── BenchmarkCard ──────────────────────────────────────────────────────────
// Tarjeta en Step 4 que muestra dónde está el canal del usuario dentro de su
// cohorte (plataforma + nicho + tamaño) respecto a los +2.500 canales en
// seguimiento. Llama a GET /api/calculator/benchmark.
//
// Tres estados:
//   - loading: spinner suave mientras se carga
//   - data:    barra con percentil + sample size + médiana de la cohorte
//   - empty:   "Aún no tenemos datos suficientes en tu nicho" + fallback
//
// El bloque es "informativo" — no bloqueante. Si el endpoint falla, no
// bloqueamos el resto del Step 4.
export default function BenchmarkCard({ platform, niche, followers, accent = GREEN }) {
  const [state, setState] = useState('loading') // loading | ok | empty | error
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (!platform || !niche || !followers) {
      setState('empty')
      return
    }
    setState('loading')
    fetch(`/api/calculator/benchmark?platform=${encodeURIComponent(platform)}&niche=${encodeURIComponent(niche)}&followers=${encodeURIComponent(followers)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        if (!d?.success) {
          setState('error')
          return
        }
        if (!d.sampleSize || d.sampleSize < 3) {
          setData(d)
          setState('empty')
          return
        }
        setData(d)
        setState('ok')
      })
      .catch(() => { if (!cancelled) setState('error') })
    return () => { cancelled = true }
  }, [platform, niche, followers])

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '20px 22px',
      marginTop: 22,
      fontFamily: FONT_BODY,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 9,
          background: `${accent}14`, color: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <BarChart3 size={15} strokeWidth={2.3} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            Cómo se compara tu canal
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
            Frente a los canales del mismo nicho y tamaño en seguimiento
          </p>
        </div>
      </div>

      {state === 'loading' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          color: 'var(--muted)', fontSize: 13, padding: '12px 0',
        }}>
          <Loader2 size={14} style={{ animation: 'spin 0.9s linear infinite' }} />
          Comparando con la cohorte…
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {state === 'error' && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
          No hemos podido cargar el benchmark ahora mismo. La estimación de tu tarifa sigue siendo válida.
        </p>
      )}

      {state === 'empty' && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.55 }}>
          Aún no tenemos suficientes canales de tu nicho y tamaño en seguimiento para mostrar un percentil. Vuelve más adelante: añadimos canales cada semana.
        </p>
      )}

      {state === 'ok' && data && (
        <>
          {/* Tu percentil grande */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
            <span style={{
              fontFamily: FONT_DISPLAY, fontSize: 'clamp(28px, 4vw, 38px)',
              fontWeight: 800, color: accent, letterSpacing: '-0.03em', lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}>
              P{data.yourPercentile ?? 50}
            </span>
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>
              · Tu canal está en el <strong style={{ color: 'var(--text)' }}>percentil {data.yourPercentile ?? 50}</strong> de la cohorte
            </span>
          </div>

          {/* Barra visual: posición relativa + marcas de p25/p50/p75/p95 */}
          <PercentileBar data={data} accent={accent} />

          {/* Datos cohorte */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 14,
            fontSize: 12.5, color: 'var(--muted)', marginTop: 14,
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Users size={12} strokeWidth={2.4} />
              <strong style={{ color: 'var(--text)' }}>{data.sampleSize}</strong> canales en cohorte
            </span>
            {data.subscribers?.p50 != null && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Mediana de tamaño: <strong style={{ color: 'var(--text)' }}>{fmtFollowers(data.subscribers.p50)}</strong>
              </span>
            )}
            {data.price?.p50 != null && data.price.p50 > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={12} strokeWidth={2.4} />
                Tarifa mediana: <strong style={{ color: 'var(--text)' }}>{data.price.p50} €</strong>
              </span>
            )}
          </div>

          {data.fallbackUsed && (
            <p style={{
              fontSize: 11, color: 'var(--muted)', margin: '12px 0 0',
              fontStyle: 'italic',
            }}>
              Datos insuficientes en tu bucket exacto ({data.bucket?.label}). Mostramos la comparativa contra todo el nicho.
            </p>
          )}
        </>
      )}
    </div>
  )
}

// ── Barra de percentil con marcadores ───────────────────────────────────────
function PercentileBar({ data, accent }) {
  const pct = Math.max(2, Math.min(98, data.yourPercentile ?? 50))
  return (
    <div style={{ position: 'relative', height: 10, background: 'var(--bg2)', borderRadius: 999, overflow: 'visible' }}>
      {/* Marcadores p25 / p50 / p75 */}
      {[25, 50, 75].map((p) => (
        <div
          key={p}
          style={{
            position: 'absolute',
            left: `${p}%`, top: 0, bottom: 0,
            width: 1, background: 'var(--border)',
          }}
        />
      ))}
      {/* Barra fill desde 0 hasta el percentil del usuario */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'absolute', top: 0, left: 0, height: '100%',
          background: `linear-gradient(90deg, ${accent}66, ${accent})`,
          borderRadius: 999,
        }}
      />
      {/* Marcador "tu canal" */}
      <motion.div
        initial={{ left: 0, opacity: 0 }}
        animate={{ left: `${pct}%`, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'absolute', top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 18, height: 18, borderRadius: 999,
          background: accent, border: '3px solid var(--surface)',
          boxShadow: `0 0 0 1px ${accent}, 0 4px 10px ${accent}66`,
        }}
      />
    </div>
  )
}
