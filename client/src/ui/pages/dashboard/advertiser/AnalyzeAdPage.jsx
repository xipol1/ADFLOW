import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Megaphone, CheckCircle2, XCircle, AlertTriangle, Clock,
  Sparkles, Lightbulb, TrendingUp, RotateCcw, Copy as CopyIcon,
  Check, Wand2, ArrowUpRight,
} from 'lucide-react'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE } from '../../../theme/tokens'
import { analyzeCopy, generateVariants } from '../../../lib/copyAnalyzer'

const PURPLE = 'var(--accent, #8B5CF6)'
const purpleAlpha = (o) => `var(--accent-dim, rgba(139,92,246,${o}))`


// ─── Verdict config ─────────────────────────────────────────────────────────
const VERDICT_CFG = {
  empty:  { color: '#94a3b8', label: 'Sin copy',     desc: 'Escribe el texto del anuncio para empezar el análisis.' },
  rework: { color: ERR,       label: 'Rehazlo',      desc: 'Demasiados problemas. Te recomendamos reescribir desde cero.' },
  review: { color: WARN,      label: 'Revísalo',     desc: 'Tiene base pero necesita ajustes antes de publicar.' },
  good:   { color: BLUE,      label: 'Bueno',        desc: 'Buen copy. Aplica las sugerencias para optimizar.' },
  great:  { color: OK,        label: 'Excelente',    desc: 'Copy sólido. Listo para publicar.' },
}

const STATUS_CFG = {
  ok:   { color: OK,   icon: CheckCircle2 },
  warn: { color: WARN, icon: AlertTriangle },
  fail: { color: ERR,  icon: XCircle },
  todo: { color: '#94a3b8', icon: Clock },
}


// ─── Score gauge ────────────────────────────────────────────────────────────
function ScoreCircle({ score, color }) {
  const r = 52
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div style={{ position: 'relative', width: 130, height: 130 }}>
      <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="65" cy="65" r={r} fill="none" stroke="var(--border)" strokeWidth="9" />
        <circle
          cx="65" cy="65" r={r} fill="none"
          stroke={color} strokeWidth="9"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray .5s cubic-bezier(.4,0,.2,1), stroke .3s' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 36, fontWeight: 900, color, letterSpacing: '-0.04em', lineHeight: 1 }}>
          {score}
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, fontWeight: 600 }}>
          / 100
        </span>
      </div>
    </div>
  )
}


// ─── Check row ──────────────────────────────────────────────────────────────
function CheckRow({ check }) {
  const cfg = STATUS_CFG[check.status] || STATUS_CFG.todo
  const Icon = cfg.icon
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '12px 14px',
      background: `${cfg.color}08`,
      border: `1px solid ${cfg.color}22`,
      borderRadius: 10,
    }}>
      <Icon size={16} color={cfg.color} strokeWidth={2.4} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
          {check.label}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
          {check.detail}
        </div>
      </div>
      {check.impact !== undefined && check.impact !== 0 && (
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: check.impact > 0 ? OK : ERR,
          background: check.impact > 0 ? `${OK}12` : `${ERR}12`,
          border: `1px solid ${check.impact > 0 ? OK : ERR}30`,
          borderRadius: 16, padding: '2px 8px',
          flexShrink: 0,
        }}>
          {check.impact > 0 ? '+' : ''}{check.impact}
        </span>
      )}
    </div>
  )
}


// ─── Main ───────────────────────────────────────────────────────────────────
export default function AnalyzeAdPage() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)

  const result = useMemo(() => analyzeCopy(text), [text])
  const variants = useMemo(() => generateVariants(text), [text])
  const verdictCfg = VERDICT_CFG[result.verdict]

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  const sampleCopy = `Descubre el método que usan los traders pro para detectar señales en menos de 30 segundos. 14 días gratis · Sin tarjeta · Únete a 12.000+ usuarios. https://example.com/start`

  return (
    <div style={{ fontFamily: FONT_BODY, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100 }}>

      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: purpleAlpha(0.12),
            border: `1px solid ${purpleAlpha(0.25)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Megaphone size={20} color={PURPLE} />
          </div>
          <h1 style={{
            fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800,
            color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1,
            margin: 0,
          }}>
            Analizar anuncio
          </h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
          Pega el copy del anuncio y obtén score, sugerencias y predicción de CTR antes de publicarlo.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 20 }}>

        {/* ── Editor + checks (left) ─────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Textarea */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 18,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Copy del anuncio
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setText(sampleCopy)}
                  style={{
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                    fontSize: 11, fontWeight: 600, color: 'var(--muted)',
                    fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <Sparkles size={11} /> Usar ejemplo
                </button>
                {text && (
                  <>
                    <button
                      onClick={copyText}
                      style={{
                        background: 'var(--bg2)', border: '1px solid var(--border)',
                        borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                        fontSize: 11, fontWeight: 600, color: 'var(--muted)',
                        fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      {copied ? <Check size={11} /> : <CopyIcon size={11} />}
                      {copied ? 'Copiado' : 'Copiar'}
                    </button>
                    <button
                      onClick={() => setText('')}
                      style={{
                        background: 'var(--bg2)', border: '1px solid var(--border)',
                        borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                        fontSize: 11, fontWeight: 600, color: 'var(--muted)',
                        fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <RotateCcw size={11} /> Limpiar
                    </button>
                  </>
                )}
              </div>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ej: Descubre el método que usan los traders pro para detectar señales en menos de 30 segundos. 14 días gratis · Sin tarjeta · Únete a 12.000+ usuarios."
              rows={9}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--bg)',
                border: `1px solid ${purpleAlpha(0.18)}`,
                borderRadius: 12, padding: '14px 16px',
                fontSize: 14, lineHeight: 1.6, color: 'var(--text)',
                fontFamily: FONT_BODY, outline: 'none', resize: 'vertical',
                minHeight: 200,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--muted)' }}>
              <span>{result.stats.length} caracteres · {result.stats.words} palabras</span>
              <span style={{
                color: result.stats.length > 220 ? WARN : result.stats.length >= 60 && result.stats.length <= 220 ? OK : 'var(--muted)',
                fontWeight: 600,
              }}>
                Rango óptimo: 80–220
              </span>
            </div>
          </div>

          {/* Checks */}
          {text && (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 16, padding: 20,
            }}>
              <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
                Análisis detallado
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.checks.map(c => <CheckRow key={c.id} check={c} />)}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {result.suggestions.length > 0 && text && (
            <div style={{
              background: `${PURPLE}06`, border: `1px solid ${purpleAlpha(0.25)}`,
              borderRadius: 16, padding: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Lightbulb size={16} color={PURPLE} />
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                  Sugerencias para mejorar
                </h3>
              </div>
              <ul style={{ margin: 0, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {result.suggestions.map((s, i) => (
                  <li key={i} style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ── A/B Variants ────────────────────────────────────────────── */}
          {variants.length > 0 && (
            <div style={{
              background: 'var(--surface)', border: `1px solid ${purpleAlpha(0.3)}`,
              borderRadius: 16, padding: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Wand2 size={16} color={PURPLE} />
                  <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                    Variantes generadas para A/B
                  </h3>
                </div>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  Score actual: <strong style={{ color: 'var(--text)' }}>{result.score}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {variants.map(v => {
                  const delta = v.analysis.score - result.score
                  const vColor = VERDICT_CFG[v.analysis.verdict]?.color || PURPLE
                  return (
                    <div key={v.key} style={{
                      background: 'var(--bg)',
                      border: `1px solid ${vColor}30`,
                      borderRadius: 12,
                      padding: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}>
                      {/* Header: label + score delta */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 800, color: 'var(--text)',
                            }}>
                              {v.label}
                            </span>
                            <span style={{
                              fontSize: 10, fontWeight: 700,
                              background: `${vColor}14`, color: vColor,
                              border: `1px solid ${vColor}30`,
                              borderRadius: 16, padding: '2px 8px',
                            }}>
                              Score {v.analysis.score}
                            </span>
                            {delta > 0 && (
                              <span style={{
                                fontSize: 10, fontWeight: 700, color: OK,
                                background: `${OK}14`, border: `1px solid ${OK}30`,
                                borderRadius: 16, padding: '2px 8px',
                                display: 'flex', alignItems: 'center', gap: 3,
                              }}>
                                <ArrowUpRight size={10} /> +{delta}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                            {v.description}
                          </div>
                        </div>
                        <button
                          onClick={() => setText(v.text)}
                          style={{
                            background: vColor, color: '#fff', border: 'none',
                            borderRadius: 8, padding: '6px 12px',
                            fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            fontFamily: FONT_BODY,
                          }}
                        >
                          Usar esta variante
                        </button>
                      </div>

                      {/* Variant text */}
                      <div style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        padding: '10px 12px',
                        fontSize: 13, lineHeight: 1.55, color: 'var(--text)',
                        whiteSpace: 'pre-wrap',
                      }}>
                        {v.text}
                      </div>

                      {/* Changes applied */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {v.changes.map((c, i) => (
                          <span key={i} style={{
                            fontSize: 10, fontWeight: 600,
                            background: 'var(--bg2)', border: '1px solid var(--border)',
                            color: 'var(--muted)', borderRadius: 12, padding: '2px 8px',
                          }}>
                            ✓ {c}
                          </span>
                        ))}
                        <span style={{
                          fontSize: 10, color: 'var(--muted2)',
                          marginLeft: 'auto',
                        }}>
                          {v.analysis.stats.length} chars · CTR ~{v.analysis.predictedCtr?.toFixed(2) || '—'}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Score panel (right) ────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Score card */}
          <div style={{
            background: 'var(--surface)',
            border: `1px solid ${verdictCfg.color}30`,
            borderRadius: 16, padding: 24,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
            position: 'sticky', top: 12,
          }}>
            <ScoreCircle score={result.score} color={verdictCfg.color} />
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 800,
                color: verdictCfg.color, marginBottom: 4,
              }}>
                {verdictCfg.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                {verdictCfg.desc}
              </div>
            </div>

            {result.predictedCtr !== null && (
              <div style={{
                width: '100%', borderTop: '1px solid var(--border)', paddingTop: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TrendingUp size={13} color="var(--muted)" />
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>CTR estimado</span>
                </div>
                <span style={{
                  fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800,
                  color: 'var(--text)', letterSpacing: '-0.02em',
                }}>
                  {result.predictedCtr.toFixed(2)}%
                </span>
              </div>
            )}

            {result.score >= 55 && (
              <button
                onClick={() => navigate('/advertiser/campaigns/new', { state: { adCopy: text } })}
                style={{
                  width: '100%',
                  background: PURPLE, color: '#fff', border: 'none',
                  borderRadius: 11, padding: '11px 16px',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  fontFamily: FONT_BODY,
                  marginTop: 4,
                }}
              >
                Crear campaña con este copy →
              </button>
            )}
          </div>

          {/* Tips card */}
          <div style={{
            background: 'var(--bg2)', border: '1px dashed var(--border)',
            borderRadius: 14, padding: 16,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Tips rápidos
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                'Empieza con un hook (pregunta o dato)',
                'Beneficio claro en la primera línea',
                'CTA con verbo de acción al final',
                'Datos concretos (%, números, plazos)',
                'Evita mayúsculas y exclamaciones múltiples',
              ].map((t, i) => (
                <li key={i} style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
