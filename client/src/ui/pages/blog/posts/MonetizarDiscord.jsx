import React from 'react'
import { Link } from 'react-router-dom'

const PURPLE = '#7C3AED'
const GREEN = '#25d366'
const F = "'Inter', system-ui, sans-serif"
const D = "'Sora', system-ui, sans-serif"

const h2Style = { fontFamily: D, fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.3px', marginTop: '48px', marginBottom: '16px', color: 'var(--text)' }
const h3Style = { fontFamily: D, fontSize: '18px', fontWeight: 600, marginTop: '24px', marginBottom: '8px', color: 'var(--text)' }
const pStyle = { fontFamily: F, fontSize: '16px', lineHeight: 1.75, color: 'var(--text)', marginBottom: '16px' }
const liStyle = { fontFamily: F, fontSize: '16px', lineHeight: 1.75, color: 'var(--text)', marginBottom: '8px' }
const linkStyle = { color: PURPLE, textDecoration: 'none', fontWeight: 600 }
const strongStyle = { fontWeight: 600 }
const imgStyle = { width: '100%', height: 'auto', borderRadius: '12px', margin: '32px 0', objectFit: 'cover', maxHeight: '400px' }
const captionStyle = { fontSize: '13px', color: 'var(--muted)', textAlign: 'center', marginTop: '-24px', marginBottom: '28px', fontStyle: 'italic' }
const tableWrapStyle = { width: '100%', overflowX: 'auto', margin: '24px 0', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: '14px' }
const thStyle = { padding: '14px 20px', textAlign: 'left', fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: PURPLE, background: '#f3f0ff', borderBottom: '2px solid #e9d5ff' }
const tdStyle = { padding: '13px 20px', color: 'var(--text)', lineHeight: 1.5, borderBottom: '1px solid #f0f0f5' }
const tdFirstStyle = { ...tdStyle, fontWeight: 500 }

export default function MonetizarDiscord() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0' }}>
      <p style={pStyle}>
        Un servidor de Discord de gaming con 15.000 miembros puede generar ingresos reales. Segun
        datos del mercado, un servidor de este tamano factura en torno a
        420 EUR al mes solo con publicidad y roles premium. Y no es un caso excepcional — los
        administradores de servidores en nichos como fintech y cripto triplican esa cifra.
      </p>
      <p style={pStyle}>
        Discord es la plataforma de comunidades con el engagement mas profundo de las tres grandes
        (Telegram, WhatsApp, Discord). Los miembros de un servidor activo pasan una media de 45 minutos
        al dia dentro. Eso es 10x mas que el tiempo que un suscriptor de Telegram dedica a leer
        mensajes. Para las marcas, eso significa una oportunidad unica de conectar con audiencias
        que realmente prestan atencion.
      </p>

      <img src="https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=720&q=80&auto=format" alt="Servidor de Discord con comunidad activa de gaming" style={imgStyle} loading="lazy" />
      <p style={captionStyle}>Discord ofrece el engagement mas profundo de cualquier plataforma de comunidades — Foto: Unsplash</p>

      <h2 style={h2Style}>Las 5 formas de monetizar un servidor de Discord</h2>

      <h3 style={h3Style}>1. Publicaciones patrocinadas de marcas</h3>
      <p style={pStyle}>
        Una marca te paga por publicar un mensaje en tu canal de anuncios o en un canal destacado.
        Es el modelo mas directo y el que mas ingresos genera a los administradores. El formato ideal: embed de Discord
        con imagen, descripcion y enlace. Los miembros lo ven como contenido relevante, no como spam,
        siempre que la marca encaje con la tematica del servidor.
      </p>

      <h3 style={h3Style}>2. Roles de pago y acceso premium</h3>
      <p style={pStyle}>
        Discord permite crear roles con acceso a canales exclusivos. Puedes cobrar una suscripcion
        mensual (via Patreon, Ko-fi o un bot de suscripcion) por acceso a contenido premium,
        soporte directo, o canales VIP. Un servidor tipico con un rol premium a 5 EUR/mes y
        40-50 suscriptores activos genera unos 200-250 EUR recurrentes sin depender de anunciantes.
      </p>

      <h3 style={h3Style}>3. Eventos patrocinados</h3>
      <p style={pStyle}>
        Torneos, Q&As con expertos, giveaways — los eventos en Discord generan engagement masivo
        y son perfectos para patrocinio. Una marca paga por ser el sponsor del evento, y a cambio
        aparece en el nombre, las reglas y los premios. Los torneos patrocinados generan tipicamente entre
        100 y 300 EUR por evento, dependiendo de la marca y el tamano del torneo.
      </p>

      <h3 style={h3Style}>4. Afiliados y CPA</h3>
      <p style={pStyle}>
        Compartir enlaces de afiliado en canales relevantes. Funciona especialmente bien en
        servidores de gaming (hardware, perifericos), tech (software, herramientas) y finanzas
        (brokers, plataformas de inversion). Los ingresos son variables pero complementan bien.
      </p>

      <h3 style={h3Style}>5. Discord-as-a-service para marcas</h3>
      <p style={pStyle}>
        Algunas marcas quieren tener presencia en Discord pero no saben como gestionar una comunidad.
        Puedes ofrecerte como community manager externo: creas y gestionas el servidor de la marca
        a cambio de un fee mensual. Los fees van de 500 a 2.000 EUR/mes dependiendo del tamano
        y la dedicacion requerida.
      </p>

      <h2 style={h2Style}>Requisitos minimos para monetizar en Discord</h2>
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Criterio</th>
              <th style={thStyle}>Minimo viable</th>
              <th style={thStyle}>Optimo</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdFirstStyle}>Miembros totales</td><td style={tdStyle}>500</td><td style={tdStyle}>2.000+</td></tr>
            <tr><td style={tdFirstStyle}>Miembros activos diarios</td><td style={tdStyle}>50</td><td style={tdStyle}>200+</td></tr>
            <tr><td style={tdFirstStyle}>Mensajes/dia</td><td style={tdStyle}>100</td><td style={tdStyle}>500+</td></tr>
            <tr><td style={tdFirstStyle}>Nicho definido</td><td style={tdStyle}>Si</td><td style={tdStyle}>Si</td></tr>
            <tr><td style={tdFirstStyle}>Canales organizados</td><td style={tdStyle}>Basico</td><td style={tdStyle}>Profesional con categorias</td></tr>
          </tbody>
        </table>
      </div>

      <h2 style={h2Style}>Cuanto se puede ganar con un servidor de Discord</h2>
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Miembros activos</th>
              <th style={thStyle}>Publicidad/mes</th>
              <th style={thStyle}>Roles premium</th>
              <th style={thStyle}>Total estimado</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdFirstStyle}>500 - 2.000</td><td style={tdStyle}>30 - 100 EUR</td><td style={tdStyle}>25 - 75 EUR</td><td style={tdStyle}>55 - 175 EUR</td></tr>
            <tr><td style={tdFirstStyle}>2.000 - 5.000</td><td style={tdStyle}>100 - 250 EUR</td><td style={tdStyle}>75 - 200 EUR</td><td style={tdStyle}>175 - 450 EUR</td></tr>
            <tr><td style={tdFirstStyle}>5.000 - 15.000</td><td style={tdStyle}>250 - 600 EUR</td><td style={tdStyle}>150 - 400 EUR</td><td style={tdStyle}>400 - 1.000 EUR</td></tr>
            <tr><td style={tdFirstStyle}>15.000 - 50.000</td><td style={tdStyle}>600 - 1.500 EUR</td><td style={tdStyle}>300 - 800 EUR</td><td style={tdStyle}>900 - 2.300 EUR</td></tr>
          </tbody>
        </table>
      </div>

      <h2 style={h2Style}>Ejemplo representativo: servidor de gaming con 15.000 miembros</h2>
      <p style={pStyle}>
        Un servidor tipico centrado en un juego competitivo con una comunidad hispanohablante activa.
        Estos son numeros representativos basados en datos del mercado:
      </p>
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Fuente de ingresos</th>
              <th style={thStyle}>Media mensual</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdFirstStyle}>Posts patrocinados (3-4/mes)</td><td style={tdStyle}>180 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Roles premium (45 suscriptores x 5 EUR)</td><td style={tdStyle}>225 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Torneo patrocinado (1 cada 2 meses)</td><td style={tdStyle}>~75 EUR/mes promedio</td></tr>
            <tr><td style={tdFirstStyle}>Afiliados (hardware gaming)</td><td style={tdStyle}>~40 EUR</td></tr>
            <tr><td style={tdFirstStyle}><span style={strongStyle}>Total</span></td><td style={tdStyle}><span style={strongStyle}>~520 EUR/mes</span></td></tr>
          </tbody>
        </table>
      </div>

      <p style={pStyle}>
        La clave es profesionalizar la gestion: canales bien organizados, reglas claras de publicidad
        (maximo 2 posts patrocinados por semana), y registrar el servidor en{' '}
        <Link to="/para-canales" style={linkStyle}>Channelad</Link> para recibir propuestas con pago
        garantizado. Sin un marketplace con escrow, los administradores se exponen a impagos y
        negociaciones interminables por DM.
      </p>

      <p style={pStyle}>
        Para la guia completa de publicidad en Discord desde la perspectiva del anunciante, lee{' '}
        <Link to="/blog/publicidad-en-discord-guia-completa" style={linkStyle}>la guia de publicidad en Discord</Link>.
      </p>

      <div style={{ marginTop: '48px', padding: '32px', background: `${GREEN}10`, borderRadius: '16px', textAlign: 'center', border: `1px solid ${GREEN}30` }}>
        <h2 style={{ fontFamily: D, fontSize: '22px', fontWeight: 700, marginBottom: '10px', color: 'var(--text)' }}>
          Registra tu servidor de Discord
        </h2>
        <p style={{ ...pStyle, color: 'var(--muted)', marginBottom: '20px', maxWidth: '520px', margin: '0 auto 20px' }}>
          Channelad conecta tu servidor con anunciantes verificados. Metricas auditadas, pago por
          escrow, sin perseguir pagos.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/para-canales" style={{ display: 'inline-block', background: GREEN, color: '#fff', padding: '12px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: 600, fontFamily: F, textDecoration: 'none' }}>Registrar mi servidor</Link>
          <Link to="/para-anunciantes" style={{ display: 'inline-block', background: 'transparent', color: PURPLE, padding: '12px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: 600, fontFamily: F, textDecoration: 'none', border: `1.5px solid ${PURPLE}` }}>Soy anunciante</Link>
        </div>
      </div>
    </div>
  )
}
