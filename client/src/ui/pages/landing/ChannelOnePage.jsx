import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, CheckCircle2, AlertCircle, Mail, Copy, Share2,
  Users, Sparkles, Zap, Lock, Database, Twitter, MessageCircle,
} from 'lucide-react'
import SEO from '../../components/SEO'
import CrossLinks from '../../components/landing/CrossLinks'
import { FONT_BODY, FONT_DISPLAY, MAX_W } from '../../theme/tokens'
import { CAP, NICHES, SIZES, PLATFORMS, COUNTER_LABEL } from '../../theme/channelOne'

const F = FONT_BODY
const D = FONT_DISPLAY
const GREEN = '#25d366'
const GREEN_DARK = '#1ea952'
const greenAlpha = (o) => `rgba(37,211,102,${o})`

// ─── Motion presets (same vocabulary as FoundingPage) ────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
}
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }
const item = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } },
}

function Section({ children, style, id }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.section
      ref={ref} id={id} style={style}
      initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={stagger}
    >{children}</motion.section>
  )
}

// ─── Static copy ─────────────────────────────────────────────────────
const BENEFITS = [
  { Icon: Zap,      title: 'Activación prioritaria',     body: 'Los 1.000 canales de Channel One se activan antes que el marketplace público de septiembre. Cuando todos lleguen, tú ya estarás cobrando.' },
  { Icon: Sparkles, title: '0% comisión el primer trimestre', body: 'Tus tres primeros meses tras la activación: 0% de comisión a tus anunciantes. Después, 20% estándar (o 18% si entras también en founding).' },
  { Icon: Lock,     title: 'Slot reservado en tu nicho',  body: 'Solo 80 plazas por nicho en Channel One. Cuando se llene tu vertical, no hay forma de entrar — ni con waitlist.' },
  { Icon: Database, title: 'Acceso al dataset privado',   body: 'Desde el día 1: CPMs reales por nicho y plataforma, formatos que convierten, ejemplos anonimizados. Mensual.' },
]

const STEPS = [
  { n: '01', title: 'Te registras', body: 'Email + handle del canal + nicho + tamaño. 20 segundos. Sin tarjeta.' },
  { n: '02', title: 'Confirmas el email', body: 'Click en el link que te enviamos. Solo cuenta tu plaza si confirmas.' },
  { n: '03', title: 'Compartes tu link', body: 'Recibes un link único. Cada canal que se sume con tu link te sube en la cola.' },
  { n: '04', title: 'Activas en septiembre', body: 'Lanzamiento público. Tu canal se activa antes que los del marketplace abierto.' },
]

const FAQS = [
  { q: '¿Es lo mismo que founding cohort?', a: 'No. Founding cohort son 150 plazas con comisión 18% vitalicia — más exclusivo. Channel One son 1.000 plazas con activación prioritaria + 0% el primer trimestre. Puedes estar en los dos.' },
  { q: '¿Qué significa "canales interesados"?', a: 'La métrica agrega varias señales reales de interés: founding reservados, audits solicitados, conversaciones cualificadas y registros confirmados en esta lista. Es honesta y se actualiza a diario.' },
  { q: '¿Hay coste?', a: 'Cero. Channel One es gratis. Lo único que pedimos es que confirmes el email para que tu plaza cuente.' },
  { q: '¿Puedo cambiarme de nicho después?', a: 'Sí, mientras quede plaza en el nuevo nicho. Escríbenos a contact@channelad.io con tu link de referido y lo movemos.' },
  { q: '¿Qué pasa si no confirmo el email?', a: 'Tu plaza no cuenta en el cohort y otro canal puede ocupar el slot. Si pierdes el correo, registra de nuevo el mismo email y te lo reenviamos.' },
  { q: '¿Cómo funcionan los referidos?', a: 'Cada canal recibe un link único. Por cada 3 confirmados que entren a través de tu link, tu posición visible en la cola sube 100 puestos. El backend no reordena nada — es un boost de motivación, no una promesa.' },
  { q: '¿Se publica mi nombre en algún sitio?', a: 'No. Channel One es privado mientras no se cierre el cohort. En septiembre, si das tu consentimiento explícito, podemos mencionar tu canal como caso. Si no, sigues siendo privado.' },
]

// ─── Page ────────────────────────────────────────────────────────────
export default function ChannelOnePage() {
  const [searchParams] = useSearchParams()
  const refParam = searchParams.get('ref') || ''
  const confirmedFlag = searchParams.get('confirmed') === '1'
  const errFlag = searchParams.get('err') || ''

  const [counter, setCounter] = useState(null)
  const [nicheData, setNicheData] = useState([])
  const [openFaq, setOpenFaq] = useState(null)

  // Form state
  const [form, setForm] = useState({
    email: '', handle: '', platform: 'telegram', nicho: '', size: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState(null) // { ok, message, referralToken }

  // Initial fetch
  useEffect(() => {
    fetch('/api/channel-one/counter').then(r => r.json()).then(j => j?.success && setCounter(j.data)).catch(() => {})
    fetch('/api/channel-one/niches').then(r => r.json()).then(j => j?.success && setNicheData(j.data.niches || [])).catch(() => {})
  }, [])

  const onChange = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setSubmitResult(null)
    try {
      const res = await fetch('/api/channel-one/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          ref: refParam || undefined,
          source: searchParams.get('utm_source') || 'direct',
        }),
      })
      const json = await res.json()
      setSubmitResult({
        ok: !!json?.success,
        message: json?.message || (json?.success ? 'Listo.' : 'Algo falló.'),
        referralToken: json?.data?.referralToken || null,
      })
    } catch {
      setSubmitResult({ ok: false, message: 'Error de red. Vuelve a intentarlo.' })
    } finally {
      setSubmitting(false)
    }
  }

  const displayed = counter?.displayed ?? 247
  const remaining = counter?.remaining ?? (CAP - displayed)
  const pct = counter?.percentFull ?? Math.round((displayed / CAP) * 100)

  // SEO schema
  const faqSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }), [])
  const pageSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Channel One · Pre-registro Channelad',
    description: `Pre-registro abierto · 1.000 canales prioritarios para el lanzamiento de septiembre 2026. Activación prioritaria, 0% comisión primer trimestre, slot reservado por nicho.`,
    url: 'https://channelad.io/channel-one',
    publisher: { '@type': 'Organization', name: 'Channelad', url: 'https://channelad.io' },
  }), [])

  return (
    <main
      data-testid="channel-one-page"
      style={{
        fontFamily: F, color: 'var(--text)',
        background: 'radial-gradient(ellipse 95% 50% at 30% 4%, rgba(37,211,102,0.10) 0%, transparent 55%), var(--bg)',
        position: 'relative',
      }}
    >
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(pageSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>
      <SEO
        title="Channel One · pre-registro 1.000 canales prioritarios"
        description="Pre-registro abierto. Los primeros 1.000 canales en español se activan antes que el marketplace de septiembre. 0% comisión primer trimestre. Slot reservado por nicho."
        path="/channel-one"
      />

      {/* ── 0 · Confirmation / error banners (URL-driven) ───────── */}
      {confirmedFlag && (
        <ConfirmBanner kind="success">
          ¡Plaza confirmada! Tu slot en Channel One ya cuenta. Comparte tu link
          de referidos para subir en la cola.
        </ConfirmBanner>
      )}
      {errFlag && (
        <ConfirmBanner kind="error">
          No hemos podido confirmar tu plaza ({errFlag}). Vuelve a registrarte o
          escríbenos a contact@channelad.io.
        </ConfirmBanner>
      )}

      {/* ── 1 · Hero ──────────────────────────────────────────── */}
      <section style={{ padding: '90px 32px 50px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="co-hero-grid" style={{
            display: 'grid', gridTemplateColumns: '1.05fr 1fr',
            gap: 56, alignItems: 'center',
          }}>
            {/* LEFT */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  background: greenAlpha(0.10), border: `1px solid ${greenAlpha(0.24)}`,
                  borderRadius: 999, padding: '5px 14px', marginBottom: 22,
                  fontSize: 12, fontWeight: 600, color: GREEN,
                }}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', background: GREEN,
                  boxShadow: `0 0 0 0 ${greenAlpha(0.6)}`, animation: 'co-pulse 1.8s infinite',
                }} />
                Channel One · {remaining.toLocaleString('es-ES')} slots libres
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
                style={{
                  fontFamily: D, fontSize: 'clamp(34px, 4.6vw, 54px)', fontWeight: 700,
                  letterSpacing: '-0.035em', lineHeight: 1.05, margin: '0 0 18px',
                }}
              >
                Reserva tu slot entre los {CAP.toLocaleString('es-ES')} canales que se activan{' '}
                <span style={{
                  background: 'linear-gradient(135deg, #1ea952 0%, #25d366 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>antes del marketplace público.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.18 }}
                style={{ fontSize: 17, color: 'var(--muted)', lineHeight: 1.65, maxWidth: 540, margin: '0 0 26px' }}
              >
                Channel One es la cohorte de pre-registro para el lanzamiento de Channelad en
                septiembre 2026. Los 1.000 primeros canales en español pagan{' '}
                <strong style={{ color: 'var(--text)' }}>0% de comisión el primer trimestre</strong>,
                acceden al dataset privado desde hoy y se activan antes que el marketplace abierto.
              </motion.p>

              {/* Progreso inline */}
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.28 }}
                style={{ marginBottom: 26, maxWidth: 460 }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{
                    fontFamily: D, fontSize: 17, fontWeight: 700, color: 'var(--text)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {displayed.toLocaleString('es-ES')}{' '}
                    <span style={{ color: 'var(--muted)', fontWeight: 500 }}>
                      / {CAP.toLocaleString('es-ES')} {COUNTER_LABEL}
                    </span>
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: GREEN }}>
                    {remaining.toLocaleString('es-ES')} libres
                  </span>
                </div>
                <div style={{
                  width: '100%', height: 8, borderRadius: 8,
                  background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    background: `linear-gradient(90deg, ${GREEN}, ${GREEN_DARK})`,
                    boxShadow: `0 0 14px ${greenAlpha(0.5)}`,
                    transition: 'width .8s ease-out',
                  }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
                  Incluye founding reservados, audits solicitados y conversaciones cualificadas.
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.36 }}
                style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}
              >
                <a
                  href="#registro"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: GREEN, color: '#fff', textDecoration: 'none',
                    borderRadius: 12, padding: '14px 24px',
                    fontSize: 15, fontWeight: 600,
                    boxShadow: `0 12px 28px -8px ${greenAlpha(0.45)}`,
                    transition: 'background .2s, transform .2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = GREEN_DARK; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = GREEN; e.currentTarget.style.transform = 'none' }}
                >
                  <Users size={16} strokeWidth={2.4} /> Reservar mi slot
                </a>
                <Link
                  to="/founding"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: greenAlpha(0.08), color: GREEN, textDecoration: 'none',
                    borderRadius: 12, padding: '14px 22px',
                    fontSize: 15, fontWeight: 600,
                    border: `1px solid ${greenAlpha(0.22)}`,
                  }}
                >
                  Ver founding cohort (18% vitalicio) <ArrowRight size={16} strokeWidth={2.4} />
                </Link>
              </motion.div>
            </div>

            {/* RIGHT — niche scarcity preview */}
            <div className="co-hero-niches">
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}
                style={{
                  background: 'var(--surface)', border: `1px solid ${greenAlpha(0.18)}`,
                  borderRadius: 18, padding: 22, maxWidth: 460, marginLeft: 'auto',
                  boxShadow: `0 24px 60px -28px ${greenAlpha(0.35)}`,
                }}
              >
                <div style={{
                  fontSize: 10, fontWeight: 700, color: GREEN,
                  textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14,
                }}>
                  Slots por nicho · 80 cada uno
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(nicheData.length ? nicheData : NICHES.slice(0, 6).map(n => ({ ...n, filled: 0, percentFull: 0, almostFull: false }))).slice(0, 6).map(n => (
                    <NicheRowMini key={n.id} niche={n} />
                  ))}
                </div>
                <a href="#nichos" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  marginTop: 14, fontSize: 12, fontWeight: 600,
                  color: GREEN, textDecoration: 'none',
                }}>
                  Ver los 12 nichos <ArrowRight size={12} strokeWidth={2.4} />
                </a>
              </motion.div>
            </div>
          </div>
        </div>
        <style>{`
          @keyframes co-pulse {
            0%   { box-shadow: 0 0 0 0 ${greenAlpha(0.6)}; }
            70%  { box-shadow: 0 0 0 6px ${greenAlpha(0)}; }
            100% { box-shadow: 0 0 0 0 ${greenAlpha(0)}; }
          }
          @media (max-width: 920px) {
            .co-hero-grid { grid-template-columns: 1fr !important; gap: 44px !important; }
          }
        `}</style>
      </section>

      {/* ── 2 · Beneficios ────────────────────────────────────── */}
      <Section style={{ padding: '72px 32px', background: 'transparent' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 44 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              Qué incluye Channel One
            </p>
            <h2 style={{
              fontFamily: D, fontSize: 'clamp(26px, 3.2vw, 38px)', fontWeight: 700,
              letterSpacing: '-0.03em', maxWidth: 680, margin: '0 auto', lineHeight: 1.1,
            }}>
              Cuatro ventajas concretas, no promesas.
            </h2>
          </motion.div>

          <div className="co-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {BENEFITS.map((b, i) => (
              <motion.div key={b.title} variants={item}
                whileHover={{ y: -3 }}
                style={{
                  background: 'var(--surface)', border: `1px solid ${greenAlpha(0.18)}`,
                  borderRadius: 16, padding: 26, position: 'relative', overflow: 'hidden',
                  transition: 'border-color .25s, box-shadow .25s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = greenAlpha(0.35); e.currentTarget.style.boxShadow = `0 18px 50px -22px ${greenAlpha(0.30)}` }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = greenAlpha(0.18); e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{
                  position: 'absolute', top: 14, right: 18,
                  fontFamily: D, fontSize: 34, fontWeight: 700,
                  color: greenAlpha(0.08), lineHeight: 1, letterSpacing: '-0.04em',
                }}>{`0${i + 1}`}</div>
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: greenAlpha(0.10), color: GREEN,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 14,
                }}>
                  <b.Icon size={20} strokeWidth={2} />
                </div>
                <h3 style={{ fontFamily: D, fontSize: 17, fontWeight: 700, letterSpacing: '-0.015em', margin: '0 0 8px' }}>{b.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>{b.body}</p>
              </motion.div>
            ))}
          </div>
          <style>{`@media (max-width: 720px) { .co-grid-2 { grid-template-columns: 1fr !important; } }`}</style>
        </div>
      </Section>

      {/* ── 3 · Nichos (scarcity per vertical) ────────────────── */}
      <Section id="nichos" style={{ padding: '72px 32px', background: 'var(--bg2)' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 36 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              Slots por nicho
            </p>
            <h2 style={{
              fontFamily: D, fontSize: 'clamp(24px, 2.8vw, 34px)', fontWeight: 700,
              letterSpacing: '-0.025em', lineHeight: 1.15,
            }}>
              80 plazas por nicho. Cuando se llena, se llena.
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 560, margin: '12px auto 0', lineHeight: 1.6 }}>
              Mantenemos diversidad: ningún nicho domina el cohort. Si tu vertical está casi
              lleno, no esperes — reserva ahora.
            </p>
          </motion.div>

          <div className="co-niches-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
          }}>
            {(nicheData.length ? nicheData : NICHES.map(n => ({ ...n, slots: 80, filled: 0, percentFull: 0, almostFull: false, full: false }))).map(n => (
              <NicheCard key={n.id} niche={n} />
            ))}
          </div>
          <style>{`
            @media (max-width: 920px) { .co-niches-grid { grid-template-columns: repeat(2, 1fr) !important; } }
            @media (max-width: 560px) { .co-niches-grid { grid-template-columns: 1fr !important; } }
          `}</style>
        </div>
      </Section>

      {/* ── 4 · Formulario de registro ─────────────────────────── */}
      <Section id="registro" style={{ padding: '80px 32px', background: 'transparent' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              Reserva tu slot
            </p>
            <h2 style={{
              fontFamily: D, fontSize: 'clamp(24px, 2.8vw, 34px)', fontWeight: 700,
              letterSpacing: '-0.025em', lineHeight: 1.15,
            }}>
              20 segundos. Sin tarjeta. Doble opt-in.
            </h2>
            {refParam && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: greenAlpha(0.10), border: `1px solid ${greenAlpha(0.25)}`,
                borderRadius: 999, padding: '5px 14px', marginTop: 16,
                fontSize: 12, fontWeight: 600, color: GREEN,
              }}>
                <Share2 size={13} strokeWidth={2.2} />
                Te ha invitado un partner — tu plaza cuenta el doble en su cola
              </div>
            )}
          </motion.div>

          {submitResult?.ok && submitResult.referralToken ? (
            <RegistrationSuccess result={submitResult} />
          ) : (
            <motion.form
              variants={fadeUp}
              onSubmit={onSubmit}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 18, padding: 'clamp(22px, 3vw, 32px)',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="co-form-grid">
                <Field label="Email" required>
                  <input
                    type="email" required value={form.email} onChange={onChange('email')}
                    placeholder="tu@email.com"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Handle de tu canal" required>
                  <input
                    type="text" required value={form.handle} onChange={onChange('handle')}
                    placeholder="@micanal o url"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Plataforma">
                  <select value={form.platform} onChange={onChange('platform')} style={inputStyle}>
                    {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </Field>
                <Field label="Tamaño del canal" required>
                  <select value={form.size} onChange={onChange('size')} required style={inputStyle}>
                    <option value="">Selecciona…</option>
                    {SIZES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </Field>
                <Field label="Nicho" required wide>
                  <select value={form.nicho} onChange={onChange('nicho')} required style={inputStyle}>
                    <option value="">Selecciona el nicho de tu canal…</option>
                    {NICHES.map(n => {
                      const data = nicheData.find(x => x.id === n.id)
                      const full = data?.full
                      const almost = data?.almostFull
                      const label = full ? `${n.label} · LLENO` : (almost ? `${n.label} · casi lleno` : n.label)
                      return <option key={n.id} value={n.id} disabled={full}>{n.emoji} {label}</option>
                    })}
                  </select>
                </Field>
              </div>

              {submitResult && !submitResult.ok && (
                <div style={{
                  marginTop: 16, padding: 12,
                  background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)',
                  borderRadius: 10, fontSize: 13, color: '#dc2626',
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                }}>
                  <AlertCircle size={16} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
                  {submitResult.message}
                </div>
              )}

              <button
                type="submit" disabled={submitting}
                style={{
                  marginTop: 20, width: '100%',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: submitting ? greenAlpha(0.55) : GREEN, color: '#fff',
                  border: 'none', borderRadius: 12, padding: '14px 22px',
                  fontSize: 15, fontWeight: 600, cursor: submitting ? 'wait' : 'pointer',
                  boxShadow: `0 12px 28px -8px ${greenAlpha(0.45)}`,
                  transition: 'background .2s',
                }}
              >
                {submitting ? 'Enviando…' : <>Reservar mi slot <ArrowRight size={16} strokeWidth={2.4} /></>}
              </button>

              <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 12, lineHeight: 1.6 }}>
                Al enviar aceptas que te enviemos un email para confirmar tu plaza. Nada de spam,
                cero compartir tu dato. RGPD: <Link to="/privacidad" style={{ color: GREEN }}>política de privacidad</Link>.
              </p>
            </motion.form>
          )}
        </div>
      </Section>

      {/* ── 5 · Cómo funciona ──────────────────────────────────── */}
      <Section style={{ padding: '72px 32px', background: 'var(--bg2)' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 40 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              Cómo funciona
            </p>
            <h2 style={{ fontFamily: D, fontSize: 'clamp(24px, 2.8vw, 34px)', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.15 }}>
              De aquí a septiembre, en cuatro pasos.
            </h2>
          </motion.div>
          <div className="co-steps" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {STEPS.map((s, i) => (
              <motion.div key={s.n} variants={item}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 16, padding: 22, position: 'relative',
                }}
              >
                {i < STEPS.length - 1 && (
                  <div className="co-step-arrow" style={{
                    position: 'absolute', right: -12, top: '50%', transform: 'translateY(-50%)',
                    color: greenAlpha(0.4), zIndex: 2,
                  }}>
                    <ArrowRight size={18} strokeWidth={2.4} />
                  </div>
                )}
                <div style={{
                  width: 34, height: 34, borderRadius: 9,
                  background: greenAlpha(0.10), color: GREEN,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: D, fontWeight: 700, fontSize: 13, marginBottom: 14,
                }}>{s.n}</div>
                <h3 style={{ fontFamily: D, fontSize: 15, fontWeight: 700, margin: '0 0 8px', lineHeight: 1.2 }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>{s.body}</p>
              </motion.div>
            ))}
          </div>
          <style>{`
            @media (max-width: 1024px) {
              .co-steps { grid-template-columns: 1fr 1fr !important; }
              .co-step-arrow { display: none; }
            }
            @media (max-width: 560px) { .co-steps { grid-template-columns: 1fr !important; } }
          `}</style>
        </div>
      </Section>

      {/* ── 6 · FAQ ────────────────────────────────────────────── */}
      <Section style={{ padding: '72px 32px', background: 'transparent' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 36 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>FAQ</p>
            <h2 style={{ fontFamily: D, fontSize: 'clamp(22px, 2.6vw, 30px)', fontWeight: 700, letterSpacing: '-0.025em' }}>
              Lo que preguntan antes de reservar
            </h2>
          </motion.div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FAQS.map((faq, i) => (
              <motion.div key={i} variants={item} style={{
                background: 'var(--surface)',
                border: `1px solid ${openFaq === i ? greenAlpha(0.25) : 'var(--border)'}`,
                borderRadius: 14, overflow: 'hidden', transition: 'border-color .2s',
              }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 500, color: openFaq === i ? GREEN : 'var(--text)' }}>{faq.q}</span>
                  <motion.svg animate={{ rotate: openFaq === i ? 45 : 0 }} transition={{ duration: 0.3 }}
                    width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ color: openFaq === i ? GREEN : 'var(--muted)', flexShrink: 0, marginLeft: 16 }}>
                    <path d="M12 5v14M5 12h14"/>
                  </motion.svg>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ padding: '0 20px 18px' }}>
                        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>{faq.a}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      <CrossLinks exclude="/channel-one" />
    </main>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────
function ConfirmBanner({ kind, children }) {
  const bg = kind === 'success' ? greenAlpha(0.12) : 'rgba(220,38,38,0.10)'
  const fg = kind === 'success' ? GREEN : '#dc2626'
  const Icon = kind === 'success' ? CheckCircle2 : AlertCircle
  return (
    <div style={{
      background: bg, borderBottom: `1px solid ${kind === 'success' ? greenAlpha(0.25) : 'rgba(220,38,38,0.25)'}`,
      padding: '12px 24px', textAlign: 'center', fontSize: 14, color: fg, fontWeight: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      <Icon size={16} strokeWidth={2.2} />
      <span>{children}</span>
    </div>
  )
}

function NicheRowMini({ niche }) {
  const pct = Math.min(100, niche.percentFull || 0)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{
        flex: '0 0 130px', fontSize: 13, color: 'var(--text)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {niche.emoji || ''} {niche.label}
      </span>
      <div style={{
        flex: 1, height: 6, borderRadius: 6,
        background: 'var(--bg2)', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: niche.almostFull ? '#f59e0b' : GREEN,
          transition: 'width .6s ease-out',
        }} />
      </div>
      <span style={{
        flex: '0 0 50px', fontSize: 11, color: 'var(--muted)',
        fontVariantNumeric: 'tabular-nums', textAlign: 'right',
      }}>
        {niche.filled || 0}/{niche.slots || 80}
      </span>
    </div>
  )
}

function NicheCard({ niche }) {
  const pct = Math.min(100, niche.percentFull || 0)
  const meta = NICHES.find(n => n.id === niche.id)
  const emoji = meta?.emoji || ''
  return (
    <motion.div variants={item}
      style={{
        background: 'var(--surface)', border: `1px solid ${niche.almostFull ? '#f59e0b' : 'var(--border)'}`,
        borderRadius: 14, padding: 16,
        opacity: niche.full ? 0.55 : 1,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>{emoji}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{niche.label}</span>
        {niche.almostFull && !niche.full && (
          <span style={{
            marginLeft: 'auto', background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
            border: '1px solid rgba(245,158,11,0.3)', borderRadius: 999, padding: '2px 8px',
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>Casi lleno</span>
        )}
        {niche.full && (
          <span style={{
            marginLeft: 'auto', background: 'rgba(120,120,120,0.12)', color: 'var(--muted)',
            border: '1px solid var(--border)', borderRadius: 999, padding: '2px 8px',
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>Cerrado</span>
        )}
      </div>
      <div style={{
        width: '100%', height: 6, borderRadius: 6,
        background: 'var(--bg2)', overflow: 'hidden', marginBottom: 8,
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: niche.almostFull ? '#f59e0b' : GREEN,
          transition: 'width .6s ease-out',
        }} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
        {niche.filled || 0} / {niche.slots || 80} slots
      </div>
    </motion.div>
  )
}

function RegistrationSuccess({ result }) {
  const [copied, setCopied] = useState(false)
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://channelad.io'
  const refUrl = `${origin}/channel-one?ref=${result.referralToken}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(refUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const twText = encodeURIComponent(`Acabo de reservar mi slot en Channel One — el cohort de pre-registro de @channelad para el lanzamiento en septiembre. 1.000 canales prioritarios, 0% comisión el primer trimestre.\n\nReserva el tuyo:`)
  const twUrl = `https://twitter.com/intent/tweet?text=${twText}&url=${encodeURIComponent(refUrl)}`
  const waUrl = `https://wa.me/?text=${twText}%20${encodeURIComponent(refUrl)}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      style={{
        background: 'var(--surface)', border: `1px solid ${greenAlpha(0.30)}`,
        borderRadius: 18, padding: 'clamp(24px, 3vw, 36px)', textAlign: 'center',
      }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: greenAlpha(0.12), color: GREEN,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 18,
      }}>
        <Mail size={26} strokeWidth={2} />
      </div>
      <h3 style={{ fontFamily: D, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 10px' }}>
        Revisa tu email para confirmar
      </h3>
      <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 480, margin: '0 auto 22px' }}>
        Te hemos enviado un link de confirmación. <strong style={{ color: 'var(--text)' }}>Tu plaza solo cuenta cuando confirmes</strong>.
        Mientras tanto, ya tienes tu link de referidos.
      </p>

      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 18, maxWidth: 520, margin: '0 auto 18px',
      }}>
        <code style={{
          flex: 1, fontSize: 12, color: 'var(--text)',
          fontFamily: 'ui-monospace, monospace', overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap', textAlign: 'left',
        }}>{refUrl}</code>
        <button
          onClick={copy}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: copied ? greenAlpha(0.15) : GREEN, color: copied ? GREEN : '#fff',
            border: 'none', borderRadius: 8, padding: '8px 12px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {copied ? <><CheckCircle2 size={13} strokeWidth={2.4} /> Copiado</> : <><Copy size={13} strokeWidth={2.4} /> Copiar</>}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href={twUrl} target="_blank" rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#000', color: '#fff', textDecoration: 'none',
            borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600,
          }}>
          <Twitter size={14} strokeWidth={2.4} /> Compartir en X
        </a>
        <a href={waUrl} target="_blank" rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: GREEN, color: '#fff', textDecoration: 'none',
            borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600,
          }}>
          <MessageCircle size={14} strokeWidth={2.4} /> WhatsApp
        </a>
      </div>

      <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 18 }}>
        Cada 3 referidos confirmados subes 100 posiciones visibles en la cola.
      </p>
    </motion.div>
  )
}

function Field({ label, required, wide, children }) {
  return (
    <label style={{
      display: 'flex', flexDirection: 'column', gap: 6,
      gridColumn: wide ? '1 / -1' : 'auto',
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
        {label} {required && <span style={{ color: GREEN }}>*</span>}
      </span>
      {children}
    </label>
  )
}

const inputStyle = {
  background: 'var(--bg)', color: 'var(--text)',
  border: '1px solid var(--border)', borderRadius: 10,
  padding: '11px 14px', fontSize: 14, fontFamily: 'inherit',
  outline: 'none', transition: 'border-color .2s, box-shadow .2s',
  width: '100%',
}
