import React from 'react'
import { Link } from 'react-router-dom'
import {
  h2Style, h3Style, pStyle, liStyle, linkStyle, strongStyle,
  imgStyle, captionStyle, quoteStyle, boxStyle,
  tableWrap, tableStyle, thStyle, tdStyle,
} from './styles'

export default function ComoAnunciarseWhatsApp() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0' }}>
      <p style={pStyle}>
        WhatsApp es la red de mensajeria mas usada de Espana y de los pocos canales donde un mensaje aun se
        abre. Desde 2023 los canales unidireccionales de Meta han crecido un 250% interanual y ya hay
        creadores espanoles superando los 200.000 seguidores activos. Para una marca, eso significa la mayor
        ventana de oportunidad publicitaria desde el boom de Instagram en 2017.
      </p>
      <p style={pStyle}>
        Esta guia explica como anunciarse en canales y grupos de WhatsApp en 2026: que formatos existen
        realmente, cuanto cuesta cada uno con cifras de campanas reales, como encontrar canales sin caer en
        bots y los 5 errores que mas dinero queman al empezar.
      </p>

      <img src="https://images.unsplash.com/photo-1611605698335-8b1569810432?w=720&q=80&auto=format" alt="Marca lanzando una campaña publicitaria en canales de WhatsApp" style={imgStyle} loading="lazy" />
      <p style={captionStyle}>WhatsApp Channels en 2026: el canal con mayor open rate del mercado — Foto: Unsplash</p>

      <h2 style={h2Style}>Por que WhatsApp es diferente para los anunciantes</h2>
      <p style={pStyle}>
        WhatsApp tiene una propiedad unica: cuando llega una notificacion, el usuario la ve. No hay
        algoritmo que la oculte, no hay feed infinito que la entierre. El open rate medio en canales de
        WhatsApp es del <span style={strongStyle}>75-90%</span>, frente al 1-3% de alcance organico en
        Instagram o el 20-25% de email marketing.
      </p>
      <p style={pStyle}>Tres consecuencias directas para una marca anunciante:</p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>CPMs eficientes:</span> pagas por audiencia que va a abrir el mensaje, no por impresiones que pasan por delante.</li>
        <li style={liStyle}><span style={strongStyle}>Engagement medible:</span> cada click se atribuye con precision porque no compite con miles de estimulos paralelos.</li>
        <li style={liStyle}><span style={strongStyle}>Mercado inmaduro:</span> en 2026, menos del 5% de las marcas espanolas se anuncia en WhatsApp. Competencia publicitaria minima.</li>
      </ul>

      <h2 style={h2Style}>Los 4 formatos de publicidad disponibles en WhatsApp</h2>

      <h3 style={h3Style}>1. Mensaje patrocinado en canal</h3>
      <p style={pStyle}>
        El formato dominante. El administrador publica tu mensaje como contenido propio: texto, imagen o
        video. Los suscriptores lo reciben en el chat del canal y se cuenta como una notificacion mas.
      </p>
      <p style={pStyle}><span style={strongStyle}>Precio medio (2026):</span> 30-120 EUR en canales de 5.000-15.000 seguidores activos.</p>

      <h3 style={h3Style}>2. Nota de voz patrocinada</h3>
      <p style={pStyle}>
        Especifico de WhatsApp y muy efectivo. El creador graba una nota de voz hablando de tu producto en
        su estilo natural. Open rate proximo al 95% porque la audiencia esta acostumbrada al formato. Se
        paga <span style={strongStyle}>un 50-80% mas que un post escrito</span> porque convierte mucho mejor.
      </p>

      <h3 style={h3Style}>3. Mensaje fijado o destacado</h3>
      <p style={pStyle}>
        Queda anclado en la parte superior del canal hasta 72 horas. Maxima visibilidad: lo primero que ve
        cualquier nuevo seguidor. Coste: 1,5x a 2x un post estandar.
      </p>

      <h3 style={h3Style}>4. Campana cross-grupo (B2B)</h3>
      <p style={pStyle}>
        Para nichos profesionales (abogados, marketing, real estate, finanzas), muchos administradores
        gestionan ademas grupos privados con engagement aun mayor. Una campana cross-grupo te coloca en 3-5
        grupos verticales del mismo administrador con un solo deal.
      </p>

      <h2 style={h2Style}>Cuanto cuesta anunciarse en WhatsApp: precios reales 2026</h2>
      <p style={pStyle}>Sobre campanas reales analizadas en canales en espanol:</p>
      <div style={tableWrap}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Tamano del canal</th>
              <th style={thStyle}>Post escrito</th>
              <th style={thStyle}>Nota de voz</th>
              <th style={thStyle}>CPM estimado</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdStyle}>1.000 - 5.000</td><td style={tdStyle}>20 - 50 EUR</td><td style={tdStyle}>35 - 90 EUR</td><td style={tdStyle}>6 - 14 EUR</td></tr>
            <tr><td style={tdStyle}>5.000 - 15.000</td><td style={tdStyle}>30 - 120 EUR</td><td style={tdStyle}>60 - 200 EUR</td><td style={tdStyle}>5 - 12 EUR</td></tr>
            <tr><td style={tdStyle}>15.000 - 50.000</td><td style={tdStyle}>100 - 300 EUR</td><td style={tdStyle}>180 - 500 EUR</td><td style={tdStyle}>4 - 10 EUR</td></tr>
            <tr><td style={tdStyle}>50.000+</td><td style={tdStyle}>300 - 800 EUR</td><td style={tdStyle}>500 - 1.500 EUR</td><td style={tdStyle}>3 - 8 EUR</td></tr>
          </tbody>
        </table>
      </div>
      <p style={pStyle}>
        En 2026 los CPMs de WhatsApp son <span style={strongStyle}>20-30% superiores</span> a los
        equivalentes en Telegram porque el open rate es mayor y la oferta de canales aun es menor. Si
        quieres ver las tres plataformas comparadas, te interesa la{' '}
        <Link to="/blog/telegram-vs-whatsapp-vs-discord-publicidad" style={linkStyle}>comparativa Telegram
        vs WhatsApp vs Discord</Link>.
      </p>

      <h2 style={h2Style}>Como encontrar canales para anunciarte (sin caer en bots)</h2>
      <p style={pStyle}>
        El problema: no existe un directorio publico oficial. Buscar en la app es lento y no hay metricas
        verificadas. Tres caminos:
      </p>

      <h3 style={h3Style}>Camino A: Outreach directo</h3>
      <p style={pStyle}>
        Buscar canales por hashtags en Twitter/X, recomendaciones en LinkedIn o referencias de creadores
        conocidos. <span style={strongStyle}>Pros:</span> cero comision, contacto directo.{' '}
        <span style={strongStyle}>Contras:</span> tiempo, sin verificacion, sin escrow.
      </p>

      <h3 style={h3Style}>Camino B: Agencias de influencers tradicionales</h3>
      <p style={pStyle}>
        Algunas agencias ya tienen vertical de canales WhatsApp. <span style={strongStyle}>Pros:</span>{' '}
        gestion completa. <span style={strongStyle}>Contras:</span> comisiones del 20-40%, catalogos
        pequenos y poco actualizados.
      </p>

      <h3 style={h3Style}>Camino C: Marketplaces especializados</h3>
      <p style={pStyle}>
        Plataformas como <Link to="/" style={linkStyle}>Channelad</Link> listan canales con metricas
        auditadas (no auto-reportadas), pago via{' '}
        <Link to="/blog/escrow-publicidad-digital" style={linkStyle}>escrow</Link> y filtros por nicho,
        idioma y region. La via mas eficiente para anunciantes que valoran su tiempo y su dinero.
      </p>

      <div style={quoteStyle}>
        Una regla simple: si el administrador del canal se niega a ensenarte capturas de las estadisticas
        nativas de WhatsApp Business (impresiones, alcance), asume que esta inflado.
      </div>

      <h2 style={h2Style}>Los 5 errores que cometen las marcas al estrenarse en WhatsApp</h2>

      <h3 style={h3Style}>1. Tratar WhatsApp como Instagram</h3>
      <p style={pStyle}>
        WhatsApp no es un feed visual. Un anuncio que funciona en Instagram suele fracasar en WhatsApp
        porque la audiencia no esta en modo "explorar", esta en modo "leer mensajes de gente que me
        interesa". El tono debe ser conversacional, no publicitario.
      </p>

      <h3 style={h3Style}>2. Saltar el formato nota de voz</h3>
      <p style={pStyle}>
        Es el formato con mejor conversion y muchas marcas lo evitan porque exige confiar en la voz del
        creador. Si tu nicho admite testimoniales, la nota de voz patrocinada multiplica los resultados
        x2-x3 frente al post escrito.
      </p>

      <h3 style={h3Style}>3. Pagar sin escrow</h3>
      <p style={pStyle}>
        WhatsApp es el canal con mas riesgo de impago directo porque no hay historico publico de campanas.
        Si pagas por adelantado a un administrador desconocido, asumes el riesgo completo. Usa{' '}
        <Link to="/blog/escrow-publicidad-digital" style={linkStyle}>escrow</Link> o un marketplace que lo
        incluya por defecto.
      </p>

      <h3 style={h3Style}>4. No marcar el contenido como patrocinado</h3>
      <p style={pStyle}>
        La Ley General de Publicidad obliga a identificar contenido pagado. En WhatsApp basta con incluir
        #ad, #publi o "contenido patrocinado" al inicio del mensaje. No hacerlo expone a la marca y al
        creador a sanciones.
      </p>

      <h3 style={h3Style}>5. Una sola publicacion y medir conversion</h3>
      <p style={pStyle}>
        Para validar si un canal funciona necesitas minimo 2-3 publicaciones espaciadas. Una campana unica
        tiene demasiada varianza estadistica. Negocia siempre paquetes minimos de 2 posts para tener datos
        comparables.
      </p>

      <h2 style={h2Style}>Como medir resultados en WhatsApp</h2>
      <p style={pStyle}>
        WhatsApp no muestra metricas nativas a anunciantes externos como Meta o Google. La medicion se hace
        por atribucion indirecta:
      </p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Enlaces con UTM:</span> parametros UTM en cada URL. Los clicks llegan a tu analytics (GA4, Plausible) y puedes filtrar por campana.</li>
        <li style={liStyle}><span style={strongStyle}>Codigos de descuento exclusivos:</span> uno unico por canal te permite atribuir cada venta. La metrica mas limpia.</li>
        <li style={liStyle}><span style={strongStyle}>Capturas del creador:</span> pide al administrador captura de impresiones del post 48h despues. Es la unica via de verificacion.</li>
        <li style={liStyle}><span style={strongStyle}>Tracking de telefono:</span> si tu CTA es WhatsApp (boton click-to-chat), incluye un numero o etiqueta diferente por campana.</li>
      </ul>

      <h2 style={h2Style}>Caso practico: campana de 1.000 EUR en WhatsApp</h2>
      <p style={pStyle}>Una marca de productos financieros con 1.000 EUR puede estructurar asi:</p>
      <div style={boxStyle}>
        <ul style={{ paddingLeft: '20px', margin: 0 }}>
          <li style={liStyle}><span style={strongStyle}>Semana 1:</span> 4 canales pequenos (3.000-8.000 seguidores) con post + nota de voz. ~400 EUR. Test de creatividades.</li>
          <li style={liStyle}><span style={strongStyle}>Semana 2:</span> 2 canales medianos (15.000-25.000) con el formato ganador de la semana 1. ~500 EUR. Validacion a escala.</li>
          <li style={liStyle}><span style={strongStyle}>Reserva:</span> 100 EUR para reinvertir en el canal con mejor ROAS.</li>
        </ul>
      </div>
      <p style={pStyle}>
        Con esta estructura tienes 6 puntos de datos en 14 dias para decidir donde escalar. Mejor que
        reventar 1.000 EUR en un solo canal grande con cero capacidad de comparar.
      </p>

      <h2 style={h2Style}>Preguntas frecuentes</h2>

      <h3 style={h3Style}>Cuanto cuesta un anuncio en un canal de WhatsApp en 2026?</h3>
      <p style={pStyle}>
        Entre 30 y 120 EUR para un post escrito en canales de 5.000-15.000 seguidores activos. Las notas de
        voz patrocinadas cuestan un 50-80% mas porque convierten mejor. En canales grandes (50.000+) los
        precios suben a 300-800 EUR por publicacion.
      </p>

      <h3 style={h3Style}>Como encuentro canales de WhatsApp serios para anunciarme?</h3>
      <p style={pStyle}>
        Tres caminos: outreach directo a creadores referenciados, agencias de influencers o marketplaces
        especializados como <Link to="/" style={linkStyle}>Channelad</Link>. La opcion marketplace ahorra
        tiempo y elimina el riesgo de impago al incluir escrow y metricas auditadas.
      </p>

      <h3 style={h3Style}>Es legal anunciarse en WhatsApp en Espana?</h3>
      <p style={pStyle}>
        Si. La publicidad en canales y grupos de WhatsApp es legal siempre que cumplas tres requisitos:
        factura del creador o de la plataforma intermediaria, identificacion clara como contenido
        patrocinado (#ad o equivalente) y respeto a la Ley de Servicios Digitales (DSA) sobre transparencia
        publicitaria.
      </p>

      <h3 style={h3Style}>WhatsApp Ads (oficial) ya esta disponible para marcas?</h3>
      <p style={pStyle}>
        Meta activo monetizacion nativa en WhatsApp en 2025 pero los anuncios oficiales (Status Ads y
        promoted broadcasts) aun no estan disponibles en Espana de forma generalizada. En 2026 la via real
        para marcas sigue siendo el patrocinio directo en canales de creadores.
      </p>

      <h3 style={h3Style}>Como evito que mi anuncio sea bloqueado por WhatsApp?</h3>
      <p style={pStyle}>
        WhatsApp no bloquea contenido patrocinado en canales privados o canales unidireccionales del
        creador. El bloqueo aparece si usas tu cuenta personal para enviar mensajes masivos no solicitados.
        Mientras la publicidad la publique el creador desde su canal, no hay riesgo.
      </p>

      <h2 style={h2Style}>Conclusion</h2>
      <p style={pStyle}>
        WhatsApp en 2026 es el canal publicitario con mayor open rate y menor competencia del mercado
        espanol. CPMs entre 4 y 14 EUR, formatos nativos con conversion superior a redes sociales
        tradicionales y un mercado de creadores que crece a doble digito mes a mes. La unica friccion real
        es la verificacion de canales y la proteccion del pago, y ambas se resuelven usando un marketplace.
      </p>
      <p style={pStyle}>
        Si quieres empezar con canales auditados y escrow integrado,{' '}
        <Link to="/" style={linkStyle}>explora el marketplace de Channelad</Link>. Filtras por nicho, ves
        metricas auditadas y pagas solo cuando el anuncio se publica.
      </p>
    </div>
  )
}
