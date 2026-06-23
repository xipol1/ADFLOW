import React from 'react'
import { Link } from 'react-router-dom'
import {
  h2Style, h3Style, pStyle, liStyle, linkStyle, strongStyle,
  imgStyle, captionStyle, quoteStyle, boxStyle,
  tableWrap, tableStyle, thStyle, tdStyle,
} from './styles'

export default function ComoAnunciarseTelegram() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0' }}>
      <p style={pStyle}>
        Telegram se ha convertido en uno de los canales publicitarios mas infravalorados del mercado
        hispanohablante. Mas de 900 millones de usuarios activos a nivel global, una base creciente en
        Espana y Latinoamerica y algo que Instagram o TikTok ya no garantizan: <span style={strongStyle}>atencion
        real</span>. No impresiones fantasma de un scroll infinito, sino lectores que abren cada mensaje en
        comunidades que eligieron seguir.
      </p>
      <p style={pStyle}>
        Esta guia explica como anunciarse en Telegram en 2026 paso a paso: formatos disponibles, precios
        reales por tamano de canal, como encontrar canales verificados sin caer en bots y los 5 errores que
        cometen el 80% de las marcas que prueban Telegram por primera vez.
      </p>

      <img src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=720&q=80&auto=format" alt="Marca lanzando una campaña publicitaria en canales de Telegram" style={imgStyle} loading="lazy" />
      <p style={captionStyle}>Telegram en 2026: el canal publicitario con mejor coste-rendimiento del mercado — Foto: Unsplash</p>

      <h2 style={h2Style}>Por que Telegram es diferente para los anunciantes</h2>
      <p style={pStyle}>
        La diferencia fundamental con redes sociales tradicionales es el modelo de consumo. En Instagram o
        TikTok, el contenido compite contra un algoritmo que decide quien ve que. En Telegram, cuando un
        canal publica un mensaje, <span style={strongStyle}>todos los suscriptores lo reciben</span>. Sin
        filtros. Sin pay-to-play. Sin desaparecer del feed a los 30 segundos.
      </p>
      <p style={pStyle}>Esto tiene implicaciones directas en los numeros:</p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Tasa de apertura:</span> canales de Telegram reportan entre 40% y 70%, frente al 2-5% de email marketing o el 1-3% de alcance organico en Instagram.</li>
        <li style={liStyle}><span style={strongStyle}>Engagement real:</span> los miembros estan ahi porque quieren. No es un follow pasivo, es una suscripcion activa a contenido que les interesa.</li>
        <li style={liStyle}><span style={strongStyle}>Cero intermediarios algoritmicos:</span> tu mensaje llega directamente al dispositivo del usuario, como un SMS pero gratis y con formato rico.</li>
      </ul>
      <div style={quoteStyle}>
        La publicidad en Telegram no compite con el algoritmo. Compite con la atencion real de personas que
        eligieron estar ahi.
      </div>

      <h2 style={h2Style}>Formatos de publicidad disponibles en Telegram</h2>

      <h3 style={h3Style}>1. Publicacion patrocinada en canal</h3>
      <p style={pStyle}>
        El formato mas comun y efectivo. El administrador publica tu mensaje como contenido propio: puede
        llevar texto, imagenes, video, botones con enlaces o encuestas. Funciona porque los suscriptores
        confian en el criterio del administrador: si el lo recomienda, pesa como una recomendacion personal.
      </p>
      <p style={pStyle}>
        <span style={strongStyle}>Precio medio:</span> entre 15 y 200 EUR por publicacion segun tamano y
        nicho.
      </p>

      <h3 style={h3Style}>2. Mensaje fijado (pinned post)</h3>
      <p style={pStyle}>
        Tu publicacion queda anclada en la parte superior del canal durante un periodo acordado (normalmente
        24-72 horas). Maxima visibilidad: lo primero que ve cualquiera que entre al canal.
      </p>
      <p style={pStyle}>
        <span style={strongStyle}>Precio medio:</span> 1,5x a 3x el precio de una publicacion normal.
      </p>

      <h3 style={h3Style}>3. Mencion en contenido organico</h3>
      <p style={pStyle}>
        El administrador menciona tu marca de forma natural dentro de su contenido habitual. Es el formato
        mas sutil y el que genera mas confianza, normalmente negociado dentro de un paquete.
      </p>

      <h3 style={h3Style}>4. Telegram Ads (plataforma oficial)</h3>
      <p style={pStyle}>
        Telegram tiene su propia plataforma de anuncios desde 2021. Los anuncios aparecen como mensajes
        cortos al final de canales publicos con mas de 1.000 suscriptores.
      </p>
      <p style={pStyle}>
        <span style={strongStyle}>Limitaciones:</span> solo texto (160 caracteres), sin segmentacion avanzada
        y un presupuesto minimo de 2 millones de EUR en creditos. No es accesible para pymes. Si quieres
        entender bien como funciona el pago en TON y la conversion a euros desde Espana, te recomiendo la{' '}
        <Link to="/blog/telegram-ads-fragment-guia-espana" style={linkStyle}>guia de Telegram Ads via
        Fragment</Link>.
      </p>

      <h2 style={h2Style}>Cuanto cuesta anunciarse en Telegram: precios reales 2026</h2>
      <p style={pStyle}>
        Despues de analizar mas de 50 campanas en canales de habla hispana, estos son los rangos reales por
        tamano de canal:
      </p>
      <div style={tableWrap}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Tamano del canal</th>
              <th style={thStyle}>Precio por post</th>
              <th style={thStyle}>CPM estimado</th>
              <th style={thStyle}>Engagement medio</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdStyle}>1.000 - 5.000</td><td style={tdStyle}>10 - 30 EUR</td><td style={tdStyle}>3 - 8 EUR</td><td style={tdStyle}>15 - 25%</td></tr>
            <tr><td style={tdStyle}>5.000 - 20.000</td><td style={tdStyle}>30 - 80 EUR</td><td style={tdStyle}>2 - 5 EUR</td><td style={tdStyle}>10 - 20%</td></tr>
            <tr><td style={tdStyle}>20.000 - 50.000</td><td style={tdStyle}>80 - 200 EUR</td><td style={tdStyle}>1,5 - 4 EUR</td><td style={tdStyle}>8 - 15%</td></tr>
            <tr><td style={tdStyle}>50.000+</td><td style={tdStyle}>200 - 500 EUR</td><td style={tdStyle}>1 - 3 EUR</td><td style={tdStyle}>5 - 12%</td></tr>
          </tbody>
        </table>
      </div>
      <p style={pStyle}>
        Para poner esto en perspectiva: el CPM medio en Instagram Ads en Espana ronda los 6-12 EUR, y en
        Google Ads supera los 15 EUR en nichos competitivos. Telegram ofrece CPMs significativamente mas
        bajos con engagement mucho mas alto. Si comparas plataformas mas en detalle, te interesa la{' '}
        <Link to="/blog/telegram-vs-whatsapp-vs-discord-publicidad" style={linkStyle}>comparativa entre
        Telegram, WhatsApp y Discord</Link>.
      </p>

      <h2 style={h2Style}>Como encontrar canales para anunciarte</h2>

      <h3 style={h3Style}>El problema de buscar solo dentro de Telegram</h3>
      <p style={pStyle}>
        Buscar canales directamente en la app es como buscar restaurantes sin Google Maps. Puedes encontrar
        algunos, pero no tienes forma de verificar calidad, audiencia real o historial. Tres riesgos:
      </p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Suscriptores falsos:</span> canales que inflan numeros con bots. Uno de 50.000 puede tener 2.000 personas reales.</li>
        <li style={liStyle}><span style={strongStyle}>Engagement manipulado:</span> las vistas se compran por centimos. 10.000 vistas no significan nada si son bots.</li>
        <li style={liStyle}><span style={strongStyle}>Cero proteccion de pago:</span> si pagas al administrador y no publica, no hay recurso legal practico.</li>
      </ul>

      <h3 style={h3Style}>La solucion: marketplaces verificados</h3>
      <p style={pStyle}>
        Plataformas como <Link to="/" style={linkStyle}>Channelad</Link> resuelven los tres problemas:
        metricas auditadas (no auto-reportadas), <Link to="/blog/escrow-publicidad-digital" style={linkStyle}>escrow
        automatico</Link> (tu dinero se libera solo cuando el anuncio se publica), vistas y clics
        verificados en tiempo real, y filtros por nicho, idioma y geografia.
      </p>

      <h2 style={h2Style}>Los 5 errores que cometen el 80% de las marcas</h2>

      <h3 style={h3Style}>1. Comprar sin verificar el canal</h3>
      <p style={pStyle}>
        Nunca compres publicidad solo por suscriptores totales. Pide capturas de estadisticas nativas de
        Telegram (las hay desde 2022 para canales) o usa un marketplace que verifique los datos. Si el
        administrador se niega a ensenar metricas reales, asume que esta inflado.
      </p>

      <h3 style={h3Style}>2. Crear anuncios que parecen spam</h3>
      <p style={pStyle}>
        Los miembros de Telegram son especialmente sensibles al spam. Si tu mensaje parece un anuncio
        generico de Facebook, genera rechazo inmediato. Adapta tono, formato y emojis al estilo del canal.
        Lo ideal: que un suscriptor habitual no detecte que es un anuncio hasta llegar al CTA.
      </p>

      <h3 style={h3Style}>3. No incluir un CTA medible</h3>
      <p style={pStyle}>
        Cada publicacion patrocinada necesita un objetivo medible: enlace con UTM, codigo de descuento
        exclusivo, boton de accion. Sin CTA no puedes medir resultados. Sin medir, no sabes si repetir o no.
      </p>

      <h3 style={h3Style}>4. Ignorar el timing</h3>
      <p style={pStyle}>
        Publica cuando la audiencia esta activa. Para canales en Espana, las mejores ventanas son 9-11h y
        19-21h. Para LatAm, ajusta a la zona horaria principal del canal. Pregunta al administrador cual es
        su pico real, no lo asumas.
      </p>

      <h3 style={h3Style}>5. No negociar paquetes</h3>
      <p style={pStyle}>
        Si vas a hacer varias publicaciones, negocia un paquete. La mayoria de administradores ofrecen
        descuentos del 15-30% por 3 o mas posts. Para profundizar en como cierran los creadores las
        negociaciones, mira la{' '}
        <Link to="/blog/negociar-publicidad-telegram" style={linkStyle}>guia de negociacion lado
        creador</Link> (te ayuda a anticipar sus movimientos como anunciante).
      </p>

      <h2 style={h2Style}>Como medir los resultados</h2>
      <p style={pStyle}>
        La medicion en Telegram es mas directa que en redes sociales porque las vistas son reales y no
        infladas por autoplay:
      </p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Vistas del post:</span> Telegram muestra las vistas reales de cada mensaje en directo.</li>
        <li style={liStyle}><span style={strongStyle}>Clics en enlaces:</span> UTM parameters + tu analytics (GA4, Plausible, etc).</li>
        <li style={liStyle}><span style={strongStyle}>Codigos de descuento:</span> uno unico por canal para atribuir ventas con precision.</li>
        <li style={liStyle}><span style={strongStyle}>Crecimiento propio:</span> si tienes canal o cuenta de Telegram, mide cuantos nuevos seguidores llegan despues de cada campana.</li>
      </ul>
      <div style={boxStyle}>
        <p style={{ ...pStyle, marginBottom: '8px', fontWeight: 600 }}>Formula ROAS basica:</p>
        <p style={{ ...pStyle, marginBottom: '8px' }}>ROAS = (Ingresos generados / Coste de la campana) x 100</p>
        <p style={{ ...pStyle, marginBottom: '4px', fontSize: '14px' }}>Ejemplo real:</p>
        <ul style={{ paddingLeft: '20px', margin: 0 }}>
          <li style={{ ...liStyle, fontSize: '14px' }}>Coste: 50 EUR por publicacion en canal de 15.000 suscriptores</li>
          <li style={{ ...liStyle, fontSize: '14px' }}>Clics: 420 (8,4% CTR sobre 5.000 vistas)</li>
          <li style={{ ...liStyle, fontSize: '14px' }}>Conversiones: 18 ventas a 35 EUR = 630 EUR</li>
          <li style={{ ...liStyle, fontSize: '14px' }}>ROAS: 1.260%</li>
        </ul>
      </div>

      <h2 style={h2Style}>Caso practico: 500 EUR de presupuesto, como repartirlos</h2>
      <p style={pStyle}>
        Una marca de finanzas personales con 500 EUR no deberia gastarlos todos en un solo canal grande. La
        estrategia que mejor funciona en mi experiencia:
      </p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>3 canales pequenos (1.000-5.000 subs):</span> 50 EUR cada uno = 150 EUR. Test de creatividades y mensaje.</li>
        <li style={liStyle}><span style={strongStyle}>2 canales medios (5.000-20.000 subs):</span> 75 EUR cada uno = 150 EUR. Validacion con audiencia mayor.</li>
        <li style={liStyle}><span style={strongStyle}>1 canal grande (20.000+):</span> 200 EUR. Solo despues de identificar que mensaje funciona.</li>
      </ul>
      <p style={pStyle}>
        En 2-3 semanas tienes datos reales para decidir donde escalar. Mejor 6 puntos de datos pequenos que
        un punto unico de 500 EUR.
      </p>

      <h2 style={h2Style}>Preguntas frecuentes</h2>

      <h3 style={h3Style}>Cuanto cuesta empezar a anunciarse en Telegram?</h3>
      <p style={pStyle}>
        Con 200-300 EUR puedes lanzar una primera campana minima viable en 2-3 canales pequenos. Para
        resultados estadisticamente fiables, planifica 800-1.500 EUR en 4-6 semanas. Telegram te permite
        empezar con poco y medir canal a canal antes de escalar.
      </p>

      <h3 style={h3Style}>Es legal anunciarse en Telegram en Espana?</h3>
      <p style={pStyle}>
        Si. La publicidad en canales de Telegram esta sujeta a las mismas reglas que cualquier publicidad
        online: declaracion como gasto deducible, factura emitida por el creador o por la plataforma
        intermediaria, y obligacion de marcar la publicacion como contenido patrocinado segun la Ley
        General de Publicidad (mediante #ad, #publi o similar).
      </p>

      <h3 style={h3Style}>Cual es el CPM medio en Telegram en 2026?</h3>
      <p style={pStyle}>
        Varia mucho por nicho. Generalista: 1,5-3 EUR. Tecnologia o marketing: 4-8 EUR. Finanzas e
        inversiones: 5-10 EUR. Cripto: 6-12 EUR. Es una linea de CPM similar a la de Instagram Ads en
        Espana (~5-8 EUR); la ventaja de Telegram no esta en el CPM sino en el mayor engagement y la
        audiencia ya segmentada por nicho.
      </p>

      <h3 style={h3Style}>Puedo usar Telegram Ads (oficial) desde Espana sin invertir 2 millones?</h3>
      <p style={pStyle}>
        No directamente. Pero hay agencias y resellers oficiales que agregan presupuestos de varios
        anunciantes para alcanzar el minimo. La via mas eficiente para pymes sigue siendo la publicidad
        directa en canales a traves de marketplaces verificados.
      </p>

      <h3 style={h3Style}>Cuantos canales necesito para una campana representativa?</h3>
      <p style={pStyle}>
        Minimo 5-6 canales del mismo nicho. Con menos, no puedes distinguir si los resultados son del
        mensaje o del canal especifico. Con 5-6 puntos de datos puedes calcular un CPM medio fiable y
        decidir donde escalar.
      </p>

      <h2 style={h2Style}>Conclusion</h2>
      <p style={pStyle}>
        Telegram es, en 2026, el canal publicitario con mejor relacion coste-rendimiento para marcas que
        quieren llegar a audiencias comprometidas. Los CPMs son bajos, el engagement es real y la
        competencia publicitaria sigue siendo baja comparada con Instagram o Google. La clave esta en
        elegir bien los canales, crear contenido que no parezca spam, y proteger la inversion con pagos
        custodiados.
      </p>
      <p style={pStyle}>
        Si quieres empezar con canales verificados y escrow automatico,{' '}
        <Link to="/" style={linkStyle}>explora el marketplace de Channelad</Link>. Filtras por nicho,
        revisas metricas auditadas y pagas solo cuando el anuncio se publica.
      </p>
    </div>
  )
}
