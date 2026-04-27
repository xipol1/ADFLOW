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

export default function CuantoPagaTelegram() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0' }}>

      {/* ─── Editorial intro ─── */}
      <p style={pStyle}>
        La pregunta «cuanto paga Telegram por canal» tiene una respuesta corta que nadie te da
        directamente: Telegram, como plataforma, <span style={strongStyle}>no te paga nada</span>. Cero.
        No existe un programa de monetizacion tipo YouTube Partner donde acumulas visitas y te
        llega un ingreso. Punto.
      </p>
      <p style={pStyle}>
        Pero eso no significa que no se pueda ganar dinero con un canal. Los creadores que usan{' '}
        <Link to="/marketplace" style={linkStyle}>Channelad</Link> generan entre 200 y 800 EUR
        mensuales con canales de 5.000-15.000 suscriptores vendiendo publicidad directa. El dinero
        no viene de Telegram — viene de los anunciantes que pagan por acceder a audiencias de nicho.
      </p>
      <p style={pStyle}>
        En este articulo separamos la monetizacion nativa de Telegram (Fragment, Stars) de la
        publicidad externa, con datos de referencia del mercado hispanohablante para que sepas
        exactamente que esperar segun el tamano y nicho de tu canal.
      </p>

      <img
        src="https://images.unsplash.com/photo-1563986768609-322da13575f2?w=720&q=80&auto=format"
        alt="Pantalla de smartphone mostrando Telegram con estadisticas de canal"
        style={imgStyle}
        loading="lazy"
      />
      <p style={captionStyle}>La pregunta real no es si Telegram paga, sino cuanto puedes generar con tu canal — Foto: Unsplash</p>

      {/* ─── Section 1: Monetizacion oficial ─── */}
      <h2 style={h2Style}>Lo que paga Telegram oficialmente: Fragment y Stars</h2>
      <p style={pStyle}>
        Telegram lanzo dos mecanismos de monetizacion nativa en 2024: <span style={strongStyle}>Telegram Stars</span> y
        la plataforma <span style={strongStyle}>Fragment</span>. Ambos permiten que los creadores reciban pagos
        directamente dentro de la app, pero con condiciones muy especificas.
      </p>

      <h3 style={h3Style}>Telegram Stars</h3>
      <p style={pStyle}>
        Los Stars son una moneda virtual dentro de Telegram. Los usuarios compran Stars con dinero real
        (via Apple Pay, Google Pay o tarjeta) y pueden enviarlos a creadores como propina o pago por
        contenido premium. El creador acumula Stars y puede convertirlos a TON (la criptomoneda de
        Telegram) o retirar via Fragment.
      </p>
      <p style={pStyle}>
        El problema real: la conversion de Stars a euros es muy desfavorable. Telegram se queda con
        un porcentaje significativo (Apple y Google ya se llevan el 30% de la compra inicial), y la
        liquidez para convertir TON a EUR en Espana es limitada. En la practica, un canal con 5.000
        suscriptores puede esperar entre 5 y 20 EUR al mes en Stars, si tiene una audiencia muy
        comprometida. No es un ingreso serio.
      </p>

      <h3 style={h3Style}>Fragment y la monetizacion de anuncios oficiales</h3>
      <p style={pStyle}>
        Fragment es la plataforma de Telegram para subastar nombres de usuario premium y gestionar
        la monetizacion de anuncios oficiales (Telegram Ads). Desde 2024, Telegram reparte el 50%
        de los ingresos publicitarios con los propietarios de canales que superen los 1.000 suscriptores.
      </p>
      <p style={pStyle}>
        Suena bien en teoria. En la practica, los anuncios oficiales de Telegram son textuales, muy
        discretos, y el CPM que pagan los anunciantes es bajo (entre 0,10 y 0,50 EUR por mil impresiones
        en el mercado hispanohablante). Un canal de 10.000 suscriptores con un 40% de engagement
        puede esperar entre 15 y 30 EUR al mes por esta via. Mejor que nada, pero lejos de ser una
        fuente de ingresos relevante.
      </p>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Via oficial</th>
              <th style={thStyle}>Requisitos</th>
              <th style={thStyle}>Ingreso estimado/mes</th>
              <th style={thStyle}>Disponibilidad Espana</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdFirstStyle}>Telegram Stars</td>
              <td style={tdStyle}>Canal activo</td>
              <td style={tdStyle}>5 - 20 EUR</td>
              <td style={tdStyle}>Si (con limitaciones de retiro)</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Fragment (50% ads)</td>
              <td style={tdStyle}>+1.000 suscriptores</td>
              <td style={tdStyle}>15 - 30 EUR (10K subs)</td>
              <td style={tdStyle}>Si</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Suscripciones de canal</td>
              <td style={tdStyle}>Canal privado + bot</td>
              <td style={tdStyle}>Variable</td>
              <td style={tdStyle}>Si</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p style={pStyle}>
        Conclusion directa: la monetizacion oficial de Telegram existe pero no da para vivir. Ni de
        lejos. Es un complemento, no una estrategia. El dinero real esta en otro sitio.
      </p>

      {/* ─── Section 2: Publicidad externa ─── */}
      <h2 style={h2Style}>Lo que realmente gana un canal de Telegram: publicidad externa</h2>
      <p style={pStyle}>
        Aqui es donde cambia todo. La publicidad directa — que una marca te pague por publicar un
        mensaje patrocinado en tu canal — es la fuente de ingresos principal para el 90% de los
        canales que monetizan en serio. Y los numeros son significativamente superiores a cualquier
        via oficial.
      </p>
      <p style={pStyle}>
        Estos son datos de referencia del mercado hispanohablante, basados en las transacciones
        registradas en{' '}
        <Link to="/marketplace" style={linkStyle}>Channelad</Link> y en estimaciones del sector:
      </p>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Suscriptores</th>
              <th style={thStyle}>Posts patrocinados/mes</th>
              <th style={thStyle}>Ingreso mensual estimado</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdFirstStyle}>1.000 - 3.000</td><td style={tdStyle}>4 - 6</td><td style={tdStyle}>40 - 120 EUR</td></tr>
            <tr><td style={tdFirstStyle}>3.000 - 10.000</td><td style={tdStyle}>6 - 10</td><td style={tdStyle}>120 - 400 EUR</td></tr>
            <tr><td style={tdFirstStyle}>10.000 - 30.000</td><td style={tdStyle}>8 - 15</td><td style={tdStyle}>400 - 1.200 EUR</td></tr>
            <tr><td style={tdFirstStyle}>30.000 - 100.000</td><td style={tdStyle}>10 - 20</td><td style={tdStyle}>1.200 - 4.000 EUR</td></tr>
            <tr><td style={tdFirstStyle}>100.000+</td><td style={tdStyle}>15 - 30</td><td style={tdStyle}>4.000 - 15.000 EUR</td></tr>
          </tbody>
        </table>
      </div>

      <p style={pStyle}>
        Ojo: estos numeros asumen que vendes publicidad activamente. Si simplemente esperas a que
        los anunciantes te encuentren, tus ingresos seran una fraccion de lo posible. La diferencia
        entre un canal que monetiza bien y uno que no es la gestion activa: estar en un marketplace,
        tener un media kit, responder rapido y ofrecer formatos claros.
      </p>
      <p style={pStyle}>
        Para referencia: un canal tipico de 8.000 suscriptores en tecnologia cobra entre 90 y 140 EUR
        por post patrocinado (post estandar vs. fijado 24h). Con dos o tres publicaciones patrocinadas
        al mes, puede alcanzar los 400-600 EUR mensuales. La relacion esfuerzo/ingreso es competitiva
        frente a otros canales de monetizacion de contenido.
      </p>

      {/* ─── Section 3: El factor nicho ─── */}
      <h2 style={h2Style}>El factor que mas afecta tus ingresos: el nicho</h2>
      <p style={pStyle}>
        No todos los suscriptores valen lo mismo. Un canal de 3.000 suscriptores en finanzas personales
        puede facturar mas que uno de 30.000 en memes. La razon es el CPM (Coste Por Mil impresiones):
        los anunciantes pagan mas por acceder a audiencias de alto valor comercial.
      </p>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Nicho</th>
              <th style={thStyle}>CPM medio (EUR)</th>
              <th style={thStyle}>Por que pagan mas/menos</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdFirstStyle}>Cripto / Trading</td><td style={tdStyle}>6 - 12</td><td style={tdStyle}>Alto poder adquisitivo, productos de alta comision</td></tr>
            <tr><td style={tdFirstStyle}>Finanzas / Inversiones</td><td style={tdStyle}>5 - 10</td><td style={tdStyle}>Audiencia con capacidad de gasto elevada</td></tr>
            <tr><td style={tdFirstStyle}>Tecnologia / Software</td><td style={tdStyle}>4 - 8</td><td style={tdStyle}>Early adopters, alta conversion a SaaS</td></tr>
            <tr><td style={tdFirstStyle}>Marketing / Negocios</td><td style={tdStyle}>3 - 6</td><td style={tdStyle}>Decision makers, B2B con tickets altos</td></tr>
            <tr><td style={tdFirstStyle}>Educacion</td><td style={tdStyle}>3 - 6</td><td style={tdStyle}>Cursos online con margenes altos</td></tr>
            <tr><td style={tdFirstStyle}>Fitness / Salud</td><td style={tdStyle}>3 - 5</td><td style={tdStyle}>Suplementos, apps, programas de entrenamiento</td></tr>
            <tr><td style={tdFirstStyle}>Lifestyle / Moda</td><td style={tdStyle}>2 - 4</td><td style={tdStyle}>E-commerce, marcas de consumo</td></tr>
            <tr><td style={tdFirstStyle}>Gaming / Entretenimiento</td><td style={tdStyle}>1,5 - 3</td><td style={tdStyle}>Audiencia joven, menor poder adquisitivo</td></tr>
            <tr><td style={tdFirstStyle}>Noticias / Memes</td><td style={tdStyle}>1 - 2,5</td><td style={tdStyle}>Audiencia generalista, bajo engagement comercial</td></tr>
          </tbody>
        </table>
      </div>

      <p style={pStyle}>
        Esto tiene implicaciones directas: si estas pensando en crear un canal nuevo con el objetivo
        de monetizar, elige un nicho de CPM alto. Un canal de finanzas con 2.000 suscriptores activos
        y un 40% de engagement puede generar mas ingresos que uno de entretenimiento con 15.000
        suscriptores. El nicho manda.
      </p>
      <p style={pStyle}>
        Y ojo con los nichos «de moda»: cripto tiene el CPM mas alto, pero tambien la audiencia
        mas volatil. Finanzas personales y tecnologia son los nichos con mejor relacion
        estabilidad-ingresos a largo plazo en el mercado espanol.
      </p>

      <img
        src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=720&q=80&auto=format"
        alt="Dashboard de analiticas mostrando metricas de engagement y CPM por nicho"
        style={imgStyle}
        loading="lazy"
      />
      <p style={captionStyle}>El CPM de tu nicho determina cuanto puedes cobrar por publicacion — Foto: Unsplash</p>

      {/* ─── Section 4: Comparativa ─── */}
      <h2 style={h2Style}>Monetizacion nativa vs. publicidad directa: comparativa real</h2>
      <p style={pStyle}>
        Para que quede cristalino, aqui tienes la comparativa lado a lado con un canal tipo de 10.000
        suscriptores en el nicho de tecnologia:
      </p>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Criterio</th>
              <th style={thStyle}>Monetizacion nativa</th>
              <th style={thStyle}>Publicidad directa</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdFirstStyle}>Ingreso mensual (10K subs)</td><td style={tdStyle}>20 - 50 EUR</td><td style={tdStyle}>200 - 500 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Control sobre precios</td><td style={tdStyle}>Ninguno (lo fija Telegram)</td><td style={tdStyle}>Total (tu decides)</td></tr>
            <tr><td style={tdFirstStyle}>Tipo de anuncios</td><td style={tdStyle}>Texto plano automatico</td><td style={tdStyle}>Contenido personalizado</td></tr>
            <tr><td style={tdFirstStyle}>Relacion con anunciantes</td><td style={tdStyle}>Inexistente</td><td style={tdStyle}>Directa o via marketplace</td></tr>
            <tr><td style={tdFirstStyle}>Esfuerzo requerido</td><td style={tdStyle}>Cero (automatico)</td><td style={tdStyle}>Medio (gestionar campanas)</td></tr>
            <tr><td style={tdFirstStyle}>Escalabilidad</td><td style={tdStyle}>Baja (crece linealmente)</td><td style={tdStyle}>Alta (precios suben con engagement)</td></tr>
            <tr><td style={tdFirstStyle}>Proteccion de pago</td><td style={tdStyle}>Gestionado por Telegram</td><td style={tdStyle}>Escrow en marketplaces</td></tr>
          </tbody>
        </table>
      </div>

      <p style={pStyle}>
        La conclusion es obvia: la publicidad directa genera entre 5x y 10x mas que la monetizacion
        nativa para el mismo canal. La unica ventaja real de la via nativa es que no requiere esfuerzo.
        La recomendacion es usar ambas: activa la monetizacion nativa como ingreso pasivo base y
        concentra tu energia en la publicidad directa como fuente principal.
      </p>

      {/* ─── Section 5: Ejemplo tipico ─── */}
      <h2 style={h2Style}>Ejemplo: evolucion de un canal de tecnologia con 8.000 suscriptores</h2>
      <p style={pStyle}>
        Para ilustrar la progresion tipica, este es un ejemplo basado en patrones que observamos
        en canales de tecnologia y productividad que se registran en Channelad. Un canal creado
        a finales de 2024 que empieza a monetizar al llegar a 2.500 suscriptores activos suele
        seguir esta curva:
      </p>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Periodo</th>
              <th style={thStyle}>Suscriptores</th>
              <th style={thStyle}>Precio/post</th>
              <th style={thStyle}>Posts/mes</th>
              <th style={thStyle}>Ingreso mensual</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdFirstStyle}>Mar-Abr 2025</td><td style={tdStyle}>2.500</td><td style={tdStyle}>35 EUR</td><td style={tdStyle}>3</td><td style={tdStyle}>105 EUR</td></tr>
            <tr><td style={tdFirstStyle}>May-Jun 2025</td><td style={tdStyle}>4.200</td><td style={tdStyle}>45 EUR</td><td style={tdStyle}>5</td><td style={tdStyle}>225 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Jul-Sep 2025</td><td style={tdStyle}>6.000</td><td style={tdStyle}>65 EUR</td><td style={tdStyle}>6</td><td style={tdStyle}>390 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Oct-Dic 2025</td><td style={tdStyle}>7.500</td><td style={tdStyle}>90 EUR</td><td style={tdStyle}>5</td><td style={tdStyle}>450 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Ene-Abr 2026</td><td style={tdStyle}>8.000</td><td style={tdStyle}>110 EUR</td><td style={tdStyle}>6</td><td style={tdStyle}>660 EUR</td></tr>
          </tbody>
        </table>
      </div>

      <p style={pStyle}>
        Tres factores aceleran el crecimiento de ingresos en estos canales:
      </p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Usar un marketplace con escrow.</span> Los creadores que pasan de negociar por DM a recibir propuestas con pago garantizado en{' '}<Link to="/para-canales" style={linkStyle}>Channelad</Link> eliminan el riesgo de impago y ahorran horas de gestion.</li>
        <li style={liStyle}><span style={strongStyle}>Subir precios cada trimestre.</span> Cada hito de suscriptores justifica un ajuste del 15-20%. Los anunciantes que valoran la audiencia no se van por una subida razonable.</li>
        <li style={liStyle}><span style={strongStyle}>Medir resultados de cada campana.</span> Enviar capturas de vistas, clics y engagement a los anunciantes crea un portfolio que justifica precios mas altos en cada renovacion.</li>
      </ul>
      <p style={pStyle}>
        La clave del crecimiento no es el numero de suscriptores en si, sino la profesionalizacion:
        mejores herramientas, mejores datos, mejor gestion de la relacion con anunciantes.
      </p>

      {/* ─── Section 6: Como empezar ─── */}
      <h2 style={h2Style}>Como empezar a cobrar publicidad en tu canal hoy</h2>
      <p style={pStyle}>
        Si tienes un canal con mas de 500 suscriptores activos y publicas contenido de forma
        consistente, ya estas en posicion de monetizar. Estos son los pasos recomendados:
      </p>
      <ol style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Revisa tus estadisticas.</span> Entra en las analytics de tu canal y anota: suscriptores totales, vistas medias por post en las ultimas 24h, y tasa de crecimiento semanal.</li>
        <li style={liStyle}><span style={strongStyle}>Calcula tu precio base.</span> Usa la formula: (Suscriptores activos x CPM de tu nicho) / 1.000. Consulta la{' '}<Link to="/blog/cuanto-cobrar-publicidad-telegram" style={linkStyle}>guia de precios de publicidad en Telegram</Link> para datos detallados.</li>
        <li style={liStyle}><span style={strongStyle}>Registrate en un marketplace.</span> <Link to="/para-canales" style={linkStyle}>Channelad</Link> te permite empezar en minutos con verificacion automatica de metricas y pago por escrow.</li>
        <li style={liStyle}><span style={strongStyle}>Define tus formatos y condiciones.</span> Post estandar, post fijado 24h, mencion en contenido organico. Cada formato tiene un multiplicador de precio diferente.</li>
        <li style={liStyle}><span style={strongStyle}>Publica tu primer anuncio.</span> Acepta una primera campana a precio competitivo para generar historial y datos de rendimiento.</li>
      </ol>
      <p style={pStyle}>
        Para una guia completa paso a paso, lee el{' '}
        <Link to="/blog/monetizar-canal-telegram-espana" style={linkStyle}>
          articulo sobre como monetizar un canal de Telegram
        </Link>. Ahi detallo todo el proceso con errores que debes evitar y la comparativa completa
        de plataformas.
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
          Deja de dejar dinero sobre la mesa
        </h2>
        <p style={{ ...pStyle, color: 'var(--muted)', marginBottom: '20px', maxWidth: '520px', margin: '0 auto 20px' }}>
          Registra tu canal en Channelad, pasa la verificacion y empieza a recibir propuestas
          de anunciantes verificados con pago protegido por escrow. Sin perseguir pagos,
          sin intermediarios.
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
