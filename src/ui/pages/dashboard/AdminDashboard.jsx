import React, { useEffect, useMemo, useState } from 'react'
import apiService from '../../../../services/api'
import { PURPLE as A, purpleAlpha as AG, FONT_BODY as F, FONT_DISPLAY as D } from '../../theme/tokens'
import { ErrorBanner } from './shared/DashComponents'

const button = {
  background: A,
  border: 'none',
  color: '#fff',
  borderRadius: '12px',
  padding: '10px 14px',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: F,
}

const ghost = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  borderRadius: '12px',
  padding: '10px 14px',
  fontSize: '13px',
  cursor: 'pointer',
  fontFamily: F,
}

export default function AdminDashboard({ user }) {
  const [ads, setAds] = useState([])
  const [fetchError, setFetchError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)
  const [selectedId, setSelectedId] = useState('')
  const [message, setMessage] = useState('')
  const [notes, setNotes] = useState('Ajustad el copy a un tono claro, sin claims absolutos y manteniendo el CTA enlazado.')

  const load = async () => {
    const response = await apiService.getMyAds()
    if (response?.success) {
      setAds(response.data || [])
      if (!selectedId && response.data?.[0]?.id) setSelectedId(response.data[0].id)
    }
  }

  useEffect(() => {
    load().catch(() => {
      setFetchError('No se pudieron cargar los datos. Verifica tu conexion.')
    })
  }, [retryKey])

  const selected = useMemo(() => ads.find((ad) => ad.id === selectedId) || ads[0] || null, [ads, selectedId])
  const pending = useMemo(() => ads.filter((ad) => ['submitted', 'changes_requested'].includes(ad.validation?.estado)), [ads])
  const approved = useMemo(() => ads.filter((ad) => ad.validation?.estado === 'approved'), [ads])

  const updateSelected = (next) => {
    setAds((prev) => prev.map((item) => item.id === next.id ? next : item))
    setSelectedId(next.id)
  }

  const sendMessage = async () => {
    if (!selected || !message.trim()) return
    const response = await apiService.sendAdReviewMessage(selected.id, { mensaje: message, tipo: 'admin_note' })
    if (response?.success && response.data) {
      updateSelected(response.data)
      setMessage('')
    }
  }

  const review = async (approvedState) => {
    if (!selected) return
    const response = await apiService.reviewAdCopy(selected.id, {
      aprobado: approvedState,
      notas,
      checklist: {
        claridad: true,
        compliance: approvedState,
        branding: true,
        linkValido: /^https?:\/\//i.test(selected.targetUrl || ''),
      },
    })
    if (response?.success && response.data) updateSelected(response.data)
  }

  const publish = async () => {
    if (!selected) return
    const response = await apiService.publishAd(selected.id)
    if (response?.success && response.data) updateSelected(response.data)
  }

  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <div>
        <h1 style={{ fontFamily: D, fontSize: '28px', fontWeight: 800, color: 'var(--text)', marginBottom: '6px' }}>Centro editorial y publicación</h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)' }}>Revisa el copy de las marcas, conversa por chat y lanza la publicación automática cuando quede aprobado.</p>
      </div>

      {fetchError && (
        <ErrorBanner
          message={fetchError}
          onRetry={() => { setFetchError(null); setRetryKey(k => k + 1) }}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
        {[
          { label: 'Pendientes de revisión', value: pending.length },
          { label: 'Aprobadas', value: approved.length },
          { label: 'Usuario admin', value: user?.email || 'admin' },
        ].map((item) => (
          <div key={item.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px' }}>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>{item.label}</div>
            <div style={{ fontFamily: D, fontSize: '26px', fontWeight: 800, color: 'var(--text)' }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px minmax(0,1fr)', gap: '18px' }}>
        <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontFamily: D, fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Cola editorial</div>
          </div>
          <div style={{ maxHeight: '720px', overflowY: 'auto' }}>
            {ads.map((ad) => (
              <button
                key={ad.id}
                onClick={() => setSelectedId(ad.id)}
                style={{
                  width: '100%',
                  background: selected?.id === ad.id ? AG(0.1) : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  textAlign: 'left',
                  padding: '16px 18px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>{ad.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>{ad.advertiser || 'Marca'} · {ad.channel}</div>
                <div style={{ fontSize: '12px', color: ['approved', 'published'].includes(ad.validation?.estado) ? '#10b981' : '#f59e0b' }}>
                  Validación: {ad.validation?.estado || 'draft'}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', padding: '20px' }}>
          {!selected ? (
            <div style={{ color: 'var(--muted)' }}>Selecciona una pieza para revisar.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ fontFamily: D, fontSize: '24px', fontWeight: 800, color: 'var(--text)', marginBottom: '6px' }}>{selected.title}</h2>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{selected.advertiser || 'Marca'} · {selected.channel} · {selected.platform || 'canal'}</div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button onClick={() => review(false)} style={ghost}>Pedir cambios</button>
                  <button onClick={() => review(true)} style={button}>Aprobar copy</button>
                  <button onClick={publish} style={{ ...button, background: '#10b981' }}>Publicar ahora</button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Texto recibido</div>
                  <div style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: '14px' }}>{selected.contenidoTexto}</div>
                  <a href={selected.targetUrl} target="_blank" rel="noreferrer" style={{ color: A, wordBreak: 'break-all', fontSize: '13px', textDecoration: 'none' }}>{selected.targetUrl}</a>
                </div>

                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Respuesta editorial</div>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={9} style={{ width: '100%', boxSizing: 'border-box', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: 'var(--text)', fontFamily: F, resize: 'vertical' }} />
                </div>
              </div>

              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px', marginBottom: '16px' }}>
                  {Object.entries(selected.validation?.checklist || {}).map(([key, value]) => (
                    <div key={key} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 12px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>{key}</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: value ? '#10b981' : '#f59e0b' }}>{value ? 'OK' : 'Revisar'}</div>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Chat operativo</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto', marginBottom: '12px' }}>
                  {(selected.conversation || []).map((entry) => (
                    <div key={entry.id} style={{ background: entry.autorRol === 'admin' ? AG(0.1) : 'var(--surface)', border: `1px solid ${entry.autorRol === 'admin' ? AG(0.24) : 'var(--border)'}`, borderRadius: '14px', padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: entry.autorRol === 'admin' ? A : 'var(--text)' }}>{entry.autorNombre || entry.autorRol}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{entry.autorRol}</div>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6 }}>{entry.mensaje}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Pide cambios concretos o confirma requisitos del anuncio." style={{ width: '100%', boxSizing: 'border-box', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: 'var(--text)', fontFamily: F, resize: 'vertical' }} />
                  <button onClick={sendMessage} style={button}>Enviar</button>
                </div>
              </div>

              <div style={{ background: AG(0.08), border: `1px solid ${AG(0.22)}`, borderRadius: '14px', padding: '14px 16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>Estado de publicación</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{selected.publication?.estado || 'draft'}</div>
                {selected.publication?.urlPublicacion && (
                  <a href={selected.publication.urlPublicacion} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '8px', color: A, fontSize: '13px', textDecoration: 'none' }}>
                    Ver publicación
                  </a>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
