import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FlaskConical, Plus, Trash2, Play, Pause, CheckCircle2, XCircle,
  TrendingUp, TrendingDown, Trophy, Sparkles, ArrowRight, Eye,
  BarChart3, Target, Wallet, AlertTriangle,
} from 'lucide-react'
import { useAuth } from '../../../../auth/AuthContext'
import apiService from '../../../../services/api'
import { FONT_BODY as F, FONT_DISPLAY as D, GREEN, greenAlpha, OK, WARN, ERR, BLUE } from '../../../theme/tokens'
import { ErrorBanner, useConfirm } from '../shared/DashComponents'

const ACCENT = GREEN
const ga = greenAlpha
const STORAGE_KEY = 'channelad-creator-abtests'

/**
 * CreatorABTestPage — A/B Testing lite para creators.
 *
 * Permite comparar 2 variantes (A vs B) de:
 *  - Precio del canal (¿subo precio? medir respuesta de anunciantes)
 *  - Formato del post (texto vs imagen vs video)
 *  - Hora de publicación (mañana vs tarde vs noche)
 *  - Pricing tier (premium vs estándar)
 *
 * Cada test guarda: variantes, métricas por variante (vistas, clicks,
 * conversiones simuladas o reales), confianza estadística (Z-test simple).
 */
export default function CreatorABTestPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [channels, setChannels] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [tests, setTests] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
    catch { return [] }
  })
  const [showNew, setShowNew] = useState(false)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const { confirm, dialog: confirmDialog } = useConfirm()

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      setLoadError(false)
      let anyOk = false
      let anyFail = false
      const [chRes, cmpRes] = await Promise.all([
        apiService.getMyChannels().catch(() => { anyFail = true; return null }),
        apiService.getCreatorCampaigns?.().catch(() => { anyFail = true; return null }),
      ])
      if (!mounted) return
      if (chRes?.success) { setChannels(Array.isArray(chRes.data) ? chRes.data : chRes.data?.items || []); anyOk = true }
      else if (chRes !== null) anyFail = true
      if (cmpRes?.success && Array.isArray(cmpRes.data)) { setCampaigns(cmpRes.data); anyOk = true }
      if (anyFail && !anyOk) setLoadError(true)
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [retryKey])

  const persist = (next) => {
    setTests(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
  }

  const addTest = (test) => persist([test, ...tests])
  const deleteTest = async (id) => {
    const test = tests.find(t => t.id === id)
    const ok = await confirm({
      title: 'Eliminar test A/B',
      message: test?.name
        ? `¿Eliminar el test "${test.name}"? Se perderán todas sus métricas. No se puede deshacer.`
        : '¿Eliminar este test? Se perderán todas sus métricas. No se puede deshacer.',
      confirmLabel: 'Eliminar',
      tone: 'danger',
    })
    if (!ok) return
    persist(tests.filter(t => t.id !== id))
  }
  const updateTest = (id, patch) => persist(tests.map(t => t.id === id ? { ...t, ...patch } : t))

  const stats = useMemo(() => ({
    total: tests.length,
    running: tests.filter(t => t.status === 'running').length,
    completed: tests.filter(t => t.status === 'completed').length,
    winners: tests.filter(t => t.status === 'completed' && t.winner).length,
  }), [tests])

  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100 }}>

      {confirmDialog}
      {loadError && (
        <ErrorBanner
          message="No se pudieron cargar tus canales y campañas. Verifica tu conexión."
          onRetry={() => setRetryKey(k => k + 1)}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontFamily: D, fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', margin: 0 }}>
              A/B Testing
            </h1>
            <span style={{
              background: ga(0.12), color: ACCENT, border: `1px solid ${ga(0.3)}`,
              borderRadius: 20, padding: '2px 9px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em',
            }}>BETA</span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>
            Compara variantes de precio, formato u horario en tus canales para optimizar ingresos basándote en datos.
          </p>
        </div>
        <button onClick={() => setShowNew(true)} style={primaryBtn}>
          <Plus size={14} /> Nuevo test
        </button>
      </div>

      {/* Stats overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard icon={FlaskConical} label="Tests totales"  value={stats.total}     accent={ACCENT} />
        <StatCard icon={Play}         label="En curso"        value={stats.running}   accent={BLUE}   />
        <StatCard icon={CheckCircle2} label="Completados"     value={stats.completed} accent={OK}     />
        <StatCard icon={Trophy}       label="Con ganador"     value={stats.winners}   accent="#f59e0b"/>
      </div>

      {/* Tests list */}
      {tests.length === 0 ? (
        <div style={{
          background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 14,
          padding: 60, textAlign: 'center',
        }}>
          <FlaskConical size={36} color="var(--muted2)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontFamily: D, fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>
            Aún no tienes tests
          </h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 380, margin: '0 auto 18px', lineHeight: 1.5 }}>
            Crea tu primer experimento para comparar 2 variantes y descubrir cuál convierte mejor en tus canales.
          </p>
          <button onClick={() => setShowNew(true)} style={primaryBtn}>
            <Plus size={14} /> Crear primer test
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tests.map(t => (
            <TestCard key={t.id} test={t} onClick={() => setSelected(t)}
              onDelete={() => deleteTest(t.id)} onToggle={() => updateTest(t.id, {
                status: t.status === 'running' ? 'paused' : 'running',
              })} />
          ))}
        </div>
      )}

      {/* New test modal */}
      {showNew && (
        <NewTestModal channels={channels} onClose={() => setShowNew(false)} onCreate={(t) => {
          addTest(t)
          setShowNew(false)
        }} />
      )}

      {/* Detail modal */}
      {selected && (
        <TestDetailModal test={selected} onClose={() => setSelected(null)}
          onUpdate={(patch) => { updateTest(selected.id, patch); setSelected({ ...selected, ...patch }) }}
          onComplete={() => {
            const winner = decideWinner(selected)
            updateTest(selected.id, { status: 'completed', winner, completedAt: new Date().toISOString() })
            setSelected({ ...selected, status: 'completed', winner })
          }}
        />
      )}
    </div>
  )
}

// ─── New test modal ─────────────────────────────────────────────────────────
function NewTestModal({ channels, onClose, onCreate }) {
  const [name, setName] = useState('')
  const [hypothesis, setHypothesis] = useState('precio')
  const [channelId, setChannelId] = useState(channels[0]?._id || '')
  const [variantA, setVariantA] = useState('')
  const [variantB, setVariantB] = useState('')

  const HYPOTHESES = {
    precio:   { label: 'Precio',   placeholderA: '€50',           placeholderB: '€75',           hint: 'Variante A: precio actual. Variante B: precio nuevo. Mide qué tasa de aceptación tiene cada uno.' },
    formato:  { label: 'Formato',  placeholderA: 'Texto + emoji', placeholderB: 'Texto + imagen', hint: 'Variante A: post de texto. Variante B: post con imagen. Mide engagement.' },
    horario:  { label: 'Horario',  placeholderA: '10:00 (mañana)', placeholderB: '20:00 (tarde)', hint: 'Variante A vs B: misma campaña a distintas horas. Mide CTR.' },
    tier:     { label: 'Tier',     placeholderA: 'Estándar',       placeholderB: 'Premium',       hint: 'Variante A: oferta normal. Variante B: oferta con bonus. Mide conversión.' },
  }
  const cfg = HYPOTHESES[hypothesis]

  const handleCreate = () => {
    if (!name || !variantA || !variantB) return
    if (variantA.trim().toLowerCase() === variantB.trim().toLowerCase()) {
      // eslint-disable-next-line no-alert
      alert('Las variantes A y B deben ser diferentes para poder comparar.')
      return
    }
    onCreate({
      id: Date.now().toString(),
      name,
      hypothesis,
      channelId,
      channelName: channels.find(c => (c._id || c.id) === channelId)?.nombreCanal || '—',
      variantA: { name: 'A', value: variantA, views: 0, conversions: 0, revenue: 0 },
      variantB: { name: 'B', value: variantB, views: 0, conversions: 0, revenue: 0 },
      status: 'running',
      createdAt: new Date().toISOString(),
      winner: null,
      completedAt: null,
    })
  }

  return (
    <Modal onClose={onClose} title="Nuevo test A/B">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Nombre del test">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Subir precio a €75 en canal Crypto" style={inputStyle} />
        </Field>

        <Field label="¿Qué quieres probar?">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.entries(HYPOTHESES).map(([id, h]) => (
              <button key={id} onClick={() => setHypothesis(id)} style={{
                background: hypothesis === id ? ga(0.12) : 'var(--bg2)',
                border: `1px solid ${hypothesis === id ? ACCENT : 'var(--border)'}`,
                color: hypothesis === id ? ACCENT : 'var(--text)',
                borderRadius: 8, padding: '7px 12px', fontSize: 12.5, fontWeight: 600,
                cursor: 'pointer', fontFamily: F,
              }}>{h.label}</button>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>
            {cfg.hint}
          </div>
        </Field>

        <Field label="Canal a testear">
          <select value={channelId} onChange={e => setChannelId(e.target.value)} style={inputStyle}>
            <option value="">— Selecciona —</option>
            {channels.map(ch => (
              <option key={ch._id || ch.id} value={ch._id || ch.id}>
                {ch.nombreCanal || 'Canal'} · {ch.plataforma || ''}
              </option>
            ))}
          </select>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Variante A (control)">
            <input value={variantA} onChange={e => setVariantA(e.target.value)} placeholder={cfg.placeholderA} style={inputStyle} />
          </Field>
          <Field label="Variante B (test)">
            <input value={variantB} onChange={e => setVariantB(e.target.value)} placeholder={cfg.placeholderB} style={inputStyle} />
          </Field>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
          <button onClick={onClose} style={secondaryBtn}>Cancelar</button>
          <button onClick={handleCreate} disabled={!name || !variantA || !variantB || !channelId} style={{
            ...primaryBtn,
            opacity: (!name || !variantA || !variantB || !channelId) ? 0.5 : 1,
            cursor:  (!name || !variantA || !variantB || !channelId) ? 'not-allowed' : 'pointer',
          }}>
            <Play size={13} /> Empezar test
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Test card (list item) ──────────────────────────────────────────────────
function TestCard({ test, onClick, onDelete, onToggle }) {
  const stA = computeRate(test.variantA)
  const stB = computeRate(test.variantB)
  const lift = stA.rate > 0 ? ((stB.rate - stA.rate) / stA.rate) * 100 : 0
  const conf = computeConfidence(test.variantA, test.variantB)
  const statusCfg = {
    running:   { color: BLUE,  label: 'En curso',    icon: Play       },
    paused:    { color: WARN,  label: 'Pausado',     icon: Pause      },
    completed: { color: OK,    label: 'Completado',  icon: CheckCircle2 },
  }[test.status] || { color: 'var(--muted)', label: test.status }
  const StatusIcon = statusCfg.icon || Play

  return (
    <div onClick={onClick} style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
      padding: 16, cursor: 'pointer',
      transition: 'border-color .15s, box-shadow .15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = ga(0.4); e.currentTarget.style.boxShadow = `0 4px 14px ${ga(0.08)}` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{test.name}</span>
            <span style={{
              background: `${statusCfg.color}15`, color: statusCfg.color, border: `1px solid ${statusCfg.color}30`,
              borderRadius: 20, padding: '2px 8px', fontSize: 10.5, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <StatusIcon size={10} /> {statusCfg.label}
            </span>
            {test.winner && (
              <span style={{
                background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b40',
                borderRadius: 20, padding: '2px 8px', fontSize: 10.5, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <Trophy size={10} /> Ganador: {test.winner}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
            {test.channelName} · {test.variantA.value} vs {test.variantB.value}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0 }}>
          <MiniMetric label="Lift" value={`${lift >= 0 ? '+' : ''}${lift.toFixed(1)}%`}
            color={lift >= 0 ? OK : ERR} icon={lift >= 0 ? TrendingUp : TrendingDown} />
          <MiniMetric label="Conf." value={`${conf}%`}
            color={conf >= 95 ? OK : conf >= 80 ? '#f59e0b' : 'var(--muted)'} icon={Sparkles} />
          {test.status !== 'completed' && (
            <button onClick={(e) => { e.stopPropagation(); onToggle() }} style={iconBtn} title={test.status === 'running' ? 'Pausar' : 'Reanudar'}>
              {test.status === 'running' ? <Pause size={13} /> : <Play size={13} />}
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onDelete() }} style={iconBtn} title="Eliminar">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Test detail modal ──────────────────────────────────────────────────────
function ManualDataInput({ onSimulate, onAdd }) {
  const [open, setOpen] = useState(false)
  const [views, setViews] = useState('')
  const [conv, setConv] = useState('')
  const [rev, setRev] = useState('')

  const submit = () => {
    onAdd(views, conv, rev)
    setViews(''); setConv(''); setRev('')
  }

  return (
    <div style={{ marginTop: 10 }}>
      {!open ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setOpen(true)} style={{
            flex: 1, background: 'var(--surface)', color: 'var(--text)',
            border: '1px solid var(--border)', borderRadius: 8,
            padding: '7px 10px', fontSize: 11.5, fontWeight: 600,
            cursor: 'pointer', fontFamily: F,
          }}>
            + Añadir datos reales
          </button>
          <button onClick={onSimulate} title="Simular tráfico aleatorio para pruebas" style={{
            background: 'var(--surface)', color: 'var(--muted)', border: '1px dashed var(--border)',
            borderRadius: 8, padding: '7px 10px', fontSize: 11.5, fontWeight: 600,
            cursor: 'pointer', fontFamily: F,
          }}>
            🎲 Simular
          </button>
        </div>
      ) : (
        <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: 8, border: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 6 }}>
            <input type="number" min="0" value={views} onChange={e => setViews(e.target.value)} placeholder="+ vistas" aria-label="Añadir vistas"
              style={mdInput} />
            <input type="number" min="0" value={conv} onChange={e => setConv(e.target.value)} placeholder="+ conv." aria-label="Añadir conversiones"
              style={mdInput} />
            <input type="number" min="0" step="0.01" value={rev} onChange={e => setRev(e.target.value)} placeholder="+ ingresos €" aria-label="Añadir ingresos"
              style={mdInput} />
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={submit} disabled={!views && !conv && !rev} style={{
              flex: 1, background: ACCENT, color: '#fff', border: 'none',
              borderRadius: 6, padding: '6px 8px', fontSize: 11, fontWeight: 700,
              cursor: 'pointer', fontFamily: F, opacity: (!views && !conv && !rev) ? 0.5 : 1,
            }}>Sumar</button>
            <button onClick={() => setOpen(false)} style={{
              background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '6px 8px', fontSize: 11, cursor: 'pointer', fontFamily: F,
            }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}

const mdInput = {
  background: 'var(--surface)', color: 'var(--text)',
  border: '1px solid var(--border)', borderRadius: 6,
  padding: '5px 7px', fontSize: 11, fontFamily: 'inherit',
  outline: 'none', minWidth: 0, width: '100%', boxSizing: 'border-box',
}

function TestDetailModal({ test, onClose, onUpdate, onComplete }) {
  const stA = computeRate(test.variantA)
  const stB = computeRate(test.variantB)
  const lift = stA.rate > 0 ? ((stB.rate - stA.rate) / stA.rate) * 100 : 0
  const conf = computeConfidence(test.variantA, test.variantB)
  const minViews = 50

  const simulate = (variant) => {
    const v = test[variant]
    onUpdate({
      [variant]: {
        ...v,
        views: v.views + Math.floor(20 + Math.random() * 30),
        conversions: v.conversions + Math.floor(Math.random() * 5),
        revenue: v.revenue + Math.floor(Math.random() * 80),
      },
    })
  }

  return (
    <Modal onClose={onClose} title={test.name} wide>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Status bar */}
        <div style={{
          background: ga(0.06), border: `1px solid ${ga(0.2)}`, borderRadius: 10,
          padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
            <strong style={{ color: 'var(--text)' }}>{test.channelName}</strong> · iniciado {new Date(test.createdAt).toLocaleDateString('es')}
          </div>
          <div style={{ display: 'flex', gap: 18 }}>
            <Stat label="Lift"      value={`${lift >= 0 ? '+' : ''}${lift.toFixed(1)}%`} color={lift >= 0 ? OK : ERR} />
            <Stat label="Confianza" value={`${conf}%`}                                     color={conf >= 95 ? OK : '#f59e0b'} />
            <Stat label="Vistas"    value={(test.variantA.views + test.variantB.views).toLocaleString('es')} color="var(--text)" />
          </div>
        </div>

        {/* Variants comparison */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {['variantA', 'variantB'].map(key => {
            const v = test[key]
            const st = computeRate(v)
            const isWinner = test.winner === v.name
            const isBetter = (key === 'variantA' ? stA : stB).rate >= (key === 'variantA' ? stB : stA).rate
            return (
              <div key={key} style={{
                background: 'var(--bg2)',
                border: `1px solid ${isWinner ? '#f59e0b' : 'var(--border)'}`,
                borderRadius: 12, padding: 14,
                position: 'relative',
              }}>
                {isWinner && (
                  <div style={{
                    position: 'absolute', top: -8, right: 12,
                    background: '#f59e0b', color: '#fff',
                    borderRadius: 20, padding: '2px 9px', fontSize: 10.5, fontWeight: 700,
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}>
                    <Trophy size={10} /> Ganador
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: isBetter ? `${OK}15` : 'var(--border)',
                    color: isBetter ? OK : 'var(--muted)',
                    border: `1px solid ${isBetter ? OK : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: D, fontWeight: 800, fontSize: 13,
                  }}>{v.name}</div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                    {v.value}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                  <Tile label="Vistas"        value={v.views.toLocaleString('es')} />
                  <Tile label="Conversiones"  value={v.conversions.toLocaleString('es')} />
                  <Tile label="Tasa"          value={`${st.rate.toFixed(2)}%`} />
                  <Tile label="Ingresos"      value={`€${v.revenue}`} />
                </div>

                {test.status === 'running' && (
                  <ManualDataInput
                    onSimulate={() => simulate(key)}
                    onAdd={(deltaViews, deltaConv, deltaRev) => onUpdate({
                      [key]: {
                        ...v,
                        views: Math.max(0, v.views + Number(deltaViews || 0)),
                        conversions: Math.max(0, v.conversions + Number(deltaConv || 0)),
                        revenue: Math.max(0, v.revenue + Number(deltaRev || 0)),
                      },
                    })}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Recommendation */}
        <Recommendation lift={lift} conf={conf} totalViews={test.variantA.views + test.variantB.views} minViews={minViews} status={test.status} winner={test.winner} />

        {test.status === 'running' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
              {test.variantA.views + test.variantB.views < minViews
                ? `Necesitas al menos ${minViews} vistas totales para concluir (actual: ${test.variantA.views + test.variantB.views})`
                : conf < 80
                  ? 'Confianza baja — sigue acumulando datos antes de decidir'
                  : 'Suficiente confianza. Puedes finalizar el test'}
            </div>
            <button onClick={onComplete} disabled={test.variantA.views + test.variantB.views < minViews} style={{
              ...primaryBtn,
              opacity: test.variantA.views + test.variantB.views < minViews ? 0.5 : 1,
              cursor:  test.variantA.views + test.variantB.views < minViews ? 'not-allowed' : 'pointer',
            }}>
              <CheckCircle2 size={13} /> Finalizar test
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ─── Recommendation block ──────────────────────────────────────────────────
function Recommendation({ lift, conf, totalViews, minViews, status, winner }) {
  let title, body, color, icon
  if (status === 'completed') {
    if (!winner) {
      title = 'Sin diferencia significativa'
      body  = 'Las dos variantes rinden igual dentro del margen de error. Mantén la actual.'
      color = 'var(--muted)'; icon  = AlertTriangle
    } else {
      title = `Ganador: variante ${winner}`
      body  = `Implementa la variante ${winner} en este canal. Lift estadísticamente significativo.`
      color = OK; icon  = Trophy
    }
  } else if (totalViews < minViews) {
    title = 'Sigue ejecutando — pocos datos'
    body  = `Necesitas más vistas para concluir. Mínimo recomendado: ${minViews} totales.`
    color = 'var(--muted)'; icon  = Eye
  } else if (conf >= 95) {
    title = lift > 0 ? `Variante B gana con ${conf}% de confianza` : `Variante A gana con ${conf}% de confianza`
    body  = 'Tienes suficiente evidencia. Finaliza el test e implementa el ganador.'
    color = OK; icon  = Sparkles
  } else if (conf >= 80) {
    title = `Confianza media (${conf}%)`
    body  = 'Tendencia clara pero conviene acumular más datos antes de decidir.'
    color = '#f59e0b'; icon  = Sparkles
  } else {
    title = `Confianza baja (${conf}%)`
    body  = 'Las variantes están demasiado igualadas. Sigue testeando o busca diferencias mayores.'
    color = 'var(--muted)'; icon  = AlertTriangle
  }
  const Icon = icon

  return (
    <div style={{
      background: `${color}10`, border: `1px solid ${color}30`, borderRadius: 12,
      padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 11,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
        background: `${color}20`, border: `1px solid ${color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={14} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{body}</div>
      </div>
    </div>
  )
}

// ─── Statistics ─────────────────────────────────────────────────────────────
function computeRate(v) {
  const rate = v.views > 0 ? (v.conversions / v.views) * 100 : 0
  return { rate, conversions: v.conversions, views: v.views }
}

// Z-test for two proportions, returns confidence in [0, 99.9]
function computeConfidence(a, b) {
  const nA = a.views, nB = b.views
  if (nA < 10 || nB < 10) return 0
  const pA = a.conversions / nA
  const pB = b.conversions / nB
  const p = (a.conversions + b.conversions) / (nA + nB)
  const se = Math.sqrt(p * (1 - p) * (1 / nA + 1 / nB))
  if (se === 0) return 0
  const z = Math.abs(pA - pB) / se
  // approx normal CDF via erf
  const erf = (x) => {
    const sign = x < 0 ? -1 : 1; x = Math.abs(x)
    const t = 1 / (1 + 0.3275911 * x)
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)
    return sign * y
  }
  const conf = erf(z / Math.sqrt(2)) * 100
  return Math.min(99.9, Math.max(0, Math.round(conf * 10) / 10))
}

function decideWinner(test) {
  const conf = computeConfidence(test.variantA, test.variantB)
  if (conf < 80) return null
  const stA = computeRate(test.variantA)
  const stB = computeRate(test.variantB)
  return stB.rate > stA.rate ? 'B' : 'A'
}

// ─── Reusable components ────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
      padding: 14, display: 'flex', alignItems: 'center', gap: 11,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 9,
        background: `${accent}15`, border: `1px solid ${accent}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={15} color={accent} strokeWidth={2} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontFamily: D, fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          {value}
        </div>
      </div>
    </div>
  )
}

function MiniMetric({ icon: Icon, label, value, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color, fontSize: 13, fontWeight: 700, fontFamily: D }}>
        {Icon && <Icon size={11} />}
        {value}
      </div>
      <div style={{ fontSize: 9.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
    </div>
  )
}

function Stat({ label, value, color = 'var(--text)' }) {
  return (
    <div>
      <div style={{ fontFamily: D, fontSize: 16, fontWeight: 800, color, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  )
}

function Tile({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontFamily: D, fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
        {value}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = '' }
  }, [onClose])

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: F,
    }}>
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        width: wide ? 720 : 480, maxWidth: '100%',
        maxHeight: 'calc(100vh - 60px)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <h2 style={{ fontFamily: D, fontSize: 17, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </h2>
          <button onClick={onClose} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 9, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--muted)' }}>
            <XCircle size={16} />
          </button>
        </div>
        <div style={{ padding: 22, overflow: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const inputStyle = {
  background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)',
  borderRadius: 9, padding: '9px 12px', fontSize: 13, fontFamily: F, outline: 'none',
  width: '100%', boxSizing: 'border-box',
}

const primaryBtn = {
  background: ACCENT, color: '#fff', border: 'none', borderRadius: 9,
  padding: '9px 14px', fontSize: 13, fontWeight: 700,
  cursor: 'pointer', fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6,
  boxShadow: `0 4px 14px ${ga(0.35)}`,
}

const secondaryBtn = {
  background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 9,
  padding: '9px 14px', fontSize: 13, fontWeight: 600,
  cursor: 'pointer', fontFamily: F,
}

const iconBtn = {
  background: 'var(--bg2)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8,
  width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', flexShrink: 0,
}
