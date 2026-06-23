import React from 'react'
import { motion } from 'framer-motion'
import { Users, MousePointerClick, TrendingUp, Sparkles, ArrowRight } from 'lucide-react'
import { FONT_DISPLAY, FONT_BODY, PURPLE, purpleAlpha } from '../../theme/tokens'
import { computeAdvertiserReach } from '../../lib/advertiserReach'

function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return Math.round(n).toLocaleString('es-ES')
}
function fmtEur(n) {
  return Math.round(n).toLocaleString('es-ES') + ' €'
}

// Ventaja real de los canales frente a Meta — cualitativa, no de precio (el CPM
// es comparable). Ver nota en lib/advertiserReach.js.
const VALUE_POINTS = [
  { title: 'Audiencia opt-in de nicho', body: 'Gente que eligió suscribirse al tema, no interrumpida en un feed.' },
  { title: 'Endoso del creador', body: 'Tu mensaje llega con la credibilidad de quien la audiencia ya lee a diario.' },
  { title: 'Open y CTR muy superiores', body: 'Tasas de lectura del 60-90% y clics muy por encima del feed.' },
  { title: 'Sin fatiga publicitaria', body: 'Un único post en un canal de confianza, no impresiones repetidas que ya se ignoran.' },
]

// ─── AdvertiserResultCard ───────────────────────────────────────────────────
// Vista del Step 4 cuando role=advertiser. El anunciante introduce un
// precio por publicación + número de publicaciones; mostramos:
//   - Card grande: alcance total estimado (suma de todas las publicaciones)
//   - Línea sutil: alcance por publicación
//   - Mini-stats:  clicks totales, engaged users, budget total
//   - Comparativa: Channelad vs Meta/Google al mismo budget total
//   - CTA grande:  "Ver canales que encajan con mi campaña"
//
// Props:
//   pricePerPost   — €/publicación
//   postsPlanned   — número de publicaciones planeadas
//   platform       — id (telegram/whatsapp/discord/newsletter/mixto)
//   niche          — id del nicho
//   accent         — color (PURPLE por defecto)
export default function AdvertiserResultCard({
  pricePerPost, postsPlanned = 4, platform, niche,
  accent = PURPLE,
}) {
  const r = computeAdvertiserReach({ pricePerPost, postsPlanned, platform, niche })

  return (
    <div style={{ fontFamily: FONT_BODY }}>
      {/* Tarjeta principal: alcance total */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          background: `linear-gradient(180deg, ${accent}12 0%, ${accent}04 100%)`,
          border: `1px solid ${accent}30`,
          borderRadius: 16,
          padding: '24px 26px',
          marginBottom: 14,
          boxShadow: `0 12px 32px -16px ${accent}40`,
        }}
      >
        <p style={{
          fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.1em', color: accent, margin: '0 0 8px',
        }}>
          Alcance total · {postsPlanned} {postsPlanned === 1 ? 'publicación' : 'publicaciones'}
        </p>
        <div style={{
          fontFamily: FONT_DISPLAY, fontSize: 'clamp(32px, 4.5vw, 44px)',
          fontWeight: 700, letterSpacing: '-0.03em',
          color: 'var(--text)', lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {fmtNum(r.reachTotal)}
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '10px 0 0', lineHeight: 1.5 }}>
          Impresiones únicas estimadas · <strong style={{ color: 'var(--text)' }}>{fmtNum(r.reachPerPost)}</strong> por publicación
          {' '}· budget total <strong style={{ color: 'var(--text)' }}>{fmtEur(r.totalBudget)}</strong>
        </p>
      </motion.div>

      {/* Mini-stats: clicks + engaged + CPC */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 10, marginBottom: 18,
      }}>
        <MiniStat
          icon={MousePointerClick}
          label="Clicks estimados"
          value={fmtNum(r.clicksTotal)}
          sub={`CPC efectivo ${fmtEur(r.cpcEffective)}`}
          accent={accent}
        />
        <MiniStat
          icon={TrendingUp}
          label="Engaged users"
          value={fmtNum(r.engagedTotal)}
          sub="Usuarios activos viendo el anuncio"
          accent={accent}
        />
        <MiniStat
          icon={Users}
          label="Por publicación"
          value={fmtNum(r.reachPerPost)}
          sub={`${fmtNum(r.clicksPerPost)} clicks/post`}
          accent={accent}
        />
      </div>

      {/* Por qué un canal, no (solo) Meta — valor cualitativo, no precio.
          El CPM de Meta (~€5-6,5 en España) está al nivel del de los canales, así
          que la ventaja real no es ser más barato, sino la calidad del contacto. */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '18px 22px',
        marginBottom: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Sparkles size={14} strokeWidth={2.4} style={{ color: accent }} />
          <span style={{
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.1em', color: 'var(--muted)',
          }}>
            Por qué un canal, no (solo) Meta
          </span>
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
          {VALUE_POINTS.map((v) => (
            <li key={v.title} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{
                marginTop: 2, color: accent, fontWeight: 700, fontSize: 13, lineHeight: 1.4,
              }}>✓</span>
              <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
                <strong style={{ fontWeight: 600 }}>{v.title}.</strong>{' '}
                <span style={{ color: 'var(--muted)' }}>{v.body}</span>
              </span>
            </li>
          ))}
        </ul>
        <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '14px 0 0', lineHeight: 1.5 }}>
          Meta gana en escala, segmentación y atribución. Los canales ganan en confianza
          e intención — y a un CPM comparable, no es el sitio donde competir por precio.
        </p>
      </div>

      <a
        href={`/marketplace?utm_source=calculator&utm_medium=advertiser_cta&price_per_post=${pricePerPost}&posts=${postsPlanned}&platform=${platform}&niche=${niche}`}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', boxSizing: 'border-box',
          padding: '14px 24px', borderRadius: 12,
          background: accent, color: '#fff',
          fontSize: 15, fontWeight: 600, textDecoration: 'none',
          fontFamily: FONT_BODY,
          boxShadow: `0 8px 20px ${purpleAlpha(0.32)}`,
        }}
      >
        Ver canales que encajan con mi campaña
        <ArrowRight size={16} strokeWidth={2.4} />
      </a>
    </div>
  )
}

function MiniStat({ icon: Icon, label, value, sub, accent }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: `${accent}18`, color: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={12} strokeWidth={2.4} />
        </div>
        <span style={{
          fontSize: 10.5, color: 'var(--muted)', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>{label}</span>
      </div>
      <div style={{
        fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700,
        letterSpacing: '-0.02em', color: 'var(--text)', lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>{sub}</div>
      )}
    </div>
  )
}

