import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FlaskConical, Trophy, AlertTriangle, Sparkles,
  TrendingUp, Info,
} from 'lucide-react'
import { analyzeCopy } from '../../../lib/copyAnalyzer'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE } from '../../../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'
const purpleAlpha = (o) => `var(--accent-dim, rgba(139,92,246,${o}))`


// ─── Statistics: two-proportion z-test ─────────────────────────────────────
// Returns { z, pValue, significant, lift, winner }
function chiSquareABTest({ aClicks, aImp, bClicks, bImp }) {
  if (aImp === 0 || bImp === 0) return null
  const pA = aClicks / aImp
  const pB = bClicks / bImp
  const pPool = (aClicks + bClicks) / (aImp + bImp)
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / aImp + 1 / bImp))
  if (se === 0) return null
  const z = (pB - pA) / se
  // Two-tailed p-value approximation (Abramowitz & Stegun 7.1.26)
  const absZ = Math.abs(z)
  const t = 1 / (1 + 0.2316419 * absZ)
  const d = 0.3989423 * Math.exp(-absZ * absZ / 2)
  const pOneTail = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  const pValue = 2 * pOneTail

  const lift = pA > 0 ? ((pB - pA) / pA) * 100 : 0
  const winner = pB > pA ? 'B' : pA > pB ? 'A' : null
  return {
    z, pValue, significant: pValue < 0.05, lift, winner,
    pA: pA * 100, pB: pB * 100,
  }
}

// Required sample size for given baseline + minimum detectable effect (MDE)
// Approximate formula for 80% power, 95% confidence
function requiredSamplePerVariant(baselineCtr, mdePct) {
  if (baselineCtr <= 0 || mdePct <= 0) return null
  const p1 = baselineCtr / 100
  const p2 = p1 * (1 + mdePct / 100)
  const pPool = (p1 + p2) / 2
  const num = 2 * pPool * (1 - pPool) * Math.pow(1.96 + 0.84, 2)
  const den = Math.pow(p2 - p1, 2)
  return Math.ceil(num / den)
}


// ─── Variant editor ────────────────────────────────────────────────────────
function VariantEditor({ label, color, value, onChange, analysis }) {
  return (
    <div style={{
      background: 'var(--surface)', border: `1px solid ${color}30`,
      borderRadius: 14, padding: 16,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: color, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14,
          }}>{label}</div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Variante {label}</span>
        </div>
        {analysis.score > 0 && (
          <span style={{
            background: analysis.score >= 70 ? `${OK}15` : analysis.score >= 50 ? `${BLUE}15` : `${WARN}15`,
            color: analysis.score >= 70 ? OK : analysis.score >= 50 ? BLUE : WARN,
            border: `1px solid ${analysis.score >= 70 ? OK : analysis.score >= 50 ? BLUE : WARN}30`,
            borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700,
          }}>
            Score {analysis.score}/100
          </span>
        )}
      </div>
      <textarea
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={`Pega aquí la variante ${label}...`}
        rows={5}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'var(--bg)', border: `1px solid ${purpleAlpha(0.18)}`,
          borderRadius: 10, padding: '10px 12px',
          fontSize: 13, lineHeight: 1.5, color: 'var(--text)',
          fontFamily: FONT_BODY, outline: 'none', resize: 'vertical',
          minHeight: 110,
        }}
      />
      {value && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
          <span>{analysis.stats.length} chars · {analysis.stats.words} palabras</span>
          {analysis.predictedCtr != null && (
            <span>CTR estimado: <strong style={{ color: 'var(--text)' }}>{analysis.predictedCtr.toFixed(2)}%</strong></span>
          )}
        </div>
      )}
    </div>
  )
}


// ─── Main ──────────────────────────────────────────────────────────────────
export default function ABTestLabPage() {
  const navigate = useNavigate()
  const [textA, setTextA] = useState('')
  const [textB, setTextB] = useState('')
  const [aClicks, setAClicks] = useState(50)
  const [aImp, setAImp] = useState(2000)
  const [bClicks, setBClicks] = useState(70)
  const [bImp, setBImp] = useState(2000)

  const analysisA = useMemo(() => analyzeCopy(textA), [textA])
  const analysisB = useMemo(() => analyzeCopy(textB), [textB])

  const test = useMemo(
    () => chiSquareABTest({ aClicks, aImp, bClicks, bImp }),
    [aClicks, aImp, bClicks, bImp]
  )

  // Sample size needed if the user hasn't reached significance yet
  const baseCtr = test ? test.pA : 2.0
  const sample10 = requiredSamplePerVariant(baseCtr, 10)
  const sample25 = requiredSamplePerVariant(baseCtr, 25)
  const sample50 = requiredSamplePerVariant(baseCtr, 50)

  const sampleA = `Descubre el método que usan los traders pro. 14 días gratis.`
  const sampleB = `🔥 Solo 48h: prueba el método de los traders pro · 14 días gratis · Sin tarjeta`

  return (
    <div style={{ fontFamily: FONT_BODY, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100 }}>

      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: purpleAlpha(0.12), border: `1px solid ${purpleAlpha(0.25)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FlaskConical size={20} color={PURPLE} />
          </div>
          <h1 style={{
            fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800,
            color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1, margin: 0,
          }}>
            A/B Test Lab
          </h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
          Compara dos copies, calcula significancia estadística y decide qué variante escalar.
        </p>
      </div>

      {/* Variant editors */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 14 }}>
        <VariantEditor label="A" color={BLUE}   value={textA} onChange={setTextA} analysis={analysisA} />
        <VariantEditor label="B" color={PURPLE} value={textB} onChange={setTextB} analysis={analysisB} />
      </div>

      {/* Quick load samples */}
      {!textA && !textB && (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>O empieza con ejemplos:</span>
          <button onClick={() => { setTextA(sampleA); setTextB(sampleB) }}
            style={{
              background: purpleAlpha(0.1), color: PURPLE,
              border: `1px solid ${purpleAlpha(0.3)}`, borderRadius: 8,
              padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: FONT_BODY,
            }}>
            <Sparkles size={11} style={{ display: 'inline', marginRight: 4 }} /> Cargar ejemplo
          </button>
        </div>
      )}

      {/* Live data inputs */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 18,
      }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
          Datos del test (en vivo)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {/* Variant A inputs */}
          <div style={{
            background: `${BLUE}06`, border: `1px solid ${BLUE}25`,
            borderRadius: 10, padding: 14,
          }}>
            <div style={{ fontSize: 11, color: BLUE, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Variante A
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 10, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Impresiones</label>
                <input type="number" min="0" value={aImp} onChange={e => setAImp(Math.max(0, Number(e.target.value) || 0))}
                  style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Clicks</label>
                <input type="number" min="0" value={aClicks} onChange={e => setAClicks(Math.max(0, Number(e.target.value) || 0))}
                  style={inputStyle} />
              </div>
            </div>
            {test && (
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                CTR <strong style={{ color: 'var(--text)', fontFamily: FONT_DISPLAY, fontSize: 14 }}>{test.pA.toFixed(2)}%</strong>
              </div>
            )}
          </div>
          {/* Variant B inputs */}
          <div style={{
            background: `${PURPLE}06`, border: `1px solid ${purpleAlpha(0.25)}`,
            borderRadius: 10, padding: 14,
          }}>
            <div style={{ fontSize: 11, color: PURPLE, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Variante B
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 10, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Impresiones</label>
                <input type="number" min="0" value={bImp} onChange={e => setBImp(Math.max(0, Number(e.target.value) || 0))}
                  style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Clicks</label>
                <input type="number" min="0" value={bClicks} onChange={e => setBClicks(Math.max(0, Number(e.target.value) || 0))}
                  style={inputStyle} />
              </div>
            </div>
            {test && (
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                CTR <strong style={{ color: 'var(--text)', fontFamily: FONT_DISPLAY, fontSize: 14 }}>{test.pB.toFixed(2)}%</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verdict */}
      {test && (
        <div style={{
          background: test.significant
            ? (test.winner === 'B' ? `${OK}10` : `${BLUE}10`)
            : `${WARN}10`,
          border: `1px solid ${test.significant ? (test.winner === 'B' ? OK : BLUE) : WARN}40`,
          borderRadius: 14, padding: 20,
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: test.significant
              ? (test.winner === 'B' ? `${OK}20` : `${BLUE}20`)
              : `${WARN}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {test.significant ? <Trophy size={26} color={test.winner === 'B' ? OK : BLUE} /> : <AlertTriangle size={26} color={WARN} />}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              Resultado del test
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
              {test.significant
                ? `Variante ${test.winner} gana${test.lift !== 0 ? ` (+${Math.abs(test.lift).toFixed(1)}%)` : ''}`
                : 'No hay diferencia significativa todavía'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
              {test.significant
                ? `Con un p-value de ${test.pValue.toFixed(4)} (< 0.05), podemos afirmar con 95% de confianza que la variante ${test.winner} es realmente mejor.`
                : `p-value actual: ${test.pValue.toFixed(4)} (> 0.05). Necesitas más datos antes de declarar un ganador.`}
            </div>
          </div>
          <div style={{
            background: 'var(--surface)', border: `1px solid ${test.significant ? (test.winner === 'B' ? OK : BLUE) : WARN}30`,
            borderRadius: 10, padding: '10px 14px', textAlign: 'center', minWidth: 100,
          }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>p-value</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, color: test.significant ? (test.winner === 'B' ? OK : BLUE) : WARN }}>
              {test.pValue < 0.001 ? '< 0.001' : test.pValue.toFixed(3)}
            </div>
          </div>
        </div>
      )}

      {/* Sample size guidance */}
      {test && !test.significant && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, padding: 18,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <TrendingUp size={16} color={PURPLE} />
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              ¿Cuántas impresiones necesitas?
            </h3>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
            Para detectar diferencias entre variantes con CTR base <strong style={{ color: 'var(--text)' }}>{baseCtr.toFixed(2)}%</strong>,
            necesitas estas impresiones <strong>por variante</strong> (80% potencia, 95% confianza):
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            {[
              { label: 'Detectar +10%', val: sample10, color: ERR, hint: 'Mejora pequeña' },
              { label: 'Detectar +25%', val: sample25, color: WARN, hint: 'Mejora media' },
              { label: 'Detectar +50%', val: sample50, color: OK, hint: 'Mejora clara' },
            ].map(s => (
              <div key={s.label} style={{
                background: `${s.color}06`, border: `1px solid ${s.color}25`,
                borderRadius: 10, padding: 12,
              }}>
                <div style={{ fontSize: 11, color: s.color, fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
                  {s.val ? `~${s.val.toLocaleString('es')}` : '—'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted2)' }}>{s.hint}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div style={{
        background: `${BLUE}08`, border: `1px solid ${BLUE}25`,
        borderRadius: 10, padding: '10px 14px',
        fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5,
      }}>
        <Info size={12} color={BLUE} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          Test usando proporción Z (dos colas). Asume tráfico independiente entre variantes y exposición aleatoria.
          Para tests reales en producción, divide el presupuesto 50/50 entre 2 canales similares y compara CTR después de 5-7 días.
          La significancia se alcanza cuando p &lt; 0.05.
        </span>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 6, padding: '5px 8px', fontSize: 13,
  color: 'var(--text)', fontFamily: 'monospace', outline: 'none',
}
