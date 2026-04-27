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

export default function PublicidadComunidades() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0' }}>
      <p style={pStyle}>
        Cada vez mas marcas estan moviendo parte de sus presupuestos publicitarios a comunidades de Telegram,
        WhatsApp y Discord. No es que las plataformas tradicionales como Meta Ads y Google Ads hayan
        dejado de funcionar, sino porque segun datos del mercado, el coste por
        conversion real en comunidades es consistentemente un 40-60% menor.
      </p>
      <p style={pStyle}>
        Esta guia es para el responsable de marketing que quiere entender como funciona este canal,
        cuanto cuesta empezar, y como medir resultados. Sin teoria vacia — solo lo que funciona
        en la practica.
      </p>

      <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=720&q=80&auto=format" alt="Equipo de marketing planificando estrategia de publicidad en comunidades" style={imgStyle} loading="lazy" />
      <p style={captionStyle}>El marketing en comunidades es el canal con mejor relacion coste-conversion en 2026 — Foto: Unsplash</p>

      <h2 style={h2Style}>Que es el marketing en comunidades y por que esta creciendo</h2>
      <p style={pStyle}>
        El marketing en comunidades consiste en anunciar tu marca dentro de grupos, canales y
        servidores de plataformas de mensajeria donde audiencias especificas se reunen voluntariamente.
        A diferencia de los anuncios en redes sociales (donde interrumpes el scroll), aqui tu mensaje
        llega a personas que eligieron estar en ese espacio porque les interesa el tema.
      </p>
      <p style={pStyle}>
        Los datos de 2026 son claros: el engagement medio en comunidades de Telegram es del 30-50%,
        en WhatsApp del 75-90%, y en Discord los miembros activos pasan 45 minutos diarios en el
        servidor. Comparado con el 1-3% de engagement en posts organicos de Instagram, la diferencia
        es abismal.
      </p>

      <h2 style={h2Style}>Ventajas frente a la publicidad en redes sociales</h2>
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Criterio</th>
              <th style={thStyle}>Comunidades</th>
              <th style={thStyle}>Redes sociales (Meta/TikTok)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdFirstStyle}>Engagement medio</td><td style={tdStyle}>30-90%</td><td style={tdStyle}>1-5%</td></tr>
            <tr><td style={tdFirstStyle}>Confianza del usuario</td><td style={tdStyle}>Alta (recomendacion del admin)</td><td style={tdStyle}>Baja (anuncio interrumptivo)</td></tr>
            <tr><td style={tdFirstStyle}>CPM efectivo</td><td style={tdStyle}>3-12 EUR</td><td style={tdStyle}>8-25 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Segmentacion</td><td style={tdStyle}>Por nicho (muy precisa)</td><td style={tdStyle}>Algoritmica (variable)</td></tr>
            <tr><td style={tdFirstStyle}>Ad blockers</td><td style={tdStyle}>No aplica</td><td style={tdStyle}>30%+ de usuarios</td></tr>
            <tr><td style={tdFirstStyle}>Formato del anuncio</td><td style={tdStyle}>Nativo (mensaje)</td><td style={tdStyle}>Banner/video (intrusivo)</td></tr>
          </tbody>
        </table>
      </div>

      <h2 style={h2Style}>Los 3 ecosistemas de comunidades</h2>

      <h3 style={h3Style}>Telegram</h3>
      <p style={pStyle}>
        El ecosistema mas maduro para publicidad en comunidades. Canales unidireccionales con
        audiencias de nicho. Mejor CPM en finanzas, cripto y tecnologia. Marketplaces consolidados.
        <Link to="/blog/monetizar-canal-telegram-espana" style={linkStyle}> Guia completa de Telegram →</Link>
      </p>

      <h3 style={h3Style}>WhatsApp</h3>
      <p style={pStyle}>
        El mayor alcance y las mejores tasas de apertura (80%+). Mercado publicitario emergente
        con oportunidad de first-mover. Ideal para marcas de consumo masivo.
        <Link to="/blog/como-monetizar-canal-whatsapp" style={linkStyle}> Guia completa de WhatsApp →</Link>
      </p>

      <h3 style={h3Style}>Discord</h3>
      <p style={pStyle}>
        El engagement mas profundo. Los miembros pasan 45 minutos/dia en servidores activos.
        Insustituible para gaming, cripto, tech y audiencias Gen Z.
        <Link to="/blog/como-monetizar-servidor-discord" style={linkStyle}> Guia completa de Discord →</Link>
      </p>

      <h2 style={h2Style}>Como definir tu estrategia antes de invertir</h2>
      <ol style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Define el objetivo de campana.</span> Brand awareness, trafico web, leads o conversiones directas. Cada objetivo requiere un enfoque diferente.</li>
        <li style={liStyle}><span style={strongStyle}>Selecciona la plataforma.</span> Marca de consumo masivo → WhatsApp. B2B/tech → Telegram. Gaming/Gen Z → Discord. Si tienes presupuesto, combina las tres.</li>
        <li style={liStyle}><span style={strongStyle}>Elige el tipo de canal/servidor.</span> Busca canales cuyo nicho coincida con tu publico objetivo. Un canal de finanzas para un broker, un servidor de gaming para una marca de perifericos.</li>
        <li style={liStyle}><span style={strongStyle}>Define presupuesto y timeline.</span> Una campana minima viable cuesta 200-500 EUR (3-5 publicaciones en diferentes canales). Para resultados estadisticamente significativos, planifica al menos 1.000 EUR en 4-6 semanas.</li>
      </ol>

      <h2 style={h2Style}>Cuanto presupuesto necesitas para empezar</h2>
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Nivel</th>
              <th style={thStyle}>Presupuesto mensual</th>
              <th style={thStyle}>Que puedes hacer</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdFirstStyle}>Test</td><td style={tdStyle}>200 - 500 EUR</td><td style={tdStyle}>3-5 posts en canales medianos, validar el canal</td></tr>
            <tr><td style={tdFirstStyle}>Growth</td><td style={tdStyle}>500 - 2.000 EUR</td><td style={tdStyle}>10-15 posts en multiples canales, A/B testing de creativos</td></tr>
            <tr><td style={tdFirstStyle}>Scale</td><td style={tdStyle}>2.000 - 10.000 EUR</td><td style={tdStyle}>Campanas en las 3 plataformas, paquetes mensuales con canales top</td></tr>
          </tbody>
        </table>
      </div>

      <h2 style={h2Style}>Como medir el ROI de una campana en comunidades</h2>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Enlaces con UTM.</span> Obligatorio. Cada post patrocinado debe tener su propio enlace con parametros UTM para trackear origen, medio y campana en tu analytics.</li>
        <li style={liStyle}><span style={strongStyle}>Landing page dedicada.</span> Crea una landing especifica para la campana en comunidades. Asi puedes medir conversion sin ruido de otros canales.</li>
        <li style={liStyle}><span style={strongStyle}>Codigo de descuento unico.</span> Si vendes producto, asigna un codigo exclusivo para cada canal. Medicion directa de ventas.</li>
        <li style={liStyle}><span style={strongStyle}>Compara CPA (Coste Por Adquisicion).</span> Divide el coste total de la campana entre el numero de conversiones. Compara con tu CPA en Meta Ads o Google Ads.</li>
      </ul>

      <h2 style={h2Style}>Por que usar Channelad en lugar de ir directamente</h2>
      <p style={pStyle}>
        Puedes contactar administradores de canales directamente, pero te vas a encontrar con estos
        problemas: metricas no verificadas (te pueden inflar numeros), riesgo de impago (publicas
        y no cobras, o pagas y no publican), negociacion manual (consume horas) y falta de
        estandarizacion (cada admin tiene su formato y condiciones).
      </p>
      <p style={pStyle}>
        <Link to="/marketplace" style={linkStyle}>Channelad</Link> resuelve todo esto: metricas de
        canal auditadas automaticamente, pago protegido por escrow (el dinero se libera solo cuando
        el post se publica correctamente), catalogo centralizado de canales en Telegram, WhatsApp y
        Discord, y soporte en espanol. Para marcas que quieren escalar, es la diferencia entre
        gestionar manualmente 20 relaciones con admins o lanzar una campana en 10 minutos.
      </p>

      <img src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=720&q=80&auto=format" alt="Equipo digital gestionando campanas publicitarias" style={imgStyle} loading="lazy" />
      <p style={captionStyle}>Escalar campanas en comunidades requiere herramientas profesionales — Foto: Unsplash</p>

      <p style={pStyle}>
        Para decidir en que plataforma invertir, lee la{' '}
        <Link to="/blog/telegram-vs-whatsapp-vs-discord-publicidad" style={linkStyle}>comparativa Telegram vs WhatsApp vs Discord</Link>.
      </p>

      <h2 style={h2Style}>Preguntas frecuentes</h2>

      <h3 style={h3Style}>Cuanto cuesta anunciarse en comunidades online?</h3>
      <p style={pStyle}>
        Una campana minima viable cuesta 200-500 EUR (3-5 posts en diferentes canales). Para resultados
        estadisticamente significativos, planifica al menos 1.000 EUR en 4-6 semanas. A partir de 2.000 EUR/mes
        puedes lanzar campanas en las 3 plataformas con paquetes mensuales en canales top.
      </p>

      <h3 style={h3Style}>Como medir el ROI de publicidad en comunidades?</h3>
      <p style={pStyle}>
        Usa enlaces con UTM para trackear cada campana, crea landing pages dedicadas, asigna codigos de
        descuento unicos por canal, y compara el CPA (coste por adquisicion) con tus canales habituales
        (Meta Ads, Google Ads). El CPA en comunidades suele ser 30-50% menor.
      </p>

      <h3 style={h3Style}>Que plataforma de comunidades elegir para mi marca?</h3>
      <p style={pStyle}>
        Marca de consumo masivo (FMCG, moda, beauty): WhatsApp por su alcance y tasa de apertura. B2B/tech/finanzas:
        Telegram por sus marketplaces consolidados y CPM premium. Gaming/Gen Z: Discord por su engagement profundo.
        Si tienes presupuesto, combina las tres con una <Link to="/blog/telegram-vs-whatsapp-vs-discord-publicidad" style={linkStyle}>estrategia multi-plataforma</Link>.
      </p>

      <h3 style={h3Style}>Por que el CPM en comunidades es mas bajo que en Meta Ads?</h3>
      <p style={pStyle}>
        El CPM efectivo en comunidades (3-12 EUR) es menor que en Meta Ads (8-25 EUR) porque el inventario
        publicitario en comunidades aun esta inmaduro y la competencia de anunciantes es menor. La diferencia
        clave: el engagement real es 10-30x superior, asi que el CPA termina siendo aun mas favorable.
      </p>

      <h3 style={h3Style}>Es necesario un marketplace para comprar publicidad en comunidades?</h3>
      <p style={pStyle}>
        No es obligatorio, pero acelera mucho el proceso y reduce riesgos. Sin marketplace: contactas admin
        por DM, negocias precio, pagas por adelantado (riesgo de impago) y verificas resultados manualmente.
        Con un marketplace como <Link to="/" style={linkStyle}>Channelad</Link>: precios prefijados, escrow
        automatico, metricas auditadas y soporte en castellano.
      </p>

      <div style={{ marginTop: '48px', padding: '32px', background: `${PURPLE}08`, borderRadius: '16px', textAlign: 'center', border: `1px solid ${PURPLE}20` }}>
        <h2 style={{ fontFamily: D, fontSize: '22px', fontWeight: 700, marginBottom: '10px', color: 'var(--text)' }}>
          Lanza tu primera campana en comunidades verificadas
        </h2>
        <p style={{ ...pStyle, color: 'var(--muted)', marginBottom: '20px', maxWidth: '520px', margin: '0 auto 20px' }}>
          Channelad te conecta con canales verificados de WhatsApp, Telegram y Discord.
          Metricas auditadas, pago por escrow, resultados medibles.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/para-anunciantes" style={{ display: 'inline-block', background: PURPLE, color: '#fff', padding: '12px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: 600, fontFamily: F, textDecoration: 'none' }}>Explorar canales</Link>
          <Link to="/para-canales" style={{ display: 'inline-block', background: 'transparent', color: GREEN, padding: '12px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: 600, fontFamily: F, textDecoration: 'none', border: `1.5px solid ${GREEN}` }}>Soy creador</Link>
        </div>
      </div>
    </div>
  )
}
