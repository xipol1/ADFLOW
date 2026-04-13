import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft, Send, Calendar, Link2, FileText, DollarSign, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import apiService from '../../../../../services/api'
import { Badge } from '../../../../components/ui'

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
  const [deadline, setDeadline] = useState('')
  const [linkFormat, setLinkFormat] = useState('domain')
  const [linkSlug, setLinkSlug] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  // Load channel if ID provided
  useEffect(() => {
    if (!channelId) return
    apiService.searchChannels({ limite: 1, busqueda: channelId }).then((res) => {
      if (res?.success && res.data?.[0]) {
        setChannel(res.data[0])
        setStep(2)
      }
    }).catch(() => {})

    // Also try intelligence endpoint for more details
    apiService.getChannelIntelligence(channelId).then((res) => {
      if (res?.success && res.data?.canal) {
        const c = res.data.canal
        const s = res.data.scores || {}
        setChannel({
          id: c.id, nombre: c.nombre, plataforma: c.plataforma,
          categoria: c.nicho, audiencia: c.seguidores,
          CAS: s.CAS, nivel: s.nivel, CPMDinamico: s.CPMDinamico, precio: s.CPMDinamico,
        })
      }
    }).catch(() => {})
  }, [channelId])

  // Search channels for step 1
  useEffect(() => {
    if (step !== 1) return
    setLoadingChannels(true)
    apiService.searchChannels({ limite: 12, busqueda: searchQ || '', ordenPor: 'score' }).then((res) => {
      if (res?.success) setChannels(res.data || [])
    }).catch(() => {}).finally(() => setLoadingChannels(false))
  }, [step, searchQ])

  const handleSubmit = async () => {
    setError('')
    if (!channel?.id) { setError('Selecciona un canal'); return }
    if (!content.trim()) { setError('Escribe el contenido del anuncio'); return }
    if (!targetUrl.trim()) { setError('Anade la URL de destino'); return }

    setSubmitting(true)
    try {
      const price = channel.CPMDinamico || channel.precio || 0
      const res = await apiService.createCampaign({
        channel: channel.id,
        content: content.trim(),
        targetUrl: targetUrl.trim(),
        price,
        deadline: deadline || undefined,
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

      {/* ── STEP 1: Select Channel ──────────────────────────── */}
      {step === 1 && (
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
            />
            <div className="text-right mt-1 text-[11px]" style={{ color: 'var(--muted2)' }}>{content.length} caracteres</div>
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

          {/* Deadline */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--text-secondary)' }}>
              <Calendar size={12} className="inline mr-1" /> Fecha limite (opcional)
            </label>
            <input
              type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
              className={input} style={inputStyle}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Price summary */}
          <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Precio estimado</span>
              <span className="text-xl font-bold" style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                €{((channel.CPMDinamico || channel.precio || 0)).toFixed(0)}
              </span>
            </div>
            <div className="text-[11px] mt-1" style={{ color: 'var(--muted2)' }}>
              Basado en CPM dinamico del canal · Pago protegido por escrow
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
