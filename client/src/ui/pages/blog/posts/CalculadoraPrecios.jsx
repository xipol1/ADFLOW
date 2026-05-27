import React from 'react'
import { Link } from 'react-router-dom'
import ChannelCalculator from '../../../components/calculator/ChannelCalculator'

const PURPLE = '#7C3AED'
const F = "'Inter', system-ui, sans-serif"
const D = "'Sora', system-ui, sans-serif"

const h2Style = { fontFamily: D, fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.3px', marginTop: '48px', marginBottom: '16px', color: 'var(--text)' }
const h3Style = { fontFamily: D, fontSize: '18px', fontWeight: 600, marginTop: '24px', marginBottom: '8px', color: 'var(--text)' }
const pStyle = { fontFamily: F, fontSize: '16px', lineHeight: 1.75, color: 'var(--text)', marginBottom: '16px' }
const linkStyle = { color: PURPLE, textDecoration: 'none', fontWeight: 600 }
const strongStyle = { fontWeight: 600 }

export default function CalculadoraPrecios() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0' }}>
      <p style={pStyle}>
        Si tienes un canal de Telegram, WhatsApp o Discord y quieres empezar a monetizarlo con publicidad, la primera pregunta es siempre la misma: <span style={strongStyle}>cuanto deberia cobrar por un post patrocinado?</span>
      </p>
      <p style={pStyle}>
        No hay una respuesta unica, pero si una formula que funciona. El precio de la publicidad en canales se calcula con el CPM (Coste Por Mil impresiones), que varia segun tu plataforma, tu nicho, la tasa de reacciones de tu audiencia y el formato del anuncio. La calculadora de abajo es la misma que usamos en el resto del sitio para darte una tarifa orientativa en segundos.
      </p>

      <h2 style={h2Style}>Calculadora de tarifa por formato e ingreso mensual</h2>
      <p style={pStyle}>
        Selecciona tu plataforma, introduce el numero de suscriptores activos y las reacciones medias por publicacion (ajustan el precio segun tu tasa de reacciones real), elige el nicho y el formato destacado. La calculadora te devuelve las tarifas recomendadas por cada formato publicitario y la estimacion de tu ingreso mensual.
      </p>

      <ChannelCalculator variant="blog" sectionId="calculadora-blog" />

      <h2 style={h2Style}>Como se calcula el precio: la formula del CPM</h2>
      <p style={pStyle}>
        El CPM (Coste Por Mil) es el estandar de la industria publicitaria. Representa lo que un anunciante paga por cada 1.000 impresiones de su mensaje. La formula para calcular el precio de un post patrocinado en tu canal es:
      </p>
      <div style={{ margin: '24px 0', padding: '20px', borderRadius: '12px', background: 'var(--bg2, #f5f5f7)', textAlign: 'center', fontFamily: D, fontSize: '18px', fontWeight: 600, color: PURPLE }}>
        Precio = (Impresiones x CPM efectivo) / 1.000
      </div>
      <p style={pStyle}>
        El "CPM efectivo" no es un numero fijo: parte de un CPM mediano de mercado (12 EUR) y se ajusta por tres multiplicadores: tu plataforma, tu nicho y tu tasa de reacciones. La calculadora hace estos calculos en tiempo real cuando mueves los inputs.
      </p>
      <p style={pStyle}>
        Las "impresiones" son los suscriptores activos multiplicados por la tasa de impresion tipica de la plataforma (alrededor del 60% como promedio conservador). Por eso un canal con 10.000 suscriptores activos no cobra como si tuviera 10.000 impresiones por post, sino como ~6.000.
      </p>

      <h3 style={h3Style}>Por que el CPM varia entre plataformas</h3>
      <p style={pStyle}>
        <span style={strongStyle}>WhatsApp</span> tiene los CPMs mas altos porque el open rate es del 75-90%. Los anunciantes pagan mas porque saben que su mensaje llega a casi toda la audiencia.
      </p>
      <p style={pStyle}>
        <span style={strongStyle}>Telegram</span> tiene CPMs intermedios con un mercado publicitario ya consolidado. El open rate ronda el 30-45%, con muchos catalogos y anunciantes activos.
      </p>
      <p style={pStyle}>
        <span style={strongStyle}>Discord</span> tiene CPMs ligeramente mas bajos pero tasa de lectura del 60-80% entre suscriptores activos: una interaccion sostenida superior a la del feed de redes sociales.
      </p>
      <p style={pStyle}>
        <span style={strongStyle}>Newsletter</span> es la plataforma con CPM mas alto del catalogo: open rates del 40-60% en audiencias B2B y conversion superior a la del feed social.
      </p>

      <h3 style={h3Style}>Por que importan las reacciones</h3>
      <p style={pStyle}>
        Dos canales con los mismos suscriptores no valen lo mismo si uno tiene 10 reacciones por post y el otro tiene 800. La calculadora ajusta el CPM segun tu tasa de reacciones (reacciones / suscriptores):
      </p>
      <ul style={{ paddingLeft: '24px', marginBottom: '24px' }}>
        <li style={{ fontFamily: F, fontSize: '15px', lineHeight: 1.7, color: 'var(--text)', marginBottom: '6px' }}>
          <span style={strongStyle}>Mas del 5%:</span> ajuste de +25% sobre el CPM base.
        </li>
        <li style={{ fontFamily: F, fontSize: '15px', lineHeight: 1.7, color: 'var(--text)', marginBottom: '6px' }}>
          <span style={strongStyle}>Entre 2% y 5%:</span> ajuste de +10%.
        </li>
        <li style={{ fontFamily: F, fontSize: '15px', lineHeight: 1.7, color: 'var(--text)', marginBottom: '6px' }}>
          <span style={strongStyle}>Entre 0,5% y 2%:</span> sin ajuste, tarifa base del nicho.
        </li>
        <li style={{ fontFamily: F, fontSize: '15px', lineHeight: 1.7, color: 'var(--text)', marginBottom: '6px' }}>
          <span style={strongStyle}>Menos del 0,5%:</span> ajuste de -15% sobre la tarifa base.
        </li>
      </ul>

      <h2 style={h2Style}>Formatos publicitarios y multiplicadores de precio</h2>
      <p style={pStyle}>
        No todos los formatos cuestan lo mismo. Un post fijado tiene mas visibilidad que uno normal, y un paquete de posts ofrece descuento por volumen. Estos son los multiplicadores que la calculadora aplica sobre el precio del post estandar:
      </p>
      <ul style={{ paddingLeft: '24px', marginBottom: '24px' }}>
        <li style={{ fontFamily: F, fontSize: '16px', lineHeight: 1.75, color: 'var(--text)', marginBottom: '8px' }}>
          <span style={strongStyle}>Post estandar (1x):</span> precio base del CPM.
        </li>
        <li style={{ fontFamily: F, fontSize: '16px', lineHeight: 1.75, color: 'var(--text)', marginBottom: '8px' }}>
          <span style={strongStyle}>Fijado 24h (2x):</span> permanece visible arriba del canal durante 24 horas.
        </li>
        <li style={{ fontFamily: F, fontSize: '16px', lineHeight: 1.75, color: 'var(--text)', marginBottom: '8px' }}>
          <span style={strongStyle}>Fijado 48h (3x):</span> mismo pero durante 48 horas, ideal para lanzamientos.
        </li>
        <li style={{ fontFamily: F, fontSize: '16px', lineHeight: 1.75, color: 'var(--text)', marginBottom: '8px' }}>
          <span style={strongStyle}>Mencion organica (1,5x):</span> el anuncio se integra dentro de tu contenido habitual.
        </li>
        <li style={{ fontFamily: F, fontSize: '16px', lineHeight: 1.75, color: 'var(--text)', marginBottom: '8px' }}>
          <span style={strongStyle}>Paquete 5 posts (-15%):</span> descuento por volumen para campanas mas largas.
        </li>
        <li style={{ fontFamily: F, fontSize: '16px', lineHeight: 1.75, color: 'var(--text)', marginBottom: '8px' }}>
          <span style={strongStyle}>Paquete 10 posts (-25%):</span> maximo descuento, ideal para anunciantes recurrentes.
        </li>
      </ul>

      <h2 style={h2Style}>Cuando y como subir tus tarifas</h2>
      <p style={pStyle}>
        Una regla operativa probada: revisar tarifas un 15-20% cada trimestre si el canal ha crecido. Los anunciantes serios aceptan subidas razonables si vienen acompanadas de datos (suscriptores, reacciones, campanas previas).
      </p>
      <p style={pStyle}>
        Sube tarifas cuando: tu canal crece un 20%+ en suscriptores, sube tu tasa de reacciones por post, tienes historial de campanas verificadas, o la demanda supera tu oferta. Si rechazas mas propuestas de las que aceptas, es senal de que tus tarifas se han quedado por debajo del mercado.
      </p>
      <p style={pStyle}>
        Para mas detalles sobre como calcular precios en Telegram, lee la <Link to="/blog/cuanto-cobrar-publicidad-telegram" style={linkStyle}>guia completa de precios de publicidad en Telegram</Link>. Si quieres entender como funciona el mercado en WhatsApp, consulta la <Link to="/blog/como-monetizar-canal-whatsapp" style={linkStyle}>guia de monetizacion de canales de WhatsApp</Link>.
      </p>

      <h2 style={h2Style}>Empieza a monetizar hoy</h2>
      <p style={pStyle}>
        Ahora que sabes cuanto cobrar, el siguiente paso es conectar con anunciantes. <Link to="/para-canales" style={linkStyle}>Registra tu canal en Channelad</Link> para recibir propuestas de anunciantes verificados con pago protegido por escrow. Sin negociaciones manuales, sin riesgo de impago.
      </p>
      <p style={pStyle}>
        Si eres anunciante y buscas canales verificados donde publicar, explora el <Link to="/marketplace" style={linkStyle}>marketplace de Channelad</Link> para filtrar por nicho, plataforma y audiencia.
      </p>
    </div>
  )
}
