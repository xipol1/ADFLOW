import React, { useState } from 'react'
import {
  Wrench, Link2, QrCode, Hash, Image as ImgIcon, Calculator,
  Copy, Check, Sparkles, Clock, ExternalLink, Download,
} from 'lucide-react'
import { FONT_BODY as F, FONT_DISPLAY as D, GREEN, greenAlpha, OK, BLUE } from '../../../theme/tokens'

const ACCENT = GREEN
const ga = greenAlpha

const TOOLS = [
  { id: 'utm',    title: 'UTM Builder',     icon: Link2,     desc: 'Construye links con tracking parameters' },
  { id: 'qr',     title: 'QR Generator',    icon: QrCode,    desc: 'Códigos QR para impreso o stories' },
  { id: 'hash',   title: 'Hashtag Mixer',   icon: Hash,      desc: 'Combina hashtags por nicho y popularidad' },
  { id: 'mock',   title: 'Post Mockup',     icon: ImgIcon,   desc: 'Previsualiza tu post en cada plataforma' },
  { id: 'calc',   title: 'CPM Calculator',  icon: Calculator,desc: 'Calcula CPM equivalente entre plataformas' },
  { id: 'time',   title: 'Mejor hora',      icon: Clock,     desc: 'Recomendación basada en tu audiencia' },
]

/**
 * CreatorToolsPage — Hub de utilidades.
 *
 * UTM builder, QR, hashtag mixer, post mockup, CPM calculator, best-time.
 * Todas client-side, instantáneas, sin backend.
 */
export default function CreatorToolsPage() {
  const [active, setActive] = useState('utm')

  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1100 }}>
      <div>
        <h1 style={{ fontFamily: D, fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', margin: '0 0 6px' }}>
          Tools
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
          Utilidades para preparar publicaciones, tracking, y experimentar.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
        <nav style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {TOOLS.map(t => {
            const Icon = t.icon
            const isActive = active === t.id
            return (
              <button key={t.id} onClick={() => setActive(t.id)} style={{
                width: '100%', textAlign: 'left',
                background: isActive ? ga(0.08) : 'transparent',
                border: 'none', borderBottom: '1px solid var(--border)',
                borderLeft: `3px solid ${isActive ? ACCENT : 'transparent'}`,
                padding: '12px 14px', cursor: 'pointer', fontFamily: F,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: isActive ? ga(0.15) : 'var(--bg2)',
                  border: `1px solid ${isActive ? ga(0.3) : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={13} color={isActive ? ACCENT : 'var(--muted)'} strokeWidth={2.2} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: isActive ? 800 : 600, color: 'var(--text)' }}>{t.title}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.desc}</div>
                </div>
              </button>
            )
          })}
        </nav>

        <div>
          {active === 'utm'  && <UtmBuilder />}
          {active === 'qr'   && <QrGenerator />}
          {active === 'hash' && <HashtagMixer />}
          {active === 'mock' && <PostMockup />}
          {active === 'calc' && <CpmCalculator />}
          {active === 'time' && <BestTime />}
        </div>
      </div>
    </div>
  )
}

// ─── UTM Builder ────────────────────────────────────────────────────────────
function UtmBuilder() {
  const [url, setUrl] = useState('')
  const [source, setSource] = useState('telegram')
  const [medium, setMedium] = useState('influencer')
  const [campaign, setCampaign] = useState('')
  const [content, setContent] = useState('')
  const [copied, setCopied] = useState(false)

  const result = (() => {
    if (!url) return ''
    try {
      const u = new URL(url)
      if (source)   u.searchParams.set('utm_source', source)
      if (medium)   u.searchParams.set('utm_medium', medium)
      if (campaign) u.searchParams.set('utm_campaign', campaign)
      if (content)  u.searchParams.set('utm_content', content)
      return u.toString()
    } catch {
      return ''
    }
  })()

  const copy = () => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 1500) }

  return (
    <ToolCard title="UTM Builder" icon={Link2} desc="Genera URLs con parámetros UTM para que el advertiser pueda atribuir el tráfico a tu canal.">
      <Field label="URL de destino"><input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://advertiser.com/landing" style={inputStyle} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Source · de dónde"><input value={source} onChange={e => setSource(e.target.value)} placeholder="telegram" style={inputStyle} /></Field>
        <Field label="Medium · cómo"><input value={medium} onChange={e => setMedium(e.target.value)} placeholder="influencer" style={inputStyle} /></Field>
      </div>
      <Field label="Campaign · qué"><input value={campaign} onChange={e => setCampaign(e.target.value)} placeholder="black-friday-2026" style={inputStyle} /></Field>
      <Field label="Content · variante (opcional)"><input value={content} onChange={e => setContent(e.target.value)} placeholder="post-pinned" style={inputStyle} /></Field>

      {result && (
        <div style={{ marginTop: 10, background: ga(0.06), border: `1px solid ${ga(0.25)}`, borderRadius: 9, padding: 12 }}>
          <div style={{ fontSize: 10.5, color: ACCENT, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            URL generada
          </div>
          <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)', wordBreak: 'break-all', marginBottom: 8 }}>
            {result}
          </div>
          <button onClick={copy} style={primaryBtn}>
            {copied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
          </button>
        </div>
      )}
    </ToolCard>
  )
}

// ─── QR Generator ───────────────────────────────────────────────────────────
function QrGenerator() {
  const [url, setUrl] = useState('https://channelad.io')
  const [size, setSize] = useState(256)
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`

  return (
    <ToolCard title="QR Generator" icon={QrCode} desc="Códigos QR de cualquier URL — útil para stories impresas, eventos, packaging.">
      <Field label="URL o texto"><input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" style={inputStyle} /></Field>
      <Field label="Tamaño (px)">
        <input type="range" min="128" max="512" step="64" value={size} onChange={e => setSize(Number(e.target.value))}
          style={{ width: '100%', accentColor: ACCENT }} />
        <div style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'right' }}>{size} × {size}</div>
      </Field>
      <div style={{ display: 'flex', justifyContent: 'center', padding: 20, background: 'var(--bg2)', borderRadius: 12, marginTop: 6 }}>
        {url && <img src={qrSrc} alt="QR" width={Math.min(size, 320)} height={Math.min(size, 320)} style={{ borderRadius: 8 }} />}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
        <a href={qrSrc} download="qr.png" style={{ ...primaryBtn, textDecoration: 'none' }}>
          <Download size={12} /> Descargar PNG
        </a>
      </div>
    </ToolCard>
  )
}

// ─── Hashtag Mixer ──────────────────────────────────────────────────────────
function HashtagMixer() {
  const [niche, setNiche] = useState('crypto')
  const [count, setCount] = useState(10)
  const NICHE_TAGS = {
    crypto:    ['#crypto', '#bitcoin', '#blockchain', '#defi', '#ethereum', '#trading', '#nft', '#web3', '#altcoins', '#staking', '#hodl', '#binance'],
    tech:      ['#tech', '#startup', '#saas', '#ai', '#nocode', '#productividad', '#programación', '#dev', '#devops', '#cloud', '#cyber', '#opensource'],
    business:  ['#business', '#entrepreneur', '#marketing', '#sales', '#growth', '#leadership', '#networking', '#pyme', '#emprender', '#mentoria'],
    fitness:   ['#fitness', '#gym', '#salud', '#workout', '#nutricion', '#training', '#wellness', '#crossfit', '#runners', '#yoga'],
    gaming:    ['#gaming', '#esports', '#streaming', '#twitch', '#playstation', '#xbox', '#pc', '#league', '#valorant', '#fortnite'],
    lifestyle: ['#lifestyle', '#travel', '#food', '#fashion', '#decor', '#beauty', '#style', '#mindfulness', '#productivity'],
  }
  const tags = (NICHE_TAGS[niche] || []).slice(0, count)
  const text = tags.join(' ')

  return (
    <ToolCard title="Hashtag Mixer" icon={Hash} desc="Combina hashtags relevantes según tu nicho para maximizar alcance.">
      <Field label="Nicho">
        <select value={niche} onChange={e => setNiche(e.target.value)} style={inputStyle}>
          {Object.keys(NICHE_TAGS).map(n => <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>)}
        </select>
      </Field>
      <Field label="Cantidad">
        <input type="range" min="3" max="12" value={count} onChange={e => setCount(Number(e.target.value))}
          style={{ width: '100%', accentColor: ACCENT }} />
        <div style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'right' }}>{count} hashtags</div>
      </Field>
      <div style={{ marginTop: 10, background: 'var(--bg2)', borderRadius: 9, padding: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {tags.map(t => (
            <span key={t} style={{
              background: ga(0.1), color: ACCENT, border: `1px solid ${ga(0.25)}`,
              borderRadius: 6, padding: '3px 9px', fontSize: 11.5, fontWeight: 600,
            }}>{t}</span>
          ))}
        </div>
        <button onClick={() => navigator.clipboard.writeText(text)} style={primaryBtn}>
          <Copy size={12} /> Copiar todos
        </button>
      </div>
    </ToolCard>
  )
}

// ─── Post Mockup ────────────────────────────────────────────────────────────
function PostMockup() {
  const [text, setText] = useState('🚀 Acabo de probar Notion AI y os comparto mi experiencia honesta.\n\nLo bueno: ahorro 2h al día.\nLo mejorable: a veces se inventa cosas.\n\nLink: notion.so/ai')
  const [platform, setPlatform] = useState('telegram')
  const PLAT = {
    telegram:  { color: '#0088cc', name: 'CryptoBros ES', subs: '12.3K', emoji: '✈️' },
    whatsapp:  { color: '#25D366', name: 'Mi Comunidad',  subs: '5.1K',  emoji: '💬' },
    discord:   { color: '#5865F2', name: 'Tech Server',   subs: '8.7K',  emoji: '🎮' },
    instagram: { color: '#E4405F', name: '@mi_canal',      subs: '15K',   emoji: '📸' },
  }
  const p = PLAT[platform]

  return (
    <ToolCard title="Post Mockup" icon={ImgIcon} desc="Previsualiza cómo se verá tu post antes de publicar. Útil para approval con advertisers.">
      <Field label="Plataforma">
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {Object.keys(PLAT).map(k => (
            <button key={k} onClick={() => setPlatform(k)} style={{
              background: platform === k ? `${PLAT[k].color}15` : 'var(--bg2)',
              color: platform === k ? PLAT[k].color : 'var(--muted)',
              border: `1px solid ${platform === k ? PLAT[k].color : 'var(--border)'}`,
              borderRadius: 7, padding: '5px 11px', fontSize: 11.5, fontWeight: 600,
              cursor: 'pointer', fontFamily: F, textTransform: 'capitalize',
            }}>{PLAT[k].emoji} {k}</button>
          ))}
        </div>
      </Field>
      <Field label="Texto del post">
        <textarea value={text} onChange={e => setText(e.target.value)} rows={5}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: F, lineHeight: 1.5 }} />
      </Field>
      <div style={{ marginTop: 12, background: 'var(--bg2)', borderRadius: 12, padding: 14 }}>
        <div style={{ background: 'var(--surface)', border: `1px solid ${p.color}30`, borderRadius: 12, padding: 14, maxWidth: 380, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: `${p.color}15`, border: `1px solid ${p.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{p.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{p.name}</div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{p.subs} suscriptores · ahora</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.55, whiteSpace: 'pre-wrap', marginBottom: 10 }}>
            {text}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            {platform === 'telegram' && '👁 1.2K vistas · 🔄 Reenviar'}
            {platform === 'whatsapp' && '✓✓ 4.8K vistos'}
            {platform === 'discord' && '💬 23 reacciones'}
            {platform === 'instagram' && '❤️ 234  💬 18  ↗ 12'}
          </div>
        </div>
      </div>
    </ToolCard>
  )
}

// ─── CPM Calculator ─────────────────────────────────────────────────────────
function CpmCalculator() {
  const [reach, setReach] = useState(10000)
  const [price, setPrice] = useState(80)
  const cpm = reach > 0 ? (price / reach) * 1000 : 0

  return (
    <ToolCard title="CPM Calculator" icon={Calculator} desc="Calcula tu CPM y compara con benchmarks de mercado.">
      <Field label="Alcance estimado del post"><input type="number" value={reach} onChange={e => setReach(Number(e.target.value) || 0)} style={inputStyle} /></Field>
      <Field label="Precio cobrado (€)"><input type="number" value={price} onChange={e => setPrice(Number(e.target.value) || 0)} style={inputStyle} /></Field>
      <div style={{
        marginTop: 14, background: 'var(--bg2)', borderRadius: 12, padding: 18,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tu CPM
          </div>
          <div style={{ fontFamily: D, fontSize: 32, fontWeight: 900, color: ACCENT, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            €{cpm.toFixed(2)}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginBottom: 6 }}>Benchmark de mercado</div>
          {[
            { label: 'Telegram', range: '€8-22' },
            { label: 'WhatsApp', range: '€15-30' },
            { label: 'Newsletter', range: '€20-40' },
            { label: 'Discord', range: '€5-15' },
          ].map(b => (
            <div key={b.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, padding: '3px 0', color: 'var(--text)' }}>
              <span>{b.label}</span><span style={{ color: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace' }}>{b.range}</span>
            </div>
          ))}
        </div>
      </div>
    </ToolCard>
  )
}

// ─── Best Time ──────────────────────────────────────────────────────────────
function BestTime() {
  const [platform, setPlatform] = useState('telegram')
  const SUGGESTIONS = {
    telegram:   { peaks: ['Lun-Vie 9-10h', 'Mar-Jue 19-21h', 'Dom 11-13h'], avoid: 'Sábados tarde, festivos', tip: 'Crypto/finanzas pega más por la mañana. Productividad por la tarde-noche.' },
    whatsapp:   { peaks: ['Lun-Vie 8-9h y 13-14h', 'Sáb 11-12h'], avoid: 'Después de 22h', tip: 'Audiencias familiares responden mejor en horario laboral.' },
    discord:    { peaks: ['Vie-Sáb 18-22h', 'Dom 16-21h'], avoid: 'Lun-Mié antes de las 16h', tip: 'Audiencia gaming/tech está activa por la noche y fines de semana.' },
    instagram:  { peaks: ['Lun-Vie 12-13h', '18-21h'], avoid: 'Madrugada y primeras horas', tip: 'Stories: 9-10h. Reels: 19-21h. Posts: 12h.' },
    newsletter: { peaks: ['Mar y Jue 8-9h', 'Dom 10-12h'], avoid: 'Lunes (saturación)', tip: 'Open rates más altos cuando la inbox está vacía.' },
  }
  const s = SUGGESTIONS[platform]

  return (
    <ToolCard title="Mejor hora para publicar" icon={Clock} desc="Recomendaciones por plataforma basadas en patrones de la industria.">
      <Field label="Plataforma">
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {Object.keys(SUGGESTIONS).map(k => (
            <button key={k} onClick={() => setPlatform(k)} style={{
              background: platform === k ? ga(0.12) : 'var(--bg2)',
              color: platform === k ? ACCENT : 'var(--muted)',
              border: `1px solid ${platform === k ? ga(0.3) : 'var(--border)'}`,
              borderRadius: 7, padding: '5px 11px', fontSize: 11.5, fontWeight: 600,
              cursor: 'pointer', fontFamily: F, textTransform: 'capitalize',
            }}>{k}</button>
          ))}
        </div>
      </Field>

      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ background: ga(0.08), border: `1px solid ${ga(0.25)}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, color: ACCENT, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            ✅ Mejores ventanas
          </div>
          {s.peaks.map(p => (
            <div key={p} style={{ fontSize: 13, color: 'var(--text)', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={11} color={ACCENT} /> {p}
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            ⚠ Evitar
          </div>
          <div style={{ fontSize: 13, color: 'var(--text)' }}>{s.avoid}</div>
        </div>
        <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: 14, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>
          💡 {s.tip}
        </div>
      </div>
    </ToolCard>
  )
}

// ─── Primitives ─────────────────────────────────────────────────────────────
function ToolCard({ title, icon: Icon, desc, children }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: ga(0.15), border: `1px solid ${ga(0.25)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={14} color={ACCENT} strokeWidth={2.2} />
          </div>
          <h2 style={{ fontFamily: D, fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>{title}</h2>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0, marginLeft: 38, lineHeight: 1.4 }}>{desc}</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: F, outline: 'none',
  width: '100%', boxSizing: 'border-box',
}

const primaryBtn = {
  background: ACCENT, color: '#fff', border: 'none', borderRadius: 8,
  padding: '7px 13px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: F,
  display: 'inline-flex', alignItems: 'center', gap: 5,
  boxShadow: `0 4px 14px ${ga(0.35)}`,
}
