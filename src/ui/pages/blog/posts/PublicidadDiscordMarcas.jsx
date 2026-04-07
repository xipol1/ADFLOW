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

export default function PublicidadDiscordMarcas() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0' }}>

      {/* ─── Intro ─── */}
      <p style={pStyle}>
        Si tu marca sigue gastando el 100% del presupuesto en Instagram y TikTok, estas ignorando
        la plataforma con mayor engagement de 2026. Discord no es solo para gamers: es donde las
        comunidades mas activas de cripto, tecnologia, educacion, fitness y Gen Z pasan horas cada
        dia. Y a diferencia de las redes sociales tradicionales, aqui la gente no hace scroll pasivo.
        Lee, responde, interactua.
      </p>
      <p style={pStyle}>
        Este articulo es una guia practica para marcas y anunciantes que quieren anunciarse en
        servidores de Discord. Cubrimos los formatos disponibles, los precios estimados del mercado
        hispanohablante, como encontrar servidores relevantes sin que te estafen, y por que Discord
        deberia ser parte de tu media mix en 2026.
      </p>
      <p style={pStyle}>
        La mayoria de agencias de marketing ni siquiera mencionan Discord en sus propuestas. Y eso
        es una oportunidad enorme para las marcas que se mueven rapido: poca competencia, audiencias
        hipersegmentadas y costes por impresion que todavia son una fraccion de lo que cuesta Meta Ads.
      </p>

      <img
        src="https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=720&q=80&auto=format"
        alt="Comunidad de Discord activa con mensajes y reacciones en un servidor tematico"
        style={imgStyle}
        loading="lazy"
      />
      <p style={captionStyle}>Discord concentra las comunidades mas activas y segmentadas de internet — Foto: Unsplash</p>

      {/* ─── Section 1: Por que Discord es diferente ─── */}
      <h2 style={h2Style}>Por que Discord es diferente a cualquier otra plataforma publicitaria</h2>
      <p style={pStyle}>
        En una red social clasica, el usuario hace scroll por un feed algoritmico. Ve tu anuncio
        entre 50 posts de amigos, memes y noticias. La atencion es fragmentada, el engagement es
        bajo y la competencia por cada segundo de atencion es brutal. El CTR medio de un anuncio
        en Instagram Stories en 2026 ronda el 0,3-0,5%.
      </p>
      <p style={pStyle}>
        En Discord, el modelo es completamente diferente. Los usuarios se unen a servidores tematicos
        porque les interesa ese tema especificamente. No hay algoritmo que filtre contenido. Cuando un
        mensaje aparece en un canal de anuncios, la tasa de lectura es entre <span style={strongStyle}>3x y 5x superior</span> a
        la de un post en Instagram. Los datos de actividad en{' '}
        <Link to="/marketplace" style={linkStyle}>Channelad</Link> registran tasas de engagement
        del 15-25%, frente al 3-5% tipico de Instagram.
      </p>
      <p style={pStyle}>
        Tres razones estructurales:
      </p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Segmentacion natural.</span> Un servidor de finanzas en espanol tiene 100% de miembros interesados en finanzas. No necesitas pagar por targeting: la comunidad ya filtro por ti.</li>
        <li style={liStyle}><span style={strongStyle}>Atencion activa.</span> Los miembros leen los mensajes porque eligieron estar ahi. Tu post patrocinado no compite con un feed infinito: compite con 5-10 mensajes del dia en ese canal.</li>
        <li style={liStyle}><span style={strongStyle}>Nichos exclusivos.</span> Comunidades de gaming, desarrollo de software, cripto, DAOs, esports, anime y hardware apenas existen como comunidad organizada en Instagram. Discord es su habitat natural.</li>
      </ul>
      <p style={pStyle}>
        Un dato clave: el coste por conversion (CPA) en servidores de gaming y tech es entre un 40%
        y un 60% menor que en Meta Ads para productos digitales como SaaS, apps y suscripciones. La
        razon es simple: menos competencia publicitaria y mayor intencion de compra en comunidades nicho.
      </p>

      {/* ─── Section 2: Formatos ─── */}
      <h2 style={h2Style}>Formatos de publicidad en servidores de Discord</h2>
      <p style={pStyle}>
        Discord no tiene un sistema de anuncios nativo como Meta o Google. La publicidad funciona de
        forma directa: la marca acuerda con el administrador del servidor la publicacion de contenido
        patrocinado. Estos son los formatos mas comunes y efectivos:
      </p>

      <h3 style={h3Style}>Post en canal de anuncios</h3>
      <p style={pStyle}>
        El formato mas estandar. El administrador publica un mensaje en el canal dedicado a anuncios
        con texto, imagen o embed, un enlace y una mencion al rol adecuado. Es el equivalente a un
        post patrocinado en Telegram. Permanece visible en el historico del canal y permite embeds ricos.
      </p>

      <h3 style={h3Style}>Rol patrocinado</h3>
      <p style={pStyle}>
        Algunos servidores crean un rol personalizado con el branding de la marca. Los miembros que
        lo aceptan reciben notificaciones directas cuando la marca publica. Es como una mini-lista de
        suscripcion dentro del servidor. El engagement es muy alto porque solo lo aceptan miembros
        genuinamente interesados. Precio tipico: entre 1,5x y 2x el de un post estandar.
      </p>

      <h3 style={h3Style}>Eventos y torneos patrocinados</h3>
      <p style={pStyle}>
        Para marcas de gaming, hardware o entretenimiento, patrocinar un evento dentro del servidor
        tiene el mayor impacto. La marca aparece como sponsor durante todo el evento y los participantes
        generan contenido organico (clips, screenshots, resultados). Es el formato mas caro (3x-5x
        el precio base) pero tambien el de mayor recall y asociacion emocional positiva.
      </p>

      <h3 style={h3Style}>Integracion de bot patrocinado</h3>
      <p style={pStyle}>
        Las marcas con producto digital pueden integrar un bot en el servidor que ofrece funcionalidad
        util (sorteos, info en tiempo real, comandos personalizados) y lleva el branding de la marca.
        Presencia permanente, interaccion directa y datos de uso medibles. Requiere desarrollo tecnico
        y normalmente un fee mensual fijo entre 200 y 800 EUR para servidores grandes.
      </p>

      {/* ─── Section 3: Precios ─── */}
      <h2 style={h2Style}>Cuanto cuesta la publicidad en Discord: precios por tamano de servidor</h2>
      <p style={pStyle}>
        Estos son los rangos de precios estimados del mercado hispanohablante en 2026, basados en datos
        de referencia del mercado y campanas gestionadas a traves de{' '}
        <Link to="/marketplace" style={linkStyle}>Channelad</Link> y negociaciones directas.
        Los precios varian segun el nicho y la calidad del servidor.
      </p>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Miembros</th>
              <th style={thStyle}>Post anuncios</th>
              <th style={thStyle}>Rol patrocinado (1 sem)</th>
              <th style={thStyle}>Evento patrocinado</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdFirstStyle}>500 - 2.000</td><td style={tdStyle}>15 - 40 EUR</td><td style={tdStyle}>25 - 60 EUR</td><td style={tdStyle}>50 - 120 EUR</td></tr>
            <tr><td style={tdFirstStyle}>2.000 - 5.000</td><td style={tdStyle}>40 - 90 EUR</td><td style={tdStyle}>60 - 140 EUR</td><td style={tdStyle}>120 - 300 EUR</td></tr>
            <tr><td style={tdFirstStyle}>5.000 - 15.000</td><td style={tdStyle}>90 - 200 EUR</td><td style={tdStyle}>140 - 350 EUR</td><td style={tdStyle}>300 - 700 EUR</td></tr>
            <tr><td style={tdFirstStyle}>15.000 - 50.000</td><td style={tdStyle}>200 - 500 EUR</td><td style={tdStyle}>350 - 800 EUR</td><td style={tdStyle}>700 - 1.800 EUR</td></tr>
            <tr><td style={tdFirstStyle}>50.000 - 200.000</td><td style={tdStyle}>500 - 1.200 EUR</td><td style={tdStyle}>800 - 2.000 EUR</td><td style={tdStyle}>1.800 - 5.000 EUR</td></tr>
            <tr><td style={tdFirstStyle}>200.000+</td><td style={tdStyle}>1.200 - 3.000 EUR</td><td style={tdStyle}>2.000 - 5.000 EUR</td><td style={tdStyle}>5.000 - 15.000 EUR</td></tr>
          </tbody>
        </table>
      </div>

      <p style={pStyle}>
        Dos matices importantes. Primero, los servidores de nicho premium (fintech, SaaS, dev tools)
        cobran entre un 30% y un 50% mas que los de gaming o entretenimiento. Segundo, los precios
        bajan significativamente si contratas multiples publicaciones o una campana recurrente: un
        servidor de 10.000 miembros que cobra 150 EUR por post puede ofrecerte 4 posts por 450 EUR.
      </p>

      {/* ─── Section 4: Como encontrar servidores ─── */}
      <h2 style={h2Style}>Como encontrar servidores de Discord relevantes para tu marca</h2>
      <p style={pStyle}>
        Aqui es donde la mayoria de marcas se frustran y abandonan Discord como canal. Encontrar
        servidores relevantes, verificar que son reales y negociar un acuerdo justo no es trivial.
      </p>

      <h3 style={h3Style}>Disboard y Top.gg</h3>
      <p style={pStyle}>
        Son los directorios publicos mas grandes. Puedes buscar por categoria, idioma y tags.
        El problema: no verifican la calidad de los servidores. Un servidor puede mostrar 50.000
        miembros de los cuales 45.000 son bots o inactivos. No hay metricas de engagement, no
        hay historial de campanas y no hay sistema de pago protegido. Hay marcas que han perdido entre
        200 y 500 EUR en servidores que prometian engagement y entregaban impresiones fantasma.
      </p>

      <h3 style={h3Style}>Busqueda manual en Discord</h3>
      <p style={pStyle}>
        Puedes usar la funcion de busqueda nativa o unirte a servidores meta que listan otros
        servidores. El problema: es lento, no escalable y sin proteccion. Las capturas de Server
        Insights se pueden editar en Photoshop en 2 minutos.
      </p>

      <h3 style={h3Style}>Channelad: verificacion + escrow</h3>
      <p style={pStyle}>
        <Link to="/marketplace" style={linkStyle}>Channelad</Link> resuelve los tres problemas
        principales: descubrimiento, verificacion y pago seguro. Los servidores pasan verificacion
        automatica que confirma miembros reales, tasas de actividad y engagement historico. El pago
        se gestiona por escrow: la marca deposita, el admin publica, y el dinero se libera cuando
        la marca confirma la entrega.
      </p>
      <p style={pStyle}>
        Puedes filtrar servidores por nicho, idioma, tamano, engagement rate y precio. Cada servidor
        tiene un perfil con metricas verificadas, historial de campanas y valoraciones de otros
        anunciantes. Es la diferencia entre comprar publicidad a ciegas y tomar una decision informada.
      </p>

      <img
        src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=720&q=80&auto=format"
        alt="Dashboard de analiticas mostrando metricas de engagement y rendimiento de campanas"
        style={imgStyle}
        loading="lazy"
      />
      <p style={captionStyle}>Verificar metricas reales antes de pagar es la diferencia entre ROI positivo y dinero perdido — Foto: Unsplash</p>

      {/* ─── Section 5: Metricas ─── */}
      <h2 style={h2Style}>Metricas que debes pedir antes de pagar</h2>
      <p style={pStyle}>
        Tanto si usas un marketplace como si contactas directamente al admin, hay cinco metricas
        criticas que debes verificar antes de invertir un solo euro:
      </p>
      <ol style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Miembros activos vs. totales.</span> Un servidor saludable tiene entre un 20% y un 40% de miembros activos semanales. Por debajo del 10%, descarta.</li>
        <li style={liStyle}><span style={strongStyle}>Tasa DAU/MAU.</span> Un ratio del 30% o superior indica uso frecuente. Por debajo del 15%, la comunidad esta dormida.</li>
        <li style={liStyle}><span style={strongStyle}>Mensajes por dia.</span> Un servidor de 10.000 miembros deberia tener entre 200 y 1.000 mensajes diarios. Si los canales principales tienen 10-20, el engagement real es bajo.</li>
        <li style={liStyle}><span style={strongStyle}>Historial de campanas.</span> Pide resultados de campanas anteriores: impresiones, clics, reacciones. Si es la primera campana del servidor, paga un precio conservador.</li>
        <li style={liStyle}><span style={strongStyle}>Datos demograficos.</span> Distribucion por idioma, edad y pais. Los admins experimentados usan bots de analytics que registran estos datos.</li>
      </ol>
      <p style={pStyle}>
        En <Link to="/marketplace" style={linkStyle}>Channelad</Link>, todas estas metricas se
        verifican automaticamente y se muestran en el perfil de cada servidor. No necesitas pedir
        capturas ni confiar en datos no verificados.
      </p>

      {/* ─── Section 6: Comparativa Discord vs Instagram ─── */}
      <h2 style={h2Style}>Comparativa: coste vs. resultados de Discord frente a Instagram Ads</h2>
      <p style={pStyle}>
        Para una comparativa justa, veamos un ejemplo concreto: una marca de SaaS con un presupuesto
        de 500 EUR que quiere generar registros para una prueba gratuita en el mercado hispanohablante.
      </p>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Metrica</th>
              <th style={thStyle}>Instagram Ads (500 EUR)</th>
              <th style={thStyle}>Discord servidores tech (500 EUR)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdFirstStyle}>Impresiones estimadas</td><td style={tdStyle}>50.000 - 80.000</td><td style={tdStyle}>8.000 - 15.000</td></tr>
            <tr><td style={tdFirstStyle}>CTR medio</td><td style={tdStyle}>0,4%</td><td style={tdStyle}>3 - 6%</td></tr>
            <tr><td style={tdFirstStyle}>Clics al landing</td><td style={tdStyle}>200 - 320</td><td style={tdStyle}>240 - 900</td></tr>
            <tr><td style={tdFirstStyle}>Tasa de conversion a registro</td><td style={tdStyle}>8%</td><td style={tdStyle}>12 - 18%</td></tr>
            <tr><td style={tdFirstStyle}>Registros estimados</td><td style={tdStyle}>16 - 26</td><td style={tdStyle}>29 - 162</td></tr>
            <tr><td style={tdFirstStyle}>Coste por registro</td><td style={tdStyle}>19 - 31 EUR</td><td style={tdStyle}>3 - 17 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Awareness residual</td><td style={tdStyle}>Bajo (desaparece al parar)</td><td style={tdStyle}>Alto (post permanente)</td></tr>
          </tbody>
        </table>
      </div>

      <p style={pStyle}>
        Las diferencias clave: el CTR en Discord es entre 6x y 15x superior al de Instagram porque
        la audiencia es contextualmente relevante. La tasa de conversion es entre un 50% y un 125%
        mayor porque los usuarios llegan con mas contexto. Y el post de Discord permanece en el
        historico del canal como activo acumulativo: miembros que se unan meses despues pueden verlo.
      </p>
      <p style={pStyle}>
        La limitacion de Discord es el volumen: no llegaras a 100.000 personas de golpe. Pero para
        productos de nicho, el ROI es consistentemente superior. La estrategia ideal combina Discord
        para conversion en nichos especificos e Instagram para awareness a escala.
      </p>

      {/* ─── CTA ─── */}
      <div style={{
        marginTop: '48px',
        padding: '32px',
        background: `${PURPLE}10`,
        borderRadius: '16px',
        textAlign: 'center',
        border: `1px solid ${PURPLE}30`,
      }}>
        <h2 style={{ fontFamily: D, fontSize: '22px', fontWeight: 700, marginBottom: '10px', color: 'var(--text)' }}>
          Explora servidores de Discord verificados
        </h2>
        <p style={{ ...pStyle, color: 'var(--muted)', marginBottom: '20px', maxWidth: '520px', margin: '0 auto 20px' }}>
          Encuentra servidores con metricas reales, audiencias verificadas y pago protegido por
          escrow. Sin intermediarios, sin riesgo, con datos transparentes.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/marketplace"
            style={{
              display: 'inline-block',
              background: PURPLE,
              color: '#fff',
              padding: '12px 28px',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 600,
              fontFamily: F,
              textDecoration: 'none',
            }}
          >
            Explorar marketplace
          </Link>
          <Link
            to="/para-canales"
            style={{
              display: 'inline-block',
              background: 'transparent',
              color: GREEN,
              padding: '12px 28px',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 600,
              fontFamily: F,
              textDecoration: 'none',
              border: `1.5px solid ${GREEN}`,
            }}
          >
            Registrar mi servidor
          </Link>
        </div>
      </div>

      {/* ─── Internal links ─── */}
      <div style={{ marginTop: '32px', padding: '20px 0', borderTop: '1px solid #f0f0f5' }}>
        <p style={{ ...pStyle, fontSize: '14px', color: 'var(--muted)' }}>
          Articulos relacionados:{' '}
          <Link to="/blog/como-monetizar-servidor-discord" style={linkStyle}>Como monetizar un servidor de Discord</Link>
          {' · '}
          <Link to="/blog/publicidad-en-discord-guia-completa" style={linkStyle}>Publicidad en Discord: guia completa</Link>
          {' · '}
          <Link to="/marketplace" style={linkStyle}>Marketplace de Channelad</Link>
        </p>
      </div>
    </div>
  )
}
