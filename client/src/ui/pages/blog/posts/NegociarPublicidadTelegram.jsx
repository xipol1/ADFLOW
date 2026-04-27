import React from 'react'
import { Link } from 'react-router-dom'

const PURPLE = '#7C3AED'
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
const quoteStyle = { margin: '24px 0', padding: '20px 24px', borderLeft: `3px solid ${PURPLE}`, background: `${PURPLE}05`, borderRadius: '0 12px 12px 0', fontStyle: 'italic', fontSize: '15px', lineHeight: 1.7, color: 'var(--text)' }
const boxStyle = { background: `${PURPLE}08`, border: `1px solid ${PURPLE}20`, borderRadius: '12px', padding: '20px 24px', margin: '24px 0' }

export default function NegociarPublicidadTelegram() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0' }}>
      <p style={pStyle}>
        Negociar publicidad en Telegram es un arte que nadie te enseña. Ni los cursos de marketing, ni los
        bootcamps de creadores. Aprendes a base de cerrar deals flojos y darte cuenta tarde de que dejaste 30%
        sobre la mesa. He visto creadores con canales identicos cobrar 2.000 EUR o 4.500 EUR al mes por el
        mismo trabajo. La unica diferencia es como negocian.
      </p>
      <p style={pStyle}>
        Esta guia recoge los patrones que funcionan: como abrir una negociacion, como responder a los intentos
        de bajada de precio mas comunes, que condiciones siempre incluir (incluso si el anunciante no las
        pide) y como decir no sin quemar el contacto. Con los scripts tal cual usados en cientos de
        negociaciones reales.
      </p>

      <img src="https://images.unsplash.com/photo-1553877522-43269d4ea984?w=720&q=80&auto=format" alt="Creador de Telegram negociando una campaña publicitaria con una marca" style={imgStyle} loading="lazy" />
      <p style={captionStyle}>Negociar no es pelear: es proteger el valor que aportas — Foto: Unsplash</p>

      <h2 style={h2Style}>La regla que cambia todo: quien da el primer precio, pierde</h2>
      <p style={pStyle}>
        Si un anunciante te escribe y te pregunta "cuanto cuesta un post en tu canal", no respondas con el
        precio. Responde con una pregunta. Por que? Porque el primer numero fija el rango. Si tu tarifa es
        80 EUR pero el anunciante tenia presupuesto de 250 EUR, al dar tu precio primero le has regalado
        170 EUR.
      </p>
      <div style={quoteStyle}>
        Anunciante: "Hola, me interesa publicidad en tu canal. Cuanto cobras por un post?"<br /><br />
        Creador (mal): "80 EUR por post estandar."<br /><br />
        Creador (bien): "Hola! Cuentame primero sobre vuestra campaña: que producto, que objetivo, cuantos
        posts estais valorando y para que fechas. Con eso te mando una propuesta personalizada con formatos
        y precios."
      </div>
      <p style={pStyle}>
        Al forzarle a hablar primero descubres tres cosas clave: <span style={strongStyle}>presupuesto
        implicito</span> (un anunciante que pregunta por 10 posts tiene un presupuesto muy distinto del que
        pregunta por 1), <span style={strongStyle}>valor real para el</span> (cuanto mas especifica sea la
        campaña, mas valor tiene acceder a tu audiencia) y <span style={strongStyle}>urgencia</span> (un
        anunciante con fecha fija esta dispuesto a pagar mas).
      </p>

      <h2 style={h2Style}>Las preguntas que siempre debes hacer antes de dar precio</h2>
      <div style={boxStyle}>
        <ol style={{ paddingLeft: '20px', margin: 0 }}>
          <li style={liStyle}>Que producto o servicio es el objeto de la campaña</li>
          <li style={liStyle}>Cuantos posts estais valorando (1 suelto, campaña de 4, acuerdo mensual)</li>
          <li style={liStyle}>Que formato os interesa (post, fijado, video, mencion organica)</li>
          <li style={liStyle}>Para que fechas tenis prevista la campaña</li>
          <li style={liStyle}>Teneis otros canales con los que hayais trabajado antes en este nicho</li>
          <li style={liStyle}>Quien gestiona la campaña: la marca directamente o una agencia</li>
          <li style={liStyle}>Que tipo de resultados buscais (visibilidad, clicks, ventas)</li>
        </ol>
      </div>
      <p style={pStyle}>
        Con las respuestas a estas 7 preguntas sabes: <span style={strongStyle}>cuanto vale tu canal para
        este anunciante en particular, cuanto puede pagar y cuanto debes cobrar</span>. Y la propuesta que
        envias es especifica para ellos, no una tarifa genérica.
      </p>

      <h2 style={h2Style}>La estructura de una propuesta que cierra deals</h2>
      <p style={pStyle}>
        Una propuesta efectiva tiene 5 partes y no pasa de una pantalla:
      </p>

      <h3 style={h3Style}>1. Resumen del canal (2 lineas)</h3>
      <p style={pStyle}>
        "Canal de finanzas personales para millennials españoles. 8.200 suscriptores activos. Tasa de apertura
        del 55% y engagement del 12%. Publicamos 2 posts diarios."
      </p>

      <h3 style={h3Style}>2. Propuesta especifica para su campaña</h3>
      <p style={pStyle}>
        No tarifas genericas. Algo tipo: "Para vuestra campaña de [producto] os recomiendo 3 posts
        escalonados durante 2 semanas: post inicial de presentacion, seguimiento con encuesta, cierre con
        caso de uso. Total: 280 EUR (IVA no incluido)."
      </p>

      <h3 style={h3Style}>3. Fechas y condiciones</h3>
      <p style={pStyle}>
        "Disponibilidad: semanas del 5 y 19 de mayo. Contenido: podeis enviar creativos o los escribo yo con
        guidelines vuestras (sin coste extra). Reserva con 50% por adelantado. Resto tras la ultima
        publicacion."
      </p>

      <h3 style={h3Style}>4. Pruebas sociales</h3>
      <p style={pStyle}>
        "Campañas recientes en el canal: [enlace a caso 1], [enlace a caso 2]. Tasas de conversion
        tipicas: 4-7% de clicks sobre audiencia total."
      </p>

      <h3 style={h3Style}>5. Siguiente paso claro</h3>
      <p style={pStyle}>
        "Si os interesa, respondedme con las fechas que prefireis y os mando el briefing y la factura
        proforma. Si necesitais otro formato, os preparo una alternativa en menos de 24h."
      </p>

      <h2 style={h2Style}>Los 6 intentos de bajada de precio mas comunes (y como responder)</h2>

      <h3 style={h3Style}>"Tenemos un presupuesto ajustado"</h3>
      <p style={pStyle}>
        Respuesta: <span style={strongStyle}>"Perfecto, cuentame cual es el techo y te propongo un formato
        que encaje."</span> Esto hace dos cosas: el anunciante revela su presupuesto real, y tu controlas
        el formato (puedes ofrecer 1 post estandar en vez de 1 fijado, no baja la tarifa por post).
      </p>

      <h3 style={h3Style}>"El canal X cobra la mitad"</h3>
      <p style={pStyle}>
        Respuesta: <span style={strongStyle}>"Tiene sentido comparar, pero los datos tienen que ser
        equivalentes. Nuestro canal tiene X suscriptores activos (no totales), 55% tasa de apertura y 12%
        engagement. Si el canal X tiene metricas iguales o superiores, probablemente tenga sentido ir con
        ellos."</span> Esto fuerza a comparar sobre datos reales, no impresiones. La mayoria de veces el
        otro canal es peor y el anunciante lo descubre.
      </p>

      <h3 style={h3Style}>"A cambio os daremos visibilidad en nuestras redes"</h3>
      <p style={pStyle}>
        Respuesta: <span style={strongStyle}>"La visibilidad no paga el alquiler. Si vuestras redes tienen
        audiencia relevante para mi, estudio un intercambio parcial: 40% pago en euros, 60% en contra-
        promocion. Pero la parte en dinero no puedo quitarla."</span> El barter total solo tiene sentido si
        la marca es mucho mas grande que tu canal. En ese caso, igual te conviene.
      </p>

      <h3 style={h3Style}>"Si funciona esta, haremos muchas mas"</h3>
      <p style={pStyle}>
        Respuesta: <span style={strongStyle}>"Me encantaria. Para asegurarnos de empezar bien, esta primera
        campaña va con tarifa estandar. Si decidis continuar, a partir de la tercera aplico descuento por
        volumen del 15-20%."</span> Nunca bajes la primera para una promesa. Si la campaña va bien, ellos
        volveran a precio completo.
      </p>

      <h3 style={h3Style}>"Queremos pagar a 60/90 dias tras la publicacion"</h3>
      <p style={pStyle}>
        Respuesta: <span style={strongStyle}>"Nuestro proceso es 50% al reservar, 50% al publicar. Si
        preferis pagar a plazos, podemos usar un escrow protegido: vosotros depositais, se libera a mi
        cuenta el mismo dia de publicar. Asi tampoco asumis riesgo de incumplimiento."</span> Las marcas
        serias lo aceptan. Las que no, probablemente no te iban a pagar. El{' '}
        <Link to="/blog/escrow-publicidad-digital" style={linkStyle}>escrow</Link> resuelve esto de un
        plumazo.
      </p>

      <h3 style={h3Style}>"Necesitamos exclusividad en la categoria durante X meses"</h3>
      <p style={pStyle}>
        Respuesta: <span style={strongStyle}>"La exclusividad tiene coste. 1 mes de exclusividad en la
        categoria = 30% sobre el precio de la campaña. 3 meses = 60%. Asi que si quereis exclusividad, os
        paso tarifa ajustada."</span> Nunca regales la exclusividad gratis. Supone perder deals paralelos
        reales, asi que hay que cobrarlo.
      </p>

      <h2 style={h2Style}>Condiciones que siempre debes incluir (aunque no las pidan)</h2>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Pago 50% por adelantado:</span> tu protegido, el anunciante muestra compromiso real. Si no paga el 50%, no va a pagar el 100%.</li>
        <li style={liStyle}><span style={strongStyle}>Aprobacion de contenido por ambas partes:</span> tu te reservas el derecho de rechazar si el contenido daña tu marca. Esto protege tu canal a largo plazo.</li>
        <li style={liStyle}><span style={strongStyle}>Sin competencia en ventana de 7 dias:</span> no publicas de otro anunciante del mismo sector durante la semana de su campaña. Es un detalle profesional que valoran mucho.</li>
        <li style={liStyle}><span style={strongStyle}>Metricas finales en 48h:</span> te comprometes a enviar vistas, engagement y clicks tras la publicacion. Transparencia total.</li>
        <li style={liStyle}><span style={strongStyle}>Clausula de republicacion:</span> si el post falla por algo tecnico de tu lado (lo borras, el canal se cae), republicas sin coste.</li>
      </ul>

      <h2 style={h2Style}>Cuando decir no sin quemar el contacto</h2>
      <p style={pStyle}>
        Hay deals que no merecen la pena aunque paguen. Decir no es una habilidad. Tres escenarios donde
        debes rechazar incluso si el dinero esta encima de la mesa:
      </p>

      <h3 style={h3Style}>1. Producto que daña tu credibilidad</h3>
      <p style={pStyle}>
        Si tu canal es de finanzas y te ofrecen publicitar un esquema piramidal, no. Aunque paguen el triple.
        Un mal patrocinio puede hundir 2 años de trabajo en una semana.
      </p>
      <div style={quoteStyle}>
        "Gracias por la propuesta. En este caso no podemos colaborar porque [motivo especifico: no
        comparte valores del canal / no tengo conocimiento del producto para recomendarlo / genera conflicto
        con otros anunciantes]. Si tenis otro producto en vuestro catalogo que encaje mejor, encantado."
      </div>

      <h3 style={h3Style}>2. Presupuesto que no cubre tu tarifa minima</h3>
      <p style={pStyle}>
        Si el anunciante pide un post por 20 EUR y tu tarifa es 80 EUR, no lo hagas ni por favor. Decir si
        a una tarifa baja te encasilla: el mismo anunciante volvera con "la misma tarifa" y otros canales
        compararan con ese precio.
      </p>
      <div style={quoteStyle}>
        "Gracias por pensar en nosotros. Nuestra tarifa minima por post es de 80 EUR por el volumen y
        calidad de nuestra audiencia. Si en el futuro teneis mas presupuesto, encantado de colaborar."
      </div>

      <h3 style={h3Style}>3. Condiciones abusivas</h3>
      <p style={pStyle}>
        Pago a 90 dias sin escrow, exclusividad gratis de 6 meses, derecho a usar tu nombre en otras
        campañas sin tu autorizacion. Son señales claras de que la marca va a explotarte. Mejor no entrar.
      </p>

      <h2 style={h2Style}>Como Channelad cambia la negociacion</h2>
      <p style={pStyle}>
        La mayor parte de esta guia asume que negocias por DM con cada anunciante. Es agotador y lleno de
        friccion. Si publicas tu canal en <Link to="/" style={linkStyle}>Channelad</Link>, cambian tres cosas:
      </p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Precio prefijado:</span> publicas tarifas en el marketplace. Los anunciantes que contactan ya saben lo que cuestas. No hay "el canal X cobra la mitad".</li>
        <li style={liStyle}><span style={strongStyle}>Escrow automatico:</span> el anunciante paga por adelantado al marketplace. Tu cobras cuando publicas. Cero riesgo de impago.</li>
        <li style={liStyle}><span style={strongStyle}>Historial publico:</span> cada campaña completada queda como review verificada. A la tercera campaña exitosa, los anunciantes te contactan con tarifa completa sin negociar.</li>
      </ul>
      <p style={pStyle}>
        Si quieres negociar menos y cobrar mas, publica tu canal{' '}
        <Link to="/" style={linkStyle}>aqui</Link>. Gratis para creadores.
      </p>

      <h2 style={h2Style}>Preguntas frecuentes</h2>

      <h3 style={h3Style}>Puedo negociar despues de haber mandado la tarifa?</h3>
      <p style={pStyle}>
        Si, pero con cuidado. Puedes subir la tarifa si el anunciante pide un formato distinto, mas posts, o
        una ventana de tiempo especial. Nunca bajes sin una contrapartida clara (volumen mayor, pago
        adelantado, exclusividad pagada).
      </p>

      <h3 style={h3Style}>Cuanto tiempo puedo hacer esperar al anunciante?</h3>
      <p style={pStyle}>
        Responde en menos de 24h laborables siempre. Si tardas mas, el anunciante ya esta negociando con
        otros tres canales y tu queda fuera. La velocidad de respuesta es una de las variables de compra
        mas ignoradas.
      </p>

      <h3 style={h3Style}>Y si el anunciante quiere pagar en cripto o sin factura?</h3>
      <p style={pStyle}>
        No. Siempre con factura regulada. Cobrar sin factura te hace responsable legal ante Hacienda. El
        cripto solo si puedes emitir factura por su equivalente en euros el dia de la transaccion.
      </p>

      <h3 style={h3Style}>Como gestiono la negociacion cuando el anunciante pide agencia de por medio?</h3>
      <p style={pStyle}>
        Si la agencia es quien contrata, factura a la agencia y deja por escrito que la campaña es para la
        marca X. Las agencias suelen intentar quedarse un 15-20% de margen sobre tu tarifa. Si lo detectas,
        ofrece trabajar directamente con la marca a cambio de una pequeña comision de referido para la
        agencia.
      </p>

      <h3 style={h3Style}>Cuando sube la tarifa un paquete mensual merece la pena?</h3>
      <p style={pStyle}>
        Depende. Un paquete de 4 posts al mes con 15% de descuento y pago por adelantado: si. Un paquete de
        10 posts al mes con 30% de descuento y pago a 60 dias: no. Calcula siempre la tarifa efectiva por
        post despues del descuento y compara con tu mercado.
      </p>

      <h2 style={h2Style}>Conclusion</h2>
      <p style={pStyle}>
        Negociar bien no es pelear por cada euro: es proteger el valor que aportas. Siete preguntas antes de
        dar precio, una propuesta especifica, condiciones que siempre incluir, y saber cuando decir no. Con
        esto doblas ingresos sin tener que doblar suscriptores.
      </p>
      <p style={pStyle}>
        Si prefieres no negociar y que los anunciantes te encuentren con tarifas prefijadas y escrow
        automatico, empieza en <Link to="/" style={linkStyle}>Channelad</Link>. Menos friccion, mas tiempo
        para crear contenido.
      </p>
    </div>
  )
}
