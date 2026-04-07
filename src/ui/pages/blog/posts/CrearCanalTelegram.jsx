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

export default function CrearCanalTelegram() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0' }}>

      {/* ─── Personal intro ─── */}
      <p style={pStyle}>
        Si estas leyendo esto es porque quieres crear un canal de Telegram que genere dinero.
        No uno que acumule suscriptores muertos. Uno que facture. Y para eso necesitas hacer
        las cosas bien desde el principio, porque los errores de los primeros meses son los
        mas caros de todos.
      </p>
      <p style={pStyle}>
        Un canal de Telegram bien gestionado puede llegar a 8.000
        suscriptores y generar entre 600 y 800 EUR al mes en publicidad. Pero los tres primeros
        meses son criticos: elegir un nicho demasiado amplio, publicar sin
        consistencia o no conocer los marketplaces de publicidad son errores que cuestan caro. Esta guia
        recoge todo lo que un creador necesita saber antes de empezar.
      </p>
      <p style={pStyle}>
        Esta guia va paso a paso, desde la eleccion del nicho hasta cobrar tu primer anuncio.
        No es teoria. Es el proceso que los creadores que monetizan con exito han seguido y que
        recomendamos si empiezas hoy desde cero. Si ya tienes un canal y quieres monetizarlo directamente, salta al{' '}
        <Link to="/blog/monetizar-canal-telegram-espana" style={linkStyle}>
          articulo sobre como monetizar un canal de Telegram
        </Link>{' '}
        donde detallo las plataformas y los errores que debes evitar. Si lo que quieres es
        saber cuanto cobrar, lee la{' '}
        <Link to="/blog/cuanto-cobrar-publicidad-telegram" style={linkStyle}>
          guia de precios de publicidad en Telegram
        </Link>.
      </p>

      <img
        src="https://images.unsplash.com/photo-1611746872915-64382b5c76da?w=720&q=80&auto=format"
        alt="Persona creando un canal de Telegram en su smartphone"
        style={imgStyle}
        loading="lazy"
      />
      <p style={captionStyle}>Crear un canal rentable empieza por decisiones correctas en los primeros dias -- Foto: Unsplash</p>

      {/* ─── Paso 1: Nicho ─── */}
      <h2 style={h2Style}>Paso 1 -- Elegir el nicho correcto (el paso que mas importa)</h2>
      <p style={pStyle}>
        La eleccion del nicho determina todo lo que viene despues: cuanto vas a cobrar por publicidad,
        que tipo de anunciantes te van a buscar, y lo facil o dificil que va a ser crecer. Elegir mal
        esta decision es el error mas caro que puedes cometer, porque no lo descubres hasta meses
        despues, cuando ya has invertido cientos de horas de contenido en un nicho que no monetiza.
      </p>
      <p style={pStyle}>
        No basta con elegir algo que te guste. Un buen nicho para monetizar en Telegram cumple tres
        condiciones:
      </p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}>
          <span style={strongStyle}>Hay audiencia en Telegram.</span> Suena obvio, pero no todos
          los temas funcionan en Telegram. Finanzas, tecnologia, cripto, marketing, gaming, ofertas
          y educacion son los nichos con mas demanda en espanol. Cocina, viajes y lifestyle tienen
          menos traccion aqui (funcionan mejor en Instagram o TikTok).
        </li>
        <li style={liStyle}>
          <span style={strongStyle}>El CPM del nicho es alto.</span> El CPM (Coste Por Mil
          impresiones) determina cuanto puedes cobrar. Un canal de finanzas con 3.000 suscriptores
          puede ganar lo mismo que uno de memes con 30.000. Consulta la{' '}
          <Link to="/blog/cuanto-cobrar-publicidad-telegram" style={linkStyle}>
            tabla de CPMs por nicho
          </Link>{' '}
          antes de decidir.
        </li>
        <li style={liStyle}>
          <span style={strongStyle}>Puedes publicar contenido de forma consistente.</span> Si eliges
          un nicho que no dominas, vas a quemarte en dos meses. La monetizacion es un juego de largo
          plazo: necesitas publicar a diario durante al menos 3-6 meses antes de ver ingresos reales.
        </li>
      </ul>

      <h3 style={h3Style}>Los 5 nichos mas rentables en Telegram en espanol (2026)</h3>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Nicho</th>
              <th style={thStyle}>CPM medio</th>
              <th style={thStyle}>Dificultad de crecimiento</th>
              <th style={thStyle}>Competencia</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdFirstStyle}>Finanzas / Inversiones</td><td style={tdStyle}>7,5 EUR</td><td style={tdStyle}>Media</td><td style={tdStyle}>Media-alta</td></tr>
            <tr><td style={tdFirstStyle}>Cripto / Trading</td><td style={tdStyle}>9 EUR</td><td style={tdStyle}>Media</td><td style={tdStyle}>Alta</td></tr>
            <tr><td style={tdFirstStyle}>Tecnologia / Software</td><td style={tdStyle}>6 EUR</td><td style={tdStyle}>Baja-media</td><td style={tdStyle}>Media</td></tr>
            <tr><td style={tdFirstStyle}>Marketing / Negocios</td><td style={tdStyle}>4,5 EUR</td><td style={tdStyle}>Media</td><td style={tdStyle}>Media</td></tr>
            <tr><td style={tdFirstStyle}>Ofertas / Cashback</td><td style={tdStyle}>3 EUR</td><td style={tdStyle}>Baja</td><td style={tdStyle}>Baja-media</td></tr>
          </tbody>
        </table>
      </div>

      <p style={pStyle}>
        La recomendacion para alguien que empieza: tecnologia o finanzas personales. Tienen buen CPM,
        la audiencia esta hambrienta de contenido en espanol, y la competencia no es tan brutal como
        en cripto. En cripto el CPM es el mas alto, pero la audiencia es la mas volatil y la
        competencia es feroz. Tecnologia tiene la mejor relacion esfuerzo-resultado para un
        principiante.
      </p>

      <h3 style={h3Style}>Como validar tu nicho antes de crear el canal</h3>
      <p style={pStyle}>
        Antes de crear nada, haz esto. Te va a ahorrar meses de trabajo en el nicho equivocado:
      </p>
      <ol style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}>
          <span style={strongStyle}>Busca canales existentes.</span> Usa TGStat o la busqueda de
          Telegram. Si hay al menos 10-15 canales activos en espanol con mas de 1.000 suscriptores
          en tu nicho, hay demanda suficiente.
        </li>
        <li style={liStyle}>
          <span style={strongStyle}>Mira si hay anunciantes gastando dinero.</span> Si ves posts
          patrocinados en esos canales, es senal clara de que hay presupuesto publicitario. Si nadie
          paga publicidad en ese nicho, vas a tener problemas para monetizar.
        </li>
        <li style={liStyle}>
          <span style={strongStyle}>Piensa en 30 ideas de publicaciones.</span> Si te cuestan mas
          de 20 minutos, probablemente no dominas suficiente el tema para mantener un ritmo diario
          durante meses.
        </li>
      </ol>

      {/* ─── Paso 2: Crear el canal ─── */}
      <h2 style={h2Style}>Paso 2 -- Crear el canal: configuracion tecnica</h2>
      <p style={pStyle}>
        La parte tecnica es simple, pero hay detalles que marcan la diferencia entre un canal que
        parece profesional desde el primer dia y uno que parece improvisado. Los anunciantes revisan
        la apariencia del canal antes de invertir, y las primeras impresiones importan.
      </p>

      <h3 style={h3Style}>Tutorial paso a paso</h3>
      <ol style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}>
          Abre Telegram y pulsa en el boton de nuevo mensaje. Selecciona "Nuevo canal".
        </li>
        <li style={liStyle}>
          <span style={strongStyle}>Elige un nombre con palabra clave.</span> "Finanzas Personales ES"
          funciona mucho mejor que "Mi canal de pasta". Google y la busqueda interna de Telegram indexan
          el nombre del canal, asi que cada palabra cuenta para el SEO.
        </li>
        <li style={liStyle}>
          Anade una descripcion clara de una linea: que ofreces, para quien, y con que frecuencia.
          Incluye un hashtag del nicho. Los usuarios deciden si suscribirse en los primeros 3 segundos
          leyendo la descripcion.
        </li>
        <li style={liStyle}>
          Selecciona "Canal publico" y elige un @username corto y memorable. Evita numeros y guiones
          bajos. Un username limpio transmite profesionalidad.
        </li>
        <li style={liStyle}>
          Sube una foto de perfil profesional. Nada de selfies ni logos pixelados. Puedes crear una
          gratis en Canva con el template de "logo circular". Dedicale 15 minutos a esto porque es lo
          primero que ve cualquier persona.
        </li>
      </ol>

      <h3 style={h3Style}>Configuracion recomendada</h3>
      <p style={pStyle}>
        Estos son los ajustes recomendados para cualquier canal desde el dia uno:
      </p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}>
          <span style={strongStyle}>Canal publico (no privado).</span> Los canales publicos son indexados
          por Google y aparecen en la busqueda de Telegram. Esto es trafico gratis que un canal privado
          nunca tendra. El unico motivo para hacerlo privado es si vendes suscripciones premium.
        </li>
        <li style={liStyle}>
          <span style={strongStyle}>Sin grupo de comentarios al principio.</span> Los comentarios distraen
          y moderarlos consume tiempo que no tienes cuando empiezas. Anade un grupo de discusion cuando
          llegues a 2.000+ suscriptores y tengas una comunidad que se automodera.
        </li>
        <li style={liStyle}>
          <span style={strongStyle}>Mensaje fijado de presentacion.</span> Tu primer mensaje deberia
          explicar quien eres, que van a encontrar en el canal y por que deberian quedarse. Actualizalo
          cada mes con tus mejores publicaciones recientes.
        </li>
        <li style={liStyle}>
          <span style={strongStyle}>Bot de estadisticas desde el dia 1.</span> Configura TGStat o un bot
          similar para trackear metricas desde el primer post. Cuando llegue el momento de monetizar, vas
          a necesitar ese historico de datos. Empezar a medir despues de 6 meses es tirar informacion a la
          basura.
        </li>
      </ul>

      {/* ─── Paso 3: Contenido ─── */}
      <h2 style={h2Style}>Paso 3 -- Estrategia de contenido para los primeros 90 dias</h2>
      <p style={pStyle}>
        Los primeros 90 dias son criticos. Es el periodo donde estableces la confianza con tu audiencia
        y generas el historico de contenido que los anunciantes van a revisar antes de invertir un solo
        euro. Si publicas de forma inconsistente o sin calidad durante este periodo, estas plantando las
        semillas de un canal que nunca va a monetizar.
      </p>

      <h3 style={h3Style}>Frecuencia de publicacion por nicho</h3>
      <p style={pStyle}>
        No todos los nichos requieren la misma frecuencia. Publicar demasiado en un nicho tranquilo satura
        a tu audiencia. Publicar poco en un nicho rapido te hace irrelevante. Estos son los rangos que
        funcionan:
      </p>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Nicho</th>
              <th style={thStyle}>Frecuencia recomendada</th>
              <th style={thStyle}>Mejor horario</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdFirstStyle}>Finanzas</td><td style={tdStyle}>1-2 posts/dia</td><td style={tdStyle}>8:00-9:00 y 20:00-21:00</td></tr>
            <tr><td style={tdFirstStyle}>Tecnologia</td><td style={tdStyle}>1-3 posts/dia</td><td style={tdStyle}>9:00-10:00 y 18:00-19:00</td></tr>
            <tr><td style={tdFirstStyle}>Cripto</td><td style={tdStyle}>2-5 posts/dia</td><td style={tdStyle}>10:00-11:00 y 22:00-23:00</td></tr>
            <tr><td style={tdFirstStyle}>Marketing</td><td style={tdStyle}>1 post/dia</td><td style={tdStyle}>9:00-10:00</td></tr>
            <tr><td style={tdFirstStyle}>Ofertas</td><td style={tdStyle}>3-8 posts/dia</td><td style={tdStyle}>Todo el dia, picos a las 12:00 y 19:00</td></tr>
          </tbody>
        </table>
      </div>

      <h3 style={h3Style}>Tipos de contenido que crecen mas rapido</h3>
      <p style={pStyle}>
        Segun el analisis de canales activos en el mercado hispanohablante,
        estos son los cuatro formatos que mejor funcionan para crecer:
      </p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}>
          <span style={strongStyle}>Analisis y opiniones propias.</span> No repostees noticias sin anadir
          valor. Tu opinion es lo que diferencia tu canal de un RSS automatizado. Los suscriptores se
          quedan por tu perspectiva, no por la noticia que pueden leer en cualquier sitio.
        </li>
        <li style={liStyle}>
          <span style={strongStyle}>Listas y rankings.</span> "Los 5 mejores brokers para principiantes"
          se comparte mucho mas que un analisis denso de 2.000 palabras. Las listas son el formato mas
          viral en Telegram.
        </li>
        <li style={liStyle}>
          <span style={strongStyle}>Alertas y oportunidades.</span> Contenido de urgencia ("esto acaba
          hoy", "nueva oferta limitada") genera engagement inmediato y notificaciones push que tus
          suscriptores ven al instante.
        </li>
        <li style={liStyle}>
          <span style={strongStyle}>Tutoriales paso a paso.</span> El contenido educativo retiene
          suscriptores a largo plazo. La gente no se da de baja de un canal que le ensena algo nuevo
          cada semana.
        </li>
      </ul>

      <h3 style={h3Style}>La regla de contenido que los mejores canales no rompen</h3>
      <p style={pStyle}>
        Al menos un post de valor real al dia (analisis, tutorial, lista) y maximo uno de
        relleno (reposteo, enlace sin contexto). La proporcion 80% valor / 20% relleno es la que
        mejor funciona para mantener el engagement por encima del 40%. Cuando se rompe esta
        regla, el engagement cae visiblemente en cuestion
        de dias. Los suscriptores notan la diferencia entre contenido cuidado y contenido de relleno.
        Y los anunciantes tambien.
      </p>

      <img
        src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=720&q=80&auto=format"
        alt="Graficas de crecimiento y analiticas de engagement de un canal digital"
        style={imgStyle}
        loading="lazy"
      />
      <p style={captionStyle}>El contenido consistente y de calidad es lo que convierte suscriptores en ingresos -- Foto: Unsplash</p>

      {/* ─── Paso 4: Crecer ─── */}
      <h2 style={h2Style}>Paso 4 -- Crecer de 0 a 1.000 suscriptores sin pagar</h2>
      <p style={pStyle}>
        Los primeros 1.000 suscriptores son los mas dificiles. Despues de eso, el crecimiento
        organico se acelera porque Telegram empieza a recomendar tu canal en busquedas y
        sugerencias. Un canal tipico tarda entre seis semanas y tres meses en llegar a 1.000 con las tacticas correctas. Estas son las que mejor funcionan:
      </p>

      <h3 style={h3Style}>Cross-posting en grupos del mismo nicho</h3>
      <p style={pStyle}>
        Participa activamente en 5-10 grupos de Telegram de tu nicho. No spamees tu canal. Aporta
        valor real: responde preguntas, comparte opiniones, ayuda a otros miembros. Pon el enlace
        a tu canal en tu bio de Telegram. Los usuarios curiosos lo visitaran de forma natural. Esta
        tactica genera tipicamente los primeros 100-200 suscriptores sin invertir un centimo.
      </p>

      <h3 style={h3Style}>Colaboraciones con otros canales</h3>
      <p style={pStyle}>
        Contacta a 3-5 canales de tamano similar (o ligeramente mayor) y propone intercambio de
        menciones: tu mencionas su canal, ellos mencionan el tuyo. Es gratis, ambos ganan, y la
        audiencia compartida es relevante porque esta en el mismo nicho. Cada intercambio suele
        generar entre 50 y 150 suscriptores nuevos. Haz uno por semana durante los dos primeros
        meses.
      </p>

      <h3 style={h3Style}>Redes sociales como fuente de trafico</h3>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}>
          <span style={strongStyle}>Twitter/X:</span> comparte el contenido de tu canal con un
          enlace directo. Los hilos de Twitter que terminan con "si quieres mas, unete a mi canal
          de Telegram" funcionan sorprendentemente bien. Un hilo viral puede traerte 300 suscriptores
          en un dia.
        </li>
        <li style={liStyle}>
          <span style={strongStyle}>Reddit:</span> participa en subreddits de tu nicho. No spamees,
          pero puedes mencionar tu canal cuando sea genuinamente relevante. Reddit valora la
          autenticidad y penaliza la autopromocion descarada.
        </li>
        <li style={liStyle}>
          <span style={strongStyle}>LinkedIn:</span> para nichos B2B (marketing, tecnologia,
          finanzas), LinkedIn es una fuente de trafico de alta calidad. Un post de valor en LinkedIn
          con un enlace a tu canal puede traer suscriptores con perfil profesional que interesan
          mucho a los anunciantes.
        </li>
      </ul>

      <h3 style={h3Style}>Lo que NO funciona</h3>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}>
          <span style={strongStyle}>Comprar suscriptores:</span> se detecta al instante, destruye
          tu engagement real y te descalifica de cualquier marketplace serio. Hay canales con
          50.000 suscriptores y 200 vistas por post. Nadie paga publicidad ahi.
        </li>
        <li style={liStyle}>
          <span style={strongStyle}>Sorteos masivos:</span> atraen suscriptores que solo quieren
          el premio. El 80% se dan de baja en la primera semana. Es dinero tirado.
        </li>
        <li style={liStyle}>
          <span style={strongStyle}>Spam en grupos:</span> te banean y destruyes tu reputacion
          en la comunidad de Telegram de tu nicho. La reputacion es un activo que tarda meses en
          construirse y segundos en destruirse.
        </li>
      </ul>

      {/* ─── Paso 5: Monetizar ─── */}
      <h2 style={h2Style}>Paso 5 -- Cuando y como empezar a monetizar</h2>

      <h3 style={h3Style}>El minimo viable: 500 suscriptores activos</h3>
      <p style={pStyle}>
        La mayoria de marketplaces y anunciantes directos consideran que un canal es monetizable
        a partir de 500 suscriptores activos (no totales, activos). En{' '}
        <Link to="/para-canales" style={linkStyle}>Channelad</Link>, el umbral de entrada es 500
        suscriptores verificados con un engagement minimo del 15%. Si aun no llegas, no te frustres:
        concentra tu energia en contenido y crecimiento. El dinero llega despues de la audiencia,
        nunca antes.
      </p>

      <h3 style={h3Style}>Que metricas mirar antes de ofrecer publicidad</h3>
      <p style={pStyle}>
        Antes de enviar tu primera propuesta a un anunciante o registrarte en un marketplace,
        asegurate de que tus numeros cuentan una historia convincente:
      </p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}>
          <span style={strongStyle}>Vistas medias por post en 24h:</span> deberia ser al menos el
          20% de tus suscriptores. Si publicas a 2.000 suscriptores y tienes 100 vistas, hay un
          problema de engagement que necesitas resolver antes de monetizar.
        </li>
        <li style={liStyle}>
          <span style={strongStyle}>Tasa de crecimiento semanal:</span> un canal saludable crece al
          menos un 2-3% semanal de forma organica. Si estas estancado, trabaja primero en las
          tacticas del Paso 4.
        </li>
        <li style={liStyle}>
          <span style={strongStyle}>Tasa de reenvios:</span> si tus posts se reenvian frecuentemente,
          es senal de contenido de calidad que los anunciantes van a valorar. Esta metrica es mas
          importante de lo que la mayoria de creadores creen.
        </li>
      </ul>

      <h3 style={h3Style}>Cuanto cobrar al principio</h3>
      <p style={pStyle}>
        La formula base es sencilla: (Suscriptores activos x CPM de tu nicho) / 1.000. Para un
        canal nuevo sin historial de campanas, aplica el CPM minimo de tu nicho, no el medio. Es
        mejor empezar con un precio competitivo, generar historial y datos de rendimiento, y subir
        despues con datos que justifiquen el aumento. Un canal tipico empieza cobrando 35 EUR por post con 2.500
        suscriptores. Con 8.000 suscriptores y un historial de campanas exitosas,
        puede cobrar 110 EUR o mas.
      </p>
      <p style={pStyle}>
        Para la calculadora interactiva y datos detallados por nicho, consulta la{' '}
        <Link to="/blog/cuanto-cobrar-publicidad-telegram" style={linkStyle}>
          guia completa de precios de publicidad en Telegram
        </Link>.
      </p>

      {/* ─── Paso 6: Channelad ─── */}
      <h2 style={h2Style}>Paso 6 -- Registrarse en Channelad y recibir tu primer pedido</h2>
      <p style={pStyle}>
        El paso final es registrar tu canal en un marketplace que te conecte con anunciantes de
        forma automatica.{' '}
        <Link to="/para-canales" style={linkStyle}>Channelad</Link> es el unico marketplace
        de publicidad en comunidades enfocado en el mercado hispanohablante con sistema de escrow
        (pago custodiado). A diferencia de plataformas como Telega.in o Collaborator, Channelad esta
        disenado para conectar creadores con anunciantes que buscan audiencia
        en espanol.
      </p>

      <h3 style={h3Style}>Que necesitas para registrarte</h3>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}>Un canal publico de Telegram con mas de 500 suscriptores activos</li>
        <li style={liStyle}>Contenido publicado de forma consistente (al menos 30 dias de historico)</li>
        <li style={liStyle}>Engagement minimo del 15% (verificado automaticamente por la plataforma)</li>
      </ul>

      <h3 style={h3Style}>Como funciona el proceso</h3>
      <ol style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}>
          <span style={strongStyle}>Te registras y conectas tu canal.</span> El proceso tarda menos
          de 5 minutos. Conectas tu canal de Telegram y la plataforma extrae las metricas
          automaticamente.
        </li>
        <li style={liStyle}>
          <span style={strongStyle}>Verificacion automatica.</span> Channelad verifica que tus
          suscriptores son reales, que tu engagement cumple el minimo y que tu contenido es de
          calidad. Esto protege tanto a creadores como a anunciantes.
        </li>
        <li style={liStyle}>
          <span style={strongStyle}>Defines formatos y precios.</span> Estableces que formatos
          ofreces (post estandar, fijado 24h, mencion en contenido organico) y a que precio.
          Puedes actualizarlos en cualquier momento.
        </li>
        <li style={liStyle}>
          <span style={strongStyle}>Recibes propuestas.</span> Los anunciantes navegan el{' '}
          <Link to="/marketplace" style={linkStyle}>marketplace</Link>, revisan tus estadisticas
          verificadas y te envian propuestas de campana directamente.
        </li>
        <li style={liStyle}>
          <span style={strongStyle}>Publicas y cobras con escrow.</span> Aceptas o rechazas cada
          propuesta. Si aceptas, el anunciante deposita el pago antes de que publiques nada. Al
          confirmar la publicacion, el pago se libera automaticamente. Sin perseguir pagos, sin
          riesgo de impago.
        </li>
      </ol>

      <p style={pStyle}>
        Este sistema cambia la forma de trabajar de los creadores. En lugar de dedicar horas a negociar por DM, enviar
        capturas de metricas manualmente y esperar a que paguen, reciben propuestas con un
        clic, publican y cobran de forma automatica. La diferencia en tiempo y tranquilidad es enorme.
      </p>
      <p style={pStyle}>
        Para la guia completa de monetizacion con todos los errores que debes evitar y la comparativa
        detallada de plataformas, lee el{' '}
        <Link to="/blog/monetizar-canal-telegram-espana" style={linkStyle}>
          articulo sobre como monetizar un canal de Telegram en Espana
        </Link>.
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
          Tu canal esta listo. Ahora monetizalo.
        </h2>
        <p style={{ ...pStyle, color: 'var(--muted)', marginBottom: '20px', maxWidth: '520px', margin: '0 auto 20px' }}>
          Registra tu canal en Channelad, pasa la verificacion automatica y empieza a recibir propuestas
          de anunciantes verificados con pago protegido por escrow. Sin perseguir pagos, sin
          intermediarios, sin riesgo.
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
