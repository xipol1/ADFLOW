import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Wallet, Users, Layers, Send, MessageCircle, Mail, Megaphone } from 'lucide-react'
import { FONT_DISPLAY, FONT_BODY, GREEN } from '../../theme/tokens'
import { PUBLIC_COMMISSION_LABEL } from '../../theme/stats'
import { computeChannelPricing, fmtEur, fmtFollowers, PLATFORMS } from '../../lib/channelPricing'

const PLATFORM_ICON = {
  telegram:   Send,
  whatsapp:   MessageCircle,
  discord:    MessageCircle,
  newsletter: Mail,
}

// ─── MediaKitConsolidated ───────────────────────────────────────────────────
// Vista del Step 4 cuando el usuario está en modo media kit (multi-canal).
// Calcula la tarifa por canal asumiendo el mismo nicho/reacciones/format/
// posts-por-mes para todos (es lo razonable: el creador suele tener un
// nicho consistente). Muestra:
//   - Card grande con suma total mensual + alcance total
//   - Lista de canales con su tarifa por post estándar individual
//   - Lo que paga el anunciante en total (suma con comisión)
//
// Props:
//   channels — [{ url, platform, followers, name, profileImage, verified }]
//   niche, reactionsPerPost, postsPerMonth, format — shared del wizard
export default function MediaKitConsolidated({
  channels = [],
  niche, reactionsPerPost, postsPerMonth, format,
  accent = GREEN,
}) {
  const perChannel = useMemo(() => {
    return channels.map((ch) => {
      const pricing = computeChannelPricing({
        followers:        ch.followers || 0,
        reactionsPerPost: reactionsPerPost || 0,
        postsPerMonth:    postsPerMonth || 1,
        platform:         ch.platform || 'telegram',
        niche:            niche || 'b2bsaas',
        format:           format || 'standard',
      })
      return { channel: ch, pricing }
    })
  }, [channels, niche, reactionsPerPost, postsPerMonth, format])

  const totals = useMemo(() => {
    const monthly = perChannel.reduce((sum, p) => sum + p.pricing.monthlyEarnings, 0)
    const featuredSum = perChannel.reduce((sum, p) => sum + p.pricing.featuredFormatPrice, 0)
    const totalReach = perChannel.reduce((sum, p) => sum + p.pricing.reachPerPost, 0)
    const totalFollowers = channels.reduce((sum, c) => sum + (c.followers || 0), 0)
    return {
      monthly,
      yearly:    monthly * 12,
      featuredSum,
      featuredAdvertiserPays: featuredSum * 1.2,
      totalReach,
      totalFollowers,
    }
  }, [perChannel, channels])

  if (channels.length === 0) {
    return (
      <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>
        No hay canales en tu media kit. Vuelve al inicio y pega 2+ links.
      </p>
    )
  }

  return (
    <div style={{ fontFamily: FONT_BODY }}>
      {/* Header del media kit */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: `${accent}14`, color: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Layers size={16} strokeWidth={2.3} />
        </div>
        <div>
          <p style={{
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.1em', color: accent, margin: 0,
          }}>
            Media kit consolidado
          </p>
          <h3 style={{
            fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700,
            letterSpacing: '-0.02em', margin: '2px 0 0', color: 'var(--text)',
          }}>
            {channels.length} canales · {fmtFollowers(totals.totalFollowers)} suscriptores totales
          </h3>
        </div>
      </div>

      {/* Tarjeta principal: total mensual */}
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
          Ingreso mensual estimado (todos los canales)
        </p>
        <div style={{
          fontFamily: FONT_DISPLAY, fontSize: 'clamp(34px, 5vw, 46px)',
          fontWeight: 700, letterSpacing: '-0.03em',
          color: 'var(--text)', lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {fmtEur(totals.monthly)}
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '10px 0 0', lineHeight: 1.5 }}>
          Anual: <strong style={{ color: 'var(--text)' }}>{fmtEur(totals.yearly)}</strong>{' · '}
          Alcance total por ronda: <strong style={{ color: 'var(--text)' }}>{totals.totalReach.toLocaleString('es-ES')}</strong>
        </p>
      </motion.div>

      {/* Mini-stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
        <MiniStat
          icon={Wallet}
          label="Suma post estándar"
          value={fmtEur(totals.featuredSum)}
          sub={`Anunciante paga ${fmtEur(totals.featuredAdvertiserPays)} (+${PUBLIC_COMMISSION_LABEL})`}
          accent={accent}
        />
        <MiniStat
          icon={Users}
          label="Suscriptores totales"
          value={fmtFollowers(totals.totalFollowers)}
          sub={`Entre ${channels.length} canales`}
          accent={accent}
        />
      </div>

      {/* Tabla de canales */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '6px 0',
        marginBottom: 16,
      }}>
        <div style={{
          padding: '12px 18px 8px',
          borderBottom: '1px solid var(--border)',
        }}>
          <p style={{
            margin: 0, fontSize: 11, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)',
          }}>
            Desglose por canal
          </p>
        </div>
        {perChannel.map(({ channel, pricing }, i) => {
          const Icon = PLATFORM_ICON[channel.platform] || Megaphone
          const platformLabel = PLATFORMS.find((p) => p.id === channel.platform)?.label || channel.platform || '—'
          return (
            <div
              key={`${channel.url}-${i}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px',
                borderBottom: i < perChannel.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${accent}14`, color: accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={16} strokeWidth={2.3} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {channel.name || channel.url}
                  {channel.verified && (
                    <span style={{
                      marginLeft: 8, fontSize: 10, fontWeight: 700,
                      color: '#fff', background: '#3b82f6',
                      padding: '2px 6px', borderRadius: 99,
                    }}>✓</span>
                  )}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                  {platformLabel} · {fmtFollowers(channel.followers || 0)} subs · alcance ~{pricing.reachPerPost.toLocaleString('es-ES')}/post
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700,
                  color: 'var(--text)', fontVariantNumeric: 'tabular-nums',
                }}>
                  {fmtEur(pricing.featuredFormatPrice)}
                </div>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--muted)' }}>
                  por post estándar
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <p style={{
        fontSize: 12, color: 'var(--muted)', textAlign: 'center',
        margin: '0 0 0', lineHeight: 1.5,
      }}>
        Tarifa calculada con los inputs del wizard (nicho, reacciones, posts/mes) aplicados a cada canal.
        Ajusta los sliders en el paso anterior para recalcular en directo.
      </p>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6,
          background: `${accent}18`, color: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={11} strokeWidth={2.4} />
        </div>
        <span style={{
          fontSize: 10.5, color: 'var(--muted)', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>{label}</span>
      </div>
      <div style={{
        fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700,
        letterSpacing: '-0.02em', color: 'var(--text)', lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>
      )}
    </div>
  )
}
