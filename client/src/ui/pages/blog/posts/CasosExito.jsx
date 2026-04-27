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

const quoteStyle = { margin: '24px 0', padding: '20px 24px', borderLeft: `3px solid ${PURPLE}`, background: `${PURPLE}05`, borderRadius: '0 12px 12px 0', fontStyle: 'italic', fontSize: '15px', lineHeight: 1.7, color: 'var(--text)' }

export default function CasosExito() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0' }}>
      <p style={pStyle}>
        Datos de referencia, ingresos representativos. Sin inflar numeros ni prometer mundos. Estos son cinco
        perfiles de creadores que representan patrones tipicos de monetizacion en comunidades, para que
        otros creadores vean lo que es posible con gestion profesional y
        una plataforma que funciona.
      </p>
      <p style={pStyle}>
        Los nombres estan cambiados por privacidad. Los datos estan basados en patrones reales del
        mercado hispanohablante y representan progresiones tipicas, no casos individuales verificados.
      </p>

      <img src="https://images.unsplash.com/photo-1553877522-43269d4ea984?w=720&q=80&auto=format" alt="Creadores de contenido revisando metricas de monetizacion" style={imgStyle} loading="lazy" />
      <p style={captionStyle}>Los creadores que mejor monetizan tienen algo en comun: datos, consistencia y herramientas profesionales — Foto: Unsplash</p>

      <h2 style={h2Style}>Caso 1 — Canal de finanzas personales, 9.000 suscriptores</h2>
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead><tr><th style={thStyle}>Dato</th><th style={thStyle}>Valor</th></tr></thead>
          <tbody>
            <tr><td style={tdFirstStyle}>Nicho</td><td style={tdStyle}>Finanzas personales / FIRE</td></tr>
            <tr><td style={tdFirstStyle}>Suscriptores</td><td style={tdStyle}>9.200</td></tr>
            <tr><td style={tdFirstStyle}>Engagement rate</td><td style={tdStyle}>42%</td></tr>
            <tr><td style={tdFirstStyle}>Tiempo en Channelad</td><td style={tdStyle}>8 meses</td></tr>
            <tr><td style={tdFirstStyle}>Ingreso mensual actual</td><td style={tdStyle}>450 EUR</td></tr>
          </tbody>
        </table>
      </div>
      <p style={pStyle}>
        Lucia empezo su canal en 2024 como hobby. Publicaba analisis de ETFs, comparativas de
        brokers y tips de ahorro. Cuando llego a 3.000 suscriptores, empezo a recibir DMs de
        marcas pidiendo publicidad. El problema: negociaba cada acuerdo manualmente, perdia tiempo
        y un anunciante le dejo un impago de 90 EUR.
      </p>
      <p style={pStyle}>
        Se registro en Channelad en septiembre de 2025. En el primer mes recibio 4 propuestas
        sin buscar activamente. Para el tercer mes, ya tenia anunciantes recurrentes (un broker
        online y una app de ahorro). Su precio actual: 55 EUR por post estandar, 110 EUR por
        fijado 24h.
      </p>
      <div style={quoteStyle}>
        «Lo que mas valoro es que no tengo que perseguir pagos. El escrow me da tranquilidad
        para centrarme en el contenido. Antes perdia 2-3 horas a la semana negociando, ahora
        dedico ese tiempo a crear mejores posts.» — Lucia
      </div>

      <h2 style={h2Style}>Caso 2 — Canal de tecnologia y productividad, 14.000 suscriptores</h2>
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead><tr><th style={thStyle}>Dato</th><th style={thStyle}>Valor</th></tr></thead>
          <tbody>
            <tr><td style={tdFirstStyle}>Nicho</td><td style={tdStyle}>Tecnologia / Productividad</td></tr>
            <tr><td style={tdFirstStyle}>Suscriptores</td><td style={tdStyle}>14.300</td></tr>
            <tr><td style={tdFirstStyle}>Engagement rate</td><td style={tdStyle}>38%</td></tr>
            <tr><td style={tdFirstStyle}>Tiempo en Channelad</td><td style={tdStyle}>11 meses</td></tr>
            <tr><td style={tdFirstStyle}>Ingreso mensual actual</td><td style={tdStyle}>800 EUR</td></tr>
          </tbody>
        </table>
      </div>
      <p style={pStyle}>
        Daniel gestiona el canal mas grande de esta lista. Su estrategia es simple pero efectiva:
        publica 2-3 posts diarios de contenido de valor (reviews de herramientas, tutoriales,
        comparativas) y acepta maximo 6 posts patrocinados al mes. Cobra 120 EUR por post estandar
        y 240 EUR por fijado 24h, con paquetes mensuales de 4 posts a 420 EUR.
      </p>
      <p style={pStyle}>
        Lo que diferencia a Daniel: tiene un media kit impecable con datos actualizados cada semana,
        y sus anunciantes repiten porque les envio capturas de rendimiento despues de cada campana.
        Tres de sus cinco anunciantes actuales son recurrentes desde hace mas de 6 meses.
      </p>
      <div style={quoteStyle}>
        «La clave fue dejar de tratar mi canal como hobby y empezar a tratarlo como producto.
        Channelad me fuerza a tener los datos ordenados, y eso profesionaliza toda la relacion
        con los anunciantes.» — Daniel
      </div>

      <h2 style={h2Style}>Caso 3 — Canal de marketing digital, 6.500 suscriptores</h2>
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead><tr><th style={thStyle}>Dato</th><th style={thStyle}>Valor</th></tr></thead>
          <tbody>
            <tr><td style={tdFirstStyle}>Nicho</td><td style={tdStyle}>Marketing digital / Growth</td></tr>
            <tr><td style={tdFirstStyle}>Suscriptores</td><td style={tdStyle}>6.500</td></tr>
            <tr><td style={tdFirstStyle}>Engagement rate</td><td style={tdStyle}>45%</td></tr>
            <tr><td style={tdFirstStyle}>Tiempo en Channelad</td><td style={tdStyle}>6 meses</td></tr>
            <tr><td style={tdFirstStyle}>Ingreso mensual actual</td><td style={tdStyle}>350 EUR</td></tr>
          </tbody>
        </table>
      </div>
      <p style={pStyle}>
        Marta tiene menos suscriptores que los demas, pero su CPM es el mas alto de la lista
        porque el nicho de marketing digital tiene anunciantes con tickets altos (herramientas SaaS,
        cursos premium, agencias). Su engagement del 45% le permite cobrar por encima de la media:
        65 EUR por post estandar. Publica 3-4 patrocinados al mes, siempre de herramientas que
        ella misma usa.
      </p>
      <div style={quoteStyle}>
        «No acepto publicidad de productos que no uso. Mi audiencia confia en mis recomendaciones
        y eso vale mas que cualquier pago. Los anunciantes que entienden eso son los que repiten.» — Marta
      </div>

      <h2 style={h2Style}>Caso 4 — Canal de fitness, 4.200 suscriptores</h2>
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead><tr><th style={thStyle}>Dato</th><th style={thStyle}>Valor</th></tr></thead>
          <tbody>
            <tr><td style={tdFirstStyle}>Nicho</td><td style={tdStyle}>Fitness / Nutricion</td></tr>
            <tr><td style={tdFirstStyle}>Suscriptores</td><td style={tdStyle}>4.200</td></tr>
            <tr><td style={tdFirstStyle}>Engagement rate</td><td style={tdStyle}>52%</td></tr>
            <tr><td style={tdFirstStyle}>Tiempo en Channelad</td><td style={tdStyle}>5 meses</td></tr>
            <tr><td style={tdFirstStyle}>Ingreso mensual actual</td><td style={tdStyle}>200 EUR</td></tr>
          </tbody>
        </table>
      </div>
      <p style={pStyle}>
        Alejandro tiene el canal mas pequeno de la lista pero el engagement mas alto (52%). Su
        estrategia combina publicidad directa (2-3 posts patrocinados al mes de marcas de
        suplementos y apps de entrenamiento) con marketing de afiliados (enlaces a Amazon de
        productos que recomienda). Los 200 EUR se reparten: ~130 EUR en publicidad y ~70 EUR
        en comisiones de afiliado.
      </p>
      <div style={quoteStyle}>
        «Con 4.000 suscriptores no esperaba ganar nada. Pero el engagement alto compensa. Los
        anunciantes de fitness valoran mucho una audiencia comprometida.» — Alejandro
      </div>

      <h2 style={h2Style}>Caso 5 — Servidor de Discord de gaming, 22.000 miembros</h2>
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead><tr><th style={thStyle}>Dato</th><th style={thStyle}>Valor</th></tr></thead>
          <tbody>
            <tr><td style={tdFirstStyle}>Nicho</td><td style={tdStyle}>Gaming / Esports</td></tr>
            <tr><td style={tdFirstStyle}>Miembros</td><td style={tdStyle}>22.000 (3.800 activos diarios)</td></tr>
            <tr><td style={tdFirstStyle}>Plataforma</td><td style={tdStyle}>Discord</td></tr>
            <tr><td style={tdFirstStyle}>Tiempo en Channelad</td><td style={tdStyle}>7 meses</td></tr>
            <tr><td style={tdFirstStyle}>Ingreso mensual actual</td><td style={tdStyle}>500 EUR</td></tr>
          </tbody>
        </table>
      </div>
      <p style={pStyle}>
        Pablo administra un servidor de Discord centrado en un juego competitivo. Sus ingresos
        vienen de tres fuentes: posts patrocinados de marcas de perifericos gaming (~200 EUR/mes),
        roles premium a 5 EUR/mes con 38 suscriptores (~190 EUR/mes), y torneos patrocinados
        bimensuales (~110 EUR/mes promediado). Es el unico caso de Discord en la lista, y
        demuestra que la monetizacion en Discord es viable y creciente.
      </p>
      <div style={quoteStyle}>
        «Discord es perfecto para gaming porque los miembros estan enganchados. Los anunciantes
        de hardware pagan bien porque saben que mi audiencia compra perifericos.» — Pablo
      </div>

      <h2 style={h2Style}>Lo que tienen en comun los creadores que mas ganan</h2>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Consistencia de contenido.</span> Todos publican a diario o casi a diario. No hay semanas sin publicar. La consistencia es la base del engagement y el engagement es la base del ingreso.</li>
        <li style={liStyle}><span style={strongStyle}>Engagement sobre cantidad.</span> Marta (6.500 subs, 350 EUR) gana casi lo mismo que Alejandro con un tercio de suscriptores. La calidad de la audiencia importa mas que el tamano.</li>
        <li style={liStyle}><span style={strongStyle}>Metricas verificadas para negociar precios.</span> Todos usan datos verificados para justificar sus precios. El media kit profesional es su herramienta de venta numero uno.</li>
        <li style={liStyle}><span style={strongStyle}>Escrow obligatorio.</span> Ninguno acepta pagos fuera de plataforma. Todos han tenido alguna experiencia negativa con pagos directos antes de usar un marketplace.</li>
        <li style={liStyle}><span style={strongStyle}>Filtran anunciantes.</span> Todos rechazan publicidad que no encaja con su audiencia. La reputacion a largo plazo vale mas que un pago puntual.</li>
      </ul>

      <p style={pStyle}>
        Si quieres aprender a crear tu propio media kit profesional, lee la{' '}
        <Link to="/blog/media-kit-canal-telegram" style={linkStyle}>guia de media kit para Telegram</Link>.
        Y para la guia completa de monetizacion, empieza por el{' '}
        <Link to="/blog/monetizar-canal-telegram-espana" style={linkStyle}>articulo pilar de monetizacion</Link>.
      </p>

      <h2 style={h2Style}>Preguntas frecuentes</h2>

      <h3 style={h3Style}>Cuanto ganan los creadores de canales de Telegram con publicidad?</h3>
      <p style={pStyle}>
        Depende del nicho y tamano. Canales de 5.000-10.000 suscriptores generan entre 200 y 600 EUR/mes
        con publicidad directa. Canales de nichos premium como finanzas o cripto pueden superar los
        1.000 EUR/mes. La diferencia entre los casos de esta lista demuestra que el engagement importa
        mas que el numero absoluto de suscriptores.
      </p>

      <h3 style={h3Style}>Es rentable monetizar un canal de Telegram con Channelad?</h3>
      <p style={pStyle}>
        Si. Channelad conecta a creadores con anunciantes verificados y protege el pago con escrow. Los
        creadores reportan ingresos un 30-50% superiores a negociar por su cuenta, al eliminar impagos y
        atraer marcas de mayor calidad. Los 5 casos de esta lista coinciden en lo mismo: dejar de tratar
        el canal como hobby y empezar a tratarlo como producto.
      </p>

      <h3 style={h3Style}>Que tipo de canales de Telegram ganan mas dinero?</h3>
      <p style={pStyle}>
        Los nichos mas rentables son finanzas, criptomonedas, tecnologia y marketing digital. El CPM en
        estos nichos oscila entre 5 y 12 EUR, frente a 1,5-3 EUR en nichos como gaming o entretenimiento.
        Si quieres el detalle completo de tarifas por nicho, lee la{' '}
        <Link to="/blog/cuanto-cobrar-publicidad-telegram" style={linkStyle}>guia de precios de publicidad en Telegram</Link>.
      </p>

      <div style={{ marginTop: '48px', padding: '32px', background: `${GREEN}10`, borderRadius: '16px', textAlign: 'center', border: `1px solid ${GREEN}30` }}>
        <h2 style={{ fontFamily: D, fontSize: '22px', fontWeight: 700, marginBottom: '10px', color: 'var(--text)' }}>
          Tu historia puede ser la proxima
        </h2>
        <p style={{ ...pStyle, color: 'var(--muted)', marginBottom: '20px', maxWidth: '520px', margin: '0 auto 20px' }}>
          Registra tu canal en Channelad y empieza a recibir propuestas de anunciantes verificados.
          Sin perseguir pagos, sin intermediarios, con escrow en cada campana.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/para-canales" style={{ display: 'inline-block', background: GREEN, color: '#fff', padding: '12px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: 600, fontFamily: F, textDecoration: 'none' }}>Registrar mi canal</Link>
          <Link to="/para-anunciantes" style={{ display: 'inline-block', background: 'transparent', color: PURPLE, padding: '12px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: 600, fontFamily: F, textDecoration: 'none', border: `1.5px solid ${PURPLE}` }}>Soy anunciante</Link>
        </div>
      </div>
    </div>
  )
}
