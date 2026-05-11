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
const boxStyle = { background: `${PURPLE}08`, border: `1px solid ${PURPLE}20`, borderRadius: '12px', padding: '20px 24px', margin: '24px 0' }
const tableWrap = { overflowX: 'auto', margin: '24px 0' }
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontFamily: F, fontSize: '14px' }
const thStyle = { textAlign: 'left', padding: '12px 14px', borderBottom: `2px solid ${PURPLE}30`, fontWeight: 600, background: `${PURPLE}08`, color: 'var(--text)' }
const tdStyle = { padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--text)' }

export default function MediaKitDiscord() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0' }}>
      <p style={pStyle}>
        Tener 5.000 miembros activos en Discord no te garantiza vender publicidad. Lo que la garantiza es
        ensenarle a una marca, en menos de 30 segundos, que tu servidor es exactamente el lugar donde estan
        sus clientes. Ese documento se llama media kit y es la herramienta que separa a los creadores que
        cierran patrocinios de los que se quedan esperando respuestas.
      </p>
      <p style={pStyle}>
        En 2026 la mayoria de servidores espanoles no tienen media kit o lo tienen mal hecho: capturas
        borrosas, metricas inventadas, sin demografia. Esta guia recoge los 8 elementos que toda marca
        espera ver, las metricas que de verdad influyen en su decision y una plantilla lista para adaptar.
      </p>

      <img src="https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=720&q=80&auto=format" alt="Creador trabajando en el media kit de su servidor de Discord" style={imgStyle} loading="lazy" />
      <p style={captionStyle}>El media kit profesionaliza la monetizacion de tu Discord — Foto: Unsplash</p>

      <h2 style={h2Style}>Por que un media kit es imprescindible (incluso si tu servidor es pequeno)</h2>
      <p style={pStyle}>
        Las marcas que pagan publicidad reciben docenas de propuestas al mes. Si la tuya llega como un
        parrafo de WhatsApp con "tengo 8.000 miembros, cobro 80 EUR", asumen que no eres profesional y
        descartan sin ni siquiera abrirla. Si llega como un PDF de 4 paginas con tu nicho, demografia,
        metricas reales y formatos disponibles, eres profesional aunque tu servidor sea pequeno.
      </p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Multiplica la tasa de conversion 3-5x</span> sobre outreach sin media kit.</li>
        <li style={liStyle}><span style={strongStyle}>Justifica precios mas altos:</span> cuando el documento es bueno, el precio percibido sube.</li>
        <li style={liStyle}><span style={strongStyle}>Filtra anunciantes serios:</span> las marcas que no piden media kit suelen ser las que no pagan.</li>
      </ul>

      <h2 style={h2Style}>Los 8 elementos imprescindibles de un media kit de Discord</h2>

      <h3 style={h3Style}>1. Portada con identidad clara</h3>
      <p style={pStyle}>
        Una pagina que comunique en 5 segundos: nombre del servidor, nicho, propuesta unica y tu foto/avatar.
        Sin texto largo, sin frases marketinianas. Lo que ven las marcas: "Servidor X | Marketing digital
        para founders SaaS | 4.200 miembros activos".
      </p>

      <h3 style={h3Style}>2. Resumen ejecutivo (1 parrafo)</h3>
      <p style={pStyle}>
        Una descripcion corta que responda: que es el servidor, para quien es, que valor aporta y por que
        las marcas deberian considerarlo. Maximo 80-100 palabras. La mayoria de creadores se extiende y
        pierde la atencion.
      </p>

      <h3 style={h3Style}>3. Metricas clave verificables</h3>
      <p style={pStyle}>Las marcas no creen numeros sin pruebas. Lo que esperan:</p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Miembros totales</span> (sin inflar).</li>
        <li style={liStyle}><span style={strongStyle}>Miembros activos en los ultimos 30 dias</span> (la metrica que de verdad importa).</li>
        <li style={liStyle}><span style={strongStyle}>DAU/MAU:</span> el ratio sano es 15-25%.</li>
        <li style={liStyle}><span style={strongStyle}>Mensajes diarios medios</span> en los canales principales.</li>
        <li style={liStyle}><span style={strongStyle}>Tiempo medio de sesion</span> por usuario activo.</li>
        <li style={liStyle}><span style={strongStyle}>Tasa de crecimiento mensual</span> (ultimos 3-6 meses).</li>
      </ul>

      <h3 style={h3Style}>4. Demografia de la audiencia</h3>
      <p style={pStyle}>
        La data demografica vende mucho mas que el numero total de miembros. Las marcas piden:
      </p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Distribucion geografica:</span> pais y, si es posible, ciudades top.</li>
        <li style={liStyle}><span style={strongStyle}>Idioma principal:</span> solo espanol, multilingue, etc.</li>
        <li style={liStyle}><span style={strongStyle}>Rango de edad:</span> aproximado (puedes preguntarlo en una encuesta).</li>
        <li style={liStyle}><span style={strongStyle}>Perfil profesional:</span> empleado, freelance, founder, estudiante.</li>
        <li style={liStyle}><span style={strongStyle}>Genero:</span> si tiene relevancia para el nicho.</li>
      </ul>
      <p style={pStyle}>
        Si nunca has encuestado a tu comunidad, hazlo. Una encuesta de 5 preguntas en #anuncios puede
        recoger 200-500 respuestas en una semana en un servidor activo.
      </p>

      <h3 style={h3Style}>5. Formatos publicitarios disponibles + precios</h3>
      <p style={pStyle}>
        La parte que mas miran las marcas. Para cada formato, especifica: descripcion clara (post, rol,
        evento, bot), duracion, precio fijo (no "consultar") y que incluye.
      </p>
      <div style={tableWrap}>
        <table style={tableStyle}>
          <thead>
            <tr><th style={thStyle}>Formato</th><th style={thStyle}>Duracion</th><th style={thStyle}>Precio</th></tr>
          </thead>
          <tbody>
            <tr><td style={tdStyle}>Post en #anuncios</td><td style={tdStyle}>48h fijado</td><td style={tdStyle}>50 EUR</td></tr>
            <tr><td style={tdStyle}>Rol patrocinador</td><td style={tdStyle}>1 mes</td><td style={tdStyle}>250 EUR</td></tr>
            <tr><td style={tdStyle}>Evento AMA / workshop</td><td style={tdStyle}>1h en directo</td><td style={tdStyle}>200 EUR</td></tr>
            <tr><td style={tdStyle}>Bot personalizado</td><td style={tdStyle}>Mensual</td><td style={tdStyle}>400 EUR</td></tr>
            <tr><td style={tdStyle}>Paquete trimestral</td><td style={tdStyle}>3 meses</td><td style={tdStyle}>600 EUR</td></tr>
          </tbody>
        </table>
      </div>
      <p style={pStyle}>Ejemplo para servidor de 5.000 miembros activos en marketing.</p>

      <h3 style={h3Style}>6. Ejemplos de campanas anteriores</h3>
      <p style={pStyle}>
        Capturas de pantalla de 2-3 campanas anteriores con metricas: vistas del post, clicks generados,
        conversiones (si las tienes), feedback del anunciante. Una marca con cero historial cae mucho mas
        rapido en tu propuesta si ve que otra marca ya confio.
      </p>
      <p style={pStyle}>
        Si no tienes campanas, ofrece una primera campana a precio reducido a una marca pequena del nicho a
        cambio del permiso para incluir el caso en el media kit. La inversion vale la pena.
      </p>

      <h3 style={h3Style}>7. Testimonios de anunciantes anteriores</h3>
      <p style={pStyle}>
        Una frase corta de cada cliente anterior con su nombre, marca y rol. Si tienes pocos, basta con
        1-2. Un testimonio real vale mas que tres parrafos describiendo tu servidor.
      </p>

      <h3 style={h3Style}>8. Datos de contacto y siguiente paso</h3>
      <p style={pStyle}>
        Que la marca sepa exactamente que hacer despues de leer: email directo, pagina de booking si tienes
        Calendly, tiempo medio de respuesta y forma de pago preferida (escrow, transferencia, marketplace).
      </p>

      <h2 style={h2Style}>Como conseguir estadisticas verificables de tu servidor</h2>

      <h3 style={h3Style}>Opcion A: Bots de estadisticas (Statbot, Mee6 Premium)</h3>
      <p style={pStyle}>
        Bots que registran actividad y devuelven dashboards detallados: miembros activos, mensajes diarios,
        top contributors, retencion. Plan basico gratis. Plan profesional 5-15 EUR/mes. Recomendable para
        servidores que monetizan.
      </p>

      <h3 style={h3Style}>Opcion B: Server Insights nativo</h3>
      <p style={pStyle}>
        Si tu servidor tiene Community Server activado (gratuito), Discord muestra estadisticas basicas en
        la pagina del admin. Limitado pero util para empezar.
      </p>

      <h3 style={h3Style}>Opcion C: Recoger datos manualmente</h3>
      <p style={pStyle}>
        Una hoja de calculo donde apuntas semanalmente miembros totales, mensajes, joins, leaves. Tedioso
        pero suficiente para hacer un media kit profesional al principio.
      </p>

      <h2 style={h2Style}>Errores tipicos en media kits de Discord</h2>

      <h3 style={h3Style}>1. Inflar el numero de miembros</h3>
      <p style={pStyle}>
        Si tienes 8.000 totales pero solo 1.200 activos, no escribas "8.000+ miembros". Escribe "8.000
        miembros con 1.200 activos en los ultimos 30 dias". La transparencia genera mas confianza y mejores
        precios.
      </p>

      <h3 style={h3Style}>2. No tener cifras de engagement</h3>
      <p style={pStyle}>
        Las marcas saben que los miembros totales no significan nada en Discord. Si no muestras DAU/MAU,
        mensajes diarios o eventos mensuales, asumen que es un servidor muerto.
      </p>

      <h3 style={h3Style}>3. Precios "consultar"</h3>
      <p style={pStyle}>
        Mortal. La marca quiere comparar opciones y si el primer paso es agendar una llamada para conocer
        el precio, descarta y va al siguiente servidor con tarifas publicas.
      </p>

      <h3 style={h3Style}>4. Diseno amateur</h3>
      <p style={pStyle}>
        No necesitas ser disenador, pero un PDF maquetado en Word con tres colores aleatorios te resta
        credibilidad. Usa Canva, Figma o una plantilla profesional.
      </p>

      <h3 style={h3Style}>5. No actualizar las metricas</h3>
      <p style={pStyle}>
        Un media kit con metricas de hace 6 meses muestra que no controlas tu servidor. Actualizalo cada
        trimestre como minimo, idealmente cada mes.
      </p>

      <h2 style={h2Style}>Plantilla gratuita: estructura completa lista para usar</h2>
      <p style={pStyle}>
        Estructura recomendada de 4 paginas (la que mejor convierte en mi experiencia):
      </p>
      <div style={boxStyle}>
        <p style={{ ...pStyle, marginBottom: '8px', fontWeight: 600 }}>Pagina 1: Portada y resumen</p>
        <ul style={{ paddingLeft: '20px', margin: '0 0 12px 0' }}>
          <li style={{ ...liStyle, fontSize: '14px' }}>Nombre y logo del servidor</li>
          <li style={{ ...liStyle, fontSize: '14px' }}>Nicho en una linea</li>
          <li style={{ ...liStyle, fontSize: '14px' }}>1 dato impactante (miembros activos, DAU%, mensajes/dia)</li>
          <li style={{ ...liStyle, fontSize: '14px' }}>Foto del creador + web/contacto</li>
        </ul>
        <p style={{ ...pStyle, marginBottom: '8px', fontWeight: 600 }}>Pagina 2: Audiencia</p>
        <ul style={{ paddingLeft: '20px', margin: '0 0 12px 0' }}>
          <li style={{ ...liStyle, fontSize: '14px' }}>Metricas clave en cuadricula visual</li>
          <li style={{ ...liStyle, fontSize: '14px' }}>Demografia (geografia, edad, profesion, idioma)</li>
          <li style={{ ...liStyle, fontSize: '14px' }}>Comportamiento (horas pico, contenido mas valorado)</li>
        </ul>
        <p style={{ ...pStyle, marginBottom: '8px', fontWeight: 600 }}>Pagina 3: Formatos y precios</p>
        <ul style={{ paddingLeft: '20px', margin: '0 0 12px 0' }}>
          <li style={{ ...liStyle, fontSize: '14px' }}>Tabla con todos los formatos disponibles</li>
          <li style={{ ...liStyle, fontSize: '14px' }}>Capturas de ejemplo de cada formato</li>
          <li style={{ ...liStyle, fontSize: '14px' }}>Paquetes con descuentos</li>
        </ul>
        <p style={{ ...pStyle, marginBottom: '8px', fontWeight: 600 }}>Pagina 4: Casos de exito y contacto</p>
        <ul style={{ paddingLeft: '20px', margin: 0 }}>
          <li style={{ ...liStyle, fontSize: '14px' }}>2-3 testimonios con marca y resultado</li>
          <li style={{ ...liStyle, fontSize: '14px' }}>Capturas de campanas previas</li>
          <li style={{ ...liStyle, fontSize: '14px' }}>Email directo y link de booking</li>
          <li style={{ ...liStyle, fontSize: '14px' }}>Forma de pago aceptada</li>
        </ul>
      </div>

      <h2 style={h2Style}>Como Channelad simplifica el proceso</h2>
      <p style={pStyle}>
        La parte mas tediosa del proceso es mantener el media kit actualizado y enviarlo manualmente a cada
        marca. Los servidores listados en <Link to="/" style={linkStyle}>Channelad</Link> tienen su perfil
        con metricas auditadas que se actualizan automaticamente. Las marcas ven los datos verificados sin
        que tu hagas nada. Cuando ofertan, el{' '}
        <Link to="/blog/escrow-publicidad-digital" style={linkStyle}>escrow</Link> protege el cobro y la
        campana queda como caso publico del que luego puedes presumir.
      </p>
      <p style={pStyle}>
        Si ya tienes 500+ miembros activos en tu servidor,{' '}
        <Link to="/" style={linkStyle}>crear tu perfil en Channelad</Link> es la via mas rapida de
        profesionalizar tu monetizacion sin pasar semanas haciendo media kits manuales.
      </p>

      <h2 style={h2Style}>Preguntas frecuentes</h2>

      <h3 style={h3Style}>Necesito un media kit si solo tengo 500 miembros activos?</h3>
      <p style={pStyle}>
        Si. De hecho, con menos miembros el media kit es mas importante porque las marcas necesitan
        justificar internamente por que invertir en un servidor pequeno. Un media kit profesional con
        metricas de engagement altas convence mas que uno mediocre con muchos miembros.
      </p>

      <h3 style={h3Style}>Cuanto tiempo se tarda en crear un buen media kit?</h3>
      <p style={pStyle}>
        Entre 4 y 8 horas si partes de cero. Una vez tienes la plantilla y las metricas recogidas,
        actualizarlo cada trimestre te lleva 30-45 minutos.
      </p>

      <h3 style={h3Style}>Que formato es mejor: PDF, web, Notion?</h3>
      <p style={pStyle}>
        PDF es lo mas profesional y lo que esperan las marcas serias. Notion sirve para mantenerlo
        actualizado facilmente y enviar un enlace. Una web personal es lo ideal si gestionas mas de 3
        servidores o tienes vocacion creator a largo plazo.
      </p>

      <h3 style={h3Style}>Cuales son las metricas mas importantes para marcas?</h3>
      <p style={pStyle}>
        En orden de importancia: 1) miembros activos en los ultimos 30 dias, 2) ratio DAU/MAU, 3)
        demografia (geografia y profesion), 4) ejemplos de campanas anteriores, 5) precio por formato. El
        numero de miembros totales esta muy abajo en la lista de prioridades.
      </p>

      <h3 style={h3Style}>Puedo usar el mismo media kit para Discord, Telegram y WhatsApp?</h3>
      <p style={pStyle}>
        No, cada plataforma tiene metricas distintas y formatos diferentes. Si gestionas multiples
        plataformas, crea media kits separados. Si quieres ver el equivalente de Telegram, mira la{' '}
        <Link to="/blog/media-kit-canal-telegram" style={linkStyle}>guia de media kit para canal de
        Telegram</Link>.
      </p>

      <h2 style={h2Style}>Conclusion</h2>
      <p style={pStyle}>
        Un media kit profesional es la diferencia entre vender publicidad a marcas serias y recibir
        propuestas low-cost. Ocho elementos imprescindibles, metricas verificables, demografia detallada,
        formatos con precios fijos y casos de exito. Con eso ya estas en el 5% superior de servidores
        espanoles que pueden cerrar deals serios.
      </p>
      <p style={pStyle}>
        Si quieres saltar todo este proceso y que las marcas te encuentren con metricas auditadas
        automaticamente, <Link to="/" style={linkStyle}>publica tu servidor de Discord en Channelad</Link>.
        El media kit lo genera la plataforma con datos verificados y el cobro va por escrow desde el
        primer deal.
      </p>
    </div>
  )
}
