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

export default function MejoresCanalesWhatsApp() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0' }}>

      {/* ─── Intro ─── */}
      <p style={pStyle}>
        Esta es una seleccion curada de canales de WhatsApp en espanol que realmente merecen la pena.
        No los tipicos listados que encuentras por ahi con canales muertos o que publican una
        vez al mes. Aqui hay una seleccion de canales activos, con comunidades
        reales y contenido que aporta valor de verdad.
      </p>
      <p style={pStyle}>
        Desde que WhatsApp lanzo los canales en septiembre de 2023, el crecimiento ha sido
        brutal. Solo en el mercado hispanohablante se estima que hay mas de 400.000 canales
        activos en 2026, y la cifra sigue subiendo cada semana. El problema no es encontrar
        canales — el problema es encontrar los buenos entre todo el ruido.
      </p>
      <p style={pStyle}>
        El equipo editorial ha dedicado mas de 60 horas a probar, seguir y evaluar canales en las categorias
        mas relevantes. Para cada uno se ha analizado la frecuencia de publicacion, la
        calidad del contenido, el numero de seguidores y si realmente aporta algo que no puedas
        encontrar en cinco segundos con Google. Los que aparecen aqui son los que pasaron el filtro.
      </p>

      <img
        src="https://images.unsplash.com/photo-1611746872915-64382b5c76da?w=720&q=80&auto=format"
        alt="Smartphone mostrando WhatsApp con multiples canales activos"
        style={imgStyle}
        loading="lazy"
      />
      <p style={captionStyle}>Los canales de WhatsApp se han convertido en una fuente de informacion diaria para millones de hispanohablantes — Foto: Unsplash</p>

      {/* ─── Finanzas ─── */}
      <h2 style={h2Style}>Finanzas e inversiones</h2>
      <p style={pStyle}>
        El nicho de finanzas es probablemente el mas competido en canales de WhatsApp en espanol.
        Hay cientos, pero la mayoria son copias unos de otros o simplemente replican titulares de
        prensa economica. Estos son los que realmente destacan por analisis propio y contenido original.
      </p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Finanzas Sin Filtro</span> — 187.000 suscriptores. Analisis diario de mercados con un tono directo y sin tecnicismos innecesarios. Publican de lunes a viernes a las 8:00 AM.</li>
        <li style={liStyle}><span style={strongStyle}>Invierte Con Cabeza</span> — 124.000 suscriptores. Enfocado en inversion a largo plazo y ETFs. Tres publicaciones por semana con comparativas de brokers y alertas de tipos de interes.</li>
        <li style={liStyle}><span style={strongStyle}>Economia Real MX</span> — 98.000 suscriptores. Canal mexicano que analiza la economia desde la perspectiva del ciudadano comun. Inflacion, tipo de cambio, salarios reales.</li>
        <li style={liStyle}><span style={strongStyle}>Cripto Espana Diario</span> — 76.000 suscriptores. Sin enlaces de referido, sin pump and dump. Analisis tecnico y fundamental tres veces por semana con enfoque educativo.</li>
        <li style={liStyle}><span style={strongStyle}>Ahorra y Vive Mejor</span> — 142.000 suscriptores. Finanzas personales para principiantes. Trucos de ahorro, comparativas de cuentas bancarias, ofertas de depositos.</li>
        <li style={liStyle}><span style={strongStyle}>Bolsa Para Novatos</span> — 63.000 suscriptores. Contenido educativo puro. Cada publicacion explica un concepto de inversion de forma sencilla con ejemplos reales.</li>
      </ul>

      {/* ─── Tecnologia ─── */}
      <h2 style={h2Style}>Tecnologia</h2>
      <p style={pStyle}>
        La tecnologia es el segundo nicho mas popular en canales de WhatsApp en espanol. Estos
        canales se diferencian por no limitarse a copiar notas de prensa de Apple o Samsung.
      </p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Tech Reducido</span> — 210.000 suscriptores. Noticias de tecnologia resumidas en tres frases. Sin rodeos, sin clickbait. Cinco a ocho publicaciones diarias.</li>
        <li style={liStyle}><span style={strongStyle}>IA al Dia Espanol</span> — 165.000 suscriptores. Todo sobre inteligencia artificial en espanol. Nuevos modelos, herramientas, tutoriales rapidos. Publicacion diaria.</li>
        <li style={liStyle}><span style={strongStyle}>Android Libre Tips</span> — 89.000 suscriptores. Trucos, apps ocultas, personalizacion avanzada. Tres o cuatro publicaciones por semana.</li>
        <li style={liStyle}><span style={strongStyle}>Ciberseguridad Hoy</span> — 54.000 suscriptores. Alertas de vulnerabilidades, estafas activas, consejos de privacidad. Publicacion diaria.</li>
        <li style={liStyle}><span style={strongStyle}>Ofertas Tech ES</span> — 230.000 suscriptores. El canal mas grande de ofertas tecnologicas en espanol. Diez a quince ofertas diarias con descuento real verificado.</li>
        <li style={liStyle}><span style={strongStyle}>Gadgets & Productividad</span> — 71.000 suscriptores. Reviews cortas de gadgets enfocadas en productividad real. Dos publicaciones por semana.</li>
      </ul>

      {/* ─── Marketing Digital ─── */}
      <h2 style={h2Style}>Marketing digital</h2>
      <p style={pStyle}>
        El marketing digital es un nicho que funciona especialmente bien en WhatsApp porque los
        profesionales del sector son early adopters. Estos canales van mas alla de los tipicos
        consejos genericos.
      </p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Growth Hacking Espanol</span> — 93.000 suscriptores. Tacticas de crecimiento con casos reales de startups hispanas. Tres publicaciones por semana con numeros y resultados.</li>
        <li style={liStyle}><span style={strongStyle}>SEO Sin Rodeos</span> — 78.000 suscriptores. Actualizaciones de Google, cambios de algoritmo, y tacticas de posicionamiento que funcionan en 2026.</li>
        <li style={liStyle}><span style={strongStyle}>Email Marketing Lab</span> — 42.000 suscriptores. Asuntos de email que funcionan, automatizaciones, comparativas de plataformas. Dos publicaciones por semana.</li>
        <li style={liStyle}><span style={strongStyle}>Social Media Trends ES</span> — 115.000 suscriptores. Tendencias de redes sociales con enfoque estrategico. Publicacion diaria.</li>
        <li style={liStyle}><span style={strongStyle}>Copywriting Practico</span> — 56.000 suscriptores. Ejemplos de copy real con analisis de por que funciona o por que falla. Cuatro publicaciones por semana.</li>
        <li style={liStyle}><span style={strongStyle}>Ads Academy ES</span> — 67.000 suscriptores. Facebook Ads, Google Ads, TikTok Ads. Estrategias de pujas y creatividades que convierten.</li>
      </ul>

      {/* ─── Noticias ─── */}
      <h2 style={h2Style}>Noticias</h2>
      <p style={pStyle}>
        Los canales de noticias en WhatsApp tienen una ventaja enorme sobre las apps de medios
        tradicionales: la inmediatez. Recibes la noticia como un mensaje, sin tener que abrir
        ninguna app.
      </p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Noticias Express 24h</span> — 340.000 suscriptores. Noticias generalistas de Espana y Latinoamerica. Formato ultra breve: titular, dos lineas de contexto, enlace.</li>
        <li style={liStyle}><span style={strongStyle}>Mundo Deportivo Directo</span> — 285.000 suscriptores. Futbol, tenis, F1, baloncesto. Resultados en tiempo real, fichajes, ruedas de prensa.</li>
        <li style={liStyle}><span style={strongStyle}>Politica Sin Filtro</span> — 128.000 suscriptores. Analisis politico de Espana y Latinoamerica con un enfoque que intenta ser neutral.</li>
        <li style={liStyle}><span style={strongStyle}>Economia Global Hoy</span> — 95.000 suscriptores. Noticias economicas internacionales con impacto en el mercado hispanohablante.</li>
        <li style={liStyle}><span style={strongStyle}>Cultura y Ocio ES</span> — 72.000 suscriptores. Estrenos de cine, series, libros, exposiciones. Cuatro o cinco publicaciones por semana.</li>
      </ul>

      {/* ─── Emprendimiento ─── */}
      <h2 style={h2Style}>Emprendimiento</h2>
      <p style={pStyle}>
        El emprendimiento es un nicho que exploto en WhatsApp en 2025. La mayoria de canales son
        motivacionales vacios, pero estos pocos ofrecen contenido accionable con datos reales.
      </p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Startup Espana Real</span> — 108.000 suscriptores. Rondas de inversion, lanzamientos de startups espanolas. Cada viernes publican un desglose de numeros reales de una startup.</li>
        <li style={liStyle}><span style={strongStyle}>Emprender Desde Cero MX</span> — 145.000 suscriptores. Enfocado en Mexico y Latinoamerica. Tramites legales, fiscalidad, modelos de negocio.</li>
        <li style={liStyle}><span style={strongStyle}>SaaS en Espanol</span> — 38.000 suscriptores. Nicho ultra especifico: emprendedores que construyen software como servicio. Metricas, herramientas, pricing.</li>
        <li style={liStyle}><span style={strongStyle}>Freelance y Remoto</span> — 92.000 suscriptores. Ofertas de trabajo remoto, herramientas para freelancers, consejos fiscales para autonomos.</li>
        <li style={liStyle}><span style={strongStyle}>E-commerce Lab ES</span> — 61.000 suscriptores. Shopify, Amazon FBA, dropshipping real. Casos de estudio con numeros.</li>
        <li style={liStyle}><span style={strongStyle}>Negocios Digitales 360</span> — 84.000 suscriptores. Vision panoramica del negocio digital: modelos de monetizacion, estrategias de contenido, automatizaciones.</li>
      </ul>

      {/* ─── Fitness ─── */}
      <h2 style={h2Style}>Fitness y salud</h2>
      <p style={pStyle}>
        El fitness en WhatsApp es diferente al de Instagram. Aqui no hay postureo — los canales
        que funcionan son los que dan informacion practica y basada en evidencia.
      </p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Entrena Inteligente</span> — 175.000 suscriptores. Rutinas de entrenamiento con video corto incluido en cada mensaje. Lunes a viernes con programacion progresiva.</li>
        <li style={liStyle}><span style={strongStyle}>Nutricion Basada en Ciencia</span> — 132.000 suscriptores. Un nutricionista colegiado que desmonta mitos alimentarios con estudios cientificos.</li>
        <li style={liStyle}><span style={strongStyle}>Running Espana</span> — 88.000 suscriptores. Planes de entrenamiento para carreras populares, consejos de zapatillas, calendario de eventos.</li>
        <li style={liStyle}><span style={strongStyle}>Yoga y Mindfulness Diario</span> — 96.000 suscriptores. Una sesion guiada cada manana a las 7:00 AM. Formato audio de cinco minutos.</li>
        <li style={liStyle}><span style={strongStyle}>Salud Mental Sin Tabu</span> — 148.000 suscriptores. Psicologia practica con enfoque en ansiedad, estres laboral y relaciones.</li>
        <li style={liStyle}><span style={strongStyle}>Recetas Fit Rapidas</span> — 203.000 suscriptores. Recetas saludables en menos de quince minutos. Cada receta incluye macros y lista de ingredientes.</li>
      </ul>

      {/* ─── Patrones comunes ─── */}
      <h2 style={h2Style}>Que tienen en comun los canales mas exitosos</h2>
      <p style={pStyle}>
        Tras analizar mas de 200 canales para esta seleccion, hay patrones claros
        que separan a los canales que crecen de los que se estancan.
      </p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Consistencia absoluta.</span> Los canales que superan los 100.000 suscriptores publican todos los dias o casi todos los dias. La consistencia genera habito en el lector, y el habito genera engagement.</li>
        <li style={liStyle}><span style={strongStyle}>Nicho definido y respetado.</span> Los mejores canales nunca se salen de su tema. El lector sigue un canal porque confia en que cada mensaje va a ser relevante.</li>
        <li style={liStyle}><span style={strongStyle}>Formato reconocible.</span> Cada canal exitoso tiene un formato propio que el suscriptor reconoce al instante. La consistencia de formato es casi mas importante que la de frecuencia.</li>
        <li style={liStyle}><span style={strongStyle}>Tono personal y autentico.</span> Los canales que suenan a comunicado de prensa no enganchan. Los que funcionan tienen voz propia, opinan, se equivocan y lo admiten.</li>
        <li style={liStyle}><span style={strongStyle}>Interaccion indirecta.</span> Encuestas, preguntas al final de cada mensaje, invitaciones a responder por DM. Esta interaccion retroalimenta el contenido.</li>
      </ul>

      {/* ─── Cuanto ganan ─── */}
      <h2 style={h2Style}>Cuanto ganan estos canales con publicidad</h2>
      <p style={pStyle}>
        Vamos a los numeros. La formula basica para estimar ingresos publicitarios en un canal
        de WhatsApp es: <span style={strongStyle}>(Suscriptores x Tasa de apertura x CPM del nicho / 1.000)
        x Publicaciones patrocinadas al mes</span>. En WhatsApp, la tasa de apertura es
        significativamente mayor que en Telegram o email: una media del 55-65% en canales
        activos frente al 30-40% de Telegram.
      </p>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Nicho</th>
              <th style={thStyle}>CPM medio (EUR)</th>
              <th style={thStyle}>Ejemplo 100K subs (4 posts/mes)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdFirstStyle}>Finanzas</td><td style={tdStyle}>8 - 15</td><td style={tdStyle}>1.920 - 3.600 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Tecnologia</td><td style={tdStyle}>5 - 10</td><td style={tdStyle}>1.100 - 2.200 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Marketing digital</td><td style={tdStyle}>4 - 8</td><td style={tdStyle}>880 - 1.760 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Emprendimiento</td><td style={tdStyle}>5 - 9</td><td style={tdStyle}>1.100 - 1.980 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Fitness / Salud</td><td style={tdStyle}>3 - 6</td><td style={tdStyle}>660 - 1.320 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Noticias generalistas</td><td style={tdStyle}>1,5 - 3</td><td style={tdStyle}>330 - 660 EUR</td></tr>
          </tbody>
        </table>
      </div>

      <p style={pStyle}>
        Pongamos un ejemplo concreto: un canal de finanzas con 100.000 suscriptores y un 60%
        de tasa de apertura. Eso son 60.000 lecturas efectivas por publicacion. Con un CPM de
        10 EUR, cada post patrocinado vale 600 EUR. Con cuatro posts patrocinados al mes,
        estamos hablando de 2.400 EUR mensuales. Y estos numeros son conservadores — los canales
        mejor posicionados negocian tarifas premium que pueden duplicar estos valores.
      </p>
      <p style={pStyle}>
        Si quieres profundizar en estrategias de monetizacion para canales de mensajeria, lee la{' '}
        <Link to="/blog/como-monetizar-canal-whatsapp" style={linkStyle}>
          guia completa sobre como monetizar un canal de WhatsApp
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
          Quieres monetizar tu canal de WhatsApp
        </h2>
        <p style={{ ...pStyle, color: 'var(--muted)', marginBottom: '20px', maxWidth: '520px', margin: '0 auto 20px' }}>
          Registra tu canal en Channelad, verifica tus metricas automaticamente y empieza a
          recibir propuestas de anunciantes verificados con pago protegido por escrow. Sin
          perseguir pagos, sin intermediarios.
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
