import React, { useState } from 'react'
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

/* ─── Interactive Calculator ─── */
const CPMS = {
  finanzas: { label: 'Finanzas / Inversiones', min: 5, max: 10 },
  cripto: { label: 'Cripto / Trading', min: 6, max: 12 },
  tecnologia: { label: 'Tecnologia / Software', min: 4, max: 8 },
  marketing: { label: 'Marketing / Negocios', min: 3, max: 6 },
  gaming: { label: 'Gaming / Entretenimiento', min: 1.5, max: 3 },
  lifestyle: { label: 'Lifestyle / Moda', min: 2, max: 4 },
  fitness: { label: 'Fitness / Salud', min: 3, max: 5 },
  educacion: { label: 'Educacion', min: 3, max: 6 },
  noticias: { label: 'Noticias / Actualidad', min: 1.5, max: 3 },
  entretenimiento: { label: 'Entretenimiento / Memes', min: 1, max: 2.5 },
}

function PriceCalculator() {
  const [subs, setSubs] = useState(5000)
  const [nicho, setNicho] = useState('tecnologia')
  const cpm = CPMS[nicho]
  const avgCpm = (cpm.min + cpm.max) / 2
  const base = Math.round((subs * avgCpm) / 1000)
  const results = {
    post_normal: base,
    post_fijado_24h: Math.round(base * 2),
    post_fijado_48h: Math.round(base * 3),
    mencion_organica: Math.round(base * 1.5),
    paquete_5: Math.round(base * 5 * 0.85),
    paquete_10: Math.round(base * 10 * 0.75),
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: '10px',
    border: '1px solid rgba(0,0,0,0.1)', fontSize: '15px',
    fontFamily: F, background: 'var(--bg, #fff)', color: 'var(--text)',
    outline: 'none', transition: 'border-color 0.2s',
  }
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: F }
  const resultCardStyle = { padding: '16px', borderRadius: '12px', background: 'var(--bg2, #f5f5f7)', textAlign: 'center' }
  const resultValueStyle = { fontFamily: D, fontSize: '24px', fontWeight: 700, color: PURPLE }
  const resultLabelStyle = { fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }

  return (
    <div style={{ margin: '32px 0', padding: '32px', borderRadius: '16px', background: `linear-gradient(135deg, ${PURPLE}08, ${PURPLE}03)`, border: `1px solid ${PURPLE}20` }}>
      <h3 style={{ fontFamily: D, fontSize: '20px', fontWeight: 700, marginBottom: '24px', color: 'var(--text)', textAlign: 'center' }}>
        Calculadora de precios para tu canal
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div>
          <label style={labelStyle}>Suscriptores activos</label>
          <input
            type="number" value={subs} min={100} max={1000000}
            onChange={e => setSubs(Math.max(100, parseInt(e.target.value) || 100))}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = PURPLE}
            onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.1)'}
          />
        </div>
        <div>
          <label style={labelStyle}>Nicho del canal</label>
          <select
            value={nicho} onChange={e => setNicho(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {Object.entries(CPMS).map(([key, val]) => (
              <option key={key} value={key}>{val.label} (CPM {val.min}-{val.max} EUR)</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
        <div style={resultCardStyle}>
          <div style={resultValueStyle}>{results.post_normal} EUR</div>
          <div style={resultLabelStyle}>Post estandar</div>
        </div>
        <div style={resultCardStyle}>
          <div style={resultValueStyle}>{results.post_fijado_24h} EUR</div>
          <div style={resultLabelStyle}>Fijado 24h</div>
        </div>
        <div style={resultCardStyle}>
          <div style={resultValueStyle}>{results.post_fijado_48h} EUR</div>
          <div style={resultLabelStyle}>Fijado 48h</div>
        </div>
        <div style={resultCardStyle}>
          <div style={resultValueStyle}>{results.mencion_organica} EUR</div>
          <div style={resultLabelStyle}>Mencion organica</div>
        </div>
        <div style={resultCardStyle}>
          <div style={resultValueStyle}>{results.paquete_5} EUR</div>
          <div style={resultLabelStyle}>Paquete 5 posts</div>
        </div>
        <div style={resultCardStyle}>
          <div style={resultValueStyle}>{results.paquete_10} EUR</div>
          <div style={resultLabelStyle}>Paquete 10 posts</div>
        </div>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', marginTop: '16px', fontFamily: F }}>
        Precios orientativos basados en CPMs del mercado hispanohablante. El precio final depende del engagement y la calidad del canal.
      </p>
    </div>
  )
}

export default function CuantoCobrarPublicidad() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0' }}>

      {/* ─── Personal intro ─── */}
      <p style={pStyle}>
        La mayoria de creadores de canales de Telegram cobra demasiado poco por su publicidad. Segun
        datos del mercado hispanohablante, un canal tipico vende su primer post patrocinado por 35 EUR cuando, con las
        metricas que tiene, deberia cobrar al menos 60. Esa diferencia, multiplicada por docenas de
        publicaciones a lo largo de un ano, son miles de euros que se quedan sobre la mesa.
      </p>
      <p style={pStyle}>
        En este articulo encontraras la formula exacta para calcular tu precio, una calculadora
        interactiva para que no tengas que hacer cuentas a mano, y las tablas de CPM por nicho del
        mercado hispanohablante actualizadas a 2026. Si gestionas un canal de Telegram y vendes (o
        quieres vender) publicidad, esto es lo primero que deberias leer.
      </p>

      <img
        src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=720&q=80&auto=format"
        alt="Calculadora y graficos de precios para publicidad en Telegram"
        style={imgStyle}
        loading="lazy"
      />
      <p style={captionStyle}>Fijar precios correctos es la diferencia entre monetizar bien y regalar tu audiencia — Foto: Unsplash</p>

      {/* ─── Section 1: Formula del CPM ─── */}
      <h2 style={h2Style}>La formula del CPM para calcular tu precio base</h2>
      <p style={pStyle}>
        La formula es sencilla y es la que usa toda la industria publicitaria. Si la entiendes, nunca
        mas vas a poner precios a ojo:
      </p>
      <div style={{ margin: '24px 0', padding: '24px', borderRadius: '12px', background: 'var(--bg2, #f5f5f7)', border: '1px solid rgba(0,0,0,0.06)', fontFamily: 'monospace', fontSize: '16px', textAlign: 'center', lineHeight: 2 }}>
        <strong>Precio por post = (Suscriptores activos x CPM del nicho) / 1.000</strong>
      </div>

      <p style={pStyle}>
        Vamos con tres ejemplos para que quede claro:
      </p>

      <h3 style={h3Style}>Ejemplo 1: Canal de finanzas con 3.000 suscriptores</h3>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}>CPM del nicho finanzas: 7,5 EUR (media entre 5 y 10)</li>
        <li style={liStyle}>Precio base: (3.000 x 7,5) / 1.000 = <span style={strongStyle}>22,50 EUR por post</span></li>
        <li style={liStyle}>Con post fijado 24h (x2): <span style={strongStyle}>45 EUR</span></li>
      </ul>

      <h3 style={h3Style}>Ejemplo 2: Canal de tecnologia con 8.000 suscriptores</h3>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}>CPM del nicho tecnologia: 6 EUR (media entre 4 y 8)</li>
        <li style={liStyle}>Precio base: (8.000 x 6) / 1.000 = <span style={strongStyle}>48 EUR por post</span></li>
        <li style={liStyle}>Con post fijado 24h (x2): <span style={strongStyle}>96 EUR</span></li>
      </ul>

      <h3 style={h3Style}>Ejemplo 3: Canal de cripto con 15.000 suscriptores</h3>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}>CPM del nicho cripto: 9 EUR (media entre 6 y 12)</li>
        <li style={liStyle}>Precio base: (15.000 x 9) / 1.000 = <span style={strongStyle}>135 EUR por post</span></li>
        <li style={liStyle}>Con post fijado 24h (x2): <span style={strongStyle}>270 EUR</span></li>
      </ul>

      <p style={pStyle}>
        Estos son precios base. Si tu canal tiene un engagement por encima del 40% (es decir, mas del
        40% de tus suscriptores ve cada publicacion en las primeras 24 horas), puedes cobrar un 20-30%
        mas que estos precios. El engagement es tu argumento de venta mas poderoso.
      </p>

      {/* ─── Calculator ─── */}
      <h2 style={h2Style}>Calculadora de precios: tu precio en 5 segundos</h2>
      <p style={pStyle}>
        Introduce el numero de suscriptores de tu canal y selecciona tu nicho. La calculadora te da
        el precio recomendado para cada formato:
      </p>

      <PriceCalculator />

      {/* ─── Section 2: Tabla de CPMs ─── */}
      <h2 style={h2Style}>Tabla de CPMs por nicho en el mercado hispanohablante (2026)</h2>
      <p style={pStyle}>
        El CPM (Coste Por Mil impresiones) es el precio que un anunciante paga por cada 1.000 personas
        que ven su anuncio. Varia enormemente segun el nicho porque depende del valor comercial de la
        audiencia. Un suscriptor de un canal de cripto vale mucho mas para un anunciante que uno de
        un canal de memes, porque tiene mayor probabilidad de comprar productos de alto precio.
      </p>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Nicho</th>
              <th style={thStyle}>CPM minimo</th>
              <th style={thStyle}>CPM maximo</th>
              <th style={thStyle}>CPM medio</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdFirstStyle}>Cripto / Trading</td><td style={tdStyle}>6 EUR</td><td style={tdStyle}>12 EUR</td><td style={tdStyle}>9 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Finanzas / Inversiones</td><td style={tdStyle}>5 EUR</td><td style={tdStyle}>10 EUR</td><td style={tdStyle}>7,5 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Tecnologia / Software</td><td style={tdStyle}>4 EUR</td><td style={tdStyle}>8 EUR</td><td style={tdStyle}>6 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Marketing / Negocios</td><td style={tdStyle}>3 EUR</td><td style={tdStyle}>6 EUR</td><td style={tdStyle}>4,5 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Educacion</td><td style={tdStyle}>3 EUR</td><td style={tdStyle}>6 EUR</td><td style={tdStyle}>4,5 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Fitness / Salud</td><td style={tdStyle}>3 EUR</td><td style={tdStyle}>5 EUR</td><td style={tdStyle}>4 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Inmobiliaria</td><td style={tdStyle}>4 EUR</td><td style={tdStyle}>8 EUR</td><td style={tdStyle}>6 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Ofertas / Cashback</td><td style={tdStyle}>2 EUR</td><td style={tdStyle}>4 EUR</td><td style={tdStyle}>3 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Lifestyle / Moda</td><td style={tdStyle}>2 EUR</td><td style={tdStyle}>4 EUR</td><td style={tdStyle}>3 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Gaming / Esports</td><td style={tdStyle}>1,5 EUR</td><td style={tdStyle}>3 EUR</td><td style={tdStyle}>2,25 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Noticias / Actualidad</td><td style={tdStyle}>1,5 EUR</td><td style={tdStyle}>3 EUR</td><td style={tdStyle}>2,25 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Entretenimiento / Memes</td><td style={tdStyle}>1 EUR</td><td style={tdStyle}>2,5 EUR</td><td style={tdStyle}>1,75 EUR</td></tr>
          </tbody>
        </table>
      </div>

      <p style={pStyle}>
        Estos datos son estimaciones basadas en datos del mercado hispanohablante, recopilados por{' '}
        <Link to="/marketplace" style={linkStyle}>Channelad</Link>. Los CPMs globales (mercado anglosason, ruso) son generalmente
        un 30-50% mas altos.
      </p>

      {/* ─── Section 3: Precios por formato ─── */}
      <h2 style={h2Style}>Precios segun el formato del anuncio</h2>
      <p style={pStyle}>
        No todos los formatos valen lo mismo. Un post fijado en la parte superior del canal tiene
        mucha mas visibilidad que un mensaje normal que se pierde en el scroll. Estos son los
        multiplicadores estandar que se usan en el mercado:
      </p>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Formato</th>
              <th style={thStyle}>Multiplicador</th>
              <th style={thStyle}>Ejemplo (base 50 EUR)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdFirstStyle}>Post estandar</td><td style={tdStyle}>x1</td><td style={tdStyle}>50 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Post fijado 24h</td><td style={tdStyle}>x2</td><td style={tdStyle}>100 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Post fijado 48h</td><td style={tdStyle}>x3</td><td style={tdStyle}>150 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Mencion en contenido organico</td><td style={tdStyle}>x1,5</td><td style={tdStyle}>75 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Paquete 5 posts</td><td style={tdStyle}>x5 con 15% descuento</td><td style={tdStyle}>212 EUR</td></tr>
            <tr><td style={tdFirstStyle}>Paquete 10 posts (mensual)</td><td style={tdStyle}>x10 con 25% descuento</td><td style={tdStyle}>375 EUR</td></tr>
          </tbody>
        </table>
      </div>

      <p style={pStyle}>
        Un consejo clave: ofrece siempre paquetes. Los anunciantes que compran
        paquetes de 5 o 10 posts se convierten en clientes recurrentes, y la previsibilidad de ingresos
        vale mas que el descuento que les das. Los creadores que consiguen anunciantes con paquetes mensuales
        construyen una base de ingresos estable sobre la que escalar todo lo demas.
      </p>

      {/* ─── Section 4: Como saber si tu precio es competitivo ─── */}
      <h2 style={h2Style}>Como saber si tu precio es competitivo</h2>
      <p style={pStyle}>
        El problema de fijar precios a ciegas es que puedes estar cobrando un 50% por debajo del mercado
        sin saberlo. Hay dos formas de validar tus precios:
      </p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Registrate en un marketplace.</span> En{' '}<Link to="/marketplace" style={linkStyle}>Channelad</Link> puedes ver que precios tienen otros canales de tu nicho y tamano. Es la forma mas rapida de saber si estas por debajo o por encima.</li>
        <li style={liStyle}><span style={strongStyle}>Mide la tasa de aceptacion.</span> Si el 100% de los anunciantes que te contactan acepta tu precio sin negociar, probablemente estas cobrando poco. Un ratio saludable es que un 60-70% acepte y un 30-40% intente negociar.</li>
        <li style={liStyle}><span style={strongStyle}>Compara con tus metricas.</span> Si tu engagement esta por encima del 40%, tus precios deberian estar en el rango alto de la tabla. Si esta por debajo del 20%, ajusta a la baja.</li>
      </ul>

      {/* ─── Section 5: Errores ─── */}
      <h2 style={h2Style}>Errores de precio que arruinan tu monetizacion</h2>

      <p style={pStyle}>
        <span style={strongStyle}>1. Cobrar por suscriptores totales en vez de vistas reales.</span>{' '}
        Si tu canal tiene 10.000 suscriptores pero solo 2.000 ven cada post, tu precio debe calcularse
        sobre 2.000, no sobre 10.000. Los anunciantes serios lo saben y van a pedir capturas de
        estadisticas. Si inflas tu precio basandote en suscriptores totales, perderas credibilidad.
      </p>
      <p style={pStyle}>
        <span style={strongStyle}>2. No tener tarifas escritas.</span>{' '}
        Si cada vez que un anunciante te pregunta el precio tienes que pensarlo, estas perdiendo
        negociaciones. Los creadores profesionales tienen un documento con sus tarifas por formato que envian en menos de un
        minuto. Proyecta profesionalidad y evita que te regateen.
      </p>
      <p style={pStyle}>
        <span style={strongStyle}>3. No actualizar precios al crecer el canal.</span>{' '}
        Revisa tus precios cada tres meses. Si pasaste de 3.000 a 5.000 suscriptores y sigues
        cobrando lo mismo, estas regalando un 40% de tu inventario. Lo recomendable es subir precios un 15-20%
        cada trimestre si las metricas lo justifican.
      </p>
      <p style={pStyle}>
        <span style={strongStyle}>4. Cobrar lo mismo por todos los formatos.</span>{' '}
        Un post fijado en la parte superior del canal es significativamente mas valioso que un
        mensaje normal. Si no diferencias precios por formato, estas subvencionando los formatos
        premium a costa de tu margen.
      </p>
      <p style={pStyle}>
        <span style={strongStyle}>5. No ofrecer paquetes.</span>{' '}
        Los paquetes convierten a un anunciante puntual en un cliente recurrente. Un descuento del
        15% en un paquete de 5 posts es una inversion, no una perdida.
      </p>

      {/* ─── Section 6: Cuando subir precios ─── */}
      <h2 style={h2Style}>Cuando y como subir precios sin perder anunciantes</h2>
      <p style={pStyle}>
        Subir precios da miedo. Pero lo que deberia dar mas miedo es no subirlos y dejar dinero
        sobre la mesa durante meses. Estas son las senales de que es momento de subir:
      </p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}>Tu canal crecio un 30% o mas desde la ultima revision de precios</li>
        <li style={liStyle}>Tu engagement aumento (mas vistas por post que antes)</li>
        <li style={liStyle}>Tienes lista de espera de anunciantes (mas demanda que oferta)</li>
        <li style={liStyle}>Todos tus anunciantes aceptan sin negociar (senial de precio bajo)</li>
        <li style={liStyle}>Llevas mas de 3 meses sin ajustar tarifas</li>
      </ul>
      <p style={pStyle}>
        Como comunicar la subida: simplemente actualiza tus tarifas en tu marketplace y en tu media kit.
        Los anunciantes activos lo veran en la siguiente compra. No hace falta enviar un email
        de «aviso de subida de precios». Si un anunciante recurrente pregunta, explicale que las
        tarifas se ajustan trimestralmente en funcion de las metricas del canal. Segun datos del mercado, las subidas del 15-20% rara vez provocan la perdida de anunciantes si estan justificadas con metricas.
      </p>

      <p style={pStyle}>
        Si quieres saber exactamente cuanto genera un canal segun su tamano, lee el articulo sobre{' '}
        <Link to="/blog/cuanto-paga-telegram-por-canal" style={linkStyle}>
          cuanto paga Telegram por canal
        </Link>. Y para la guia completa de monetizacion, el{' '}
        <Link to="/blog/monetizar-canal-telegram-espana" style={linkStyle}>
          articulo pilar de monetizacion de Telegram
        </Link> cubre todo el proceso de principio a fin.
      </p>

      {/* ─── CTA ─── */}
      <div style={{
        marginTop: '48px', padding: '32px',
        background: `${GREEN}10`, borderRadius: '16px',
        textAlign: 'center', border: `1px solid ${GREEN}30`,
      }}>
        <h2 style={{ fontFamily: D, fontSize: '22px', fontWeight: 700, marginBottom: '10px', color: 'var(--text)' }}>
          Descubre cuanto pagan los anunciantes en tu nicho
        </h2>
        <p style={{ ...pStyle, color: 'var(--muted)', marginBottom: '20px', maxWidth: '520px', margin: '0 auto 20px' }}>
          Registra tu canal en Channelad y accede a datos de referencia de precios del mercado.
          Metricas verificadas, pago por escrow, sin comisiones ocultas.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/para-canales" style={{ display: 'inline-block', background: GREEN, color: '#fff', padding: '12px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: 600, fontFamily: F, textDecoration: 'none' }}>
            Registrar mi canal
          </Link>
          <Link to="/para-anunciantes" style={{ display: 'inline-block', background: 'transparent', color: PURPLE, padding: '12px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: 600, fontFamily: F, textDecoration: 'none', border: `1.5px solid ${PURPLE}` }}>
            Soy anunciante
          </Link>
        </div>
      </div>
    </div>
  )
}
