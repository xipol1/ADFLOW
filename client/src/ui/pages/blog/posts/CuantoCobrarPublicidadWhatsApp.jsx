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
const tableWrapStyle = { width: '100%', overflowX: 'auto', margin: '24px 0', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: '14px' }
const thStyle = { padding: '14px 20px', textAlign: 'left', fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: PURPLE, background: '#f3f0ff', borderBottom: '2px solid #e9d5ff' }
const tdStyle = { padding: '13px 20px', color: 'var(--text)', lineHeight: 1.5, borderBottom: '1px solid #f0f0f5' }
const tdFirstStyle = { ...tdStyle, fontWeight: 500 }
const boxStyle = { background: `${PURPLE}08`, border: `1px solid ${PURPLE}20`, borderRadius: '12px', padding: '20px 24px', margin: '24px 0' }

export default function CuantoCobrarPublicidadWhatsApp() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0' }}>
      <p style={pStyle}>
        La pregunta que mas me hacen creadores de canales de WhatsApp: "cuanto cobro por un post patrocinado".
        Y la respuesta honesta es que la mayoria esta cobrando menos de lo que deberia. Los CPMs de WhatsApp
        en 2026 estan entre 4 y 18 EUR segun nicho, muy por encima de Telegram en varios verticales. Pero
        como el mercado es joven, muchos creadores siguen aplicando tarifas de 2023, cuando los canales tenian
        100 seguidores y aun era un experimento.
      </p>
      <p style={pStyle}>
        En esta guia te doy la formula exacta, los CPMs reales por nicho en España, tres ejemplos paso a paso
        con numeros, y los errores que hacen que dejes 40-60% de dinero sobre la mesa cada mes.
      </p>

      <img src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=720&q=80&auto=format" alt="Creador calculando precios de publicidad para su canal de WhatsApp" style={imgStyle} loading="lazy" />
      <p style={captionStyle}>La formula CPM funciona igual en WhatsApp, pero los precios son distintos — Foto: Unsplash</p>

      <h2 style={h2Style}>Por que WhatsApp cobra mas que Telegram (y menos que lo que deberia)</h2>
      <p style={pStyle}>
        Tres datos que explican los CPMs altos de WhatsApp:
      </p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Tasa de apertura 75-90%:</span> mejor que email (20-30%), mejor que Telegram (40-60%) y muy por encima de Instagram (5-15%).</li>
        <li style={liStyle}><span style={strongStyle}>Zero friccion:</span> los miembros ya tienen WhatsApp abierto todo el dia. No se conectan para ver tu canal; lo ven cuando suena la notificacion.</li>
        <li style={liStyle}><span style={strongStyle}>Mercado sin explotar:</span> los anunciantes llegan tarde. Menos oferta que Telegram, misma demanda, CPMs al alza.</li>
      </ul>
      <p style={pStyle}>
        La contrapartida: el mercado esta inmaduro. Hay pocos marketplaces, pocos casos documentados y muchos
        anunciantes que todavia no entienden el formato. Esto significa dos cosas: puedes cobrar mas, pero
        tienes que educar al anunciante primero.
      </p>

      <h2 style={h2Style}>La formula: suscriptores activos x CPM / 1.000</h2>
      <div style={boxStyle}>
        <p style={{ ...pStyle, marginBottom: '0', fontFamily: D, fontSize: '18px', fontWeight: 600 }}>
          Precio base por post = (Suscriptores activos x CPM del nicho) / 1.000
        </p>
      </div>
      <p style={pStyle}>
        Tres variables:
      </p>
      <ol style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Suscriptores activos:</span> NO los totales, los activos. Es decir, los que reciben la notificacion y abren el canal con regularidad. En WhatsApp esto equivale a tus seguidores menos los que han silenciado el canal. Si no tienes el dato exacto, resta un 10-15% de tus seguidores totales.</li>
        <li style={liStyle}><span style={strongStyle}>CPM:</span> Coste por mil impresiones. Varia por nicho (ver tabla abajo).</li>
        <li style={liStyle}><span style={strongStyle}>Formato:</span> multiplica el precio base segun el formato (post normal, fijado, video, mencion organica).</li>
      </ol>

      <h2 style={h2Style}>Tabla de CPMs por nicho en España (WhatsApp 2026)</h2>
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Nicho</th>
              <th style={thStyle}>CPM mini</th>
              <th style={thStyle}>CPM max</th>
              <th style={thStyle}>Demanda anunciantes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdFirstStyle}>Cripto / Trading</td>
              <td style={tdStyle}>8 EUR</td>
              <td style={tdStyle}>18 EUR</td>
              <td style={tdStyle}>Muy alta</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Finanzas / Inversiones</td>
              <td style={tdStyle}>7 EUR</td>
              <td style={tdStyle}>15 EUR</td>
              <td style={tdStyle}>Muy alta</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Ecommerce / Ofertas</td>
              <td style={tdStyle}>6 EUR</td>
              <td style={tdStyle}>14 EUR</td>
              <td style={tdStyle}>Alta (Black Friday 2x)</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Marketing / Negocios</td>
              <td style={tdStyle}>5 EUR</td>
              <td style={tdStyle}>12 EUR</td>
              <td style={tdStyle}>Alta</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Tecnologia / SaaS</td>
              <td style={tdStyle}>5 EUR</td>
              <td style={tdStyle}>10 EUR</td>
              <td style={tdStyle}>Media-alta</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Salud / Fitness</td>
              <td style={tdStyle}>4 EUR</td>
              <td style={tdStyle}>9 EUR</td>
              <td style={tdStyle}>Media</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Educacion / Cursos</td>
              <td style={tdStyle}>4 EUR</td>
              <td style={tdStyle}>8 EUR</td>
              <td style={tdStyle}>Media (picos enero/sept)</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Lifestyle / Moda</td>
              <td style={tdStyle}>3 EUR</td>
              <td style={tdStyle}>7 EUR</td>
              <td style={tdStyle}>Media</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Noticias / Actualidad</td>
              <td style={tdStyle}>2,5 EUR</td>
              <td style={tdStyle}>5 EUR</td>
              <td style={tdStyle}>Baja</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Gaming / Entretenimiento</td>
              <td style={tdStyle}>2 EUR</td>
              <td style={tdStyle}>4 EUR</td>
              <td style={tdStyle}>Baja</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style={pStyle}>
        Los CPMs son 20-30% superiores a los equivalentes en <Link to="/blog/cuanto-cobrar-publicidad-telegram" style={linkStyle}>Telegram</Link>
        . La razon: menor competencia entre canales y mayor tasa de apertura. Si tu nicho aparece arriba en
        la tabla, tienes margen real para subir tarifas.
      </p>

      <h2 style={h2Style}>Multiplicadores por formato</h2>
      <p style={pStyle}>
        El precio base corresponde a un post estandar (texto + imagen opcional). Para otros formatos,
        multiplica:
      </p>
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Formato</th>
              <th style={thStyle}>Multiplicador</th>
              <th style={thStyle}>Justificacion</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdFirstStyle}>Post estandar</td>
              <td style={tdStyle}>1,0x</td>
              <td style={tdStyle}>Base de calculo</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Post fijado 24h</td>
              <td style={tdStyle}>2,0x</td>
              <td style={tdStyle}>Visibilidad prolongada</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Post fijado 48h</td>
              <td style={tdStyle}>3,0x</td>
              <td style={tdStyle}>Ocupa el top del canal 2 dias</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Video patrocinado</td>
              <td style={tdStyle}>1,5x</td>
              <td style={tdStyle}>Mayor coste de produccion/edicion</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Mencion en contenido organico</td>
              <td style={tdStyle}>1,5x</td>
              <td style={tdStyle}>Integrada en contenido propio, mayor confianza</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Encuesta patrocinada</td>
              <td style={tdStyle}>1,3x</td>
              <td style={tdStyle}>Mayor engagement del anunciante</td>
            </tr>
            <tr>
              <td style={tdFirstStyle}>Nota de voz</td>
              <td style={tdStyle}>1,8x</td>
              <td style={tdStyle}>Formato intimo, muy pocos canales lo hacen</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 style={h2Style}>Tres ejemplos reales con numeros</h2>

      <h3 style={h3Style}>Ejemplo 1: Canal de finanzas con 5.000 seguidores</h3>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}>Suscriptores activos: 5.000 x 0,9 = 4.500</li>
        <li style={liStyle}>CPM medio finanzas: 11 EUR (punto medio entre 7 y 15)</li>
        <li style={liStyle}>Precio base = (4.500 x 11) / 1.000 = <span style={strongStyle}>49,50 EUR por post estandar</span></li>
        <li style={liStyle}>Post fijado 24h = 49,50 x 2 = <span style={strongStyle}>99 EUR</span></li>
        <li style={liStyle}>Mencion organica = 49,50 x 1,5 = <span style={strongStyle}>74 EUR</span></li>
      </ul>

      <h3 style={h3Style}>Ejemplo 2: Canal de ecommerce con 15.000 seguidores</h3>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}>Suscriptores activos: 15.000 x 0,85 = 12.750</li>
        <li style={liStyle}>CPM medio ecommerce: 10 EUR (punto medio entre 6 y 14)</li>
        <li style={liStyle}>Precio base = (12.750 x 10) / 1.000 = <span style={strongStyle}>127 EUR por post estandar</span></li>
        <li style={liStyle}>Post fijado 24h = 127 x 2 = <span style={strongStyle}>255 EUR</span></li>
        <li style={liStyle}>Paquete 5 posts (15% dto) = 127 x 5 x 0,85 = <span style={strongStyle}>540 EUR</span></li>
      </ul>

      <h3 style={h3Style}>Ejemplo 3: Canal de fitness con 8.000 seguidores</h3>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}>Suscriptores activos: 8.000 x 0,9 = 7.200</li>
        <li style={liStyle}>CPM medio fitness: 6,5 EUR (punto medio entre 4 y 9)</li>
        <li style={liStyle}>Precio base = (7.200 x 6,5) / 1.000 = <span style={strongStyle}>47 EUR por post estandar</span></li>
        <li style={liStyle}>Video patrocinado = 47 x 1,5 = <span style={strongStyle}>70 EUR</span></li>
        <li style={liStyle}>Nota de voz = 47 x 1,8 = <span style={strongStyle}>85 EUR</span></li>
      </ul>

      <h2 style={h2Style}>Cuando subir precios: indicadores claros</h2>
      <p style={pStyle}>
        No esperes a que un anunciante te diga "cobras poco". Sube precios cuando ocurra cualquiera de estas
        cinco cosas:
      </p>
      <ol style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Creces 20%+ trimestral:</span> si pasaste de 5.000 a 6.200 suscriptores, tu precio deberia subir proporcional (+24% minimo).</li>
        <li style={liStyle}><span style={strongStyle}>Rechazas mas propuestas de las que aceptas:</span> señal clara de que hay mas demanda que oferta. Sube 15-25%.</li>
        <li style={liStyle}><span style={strongStyle}>Tienes anunciantes recurrentes:</span> al tercer post, un anunciante ya sabe que tu canal funciona. Puedes subir 10-15% en la siguiente campaña.</li>
        <li style={liStyle}><span style={strongStyle}>Tu tasa de apertura sube:</span> si has pasado del 70% al 85%, tu CPM efectivo aumento. Refleja este dato en los precios.</li>
        <li style={liStyle}><span style={strongStyle}>Black Friday / periodos calientes:</span> en noviembre y diciembre sube precios un 30-50%. Ese es el punto.</li>
      </ol>

      <h2 style={h2Style}>5 errores que hacen que cobres menos de lo que vales</h2>

      <h3 style={h3Style}>1. No diferenciar activos de totales</h3>
      <p style={pStyle}>
        Si dices "tengo 10.000 seguidores" pero solo 4.000 abren tus mensajes, estas vendiendo 10.000 cuando
        realmente tienes 4.000. Algunos anunciantes se dan cuenta y te bajan precio. Otros no se dan cuenta y
        tras la primera campaña no repiten. Siempre vende por <span style={strongStyle}>suscriptores activos</span>,
        no totales.
      </p>

      <h3 style={h3Style}>2. Cobrar lo mismo que hace un año</h3>
      <p style={pStyle}>
        El mercado de WhatsApp ha madurado muy rapido. Los CPMs que eran razonables en 2024 estan 25-40% por
        debajo del mercado actual. Revisa precios cada trimestre, no cada año.
      </p>

      <h3 style={h3Style}>3. Decir "precio a consultar"</h3>
      <p style={pStyle}>
        La ambigüedad ahuyenta al 70% de los anunciantes. El anunciante busca 3 canales, quiere comparar
        precios en 10 minutos. Si no ve tu precio, pasa al siguiente. Publica tarifas claras en el{' '}
        <Link to="/blog/media-kit-canal-telegram" style={linkStyle}>media kit</Link> y punto.
      </p>

      <h3 style={h3Style}>4. Bajar precio por volumen sin ponerle condiciones</h3>
      <p style={pStyle}>
        Si un anunciante pide 10 posts, no bajes el precio. En su lugar, crea un paquete con ventajas
        añadidas: fijado incluido, analytics detallado, rechazo de competencia durante la campaña. El
        anunciante siente que gana mas; tu no reduces tarifa.
      </p>

      <h3 style={h3Style}>5. No tener escrow</h3>
      <p style={pStyle}>
        Cuando negocias con marcas que no conoces, exige siempre pago por adelantado o escrow. El{' '}
        <Link to="/blog/escrow-publicidad-digital" style={linkStyle}>escrow</Link> protege a ambas partes y
        te evita impagos que en WhatsApp son mas frecuentes de lo que crees (porque no hay historial publico
        del anunciante). <Link to="/" style={linkStyle}>Channelad</Link> lo hace automatico en cada campaña.
      </p>

      <h2 style={h2Style}>Preguntas frecuentes</h2>

      <h3 style={h3Style}>Como facturo la publicidad de WhatsApp en España?</h3>
      <p style={pStyle}>
        Igual que cualquier ingreso por servicios publicitarios. Si lo haces con regularidad necesitas alta
        en Hacienda (modelo 036/037) y emitir factura con IVA (21%). Si usas un marketplace como Channelad,
        la plataforma actua como intermediario simplificando la facturacion al anunciante.
      </p>

      <h3 style={h3Style}>Puedo cobrar por CPM o mejor por CPA?</h3>
      <p style={pStyle}>
        Para la mayoria de canales, CPM es mas predecible y rentable. El CPA (coste por accion) solo conviene
        si tu audiencia tiene tasas de conversion muy altas y el producto paga comisiones altas. Empieza por
        CPM y solo cambia si tienes datos solidos.
      </p>

      <h3 style={h3Style}>Que hago si un anunciante me dice "el canal X cobra la mitad"?</h3>
      <p style={pStyle}>
        Si los datos son comparables (activos, nicho, tasa de apertura), contrasta el dato. Muchas veces el
        canal X tiene suscriptores inflados o engagement bajo. Si los datos realmente justifican un precio
        menor, tiene dos opciones: bajar o no hacer la campaña. No bajes sin motivo.
      </p>

      <h3 style={h3Style}>Tengo que cobrar IVA al anunciante?</h3>
      <p style={pStyle}>
        Si, si estas dado de alta como autonomo o empresa. El IVA (21% en España) se suma al precio neto del
        servicio. Los anunciantes B2B lo desgravan, asi que no afecta al precio final que perciben.
      </p>

      <h3 style={h3Style}>Un paquete mensual de posts merece la pena?</h3>
      <p style={pStyle}>
        Si el anunciante paga por adelantado y escrow protegido, si. Aplica 15-25% de descuento sobre precio
        unitario por 4-5 posts, y 25-35% por 10+. Nunca aceptes paquetes de mas de 3 meses: el mercado se
        mueve demasiado rapido para comprometerse a precios a largo plazo.
      </p>

      <h2 style={h2Style}>Conclusion</h2>
      <p style={pStyle}>
        Poner precio a un post en WhatsApp no es intuicion: es formula. Multiplica suscriptores activos por
        el CPM de tu nicho, divide entre mil, y tienes tu precio base. Los multiplicadores por formato hacen
        el resto. Revisa tarifas cada trimestre, no cada año. Y sube precio cuando rechaces mas propuestas
        de las que aceptes.
      </p>
      <p style={pStyle}>
        Si quieres saltarte la parte de negociar con anunciantes de cero, empieza en{' '}
        <Link to="/" style={linkStyle}>Channelad</Link>: calculamos tu precio recomendado en base a tus datos
        reales y conectamos con anunciantes verificados con escrow automatico.
      </p>
    </div>
  )
}
