import React, { useEffect, useMemo, useState } from 'react'
import apiService from '../../../../../services/api'
import {
  PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY,
} from '../../../theme/tokens'


const EMPTY_FORM = {
  titulo: '',
  descripcion: '',
  texto: '',
  targetUrl: '',
  canal: '',
  presupuesto: 250,
}

const statusTone = (estado) => ({
  pending: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'Pendiente' },
  accepted: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', label: 'Aprobado' },
  completed: { bg: 'rgba(148,163,184,0.16)', color: '#94a3b8', label: 'Completado' },
  rejected: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', label: 'Bloqueado' },
}[estado] || { bg: purpleAlpha(0.12), color: PURPLE, label: estado || 'Sin estado' })

function StatusBadge({ status }) {
  const tone = statusTone(status)
  return (
    <span style={{
      background: tone.bg,
      color: tone.color,
      border: `1px solid ${tone.color}33`,
      borderRadius: '999px',
      padding: '4px 10px',
      fontSize: '11px',
      fontWeight: 700,
    }}>
      {tone.label}
    </span>
  )
}

function CreateAdModal({ open, onClose, channels, onCreate }) {
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    if (open) {
      setForm((prev) => ({
        ...EMPTY_FORM,
        canal: channels[0]?.id || channels[0]?._id || '',
        targetUrl: prev.targetUrl || '',
      }))
    }
  }, [open, channels])

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'var(--surface)', borderRadius: '20px', width: '100%', maxWidth: '720px', padding: '28px', border: '1px solid var(--border)', boxShadow: '0 24px 80px rgba(0,0,0,0.35)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '24px', fontWeight: 800, color: 'var(--text)' }}>Nueva solicitud de publicación</h2>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '4px' }}>Incluye el copy, el enlace final y las instrucciones iniciales para revisión editorial.</p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 10px', cursor: 'pointer', color: 'var(--muted)' }}>Cerrar</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Título interno" style={inputStyle} />
          <select value={form.canal} onChange={(e) => setForm({ ...form, canal: e.target.value })} style={inputStyle}>
            <option value="">Selecciona canal</option>
            {channels.map((channel) => (
              <option key={channel.id || channel._id} value={channel.id || channel._id}>
                {channel.name || channel.nombreCanal || channel.identificadorCanal}
              </option>
            ))}
          </select>
          <input value={form.targetUrl} onChange={(e) => setForm({ ...form, targetUrl: e.target.value })} placeholder="https://destino-final.com" style={{ ...inputStyle, gridColumn: '1 / -1' }} />
          <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Contexto de campaña, tono de marca y objetivo." rows={3} style={{ ...inputStyle, gridColumn: '1 / -1', resize: 'vertical' }} />
          <textarea value={form.texto} onChange={(e) => setForm({ ...form, texto: e.target.value })} placeholder="Texto que quieres validar y publicar." rows={6} style={{ ...inputStyle, gridColumn: '1 / -1', resize: 'vertical' }} />
          <input type="number" min="0" value={form.presupuesto} onChange={(e) => setForm({ ...form, presupuesto: Number(e.target.value) })} placeholder="Presupuesto" style={inputStyle} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
          <button onClick={onClose} style={secondaryButton}>Cancelar</button>
          <button
            onClick={() => onCreate(form)}
            disabled={!form.titulo || !form.texto || !form.targetUrl || !form.canal}
            style={{ ...primaryButton, opacity: !form.titulo || !form.texto || !form.targetUrl || !form.canal ? 0.5 : 1, cursor: !form.titulo || !form.texto || !form.targetUrl || !form.canal ? 'not-allowed' : 'pointer' }}
          >
            Crear solicitud
          </button>
        </div>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '12px 14px',
  fontSize: '14px',
  color: 'var(--text)',
  fontFamily: FONT_BODY,
  outline: 'none',
}

const primaryButton = {
  background: PURPLE,
  border: 'none',
  color: '#fff',
  borderRadius: '12px',
  padding: '10px 18px',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: FONT_BODY,
}

const secondaryButton = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  borderRadius: '12px',
  padding: '10px 16px',
  fontSize: '13px',
  cursor: 'pointer',
  fontFamily: FONT_BODY,
}

export default function AdsPage() {
  const [ads, setAds] = useState([])
  const [channels, setChannels] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [chatDraft, setChatDraft] = useState('')
  const [feedbackDraft, setFeedbackDraft] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const [adsRes, channelsRes] = await Promise.all([
      apiService.getMyAds(),
      apiService.getMyChannels(),
    ])

    const nextAds = adsRes?.success ? adsRes.data || [] : []
    setAds(nextAds)
    setChannels(channelsRes?.success ? channelsRes?.data?.items || [] : [])
    if (!selectedId && nextAds[0]?.id) setSelectedId(nextAds[0].id)
    setLoading(false)
  }

  useEffect(() => {
    load().catch(() => {
      setError('No se pudieron cargar tus anuncios')
      setLoading(false)
    })
  }, [])

  const selected = useMemo(() => ads.find((ad) => ad.id === selectedId) || ads[0] || null, [ads, selectedId])

  const updateSelected = (next) => {
    setAds((prev) => prev.map((item) => item.id === next.id ? next : item))
    setSelectedId(next.id)
  }

  const handleCreate = async (form) => {
    const response = await apiService.createAd({
      titulo: form.titulo,
      descripcion: form.descripcion,
      texto: form.texto,
      targetUrl: form.targetUrl,
      canal: form.canal,
      presupuesto: form.presupuesto,
      brief: form.descripcion,
    })
    if (response?.success && response.data) {
      setAds((prev) => [response.data, ...prev])
      setSelectedId(response.data.id)
      setModalOpen(false)
      setFeedbackDraft('Por favor, validemos tono, claims y CTA antes de lanzar.')
    }
  }

  const sendChatMessage = async () => {
    if (!selected || !chatDraft.trim()) return
    const response = await apiService.sendAdReviewMessage(selected.id, { mensaje: chatDraft })
    if (response?.success && response.data) {
      updateSelected(response.data)
      setChatDraft('')
    }
  }

  const requestValidation = async () => {
    if (!selected) return
    const response = await apiService.requestAdValidation(selected.id, { mensaje: feedbackDraft || 'Solicitamos revisión del copy y confirmación del enlace final.' })
    if (response?.success && response.data) updateSelected(response.data)
  }

  return (
    <div style={{ fontFamily: FONT_BODY, display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '1240px' }}>
      <CreateAdModal open={modalOpen} onClose={() => setModalOpen(false)} channels={channels} onCreate={handleCreate} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '28px', fontWeight: 800, color: 'var(--text)', marginBottom: '6px' }}>Solicitudes de publicación</h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)' }}>Gestiona el copy, el enlace de destino y la conversación con admin antes de publicar.</p>
        </div>
        <button onClick={() => setModalOpen(true)} style={primaryButton}>Nueva solicitud</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)', color: '#ef4444', borderRadius: '12px', padding: '12px 14px', fontSize: '13px' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '340px minmax(0,1fr)', gap: '18px' }}>
        <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Tus campañas</div>
          </div>
          <div style={{ maxHeight: '720px', overflowY: 'auto' }}>
            {loading ? <div style={{ padding: '18px', color: 'var(--muted)' }}>Cargando…</div> : ads.length === 0 ? <div style={{ padding: '18px', color: 'var(--muted)' }}>Todavía no hay solicitudes creadas.</div> : ads.map((ad) => (
              <button
                key={ad.id}
                onClick={() => setSelectedId(ad.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: selected?.id === ad.id ? purpleAlpha(0.09) : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  padding: '16px 18px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{ad.title}</div>
                  <StatusBadge status={ad.status} />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>{ad.channel} · {ad.platform || 'canal'}</div>
                <div style={{ fontSize: '12px', color: ad.validation?.estado === 'approved' ? '#10b981' : 'var(--muted)' }}>
                  Validación: {ad.validation?.estado || 'draft'}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', padding: '20px', minHeight: '540px' }}>
          {!selected ? (
            <div style={{ color: 'var(--muted)' }}>Selecciona una solicitud para ver el flujo de revisión.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '24px', fontWeight: 800, color: 'var(--text)', marginBottom: '6px' }}>{selected.title}</h2>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <StatusBadge status={selected.status} />
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{selected.channel}</span>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Publicación: {selected.publication?.estado || 'draft'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button onClick={requestValidation} style={secondaryButton}>Enviar a validación</button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '16px' }}>
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Copy y destino</div>
                  <div style={{ fontSize: '14px', color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.7, marginBottom: '14px' }}>{selected.contenidoTexto}</div>
                  <a href={selected.targetUrl} target="_blank" rel="noreferrer" style={{ color: PURPLE, fontSize: '13px', textDecoration: 'none', wordBreak: 'break-all' }}>{selected.targetUrl}</a>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '16px' }}>
                    {Object.entries(selected.validation?.checklist || {}).map(([key, value]) => (
                      <div key={key} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 12px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>{key}</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: value ? '#10b981' : '#f59e0b' }}>{value ? 'OK' : 'Pendiente'}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Notas para admin</div>
                  <textarea value={feedbackDraft} onChange={(e) => setFeedbackDraft(e.target.value)} rows={7} placeholder="Especifica claims permitidos, tono, enfoque comercial, restricciones legales o CTA obligatorio." style={{ ...inputStyle, resize: 'vertical', minHeight: '170px' }} />
                </div>
              </div>

              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Chat marca ↔ admin</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{selected.conversation?.length || 0} mensajes</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px', marginBottom: '12px' }}>
                  {selected.conversation?.length ? selected.conversation.map((message) => (
                    <div key={message.id} style={{ background: message.autorRol === 'admin' ? purpleAlpha(0.08) : 'var(--surface)', border: `1px solid ${message.autorRol === 'admin' ? purpleAlpha(0.22) : 'var(--border)'}`, borderRadius: '14px', padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: message.autorRol === 'admin' ? PURPLE : 'var(--text)' }}>{message.autorNombre || message.autorRol}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{message.autorRol}</div>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6 }}>{message.mensaje}</div>
                    </div>
                  )) : (
                    <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Todavía no hay mensajes. Usa el chat para explicar exactamente cómo quieres el texto.</div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <textarea value={chatDraft} onChange={(e) => setChatDraft(e.target.value)} rows={3} placeholder="Escribe al admin: claims permitidos, prohibiciones, referencias de tono, CTA exacto, etc." style={{ ...inputStyle, resize: 'vertical', minHeight: '88px' }} />
                  <button onClick={sendChatMessage} style={{ ...primaryButton, alignSelf: 'stretch' }}>Enviar</button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
