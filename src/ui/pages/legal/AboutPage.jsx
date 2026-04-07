import React from 'react'
import { Link } from 'react-router-dom'
import SEO from '../../components/SEO'
import CrossLinks from '../../components/landing/CrossLinks'
import { PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY } from '../../theme/tokens'

export default function AboutPage() {
  const seo = <SEO title="Sobre nosotros" description="Channelad es el marketplace de publicidad en comunidades de WhatsApp, Telegram y Discord. Hecho en Espana. Transparencia, confianza y pagos custodiados." path="/sobre-nosotros" />
  const stats = [
    { value: '12.4K', label: 'Canales verificados' },
    { value: '340K+', label: 'Anunciantes activos' },
    { value: '€2.8M', label: 'Transacciones procesadas' },
    { value: '98.7%', label: 'Satisfaccion del cliente' },
  ]

  const values = [
    { icon: '🤝', title: 'Transparencia', desc: 'Metricas verificables y pago custodiado en cada transaccion. Sin costes ocultos.' },
    { icon: '🔒', title: 'Confianza', desc: 'Sistema de disputas imparcial y verificacion de canales para proteger a ambas partes.' },
    { icon: '⚡', title: 'Eficiencia', desc: 'Automatizacion inteligente que reduce el tiempo de gestion de campanas un 80%.' },
    { icon: '🌍', title: 'Comunidad', desc: 'Construimos puentes entre marcas y comunidades reales en toda Europa.' },
  ]

  return (
    <div style={{ fontFamily: FONT_BODY }}>
      {seo}
      {/* Hero */}
      <section style={{ padding: '80px 24px 60px', textAlign: 'center', maxWidth: '760px', margin: '0 auto' }}>
        <Link to="/" style={{ fontSize: '13px', color: PURPLE, textDecoration: 'none', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '32px' }}>
          ← Volver al inicio
        </Link>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '36px', fontWeight: 800, color: 'var(--text)', marginBottom: '16px', letterSpacing: '-0.5px' }}>
          Sobre Ad<span style={{ color: PURPLE }}>flow</span>
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--muted)', lineHeight: 1.8, maxWidth: '560px', margin: '0 auto' }}>
          Somos el marketplace de publicidad en canales privados mas avanzado de Europa. Conectamos marcas con audiencias reales en WhatsApp, Telegram, Discord y mas.
        </p>
      </section>

      {/* Stats */}
      <section style={{ padding: '0 24px 60px', maxWidth: '760px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {stats.map(s => (
            <div key={s.label} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '14px', padding: '24px 16px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: '24px', fontWeight: 800, color: PURPLE, marginBottom: '4px' }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section style={{ padding: '40px 24px 60px', maxWidth: '760px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '24px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>
          Nuestra mision
        </h2>
        <p style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: 1.8, marginBottom: '24px' }}>
          Democratizar la publicidad digital dando acceso a marcas de todos los tamanos a audiencias comprometidas en canales de comunicacion privados. Creemos que las comunidades reales generan resultados reales.
        </p>
        <p style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: 1.8 }}>
          Adflow nacio para resolver un problema claro: los creadores de canales de WhatsApp, Telegram y Discord no tenian una forma segura y profesional de monetizar sus audiencias, y los anunciantes no tenian acceso a estos canales de alto engagement.
        </p>
      </section>

      {/* Values */}
      <section style={{ padding: '40px 24px 80px', maxWidth: '760px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '24px', fontWeight: 700, color: 'var(--text)', marginBottom: '24px' }}>
          Nuestros valores
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {values.map(v => (
            <div key={v.title} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '14px', padding: '24px',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>{v.icon}</div>
              <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>{v.title}</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.7 }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: '48px 24px', textAlign: 'center',
        background: `linear-gradient(135deg, ${purpleAlpha(0.08)} 0%, transparent 100%)`,
        borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
        marginBottom: '40px',
      }}>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '22px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>
          Unete a Adflow hoy
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '24px' }}>
          Comienza a conectar con audiencias reales o monetiza tu comunidad.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link to="/auth/register" style={{
            background: PURPLE, color: '#fff', borderRadius: '10px',
            padding: '12px 28px', fontSize: '14px', fontWeight: 700,
            textDecoration: 'none', fontFamily: FONT_BODY,
          }}>
            Crear cuenta gratis
          </Link>
          <Link to="/marketplace" style={{
            background: 'var(--surface)', color: 'var(--text)',
            border: '1px solid var(--border)', borderRadius: '10px',
            padding: '12px 28px', fontSize: '14px', fontWeight: 600,
            textDecoration: 'none', fontFamily: FONT_BODY,
          }}>
            Explorar canales
          </Link>
        </div>
      </section>

      <CrossLinks exclude="/sobre-nosotros" />
    </div>
  )
}
