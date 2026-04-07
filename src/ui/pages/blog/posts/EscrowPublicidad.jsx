import React from 'react'
import { Link } from 'react-router-dom'

const PURPLE = '#7C3AED'
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

const stepNumberStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  background: PURPLE,
  color: '#fff',
  fontFamily: D,
  fontWeight: 700,
  fontSize: '15px',
  marginRight: '12px',
  flexShrink: 0,
}

const stepContainerStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  marginBottom: '20px',
  padding: '16px 20px',
  borderRadius: '12px',
  background: 'rgba(124, 58, 237, 0.05)',
  border: '1px solid rgba(124, 58, 237, 0.12)',
}

const stepTextStyle = {
  fontFamily: F,
  fontSize: '16px',
  lineHeight: 1.65,
  color: 'var(--text)',
  flex: 1,
}

export default function EscrowPublicidad() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 24px 80px' }}>

      {/* ─── H1 + Personal intro ─── */}
      <p style={pStyle}>
        Te voy a contar algo que me pasó hace año y medio y que cambió completamente la forma en que compro publicidad online. Perdí 240€ en una campaña de Telegram porque el admin de un canal de criptomonedas borró mi post a las 2 horas de publicarlo y dejó de responder. Así, sin más. Le había pagado por Bizum, como me pidió, y cuando fui a reclamar me di cuenta de que no tenía absolutamente nada. Ni contrato, ni factura, ni forma de recuperar mi dinero. Solo capturas de una conversación que no servían para nada.
      </p>
      <p style={pStyle}>
        Esa noche, frustrado y con una cerveza en la mano, me puse a investigar cómo funcionaban los marketplaces de publicidad que habían empezado a aparecer. Y ahí descubrí un concepto que ya existía en el mundo inmobiliario y en las transacciones de freelancers pero que apenas nadie aplicaba a la publicidad digital: el escrow. O como prefiero llamarlo en español, el pago custodiado.
      </p>
      <p style={pStyle}>
        Desde ese día, solo trabajo con plataformas que ofrecen pago custodiado. Te lo digo por experiencia: es la única forma de comprar publicidad en comunidades sin jugarte el dinero a ciegas. Y en este artículo te voy a explicar exactamente qué es, cómo funciona y por qué debería importarte si inviertes un solo euro en publicidad digital.
      </p>

      <img
        src="https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=720&q=80&auto=format"
        alt="Protección de pagos en transacciones digitales"
        style={imgStyle}
        loading="lazy"
      />
      <p style={captionStyle}>La protección del pago es la base de cualquier transacción digital seria — Foto: Unsplash</p>

      {/* ─── Section 2: Qué es el escrow ─── */}
      <h2 style={h2Style}>Qué es exactamente el escrow o pago custodiado en publicidad</h2>
      <p style={pStyle}>
        Vamos a ver. El escrow en publicidad es un sistema donde tu dinero no va directamente al bolsillo del canal o creador que te vende el espacio publicitario. En vez de eso, un intermediario de confianza —normalmente la plataforma o marketplace— retiene ese dinero en custodia hasta que se confirma que el servicio se ha prestado correctamente.
      </p>
      <p style={pStyle}>
        Piensa en cómo funciona la compra de una vivienda. Tú no le das 200.000€ al vendedor y confías en que te dará las llaves. Hay un notario, una entidad que custodia los fondos, y el dinero solo cambia de manos cuando se cumplen las condiciones del contrato. Pues el escrow en publicidad digital funciona exactamente igual, pero adaptado a transacciones más pequeñas y rápidas.
      </p>
      <p style={pStyle}>
        En el contexto de la publicidad en comunidades de Telegram, Discord o newsletters, el pago custodiado significa que cuando tú contratas una publicación patrocinada, tu dinero queda retenido en la plataforma. El admin del canal publica tu anuncio, la plataforma verifica que se ha publicado durante el tiempo acordado, y solo entonces libera el pago al canal. Si algo falla —el post se borra antes de tiempo, no se publica, o las métricas no coinciden— puedes abrir una disputa y la plataforma actúa como árbitro.
      </p>
      <p style={pStyle}>
        Es así de simple. Y sin embargo, la mayoría de anunciantes que conozco siguen pagando por adelantado sin ninguna garantía. ¿Enviarías 500€ por Bizum a un desconocido sin garantía de que cumpla? Pues eso es exactamente lo que haces cuando pagas publicidad sin escrow.
      </p>

      {/* ─── Section 3: Cómo funciona paso a paso ─── */}
      <h2 style={h2Style}>Cómo funciona el pago custodiado en publicidad paso a paso</h2>
      <p style={pStyle}>
        Esto es clave: entender el flujo completo del escrow te va a dar la tranquilidad de saber en qué momento exacto se mueve tu dinero. Te lo explico con un ejemplo real, una campaña que yo mismo lancé en un canal de productividad con 12.000 suscriptores.
      </p>

      <div style={stepContainerStyle}>
        <span style={stepNumberStyle}>1</span>
        <div style={stepTextStyle}>
          <span style={strongStyle}>Seleccionas el canal y la oferta.</span> Entras en el marketplace, buscas canales en tu nicho, revisas sus métricas (suscriptores, vistas medias, engagement) y eliges una oferta. En mi caso, elegí un post fijado durante 24 horas por 85€.
        </div>
      </div>

      <div style={stepContainerStyle}>
        <span style={stepNumberStyle}>2</span>
        <div style={stepTextStyle}>
          <span style={strongStyle}>Realizas el pago y queda en custodia.</span> Pagas con tarjeta o el método que ofrezca la plataforma. Tu dinero no va al admin del canal. Se queda retenido en la plataforma, en custodia. El admin recibe una notificación de que hay una campaña pendiente.
        </div>
      </div>

      <div style={stepContainerStyle}>
        <span style={stepNumberStyle}>3</span>
        <div style={stepTextStyle}>
          <span style={strongStyle}>El canal publica tu anuncio.</span> El admin tiene un plazo para publicar tu creatividad según las condiciones acordadas: formato, duración, hora de publicación. Si no publica en el plazo, se te devuelve el dinero automáticamente.
        </div>
      </div>

      <div style={stepContainerStyle}>
        <span style={stepNumberStyle}>4</span>
        <div style={stepTextStyle}>
          <span style={strongStyle}>Verificación de la campaña.</span> La plataforma verifica que el post se publicó correctamente, que ha estado visible durante el tiempo acordado y que las métricas básicas coinciden. Esta verificación puede ser automática (mediante bots) o manual.
        </div>
      </div>

      <div style={stepContainerStyle}>
        <span style={stepNumberStyle}>5</span>
        <div style={stepTextStyle}>
          <span style={strongStyle}>Liberación del pago o disputa.</span> Si todo ha ido bien, la plataforma libera el dinero al admin del canal. Si algo ha fallado, tú puedes abrir una disputa antes de que se libere el pago. Un equipo de soporte revisa las pruebas y decide: reembolso parcial, total o liberación del pago.
        </div>
      </div>

      <p style={pStyle}>
        En mi campaña de productividad, todo salió perfecto. El admin publicó a la hora acordada, el post estuvo fijado 24 horas, y conseguí 43 clics al enlace de mi landing. Pero la tranquilidad de saber que si algo salía mal mi dinero estaba protegido... eso no tiene precio. Sobre todo después de haberme quemado con los 240€ que perdí antes.
      </p>
      <p style={pStyle}>
        Compara eso con lo que hacía antes: enviar dinero por Bizum, confiar en que el admin no me iba a estafar, y cruzar los dedos. La diferencia es abismal.
      </p>

      {/* ─── Section 4: Por qué lo necesitas ─── */}
      <h2 style={h2Style}>Por qué necesitas escrow si compras publicidad en comunidades</h2>
      <p style={pStyle}>
        La realidad es que el mercado de publicidad en comunidades todavía es un Salvaje Oeste. No estamos hablando de Google Ads o Meta Ads, donde hay una empresa multimillonaria detrás con sistemas de verificación, políticas de reembolso y un equipo legal al que puedes acudir. Estamos hablando de tratar directamente con admins de canales que, en muchos casos, son personas anónimas sin ninguna obligación contractual contigo.
      </p>
      <p style={pStyle}>
        Estos son los cuatro riesgos reales de pagar publicidad sin protección:
      </p>

      <h3 style={h3Style}>1. El admin cobra y desaparece</h3>
      <p style={pStyle}>
        Me ha pasado. Le ha pasado a colegas que conozco. Le pasa a más gente de la que crees. Un admin te manda sus tarifas, le pagas, y de repente deja de leer tus mensajes. No publica tu anuncio. No responde. Y tú te quedas sin dinero y sin campaña. Sin escrow, no tienes absolutamente ningún recurso. Con pago custodiado, el dinero vuelve a ti automáticamente si no se publica en el plazo acordado.
      </p>

      <h3 style={h3Style}>2. El post se borra antes de tiempo</h3>
      <p style={pStyle}>
        Contratas una publicación de 48 horas y el admin la borra a las 6 horas porque otro anunciante le pagó más. ¿Cómo demuestras que se borró? ¿A quién reclamas? Sin un sistema de verificación y custodia, estás vendido. En una plataforma con escrow, la verificación automática detecta que el post desapareció y puedes abrir una disputa antes de que el admin reciba un solo euro.
      </p>

      <h3 style={h3Style}>3. Métricas infladas o falsas</h3>
      <p style={pStyle}>
        Hay canales que te venden 50.000 suscriptores pero tienen un engagement real del 0.3%. Te enseñan capturas editadas de las estadísticas. Sin un marketplace con verificación independiente de métricas, no tienes forma de confirmar que estás comprando lo que te venden. El escrow, combinado con un buen marketplace, garantiza que los datos del canal son verificados antes de que tu dinero esté en juego.
      </p>

      <h3 style={h3Style}>4. Sin factura ni rastro fiscal</h3>
      <p style={pStyle}>
        Si pagas publicidad por Bizum o transferencia directa a un admin anónimo, no tienes factura. No puedes deducir ese gasto como empresa. A nivel fiscal, ese dinero simplemente desapareció. Las plataformas que operan con escrow emiten factura por cada transacción, lo cual es imprescindible si eres autónomo o empresa en España.
      </p>

      <img
        src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=720&q=80&auto=format"
        alt="Dashboard de análisis comparativo de campañas"
        style={imgStyle}
        loading="lazy"
      />
      <p style={captionStyle}>Comparar campañas protegidas vs desprotegidas revela una diferencia brutal — Foto: Unsplash</p>

      {/* ─── Section 5: Mi experiencia comparativa ─── */}
      <h2 style={h2Style}>Mi experiencia: campañas con escrow vs campañas sin protección</h2>
      <p style={pStyle}>
        Voy a ser transparente y ponerte números reales sobre la mesa. En los últimos 18 meses he lanzado 23 campañas de publicidad en canales de Telegram y newsletters. De esas 23, las primeras 8 las hice sin ningún tipo de protección. Las últimas 15 las he hecho a través de marketplaces con pago custodiado. La diferencia me ha dejado claro cuál es el camino.
      </p>
      <p style={pStyle}>
        De las 8 campañas sin escrow, en 2 me estafaron directamente (una es la de los 240€ que ya te conté, la otra fueron 90€ en un canal de gaming que publicó un formato completamente diferente al acordado y se negó a corregirlo). En otras 2, el post se publicó tarde y con un formato mediocre, pero como ya había pagado no pude hacer nada. Solo 4 de esas 8 campañas salieron como esperaba. Es decir, un 50% de fracaso parcial o total. Inaceptable.
      </p>
      <p style={pStyle}>
        Con las 15 campañas con pago custodiado, los resultados han sido radicalmente diferentes. 13 se completaron sin ninguna incidencia. En 1 tuve que abrir una disputa porque el admin publicó 6 horas más tarde de lo acordado, y la plataforma me ofreció un reembolso parcial del 30%. En la otra, el admin directamente no publicó y recuperé el 100% de mi dinero automáticamente a los 3 días.
      </p>
      <p style={pStyle}>
        Eso es un ratio de éxito del 87% con resolución satisfactoria en el 100% de los casos problemáticos. Versus un 50% de éxito sin posibilidad de reclamar nada cuando las cosas salían mal. Los números hablan solos.
      </p>
      <p style={pStyle}>
        Pero más allá de los números, hay algo que no se cuantifica tan fácil: la tranquilidad mental. Cuando lanzas una campaña sabiendo que tu dinero está protegido, puedes dedicar tu energía a optimizar la creatividad, el copy, la segmentación. No estás pendiente de si te van a estafar. Y eso, te lo digo por experiencia, cambia completamente tu forma de trabajar.
      </p>

      {/* ─── Section 6: Plataformas que ofrecen escrow ─── */}
      <h2 style={h2Style}>Qué plataformas de publicidad ofrecen escrow en 2026</h2>
      <p style={pStyle}>
        Aquí viene la parte que más me preguntan cuando hablo de esto en foros y comunidades. ¿Dónde puedo comprar publicidad con pago custodiado? La respuesta corta: hay muy pocas opciones. La mayoría de plataformas de publicidad en comunidades no ofrecen escrow real. Vamos a repasar las principales.
      </p>

      <h3 style={h3Style}>Channelad — Escrow nativo integrado</h3>
      <p style={pStyle}>
        <Link to="/para-anunciantes" style={linkStyle}>Channelad</Link> es la plataforma que yo uso actualmente para la mayoría de mis campañas. Es un <Link to="/marketplace" style={linkStyle}>marketplace de publicidad en comunidades</Link> que tiene el pago custodiado integrado de forma nativa en cada transacción. No es un añadido ni una opción premium: todas las compras pasan por escrow automáticamente. El dinero solo se libera al canal cuando la campaña se verifica. Y si algo falla, puedes abrir una disputa directamente desde el panel. Es exactamente lo que busco: protección por defecto, sin tener que pedirla.
      </p>

      <h3 style={h3Style}>Telega.in — Sin escrow real</h3>
      <p style={pStyle}>
        Telega es una plataforma rusa de publicidad en Telegram que lleva años en el mercado. La he usado y tiene un catálogo enorme de canales. Pero aquí viene el problema: no ofrece un sistema de escrow real como tal. Si revisas sus <Link to="/blog/telega-in-alternatives" style={linkStyle}>alternativas y limitaciones</Link>, verás que los pagos se procesan de forma bastante directa y el sistema de disputas es limitado. Además, su soporte está orientado al mercado ruso, lo que complica las reclamaciones si eres anunciante hispanohablante.
      </p>

      <h3 style={h3Style}>Collaborator — Más enfocado en SEO</h3>
      <p style={pStyle}>
        Collaborator es una plataforma interesante para comprar artículos patrocinados y backlinks, pero su enfoque principal es el SEO, no la publicidad en comunidades. No tiene un sistema de escrow comparable al de Channelad para campañas en Telegram o Discord. Es una buena herramienta para link building, pero no resuelve el problema de proteger tu inversión publicitaria en comunidades.
      </p>

      <h3 style={h3Style}>Contacto directo con admins — Cero protección</h3>
      <p style={pStyle}>
        Y luego está la opción que sigue siendo la más común y la más peligrosa: contactar directamente con el admin del canal por DM, negociar un precio, y pagarle por Bizum, PayPal o transferencia. Cero verificación, cero custodia, cero garantía. Si te sale bien, perfecto. Si no, has perdido tu dinero y no hay nadie a quien reclamar. Si un marketplace no ofrece escrow en 2026, huye. Así de simple.
      </p>

      {/* ─── Section 7: Qué hacer si algo sale mal ─── */}
      <h2 style={h2Style}>Qué hacer si algo sale mal en una campaña con pago custodiado</h2>
      <p style={pStyle}>
        Que exista escrow no significa que todo vaya a ser perfecto siempre. A veces las cosas fallan. Lo importante es que cuando falla, tienes un mecanismo real para resolverlo. Te cuento cómo funciona un proceso de disputa típico en una plataforma con pago custodiado.
      </p>
      <p style={pStyle}>
        Lo primero es documentar el problema. Si el post se borró antes de tiempo, haz capturas. Si las métricas no coinciden, guarda las pruebas. Luego, abre una disputa desde la plataforma antes de que se libere el pago. Esto es fundamental: una vez que el pago se libera, recuperarlo es mucho más complicado.
      </p>
      <p style={pStyle}>
        En plataformas como Channelad, el equipo de soporte revisa las pruebas de ambas partes. El anunciante presenta su reclamación y el admin del canal tiene la oportunidad de responder. Basándose en las pruebas, la plataforma decide si el reembolso es total, parcial o si el pago debe liberarse al canal. En mi experiencia, cuando tienes pruebas claras, la resolución suele estar de tu parte. Y lo mejor: todo queda registrado dentro de la plataforma, así que no necesitas andar persiguiendo a nadie por DM.
      </p>
      <p style={pStyle}>
        ¿Es perfecto? No. ¿Es infinitamente mejor que enviar dinero a un desconocido y rezar? Absolutamente.
      </p>

      <img
        src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=720&q=80&auto=format"
        alt="Inversión digital protegida con sistema de custodia"
        style={imgStyle}
        loading="lazy"
      />
      <p style={captionStyle}>Proteger tu inversión publicitaria es tan importante como optimizar la campaña — Foto: Unsplash</p>

      {/* ─── Section 8: ¿Encarece la publicidad? ─── */}
      <h2 style={h2Style}>¿El escrow encarece la publicidad? La verdad sobre las comisiones</h2>
      <p style={pStyle}>
        Esta es la pregunta que siempre sale. Y la entiendo perfectamente, porque al principio yo también pensaba que el pago custodiado iba a encarecerme las campañas. La realidad es que sí, hay una comisión. Normalmente las plataformas que ofrecen escrow cobran entre un 5% y un 15% sobre el precio de la campaña. Channelad, por ejemplo, se mueve en ese rango.
      </p>
      <p style={pStyle}>
        Pero vamos a hacer las cuentas reales. Yo perdí 240€ en una sola estafa. Con una comisión del 10%, tendría que gastar 2.400€ en publicidad para que el coste del escrow igualara lo que perdí por no usarlo. Y eso asumiendo que no me vuelven a estafar nunca más, cosa que estadísticamente no es realista si sigues operando sin protección.
      </p>
      <p style={pStyle}>
        La comisión del escrow no es un gasto extra. Es un seguro. Es el coste de dormir tranquilo sabiendo que tu inversión publicitaria está protegida. Y si eres una empresa o autónomo, esa comisión es deducible como gasto de servicio. Los 240€ que perdí por Bizum no los pude deducir de nada.
      </p>
      <p style={pStyle}>
        Además, piensa en el tiempo. Cada vez que negocio directamente con un admin, pierdo entre 30 minutos y 2 horas en idas y venidas de mensajes, negociar el precio, acordar el formato, coordinar la publicación. En un marketplace con escrow, todo ese proceso se reduce a 5 minutos. Mi tiempo también tiene un coste, y eso nadie lo cuenta.
      </p>

      {/* ─── CTA Block ─── */}
      <div style={{
        margin: '56px 0 0',
        padding: '40px 32px',
        borderRadius: '16px',
        background: `linear-gradient(135deg, ${PURPLE}11 0%, ${PURPLE}06 100%)`,
        border: `1.5px solid ${PURPLE}22`,
        textAlign: 'center',
      }}>
        <h2 style={{
          fontFamily: D,
          fontSize: 'clamp(20px, 3.5vw, 26px)',
          fontWeight: 700,
          color: 'var(--text)',
          marginBottom: '12px',
          lineHeight: 1.3,
        }}>
          Protege tu inversión publicitaria con pago custodiado
        </h2>
        <p style={{
          fontFamily: F,
          fontSize: '16px',
          lineHeight: 1.7,
          color: 'var(--muted)',
          maxWidth: '520px',
          margin: '0 auto 24px',
        }}>
          En Channelad, cada campaña pasa por escrow automáticamente. Tu dinero solo se libera cuando la publicación se verifica. Sin riesgos, sin sorpresas.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/para-anunciantes" style={{
            display: 'inline-block',
            padding: '14px 32px',
            background: PURPLE,
            color: '#fff',
            borderRadius: '10px',
            fontFamily: D,
            fontWeight: 600,
            fontSize: '15px',
            textDecoration: 'none',
            transition: 'transform 0.2s',
          }}>
            Comprar publicidad con escrow
          </Link>
          <Link to="/para-canales" style={{
            display: 'inline-block',
            padding: '14px 32px',
            background: 'transparent',
            color: PURPLE,
            borderRadius: '10px',
            fontFamily: D,
            fontWeight: 600,
            fontSize: '15px',
            textDecoration: 'none',
            border: `1.5px solid ${PURPLE}`,
            transition: 'transform 0.2s',
          }}>
            Monetizar mi canal
          </Link>
        </div>
      </div>

      {/* ─── Related articles ─── */}
      <div style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid rgba(124,58,237,0.1)' }}>
        <p style={{ ...pStyle, color: 'var(--muted)', fontSize: '14px', marginBottom: '12px' }}>
          Sigue leyendo:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li style={{ marginBottom: '8px' }}>
            <Link to="/blog/monetizar-canal-telegram-espana" style={linkStyle}>
              Cómo monetizar tu canal de Telegram en España
            </Link>
          </li>
          <li style={{ marginBottom: '8px' }}>
            <Link to="/blog/telega-in-alternatives" style={linkStyle}>
              Las mejores alternativas a Telega.in en 2026
            </Link>
          </li>
        </ul>
      </div>

    </div>
  )
}
