import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import SEO from '../../components/SEO'
import { PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY, OK } from '../../theme/tokens'

export default function SupportPage() {
  const seo = <SEO title="Centro de ayuda" description="Soporte y preguntas frecuentes de Channelad. Resolvemos tus dudas sobre pagos custodiados, verificacion de canales, disputas y mas." path="/soporte" />
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) setSent(true)
    } catch { /* handled by sent state remaining false */ }
    finally { setLoading(false) }
  }

  const faqs = [
    { q: 'Como funciona el pago custodiado?', a: 'Cuando un anunciante contrata un espacio, el pago se retiene de forma segura. Solo se libera al creador una vez que se confirma la publicacion del anuncio segun los terminos acordados.' },
    { q: 'Que comision cobra Adflow?', a: 'Adflow cobra una comision sobre cada transaccion completada. Las tarifas exactas dependen del plan y volumen. Consulta la seccion de Finanzas en tu dashboard para mas detalles.' },
    { q: 'Como registro mi canal?', a: 'Accede a tu dashboard de creador, ve a "Mis Canales" y haz clic en "Registrar canal". Sigue el asistente para verificar la propiedad de tu canal y configurar tus tarifas.' },
    { q: 'Que hago si tengo una disputa?', a: 'Puedes abrir una disputa desde la seccion "Disputas" de tu dashboard. Nuestro equipo revisara el caso y mediara entre ambas partes en un plazo maximo de 48 horas laborables.' },
  ]

  const inputStyle = {
    width: '100%', padding: '12px 14px', fontSize: '14px', fontFamily: FONT_BODY,
    background: 'var(--bg)', color: 'var(--text)',
    border: '1px solid var(--border)', borderRadius: '10px',
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ fontFamily: FONT_BODY, padding: '60px 24px 80px', maxWidth: '760px', margin: '0 auto' }}>
      {seo}
      <Link to="/" style={{ fontSize: '13px', color: PURPLE, textDecoration: 'none', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '32px' }}>
        ← Volver al inicio
      </Link>

      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '32px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.5px' }}>
        Centro de Soporte
      </h1>
      <p style={{ fontSize: '15px', color: 'var(--muted)', marginBottom: '48px', lineHeight: 1.6 }}>
        Estamos aqui para ayudarte. Consulta las preguntas frecuentes o contactanos directamente.
      </p>

      {/* FAQs */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginBottom: '20px' }}>
          Preguntas frecuentes
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {faqs.map(faq => (
            <details key={faq.q} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '0',
            }}>
              <summary style={{
                padding: '16px 20px', cursor: 'pointer',
                fontSize: '14px', fontWeight: 600, color: 'var(--text)',
                listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                {faq.q}
                <span style={{ fontSize: '18px', color: 'var(--muted)', flexShrink: 0, marginLeft: '12px' }}>+</span>
              </summary>
              <div style={{ padding: '0 20px 16px', fontSize: '14px', color: 'var(--muted)', lineHeight: 1.7 }}>
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Contact Form */}
      <section>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
          Contactanos
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '24px' }}>
          Tambien puedes escribirnos a <a href="mailto:soporte@adflow.com" style={{ color: PURPLE, textDecoration: 'none' }}>soporte@adflow.com</a>
        </p>

        {!sent ? (
          <form onSubmit={handleSubmit} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '16px', padding: '28px',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Nombre</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required style={inputStyle} placeholder="Tu nombre" />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required style={inputStyle} placeholder="tu@email.com" />
              </div>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Asunto</label>
              <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required style={inputStyle} placeholder="Describe brevemente tu consulta" />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Mensaje</label>
              <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} required rows={5} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Cuentanos en detalle como podemos ayudarte..." />
            </div>
            <button type="submit" disabled={loading} style={{
              background: loading ? 'var(--muted2)' : PURPLE, color: '#fff', border: 'none',
              borderRadius: '10px', padding: '13px 28px', fontSize: '14px', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: FONT_BODY,
            }}>
              {loading ? 'Enviando...' : 'Enviar mensaje'}
            </button>
          </form>
        ) : (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '16px', padding: '48px 28px', textAlign: 'center',
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: `${OK}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: '24px',
            }}>
              ✓
            </div>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
              Mensaje enviado
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6 }}>
              Hemos recibido tu consulta. Te responderemos en un plazo maximo de 24 horas laborables.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
