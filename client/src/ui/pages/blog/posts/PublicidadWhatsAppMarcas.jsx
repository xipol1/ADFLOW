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
const tableWrapStyle = { width: '100%', overflowX: 'auto', margin: '24px 0', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: '14px' }
const thStyle = { padding: '14px 20px', textAlign: 'left', fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: PURPLE, background: '#f3f0ff', borderBottom: '2px solid #e9d5ff' }
const tdStyle = { padding: '13px 20px', color: 'var(--text)', lineHeight: 1.5, borderBottom: '1px solid #f0f0f5' }
const tdFirstStyle = { ...tdStyle, fontWeight: 500 }

export default function PublicidadWhatsAppMarcas() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0' }}>
      <p style={pStyle}>
        Si eres responsable de marketing de una marca y aun no estas anunciandote en canales de WhatsApp,
        estas perdiendo la oportunidad publicitaria mas infravalorada de 2026. WhatsApp tiene 2.000 millones
        de usuarios activos, una tasa de apertura de mensajes superior al 80% (frente al 20% del email) y
        un nivel de confianza del usuario que ninguna red social puede igualar.
      </p>
      <p style={pStyle}>
        Segun datos del mercado, las campanas publicitarias en canales de WhatsApp estan superando
        consistentemente a Instagram Ads en coste por conversion. En este
        articulo te explicamos exactamente como funciona, cuanto cuesta y como evitar los errores que cometen
        la mayoria de marcas al empezar.
      </p>

      <img src="https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=720&q=80&auto=format" alt="WhatsApp en smartphone mostrando canales activos" style={imgStyle} loading="lazy" />
      <p style={captionStyle}>WhatsApp es la plataforma de mensajeria con mayor tasa de apertura del mundo — Foto: Unsplash</p>

      <h2 style={h2Style}>Por que WhatsApp es la proxima gran oportunidad publicitaria</h2>
      <p style={pStyle}>
        Los numeros hablan solos. WhatsApp tiene la mayor penetracion de cualquier app en el mercado
        hispanohablante: el 95% de los usuarios de smartphone en Espana lo tienen instalado. Pero lo
        que realmente importa para los anunciantes no es la cantidad de usuarios, sino la calidad de
        la atencion: un mensaje en un canal de WhatsApp se lee en los primeros 15 minutos el 75% de
        las veces. Eso no existe en ningun otro canal publicitario.
      </p>
      <p style={pStyle}>
        Meta activo la publicidad en WhatsApp durante 2025: anuncios en Estados, canales promocionados
        y suscripciones de pago. Pero la oportunidad real para las marcas no esta en los anuncios
        programaticos de Meta (que son caros y poco segmentados), sino en la publicidad directa en
        canales de WhatsApp con audiencias verificadas.
      </p>

      <h2 style={h2Style}>Los 3 formatos de publicidad en WhatsApp para marcas</h2>

      <h3 style={h3Style}>1. Post patrocinado en canal</h3>
      <p style={pStyle}>
        El formato mas directo. Tu marca paga al administrador de un canal de WhatsApp para que
        publique un mensaje promocional. Puede incluir texto, imagen, enlace y CTA. La ventaja:
        el mensaje llega directamente al telefono del suscriptor con notificacion push. El formato
        es nativo — parece un mensaje del canal, no un anuncio intrusivo.
      </p>

      <h3 style={h3Style}>2. Mencion en contenido organico</h3>
      <p style={pStyle}>
        El administrador menciona tu producto o servicio de forma natural dentro de su contenido
        habitual. Es el formato con mayor credibilidad porque viene integrado en el flujo de
        informacion que el suscriptor ya espera. CPM mas alto, pero conversion superior.
      </p>

      <h3 style={h3Style}>3. Anuncios programaticos de Meta en WhatsApp</h3>
      <p style={pStyle}>
        Los anuncios que Meta muestra en la pestana de Estados de WhatsApp. Gestionados via Meta
        Ads Manager, funcionan como Instagram Stories Ads pero con menor inventario y mayor coste.
        Util para reach masivo, pero sin la segmentacion por nicho que ofrece la publicidad directa
        en canales.
      </p>

      <h2 style={h2Style}>Cuanto cuesta anunciarse en canales de WhatsApp</h2>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Seguidores del canal</th>
              <th style={thStyle}>Precio post patrocinado</th>
              <th style={thStyle}>Precio mencion organica</th>
              <th style={thStyle}>Tasa de apertura</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdFirstStyle}>1.000 - 3.000</td><td style={tdStyle}>15 - 50 EUR</td><td style={tdStyle}>25 - 75 EUR</td><td style={tdStyle}>80 - 90%</td></tr>
            <tr><td style={tdFirstStyle}>3.000 - 10.000</td><td style={tdStyle}>50 - 150 EUR</td><td style={tdStyle}>75 - 225 EUR</td><td style={tdStyle}>75 - 85%</td></tr>
            <tr><td style={tdFirstStyle}>10.000 - 30.000</td><td style={tdStyle}>150 - 400 EUR</td><td style={tdStyle}>225 - 600 EUR</td><td style={tdStyle}>70 - 80%</td></tr>
            <tr><td style={tdFirstStyle}>30.000 - 100.000</td><td style={tdStyle}>400 - 1.200 EUR</td><td style={tdStyle}>600 - 1.800 EUR</td><td style={tdStyle}>60 - 75%</td></tr>
          </tbody>
        </table>
      </div>

      <p style={pStyle}>
        Comparado con Instagram Stories Ads (CPM de 8-15 EUR con una tasa de visualizacion completa
        del 3-5%), un post patrocinado en un canal de WhatsApp con 5.000 seguidores a 80 EUR y una
        tasa de apertura del 80% te da un CPM efectivo de 20 EUR con una atencion incomparablemente
        mayor. El ROI real es superior porque el usuario lee el mensaje, no lo desliza en 0,5 segundos.
      </p>

      <h2 style={h2Style}>Como encontrar canales de WhatsApp para anunciarte</h2>
      <p style={pStyle}>
        Este es el mayor problema del mercado hoy: no hay un directorio centralizado de canales
        de WhatsApp con metricas verificadas. A diferencia de Telegram (donde TGStat ofrece datos
        publicos), WhatsApp no expone estadisticas de canales de forma abierta.
      </p>
      <p style={pStyle}>
        Las opciones disponibles:
      </p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Busqueda manual:</span> navegar por el directorio de canales de WhatsApp y contactar administradores uno por uno. Lento, sin verificacion, sin garantia de pago.</li>
        <li style={liStyle}><span style={strongStyle}>Agencias:</span> algunas agencias de marketing digital estan empezando a intermediar, pero con comisiones del 30-50%.</li>
        <li style={liStyle}><span style={strongStyle}>Marketplaces especializados:</span> <Link to="/marketplace" style={linkStyle}>Channelad</Link> es el unico marketplace en espanol que ofrece canales de WhatsApp verificados con metricas auditadas y pago protegido por escrow.</li>
      </ul>

      <h2 style={h2Style}>Metricas que debes pedir antes de pagar</h2>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Seguidores reales vs totales.</span> Pide capturas de las estadisticas del canal, no solo el numero visible.</li>
        <li style={liStyle}><span style={strongStyle}>Tasa de apertura de los ultimos 7 dias.</span> Un canal saludable tiene +70% de apertura.</li>
        <li style={liStyle}><span style={strongStyle}>Frecuencia de publicacion.</span> Canales que publican a diario tienen mejor engagement que los que publican esporadicamente.</li>
        <li style={liStyle}><span style={strongStyle}>Historial de campanas anteriores.</span> Si el canal ya ha hecho publicidad, pide datos de rendimiento.</li>
      </ul>

      <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=720&q=80&auto=format" alt="Dashboard de analisis de campana publicitaria" style={imgStyle} loading="lazy" />
      <p style={captionStyle}>Medir antes de pagar: las metricas verificadas son la base de cualquier inversion inteligente — Foto: Unsplash</p>

      <h2 style={h2Style}>Errores que cometen las marcas al anunciarse en WhatsApp</h2>
      <p style={pStyle}>
        <span style={strongStyle}>1. Ignorar la tasa de apertura.</span> Un canal de 20.000 seguidores
        con 30% de apertura te da menos impresiones reales que uno de 5.000 con 85%. Mira las vistas
        reales, no los seguidores totales.
      </p>
      <p style={pStyle}>
        <span style={strongStyle}>2. Pagar sin escrow.</span> Sin un sistema de pago custodiado, el
        riesgo es alto. El administrador puede no publicar, publicar tarde, o borrar el mensaje antes
        de tiempo. Usa siempre un marketplace con escrow.
      </p>
      <p style={pStyle}>
        <span style={strongStyle}>3. Usar el mismo creativo que en Instagram.</span> WhatsApp es un
        canal de mensajeria, no una red social visual. Los mensajes que funcionan son directos, en texto
        con un enlace claro. Las imagenes complementan, no sustituyen al mensaje.
      </p>
      <p style={pStyle}>
        <span style={strongStyle}>4. No medir resultados.</span> Usa enlaces con UTM para trackear
        cada campana. Sin datos, no puedes optimizar ni justificar la inversion.
      </p>

      <p style={pStyle}>
        Para entender como funcionan los canales de WhatsApp desde la perspectiva del creador, lee
        la guia sobre{' '}
        <Link to="/blog/como-monetizar-canal-whatsapp" style={linkStyle}>como monetizar un canal de WhatsApp</Link>.
        Y si quieres comparar con otras plataformas, la{' '}
        <Link to="/blog/telegram-vs-whatsapp-vs-discord-publicidad" style={linkStyle}>comparativa Telegram vs WhatsApp vs Discord</Link>{' '}
        te ayuda a decidir donde invertir.
      </p>

      <div style={{ marginTop: '48px', padding: '32px', background: `${PURPLE}08`, borderRadius: '16px', textAlign: 'center', border: `1px solid ${PURPLE}20` }}>
        <h2 style={{ fontFamily: D, fontSize: '22px', fontWeight: 700, marginBottom: '10px', color: 'var(--text)' }}>
          Encuentra canales de WhatsApp verificados para tu marca
        </h2>
        <p style={{ ...pStyle, color: 'var(--muted)', marginBottom: '20px', maxWidth: '520px', margin: '0 auto 20px' }}>
          Channelad te conecta con canales de WhatsApp, Telegram y Discord verificados.
          Metricas auditadas, pago protegido por escrow y soporte en espanol.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/para-anunciantes" style={{ display: 'inline-block', background: PURPLE, color: '#fff', padding: '12px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: 600, fontFamily: F, textDecoration: 'none' }}>
            Explorar canales
          </Link>
          <Link to="/para-canales" style={{ display: 'inline-block', background: 'transparent', color: GREEN, padding: '12px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: 600, fontFamily: F, textDecoration: 'none', border: `1.5px solid ${GREEN}` }}>
            Soy creador
          </Link>
        </div>
      </div>
    </div>
  )
}
