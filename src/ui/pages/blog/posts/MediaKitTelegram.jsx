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

export default function MediaKitTelegram() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0' }}>
      <p style={pStyle}>
        El media kit es el documento que convierte tu canal de Telegram en un negocio serio. Sin el,
        dejas el 80% de los anunciantes sobre la mesa. Los creadores que empiezan sin media kit tardan
        semanas en cerrar acuerdos que con uno se cierran en 24 horas. La diferencia: un documento profesional
        que responde todas las preguntas del anunciante antes de que las haga.
      </p>
      <p style={pStyle}>
        En este articulo te explico exactamente que debe incluir tu media kit, como obtener las
        estadisticas correctas, y los errores mas comunes que hacen que un anunciante descarte tu
        canal antes de leer la segunda linea.
      </p>

      <img src="https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=720&q=80&auto=format" alt="Creador preparando media kit profesional para canal de Telegram" style={imgStyle} loading="lazy" />
      <p style={captionStyle}>Un buen media kit es la diferencia entre perseguir anunciantes y recibirlos — Foto: Unsplash</p>

      <h2 style={h2Style}>Que es un media kit y por que lo necesitas</h2>
      <p style={pStyle}>
        Un media kit es un documento (PDF, pagina web o presentacion) que resume todo lo que un
        anunciante necesita saber sobre tu canal para decidir si invierte: quien es tu audiencia,
        cuanto engagement tienes, que formatos ofreces y cuanto cuestan. Es tu carta de presentacion
        comercial.
      </p>
      <p style={pStyle}>
        Los anunciantes profesionales reciben decenas de propuestas de canales cada semana. El media
        kit es lo que te diferencia de los demas: demuestra que te tomas tu canal en serio, que
        tienes datos reales y que eres facil de trabajar. Sin media kit, el anunciante tiene que
        hacerte 10 preguntas por DM antes de saber si merece la pena. Con media kit, tiene toda la
        informacion en 2 minutos.
      </p>

      <h2 style={h2Style}>Los 7 elementos que debe tener tu media kit</h2>

      <h3 style={h3Style}>1. Nombre y descripcion del canal</h3>
      <p style={pStyle}>
        Una linea que explique exactamente de que va tu canal, para quien es y que lo hace unico.
        No uses jerga ni frases genericas. Ejemplo bueno: «Canal de finanzas personales para
        millennials espanoles: ahorro, inversion y FIRE movement. 8.200 suscriptores activos.»
      </p>

      <h3 style={h3Style}>2. Estadisticas clave</h3>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Suscriptores totales</span> (y la fecha)</li>
        <li style={liStyle}><span style={strongStyle}>Vistas medias por post</span> en las ultimas 24 horas</li>
        <li style={liStyle}><span style={strongStyle}>Engagement rate</span> (vistas / suscriptores x 100)</li>
        <li style={liStyle}><span style={strongStyle}>Crecimiento mensual</span> en porcentaje</li>
        <li style={liStyle}><span style={strongStyle}>Tasa de reenvios</span> (indica contenido compartible)</li>
      </ul>

      <h3 style={h3Style}>3. Audiencia: demografia</h3>
      <p style={pStyle}>
        Los anunciantes necesitan saber a quien llegan. Si no tienes datos demograficos exactos
        (Telegram no los da directamente), describe tu audiencia basandote en el nicho: rango de
        edad estimado, pais principal, intereses, nivel socieconomico. Cuanto mas especifico, mejor.
      </p>

      <h3 style={h3Style}>4. Formatos disponibles y precios</h3>
      <p style={pStyle}>
        Lista clara de lo que ofreces con precios fijos. No digas «precios a consultar» — eso
        aleja al 70% de los anunciantes. Incluye: post estandar, post fijado 24h, post fijado 48h,
        mencion en contenido organico y paquetes. Usa la{' '}
        <Link to="/blog/cuanto-cobrar-publicidad-telegram" style={linkStyle}>guia de precios</Link>{' '}
        para calcular tus tarifas.
      </p>

      <h3 style={h3Style}>5. Ejemplos de publicaciones anteriores</h3>
      <p style={pStyle}>
        Incluye 2-3 capturas de posts patrocinados que hayas hecho antes, con los resultados
        (vistas, clics si los tienes). Si no has hecho publicidad todavia, muestra tus posts
        organicos con mejor rendimiento como ejemplo del tipo de contenido que publicas.
      </p>

      <h3 style={h3Style}>6. Casos de exito o testimonios</h3>
      <p style={pStyle}>
        Si un anunciante anterior te dijo algo positivo, incluyelo. Un simple «Repetiremos seguro,
        las metricas superaron nuestras expectativas» vale mas que cualquier estadistica.
      </p>

      <h3 style={h3Style}>7. Datos de contacto y condiciones</h3>
      <p style={pStyle}>
        Incluye tu Telegram de contacto, email, y link a tu perfil en el marketplace. Especifica
        condiciones: plazo de publicacion tras confirmacion, politica de cancelacion, y que el pago
        se gestiona via escrow.
      </p>

      <h2 style={h2Style}>Como obtener las estadisticas correctas de Telegram</h2>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>TGStat:</span> herramienta gratuita que muestra estadisticas publicas de cualquier canal de Telegram. Suscriptores, vistas, crecimiento, engagement. Usa el enlace de tu canal en tgstat.com.</li>
        <li style={liStyle}><span style={strongStyle}>Bot de estadisticas:</span> bots como @ChannelAnalyticsBot o @TGStatBot te envian reportes semanales automaticos.</li>
        <li style={liStyle}><span style={strongStyle}>Google Sheets manual:</span> llevar un spreadsheet donde anotas metricas clave cada lunes puede parecer excesivo, pero tener datos historicos te permite mostrar tendencias de crecimiento, que es mas convincente que una captura puntual.</li>
      </ul>

      <h2 style={h2Style}>Errores comunes en los media kits</h2>
      <p style={pStyle}>
        <span style={strongStyle}>Inflar numeros.</span> Los anunciantes verifican. Si dices 10.000
        suscriptores y TGStat muestra 7.000, pierdes toda credibilidad. Mejor ser honesto con
        numeros reales que mentir con numeros inflados.
      </p>
      <p style={pStyle}>
        <span style={strongStyle}>No incluir precios.</span> «Precios segun campana» es codigo para
        «no se cuanto cobrar». Los anunciantes quieren numeros claros. Si tu precio depende del
        formato, lista cada formato con su precio.
      </p>
      <p style={pStyle}>
        <span style={strongStyle}>Estadisticas desactualizadas.</span> Un media kit con datos de
        hace 6 meses no sirve. Actualiza al menos una vez al mes. Pon la fecha de actualizacion
        visible.
      </p>
      <p style={pStyle}>
        <span style={strongStyle}>Diseno amateur.</span> No necesitas contratar un disenador, pero
        un PDF con formato limpio, fuentes legibles y algun color de marca transmite profesionalidad.
        Canva tiene templates de media kit gratuitos que puedes adaptar en 30 minutos.
      </p>

      <h2 style={h2Style}>Como presentar el media kit a un anunciante</h2>
      <p style={pStyle}>
        No envies el media kit en frio sin contexto. El mensaje ideal es corto y directo:
      </p>
      <div style={{ margin: '24px 0', padding: '24px', borderRadius: '12px', background: 'var(--bg2, #f5f5f7)', border: '1px solid rgba(0,0,0,0.06)', fontFamily: F, fontSize: '15px', lineHeight: 1.7, fontStyle: 'italic' }}>
        «Hola [nombre]. Gestiono [nombre del canal], un canal de Telegram de [nicho] con [X]
        suscriptores activos y un [X]% de engagement. Adjunto nuestro media kit con formatos,
        precios y ejemplos de campanas anteriores. Si te interesa, estamos en Channelad con
        metricas verificadas y pago por escrow. Un saludo.»
      </div>

      <p style={pStyle}>
        O mejor aun: registrate en{' '}
        <Link to="/para-canales" style={linkStyle}>Channelad</Link> y deja que los anunciantes te
        encuentren. Tus metricas se verifican automaticamente y no necesitas enviar media kits
        manualmente — tu perfil en la plataforma funciona como un media kit vivo y actualizado.
      </p>

      <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=720&q=80&auto=format" alt="Dashboard de metricas de canal de Telegram" style={imgStyle} loading="lazy" />
      <p style={captionStyle}>Las metricas verificadas son tu mejor argumento de venta — Foto: Unsplash</p>

      <div style={{ marginTop: '48px', padding: '32px', background: `${GREEN}10`, borderRadius: '16px', textAlign: 'center', border: `1px solid ${GREEN}30` }}>
        <h2 style={{ fontFamily: D, fontSize: '22px', fontWeight: 700, marginBottom: '10px', color: 'var(--text)' }}>
          Tu media kit, automatizado
        </h2>
        <p style={{ ...pStyle, color: 'var(--muted)', marginBottom: '20px', maxWidth: '520px', margin: '0 auto 20px' }}>
          En Channelad, tus metricas se verifican automaticamente. Tu perfil funciona como un
          media kit vivo que los anunciantes pueden consultar en tiempo real.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/para-canales" style={{ display: 'inline-block', background: GREEN, color: '#fff', padding: '12px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: 600, fontFamily: F, textDecoration: 'none' }}>Registrar mi canal</Link>
          <Link to="/para-anunciantes" style={{ display: 'inline-block', background: 'transparent', color: PURPLE, padding: '12px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: 600, fontFamily: F, textDecoration: 'none', border: `1.5px solid ${PURPLE}` }}>Soy anunciante</Link>
        </div>
      </div>
    </div>
  )
}
