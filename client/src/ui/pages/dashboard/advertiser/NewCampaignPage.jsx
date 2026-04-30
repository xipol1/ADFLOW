import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft, Send, Calendar, Link2, FileText, DollarSign, CheckCircle, Loader2, AlertCircle, ChevronLeft, ChevronRight, Clock, Zap } from 'lucide-react'
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
              placeholder="Buscar canal..." className="flex-1 bg-transparent border-none outline-none text-sm"
              style={{ color: 'var(--text)' }}
            />
          </div>

          <div className="space-y-2">
            {loadingChannels ? (
              <div className="text-center py-8 text-sm" style={{ color: 'var(--muted2)' }}>Cargando canales...</div>
            ) : channels.length === 0 ? (
              <div className="text-center py-8 text-sm" style={{ color: 'var(--muted2)' }}>No se encontraron canales</div>
            ) : (
              channels.map((ch) => (
                <div
                  key={ch.id || ch._id}
                  onClick={() => { setChannel(ch); setStep(2) }}
                  className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: 'var(--bg3)', color: 'var(--accent)' }}>
                    {(ch.nombre || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{ch.nombre || '—'}</div>
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
              ))
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
              {(channel.nombre || '?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{channel.nombre}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge label={channel.plataforma} variant="platform" platform={channel.plataforma} />
                <span className="text-[11px]" style={{ color: 'var(--muted2)', fontFamily: 'var(--font-mono)' }}>{fmtNum(channel.audiencia)} subs</span>
              </div>
            </div>
            <button onClick={() => { setChannel(null); setStep(1) }} className="text-xs font-medium px-2 py-1 rounded-md" style={{ color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border)', cursor: 'pointer' }}>
              Cambiar
            </button>
          </div>

          {/* Content */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--text-secondary)' }}>
              <FileText size={12} className="inline mr-1" /> Contenido del anuncio
            </label>
            <textarea
              value={content} onChange={(e) => setContent(e.target.value)}
              placeholder="Escribe el texto que se publicara en el canal..."
              rows={5} className={input} style={{ ...inputStyle, resize: 'vertical' }}
              maxLength={5000}
            />
            <div className="text-right mt-1 text-[11px]" style={{ color: content.length > 4500 ? 'var(--red, #f85149)' : 'var(--muted2)' }}>{content.length}/5000 caracteres</div>
            <CopyAnalyzerCompact text={content} />
          </div>

          {/* Target URL */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--text-secondary)' }}>
              <Link2 size={12} className="inline mr-1" /> URL de destino
            </label>
            <input
              type="url" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://tu-web.com/landing"
              className={input} style={inputStyle}
            />
          </div>

          {/* Tracking link format */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--text-secondary)' }}>
              🔗 Formato del link de tracking
            </label>
            <div className="space-y-2">
              {[
                { key: 'domain', label: 'Mostrar tu dominio', example: targetUrl ? (() => { try { const u = new URL(targetUrl); return `channelad.io/go/${u.host}${u.pathname}` } catch { return 'channelad.io/go/tu-web.com/oferta' } })() : 'channelad.io/go/tu-web.com/oferta', desc: 'Se ve tu dominio en el link — genera confianza' },
                { key: 'custom', label: 'Slug personalizado', example: `channelad.io/r/${linkSlug || 'mi-oferta'}`, desc: 'Elige un nombre legible para el link' },
                { key: 'short', label: 'Link corto', example: 'channelad.io/t/a8f3c2d1', desc: 'Hash corto — maximo anonimato' },
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

          {/* ── Publication Calendar ──────────────────────────── */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--text-secondary)' }}>
              <Calendar size={12} className="inline mr-1" /> Fecha de publicacion
            </label>
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
          </div>

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
