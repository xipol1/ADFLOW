import React, { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion, useInView } from 'framer-motion'
import {
  FileBarChart2, Layers, TrendingDown, CheckCircle2,
  ArrowRight, Clock, ShieldCheck, Send,
} from 'lucide-react'
import SEO from '../../components/SEO'
import CrossLinks from '../../components/landing/CrossLinks'
import { FONT_BODY, FONT_DISPLAY, MAX_W } from '../../theme/tokens'

const F = FONT_BODY
const D = FONT_DISPLAY
const GREEN = '#25d366'
const GREEN_DARK = '#1ea952'
const greenAlpha = (o) => `rgba(37,211,102,${o})`

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } },
}
const staggerContainer = { hidden: {}, visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } }
const staggerItem = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } },
}

function Section({ children, style, id }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.section
      ref={ref}
      id={id}
      style={style}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={staggerContainer}
    >
      {children}
    </motion.section>
  )
}

const INCLUDES = [
  {
    Icon: FileBarChart2,
    title: 'Benchmark de tu tarifa',
    body: 'Cruzamos tu canal con el dataset de 2.500+ canales: qué cobra hoy un canal de tu nicho y tamaño, y dónde está el tuyo. La mayoría descubre que cobra 30-50% menos.',
  },
  {
    Icon: Layers,
    title: 'Formato que más monetiza',
    body: 'Post estándar, fijado 24-48h, nota de voz, mención orgánica… Te decimos qué formato rinde mejor en tu vertical y cuál estás infrautilizando.',
  },
  {
    Icon: TrendingDown,
    title: 'Tus fugas de monetización',
    body: 'Dónde dejas dinero sobre la mesa: tarifa plana mensual, cobrar por seguidores totales, no subir precios con el crecimiento. Tres recomendaciones concretas, accionables hoy.',
  },
]

const PLATFORMS = ['WhatsApp', 'Telegram', 'Discord', 'Newsletter', 'Otra']

export default function AuditPage() {
  const [channel, setChannel] = useState('')
  const [platform, setPlatform] = useState('WhatsApp')
  const [subs, setSubs] = useState('')
  const [niche, setNiche] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!channel.trim() || !email.trim()) {
      setError('Necesitamos al menos el canal y tu email.')
      return
    }
    setError('')
    const body = [
      'Solicitud de Channel Audit gratis',
      '',
      `Canal: ${channel}`,
      `Plataforma: ${platform}`,
      `Suscriptores aprox.: ${subs || 'no indicado'}`,
      `Nicho: ${niche || 'no indicado'}`,
      `Email de contacto: ${email}`,
    ].join('\n')
    const mailto =
      `mailto:contact@channelad.io` +
      `?subject=${encodeURIComponent('Channel Audit gratis — ' + channel)}` +
      `&body=${encodeURIComponent(body)}`
    window.location.href = mailto
    setSubmitted(true)
  }

  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Channel Audit gratis — Channelad',
    description: 'Auditoría gratuita de monetización para tu canal de WhatsApp, Telegram o Discord. Tres recomendaciones concretas en 48h.',
    url: 'https://channelad.io/audit',
    publisher: { '@type': 'Organization', name: 'Channelad', url: 'https://channelad.io' },
  }

  const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 10,
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text)',
    fontSize: 14,
    fontFamily: F,
    outline: 'none',
    transition: 'border-color .15s',
  }
  const labelStyle = {
    fontSize: 12, fontWeight: 600, color: 'var(--muted)',
    marginBottom: 6, display: 'block',
  }

  return (
    <main
      data-testid="audit-page"
      style={{
        fontFamily: F,
        color: 'var(--text)',
        background:
          'radial-gradient(ellipse 90% 50% at 75% 6%, rgba(37,211,102,0.10) 0%, transparent 55%), var(--bg)',
        position: 'relative',
      }}
    >
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(pageSchema)}</script>
      </Helmet>
      <SEO
        title="Channel Audit gratis · monetización de tu canal"
        description="Auditoría gratuita de monetización para tu canal de WhatsApp, Telegram o Discord. Tres recomendaciones concretas, hechas a mano, en 48h. Sin compromiso."
        path="/audit"
      />

      {/* 1 · HERO */}
      <section style={{ padding: '100px 32px 56px', position: 'relative' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: greenAlpha(0.10), border: `1px solid ${greenAlpha(0.24)}`,
              borderRadius: 999, padding: '5px 14px', marginBottom: 22,
              fontSize: 12, fontWeight: 600, color: GREEN,
            }}
          >
            <FileBarChart2 size={13} strokeWidth={2.4} /> Channel Audit · gratis y sin compromiso
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{
              fontFamily: D, fontSize: 'clamp(32px, 4.6vw, 52px)', fontWeight: 700,
              letterSpacing: '-0.035em', lineHeight: 1.06, margin: '0 0 18px',
            }}
          >
            ¿Tu canal cobra lo que{' '}
            <span style={{
              background: 'linear-gradient(135deg, #1ea952 0%, #25d366 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>realmente vale</span>?
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{ fontSize: 17, color: 'var(--muted)', lineHeight: 1.65, margin: '0 auto 26px', maxWidth: 600 }}
          >
            Te hacemos una auditoría de monetización a mano: benchmark de tarifa, formato óptimo y tus
            tres mayores fugas de ingresos. Sin venta — el audit es tuyo, listes el canal o no.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}
          >
            {[
              { Icon: Clock, label: 'Respuesta en 48h' },
              { Icon: ShieldCheck, label: 'Hecho a mano, no automático' },
              { Icon: CheckCircle2, label: 'Sin compromiso de listar nada' },
            ].map((p) => (
              <span key={p.label}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 999,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  fontSize: 12, color: 'var(--muted)', fontWeight: 500,
                }}>
                <p.Icon size={13} strokeWidth={2} color={GREEN} />{p.label}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 2 · QUÉ INCLUYE */}
      <Section style={{ padding: '60px 48px', background: 'transparent' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 44 }}>
            <p style={{
              fontSize: 11, fontWeight: 600, color: GREEN,
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12,
            }}>Qué recibes</p>
            <h2 style={{
              fontFamily: D, fontSize: 'clamp(24px, 2.8vw, 34px)', fontWeight: 700,
              letterSpacing: '-0.03em', maxWidth: 640, margin: '0 auto', lineHeight: 1.12,
            }}>
              Tres recomendaciones concretas. Cero relleno.
            </h2>
          </motion.div>

          <div className="audit-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {INCLUDES.map((item, i) => (
              <motion.div key={item.title} variants={staggerItem}
                whileHover={{ y: -4 }}
                style={{
                  background: 'var(--surface)', border: `1px solid ${greenAlpha(0.18)}`,
                  borderRadius: 18, padding: '26px', position: 'relative', overflow: 'hidden',
                  transition: 'border-color .25s, box-shadow .25s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = greenAlpha(0.35); e.currentTarget.style.boxShadow = `0 18px 50px -22px ${greenAlpha(0.30)}` }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = greenAlpha(0.18); e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{
                  position: 'absolute', top: 14, right: 18,
                  fontFamily: D, fontSize: 38, fontWeight: 700,
                  color: greenAlpha(0.08), lineHeight: 1, letterSpacing: '-0.04em',
                }}>{`0${i + 1}`}</div>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: greenAlpha(0.10), color: GREEN,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 14,
                }}>
                  <item.Icon size={22} strokeWidth={2} />
                </div>
                <h3 style={{
                  fontFamily: D, fontSize: 17, fontWeight: 700,
                  letterSpacing: '-0.015em', margin: '0 0 8px',
                }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>{item.body}</p>
              </motion.div>
            ))}
          </div>

          <style>{`
            @media (max-width: 860px) { .audit-grid { grid-template-columns: 1fr !important; } }
          `}</style>
        </div>
      </Section>

      {/* 3 · FORMULARIO */}
      <Section style={{ padding: '60px 32px 90px', background: 'transparent' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <motion.div variants={fadeUp}
            style={{
              background: `linear-gradient(150deg, ${greenAlpha(0.08)} 0%, transparent 70%), var(--surface)`,
              border: `1px solid ${greenAlpha(0.22)}`,
              borderRadius: 22, padding: 'clamp(28px, 4vw, 40px)',
              boxShadow: `0 30px 80px -36px ${greenAlpha(0.40)}`,
            }}
          >
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: greenAlpha(0.14), color: GREEN,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  <CheckCircle2 size={30} strokeWidth={2.2} />
                </div>
                <h2 style={{
                  fontFamily: D, fontSize: 22, fontWeight: 700,
                  margin: '0 0 10px', letterSpacing: '-0.02em',
                }}>
                  Casi — confirma el envío en tu correo
                </h2>
                <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 20px' }}>
                  Hemos abierto tu cliente de email con la solicitud lista. Dale a enviar y tendrás tu
                  audit en 48h. Si no se abrió, escríbenos a{' '}
                  <a href="mailto:contact@channelad.io" style={{ color: GREEN, textDecoration: 'none' }}>
                    contact@channelad.io
                  </a>.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  style={{
                    background: 'transparent', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '10px 18px', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: F,
                  }}
                >
                  Editar la solicitud
                </button>
              </div>
            ) : (
              <>
                <p style={{
                  fontSize: 11, fontWeight: 600, color: GREEN,
                  textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 8px',
                }}>Pide tu audit</p>
                <h2 style={{
                  fontFamily: D, fontSize: 'clamp(22px, 2.6vw, 28px)', fontWeight: 700,
                  letterSpacing: '-0.025em', margin: '0 0 6px', lineHeight: 1.2,
                }}>
                  Cuéntanos tu canal
                </h2>
                <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.55, margin: '0 0 24px' }}>
                  Dos minutos. Cuanto más nos cuentes, más afinado el audit.
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelStyle} htmlFor="audit-channel">Enlace o nombre del canal *</label>
                    <input
                      id="audit-channel"
                      type="text"
                      value={channel}
                      onChange={(e) => setChannel(e.target.value)}
                      placeholder="chat.whatsapp.com/… o @tucanal"
                      style={inputStyle}
                      onFocus={(e) => { e.target.style.borderColor = greenAlpha(0.5) }}
                      onBlur={(e) => { e.target.style.borderColor = 'var(--border)' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={labelStyle} htmlFor="audit-platform">Plataforma</label>
                      <select
                        id="audit-platform"
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                      >
                        {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle} htmlFor="audit-subs">Suscriptores aprox.</label>
                      <input
                        id="audit-subs"
                        type="text"
                        value={subs}
                        onChange={(e) => setSubs(e.target.value)}
                        placeholder="ej. 8.000"
                        style={inputStyle}
                        onFocus={(e) => { e.target.style.borderColor = greenAlpha(0.5) }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border)' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle} htmlFor="audit-niche">Nicho</label>
                    <input
                      id="audit-niche"
                      type="text"
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                      placeholder="ej. finanzas, B2B SaaS, lifestyle…"
                      style={inputStyle}
                      onFocus={(e) => { e.target.style.borderColor = greenAlpha(0.5) }}
                      onBlur={(e) => { e.target.style.borderColor = 'var(--border)' }}
                    />
                  </div>

                  <div>
                    <label style={labelStyle} htmlFor="audit-email">Tu email *</label>
                    <input
                      id="audit-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="donde te mandamos el audit"
                      style={inputStyle}
                      onFocus={(e) => { e.target.style.borderColor = greenAlpha(0.5) }}
                      onBlur={(e) => { e.target.style.borderColor = 'var(--border)' }}
                    />
                  </div>

                  {error && (
                    <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>{error}</p>
                  )}

                  <button
                    type="submit"
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      background: GREEN, color: '#fff', border: 'none',
                      borderRadius: 12, padding: '14px 24px',
                      fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: F,
                      boxShadow: `0 12px 28px -8px ${greenAlpha(0.45)}`,
                      transition: 'transform .2s, background .2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = GREEN_DARK; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = GREEN; e.currentTarget.style.transform = 'none' }}
                  >
                    <Send size={15} strokeWidth={2.4} /> Pedir mi audit gratis
                  </button>

                  <p style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
                    Solo usamos tus datos para hacer el audit y contactarte. Sin lista de correo, sin spam.
                  </p>
                </form>
              </>
            )}
          </motion.div>
        </div>
      </Section>

      {/* 4 · CÓMO FUNCIONA */}
      <Section style={{ padding: '0 48px 100px', background: 'transparent' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 20, padding: 'clamp(28px, 4vw, 44px)',
          }}>
            <div className="audit-how" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }}>
              {[
                { n: '01', t: 'Rellenas el formulario', d: 'Dos minutos. Tu canal, plataforma y nicho.' },
                { n: '02', t: 'Lo audita una persona', d: 'Cruzamos tu canal con el dataset y miramos tu caso a mano — no es un PDF automático.' },
                { n: '03', t: 'Recibes el audit en 48h', d: 'Tres recomendaciones concretas por email. Lo que hagas con ellas es cosa tuya.' },
              ].map((s) => (
                <motion.div key={s.n} variants={staggerItem}>
                  <div style={{
                    fontFamily: D, fontSize: 13, fontWeight: 700,
                    color: GREEN, letterSpacing: '0.06em', marginBottom: 10,
                  }}>{s.n}</div>
                  <h3 style={{
                    fontFamily: D, fontSize: 15.5, fontWeight: 700,
                    margin: '0 0 6px', lineHeight: 1.25,
                  }}>{s.t}</h3>
                  <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>{s.d}</p>
                </motion.div>
              ))}
            </div>

            <div style={{
              marginTop: 28, paddingTop: 24, borderTop: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 16, flexWrap: 'wrap',
            }}>
              <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0, lineHeight: 1.55, maxWidth: 440 }}>
                ¿Prefieres hablarlo en directo? El audit también se puede revisar contigo en una
                llamada de 15 minutos.
              </p>
              <Link
                to="/whatsapp"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: greenAlpha(0.08), color: GREEN, textDecoration: 'none',
                  borderRadius: 10, padding: '11px 18px',
                  fontSize: 14, fontWeight: 600,
                  border: `1px solid ${greenAlpha(0.22)}`,
                  whiteSpace: 'nowrap',
                }}
              >
                Ver cómo funciona Channelad <ArrowRight size={15} strokeWidth={2.4} />
              </Link>
            </div>
          </motion.div>

          <style>{`
            @media (max-width: 760px) { .audit-how { grid-template-columns: 1fr !important; } }
          `}</style>
        </div>
      </Section>

      <CrossLinks exclude="/audit" />
    </main>
  )
}
