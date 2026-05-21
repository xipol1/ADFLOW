import React, { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import {
  Calendar, MessageCircle, FileBarChart2, AlertTriangle,
  Sparkles, ArrowRight, Calculator, Lock, TrendingUp,
} from 'lucide-react'
import SEO from '../../components/SEO'
import { FONT_BODY, FONT_DISPLAY, MAX_W } from '../../theme/tokens'

const F = FONT_BODY
const D = FONT_DISPLAY
const GREEN = '#25d366'
const GREEN_DARK = '#1ea952'
const greenAlpha = (o) => `rgba(37,211,102,${o})`

const CAL_LINK = 'https://cal.com/rafa-ferrer-xnpskg/15min?utm_source=benchmark_page'
const CONTACT_MAIL = 'mailto:contact@channelad.io?subject=Benchmark%20canales%20WhatsApp%20ES%20-%20mi%20canal'

/* ──────────────────────────────────────────────────────────────
   DATOS REALES — consolidados de:
   - content/blog/cuanto-cobrar-publicidad-whatsapp.md
   - content/blog/cuanto-cobrar-publicidad-telegram.md
   - EarningsCalculator multipliers (theme/stats.js)
   - 2.500 canales en seguimiento propio (theme/stats.js · CHANNELS_TRACKED)

   Actualizado: 2026-05-19. Próxima revisión tras 25 entrevistas nuevas.
   ────────────────────────────────────────────────────────────── */

// CPMs en euros, mercado España 2026. WhatsApp y Telegram side-by-side.
// Discord y Newsletter incluidos como referencia cross-plataforma.
const CPM_TABLE = [
  { niche: 'Cripto / Trading',     wa: [8, 18],  tg: [6, 14],  nl: [8, 16], dc: [5, 12], demand: 'Muy alta',           note: 'Picos en ciclos alcistas' },
  { niche: 'Finanzas / Inversión', wa: [7, 15],  tg: [5, 12],  nl: [9, 22], dc: [4, 9],  demand: 'Muy alta',           note: 'Top del mercado B2B' },
  { niche: 'B2B SaaS',             wa: [6, 14],  tg: [5, 12],  nl: [10, 24],dc: [6, 14], demand: 'Alta',               note: 'Audiencia más cualificada' },
  { niche: 'E-commerce / Ofertas', wa: [6, 14],  tg: [5, 11],  nl: [5, 10], dc: [3, 7],  demand: 'Alta (Black Friday 2×)', note: 'Estacionalidad fuerte' },
  { niche: 'Marketing / Negocios', wa: [5, 12],  tg: [4, 10],  nl: [7, 16], dc: [3, 8],  demand: 'Alta',               note: 'Sector consolidado' },
  { niche: 'Tecnología',           wa: [5, 10],  tg: [4, 9],   nl: [6, 14], dc: [5, 11], demand: 'Media-alta',         note: 'CPM bueno, anunciantes finicky' },
  { niche: 'Educación / Cursos',   wa: [4, 8],   tg: [3, 7],   nl: [4, 10], dc: [3, 6],  demand: 'Media (picos ene/sep)', note: 'Ciclos lectivos' },
  { niche: 'Salud / Fitness',      wa: [4, 9],   tg: [3, 7],   nl: [4, 9],  dc: [2, 5],  demand: 'Media',              note: 'Brand-safe = clave' },
  { niche: 'Lifestyle / Moda',     wa: [3, 7],   tg: [2, 5],   nl: [3, 7],  dc: [2, 5],  demand: 'Media',              note: 'Engagement > CPM aquí' },
  { niche: 'Noticias / Actualidad',wa: [2.5, 5], tg: [2, 4],   nl: [2, 5],  dc: [1.5, 3],demand: 'Baja',               note: 'Volumen compensa' },
  { niche: 'Gaming / Entretenim.', wa: [2, 4],   tg: [2, 4],   nl: [2, 5],  dc: [3, 7],  demand: 'Baja (alta en DC)',  note: 'Discord es la excepción' },
]

// Multiplicadores por formato — aplican sobre el precio base CPM × 1000.
const FORMATS = [
  { format: 'Post estándar (texto + imagen)', mult: '1,0×', justif: 'Base de cálculo' },
  { format: 'Post fijado 24h',                 mult: '2,0×', justif: 'Visibilidad prolongada en top del canal' },
  { format: 'Post fijado 48h',                 mult: '3,0×', justif: 'Ocupa el top del canal 2 días enteros' },
  { format: 'Mención en contenido orgánico',   mult: '1,5×', justif: 'Integrado en post propio, mayor confianza' },
  { format: 'Vídeo patrocinado',               mult: '1,5×', justif: 'Coste de producción + atención superior' },
  { format: 'Nota de voz patrocinada',         mult: '1,8×', justif: 'Formato íntimo, pocos canales lo hacen' },
  { format: 'Encuesta patrocinada',            mult: '1,3×', justif: 'Engagement + data del anunciante' },
]

// Ejemplos verificables. Calculados con la fórmula: subs × (1 - silenced) × CPM ÷ 1.000
const EXAMPLES = [
  {
    case: 'Canal finanzas 5K subs',
    platform: 'WhatsApp',
    activeSubs: '4.500 (90%)',
    cpm: '11 € (medio nicho)',
    base: 49.5,
    formats: [
      { f: 'Post estándar', p: 50 },
      { f: 'Post fijado 24h', p: 99 },
      { f: 'Mención orgánica', p: 74 },
    ],
    monthly: '4 deals/mes ≈ 200–300 €',
  },
  {
    case: 'Canal B2B SaaS 1.8K subs',
    platform: 'Newsletter + WhatsApp',
    activeSubs: '1.620 (90%)',
    cpm: '17 € (alto, audiencia premium)',
    base: 27.5,
    formats: [
      { f: 'Issue patrocinado', p: 480 },
      { f: 'Mención WhatsApp', p: 165 },
      { f: 'Bundle email+WA', p: 580 },
    ],
    monthly: '2 deals/mes ≈ 800–1.200 €',
  },
  {
    case: 'Canal cripto 12K subs',
    platform: 'Telegram',
    activeSubs: '9.600 (80%, alto churn)',
    cpm: '10 € (medio, alta competencia)',
    base: 96,
    formats: [
      { f: 'Post estándar', p: 96 },
      { f: 'Post fijado 48h', p: 288 },
      { f: 'Mención orgánica', p: 144 },
    ],
    monthly: '6 deals/mes ≈ 600–900 €',
  },
]

const ANTI_PATTERNS = [
  {
    title: 'Cobrar fijo por mes',
    body: 'Te bloquea el canal por una tarifa plana de 200 € cuando podrías facturar 600 € por 4 deals individuales. Solo tiene sentido en patrocinios anuales con cliente fijo.',
  },
  {
    title: 'Aceptar la primera oferta',
    body: 'El anunciante siempre prueba con una tarifa baja. Negocia: pide 30-50% más, ajusta a la baja si el copy te encaja. Casi nadie se baja del barco por intentar.',
  },
  {
    title: 'Cobrar por seguidores totales, no activos',
    body: 'Un canal de 10.000 con 60% silenciado vale como uno de 4.000 con 95% activo. La métrica que cuenta es la audiencia que recibe la notificación.',
  },
  {
    title: 'Trabajar sin escrow',
    body: 'El 18% de los acuerdos por DM nunca se cobran completos (dato de las 100 conversaciones del Daily 5). Sin custodia, eres el banco del anunciante.',
  },
  {
    title: 'No subir tarifas con el tiempo',
    body: 'Si llevas 6 meses cobrando lo mismo y el canal ha crecido un 30%, estás regalando dinero. Revisión cada trimestre, no por inflación: por crecimiento real.',
  },
  {
    title: 'Mismo precio en alta demanda',
    body: 'Black Friday, ciclo alcista cripto, vuelta al cole en edu… El CPM se dobla puntualmente. No lo desperdicies con tarifas planas anuales.',
  },
]

/* ──────────────────────────────────────────────────────────── */

function Section({ children, style }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.section
      ref={ref}
      style={style}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
    >
      {children}
    </motion.section>
  )
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
}

function fmtCPM([min, max]) {
  return `${min.toString().replace('.', ',')} – ${max.toString().replace('.', ',')} €`
}

export default function BenchmarkPage() {
  const [highlightedNiche, setHighlightedNiche] = useState(null)

  // Forzar noindex,nofollow directamente en el DOM. react-helmet-async no
  // actualiza fiablemente el meta robots en SPA navigation en este proyecto
  // (mismo síntoma que el title que se queda con el default). El meta estático
  // en index.html dice "index,follow", así que lo sobrescribimos al montar y
  // restauramos al desmontar.
  useEffect(() => {
    const meta = document.querySelector('meta[name="robots"]')
    const prev = meta?.content
    if (meta) meta.content = 'noindex,nofollow'
    return () => {
      if (meta && prev) meta.content = prev
    }
  }, [])

  return (
    <main
      data-testid="benchmark-page"
      style={{
        fontFamily: F,
        color: 'var(--text)',
        background:
          'radial-gradient(ellipse 80% 50% at 75% 0%, rgba(37,211,102,0.08) 0%, transparent 55%), var(--bg)',
        position: 'relative',
        minHeight: '100vh',
      }}
    >
      <SEO
        title="Benchmark privado · canales WhatsApp / Telegram ES 2026"
        description="Dataset privado consolidado: CPMs por nicho, multiplicadores por formato, ejemplos cuantificados y anti-patrones. 2.500 canales en seguimiento."
        path="/benchmark"
        noIndex
      />

      {/* HERO */}
      <section style={{ padding: '88px 28px 48px', position: 'relative' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: greenAlpha(0.10), border: `1px solid ${greenAlpha(0.25)}`,
              borderRadius: 999, padding: '6px 14px', marginBottom: 22,
              fontSize: 12, fontWeight: 600, color: GREEN,
              letterSpacing: '0.04em',
            }}
          >
            <Lock size={13} strokeWidth={2.4} />
            DATASET PRIVADO · CHANNELAD · 2026
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{
              fontFamily: D, fontSize: 'clamp(32px, 4.4vw, 52px)', fontWeight: 700,
              letterSpacing: '-0.035em', lineHeight: 1.05, margin: '0 0 16px',
              maxWidth: 880,
            }}
          >
            Lo que cobran (y lo que deberían cobrar)<br />
            <span style={{
              background: 'linear-gradient(135deg, #1ea952 0%, #25d366 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>los canales privados en España</span>.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{ fontSize: 17, color: 'var(--muted)', lineHeight: 1.65, maxWidth: 720, margin: '0 0 26px' }}
          >
            Dataset consolidado de CPMs por nicho, multiplicadores por formato, tres ejemplos calculados
            y los seis anti-patrones que dejan dinero sobre la mesa cada mes. Datos derivados de los
            <strong style={{ color: 'var(--text)' }}> 2.500 canales que Channelad sigue activamente</strong> y
            las entrevistas en curso con admins ES.
          </motion.p>

          {/* Stats ribbon */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 18, marginBottom: 28, maxWidth: 720,
            }}
          >
            {[
              { k: '2.500+', l: 'Canales en seguimiento' },
              { k: '11', l: 'Nichos cubiertos' },
              { k: '4', l: 'Plataformas comparadas' },
              { k: '2026-05', l: 'Última revisión' },
            ].map((s) => (
              <div key={s.l} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '14px 16px',
              }}>
                <div style={{
                  fontFamily: D, fontSize: 22, fontWeight: 700,
                  color: GREEN, letterSpacing: '-0.02em', lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}>{s.k}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 5 }}>{s.l}</div>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            style={{
              padding: '14px 18px',
              background: greenAlpha(0.06),
              border: `1px dashed ${greenAlpha(0.25)}`,
              borderRadius: 12, fontSize: 13.5, color: 'var(--text)',
              lineHeight: 1.55, maxWidth: 720,
            }}
          >
            <strong style={{ color: GREEN }}>Documento vivo.</strong> Lo actualizamos cada vez que cerramos
            una entrevista nueva con un admin (≈ 5 por semana). Si tu canal escapa de estas horquillas
            — o si entras y aportas dato — tu input cambia la próxima versión.
          </motion.div>
        </div>
      </section>

      {/* FÓRMULA */}
      <Section style={{ padding: '50px 28px', background: 'transparent' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 18, padding: 'clamp(24px, 3vw, 36px)',
            display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'clamp(20px, 3vw, 32px)',
            alignItems: 'center',
          }} className="bm-formula">
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: greenAlpha(0.12), color: GREEN,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Calculator size={28} strokeWidth={2.2} />
            </div>
            <div>
              <p style={{
                fontSize: 11, fontWeight: 700, color: GREEN, textTransform: 'uppercase',
                letterSpacing: '0.1em', margin: '0 0 8px',
              }}>La fórmula</p>
              <div style={{
                fontFamily: D, fontSize: 'clamp(18px, 2.4vw, 24px)', fontWeight: 700,
                color: 'var(--text)', letterSpacing: '-0.02em', margin: '0 0 8px',
                lineHeight: 1.3,
              }}>
                Precio base = (Suscriptores activos × CPM nicho) ÷ 1.000
              </div>
              <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                <strong style={{ color: 'var(--text)' }}>Activos</strong>, no totales: descuenta 10-15% por
                miembros que han silenciado el canal. Multiplica el resultado por el coeficiente del formato
                (ver tabla 2).
              </p>
            </div>
            <style>{`@media (max-width: 640px) { .bm-formula { grid-template-columns: 1fr !important; } }`}</style>
          </motion.div>
        </div>
      </Section>

      {/* TABLA 1: CPMs POR NICHO × PLATAFORMA */}
      <Section style={{ padding: '50px 28px', background: 'transparent' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ marginBottom: 24 }}>
            <p style={{
              fontSize: 11, fontWeight: 700, color: GREEN, textTransform: 'uppercase',
              letterSpacing: '0.1em', margin: '0 0 8px',
            }}>Tabla 1 · CPMs por nicho × plataforma</p>
            <h2 style={{
              fontFamily: D, fontSize: 'clamp(24px, 2.8vw, 32px)', fontWeight: 700,
              letterSpacing: '-0.025em', margin: '0 0 10px', lineHeight: 1.15,
            }}>
              CPMs reales en España, 2026
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, margin: 0, maxWidth: 740 }}>
              Coste por mil impresiones, en euros. Horquillas observadas en canales con métricas
              verificadas. <strong style={{ color: 'var(--text)' }}>WhatsApp +25-30% sobre Telegram en finanzas y B2B SaaS</strong> por
              mejor tasa de apertura y mercado más joven.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, overflow: 'hidden',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%', borderCollapse: 'collapse',
                fontSize: 13.5, fontFamily: F,
                fontVariantNumeric: 'tabular-nums',
              }}>
                <thead>
                  <tr style={{ background: greenAlpha(0.06) }}>
                    {['Nicho', 'WhatsApp', 'Telegram', 'Newsletter', 'Discord', 'Demanda', 'Nota'].map((h) => (
                      <th key={h} style={{
                        padding: '12px 14px', textAlign: 'left',
                        fontSize: 11, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        color: GREEN, borderBottom: `1px solid ${greenAlpha(0.20)}`,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CPM_TABLE.map((row, i) => (
                    <tr key={row.niche}
                      onMouseEnter={() => setHighlightedNiche(i)}
                      onMouseLeave={() => setHighlightedNiche(null)}
                      style={{
                        background: highlightedNiche === i ? greenAlpha(0.04) : 'transparent',
                        transition: 'background .15s',
                      }}
                    >
                      <td style={{
                        padding: '12px 14px', fontWeight: 600, color: 'var(--text)',
                        borderBottom: '1px solid var(--border)',
                      }}>{row.niche}</td>
                      <td style={{
                        padding: '12px 14px', color: 'var(--text)',
                        borderBottom: '1px solid var(--border)',
                      }}>{fmtCPM(row.wa)}</td>
                      <td style={{
                        padding: '12px 14px', color: 'var(--muted)',
                        borderBottom: '1px solid var(--border)',
                      }}>{fmtCPM(row.tg)}</td>
                      <td style={{
                        padding: '12px 14px', color: 'var(--muted)',
                        borderBottom: '1px solid var(--border)',
                      }}>{fmtCPM(row.nl)}</td>
                      <td style={{
                        padding: '12px 14px', color: 'var(--muted)',
                        borderBottom: '1px solid var(--border)',
                      }}>{fmtCPM(row.dc)}</td>
                      <td style={{
                        padding: '12px 14px', borderBottom: '1px solid var(--border)',
                      }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 6,
                          fontSize: 11, fontWeight: 600,
                          background: row.demand.startsWith('Muy alta') ? greenAlpha(0.16)
                                    : row.demand.startsWith('Alta') ? greenAlpha(0.10)
                                    : row.demand.startsWith('Media') ? 'rgba(245,158,11,0.12)'
                                    : 'rgba(148,163,184,0.12)',
                          color: row.demand.startsWith('Muy alta') || row.demand.startsWith('Alta') ? GREEN
                               : row.demand.startsWith('Media') ? '#b45309'
                               : 'var(--muted)',
                        }}>{row.demand}</span>
                      </td>
                      <td style={{
                        padding: '12px 14px', fontSize: 12.5, color: 'var(--muted)',
                        borderBottom: '1px solid var(--border)', fontStyle: 'italic',
                      }}>{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          <motion.p variants={fadeUp} style={{
            fontSize: 12, color: 'var(--muted)', margin: '14px 0 0', lineHeight: 1.6,
          }}>
            <strong style={{ color: 'var(--text)' }}>Lectura:</strong> el CPM medio del nicho × subs
            activos ÷ 1.000 te da el precio base por post estándar. Aplica multiplicador (tabla 2) si el
            formato no es estándar.
          </motion.p>
        </div>
      </Section>

      {/* TABLA 2: MULTIPLICADORES POR FORMATO */}
      <Section style={{ padding: '50px 28px', background: 'transparent' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ marginBottom: 24 }}>
            <p style={{
              fontSize: 11, fontWeight: 700, color: GREEN, textTransform: 'uppercase',
              letterSpacing: '0.1em', margin: '0 0 8px',
            }}>Tabla 2 · multiplicadores por formato</p>
            <h2 style={{
              fontFamily: D, fontSize: 'clamp(24px, 2.8vw, 32px)', fontWeight: 700,
              letterSpacing: '-0.025em', margin: '0 0 10px', lineHeight: 1.15,
            }}>
              Aplica sobre el precio base
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, margin: 0, maxWidth: 740 }}>
              Post estándar = 1,0×. Todo lo demás cuesta más al anunciante. Nota de voz y post fijado 48h
              son las dos formats más infravalorados en el mercado ES.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, overflow: 'hidden',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%', borderCollapse: 'collapse',
                fontSize: 13.5, fontFamily: F,
              }}>
                <thead>
                  <tr style={{ background: greenAlpha(0.06) }}>
                    {['Formato', 'Multiplicador', 'Justificación'].map((h) => (
                      <th key={h} style={{
                        padding: '12px 14px', textAlign: 'left',
                        fontSize: 11, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        color: GREEN, borderBottom: `1px solid ${greenAlpha(0.20)}`,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FORMATS.map((f) => (
                    <tr key={f.format}>
                      <td style={{
                        padding: '12px 14px', fontWeight: 600, color: 'var(--text)',
                        borderBottom: '1px solid var(--border)',
                      }}>{f.format}</td>
                      <td style={{
                        padding: '12px 14px', color: GREEN, fontWeight: 700,
                        borderBottom: '1px solid var(--border)',
                        fontVariantNumeric: 'tabular-nums', fontFamily: D,
                      }}>{f.mult}</td>
                      <td style={{
                        padding: '12px 14px', color: 'var(--muted)',
                        borderBottom: '1px solid var(--border)',
                      }}>{f.justif}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* EJEMPLOS CUANTIFICADOS */}
      <Section style={{ padding: '50px 28px', background: 'transparent' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ marginBottom: 24 }}>
            <p style={{
              fontSize: 11, fontWeight: 700, color: GREEN, textTransform: 'uppercase',
              letterSpacing: '0.1em', margin: '0 0 8px',
            }}>Sección 3 · ejemplos cuantificados</p>
            <h2 style={{
              fontFamily: D, fontSize: 'clamp(24px, 2.8vw, 32px)', fontWeight: 700,
              letterSpacing: '-0.025em', margin: '0 0 10px', lineHeight: 1.15,
            }}>
              Tres casos con números reales
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, margin: 0, maxWidth: 740 }}>
              Aplicando la fórmula a tres perfiles típicos. Las cifras mensuales son rangos observados
              en admins que ya cobran con la metodología Channelad.
            </p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {EXAMPLES.map((ex) => (
              <motion.div key={ex.case} variants={fadeUp}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 14, padding: 20,
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}
              >
                <div>
                  <div style={{
                    fontFamily: D, fontSize: 16, fontWeight: 700,
                    color: 'var(--text)', letterSpacing: '-0.01em', marginBottom: 4,
                  }}>{ex.case}</div>
                  <div style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 5,
                    fontSize: 10.5, fontWeight: 600,
                    background: greenAlpha(0.12), color: GREEN,
                    letterSpacing: '0.04em',
                  }}>{ex.platform}</div>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.7 }}>
                  <div>Activos: <strong style={{ color: 'var(--text)' }}>{ex.activeSubs}</strong></div>
                  <div>CPM aplicado: <strong style={{ color: 'var(--text)' }}>{ex.cpm}</strong></div>
                  <div>Base estándar: <strong style={{ color: GREEN }}>{ex.base} €</strong></div>
                </div>
                <div style={{
                  borderTop: '1px solid var(--border)', paddingTop: 10,
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                  {ex.formats.map((f) => (
                    <div key={f.f} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                      fontSize: 12.5,
                    }}>
                      <span style={{ color: 'var(--muted)' }}>{f.f}</span>
                      <span style={{ color: 'var(--text)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{f.p} €</span>
                    </div>
                  ))}
                </div>
                <div style={{
                  marginTop: 4, padding: '8px 12px', borderRadius: 8,
                  background: greenAlpha(0.08), border: `1px solid ${greenAlpha(0.20)}`,
                  fontSize: 12, color: 'var(--text)',
                }}>
                  <strong style={{ color: GREEN }}>Mensual:</strong> {ex.monthly}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ANTI-PATRONES */}
      <Section style={{ padding: '50px 28px 70px', background: 'transparent' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ marginBottom: 24 }}>
            <p style={{
              fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase',
              letterSpacing: '0.1em', margin: '0 0 8px',
            }}>Sección 4 · anti-patrones</p>
            <h2 style={{
              fontFamily: D, fontSize: 'clamp(24px, 2.8vw, 32px)', fontWeight: 700,
              letterSpacing: '-0.025em', margin: '0 0 10px', lineHeight: 1.15,
            }}>
              Los seis errores que dejan dinero sobre la mesa
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, margin: 0, maxWidth: 740 }}>
              Patrones observados en las primeras 100 entrevistas del Daily 5. Si haces dos o más de estos,
              probablemente estás dejando un 30-50% del posible facturación sin tocar.
            </p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {ANTI_PATTERNS.map((p, i) => (
              <motion.div key={p.title} variants={fadeUp}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 14, padding: '18px 20px',
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 9,
                  background: 'rgba(239,68,68,0.10)', color: '#ef4444',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <AlertTriangle size={17} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 style={{
                    fontFamily: D, fontSize: 15, fontWeight: 700,
                    color: 'var(--text)', margin: '0 0 6px', letterSpacing: '-0.01em',
                  }}>{p.title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>{p.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* CTA + METODOLOGÍA */}
      <Section style={{ padding: '40px 28px 110px', background: 'transparent' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{
            background: 'linear-gradient(135deg, #052e16 0%, #064e3b 50%, #052e16 100%)',
            border: `1px solid ${greenAlpha(0.20)}`,
            borderRadius: 22, padding: 'clamp(28px, 4vw, 48px)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32,
              alignItems: 'center', position: 'relative',
            }} className="bm-cta-grid">
              <div>
                <p style={{
                  fontSize: 11, fontWeight: 700, color: GREEN, textTransform: 'uppercase',
                  letterSpacing: '0.12em', margin: '0 0 10px',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}>
                  <Sparkles size={13} strokeWidth={2.4} /> Tu input actualiza esta página
                </p>
                <h2 style={{
                  fontFamily: D, fontSize: 'clamp(22px, 2.8vw, 30px)', fontWeight: 700,
                  color: '#fff', margin: '0 0 14px', letterSpacing: '-0.025em', lineHeight: 1.15,
                }}>
                  Si tu canal no encaja en estas horquillas,<br />
                  queremos saberlo.
                </h2>
                <p style={{
                  fontSize: 15, color: 'rgba(255,255,255,0.72)', lineHeight: 1.65,
                  margin: '0 0 22px',
                }}>
                  15 minutos: nos cuentas tarifas y formatos que cobras hoy, te pasamos la calculadora
                  Channelad con tu nicho preconfigurado. La próxima versión del dataset incorpora tu
                  caso anonimizado.
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <a
                    href={CAL_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      background: GREEN, color: '#fff', textDecoration: 'none',
                      borderRadius: 12, padding: '13px 22px',
                      fontSize: 15, fontWeight: 600,
                      boxShadow: `0 0 30px ${greenAlpha(0.35)}`,
                    }}
                  >
                    <MessageCircle size={16} strokeWidth={2.4} /> Cuéntanos cómo lo haces
                  </a>
                  <a
                    href={CONTACT_MAIL}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      background: 'rgba(255,255,255,0.06)', color: '#fff', textDecoration: 'none',
                      padding: '13px 22px', borderRadius: 12,
                      fontWeight: 600, fontSize: 15,
                      border: '1px solid rgba(255,255,255,0.14)',
                    }}
                  >
                    Mandar dato por email
                  </a>
                </div>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 14, padding: 20,
                fontSize: 13, color: 'rgba(255,255,255,0.78)', lineHeight: 1.65,
              }}>
                <p style={{
                  fontSize: 11, fontWeight: 700, color: GREEN, textTransform: 'uppercase',
                  letterSpacing: '0.1em', margin: '0 0 10px',
                }}>Metodología</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: GREEN, flexShrink: 0, marginTop: 8 }} />
                    Tracking de 2.500+ canales con métricas verificadas vía Channel API y APIs públicas.
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: GREEN, flexShrink: 0, marginTop: 8 }} />
                    Entrevistas semi-estructuradas con admins (≈ 5/semana, Daily 5 outreach).
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: GREEN, flexShrink: 0, marginTop: 8 }} />
                    Datos anonimizados a nivel nicho × tamaño · ningún canal identificable individualmente.
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: GREEN, flexShrink: 0, marginTop: 8 }} />
                    Revisión cada 25 entrevistas nuevas (≈ mensual).
                  </li>
                </ul>
              </div>
            </div>

            <style>{`
              @media (max-width: 860px) {
                .bm-cta-grid { grid-template-columns: 1fr !important; }
              }
            `}</style>
          </motion.div>

          <motion.div variants={fadeUp} style={{
            marginTop: 28, padding: '14px 18px',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, fontSize: 12.5, color: 'var(--muted)',
            lineHeight: 1.6, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            <Lock size={14} strokeWidth={2.2} style={{ color: GREEN, flexShrink: 0 }} />
            <div>
              <strong style={{ color: 'var(--text)' }}>Documento privado.</strong> No indexado en buscadores,
              sin enlace público desde la navegación de channelad.io. Si lo recibiste por DM o email, es
              porque participas (o vas a participar) en una entrevista del Daily 5. Operado por{' '}
              <Link to="/sobre-nosotros" style={{ color: GREEN, textDecoration: 'none' }}>MICHI SOLUCIONS S.L.</Link>
            </div>
          </motion.div>
        </div>
      </Section>
    </main>
  )
}
