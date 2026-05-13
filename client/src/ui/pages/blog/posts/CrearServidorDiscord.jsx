import React from 'react'
import { Link } from 'react-router-dom'
import {
  h2Style, h3Style, pStyle, liStyle, linkStyle, strongStyle,
  imgStyle, captionStyle, quoteStyle, boxStyle,
  tableWrap, tableStyle, thStyle, tdStyle,
} from './styles'

export default function CrearServidorDiscord() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0' }}>
      <p style={pStyle}>
        Discord ya no es solo para gamers. En 2026 hay servidores espanoles de finanzas con 80.000 miembros,
        comunidades de marketing pagando 300 EUR por anuncio y proyectos cripto cerrando deals de 5.000 EUR
        por temporada. Pero la mayoria de gente que abre un servidor lo abandona a los 3 meses con 40
        miembros y cero ingresos.
      </p>
      <p style={pStyle}>
        La diferencia no es suerte ni nicho: es estructura. Esta guia recoge el proceso completo para crear
        un servidor de Discord desde cero y prepararlo para monetizar: como elegir nicho, como
        estructurarlo, como conseguir los primeros 1.000 miembros y como cobrar publicidad sin quemar la
        comunidad.
      </p>

      <img src="https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=720&q=80&auto=format" alt="Creador trabajando en un servidor de Discord para monetizarlo" style={imgStyle} loading="lazy" />
      <p style={captionStyle}>Crear y monetizar un servidor de Discord rentable en 2026 — Foto: Unsplash</p>

      <h2 style={h2Style}>Por que Discord es diferente para monetizar</h2>
      <p style={pStyle}>
        Discord tiene una ventaja que ninguna otra plataforma de mensajeria iguala:{' '}
        <span style={strongStyle}>engagement medio del 15-40%</span> frente al 1-3% de Instagram o el 5-15%
        de Telegram. La razon es estructural: en un servidor de Discord la gente conversa, no consume
        pasivamente. Eso convierte a los miembros en compradores cualificados.
      </p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}>Anunciantes pagan mas por miembro activo que en cualquier otra plataforma.</li>
        <li style={liStyle}>Las marcas piden formatos especificos (eventos, roles, AMAs) que no existen en Telegram ni WhatsApp.</li>
        <li style={liStyle}>El valor por miembro real supera los 3-8 EUR/ano en nichos premium, vs 1-3 EUR en Telegram.</li>
      </ul>
      <p style={pStyle}>
        Si quieres entender por que las marcas pagan tanto, te recomiendo la{' '}
        <Link to="/blog/publicidad-discord-marcas" style={linkStyle}>guia de publicidad en Discord para
        marcas</Link>.
      </p>

      <h2 style={h2Style}>Paso 1: Elegir el nicho correcto</h2>
      <p style={pStyle}>
        El error mas comun: abrir un servidor "de gaming general" o "de cosas interesantes". Imposible
        monetizar. El nicho debe cumplir tres condiciones:
      </p>
      <ol style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Audiencia con dinero</span>: profesionales, inversores, hobbyistas activos. No adolescentes.</li>
        <li style={liStyle}><span style={strongStyle}>Marcas anunciandose en el nicho</span>: comprueba que hay sponsors activos en Twitch, YouTube o Telegram del mismo tema.</li>
        <li style={liStyle}><span style={strongStyle}>Tu conoces el tema</span> lo suficiente para moderar 12 meses sin agotarte.</li>
      </ol>

      <h3 style={h3Style}>Nichos rentables en Discord 2026 (Espana)</h3>
      <div style={tableWrap}>
        <table style={tableStyle}>
          <thead>
            <tr><th style={thStyle}>Nicho</th><th style={thStyle}>CPM medio</th><th style={thStyle}>Marcas activas</th><th style={thStyle}>Dificultad</th></tr>
          </thead>
          <tbody>
            <tr><td style={tdStyle}>Cripto / Trading</td><td style={tdStyle}>4 - 10 EUR</td><td style={tdStyle}>Alta</td><td style={tdStyle}>Media</td></tr>
            <tr><td style={tdStyle}>Marketing / SaaS</td><td style={tdStyle}>3 - 8 EUR</td><td style={tdStyle}>Alta</td><td style={tdStyle}>Media</td></tr>
            <tr><td style={tdStyle}>Finanzas / Inversion</td><td style={tdStyle}>3 - 7 EUR</td><td style={tdStyle}>Alta</td><td style={tdStyle}>Media</td></tr>
            <tr><td style={tdStyle}>Gaming competitivo</td><td style={tdStyle}>1,5 - 4 EUR</td><td style={tdStyle}>Alta</td><td style={tdStyle}>Alta</td></tr>
            <tr><td style={tdStyle}>Desarrollo software</td><td style={tdStyle}>2 - 5 EUR</td><td style={tdStyle}>Media</td><td style={tdStyle}>Baja</td></tr>
            <tr><td style={tdStyle}>Diseno / 3D / IA</td><td style={tdStyle}>3 - 6 EUR</td><td style={tdStyle}>Media</td><td style={tdStyle}>Baja</td></tr>
          </tbody>
        </table>
      </div>
      <p style={pStyle}>
        Los nichos B2B (marketing, SaaS, desarrollo) pagan menos por CPM pero las campanas son mucho mas
        grandes y recurrentes que las de gaming.
      </p>

      <h2 style={h2Style}>Paso 2: Estructura del servidor</h2>
      <p style={pStyle}>Un servidor que monetiza tiene exactamente esta estructura. Ni mas ni menos.</p>

      <h3 style={h3Style}>Categorias minimas</h3>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Bienvenida:</span> #reglas, #anuncios, #presentate, #faq</li>
        <li style={liStyle}><span style={strongStyle}>Contenido core:</span> 3-5 canales tematicos segun nicho</li>
        <li style={liStyle}><span style={strongStyle}>Comunidad:</span> #general, #off-topic, #recursos</li>
        <li style={liStyle}><span style={strongStyle}>Voz:</span> 2-3 canales (eventos, study together, chat libre)</li>
        <li style={liStyle}><span style={strongStyle}>Premium / Patrocinados:</span> oculta hasta tener primer sponsor</li>
      </ul>

      <h3 style={h3Style}>Reglas del primer dia</h3>
      <p style={pStyle}>Antes de invitar a una sola persona, configura:</p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Auto-rol al entrar</span> (verificacion captcha contra bots)</li>
        <li style={liStyle}><span style={strongStyle}>Reglas claras</span> en #reglas con consecuencias por incumplimiento</li>
        <li style={liStyle}><span style={strongStyle}>AutoMod nativo</span> de Discord (filtros de spam, links, palabras prohibidas)</li>
        <li style={liStyle}><span style={strongStyle}>Roles segmentados:</span> @miembro, @activo, @veterano, @booster, @sponsor (cuando llegue)</li>
        <li style={liStyle}><span style={strongStyle}>Onboarding</span> configurado con la herramienta nativa de Discord</li>
      </ul>
      <div style={quoteStyle}>
        El error que mata el 80% de los servidores: abrir sin reglas claras y empezar a banear gente
        despues. Genera resentimiento y mata el crecimiento organico.
      </div>

      <h2 style={h2Style}>Paso 3: Los primeros 100 miembros (cero presupuesto)</h2>
      <p style={pStyle}>
        Estos 100 son los mas dificiles. Sin ellos, nadie quiere entrar. Cinco tacticas que funcionan:
      </p>

      <h3 style={h3Style}>1. Convoca a tu red personal</h3>
      <p style={pStyle}>
        20-30 personas de tu red profesional/personal que coincidan con el nicho. No mandes invitaciones
        genericas: explica que has creado un espacio especifico y que su perspectiva ayuda. La mayoria entra
        por respeto y se queda si el contenido vale.
      </p>

      <h3 style={h3Style}>2. Cross-posting en comunidades existentes</h3>
      <p style={pStyle}>
        Identifica 5-10 servidores grandes del mismo nicho (sin competir directamente) y pide al admin si
        puedes hacer un anuncio en su #autopromocion. La mitad acepta sin pedir nada a cambio si el
        contenido es de calidad.
      </p>

      <h3 style={h3Style}>3. Reddit en subreddits verticales</h3>
      <p style={pStyle}>
        Un post de calidad en r/[tu nicho] explicando que ofrece el servidor. No spammees. Aporta valor
        primero, menciona el server al final. r/discordservers tambien funciona pero la calidad de trafico
        es baja.
      </p>

      <h3 style={h3Style}>4. Twitter/X con threads</h3>
      <p style={pStyle}>
        Threads tecnicos en tu nicho cerrando con "lo profundizo en mi servidor de Discord [enlace]".
        Funciona muy bien si tu cuenta tiene 1.000+ followers en el nicho.
      </p>

      <h3 style={h3Style}>5. Colaboraciones cruzadas</h3>
      <p style={pStyle}>
        Identifica creadores con cuentas similares y propon eventos conjuntos: AMAs, debates, study
        sessions. El otro creador gana contenido, tu ganas exposicion.
      </p>

      <h2 style={h2Style}>Paso 4: De 100 a 1.000 (donde se monetiza)</h2>
      <p style={pStyle}>
        Con 100 miembros validas el concepto. Con 1.000 ya puedes monetizar. La diferencia entre uno y otro
        es <span style={strongStyle}>publicar contenido de forma consistente</span> durante 3-6 meses.
      </p>

      <h3 style={h3Style}>Calendario minimo de contenido</h3>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Diario:</span> noticia, recurso o pregunta del dia (15 min)</li>
        <li style={liStyle}><span style={strongStyle}>Semanal:</span> thread profundo o resumen (2h)</li>
        <li style={liStyle}><span style={strongStyle}>Mensual:</span> evento de voz, AMA o sesion en directo (3-4h)</li>
      </ul>

      <h3 style={h3Style}>Senales de que estas listo para monetizar</h3>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}>500+ miembros activos (no totales: han hablado en los ultimos 30 dias)</li>
        <li style={liStyle}>15%+ de DAU sobre miembros totales</li>
        <li style={liStyle}>3 meses de publicacion consistente</li>
        <li style={liStyle}>Comunidad que conversa sola sin moderacion intensiva</li>
      </ul>

      <h2 style={h2Style}>Paso 5: Como cobrar publicidad en tu servidor</h2>
      <p style={pStyle}>Discord acepta cinco formatos principales de patrocinio:</p>

      <h3 style={h3Style}>1. Post en canal de #anuncios</h3>
      <p style={pStyle}>
        Mensaje fijado durante 24-72h. Es el formato mas vendible: precio entre 30 y 200 EUR segun tamano y
        nicho.
      </p>

      <h3 style={h3Style}>2. Rol patrocinador</h3>
      <p style={pStyle}>
        La marca aparece con un rol coloreado, acceso a un canal exclusivo y mencion en bienvenidas durante
        1-3 meses. Precio: 200-800 EUR/mes.
      </p>

      <h3 style={h3Style}>3. Evento patrocinado</h3>
      <p style={pStyle}>
        Una sesion de voz con la marca presentando producto, AMA o talleres. Es el formato con mayor
        conversion para el anunciante: 150-500 EUR por evento.
      </p>

      <h3 style={h3Style}>4. Bot personalizado</h3>
      <p style={pStyle}>
        Una marca patrocina un bot que aporta valor real (calculadora, alertas, dashboards). Patrocinio
        mensual recurrente de 300-1.000 EUR.
      </p>

      <h3 style={h3Style}>5. Programa de afiliados nativo</h3>
      <p style={pStyle}>
        Comision por venta sin coste fijo para la marca. Bueno para empezar antes de tener trafico para
        vender patrocinios fijos.
      </p>

      <h3 style={h3Style}>Formula de precios</h3>
      <div style={boxStyle}>
        <p style={{ ...pStyle, marginBottom: '8px', fontWeight: 600 }}>Precio post = (Miembros activos x CPM del nicho) / 1.000</p>
        <p style={{ ...pStyle, marginBottom: '4px', fontSize: '14px' }}>Ejemplo: 5.000 miembros activos en nicho de marketing</p>
        <ul style={{ paddingLeft: '20px', margin: 0 }}>
          <li style={{ ...liStyle, fontSize: '14px' }}>Post estandar = (5.000 x 5 EUR) / 1.000 = 25 EUR</li>
          <li style={{ ...liStyle, fontSize: '14px' }}>Post fijado 48h = 25 EUR x 2 = 50 EUR</li>
          <li style={{ ...liStyle, fontSize: '14px' }}>Evento patrocinado = 25 EUR x 6 = 150 EUR</li>
        </ul>
      </div>
      <p style={pStyle}>
        Para ver la formula aplicada a otros canales, mira la{' '}
        <Link to="/blog/calculadora-precios-publicidad" style={linkStyle}>calculadora interactiva de
        precios</Link>.
      </p>

      <h2 style={h2Style}>Paso 6: Conseguir el primer anunciante</h2>
      <p style={pStyle}>Cuatro vias en orden de dificultad:</p>

      <h3 style={h3Style}>Via 1: Outreach a marcas activas en tu nicho</h3>
      <p style={pStyle}>
        Identifica 20 marcas que ya se anuncian en Twitch, YouTube o Telegram del mismo tema. Mandales un
        media kit personalizado. Tasa de respuesta: 5-10%, conversion: 1-3%. Lento pero gratis.
      </p>

      <h3 style={h3Style}>Via 2: Programas de afiliados</h3>
      <p style={pStyle}>
        Apuntate a 5-10 programas de afiliados de marcas relevantes. Empiezas a generar ingresos hoy mismo
        sin necesidad de vender patrocinios fijos. Complemento perfecto al outreach.
      </p>

      <h3 style={h3Style}>Via 3: Marketplaces especializados</h3>
      <p style={pStyle}>
        Plataformas como <Link to="/" style={linkStyle}>Channelad</Link> listan servidores y conectan con
        anunciantes verificados. Pago via{' '}
        <Link to="/blog/escrow-publicidad-digital" style={linkStyle}>escrow</Link>, metricas auditadas y
        cero outreach manual. Lo que recomiendo para creadores que no quieren pasar 10h/semana negociando.
      </p>

      <h3 style={h3Style}>Via 4: Newsletter de marcas patrocinadoras</h3>
      <p style={pStyle}>
        Una vez tienes 3-5 clientes, crea un mailing trimestral con sponsorship opportunities. Los
        anunciantes recurrentes se autogestionan.
      </p>

      <h2 style={h2Style}>Los 5 errores que matan la monetizacion</h2>

      <h3 style={h3Style}>1. Saltar a vender publicidad antes de tiempo</h3>
      <p style={pStyle}>
        Con 200 miembros mediocres, vender un patrocinio quema tu credibilidad y el anunciante no repite.
        Espera a tener metricas reales y comunidad activa.
      </p>

      <h3 style={h3Style}>2. Aceptar marcas que no encajan con la audiencia</h3>
      <p style={pStyle}>
        Una marca de cripto en un servidor de fotografia. Aunque pague el doble, destruye la confianza de
        los miembros y los pierdes para siempre.
      </p>

      <h3 style={h3Style}>3. Sobrecargar el servidor de anuncios</h3>
      <p style={pStyle}>
        Una regla simple: maximo 1 patrocinio cada 7-10 posts organicos. Mas que eso y la comunidad se va.
      </p>

      <h3 style={h3Style}>4. No tener media kit profesional</h3>
      <p style={pStyle}>
        Las marcas serias piden un documento con metricas, demografia y formatos. Sin el, no te toman en
        serio. Mira la{' '}
        <Link to="/blog/media-kit-servidor-discord" style={linkStyle}>guia de media kit para servidores de
        Discord</Link> para crearlo bien.
      </p>

      <h3 style={h3Style}>5. Cobrar por adelantado sin escrow</h3>
      <p style={pStyle}>
        Si una marca no acepta pagar mediante escrow, probablemente no va a pagar. Usa siempre{' '}
        <Link to="/blog/escrow-publicidad-digital" style={linkStyle}>pago custodiado</Link> o marketplaces
        que lo incluyan por defecto.
      </p>

      <h2 style={h2Style}>Preguntas frecuentes</h2>

      <h3 style={h3Style}>Cuantos miembros necesito para empezar a monetizar un servidor de Discord?</h3>
      <p style={pStyle}>
        Puedes empezar a vender publicidad desde 500 miembros activos. El punto optimo es a partir de 2.000
        miembros, donde las marcas pagan tarifas competitivas. Activos significa que han hablado en los
        ultimos 30 dias, no miembros totales.
      </p>

      <h3 style={h3Style}>Cuanto se puede ganar al mes con un servidor de Discord en 2026?</h3>
      <p style={pStyle}>
        Servidores de 2.000-5.000 miembros activos generan 100-400 EUR/mes. Los de 5.000-15.000 miembros
        activos suelen estar entre 300 y 1.200 EUR/mes. En nichos premium (cripto, marketing, finanzas) un
        servidor de 20.000+ puede superar los 3.000 EUR/mes combinando patrocinios y afiliados.
      </p>

      <h3 style={h3Style}>Es legal monetizar un servidor de Discord en Espana?</h3>
      <p style={pStyle}>
        Si. Discord permite la monetizacion siempre que cumplas los terminos de servicio (sin contenido
        prohibido) y que declares los ingresos en Hacienda. Si monetizas de forma regular, necesitas alta
        en Hacienda (modelo 036/037).
      </p>

      <h3 style={h3Style}>Discord paga directamente a los creadores?</h3>
      <p style={pStyle}>
        Discord tiene roles premium ("Server Subscriptions") donde los miembros pagan al creador y Discord
        se queda un 10%. Pero la mayoria de ingresos aun viene de patrocinios directos a marcas, no de
        Discord como plataforma.
      </p>

      <h3 style={h3Style}>Cuanto tiempo se tarda en llegar a 1.000 miembros?</h3>
      <p style={pStyle}>
        Con publicacion consistente y estrategia activa de crecimiento, entre 3 y 6 meses. Sin estrategia,
        puede tardar 12 meses o mas. Los servidores que llegan a 1.000 en menos de 3 meses suelen tener un
        creador con audiencia previa en YouTube, Twitch o Twitter.
      </p>

      <h2 style={h2Style}>Conclusion</h2>
      <p style={pStyle}>
        Crear un servidor de Discord rentable en 2026 es mas accesible que crear un canal de YouTube y mas
        rentable por miembro que cualquier otra plataforma de mensajeria. La clave es eleccion correcta de
        nicho, estructura desde el primer dia, contenido consistente y paciencia en los primeros 6 meses.
      </p>
      <p style={pStyle}>
        Si tu servidor ya tiene 500+ miembros activos y quieres conseguir tu primer anunciante sin pasar
        semanas haciendo outreach, <Link to="/" style={linkStyle}>publica tu servidor en Channelad</Link>.
        Las marcas te encontraran ellas, con pago via escrow y tarifas que tu fijas. Gratis para creadores.
      </p>
    </div>
  )
}
