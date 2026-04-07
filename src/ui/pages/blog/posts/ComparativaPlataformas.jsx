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

export default function ComparativaPlataformas() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0' }}>

      {/* ─── Personal intro ─── */}
      <p style={pStyle}>
        Las marcas que invierten en publicidad en canales de Telegram, grupos de WhatsApp y servidores
        de Discord llevan anos acumulando datos. Con miles de euros invertidos en campanas repartidas entre las tres plataformas,
        los patrones son claros. Este articulo resume las lecciones clave antes de
        invertir un solo euro.
      </p>
      <p style={pStyle}>
        La pregunta que recibo constantemente de marcas que empiezan a explorar la publicidad en
        comunidades es siempre la misma: <span style={strongStyle}>donde me conviene anunciarme?</span> La
        respuesta corta es que depende de tu producto, tu audiencia y tu presupuesto. La respuesta
        larga es este articulo.
      </p>
      <p style={pStyle}>
        Antes de entrar en cada plataforma, necesito explicar por que cada vez mas marcas estan
        moviendo presupuesto de Meta Ads y Google Ads hacia la publicidad en comunidades. No es
        una moda: es una respuesta racional a tres problemas reales. El CPM medio en Instagram
        en Espana ha pasado de 4 EUR en 2022 a mas de 9 EUR en 2026. Las tasas de engagement en
        redes tradicionales estan en caida libre. Y la fatiga publicitaria hace que los usuarios
        ya no procesen los anuncios en feeds saturados.
      </p>
      <p style={pStyle}>
        La publicidad en comunidades no reemplaza a Meta o Google. Es un canal complementario con
        audiencias autoseleccionadas, engagement brutal y una relacion de confianza entre el creador
        y su comunidad que se transfiere parcialmente a la marca. Dicho esto, cada plataforma tiene
        sus propias reglas del juego.
      </p>

      <img
        src="https://images.unsplash.com/photo-1611606063065-ee7946f0787a?w=720&q=80&auto=format"
        alt="Smartphone mostrando aplicaciones de mensajeria Telegram WhatsApp y Discord"
        style={imgStyle}
        loading="lazy"
      />
      <p style={captionStyle}>Las tres plataformas de comunidades dominan la publicidad directa en 2026 — Foto: Unsplash</p>

      {/* ─── Section 1: Telegram ─── */}
      <h2 style={h2Style}>Telegram: el rey de los nichos de alto CPM</h2>
      <p style={pStyle}>
        Telegram es donde la mayoria de marcas empiezan y donde muchas concentran la mayor parte del
        presupuesto. La razon es simple: es la plataforma con el ecosistema publicitario mas maduro
        en el mundo de las comunidades.
      </p>
      <p style={pStyle}>
        Los canales de Telegram funcionan como newsletters esteroidizadas. El creador publica contenido
        unidireccional, los suscriptores lo reciben como notificacion push, y las tasas de apertura
        oscilan entre el 30% y el 60%. Para un anunciante, esto significa impresiones garantizadas
        con atencion real.
      </p>

      <h3 style={h3Style}>Ventajas de anunciarse en Telegram</h3>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Segmentacion por nicho.</span> Hay canales para todo: finanzas, cripto, tech, marketing, fitness. Cada canal tiene una audiencia definida que permite segmentacion quirurgica sin algoritmos.</li>
        <li style={liStyle}><span style={strongStyle}>Riqueza de formatos.</span> Texto con formato, imagenes, videos, botones con enlaces, encuestas y archivos adjuntos. Infinitamente mas flexible que un anuncio de texto en Google.</li>
        <li style={liStyle}><span style={strongStyle}>Medicion precisa.</span> Las estadisticas de Telegram dan vistas exactas por post, lo que permite calcular el CPM real de cada campana con precision.</li>
      </ul>

      <h3 style={h3Style}>Desventajas de Telegram</h3>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Falta de estandarizacion.</span> Cada canal pone sus precios, formatos y condiciones. Negociar con veinte canales para una campana es una pesadilla logistica.</li>
        <li style={liStyle}><span style={strongStyle}>Riesgo de fraude.</span> Las metricas son faciles de inflar con bots. Sin verificacion externa, te arriesgas a pagar por audiencia fantasma.</li>
        <li style={liStyle}><span style={strongStyle}>Riesgo de impago.</span> Anunciantes que no pagan o canales que cobran y no publican. Esto se resuelve con escrow en{' '}<Link to="/marketplace" style={linkStyle}>Channelad</Link>.</li>
      </ul>

      <h3 style={h3Style}>Rangos de precio en Telegram (2026)</h3>
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Nicho</th>
              <th style={thStyle}>CPM (EUR)</th>
              <th style={thStyle}>Precio/post (10K subs)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdFirstStyle}>Cripto / Trading</td><td style={tdStyle}>6 - 12</td><td style={tdStyle}>80 - 180 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Finanzas / Inversiones</td><td style={tdStyle}>5 - 10</td><td style={tdStyle}>70 - 150 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Tecnologia / SaaS</td><td style={tdStyle}>4 - 8</td><td style={tdStyle}>60 - 120 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Marketing / Negocios</td><td style={tdStyle}>3 - 6</td><td style={tdStyle}>40 - 90 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Gaming / Entretenimiento</td><td style={tdStyle}>1,5 - 3</td><td style={tdStyle}>20 - 45 EUR</td></tr>
          </tbody>
        </table>
      </div>

      <p style={pStyle}>
        Para una guia detallada sobre cuanto cobran los canales y como calcular si el precio es justo,
        lee la{' '}
        <Link to="/blog/cuanto-cobrar-publicidad-telegram" style={linkStyle}>
          guia de precios de publicidad en Telegram
        </Link>.
      </p>

      {/* ─── Section 2: WhatsApp ─── */}
      <h2 style={h2Style}>WhatsApp: alcance masivo y las tasas de apertura mas altas</h2>
      <p style={pStyle}>
        WhatsApp es una bestia completamente diferente. Con mas de 35 millones de usuarios activos
        en Espana (penetracion del 95% entre adultos), es la app de mensajeria dominante por goleada.
        La publicidad se canaliza via grupos (comunidades bidireccionales) y canales (contenido
        unidireccional, lanzados a finales de 2023).
      </p>

      <h3 style={h3Style}>Ventajas de anunciarse en WhatsApp</h3>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Alcance bruto imbatible.</span> 35 millones de usuarios en Espana frente a 15 millones de Telegram. Si vendes consumo masivo, WhatsApp te da acceso a audiencias que no encontraras en ninguna otra plataforma.</li>
        <li style={liStyle}><span style={strongStyle}>Tasas de apertura del 85-95%.</span> Los mensajes de WhatsApp tienen la tasa de apertura mas alta de cualquier canal de comunicacion digital. La gente revisa WhatsApp multiples veces al dia de forma automatica.</li>
        <li style={liStyle}><span style={strongStyle}>Confianza percibida.</span> Un mensaje en un grupo de WhatsApp donde participas activamente se siente como una recomendacion de un amigo, no como publicidad invasiva.</li>
      </ul>

      <h3 style={h3Style}>Desventajas de WhatsApp</h3>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Ecosistema publicitario inmaduro.</span> No hay cultura establecida de posts patrocinados. Muchos administradores no tienen experiencia gestionando campanas.</li>
        <li style={liStyle}><span style={strongStyle}>Limite de participantes.</span> Grupos limitados a 1.024-2.048 miembros. Para alcanzar 10.000 personas necesitas coordinarte con multiples grupos.</li>
        <li style={liStyle}><span style={strongStyle}>Medicion limitada.</span> No hay estadisticas de vistas por mensaje en grupos. Solo los canales ofrecen contador de vistas, y es menos preciso que Telegram.</li>
        <li style={liStyle}><span style={strongStyle}>Riesgo regulatorio.</span> Meta tiene politicas estrictas contra spam. Un grupo que abuse de patrocinios puede ser reportado y cerrado.</li>
      </ul>

      <h3 style={h3Style}>Rangos de precio en WhatsApp (2026)</h3>
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Formato</th>
              <th style={thStyle}>Tamano audiencia</th>
              <th style={thStyle}>Precio estimado</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdFirstStyle}>Mensaje en grupo</td><td style={tdStyle}>500 - 1.000 miembros</td><td style={tdStyle}>15 - 40 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Red de grupos coordinados</td><td style={tdStyle}>2.000 - 10.000 alcance</td><td style={tdStyle}>50 - 200 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Post en canal</td><td style={tdStyle}>10.000+ suscriptores</td><td style={tdStyle}>40 - 100 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Campana multigrupo</td><td style={tdStyle}>10.000 - 50.000 alcance</td><td style={tdStyle}>200 - 800 EUR</td></tr>
          </tbody>
        </table>
      </div>

      <p style={pStyle}>
        Para entender como funcionan los canales de WhatsApp para publicidad, consulta nuestra{' '}
        <Link to="/blog/publicidad-en-whatsapp-guia-completa" style={linkStyle}>
          guia completa de publicidad en WhatsApp
        </Link>.
      </p>

      {/* ─── Section 3: Discord ─── */}
      <h2 style={h2Style}>Discord: el engagement mas profundo del mercado</h2>
      <p style={pStyle}>
        Discord es la plataforma mas subestimada y al mismo tiempo la que ofrece el engagement mas
        intenso. Un servidor activo no es un canal donde la gente lee pasivamente: es una comunidad
        donde los miembros interactuan, debaten, comparten contenido y construyen relaciones reales.
      </p>
      <p style={pStyle}>
        Para ciertos sectores, Discord no es solo una opcion: es la <span style={strongStyle}>unica
        opcion viable</span>. Si tu marca vende a audiencias de gaming, cripto, Web3, dev tools o
        cualquier producto dirigido a Gen Z, Discord es donde esta tu audiencia. No en Instagram,
        no en TikTok, no en Telegram.
      </p>

      <h3 style={h3Style}>Ventajas de anunciarse en Discord</h3>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Profundidad de engagement.</span> Los miembros participan en discusiones, reaccionan, asisten a eventos en vivo y crean vinculos emocionales con la comunidad. Un anuncio bien integrado se siente como una recomendacion del grupo.</li>
        <li style={liStyle}><span style={strongStyle}>Duracion de exposicion.</span> Un pin o canal dedicado en Discord mantiene visibilidad durante dias o semanas, frente a las horas de vida de un post en Telegram.</li>
        <li style={liStyle}><span style={strongStyle}>Interaccion directa.</span> Puedes crear un hilo donde los miembros hacen preguntas sobre tu producto. Es una sesion de ventas organica que ningun otro canal ofrece.</li>
      </ul>

      <h3 style={h3Style}>Desventajas de Discord</h3>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Escala limitada.</span> Servidores grandes tienen 5.000-50.000 miembros, pero la actividad real se concentra en 500-2.000 usuarios activos.</li>
        <li style={liStyle}><span style={strongStyle}>Campanas a medida.</span> No hay formato estandar. Las colaboraciones implican menciones, roles patrocinados, sorteos, eventos o integraciones con bots. Cada campana es un proyecto unico.</li>
        <li style={liStyle}><span style={strongStyle}>Barrera de entrada alta.</span> El usuario necesita cuenta, unirse al servidor y navegar multiples canales. Mas friccion que abrir una notificacion de Telegram o WhatsApp.</li>
      </ul>

      <h3 style={h3Style}>Rangos de precio en Discord (2026)</h3>
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Formato</th>
              <th style={thStyle}>Tamano servidor</th>
              <th style={thStyle}>Precio estimado</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdFirstStyle}>Anuncio en canal</td><td style={tdStyle}>5.000 - 10.000 miembros</td><td style={tdStyle}>30 - 80 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Sorteo + mencion</td><td style={tdStyle}>5.000 - 20.000 miembros</td><td style={tdStyle}>100 - 300 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Evento en vivo + hilo</td><td style={tdStyle}>10.000 - 50.000 miembros</td><td style={tdStyle}>200 - 500 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Partnership mensual</td><td style={tdStyle}>Servidor premium</td><td style={tdStyle}>500 - 2.000 EUR/mes</td></tr>
          </tbody>
        </table>
      </div>

      <img
        src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=720&q=80&auto=format"
        alt="Dashboard de analiticas con graficos comparativos de rendimiento por plataforma"
        style={imgStyle}
        loading="lazy"
      />
      <p style={captionStyle}>Comparar el rendimiento entre plataformas es clave para optimizar tu presupuesto — Foto: Unsplash</p>

      {/* ─── Section 4: Tabla comparativa ─── */}
      <h2 style={h2Style}>Tabla comparativa definitiva</h2>
      <p style={pStyle}>
        Si solo tienes dos minutos, esta tabla resume todo. Leela y salta directamente a la
        recomendacion por tipo de marca.
      </p>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Criterio</th>
              <th style={thStyle}>Telegram</th>
              <th style={thStyle}>WhatsApp</th>
              <th style={thStyle}>Discord</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdFirstStyle}>Usuarios Espana</td>
              <td style={tdStyle}>~15M</td>
              <td style={tdStyle}>~35M</td>
              <td style={tdStyle}>~8M</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Alcance por canal</td>
              <td style={tdStyle}>1K - 500K+</td>
              <td style={tdStyle}>256 - 2.048/grupo</td>
              <td style={tdStyle}>500 - 50K activos</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>CPM medio (EUR)</td>
              <td style={tdStyle}>3 - 12</td>
              <td style={tdStyle}>2 - 6</td>
              <td style={tdStyle}>3 - 10</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Tasa de apertura</td>
              <td style={tdStyle}>35 - 60%</td>
              <td style={tdStyle}>85 - 95%</td>
              <td style={tdStyle}>20 - 40%</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Engagement</td>
              <td style={tdStyle}>Medio (lectura)</td>
              <td style={tdStyle}>Alto (interaccion)</td>
              <td style={tdStyle}>Muy alto (activo)</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Formatos</td>
              <td style={tdStyle}>Post, imagen, video, boton</td>
              <td style={tdStyle}>Mensaje, post canal</td>
              <td style={tdStyle}>Anuncio, sorteo, evento, bot</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Facilidad de compra</td>
              <td style={tdStyle}>Alta</td>
              <td style={tdStyle}>Media</td>
              <td style={tdStyle}>Baja</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Verificacion metricas</td>
              <td style={tdStyle}>Si (vistas exactas)</td>
              <td style={tdStyle}>Parcial</td>
              <td style={tdStyle}>Limitada</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Escrow</td>
              <td style={tdStyle}>Si (Channelad)</td>
              <td style={tdStyle}>Si (Channelad)</td>
              <td style={tdStyle}>Si (Channelad)</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Mejor para</td>
              <td style={tdStyle}>Tech, finanzas, B2B</td>
              <td style={tdStyle}>Masivo, FMCG, local</td>
              <td style={tdStyle}>Gaming, Gen Z, Web3</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ─── Section 5: Recomendacion por marca ─── */}
      <h2 style={h2Style}>Recomendacion por tipo de marca</h2>
      <p style={pStyle}>
        No existe una respuesta universal. La plataforma ideal depende de quien eres, que vendes
        y a quien se lo vendes. Estas son las recomendaciones basadas en datos del mercado.
      </p>

      <h3 style={h3Style}>Consumo masivo (alimentacion, moda, belleza, hogar)</h3>
      <p style={pStyle}>
        Tu plataforma principal: <span style={strongStyle}>WhatsApp</span>. Tienes la mayor base de
        usuarios en Espana, las tasas de apertura mas altas y una percepcion de confianza que beneficia
        especialmente a productos de consumo. Complementa con Telegram para audiencias mas tech-savvy.
      </p>

      <h3 style={h3Style}>Startup tech, SaaS o B2B</h3>
      <p style={pStyle}>
        Tu plataforma principal: <span style={strongStyle}>Telegram</span>. Los canales de tecnologia
        y negocios tienen las audiencias mas cualificadas para B2B. Ecosistema publicitario maduro,
        formatos flexibles y medicion precisa. Usa Discord como secundario si tienes componente de
        comunidad o developer advocacy.
      </p>

      <h3 style={h3Style}>Gaming, esports, entretenimiento digital</h3>
      <p style={pStyle}>
        Tu unica opcion seria: <span style={strongStyle}>Discord</span>. Tu audiencia vive ahi,
        interactua ahi y toma decisiones de compra ahi. Un partnership con un servidor de 20.000
        miembros activos vale mas que mil impresiones en cualquier otro canal.
      </p>

      <h3 style={h3Style}>Marca dirigida a Gen Z (18-25)</h3>
      <p style={pStyle}>
        <span style={strongStyle}>Discord primero, Telegram segundo, WhatsApp tercero.</span> Gen Z
        usa WhatsApp para comunicarse con familiares pero no consume contenido de marcas ahi. Discord
        es donde pasan tiempo voluntariamente, y Telegram es donde siguen a creadores que admiran.
      </p>

      <h3 style={h3Style}>Estrategia full-funnel (presupuesto completo)</h3>
      <p style={pStyle}>
        Usa las tres plataformas con roles diferentes: <span style={strongStyle}>WhatsApp</span> para
        awareness masivo (funnel alto), <span style={strongStyle}>Telegram</span> para consideracion y
        educacion (funnel medio), <span style={strongStyle}>Discord</span> para conversion y comunidad
        post-compra (funnel bajo). Esta estrategia multicanal es exactamente lo que puedes gestionar
        desde{' '}<Link to="/marketplace" style={linkStyle}>Channelad</Link>, con acceso a canales
        verificados en las tres plataformas y pago protegido por escrow.
      </p>

      {/* ─── Section 6: Como empezar ─── */}
      <h2 style={h2Style}>Como empezar tu primera campana en comunidades</h2>
      <p style={pStyle}>
        Si nunca has anunciado en comunidades, el proceso puede parecer intimidante comparado con
        Meta Ads Manager. Pero una vez que lo haces, entiendes por que cada vez mas marcas dedican
        presupuesto creciente a este canal.
      </p>
      <ol style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Define tu audiencia</span> y elige la plataforma que mejor se ajuste segun las recomendaciones anteriores.</li>
        <li style={liStyle}><span style={strongStyle}>Busca canales relevantes</span> en tu nicho. Puedes hacerlo manualmente o usar{' '}<Link to="/marketplace" style={linkStyle}>Channelad</Link> que agrega canales verificados con metricas auditadas.</li>
        <li style={liStyle}><span style={strongStyle}>Empieza con un piloto pequeno:</span> 2-3 canales, 100-300 EUR de presupuesto, y un objetivo medible (clics, registros, ventas).</li>
        <li style={liStyle}><span style={strongStyle}>Mide resultados</span> de forma rigurosa y compara el CPA con tus otros canales. Segun datos del mercado, el CPA en comunidades suele ser un 30-50% inferior al de Meta Ads para tech y B2B.</li>
      </ol>
      <p style={pStyle}>
        Para entender los numeros en detalle, lee nuestra{' '}
        <Link to="/blog/cuanto-paga-telegram" style={linkStyle}>guia sobre cuanto cuesta la publicidad en Telegram</Link>
        {' '}y la{' '}
        <Link to="/blog/monetizar-canal-telegram-espana" style={linkStyle}>guia de monetizacion para canales</Link>.
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
          Lanza tu primera campana en comunidades verificadas
        </h2>
        <p style={{ ...pStyle, color: 'var(--muted)', marginBottom: '20px', maxWidth: '520px', margin: '0 auto 20px' }}>
          Explora canales de Telegram, WhatsApp y Discord con metricas auditadas y pago
          protegido por escrow. Sin perseguir pagos, sin intermediarios, sin riesgo.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/marketplace"
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
            Explorar marketplace
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
