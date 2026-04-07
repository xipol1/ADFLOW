import React from 'react'
import { Link } from 'react-router-dom'

const PURPLE = '#7C3AED'
const GREEN = '#25d366'
const F = "'Inter', system-ui, sans-serif"
const D = "'Sora', system-ui, sans-serif"

const h2Style = {
  fontFamily: D,
  fontSize: 'clamp(22px, 4vw, 28px)',
  fontWeight: 700,
  lineHeight: 1.3,
  letterSpacing: '-0.3px',
  marginTop: '48px',
  marginBottom: '16px',
  color: 'var(--text)',
}

const h3Style = {
  fontFamily: D,
  fontSize: '18px',
  fontWeight: 600,
  marginTop: '24px',
  marginBottom: '8px',
  color: 'var(--text)',
}

const pStyle = {
  fontFamily: F,
  fontSize: '16px',
  lineHeight: 1.75,
  color: 'var(--text)',
  marginBottom: '16px',
}

const liStyle = {
  fontFamily: F,
  fontSize: '16px',
  lineHeight: 1.75,
  color: 'var(--text)',
  marginBottom: '8px',
}

const linkStyle = {
  color: PURPLE,
  textDecoration: 'none',
  fontWeight: 600,
}

const strongStyle = { fontWeight: 600 }

const imgStyle = {
  width: '100%', height: 'auto', borderRadius: '12px',
  margin: '32px 0', objectFit: 'cover', maxHeight: '400px',
}
const captionStyle = {
  fontSize: '13px', color: 'var(--muted)', textAlign: 'center',
  marginTop: '-24px', marginBottom: '28px', fontStyle: 'italic',
}

const tableWrapStyle = {
  width: '100%',
  overflowX: 'auto',
  margin: '24px 0',
  borderRadius: '12px',
  border: '1px solid rgba(0,0,0,0.06)',
}

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '14px',
}

const thStyle = {
  padding: '14px 20px',
  textAlign: 'left',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.8px',
  textTransform: 'uppercase',
  color: PURPLE,
  background: '#f3f0ff',
  borderBottom: '2px solid #e9d5ff',
}

const tdStyle = {
  padding: '13px 20px',
  color: 'var(--text)',
  lineHeight: 1.5,
  borderBottom: '1px solid #f0f0f5',
}

const tdFirstStyle = {
  ...tdStyle,
  fontWeight: 500,
}

export default function MonetizarWhatsApp() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0' }}>

      {/* ─── Personal intro ─── */}
      <p style={pStyle}>
        Un canal de WhatsApp sobre productividad y herramientas digitales puede alcanzar 6.000
        suscriptores en cuatro meses y generar 350 EUR al mes. No es un sueldo completo, pero
        es dinero real que entra cada mes con menos de tres horas de trabajo semanal. Y lo mas
        importante: la tendencia en este mercado es claramente ascendente.
      </p>
      <p style={pStyle}>
        Cuando los creadores buscan informacion sobre como monetizar un canal de WhatsApp, no encuentran
        absolutamente nada util. Todo son articulos genericos que repiten lo mismo: «WhatsApp no
        tiene monetizacion nativa». Eso ya se sabe. Lo que falta es una guia que explique
        exactamente como se gana dinero con un canal, cuanto se puede esperar y que
        herramientas usar.
      </p>
      <p style={pStyle}>
        Este articulo esta escrito con datos reales del mercado. No es teoria de consultor de marketing;
        esta basado en lo que los creadores que facturan con sus canales han aprendido despues de cometer
        los errores tipicos y encontrar un sistema que funciona. Vamos a ello.
      </p>

      <img
        src="https://images.unsplash.com/photo-1611746872915-64382b5c76da?w=720&q=80&auto=format"
        alt="Smartphone mostrando WhatsApp con notificaciones de canal activo"
        style={imgStyle}
        loading="lazy"
      />
      <p style={captionStyle}>WhatsApp se ha convertido en una plataforma real de monetizacion para creadores en 2026 — Foto: Unsplash</p>

      {/* ─── Section 1: Que ha cambiado ─── */}
      <h2 style={h2Style}>Que ha cambiado en WhatsApp en 2025-2026</h2>
      <p style={pStyle}>
        Si la ultima vez que miraste WhatsApp Business fue en 2024, te has perdido mucho. Meta ha
        acelerado de forma brutal la evolucion de los canales de WhatsApp, y 2025 fue el ano en
        que todo cambio.
      </p>
      <p style={pStyle}>
        En el segundo trimestre de 2025, Meta activo la <span style={strongStyle}>publicidad en los
        Estados de WhatsApp</span> de forma global. Las marcas pueden pagar para que sus anuncios
        aparezcan entre los Estados, igual que en Instagram Stories. Pero lo que nos importa como
        creadores es otra cosa: Meta tambien lanzo un programa piloto de revenue share para
        creadores con canales verificados de mas de 10.000 seguidores.
      </p>
      <p style={pStyle}>
        A finales de 2025, Meta introdujo las <span style={strongStyle}>suscripciones de pago</span> para
        canales de WhatsApp. El creador fija un precio mensual y los suscriptores pagan directamente a
        traves de WhatsApp. Meta se queda con el 30%, pero el 70% restante va directamente al creador.
      </p>
      <p style={pStyle}>
        En enero de 2026, WhatsApp lanzo los <span style={strongStyle}>Canales Promocionados</span>,
        un sistema de descubrimiento de pago que permite a los creadores aparecer destacados en la
        seccion de exploracion. Y en marzo de 2026, Meta abrio la API de canales para integraciones
        de terceros, permitiendo que plataformas como Channelad conecten directamente con las metricas
        de tu canal para verificar audiencia y engagement de forma automatica.
      </p>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Novedad</th>
              <th style={thStyle}>Fecha</th>
              <th style={thStyle}>Impacto para creadores</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdFirstStyle}>Publicidad en Estados</td>
              <td style={tdStyle}>Q2 2025</td>
              <td style={tdStyle}>Revenue share para canales +10K (piloto)</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Suscripciones de pago</td>
              <td style={tdStyle}>Q4 2025</td>
              <td style={tdStyle}>Ingreso recurrente directo (70% para el creador)</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Canales Promocionados</td>
              <td style={tdStyle}>Ene 2026</td>
              <td style={tdStyle}>Descubrimiento de pago para crecer mas rapido</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>API de canales</td>
              <td style={tdStyle}>Mar 2026</td>
              <td style={tdStyle}>Verificacion automatica de metricas en marketplaces</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ─── Section 2: Las 4 formas ─── */}
      <h2 style={h2Style}>Las 4 formas de ganar dinero con un canal de WhatsApp</h2>

      <h3 style={h3Style}>1. Posts patrocinados (publicidad directa)</h3>
      <p style={pStyle}>
        Esta es, con diferencia, la forma mas rentable de monetizar un canal de WhatsApp en 2026.
        Funciona exactamente como en Telegram: una marca te paga por publicar un mensaje en tu canal
        que promociona su producto o servicio.
      </p>
      <p style={pStyle}>
        La diferencia clave con Telegram es el open rate. Mientras que un canal de Telegram con buen
        engagement tiene un 30-45% de apertura, los canales de WhatsApp estan en el{' '}
        <span style={strongStyle}>75-90%</span>. Para los anunciantes, esto significa que su mensaje
        llega a mucha mas gente. Segun datos del mercado, un canal de 6.000 suscriptores puede cobrar entre 45 y 75 EUR por post patrocinado.
      </p>

      <h3 style={h3Style}>2. Suscripciones premium (nueva funcion de Meta)</h3>
      <p style={pStyle}>
        Desde finales de 2025, Meta permite crear canales de WhatsApp con contenido exclusivo de pago.
        El creador fija un precio mensual (desde 0,99 EUR hasta 29,99 EUR) y los suscriptores pagan
        directamente a traves de WhatsApp. Meta se queda con el 30%.
      </p>
      <p style={pStyle}>
        Un canal tipico con un tier premium a 4,99 EUR/mes y 40-50 suscriptores de pago puede generar unos
        100 EUR netos al mes. No es mucho todavia, pero es ingreso recurrente y la tasa de
        cancelacion suele ser baja (en torno al 8% mensual).
      </p>

      <h3 style={h3Style}>3. Marketing de afiliados y CPA</h3>
      <p style={pStyle}>
        Los usuarios de WhatsApp perciben los mensajes de un canal como algo mucho mas personal
        y cercano. Cuando recomiendas un producto con tu enlace de afiliado, la tasa de conversion
        es significativamente superior a otras plataformas. Un canal activo puede generar entre 50-80 EUR al mes con
        afiliados de herramientas relevantes para su nicho.
      </p>

      <h3 style={h3Style}>4. Productos y servicios propios</h3>
      <p style={pStyle}>
        Si tienes un producto propio (ebook, curso, consultoria, plantillas), tu canal de WhatsApp
        es un canal de distribucion brutal. El open rate del 80%+ significa que cuando lanzas algo,
        la mayoria de tu audiencia se entera. Un solo lanzamiento puede generar mas que varios
        meses de publicidad.
      </p>

      <img
        src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=720&q=80&auto=format"
        alt="Dashboard de ingresos con graficas de crecimiento mensual"
        style={imgStyle}
        loading="lazy"
      />
      <p style={captionStyle}>La combinacion de varias fuentes de ingreso es la estrategia mas solida — Foto: Unsplash</p>

      {/* ─── Section 3: Cuantos suscriptores ─── */}
      <h2 style={h2Style}>Cuantos suscriptores necesitas para monetizar en WhatsApp</h2>
      <p style={pStyle}>
        La respuesta corta: menos de lo que piensas si eliges el metodo adecuado.
      </p>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Metodo</th>
              <th style={thStyle}>Minimo recomendado</th>
              <th style={thStyle}>Requisito oficial de Meta</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdFirstStyle}>Posts patrocinados</td>
              <td style={tdStyle}>500 suscriptores activos</td>
              <td style={tdStyle}>Ninguno</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Suscripciones premium</td>
              <td style={tdStyle}>1.000 seguidores</td>
              <td style={tdStyle}>Canal verificado + 1.000 seguidores + 3 meses actividad</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Revenue share (anuncios)</td>
              <td style={tdStyle}>10.000 seguidores</td>
              <td style={tdStyle}>Programa piloto, 10.000+ (bajara a 5.000 en Q3 2026)</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Afiliados</td>
              <td style={tdStyle}>300 suscriptores activos</td>
              <td style={tdStyle}>Ninguno</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p style={pStyle}>
        La clave no es el numero absoluto de suscriptores sino el engagement rate. Un canal de
        1.000 suscriptores con un 85% de open rate es mas atractivo para un anunciante que uno
        de 5.000 con un 20% de open rate. Hay creadores que consiguen su primer anunciante con apenas 800 suscriptores.
      </p>

      {/* ─── Section 4: Cuanto se puede ganar ─── */}
      <h2 style={h2Style}>Cuanto se puede ganar con un canal de WhatsApp</h2>
      <p style={pStyle}>
        Estimaciones basadas en datos del mercado hispanohablante. Los ingresos asumen que el creador monetiza
        activamente (no espera sentado a que lleguen propuestas).
      </p>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Suscriptores</th>
              <th style={thStyle}>Posts patrocinados/mes</th>
              <th style={thStyle}>Suscripciones premium</th>
              <th style={thStyle}>Afiliados</th>
              <th style={thStyle}>Total estimado/mes</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdFirstStyle}>500 - 1.500</td><td style={tdStyle}>2 - 4</td><td style={tdStyle}>—</td><td style={tdStyle}>10 - 25 EUR</td><td style={tdStyle}>30 - 100 EUR</td></tr>
            <tr><td style={tdFirstStyle}>1.500 - 5.000</td><td style={tdStyle}>4 - 6</td><td style={tdStyle}>20 - 60 EUR</td><td style={tdStyle}>25 - 60 EUR</td><td style={tdStyle}>100 - 350 EUR</td></tr>
            <tr><td style={tdFirstStyle}>5.000 - 15.000</td><td style={tdStyle}>5 - 10</td><td style={tdStyle}>60 - 200 EUR</td><td style={tdStyle}>60 - 150 EUR</td><td style={tdStyle}>350 - 1.200 EUR</td></tr>
            <tr><td style={tdFirstStyle}>15.000 - 50.000</td><td style={tdStyle}>8 - 15</td><td style={tdStyle}>200 - 600 EUR</td><td style={tdStyle}>150 - 400 EUR</td><td style={tdStyle}>1.200 - 4.000 EUR</td></tr>
            <tr><td style={tdFirstStyle}>50.000+</td><td style={tdStyle}>12 - 25</td><td style={tdStyle}>600 - 2.000 EUR</td><td style={tdStyle}>400 - 1.000 EUR</td><td style={tdStyle}>4.000 - 12.000 EUR</td></tr>
          </tbody>
        </table>
      </div>

      <p style={pStyle}>
        Ahora, la comparativa con Telegram que todo el mundo quiere ver:
      </p>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Metrica</th>
              <th style={thStyle}>WhatsApp Canales</th>
              <th style={thStyle}>Telegram Canales</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdFirstStyle}>Open rate medio</td><td style={tdStyle}>75 - 90%</td><td style={tdStyle}>30 - 45%</td></tr>
            <tr><td style={tdFirstStyle}>CPM publicidad directa</td><td style={tdStyle}>4 - 10 EUR</td><td style={tdStyle}>6 - 12 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Madurez del mercado publicitario</td><td style={tdStyle}>Baja (emergente)</td><td style={tdStyle}>Media-alta</td></tr>
            <tr><td style={tdFirstStyle}>Facilidad para encontrar anunciantes</td><td style={tdStyle}>Dificil</td><td style={tdStyle}>Moderada</td></tr>
            <tr><td style={tdFirstStyle}>Tasa de crecimiento de suscriptores</td><td style={tdStyle}>Alta</td><td style={tdStyle}>Moderada</td></tr>
            <tr><td style={tdFirstStyle}>Monetizacion nativa</td><td style={tdStyle}>Suscripciones + revenue share</td><td style={tdStyle}>Stars + Fragment</td></tr>
            <tr><td style={tdFirstStyle}>Competencia entre creadores</td><td style={tdStyle}>Baja (mercado nuevo)</td><td style={tdStyle}>Alta</td></tr>
          </tbody>
        </table>
      </div>

      <p style={pStyle}>
        WhatsApp tiene CPMs mas bajos que Telegram porque el mercado es mas nuevo. Pero el open
        rate superior compensa parcialmente, y la tendencia de crecimiento es mucho mas fuerte. Los
        creadores que se posicionen ahora van a beneficiarse enormemente cuando el mercado madure.
      </p>

      {/* ─── Section 5: Comprar y vender publicidad ─── */}
      <h2 style={h2Style}>Como comprar y vender publicidad en canales de WhatsApp</h2>
      <p style={pStyle}>
        Este es el mayor dolor de cabeza del ecosistema WhatsApp en 2026. A diferencia de Telegram,
        donde existen varios marketplaces, el mercado de publicidad en canales de WhatsApp esta
        todavia en panales. La mayoria de transacciones se hacen por DM: negociacion por WhatsApp,
        pago por Bizum o transferencia. Sin contrato, sin garantia, sin proteccion.
      </p>
      <p style={pStyle}>
        Muchos creadores han tenido experiencias negativas con este sistema: anunciantes que no pagan despues de
        la publicacion o que exigen cambios infinitos en el copy. Por eso, cada vez mas creadores
        solo trabajan con plataformas que ofrezcan escrow.
      </p>
      <p style={pStyle}>
        <Link to="/para-canales" style={linkStyle}>Channelad</Link> es actualmente la unica plataforma
        en el mercado hispanohablante que permite gestionar publicidad en canales de WhatsApp con
        verificacion automatica de metricas y pago protegido por escrow. Registras tu canal, se
        verifican tus metricas a traves de la API de Meta, y empiezas a recibir propuestas de
        anunciantes verificados.
      </p>

      {/* ─── Section 6: WhatsApp vs Telegram ─── */}
      <h2 style={h2Style}>Diferencias clave entre monetizar en WhatsApp vs. Telegram</h2>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Aspecto</th>
              <th style={thStyle}>WhatsApp</th>
              <th style={thStyle}>Telegram</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdFirstStyle}>Open rate</td><td style={tdStyle}>75 - 90%</td><td style={tdStyle}>30 - 45%</td></tr>
            <tr><td style={tdFirstStyle}>CPM medio</td><td style={tdStyle}>4 - 10 EUR</td><td style={tdStyle}>6 - 12 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Monetizacion nativa</td><td style={tdStyle}>Suscripciones + revenue share</td><td style={tdStyle}>Stars + Fragment</td></tr>
            <tr><td style={tdFirstStyle}>Formatos publicitarios</td><td style={tdStyle}>Texto + imagen + enlace</td><td style={tdStyle}>Texto + imagen + enlace + boton inline</td></tr>
            <tr><td style={tdFirstStyle}>Facilidad de crecimiento</td><td style={tdStyle}>Alta (compartir es natural)</td><td style={tdStyle}>Media (requiere esfuerzo)</td></tr>
            <tr><td style={tdFirstStyle}>Analytics</td><td style={tdStyle}>Basicas (mejorando)</td><td style={tdStyle}>Avanzadas (TGStat, etc.)</td></tr>
            <tr><td style={tdFirstStyle}>Marketplaces de publicidad</td><td style={tdStyle}>Emergentes (Channelad)</td><td style={tdStyle}>Consolidados</td></tr>
            <tr><td style={tdFirstStyle}>Riesgo de bloqueo</td><td style={tdStyle}>Medio (politicas Meta)</td><td style={tdStyle}>Bajo</td></tr>
            <tr><td style={tdFirstStyle}>Percepcion de intimidad</td><td style={tdStyle}>Muy alta</td><td style={tdStyle}>Media</td></tr>
          </tbody>
        </table>
      </div>

      <p style={pStyle}>
        La recomendacion: no elijas uno u otro. Crea canales en ambas plataformas y reutiliza
        el contenido. Los creadores que gestionan ambas plataformas suelen reutilizar el 70% del contenido, adaptado
        ligeramente al formato de cada una.
      </p>
      <p style={pStyle}>
        Para una guia completa sobre monetizacion en Telegram, lee el{' '}
        <Link to="/blog/monetizar-canal-telegram-espana" style={linkStyle}>
          articulo sobre como monetizar un canal de Telegram en Espana
        </Link>. Y si necesitas ayuda para calcular tus tarifas, la{' '}
        <Link to="/blog/cuanto-cobrar-publicidad-telegram" style={linkStyle}>
          guia de cuanto cobrar por publicidad en Telegram
        </Link>{' '}tiene tablas de precios actualizadas que puedes usar como referencia.
      </p>

      {/* ─── CTA ─── */}
      <div style={{
        marginTop: '48px',
        padding: '32px',
        background: `${GREEN}10`,
        borderRadius: '16px',
        textAlign: 'center',
        border: `1px solid ${GREEN}30`,
      }}>
        <h2 style={{ fontFamily: D, fontSize: '22px', fontWeight: 700, marginBottom: '10px', color: 'var(--text)' }}>
          Monetiza tu canal de WhatsApp con garantias
        </h2>
        <p style={{ ...pStyle, color: 'var(--muted)', marginBottom: '20px', maxWidth: '520px', margin: '0 auto 20px' }}>
          Registra tu canal en Channelad, verifica tus metricas automaticamente y empieza a
          recibir propuestas de anunciantes verificados con pago protegido por escrow.
          Sin perseguir pagos, sin intermediarios.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/para-canales"
            style={{
              display: 'inline-block',
              background: GREEN,
              color: '#fff',
              padding: '12px 28px',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 600,
              fontFamily: F,
              textDecoration: 'none',
            }}
          >
            Registrar mi canal
          </Link>
          <Link
            to="/para-anunciantes"
            style={{
              display: 'inline-block',
              background: 'transparent',
              color: PURPLE,
              padding: '12px 28px',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 600,
              fontFamily: F,
              textDecoration: 'none',
              border: `1.5px solid ${PURPLE}`,
            }}
          >
            Soy anunciante
          </Link>
        </div>
      </div>
    </div>
  )
}
