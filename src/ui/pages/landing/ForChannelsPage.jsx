import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import SEO from '../../components/SEO'
import CrossLinks from '../../components/landing/CrossLinks'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { PURPLE as A, PURPLE_DARK as AD, purpleAlpha as AG, FONT_BODY, FONT_DISPLAY, MAX_W } from '../../theme/tokens'

const F = FONT_BODY
const D = FONT_DISPLAY
const GREEN = '#25d366'
const GREEN_DARK = '#1ea952'
const greenAlpha = (o) => `rgba(37,211,102,${o})`

/* ─── ANIMATION VARIANTS ─────────────────────────────────── */
const fadeUp = { hidden: { opacity: 0, y: 40 }, visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] } }) }
const staggerContainer = { hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } } }
const staggerItem = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } } }
const scaleIn = { hidden: { opacity: 0, scale: 0.92 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } } }

function Section({ children, style, id }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.section ref={ref} id={id} style={style} initial="hidden" animate={isInView ? 'visible' : 'hidden'} variants={staggerContainer}>
      {children}
    </motion.section>
  )
}

/* ─── DATA ───────────────────────────────────────────────── */
const PLATFORMS_SUPPORTED = [
  { name: 'WhatsApp', color: '#25d366' },
  { name: 'Telegram', color: '#2aabee' },
  { name: 'Discord', color: '#5865f2' },
  { name: 'Instagram', color: '#e1306c' },
  { name: 'Facebook', color: '#1877f2' },
  { name: 'Newsletter', color: '#f59e0b' },
]

const BENEFITS = [
  { icon: '🔒', title: 'Pagos protegidos', desc: 'Los fondos quedan en escrow hasta que publiques. Si cumples, cobras automaticamente. Sin perseguir pagos.' },
  { icon: '💰', title: 'Tu pones el precio', desc: 'Define cuanto cobras por publicacion, por dia o por formato. Sin tarifas impuestas ni limites.' },
  { icon: '📊', title: 'Dashboard completo', desc: 'Controla clicks, alcance, ingresos y rendimiento de cada campana en tiempo real desde tu panel.' },
  { icon: '🔓', title: 'Sin exclusividad', desc: 'Publica en las plataformas que quieras. Channelad no te bloquea, no te limita, no te pide permanencia.' },
  { icon: '⚡', title: 'Verificacion rapida', desc: 'Verificamos tu canal en minutos con un tracking link automatico. Sin papeleos ni procesos largos.' },
  { icon: '🎯', title: 'Anunciantes de calidad', desc: 'Solo trabajamos con anunciantes verificados que respetan tu comunidad y pagan a tiempo.' },
]

const STEPS = [
  { n: '01', icon: '📱', title: 'Registra tu canal', desc: 'Agrega tu canal de WhatsApp, Telegram, Discord, Instagram, Facebook o Newsletter. Verificacion automatica en minutos.' },
  { n: '02', icon: '📩', title: 'Recibe propuestas', desc: 'Los anunciantes te encuentran en el marketplace y te envian propuestas con precio, contenido y plazo. Tu decides si aceptas.' },
  { n: '03', icon: '💸', title: 'Cobra seguro', desc: 'Publica el anuncio, marca como completado y cobra automaticamente. El dinero llega a tu balance sin intermediarios.' },
]

const FAQS = [
  { q: 'Es gratis registrarse?', a: 'Si, completamente gratis. Solo cobramos una comision del 10% cuando completas una campana pagada. Sin costes fijos ni suscripciones.' },
  { q: 'Que plataformas puedo registrar?', a: 'WhatsApp, Telegram, Discord, Instagram, Facebook y Newsletter. Cada plataforma tiene su propio proceso de verificacion automatizado.' },
  { q: 'Como funciona la verificacion?', a: 'Publicamos un tracking link en tu canal. Cuando alcanza un minimo de clicks unicos, tu canal queda verificado automaticamente. El proceso tarda minutos.' },
  { q: 'Cuando puedo retirar mi dinero?', a: 'Cuando una campana se marca como completada, el dinero pasa a tu balance. Puedes retirarlo a tu banco o PayPal desde el dashboard en cualquier momento.' },
  { q: 'Hay minimo de seguidores?', a: 'No hay minimo. Canales de cualquier tamano pueden registrarse. Los anunciantes eligen segun su presupuesto, nicho y objetivos.' },
  { q: 'Puedo rechazar campanas?', a: 'Absolutamente. Tu decides que publicar y que no. Si una propuesta no encaja con tu comunidad, la rechazas sin penalizacion.' },
]

/* ─── INCOME CALCULATOR ──────────────────────────────────── */
function IncomeCalculator() {
  const [members, setMembers] = useState(5000)
  const [postsPerMonth, setPostsPerMonth] = useState(4)
  const pricePerPost = Math.round(Math.max(30, Math.min(800, members * 0.08)))
  const monthlyIncome = pricePerPost * postsPerMonth
  const yearlyIncome = monthlyIncome * 12
  const advertiserPays = Math.round(pricePerPost * 1.20)

  return (
    <motion.div variants={scaleIn} style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '24px', padding: '40px', maxWidth: '700px', margin: '0 auto',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '180px', height: '180px', borderRadius: '50%', background: greenAlpha(0.04), pointerEvents: 'none' }} />
      <h3 style={{ fontFamily: D, fontSize: '22px', fontWeight: 700, color: 'var(--text)', marginBottom: '28px', textAlign: 'center' }}>
        Calcula tus ingresos potenciales
      </h3>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <label style={{ fontSize: '14px', color: 'var(--muted)', fontFamily: F }}>Miembros en tu canal</label>
          <span style={{ fontSize: '16px', fontWeight: 700, color: GREEN, fontFamily: D }}>{members.toLocaleString()}</span>
        </div>
        <input type="range" min="500" max="100000" step="500" value={members} onChange={e => setMembers(Number(e.target.value))}
          style={{ width: '100%', accentColor: GREEN, height: '6px', cursor: 'pointer' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted2)', marginTop: '4px' }}><span>500</span><span>100.000</span></div>
      </div>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <label style={{ fontSize: '14px', color: 'var(--muted)', fontFamily: F }}>Publicaciones al mes</label>
          <span style={{ fontSize: '16px', fontWeight: 700, color: GREEN, fontFamily: D }}>{postsPerMonth}</span>
        </div>
        <input type="range" min="1" max="30" step="1" value={postsPerMonth} onChange={e => setPostsPerMonth(Number(e.target.value))}
          style={{ width: '100%', accentColor: GREEN, height: '6px', cursor: 'pointer' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted2)', marginTop: '4px' }}><span>1</span><span>30</span></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: greenAlpha(0.06), borderRadius: '16px', padding: '24px', border: `1px solid ${greenAlpha(0.12)}` }}>
        {[
          { label: 'Tu cobras/post', val: `€${pricePerPost}`, color: GREEN },
          { label: 'El anunciante paga', val: `€${advertiserPays}`, color: 'var(--muted)' },
          { label: 'Tu ingreso mensual', val: `€${monthlyIncome.toLocaleString()}`, color: GREEN },
          { label: 'Tu ingreso anual', val: `€${yearlyIncome.toLocaleString()}`, color: 'var(--text)' },
        ].map(m => (
          <div key={m.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>{m.label}</div>
            <div style={{ fontFamily: D, fontSize: '26px', fontWeight: 700, color: m.color }}>{m.val}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: '11px', color: 'var(--muted2)', textAlign: 'center', marginTop: '14px' }}>* Tu cobras el 100% de tu precio. Channelad cobra una comision del 20% al anunciante.</p>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function ForChannelsPage() {
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div style={{ fontFamily: F, color: 'var(--text)', background: 'var(--bg)' }}>
      <SEO
        title="Monetiza tu canal de WhatsApp, Telegram o Discord"
        description="Registra tu canal gratis y empieza a ganar dinero con publicidad. Sin minimo de seguidores. Pagos protegidos y solo 10% de comision por campana completada."
        path="/para-canales"
      />

      {/* ══════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════ */}
      <section style={{
        padding: '120px 48px 100px', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
        minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Animated orbs - green themed */}
        <div style={{
          position: 'absolute', width: '600px', height: '400px',
          borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%',
          background: `radial-gradient(ellipse, ${greenAlpha(0.15)} 0%, transparent 70%)`,
          top: '-15%', left: '20%', filter: 'blur(60px)', pointerEvents: 'none',
          animation: 'orbFloat1 12s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: '400px', height: '350px',
          borderRadius: '60% 40% 30% 70% / 50% 60% 40% 50%',
          background: `radial-gradient(ellipse, ${AG(0.1)} 0%, transparent 65%)`,
          top: '10%', right: '10%', filter: 'blur(70px)', pointerEvents: 'none',
          animation: 'orbFloat2 15s ease-in-out infinite',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: greenAlpha(0.1), border: `1px solid ${greenAlpha(0.2)}`,
              borderRadius: '99px', padding: '5px 16px', marginBottom: '28px',
              fontSize: '12px', fontWeight: 600, color: GREEN,
            }}
          >
            💰 Para creadores de comunidades
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            style={{
              fontFamily: D, fontSize: 'clamp(40px, 5.5vw, 64px)', fontWeight: 700,
              letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: '24px',
            }}
          >
            Monetiza tu{' '}
            <span style={{
              background: `linear-gradient(135deg, #34d399 0%, #25d366 40%, #10b981 100%)`,
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'shimmer 4s linear infinite',
            }}>comunidad</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            style={{ fontSize: '18px', color: 'var(--muted)', lineHeight: 1.7, maxWidth: '540px', margin: '0 auto 40px' }}
          >
            Conecta con anunciantes verificados que pagan por publicar en tu canal. Cobro protegido, metricas en tiempo real y total libertad.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
            style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '48px' }}
          >
            <Link to="/auth/register" className="btn-glow" style={{
              background: GREEN, color: '#fff', textDecoration: 'none',
              borderRadius: '12px', padding: '14px 32px',
              fontSize: '15px', fontWeight: 600,
              boxShadow: `0 0 24px ${greenAlpha(0.3)}`,
              transition: 'all .25s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = GREEN_DARK; e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'; e.currentTarget.style.boxShadow = `0 0 40px ${greenAlpha(0.45)}` }}
              onMouseLeave={e => { e.currentTarget.style.background = GREEN; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 0 24px ${greenAlpha(0.3)}` }}
            >Registra tu canal gratis</Link>
            <Link to="/marketplace" style={{
              background: greenAlpha(0.08), color: GREEN, textDecoration: 'none',
              borderRadius: '12px', padding: '14px 28px',
              fontSize: '15px', fontWeight: 600,
              border: `1px solid ${greenAlpha(0.2)}`,
              transition: 'all .2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = greenAlpha(0.15); e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = greenAlpha(0.08); e.currentTarget.style.transform = 'none' }}
            >Ver marketplace</Link>
          </motion.div>

          {/* Platform badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}
          >
            {PLATFORMS_SUPPORTED.map((p, i) => (
              <motion.div key={p.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.85 + i * 0.06 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '99px',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  fontSize: '12px', color: 'var(--muted)', fontWeight: 500,
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, boxShadow: `0 0 6px ${p.color}40` }} />
                {p.name}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── METRICS ──────────────────────────────────────── */}
      <Section style={{ padding: '48px 48px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {[
              { label: 'Canales registrados', value: '2.400+' },
              { label: 'Campanas completadas', value: '8.900+' },
              { label: 'Pagado a creadores', value: '€1.2M+' },
              { label: 'Plataformas soportadas', value: '6' },
            ].map((m, i) => (
              <motion.div key={m.label} variants={staggerItem} whileHover={{ scale: 1.03, y: -4 }} style={{
                textAlign: 'center', padding: '24px',
                background: 'var(--surface)', borderRadius: '16px',
                border: '1px solid var(--border)', transition: 'box-shadow .3s',
              }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.25)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ fontFamily: D, fontSize: '30px', fontWeight: 700, color: GREEN, marginBottom: '4px' }}>{m.value}</div>
                <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{m.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── BENEFITS ─────────────────────────────────────── */}
      <Section style={{ padding: '110px 48px', background: 'var(--bg2)' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Ventajas</p>
            <h2 style={{ fontFamily: D, fontSize: 'clamp(26px, 3vw, 36px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text)' }}>
              Por que publicar con <span style={{ color: GREEN }}>Channelad</span>
            </h2>
          </motion.div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {BENEFITS.map((b, i) => (
              <motion.div key={b.title} variants={staggerItem}
                whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.25 } }}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: '18px', padding: '32px', transition: 'box-shadow .3s, border-color .3s',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 20px 48px rgba(0,0,0,0.3)`; e.currentTarget.style.borderColor = greenAlpha(0.2) }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <motion.div whileHover={{ rotate: [0, -8, 8, 0], transition: { duration: 0.4 } }}
                  style={{ fontSize: '32px', marginBottom: '16px', width: '56px', height: '56px', borderRadius: '14px', background: greenAlpha(0.08), border: `1px solid ${greenAlpha(0.15)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >{b.icon}</motion.div>
                <h3 style={{ fontFamily: D, fontSize: '17px', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>{b.title}</h3>
                <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── INCOME CALCULATOR ────────────────────────────── */}
      <Section style={{ padding: '110px 48px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: '48px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Simulador</p>
            <h2 style={{ fontFamily: D, fontSize: 'clamp(26px, 3vw, 36px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text)' }}>Cuanto puedes ganar?</h2>
          </motion.div>
          <IncomeCalculator />
        </div>
      </Section>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <Section style={{ padding: '110px 48px', background: 'var(--bg2)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Proceso</p>
            <h2 style={{ fontFamily: D, fontSize: 'clamp(26px, 3vw, 36px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text)' }}>Como funciona</h2>
          </motion.div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {STEPS.map((s, i) => (
              <motion.div key={s.n} variants={staggerItem}
                whileHover={{ x: 8, transition: { duration: 0.2 } }}
                style={{
                  display: 'flex', gap: '20px', alignItems: 'flex-start',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: '18px', padding: '28px',
                  transition: 'box-shadow .3s, border-color .3s',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.25)'; e.currentTarget.style.borderColor = greenAlpha(0.2) }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <div style={{
                  width: '56px', height: '56px', borderRadius: '16px', flexShrink: 0,
                  background: i === 0 ? greenAlpha(0.1) : 'var(--bg2)',
                  border: `1px solid ${i === 0 ? greenAlpha(0.2) : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '24px',
                }}>{s.icon}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontFamily: D, fontSize: '11px', fontWeight: 700, color: GREEN, opacity: 0.6 }}>{s.n}</span>
                    <h3 style={{ fontFamily: D, fontSize: '17px', fontWeight: 600, color: 'var(--text)' }}>{s.title}</h3>
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── FAQ ───────────────────────────────────────────── */}
      <Section style={{ padding: '110px 48px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: '48px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>FAQ</p>
            <h2 style={{ fontFamily: D, fontSize: 'clamp(26px, 3vw, 36px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text)' }}>Preguntas frecuentes</h2>
          </motion.div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {FAQS.map((faq, i) => (
              <motion.div key={i} variants={staggerItem} style={{
                background: 'var(--surface)', border: `1px solid ${openFaq === i ? greenAlpha(0.2) : 'var(--border)'}`,
                borderRadius: '14px', overflow: 'hidden', transition: 'border-color .2s',
              }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '20px 24px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}>
                  <span style={{ fontSize: '15px', fontWeight: 500, color: openFaq === i ? GREEN : 'var(--text)', fontFamily: F }}>{faq.q}</span>
                  <motion.svg animate={{ rotate: openFaq === i ? 45 : 0 }} transition={{ duration: 0.3 }}
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ color: openFaq === i ? GREEN : 'var(--muted)', flexShrink: 0, marginLeft: '16px' }}>
                    <path d="M12 5v14M5 12h14"/>
                  </motion.svg>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }} style={{ overflow: 'hidden' }}>
                      <div style={{ padding: '0 24px 20px' }}>
                        <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.7 }}>{faq.a}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── CTA BANNER ───────────────────────────────────── */}
      <Section style={{ padding: '0 48px 110px', background: 'var(--bg)' }}>
        <motion.div variants={scaleIn} style={{
          maxWidth: MAX_W, margin: '0 auto',
          background: `linear-gradient(135deg, #052e16 0%, #064e3b 50%, #052e16 100%)`,
          border: `1px solid ${greenAlpha(0.15)}`,
          borderRadius: '24px', padding: '64px 56px', textAlign: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div className="dot-pattern" style={{ position: 'absolute', inset: 0, opacity: 0.25, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '36px', marginBottom: '16px' }}>🚀</div>
            <h2 style={{ fontFamily: D, fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '12px', letterSpacing: '-0.02em' }}>
              Empieza a ganar hoy
            </h2>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: '440px', margin: '0 auto 32px' }}>
              Registra tu canal en minutos, recibe propuestas de anunciantes y cobra de forma segura. Sin costes ni compromisos.
            </p>
            <Link to="/auth/register" style={{
              display: 'inline-block', background: GREEN, color: '#fff',
              padding: '14px 36px', borderRadius: '12px',
              fontWeight: 600, fontSize: '15px', textDecoration: 'none',
              boxShadow: `0 0 30px ${greenAlpha(0.35)}`,
              transition: 'all .2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = GREEN_DARK; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = GREEN; e.currentTarget.style.transform = 'none' }}
            >Crear cuenta gratis</Link>
          </div>
        </motion.div>
      </Section>

      <CrossLinks exclude="/para-canales" />
    </div>
  )
}
