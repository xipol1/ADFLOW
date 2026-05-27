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

// ─── AdvertiserResultCard ───────────────────────────────────────────────────
// Vista del Step 4 cuando role=advertiser. Reemplaza la tarjeta de tarifa
// del creador por alcance/clicks/comparativa con paid media.
//
// Diseño paralelo a la vista de creador para mantener consistencia visual
// pero con métricas distintas:
//   - Card grande:  alcance estimado (impresiones)
//   - Mini-stats:   clicks, engaged users
//   - Comparativa:  Channelad vs paid media (Meta/Google) con %
//   - CTA grande:   "Ver canales que encajan" (deeplink al marketplace)
export default function AdvertiserResultCard({
  budget, platform, niche, durationWeeks = 4,
  accent = PURPLE,
}) {
  const r = computeAdvertiserReach({ budget, platform, niche })
  // Ajuste por duración: si la campaña dura más, el reach total es mensual.
  // Si dura menos de 4 semanas, escalamos proporcionalmente.
  const weeks = Math.max(1, Math.min(12, durationWeeks))
  const monthMult = weeks / 4

  const monthly = {
    reach:   r.reach   * monthMult,
    clicks:  r.clicks  * monthMult,
    engaged: r.engaged * monthMult,
  }
  const totalSpend = budget * monthMult

  return (
    <div style={{ fontFamily: FONT_BODY }}>
      {/* Tarjeta principal: alcance */}
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
          Alcance estimado · {weeks} {weeks === 1 ? 'semana' : 'semanas'}
        </p>
        <div style={{
          fontFamily: FONT_DISPLAY, fontSize: 'clamp(32px, 4.5vw, 44px)',
          fontWeight: 700, letterSpacing: '-0.03em',
          color: 'var(--text)', lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {fmtNum(monthly.reach)}
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '10px 0 0', lineHeight: 1.5 }}>
          Impresiones únicas estimadas con un presupuesto de <strong style={{ color: 'var(--text)' }}>{fmtEur(totalSpend)}</strong>{' '}
          ({fmtEur(budget)} / mes durante {weeks} {weeks === 1 ? 'semana' : 'semanas'})
        </p>
      </motion.div>

      {/* Mini-stats: clicks + engaged */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
        <MiniStat
          icon={MousePointerClick}
          label="Clicks estimados"
          value={fmtNum(monthly.clicks)}
          sub={`CPC efectivo ${fmtEur(r.cpcEffective)}`}
          accent={accent}
        />
        <MiniStat
          icon={TrendingUp}
          label="Engaged users"
          value={fmtNum(monthly.engaged)}
          sub="Usuarios activos viendo el anuncio"
          accent={accent}
        />
      </div>

      {/* Comparativa vs paid media tradicional */}
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
            Frente al mismo presupuesto en Meta / Google Ads
          </span>
        </div>
        <ComparisonBar
          label="Channelad"
          value={r.reach}
          baseline={r.reach}
          accent={accent}
          sub={`+${Math.round(r.reachDeltaPct)}% más alcance · CPC ${fmtEur(r.cpcEffective)}`}
        />
        <ComparisonBar
          label="Meta / Google Ads"
          value={r.paidEquivalent.reach}
          baseline={r.reach}
          accent="rgba(99,102,241,0.55)"
          sub={`Mismo budget compraría ${fmtNum(r.paidEquivalent.reach)} impresiones genéricas`}
        />
      </div>

      <a
        href={`/marketplace?utm_source=calculator&utm_medium=advertiser_cta&budget=${budget}&platform=${platform}&niche=${niche}`}
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

function ComparisonBar({ label, value, baseline, sub, accent }) {
  const pct = Math.max(2, Math.min(100, (value / baseline) * 100))
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'baseline', marginBottom: 6,
      }}>
        <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{label}</span>
        <span style={{
          fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700,
          color: 'var(--text)', fontVariantNumeric: 'tabular-nums',
        }}>
          {fmtNum(value)}
          <span style={{ fontWeight: 500, color: 'var(--muted)', fontSize: 12 }}> impresiones</span>
        </span>
      </div>
      <div style={{
        position: 'relative', height: 8, background: 'var(--bg2)',
        borderRadius: 999, overflow: 'hidden',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'absolute', top: 0, left: 0, height: '100%',
            background: accent, borderRadius: 999,
          }}
        />
      </div>
      {sub && (
        <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '6px 0 0' }}>{sub}</p>
      )}
    </div>
  )
}
