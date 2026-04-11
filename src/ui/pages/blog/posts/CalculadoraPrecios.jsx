import React, { useState } from 'react'
import { Link } from 'react-router-dom'

const PURPLE = '#7C3AED'
const GREEN = '#25d366'
const F = "'Inter', system-ui, sans-serif"
const D = "'Sora', system-ui, sans-serif"

const h2Style = { fontFamily: D, fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.3px', marginTop: '48px', marginBottom: '16px', color: 'var(--text)' }
const h3Style = { fontFamily: D, fontSize: '18px', fontWeight: 600, marginTop: '24px', marginBottom: '8px', color: 'var(--text)' }
const pStyle = { fontFamily: F, fontSize: '16px', lineHeight: 1.75, color: 'var(--text)', marginBottom: '16px' }
const linkStyle = { color: PURPLE, textDecoration: 'none', fontWeight: 600 }
const strongStyle = { fontWeight: 600 }

/* ─── CPM data by platform ─── */
const PLATFORM_CPMS = {
  telegram: {
    label: 'Telegram',
    icon: '✈️',
    color: '#229ED9',
    nichos: {
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
    },
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: '💬',
    color: GREEN,
    nichos: {
      finanzas: { label: 'Finanzas / Inversiones', min: 10, max: 18 },
      cripto: { label: 'Cripto / Trading', min: 8, max: 14 },
      tecnologia: { label: 'Tecnologia / Software', min: 8, max: 14 },
      marketing: { label: 'Marketing / Negocios', min: 7, max: 13 },
      gaming: { label: 'Gaming / Entretenimiento', min: 3, max: 6 },
      lifestyle: { label: 'Lifestyle / Moda', min: 5, max: 9 },
      fitness: { label: 'Fitness / Salud', min: 7, max: 12 },
      educacion: { label: 'Educacion', min: 6, max: 10 },
      noticias: { label: 'Noticias / Actualidad', min: 4, max: 7 },
      entretenimiento: { label: 'Entretenimiento / Memes', min: 3, max: 6 },
    },
  },
  discord: {
    label: 'Discord',
    icon: '🎮',
    color: '#5865F2',
    nichos: {
      finanzas: { label: 'Finanzas / Inversiones', min: 3, max: 6 },
      cripto: { label: 'Cripto / Trading', min: 4, max: 8 },
      tecnologia: { label: 'Tecnologia / Software', min: 3, max: 5 },
      marketing: { label: 'Marketing / Negocios', min: 2, max: 4 },
      gaming: { label: 'Gaming / Entretenimiento', min: 1.5, max: 3 },
      lifestyle: { label: 'Lifestyle / Moda', min: 1.5, max: 3 },
      fitness: { label: 'Fitness / Salud', min: 2, max: 4 },
      educacion: { label: 'Educacion', min: 2, max: 4 },
      noticias: { label: 'Noticias / Actualidad', min: 1, max: 2.5 },
      entretenimiento: { label: 'Entretenimiento / Memes', min: 1, max: 2 },
    },
  },
}

/* ─── Price Calculator ─── */
function PriceCalculator() {
  const [subs, setSubs] = useState(5000)
  const [nicho, setNicho] = useState('tecnologia')
  const [platform, setPlatform] = useState('telegram')

  const plat = PLATFORM_CPMS[platform]
  const cpm = plat.nichos[nicho]
  const avgCpm = (cpm.min + cpm.max) / 2
  const base = Math.round((subs * avgCpm) / 1000)

  const results = [
    { label: 'Post estandar', value: base },
    { label: 'Fijado 24h', value: Math.round(base * 2) },
    { label: 'Fijado 48h', value: Math.round(base * 3) },
    { label: 'Mencion organica', value: Math.round(base * 1.5) },
    { label: 'Paquete 5 posts', value: Math.round(base * 5 * 0.85) },
    { label: 'Paquete 10 posts', value: Math.round(base * 10 * 0.75) },
  ]

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: '10px',
    border: '1px solid rgba(0,0,0,0.1)', fontSize: '15px',
    fontFamily: F, background: 'var(--bg, #fff)', color: 'var(--text)',
    outline: 'none', transition: 'border-color 0.2s',
  }
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: F }

  return (
    <div style={{ margin: '32px 0', padding: '32px', borderRadius: '16px', background: `linear-gradient(135deg, ${PURPLE}08, ${PURPLE}03)`, border: `1px solid ${PURPLE}20` }}>
      <h3 style={{ fontFamily: D, fontSize: '22px', fontWeight: 700, marginBottom: '8px', color: 'var(--text)', textAlign: 'center' }}>
        Calculadora de precios por post
      </h3>
      <p style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center', marginBottom: '24px', fontFamily: F }}>
        Introduce tus datos y calcula cuanto cobrar por publicidad en tu canal
      </p>

      {/* Platform selector */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
        {Object.entries(PLATFORM_CPMS).map(([key, p]) => (
          <button
            key={key}
            onClick={() => setPlatform(key)}
            style={{
              padding: '10px 20px', borderRadius: '10px', fontSize: '14px',
              fontWeight: 600, fontFamily: F, cursor: 'pointer',
              border: platform === key ? `2px solid ${p.color}` : '2px solid transparent',
              background: platform === key ? `${p.color}15` : 'var(--bg2, #f5f5f7)',
              color: platform === key ? p.color : 'var(--muted)',
              transition: 'all 0.2s',
            }}
          >
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div>
          <label style={labelStyle}>Suscriptores activos</label>
          <input
            type="number" value={subs} min={100} max={1000000}
            onChange={e => setSubs(Math.max(100, parseInt(e.target.value) || 100))}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = plat.color}
            onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.1)'}
          />
        </div>
        <div>
          <label style={labelStyle}>Nicho del canal</label>
          <select value={nicho} onChange={e => setNicho(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            {Object.entries(plat.nichos).map(([key, val]) => (
              <option key={key} value={key}>{val.label} (CPM {val.min}-{val.max} EUR)</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
        {results.map(r => (
          <div key={r.label} style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg2, #f5f5f7)', textAlign: 'center' }}>
            <div style={{ fontFamily: D, fontSize: '24px', fontWeight: 700, color: plat.color }}>{r.value} EUR</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>{r.label}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', marginTop: '16px', fontFamily: F }}>
        Precios orientativos basados en CPMs del mercado hispanohablante 2026. El precio final depende del engagement y la calidad del canal.
      </p>
    </div>
  )
}

/* ─── Income Estimator ─── */
function IncomeEstimator() {
  const [members, setMembers] = useState(5000)
  const [postsPerMonth, setPostsPerMonth] = useState(8)

  const pricePerPost = Math.round(Math.max(30, Math.min(800, members * 0.08)))
  const monthlyIncome = pricePerPost * postsPerMonth
  const yearlyIncome = monthlyIncome * 12
  const advertiserPays = Math.round(pricePerPost * 1.20)

  const sliderStyle = { width: '100%', accentColor: GREEN, cursor: 'pointer', height: '6px' }

  return (
    <div style={{ margin: '32px 0', padding: '32px', borderRadius: '16px', background: `linear-gradient(135deg, ${GREEN}08, ${GREEN}03)`, border: `1px solid ${GREEN}20` }}>
      <h3 style={{ fontFamily: D, fontSize: '22px', fontWeight: 700, marginBottom: '8px', color: 'var(--text)', textAlign: 'center' }}>
        Estimador de ingresos mensuales
      </h3>
      <p style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center', marginBottom: '24px', fontFamily: F }}>
        Calcula cuanto podrias ganar al mes con publicidad en tu canal
      </p>

      {/* Sliders */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', fontFamily: F }}>Suscriptores</label>
          <span style={{ fontFamily: D, fontWeight: 700, color: GREEN, fontSize: '16px' }}>{members.toLocaleString()}</span>
        </div>
        <input type="range" min={500} max={100000} step={500} value={members} onChange={e => setMembers(+e.target.value)} style={sliderStyle} />
      </div>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', fontFamily: F }}>Posts patrocinados / mes</label>
          <span style={{ fontFamily: D, fontWeight: 700, color: GREEN, fontSize: '16px' }}>{postsPerMonth}</span>
        </div>
        <input type="range" min={1} max={30} step={1} value={postsPerMonth} onChange={e => setPostsPerMonth(+e.target.value)} style={sliderStyle} />
      </div>

      {/* Results */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--bg2, #f5f5f7)', textAlign: 'center' }}>
          <div style={{ fontFamily: D, fontSize: '28px', fontWeight: 700, color: GREEN }}>{pricePerPost} EUR</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>Tu cobras / post</div>
        </div>
        <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--bg2, #f5f5f7)', textAlign: 'center' }}>
          <div style={{ fontFamily: D, fontSize: '28px', fontWeight: 700, color: 'var(--muted)' }}>{advertiserPays} EUR</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>El anunciante paga</div>
        </div>
        <div style={{ padding: '20px', borderRadius: '12px', background: `${GREEN}10`, border: `1px solid ${GREEN}30`, textAlign: 'center' }}>
          <div style={{ fontFamily: D, fontSize: '28px', fontWeight: 700, color: GREEN }}>{monthlyIncome.toLocaleString()} EUR</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>Ingreso mensual</div>
        </div>
        <div style={{ padding: '20px', borderRadius: '12px', background: `${GREEN}10`, border: `1px solid ${GREEN}30`, textAlign: 'center' }}>
          <div style={{ fontFamily: D, fontSize: '28px', fontWeight: 700, color: GREEN }}>{yearlyIncome.toLocaleString()} EUR</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>Ingreso anual</div>
        </div>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', marginTop: '16px', fontFamily: F }}>
        Estimacion basada en precios medios del mercado. Tu ingreso real depende del nicho, engagement y frecuencia de publicacion.
      </p>
    </div>
  )
}

/* ─── Main Article Component ─── */
export default function CalculadoraPrecios() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0' }}>
      <p style={pStyle}>
        Si tienes un canal de Telegram, WhatsApp o Discord y quieres empezar a monetizarlo con publicidad, la primera pregunta que te haces es siempre la misma: <span style={strongStyle}>cuanto deberia cobrar?</span>
      </p>
      <p style={pStyle}>
        No hay una respuesta unica, pero si una formula que funciona. El precio de la publicidad en canales se calcula con el CPM (Coste Por Mil impresiones), que varia segun tu plataforma, tu nicho y el formato del anuncio. He creado esta calculadora para que puedas obtener un precio orientativo en segundos.
      </p>

      <h2 style={h2Style}>Calculadora de precios por post patrocinado</h2>
      <p style={pStyle}>
        Selecciona tu plataforma, introduce el numero de suscriptores activos de tu canal y elige tu nicho. La calculadora te dara el precio recomendado por cada formato publicitario basado en los CPMs reales del mercado hispanohablante en 2026.
      </p>

      <PriceCalculator />

      <h2 style={h2Style}>Estimador de ingresos mensuales</h2>
      <p style={pStyle}>
        Ahora que sabes cuanto cobrar por post, la siguiente pregunta es: cuanto puedo ganar al mes? Mueve los sliders para ajustar tu numero de suscriptores y la cantidad de posts patrocinados que publicas cada mes.
      </p>

      <IncomeEstimator />

      <h2 style={h2Style}>Como se calcula el precio: la formula del CPM</h2>
      <p style={pStyle}>
        El CPM (Coste Por Mil) es el estandar de la industria publicitaria. Representa lo que un anunciante paga por cada 1.000 impresiones de su mensaje. La formula para calcular el precio de un post en tu canal es:
      </p>
      <div style={{ margin: '24px 0', padding: '20px', borderRadius: '12px', background: 'var(--bg2, #f5f5f7)', textAlign: 'center', fontFamily: D, fontSize: '18px', fontWeight: 600, color: PURPLE }}>
        Precio = (Suscriptores x CPM) / 1.000
      </div>
      <p style={pStyle}>
        Por ejemplo, si tienes un canal de finanzas en Telegram con 10.000 suscriptores y el CPM medio de tu nicho es 7,5 EUR:
      </p>
      <div style={{ margin: '24px 0', padding: '20px', borderRadius: '12px', background: 'var(--bg2, #f5f5f7)', textAlign: 'center', fontFamily: F, fontSize: '16px', color: 'var(--text)' }}>
        (10.000 x 7,5) / 1.000 = <span style={{ fontFamily: D, fontWeight: 700, color: PURPLE }}>75 EUR por post estandar</span>
      </div>

      <h3 style={h3Style}>Por que el CPM varia entre plataformas</h3>
      <p style={pStyle}>
        <span style={strongStyle}>WhatsApp</span> tiene los CPMs mas altos porque el open rate es del 75-90%. Los anunciantes pagan mas porque saben que su mensaje llega a casi toda la audiencia.
      </p>
      <p style={pStyle}>
        <span style={strongStyle}>Telegram</span> tiene CPMs intermedios con un mercado publicitario ya consolidado. El open rate ronda el 30-45%, pero hay muchos marketplaces y anunciantes activos.
      </p>
      <p style={pStyle}>
        <span style={strongStyle}>Discord</span> tiene los CPMs mas bajos pero el mejor engagement real. Los miembros activos leen el 80% de los mensajes y la interaccion es muy superior a cualquier otra plataforma.
      </p>

      <h2 style={h2Style}>Formatos publicitarios y multiplicadores de precio</h2>
      <p style={pStyle}>
        No todos los formatos cuestan lo mismo. Un post fijado tiene mas visibilidad que uno normal, y un paquete de posts ofrece descuento por volumen. Estos son los multiplicadores estandar:
      </p>
      <ul style={{ paddingLeft: '24px', marginBottom: '24px' }}>
        <li style={{ fontFamily: F, fontSize: '16px', lineHeight: 1.75, color: 'var(--text)', marginBottom: '8px' }}>
          <span style={strongStyle}>Post estandar (1x):</span> precio base del CPM
        </li>
        <li style={{ fontFamily: F, fontSize: '16px', lineHeight: 1.75, color: 'var(--text)', marginBottom: '8px' }}>
          <span style={strongStyle}>Fijado 24h (2x):</span> permanece visible arriba del canal durante 24 horas
        </li>
        <li style={{ fontFamily: F, fontSize: '16px', lineHeight: 1.75, color: 'var(--text)', marginBottom: '8px' }}>
          <span style={strongStyle}>Fijado 48h (3x):</span> mismo pero durante 48 horas, ideal para lanzamientos
        </li>
        <li style={{ fontFamily: F, fontSize: '16px', lineHeight: 1.75, color: 'var(--text)', marginBottom: '8px' }}>
          <span style={strongStyle}>Mencion organica (1.5x):</span> el anuncio se integra dentro de tu contenido habitual
        </li>
        <li style={{ fontFamily: F, fontSize: '16px', lineHeight: 1.75, color: 'var(--text)', marginBottom: '8px' }}>
          <span style={strongStyle}>Paquete 5 posts (-15%):</span> descuento por volumen para campanas mas largas
        </li>
        <li style={{ fontFamily: F, fontSize: '16px', lineHeight: 1.75, color: 'var(--text)', marginBottom: '8px' }}>
          <span style={strongStyle}>Paquete 10 posts (-25%):</span> maximo descuento, ideal para anunciantes recurrentes
        </li>
      </ul>

      <h2 style={h2Style}>Cuando y como subir tus precios</h2>
      <p style={pStyle}>
        Mi regla personal: subo precios un 15-20% cada trimestre si mi canal ha crecido. Nunca he perdido un anunciante serio por una subida razonable. Los que se van por precio no son anunciantes que quieras retener.
      </p>
      <p style={pStyle}>
        Sube precios cuando: tu canal crece un 20%+ en suscriptores, tu engagement sube, tienes historial de campanas exitosas, o la demanda supera tu oferta. Si rechazas mas propuestas de las que aceptas, es senal de que tus precios son demasiado bajos.
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
