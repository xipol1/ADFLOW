import React, { useMemo } from 'react'
import { Sparkles, Lightbulb, Check, Globe, ChevronDown } from 'lucide-react'
import {
  FONT_BODY, FONT_DISPLAY, PURPLE, PURPLE_DARK, purpleAlpha, PLATFORM_BRAND, EASE,
} from '../../theme/tokens'
import { getPlatformFormats, getPlatformAddOns } from '../../../config/postFormats'

/* ─── Shared utility ────────────────────────────────────────────────────── */

export const wordCount = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length
export const emojiCount = (s) => Array.from(String(s || '')).filter((c) => /\p{Emoji}/u.test(c)).length

/* ─── FormatStrip · iOS-style segmented control ─────────────────────────── */

export function FormatStrip({ platform, value, onChange }) {
  const formats = useMemo(() => getPlatformFormats(platform), [platform])
  return (
    <div>
      <div style={stripLabelRow}>
        <span style={overlineStyle}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: PURPLE, display: 'inline-block' }} />
          Formato
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          {formats.length} opciones {PLATFORM_BRAND[platform]?.label ? `· ${PLATFORM_BRAND[platform].label}` : ''}
        </span>
      </div>
      <div className="s3-strip" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 2px 8px', scrollbarWidth: 'none' }}>
        {formats.map((f) => {
          const Icon = f.icon
          const sel = value === f.id
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onChange(f.id)}
              className="s3-pill"
              style={{
                position: 'relative',
                minWidth: 116, flexShrink: 0,
                padding: '12px 14px 14px',
                background: sel ? 'var(--surface)' : 'var(--bg)',
                border: `1.5px solid ${sel ? PURPLE : 'var(--border)'}`,
                borderRadius: 14,
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
                fontFamily: FONT_BODY,
                transition: `all .22s ${EASE}`,
                boxShadow: sel ? `0 8px 28px ${purpleAlpha(0.18)}, 0 0 0 4px ${purpleAlpha(0.08)}` : 'none',
                transform: sel ? 'translateY(-1px)' : 'translateY(0)',
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: sel ? PURPLE : purpleAlpha(0.08),
                color: sel ? '#fff' : PURPLE,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: `all .22s ${EASE}`,
              }}>
                {Icon && <Icon size={16} strokeWidth={2.2} />}
              </div>
              <div style={{ minWidth: 0, width: '100%' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{f.label}</div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 3, fontFamily: FONT_BODY }}>
                  ×{f.multiplier} sobre base
                </div>
              </div>
              {sel && (
                <div style={{
                  position: 'absolute', top: 8, right: 8,
                  width: 18, height: 18, borderRadius: '50%',
                  background: PURPLE, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 's3-pop .25s cubic-bezier(.22,1,.36,1)',
                }}>
                  <Check size={11} strokeWidth={3} />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── AddOnStrip ───────────────────────────────────────────────────────── */

export function AddOnStrip({ platform, value, onChange }) {
  const addOns = useMemo(() => getPlatformAddOns(platform), [platform])
  if (addOns.length === 0) return null
  const toggle = (id) => {
    const next = value.includes(id) ? value.filter((x) => x !== id) : [...value, id]
    onChange(next)
  }
  return (
    <div>
      <span style={overlineStyle}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
        Extras opcionales
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {addOns.map((a) => {
          const Icon = a.icon
          const sel = value.includes(a.id)
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => toggle(a.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 14px',
                background: sel ? PURPLE : 'var(--bg)',
                border: `1.5px solid ${sel ? PURPLE : 'var(--border)'}`,
                color: sel ? '#fff' : 'var(--text)',
                borderRadius: 999,
                fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600,
                cursor: 'pointer',
                transition: `all .2s ${EASE}`,
                boxShadow: sel ? `0 6px 18px ${purpleAlpha(0.32)}` : 'none',
              }}
            >
              {Icon && <Icon size={13} />}
              {a.label}
              <span style={{
                fontSize: 11,
                color: sel ? 'rgba(255,255,255,0.85)' : '#f59e0b',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 5,
                background: sel ? 'rgba(255,255,255,0.15)' : 'rgba(245,158,11,0.1)',
              }}>
                +{Math.round(a.bonus * 100)}%
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── SmartPriceRibbon · live estimated price ──────────────────────────── */

export function SmartPriceRibbon({ basePrice, multiplier, addOnBonus, addOnLabels }) {
  const finalPrice = +(Number(basePrice || 0) * (multiplier || 1) * (1 + (addOnBonus || 0))).toFixed(2)
  const hasFormat = (multiplier || 1) !== 1
  const hasAddOns = (addOnLabels || []).length > 0
  return (
    <div style={{
      background: `linear-gradient(135deg, ${purpleAlpha(0.08)} 0%, ${purpleAlpha(0.02)} 100%)`,
      border: `1px solid ${purpleAlpha(0.18)}`,
      borderRadius: 14,
      padding: '14px 18px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 16, flexWrap: 'wrap',
      fontFamily: FONT_BODY,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: PURPLE, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={15} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Tu inversión estimada
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            base €{Number(basePrice || 0).toFixed(0)}
            {hasFormat && ` · formato ×${multiplier}`}
            {hasAddOns && ` · ${addOnLabels.length} extra${addOnLabels.length > 1 ? 's' : ''}`}
          </div>
        </div>
      </div>
      <div style={{
        fontFamily: FONT_DISPLAY,
        fontSize: 30, fontWeight: 800,
        color: 'var(--text)',
        letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums',
      }} className="s3-price" key={finalPrice}>
        €{finalPrice.toFixed(2)}
      </div>
    </div>
  )
}

/* ─── CharProgress · color-zoned char counter ──────────────────────────── */

export function CharProgress({ value }) {
  const len = (value || '').length
  const words = wordCount(value)
  const emojis = emojiCount(value)
  const pct = Math.min(100, (len / 5000) * 100)
  const ok = len >= 30
  const warn = len > 4500
  const color = warn ? '#ef4444' : ok ? PURPLE : '#94a3b8'
  const minPct = (30 / 5000) * 100
  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{
        position: 'relative',
        height: 4, borderRadius: 2,
        background: 'var(--bg)',
        overflow: 'visible',
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${pct}%`, background: color, borderRadius: 2,
          transition: `width .25s ${EASE}, background .2s ${EASE}`,
        }} />
        <div title="Mínimo 30 caracteres" style={{
          position: 'absolute', left: `${minPct}%`, top: -3, bottom: -3,
          width: 1, background: 'var(--muted)', opacity: 0.5,
        }} />
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 6, fontSize: 11, color: 'var(--muted)', fontFamily: FONT_BODY,
        fontVariantNumeric: 'tabular-nums',
      }}>
        <span>
          {!ok && len > 0 && <span style={{ color: '#f59e0b', fontWeight: 600 }}>Faltan {30 - len} caracteres · </span>}
          {ok && <span style={{ color: PURPLE, fontWeight: 600 }}>✓ Listo · </span>}
          {len} / 5000 caracteres
        </span>
        <span>{words} palabra{words === 1 ? '' : 's'}{emojis > 0 ? ` · ${emojis} emoji${emojis > 1 ? 's' : ''}` : ''}</span>
      </div>
    </div>
  )
}

/* ─── DeviceFrame · soft device shell around the preview ────────────────── */

const MOBILE_PLATFORMS = new Set(['telegram', 'whatsapp', 'instagram'])

export function DeviceFrame({ platform, children }) {
  const key = String(platform || '').toLowerCase()
  const isMobile = MOBILE_PLATFORMS.has(key)
  if (isMobile) {
    return (
      <div style={{
        padding: 8,
        background: 'linear-gradient(180deg, #1a1a1a 0%, #050505 100%)',
        borderRadius: 32,
        boxShadow: '0 30px 80px -30px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)',
      }}>
        <div style={{
          background: 'var(--bg)',
          borderRadius: 24,
          overflow: 'hidden',
          padding: '14px 0 0',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '0 22px 8px',
            fontSize: 11, fontWeight: 700, color: 'var(--text)',
            fontVariantNumeric: 'tabular-nums',
            fontFamily: FONT_BODY,
          }}>
            <span>{new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
            <span style={{ color: 'var(--muted)' }}>● ● ●</span>
          </div>
          <div style={{ padding: '0 6px 6px' }}>{children}</div>
        </div>
      </div>
    )
  }
  return (
    <div style={{
      padding: 1,
      background: 'linear-gradient(180deg, rgba(0,0,0,0.06), transparent)',
      borderRadius: 18,
      boxShadow: '0 30px 80px -30px rgba(0,0,0,0.35)',
    }}>
      <div style={{
        background: 'var(--surface)',
        borderRadius: 17,
        overflow: 'hidden',
        border: '1px solid var(--border)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px',
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--muted)', fontSize: 11, fontFamily: FONT_BODY }}>
            <Globe size={10} />
            <span>{PLATFORM_BRAND[key]?.label?.toLowerCase() || 'app'}.com</span>
          </div>
        </div>
        <div style={{ padding: 6 }}>{children}</div>
      </div>
    </div>
  )
}

/* ─── TipPill · contextual hint ─────────────────────────────────────────── */

const TIPS = {
  telegram: {
    text: 'Las preguntas en la apertura suben CTR hasta un 28% en Telegram.',
    text_image: 'Imágenes con caras humanas convierten 1.7× mejor.',
    text_image_buttons: 'Botones con verbos de acción ("Probar", "Reservar") rinden mejor.',
    album: 'Cuenta una historia en 3-5 imágenes. El carousel mantiene la atención más tiempo.',
    text_video: 'Los primeros 3 segundos deciden si el usuario se queda.',
  },
  whatsapp: {
    broadcast: 'Mensajes cortos (<200 chars) suben open-and-read del 92%.',
    image: 'Una imagen + 1-2 líneas de texto tiene el mejor CTR.',
    video: 'Vídeos <30s logran 78% retención completa.',
    document: 'PDFs informativos generan más reenvíos que catálogos comerciales.',
    status: 'Los stories cuentan: vertical, alto contraste, sin texto pequeño.',
  },
  discord: {
    text: 'Usa markdown: ## titulares, **negrita** para enfatizar, > para citas.',
    embed: 'Color de marca + thumbnail compacto = 2× engagement vs texto plano.',
    embed_image: 'La imagen grande del embed es lo que más mira la audiencia.',
  },
  instagram: {
    broadcast: 'Tu mensaje llega solo a quienes ya se suscribieron al canal — audiencia premium, mucho mejor CTR que el feed.',
    broadcast_image: 'Imagen vertical 4:5 + 1 frase potente. Los broadcast con imagen rinden 2× los de texto plano.',
    broadcast_video: 'Vídeo vertical < 30s. Subtítulos abiertos: el 80% del consumo en broadcast es sin audio.',
    feed_image: 'Hashtags 5-9 son el sweet spot. Mete uno propio.',
    feed_carousel: '6-10 slides suelen tener el mayor save rate.',
    reel: 'Hook en los primeros 3 segundos. Audio trending sube alcance.',
    story: 'Encuestas y stickers de pregunta multiplican respuestas ×4.',
    mention_bio: 'Pide la mención por 24-72h con CTA directo al perfil.',
  },
  facebook: {
    text: 'Posts emocionales tienen 2× share rate vs informativos.',
    image: 'Imagen cuadrada > horizontal en feed móvil.',
    link_preview: 'OpenGraph optimizado: título <60 chars, descripción <155.',
    video: 'Vídeos nativos ganan 7× más alcance que enlaces a YouTube.',
    story: 'Vertical 9:16, mensaje claro en los primeros segundos.',
  },
  linkedin: {
    text: '1300-2000 caracteres es el rango de mayor engagement.',
    image: 'Imágenes con datos/gráficos rinden mejor que stock photos.',
    article: 'Listas y subtítulos H2 facilitan el escaneo. 5-7 min de lectura ideal.',
    document_carousel: 'PDFs de 8-12 slides con datos accionables son virales en B2B.',
    video: 'Subtítulos siempre. El 85% del consumo es sin audio.',
  },
  newsletter: {
    dedicated: 'Subjects con números o preguntas suben open rate hasta 22%.',
    sponsored_section: 'Bloque claramente diferenciado pero respetando el tono editorial.',
    native_mention: 'Funciona mejor si encaja con el contenido del newsletter.',
    sponsor_logo: 'Logo limpio + 1 frase clara. Que no compita con el contenido.',
  },
}

export function TipPill({ platform, formatId }) {
  const tip = TIPS[String(platform || '').toLowerCase()]?.[formatId]
  if (!tip) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '12px 14px',
      background: `linear-gradient(135deg, ${purpleAlpha(0.06)}, transparent)`,
      border: `1px solid ${purpleAlpha(0.16)}`,
      borderRadius: 12,
      marginTop: 12,
      fontFamily: FONT_BODY,
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: 8,
        background: purpleAlpha(0.1), color: PURPLE,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Lightbulb size={13} />
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5 }}>{tip}</div>
    </div>
  )
}

/* ─── ForecastStrip ────────────────────────────────────────────────────── */

export function ForecastStrip({ subscribers, multiplier }) {
  const subs = Number(subscribers) || 0
  if (subs <= 0) return null
  const impressions = Math.round(subs * 0.72)
  const estCtr = (2 + Math.max(0, (multiplier - 1) * 1.4)).toFixed(1)
  const clicks = Math.round(impressions * (Number(estCtr) / 100))
  const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K` : String(n)
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 0,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, marginTop: 10,
      fontFamily: FONT_BODY,
    }}>
      <Stat label="Impresiones" value={`~${fmt(impressions)}`} />
      <Stat label="CTR previsto" value={`${estCtr}%`} divider />
      <Stat label="Clicks est." value={`~${fmt(clicks)}`} divider />
    </div>
  )
}

function Stat({ label, value, divider }) {
  return (
    <div style={{ padding: '10px 12px', textAlign: 'center', borderLeft: divider ? '1px solid var(--border)' : 'none' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 800, color: 'var(--text)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
    </div>
  )
}

/* ─── LiveIndicator ─────────────────────────────────────────────────────── */

export function LiveIndicator({ label = 'Vista previa en vivo' }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '5px 10px',
      background: 'rgba(16,185,129,0.1)',
      border: '1px solid rgba(16,185,129,0.22)',
      borderRadius: 999,
      fontFamily: FONT_BODY,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: '#10b981',
        animation: 's3-pulse 1.6s ease-in-out infinite',
      }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>{label}</span>
    </div>
  )
}

/* ─── CSS keyframes ─────────────────────────────────────────────────────── */

export const STEP3_CSS = `
@keyframes s3-pop { from { transform: scale(.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes s3-pulse { 0%,100% { opacity: 1; box-shadow: 0 0 0 0 rgba(16,185,129,0.6); } 50% { opacity: 0.45; box-shadow: 0 0 0 6px rgba(16,185,129,0); } }
@keyframes s3-fade-up { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.s3-strip::-webkit-scrollbar { display: none; }
.s3-pill:hover { transform: translateY(-1px); border-color: ${purpleAlpha(0.4)}; }
.s3-price { animation: s3-fade-up .3s ${EASE}; }
.s3-canvas-block { animation: s3-fade-up .35s ${EASE}; }
`

/* ─── Shared styles ─────────────────────────────────────────────────────── */

const overlineStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  fontSize: 11, fontWeight: 700, color: 'var(--muted)',
  textTransform: 'uppercase', letterSpacing: '0.08em',
  fontFamily: FONT_BODY,
}
const stripLabelRow = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }
