import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft, Send, Calendar, Link2, FileText, DollarSign, CheckCircle, Loader2, AlertCircle, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Clock, Zap, Settings, Lock, Edit2 } from 'lucide-react'
import apiService from '../../../../services/api'
import { Badge } from '../../../../components/ui'
import CopyAnalyzerCompact from '../../../components/CopyAnalyzerCompact'

function scoreColor(v) {
  if (v >= 90) return 'var(--gold)'
  if (v >= 75) return 'var(--accent)'
  if (v >= 60) return 'var(--blue)'
  if (v >= 40) return '#E3B341'
  return 'var(--red)'
}

const fmtNum = (n) => {
  if (n == null) return '—'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(n)
}

const STEPS = [
  { num: 1, label: 'Canal', icon: '📡' },
  { num: 2, label: 'Contenido', icon: '✏️' },
  { num: 3, label: 'Confirmar', icon: '✓' },
]

// ─── Progressive disclosure section ──────────────────────────────────────────
// Wraps each sub-step of Step 2. Status:
//   'locked'   — user hasn't completed previous step. Greyed out, no interaction.
//   'active'   — currently in progress. Open, accent border.
//   'done'     — completed and shown as a summary chip. Click to re-edit.
function Section({ status, num, title, icon: Icon, summary, children, sectionRef, onEdit, lockedHint }) {
  const isLocked = status === 'locked'
  const isDone = status === 'done'
  const isActive = status === 'active'

  const accent = isActive ? 'var(--accent)' : isDone ? 'var(--accent)' : 'var(--border)'
  const bg = isActive ? 'var(--bg)' : isDone ? 'var(--bg2, var(--bg))' : 'var(--bg)'
  const opacity = isLocked ? 0.55 : 1

  return (
    <div ref={sectionRef} style={{
      borderRadius: 14,
      border: `1px solid ${isActive ? accent : 'var(--border)'}`,
      background: bg, opacity,
      transition: 'opacity .25s, border-color .2s, box-shadow .2s',
      boxShadow: isActive ? `0 4px 18px rgba(139,92,246,0.10)` : 'none',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 16px',
        borderBottom: isActive || isDone ? '1px solid var(--border)' : 'none',
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          background: isDone ? 'var(--accent)' : isActive ? 'var(--accent-dim, rgba(139,92,246,0.15))' : 'var(--bg3, var(--border))',
          color: isDone ? '#080C10' : isActive ? 'var(--accent)' : 'var(--muted2)',
          fontSize: 12, fontWeight: 700,
        }}>
          {isDone ? <CheckCircle size={14} strokeWidth={2.5} /> : isLocked ? <Lock size={11} /> : num}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: isLocked ? 'var(--muted2)' : 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {Icon && <Icon size={13} style={{ color: isActive ? 'var(--accent)' : 'var(--muted2)' }} />}
            {title}
          </div>
          {isDone && summary && (
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {summary}
            </div>
          )}
          {isLocked && (
            <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 2 }}>
              {lockedHint || 'Completa el paso anterior para desbloquear'}
            </div>
          )}
        </div>
        {isDone && onEdit && (
          <button type="button" onClick={onEdit}
            style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Edit2 size={11} /> Editar
          </button>
        )}
      </div>
      {(isActive || (isDone && false)) && (
        <div style={{ padding: 16, animation: 'sectionReveal .3s cubic-bezier(.22,1,.36,1)' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function StepBar({ current }) {
  return (
    <div className="flex items-center gap-1 mb-8">
      {STEPS.map((s, i) => (
        <React.Fragment key={s.num}>
          {i > 0 && <div className="flex-1 h-0.5 rounded-full mx-1" style={{ background: current > s.num ? 'var(--accent)' : 'var(--border)' }} />}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: current >= s.num ? 'var(--accent)' : 'var(--bg3)',
                color: current >= s.num ? '#080C10' : 'var(--muted2)',
              }}
            >
              {current > s.num ? '✓' : s.num}
            </div>
            <span className="text-xs font-medium hidden sm:inline" style={{ color: current >= s.num ? 'var(--text)' : 'var(--muted2)' }}>
              {s.label}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}

export default function NewCampaignPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const channelId = searchParams.get('channel')

  const [step, setStep] = useState(channelId ? 2 : 1)
  const [channel, setChannel] = useState(null)
  const [channels, setChannels] = useState([])
  const [searchQ, setSearchQ] = useState('')
  const [loadingChannels, setLoadingChannels] = useState(false)

  // Form fields
  const [content, setContent] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [selectedDate, setSelectedDate] = useState(null) // { date: 'YYYY-MM-DD', price, status }
  const [linkFormat, setLinkFormat] = useState('domain')
  const [linkSlug, setLinkSlug] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // ── Progressive disclosure state ─────────────────────────────────────────
  // Tracks which sub-step of Step 2 is currently expanded. Allows the user
  // to reopen a previous section via the "Editar" button.
  const [openSection, setOpenSection] = useState('content') // 'content' | 'url' | 'date' | null
  const contentRef = useRef(null)
  const urlRef     = useRef(null)
  const dateRef    = useRef(null)

  // Validation helpers — also drive section unlocking.
  const isContentValid = content.trim().length >= 30
  const isUrlValid = (() => {
    try { new URL(targetUrl); return /^https?:/.test(targetUrl) } catch { return false }
  })()
  const isDateValid = !!selectedDate?.date

  // Auto-advance only forward, never override a manual "Editar" click.
  // NOTE: Content → URL is intentionally NOT auto-advanced. Writing copy is
  // a creative flow we don't want to interrupt at the 30-char mark — the
  // user clicks "Siguiente" when they're done. URL → Date IS auto-advanced
  // because typing/pasting a URL is a quick, atomic action.
  const prevValidsRef = useRef({ url: false })
  useEffect(() => {
    if (step !== 2) return
    const prev = prevValidsRef.current
    if (isUrlValid && !prev.url && openSection === 'url') {
      setOpenSection('date')
      setTimeout(() => dateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
    }
    prevValidsRef.current = { url: isUrlValid }
  }, [isUrlValid, step, openSection])

  // Calendar state
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calData, setCalData] = useState(null)
  const [calLoading, setCalLoading] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)
  const [loadingChannel, setLoadingChannel] = useState(Boolean(channelId))

  // Load channel if ID provided — use intelligence endpoint for exact lookup
  useEffect(() => {
    if (!channelId) return
    setLoadingChannel(true)
    apiService.getChannelIntelligence(channelId).then((res) => {
      if (res?.success && res.data?.canal) {
        const c = res.data.canal
        const s = res.data.scores || {}
        setChannel({
          id: channelId, _id: channelId, nombre: c.nombre, plataforma: c.plataforma,
          categoria: c.nicho, audiencia: c.seguidores,
          CAS: s.CAS, nivel: s.nivel, CPMDinamico: s.CPMDinamico, precio: s.CPMDinamico,
        })
        setStep(2)
      } else {
        setError('Canal no encontrado')
        setStep(1)
      }
    }).catch(() => {
      setError('Error al cargar el canal')
      setStep(1)
    }).finally(() => setLoadingChannel(false))
  }, [channelId])

  // Search channels for step 1
  useEffect(() => {
    if (step !== 1) return
    setLoadingChannels(true)
    apiService.searchChannels({ limite: 12, busqueda: searchQ || '', ordenPor: 'score' }).then((res) => {
      if (res?.success) setChannels(res.data || [])
    }).catch(() => {}).finally(() => setLoadingChannels(false))
  }, [step, searchQ])

  // Load calendar when channel is selected or month changes
  useEffect(() => {
    const chId = channel?.id || channel?._id
    if (!chId || step !== 2) return
    setCalLoading(true)
    apiService.getChannelAvailability(chId, calYear, calMonth).then((res) => {
      if (res?.success) setCalData(res.data)
    }).catch(() => {}).finally(() => setCalLoading(false))
  }, [channel, step, calYear, calMonth])

  const calPrice = selectedDate?.price ?? calData?.basePrice ?? channel?.CPMDinamico ?? channel?.precio ?? 0

  const handleSubmit = async () => {
    setError('')
    if (!channel?.id && !channel?._id) { setError('Selecciona un canal'); return }
    if (!content.trim()) { setError('Escribe el contenido del anuncio'); return }
    if (content.trim().length > 5000) { setError('El contenido no puede superar los 5000 caracteres'); return }
    if (!targetUrl.trim()) { setError('Anade la URL de destino'); return }
    try { new URL(targetUrl.trim()) } catch { setError('La URL de destino no es valida'); return }
    if (linkFormat === 'custom' && !linkSlug.trim()) { setError('Escribe un slug para el link personalizado'); return }
    if (!selectedDate) { setError('Selecciona una fecha de publicacion en el calendario'); return }

    setSubmitting(true)
    try {
      const res = await apiService.createCampaign({
        channel: channel.id || channel._id,
        content: content.trim(),
        targetUrl: targetUrl.trim(),
        deadline: selectedDate.date,
        publishDate: selectedDate.date,
        trackingLinkFormat: linkFormat,
        trackingLinkSlug: linkFormat === 'custom' ? linkSlug : undefined,
      })
      if (res?.success) {
        setSuccess(res.data)
        setStep(3)
      } else {
        setError(res?.message || 'Error al crear la campana')
      }
    } catch (e) {
      setError(e.message || 'Error de conexion')
    }
    setSubmitting(false)
  }

  const input = 'w-full rounded-lg px-4 py-3 text-sm'
  const inputStyle = { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--font-sans)', outline: 'none' }

  return (
    <div style={{ fontFamily: 'var(--font-sans)', maxWidth: 640 }}>
      <Helmet><title>Nueva campana · Channelad</title></Helmet>

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm font-medium mb-6"
        style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <ArrowLeft size={16} /> Volver
      </button>

      <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>Nueva campana</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Crea una campana de publicidad en un canal verificado</p>

      <StepBar current={step} />

      {/* ── Loading channel from URL ── */}
      {loadingChannel && (
        <div className="text-center py-12">
          <Loader2 size={28} className="animate-spin mx-auto mb-3" style={{ color: 'var(--accent)' }} />
          <p className="text-sm" style={{ color: 'var(--muted2)' }}>Cargando canal...</p>
        </div>
      )}

      {/* ── STEP 1: Select Channel ──────────────────────────── */}
      {step === 1 && !loadingChannel && (
        <div>
          <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--muted2)' }}>🔍</span>
            <input
              type="text" value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Buscar por nombre, @username, categoría o nicho..."
              className="flex-1 bg-transparent border-none outline-none text-sm"
              style={{ color: 'var(--text)' }}
            />
            {searchQ && (
              <button onClick={() => setSearchQ('')} style={{ background: 'none', border: 'none', color: 'var(--muted2)', cursor: 'pointer', fontSize: 14 }}>×</button>
            )}
          </div>

          <div className="space-y-2">
            {loadingChannels ? (
              <div className="text-center py-8 text-sm" style={{ color: 'var(--muted2)' }}>Cargando canales...</div>
            ) : channels.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-lg" style={{ background: 'var(--surface)', border: '1px dashed var(--border)' }}>
                <div className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>No encontramos canales para «{searchQ}»</div>
                <div className="text-xs mb-3" style={{ color: 'var(--muted2)' }}>
                  Prueba con un término más general o explora el marketplace.
                </div>
                <div className="flex justify-center gap-2 flex-wrap">
                  <button onClick={() => setSearchQ('')} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>
                    Ver todos
                  </button>
                  <button onClick={() => navigate('/advertiser/explore')} style={{ background: 'var(--accent)', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                    Ir a Explorar
                  </button>
                </div>
              </div>
            ) : (
              channels.map((ch) => {
                const displayName = ch.nombre || ch.nombreCanal || ch.identificadorCanal || 'Sin nombre'
                return (
                <div
                  key={ch.id || ch._id}
                  onClick={() => { setChannel(ch); setStep(2) }}
                  className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: 'var(--bg3)', color: 'var(--accent)' }}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{displayName}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge label={ch.plataforma} variant="platform" platform={ch.plataforma} />
                      <span className="text-[11px]" style={{ color: 'var(--muted2)', fontFamily: 'var(--font-mono)' }}>{fmtNum(ch.audiencia)} subs</span>
                    </div>
                  </div>
                  {ch.CAS != null && (
                    <span className="text-sm font-medium" style={{ color: scoreColor(ch.CAS), fontFamily: 'var(--font-mono)' }}>{ch.CAS}</span>
                  )}
                  {(ch.CPMDinamico || ch.precio) > 0 && (
                    <span className="text-sm font-medium" style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>€{(ch.CPMDinamico || ch.precio).toFixed(0)}</span>
                  )}
                </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ── STEP 2: Content + Details ───────────────────────── */}
      {step === 2 && channel && (
        <div className="space-y-5">
          {/* Selected channel */}
          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: 'var(--accent)', color: '#080C10' }}>
              {(channel.nombre || channel.nombreCanal || channel.identificadorCanal || '?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{channel.nombre || channel.nombreCanal || channel.identificadorCanal || 'Canal'}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge label={channel.plataforma} variant="platform" platform={channel.plataforma} />
                <span className="text-[11px]" style={{ color: 'var(--muted2)', fontFamily: 'var(--font-mono)' }}>{fmtNum(channel.audiencia)} subs</span>
              </div>
            </div>
            <button onClick={() => { setChannel(null); setStep(1) }} className="text-xs font-medium px-2 py-1 rounded-md" style={{ color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border)', cursor: 'pointer' }}>
              Cambiar
            </button>
          </div>

          <style>{`@keyframes sectionReveal { from { opacity:0; transform: translateY(-6px) } to { opacity:1; transform: translateY(0) } }`}</style>

          {/* ── 1. Contenido del anuncio ── */}
          <Section
            sectionRef={contentRef}
            num={1}
            title="Contenido del anuncio"
            icon={FileText}
            status={openSection === 'content' ? 'active' : isContentValid ? 'done' : 'locked'}
            summary={isContentValid ? `${content.length} caracteres · "${content.trim().slice(0, 50)}${content.length > 50 ? '…' : ''}"` : null}
            onEdit={() => setOpenSection('content')}
          >
            <textarea
              value={content} onChange={(e) => setContent(e.target.value)}
              placeholder="Escribe el texto que se publicará en el canal..."
              rows={5} className={input} style={{ ...inputStyle, resize: 'vertical' }}
              maxLength={5000}
              autoFocus
            />
            <div className="flex items-center justify-between mt-1">
              <div className="text-[11px]" style={{ color: 'var(--muted2)' }}>
                Mínimo 30 caracteres para continuar
              </div>
              <div className="text-[11px]" style={{ color: content.length > 4500 ? 'var(--red, #f85149)' : 'var(--muted2)' }}>
                {content.length}/5000 caracteres
              </div>
            </div>
            <CopyAnalyzerCompact text={content} />

            {/* Manual advance — content writing is creative, don't interrupt the flow */}
            <div className="flex items-center justify-end mt-3">
              <button
                type="button"
                disabled={!isContentValid}
                onClick={() => {
                  setOpenSection('url')
                  setTimeout(() => urlRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 16px', borderRadius: 9, border: 'none',
                  background: isContentValid ? 'var(--accent)' : 'var(--bg3, var(--border))',
                  color: isContentValid ? '#fff' : 'var(--muted2)',
                  fontSize: 13, fontWeight: 600,
                  cursor: isContentValid ? 'pointer' : 'not-allowed',
                  transition: 'background .15s',
                  boxShadow: isContentValid ? '0 4px 14px rgba(139,92,246,0.35)' : 'none',
                }}
              >
                Siguiente <ChevronRight size={14} />
              </button>
            </div>
          </Section>

          {/* ── 2. URL de destino ── */}
          <Section
            sectionRef={urlRef}
            num={2}
            title="URL de destino"
            icon={Link2}
            status={
              openSection === 'url' ? 'active'
              : isUrlValid ? 'done'
              : 'locked'
            }
            summary={isUrlValid ? targetUrl : null}
            onEdit={() => isContentValid && setOpenSection('url')}
            lockedHint={isContentValid ? 'Pulsa "Siguiente" en el paso anterior para continuar' : 'Completa el contenido para desbloquear'}
          >
            <input
              type="url" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://tu-web.com/landing"
              className={input} style={inputStyle}
            />
            {targetUrl && !isUrlValid && (
              <div className="text-[11px] mt-1" style={{ color: 'var(--red, #f85149)' }}>
                La URL debe empezar por http:// o https://
              </div>
            )}
            {!targetUrl && (
              <div className="text-[11px] mt-1" style={{ color: 'var(--muted2)' }}>
                Donde llegarán los lectores cuando hagan click en tu anuncio
              </div>
            )}
          </Section>

          {/* ── Opciones avanzadas — solo desbloqueado si hay URL válida ── */}
          {isUrlValid && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <button
              type="button"
              onClick={() => setShowAdvanced(s => !s)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', background: 'transparent', border: 'none',
                cursor: 'pointer', padding: '6px 0', color: 'var(--text)',
                fontSize: 13, fontWeight: 600,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Settings size={14} style={{ color: 'var(--muted)' }} />
                Opciones avanzadas
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted2)' }}>
                  · Formato del link de tracking
                  {linkFormat !== 'domain' && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>(modificado)</span>}
                </span>
              </span>
              {showAdvanced ? <ChevronUp size={16} style={{ color: 'var(--muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--muted)' }} />}
            </button>

            {showAdvanced && (
              <div style={{ marginTop: 14, animation: 'fadeIn .2s ease' }}>
                <style>{`@keyframes fadeIn { from { opacity:0; transform: translateY(-4px) } to { opacity:1; transform: translateY(0) } }`}</style>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--text-secondary)' }}>
                  🔗 Formato del link de tracking
                </label>
                <p style={{ fontSize: 11.5, color: 'var(--muted2)', marginBottom: 10, lineHeight: 1.5 }}>
                  Por defecto usamos un link que muestra tu dominio (genera más confianza). Cámbialo solo si tienes un motivo específico.
                </p>
                <div className="space-y-2">
                  {[
                    { key: 'domain', label: 'Mostrar tu dominio', example: targetUrl ? (() => { try { const u = new URL(targetUrl); return `channelad.io/go/${u.host}${u.pathname}` } catch { return 'channelad.io/go/tu-web.com/oferta' } })() : 'channelad.io/go/tu-web.com/oferta', desc: 'Se ve tu dominio en el link — genera confianza (recomendado)' },
                    { key: 'custom', label: 'Slug personalizado', example: `channelad.io/r/${linkSlug || 'mi-oferta'}`, desc: 'Elige un nombre legible para el link' },
                    { key: 'short', label: 'Link corto', example: 'channelad.io/t/a8f3c2d1', desc: 'Hash corto — máximo anonimato' },
                  ].map((opt) => (
                    <div
                      key={opt.key}
                      onClick={() => setLinkFormat(opt.key)}
                      className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all"
                      style={{
                        background: linkFormat === opt.key ? 'var(--accent-dim)' : 'var(--bg)',
                        border: `1px solid ${linkFormat === opt.key ? 'var(--accent-border)' : 'var(--border)'}`,
                      }}
                    >
                      <div className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center" style={{ border: `2px solid ${linkFormat === opt.key ? 'var(--accent)' : 'var(--border-med)'}` }}>
                        {linkFormat === opt.key && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{opt.label}</div>
                        <code className="text-[11px] block mt-0.5 truncate" style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{opt.example}</code>
                        <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted2)' }}>{opt.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {linkFormat === 'custom' && (
                  <input
                    type="text" value={linkSlug} onChange={(e) => setLinkSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    placeholder="mi-oferta-especial" className={`${input} mt-2`} style={inputStyle}
                    maxLength={40}
                  />
                )}
              </div>
            )}
          </div>
          )}

          {/* ── 3. Fecha de publicación ── */}
          <Section
            sectionRef={dateRef}
            num={3}
            title="Fecha de publicación"
            icon={Calendar}
            status={
              openSection === 'date' ? 'active'
              : isDateValid ? 'done'
              : 'locked'
            }
            summary={isDateValid ? `${new Date(selectedDate.date + 'T00:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })} · €${selectedDate.price || channel?.precio || channel?.CPMDinamico || '?'}` : null}
            onEdit={() => setOpenSection('date')}
          >
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {/* Month nav */}
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <button
                  onClick={() => {
                    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
                    else setCalMonth(m => m - 1)
                  }}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
                ><ChevronLeft size={16} /></button>
                <span className="text-sm font-semibold" style={{ color: 'var(--text)', textTransform: 'capitalize' }}>
                  {new Date(calYear, calMonth).toLocaleDateString('es', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={() => {
                    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
                    else setCalMonth(m => m + 1)
                  }}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
                ><ChevronRight size={16} /></button>
              </div>

              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0 }}>
                {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map(d => (
                  <div key={d} className="text-center py-2" style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted2)', borderBottom: '1px solid var(--border)' }}>{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              {calLoading ? (
                <div className="text-center py-10">
                  <Loader2 size={20} className="animate-spin mx-auto mb-2" style={{ color: 'var(--accent)' }} />
                  <span className="text-xs" style={{ color: 'var(--muted2)' }}>Cargando disponibilidad...</span>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0 }}>
                  {(() => {
                    const days = calData?.days || []
                    // Offset for first day: JS getDay() 0=Sun, calendar starts Mon
                    const firstDow = new Date(calYear, calMonth, 1).getDay()
                    const offset = firstDow === 0 ? 6 : firstDow - 1
                    const cells = []

                    // Empty offset cells
                    for (let i = 0; i < offset; i++) {
                      cells.push(<div key={`e${i}`} style={{ minHeight: 56 }} />)
                    }

                    days.forEach((day) => {
                      const isAvailable = day.status === 'available'
                      const isSelected = selectedDate?.date === day.date
                      const isPast = day.status === 'past'
                      const isBlocked = day.status === 'blocked' || day.status === 'full'
                      const isDisabled = day.status === 'disabled' || day.status === 'too_soon'

                      const canClick = isAvailable
                      const bgColor = isSelected
                        ? 'var(--accent)'
                        : isAvailable ? 'transparent' : 'transparent'
                      const textColor = isSelected
                        ? '#080C10'
                        : isAvailable ? 'var(--text)' : 'var(--muted2)'
                      const priceColor = isSelected
                        ? 'rgba(8,12,16,0.7)'
                        : isAvailable ? 'var(--accent)' : 'var(--muted2)'

                      cells.push(
                        <div
                          key={day.date}
                          onClick={() => canClick && setSelectedDate(day)}
                          style={{
                            minHeight: 56,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            gap: 1,
                            cursor: canClick ? 'pointer' : 'default',
                            background: bgColor,
                            borderRadius: isSelected ? 0 : 0,
                            position: 'relative',
                            opacity: isPast || isDisabled ? 0.35 : isBlocked ? 0.5 : 1,
                            transition: 'all .12s ease',
                            borderBottom: '1px solid var(--border)',
                            borderRight: '1px solid var(--border)',
                          }}
                          onMouseEnter={(e) => {
                            if (canClick && !isSelected) e.currentTarget.style.background = 'var(--accent-dim, rgba(139,92,246,0.06))'
                          }}
                          onMouseLeave={(e) => {
                            if (canClick && !isSelected) e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: textColor }}>{day.d}</span>
                          {isAvailable && day.price > 0 && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: priceColor, fontFamily: 'var(--font-mono)' }}>€{day.price}</span>
                          )}
                          {isBlocked && (
                            <span style={{ fontSize: 9, color: 'var(--red, #f85149)' }}>
                              {day.status === 'full' ? 'Lleno' : 'No disp.'}
                            </span>
                          )}
                          {day.status === 'too_soon' && (
                            <span style={{ fontSize: 9, color: 'var(--muted2)' }}>Min. {calData?.antelacionMinima}d</span>
                          )}
                        </div>
                      )
                    })
                    return cells
                  })()}
                </div>
              )}

              {/* Calendar footer: slots + schedule info */}
              {calData && (
                <div className="flex items-center justify-between px-4 py-3 flex-wrap gap-2" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--muted)' }}>
                      <Clock size={11} /> {calData.horarioPreferido?.desde} – {calData.horarioPreferido?.hasta}
                    </span>
                    <span className="text-[11px]" style={{ color: calData.slotsRemaining <= 2 ? 'var(--red, #f85149)' : 'var(--muted)' }}>
                      {calData.slotsRemaining} slot{calData.slotsRemaining !== 1 ? 's' : ''} disponible{calData.slotsRemaining !== 1 ? 's' : ''} este mes
                    </span>
                  </div>
                  {calData.aceptaUrgentes && calData.precioUrgente > 0 && (
                    <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md" style={{ background: 'rgba(227,179,65,0.1)', color: '#E3B341', fontWeight: 600 }}>
                      <Zap size={10} /> Urgente: €{calData.precioUrgente}
                    </span>
                  )}
                </div>
              )}
            </div>
          </Section>

          {/* ── Price summary (dynamic from selected date) ──── */}
          <div className="rounded-lg p-4" style={{
            background: selectedDate ? 'var(--accent-dim, rgba(139,92,246,0.06))' : 'var(--surface)',
            border: `1px solid ${selectedDate ? 'var(--accent-border, rgba(139,92,246,0.19))' : 'var(--border)'}`,
            transition: 'all .2s ease',
          }}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {selectedDate ? 'Precio de publicacion' : 'Selecciona una fecha'}
                </span>
                {selectedDate && (
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted2)' }}>
                    {new Date(selectedDate.date + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
                    {calData?.horarioPreferido && ` · ${calData.horarioPreferido.desde}–${calData.horarioPreferido.hasta}`}
                  </div>
                )}
              </div>
              <span className="text-xl font-bold" style={{ color: selectedDate ? 'var(--text)' : 'var(--muted2)', fontFamily: 'var(--font-mono)' }}>
                {selectedDate ? `€${calPrice}` : '€—'}
              </span>
            </div>
            <div className="text-[11px] mt-1.5" style={{ color: 'var(--muted2)' }}>
              {selectedDate ? 'Pago protegido por escrow · Se libera al completar la campana' : 'El precio varia segun el dia seleccionado'}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm" style={{ background: 'var(--red-dim)', border: '1px solid rgba(248,81,73,0.2)', color: 'var(--red)' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="px-5 py-3 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Atras
            </button>
            <button
              onClick={handleSubmit} disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all"
              style={{ background: 'var(--accent)', color: '#080C10', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? <><Loader2 size={16} className="animate-spin" /> Creando...</> : <><Send size={16} /> Crear campana</>}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Success ─────────────────────────────────── */}
      {step === 3 && (
        <div className="text-center rounded-xl p-8" style={{ background: 'var(--surface)', border: '1px solid var(--accent-border)' }}>
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
            <CheckCircle size={32} style={{ color: 'var(--accent)' }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Campana creada</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Tu campana ha sido enviada al propietario del canal para su revision.
            Recibiras una notificacion cuando sea aceptada.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/advertiser/campaigns')} className="px-5 py-2.5 rounded-lg text-sm font-semibold" style={{ background: 'var(--accent)', color: '#080C10', border: 'none', cursor: 'pointer' }}>
              Ver mis campanas
            </button>
            <button onClick={() => navigate('/explore')} className="px-5 py-2.5 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Explorar mas canales
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
