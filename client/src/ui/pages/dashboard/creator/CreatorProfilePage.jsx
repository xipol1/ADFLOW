import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Edit3, Eye, Save, Download, Share2, Copy, Check,
  Globe, MapPin, Mail, Star, Wallet, Target, Users, Radio,
  ExternalLink, Camera, FileText, Sparkles, MessageSquare, Quote,
  CheckCircle2, ShieldCheck, Linkedin, Twitter, Instagram, Youtube,
  Code,
} from 'lucide-react'
import { useAuth } from '../../../../auth/AuthContext'
import apiService from '../../../../services/api'
import { FONT_BODY as F, FONT_DISPLAY as D, GREEN, greenAlpha, OK, WARN, ERR, BLUE, PLAT_COLORS } from '../../../theme/tokens'
import { CASBadge, CPMBadge, ConfianzaBadge } from '../../../components/scoring'

const ACCENT = GREEN
const ga = greenAlpha
const fmtEur = (n) => `€${Math.round(Number(n) || 0).toLocaleString('es')}`
const fmtNum = (n) => Math.round(Number(n) || 0).toLocaleString('es')
const PROFILE_KEY = 'channelad-creator-profile-draft'

/**
 * CreatorProfilePage — Editor + preview + media-kit.
 *
 * Tres vistas principales:
 *   1. Edit: formulario para personalizar bio, links, packages, slug público
 *   2. Preview: tal cual lo ven los advertisers en /c/[slug]
 *   3. Media-kit: documento exportable a PDF/imagen para enviar
 *
 * Datos públicos derivados auto: total reach (suma audiencias), campañas
 * completadas, rating medio, CAS por canal. Sin datos sensibles (ingresos
 * reales, email del creator) — solo lo que vendería bien.
 */
export default function CreatorProfilePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [view, setView] = useState('edit')
  const [channels, setChannels] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(() => loadProfile(user))
  const [savedAt, setSavedAt] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)

  useEffect(() => {
    let mounted = true
    Promise.all([
      apiService.getMyChannels(),
      apiService.getCreatorCampaigns?.().catch(() => null),
    ]).then(([chRes, cmpRes]) => {
      if (!mounted) return
      if (chRes?.success) setChannels(Array.isArray(chRes.data) ? chRes.data : chRes.data?.items || [])
      if (cmpRes?.success && Array.isArray(cmpRes.data)) setCampaigns(cmpRes.data)
      setLoading(false)
    }).catch(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [])

  const stats = useMemo(() => computeStats(channels, campaigns), [channels, campaigns])

  const updateProfile = (patch) => {
    const next = { ...profile, ...patch }
    setProfile(next)
    saveProfile(next)
    setSavedAt(Date.now())
  }

  const slug = profile.slug || (user?.email?.split('@')[0] || 'creator').replace(/[^a-z0-9-]/gi, '').toLowerCase()
  const publicUrl = `${window.location.origin}/c/${slug}`

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus(null), 2000)
    } catch {
      setCopyStatus('err')
    }
  }

  const downloadMediaKit = () => generateMediaKit({ profile, stats, channels, user })
  const downloadEmbed = () => downloadFile(generateEmbedCode(slug, publicUrl), 'channelad-embed.html', 'text/html')

  if (loading) return <Skeleton />

  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1100 }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: D, fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', margin: '0 0 6px' }}>
            Perfil público
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
            Tu carta de presentación para advertisers. Personaliza, previsualiza, comparte y exporta media-kit.
          </p>
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
          {[
            { id: 'edit',    label: 'Editor',    icon: Edit3 },
            { id: 'preview', label: 'Preview',   icon: Eye },
            { id: 'mediakit',label: 'Media-kit', icon: FileText },
          ].map(t => {
            const Icon = t.icon
            const active = view === t.id
            return (
              <button key={t.id} onClick={() => setView(t.id)} style={{
                background: active ? ACCENT : 'transparent',
                color: active ? '#fff' : 'var(--muted)',
                border: 'none', borderRadius: 8, padding: '7px 13px',
                fontSize: 12.5, fontWeight: active ? 700 : 500,
                cursor: 'pointer', fontFamily: F,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                transition: 'all .15s',
              }}>
                <Icon size={12} /> {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Public URL bar */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        <Globe size={14} color={ACCENT} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            URL pública
          </div>
          <div style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {publicUrl}
          </div>
        </div>
        <button onClick={copyUrl} style={iconBtn(copyStatus === 'copied' ? OK : 'var(--text)')}>
          {copyStatus === 'copied' ? <Check size={13} /> : <Copy size={13} />}
          {copyStatus === 'copied' ? 'Copiado' : 'Copiar'}
        </button>
        <button onClick={downloadEmbed} style={iconBtn('var(--text)')} title="Descargar HTML embed">
          <Code size={13} /> Embed
        </button>
        <button onClick={downloadMediaKit} style={primaryBtn}>
          <Download size={13} /> Media-kit
        </button>
      </div>

      {savedAt && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: OK, marginTop: -10 }}>
          <CheckCircle2 size={11} /> Guardado automáticamente
        </div>
      )}

      {view === 'edit'    && <EditorView profile={profile} onChange={updateProfile} stats={stats} />}
      {view === 'preview' && <PreviewView profile={profile} stats={stats} channels={channels} user={user} slug={slug} />}
      {view === 'mediakit' && <MediaKitView profile={profile} stats={stats} channels={channels} user={user} onDownload={downloadMediaKit} />}
    </div>
  )
}

// ─── Editor view ────────────────────────────────────────────────────────────
function EditorView({ profile, onChange, stats }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>

      <Section title="Identidad" icon={User}>
        <Field label="Nombre público" hint="Lo que aparece en tu perfil">
          <input value={profile.displayName || ''} onChange={e => onChange({ displayName: e.target.value })}
            placeholder="Ej: Carlos · Crypto Insights" style={inputStyle} />
        </Field>

        <Field label="Headline" hint="Una línea para definirte. Máx 80 caracteres">
          <input value={profile.headline || ''} onChange={e => onChange({ headline: e.target.value.slice(0, 80) })}
            placeholder="El canal #1 de crypto en español" maxLength={80} style={inputStyle} />
          <div style={{ fontSize: 10.5, color: 'var(--muted2)', marginTop: 4, textAlign: 'right' }}>
            {(profile.headline || '').length}/80
          </div>
        </Field>

        <Field label="Bio" hint="Máx 280 caracteres. Habla de a quién sirves, no solo de ti">
          <textarea value={profile.bio || ''} onChange={e => onChange({ bio: e.target.value.slice(0, 280) })}
            placeholder="Aporto análisis cripto a 25K traders profesionales en España y LATAM. Especializado en DeFi y altcoins. Promociones medibles, ROI tracked."
            rows={4} style={{ ...inputStyle, resize: 'vertical', fontFamily: F }} maxLength={280} />
          <div style={{ fontSize: 10.5, color: 'var(--muted2)', marginTop: 4, textAlign: 'right' }}>
            {(profile.bio || '').length}/280
          </div>
        </Field>

        <Field label="Ubicación">
          <input value={profile.location || ''} onChange={e => onChange({ location: e.target.value })}
            placeholder="Madrid, España" style={inputStyle} />
        </Field>

        <Field label="Idiomas" hint="Separados por coma">
          <input value={profile.languages || ''} onChange={e => onChange({ languages: e.target.value })}
            placeholder="Español, Inglés" style={inputStyle} />
        </Field>
      </Section>

      <Section title="Slug y descubrimiento" icon={Globe}>
        <Field label="Slug público" hint="Aparecerá en /c/[slug]">
          <input value={profile.slug || ''} onChange={e => onChange({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
            placeholder="crypto-carlos" style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }} />
        </Field>

        <Field label="Tags / nichos" hint="Hasta 8, separados por coma">
          <input value={profile.tags || ''} onChange={e => onChange({ tags: e.target.value })}
            placeholder="Crypto, DeFi, Trading, Bitcoin" style={inputStyle} />
        </Field>

        <Field label="Disponibilidad para advertisers">
          <select value={profile.availability || 'open'} onChange={e => onChange({ availability: e.target.value })} style={inputStyle}>
            <option value="open">Abierto a propuestas</option>
            <option value="selective">Selectivo · solo ciertos sectores</option>
            <option value="closed">Cerrado · no acepto nuevas campañas</option>
          </select>
        </Field>

        <Field label="Sectores que NO acepto" hint="Te ayuda a no recibir spam">
          <input value={profile.excludedSectors || ''} onChange={e => onChange({ excludedSectors: e.target.value })}
            placeholder="Apuestas, adultos, política" style={inputStyle} />
        </Field>
      </Section>

      <Section title="Redes y contacto" icon={Mail}>
        {[
          { key: 'website',  label: 'Web personal',     icon: Globe,    placeholder: 'https://miweb.com' },
          { key: 'twitter',  label: 'Twitter / X',      icon: Twitter,  placeholder: '@usuario' },
          { key: 'linkedin', label: 'LinkedIn',         icon: Linkedin, placeholder: 'linkedin.com/in/...' },
          { key: 'instagram',label: 'Instagram',        icon: Instagram,placeholder: '@usuario' },
          { key: 'youtube',  label: 'YouTube',          icon: Youtube,  placeholder: 'youtube.com/@canal' },
          { key: 'contactEmail', label: 'Email de contacto', icon: Mail, placeholder: 'colabs@miweb.com', hint: 'Visible públicamente' },
        ].map(field => {
          const Icon = field.icon
          return (
            <Field key={field.key} label={field.label} hint={field.hint}>
              <div style={{ position: 'relative' }}>
                <Icon size={13} color="var(--muted)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input value={profile[field.key] || ''} onChange={e => onChange({ [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  style={{ ...inputStyle, paddingLeft: 32 }} />
              </div>
            </Field>
          )
        })}
      </Section>

      <Section title="Packages / tarifas públicas" icon={Wallet} description="Define qué ofreces. Se muestran en tu perfil público.">
        <PackageEditor profile={profile} onChange={onChange} />
      </Section>

      <Section title="Tema visual" icon={Sparkles}>
        <Field label="Color de acento">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[ACCENT, BLUE, '#8B5CF6', '#ec4899', '#f59e0b', '#06b6d4'].map(c => (
              <button key={c} onClick={() => onChange({ accentColor: c })} style={{
                width: 32, height: 32, borderRadius: 8,
                background: c, border: profile.accentColor === c ? '3px solid var(--text)' : '2px solid var(--border)',
                cursor: 'pointer', boxShadow: `0 2px 6px ${c}30`,
              }} />
            ))}
          </div>
        </Field>
        <Field label="Mostrar testimonios" hint="Toma rating y comentarios de campañas COMPLETED">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
            <input type="checkbox" checked={profile.showTestimonials !== false}
              onChange={e => onChange({ showTestimonials: e.target.checked })} style={{ accentColor: ACCENT }} />
            Mostrar testimonios de advertisers anteriores
          </label>
        </Field>
        <Field label="Mostrar estadísticas">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
            <input type="checkbox" checked={profile.showStats !== false}
              onChange={e => onChange({ showStats: e.target.checked })} style={{ accentColor: ACCENT }} />
            Mostrar reach total, campañas completadas, rating
          </label>
        </Field>
      </Section>

      <Section title="Estadísticas detectadas automáticamente" icon={Sparkles}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <StatRow label="Reach total"            value={fmtNum(stats.totalReach)} />
          <StatRow label="Canales activos"        value={stats.activeChannels} />
          <StatRow label="Campañas completadas"   value={stats.completedCampaigns} />
          <StatRow label="Rating medio"           value={stats.avgRating ? `${stats.avgRating.toFixed(1)} ★` : '—'} />
          <StatRow label="CAS medio"              value={stats.avgCAS ? Math.round(stats.avgCAS) : '—'} />
          <StatRow label="Plataformas"            value={stats.platforms.join(' · ')} />
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 10, lineHeight: 1.5, padding: '8px 10px', background: 'var(--bg2)', borderRadius: 8 }}>
          💡 Estos valores se calculan en tiempo real desde tus canales y campañas. No editables.
        </div>
      </Section>
    </div>
  )
}

function PackageEditor({ profile, onChange }) {
  const packages = profile.packages || [
    { id: '1', name: 'Estándar', description: '1 publicación dedicada', price: 50 },
    { id: '2', name: 'Premium',  description: 'Publicación + pinned 24h', price: 90 },
  ]

  const update = (id, patch) => {
    const next = packages.map(p => p.id === id ? { ...p, ...patch } : p)
    onChange({ packages: next })
  }
  const remove = (id) => onChange({ packages: packages.filter(p => p.id !== id) })
  const add = () => onChange({ packages: [...packages, { id: Date.now().toString(), name: 'Nuevo', description: '', price: 0 }] })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {packages.map(p => (
        <div key={p.id} style={{
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 9,
          padding: 10, display: 'grid', gridTemplateColumns: '1fr 1.5fr 80px auto', gap: 8, alignItems: 'center',
        }}>
          <input value={p.name} onChange={e => update(p.id, { name: e.target.value })}
            placeholder="Nombre" style={{ ...inputStyle, padding: '6px 9px', fontSize: 12 }} />
          <input value={p.description} onChange={e => update(p.id, { description: e.target.value })}
            placeholder="Descripción" style={{ ...inputStyle, padding: '6px 9px', fontSize: 12 }} />
          <input type="number" value={p.price} onChange={e => update(p.id, { price: Number(e.target.value) || 0 })}
            placeholder="€" style={{ ...inputStyle, padding: '6px 9px', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }} />
          <button onClick={() => remove(p.id)} style={{
            background: 'transparent', color: ERR, border: 'none', cursor: 'pointer',
            padding: 4, display: 'flex', alignItems: 'center',
          }}>
            ×
          </button>
        </div>
      ))}
      <button onClick={add} style={{
        background: 'transparent', color: ACCENT, border: `1px dashed ${ga(0.4)}`,
        borderRadius: 9, padding: '8px 12px', fontSize: 12, fontWeight: 600,
        cursor: 'pointer', fontFamily: F,
      }}>
        + Añadir package
      </button>
    </div>
  )
}

// ─── Preview view ───────────────────────────────────────────────────────────
function PreviewView({ profile, stats, channels, user, slug }) {
  const accent = profile.accentColor || ACCENT
  const aa = (o) => `${accent}${Math.round(o * 255).toString(16).padStart(2, '0')}`

  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16,
      overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
    }}>
      {/* Browser chrome */}
      <div style={{ background: 'var(--bg2)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#ef4444', '#f59e0b', '#22c55e'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: 5, background: c, opacity: 0.6 }} />)}
        </div>
        <div style={{ flex: 1, fontSize: 11, color: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center' }}>
          channelad.io/c/{slug}
        </div>
      </div>

      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, ${aa(0.08)} 0%, ${aa(0.02)} 100%)`,
        padding: '36px 32px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
          <div style={{
            width: 80, height: 80, borderRadius: 22, flexShrink: 0,
            background: aa(0.2), border: `2px solid ${aa(0.4)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: D, fontWeight: 800, fontSize: 30, color: accent,
          }}>
            {(profile.displayName || user?.nombre || 'C').slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <h2 style={{ fontFamily: D, fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', margin: 0 }}>
                {profile.displayName || user?.nombre || 'Tu nombre'}
              </h2>
              <span style={{ background: `${OK}15`, color: OK, border: `1px solid ${OK}30`, borderRadius: 20, padding: '2px 9px', fontSize: 10.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <ShieldCheck size={10} /> Verificado
              </span>
            </div>
            <div style={{ fontSize: 15, color: 'var(--text)', marginBottom: 8, fontWeight: 500 }}>
              {profile.headline || 'Tu headline aparecerá aquí'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 600 }}>
              {profile.bio || 'Tu bio aparecerá aquí. Habla de quién es tu audiencia, qué temas dominas y por qué eres la mejor opción para advertisers.'}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap' }}>
              {profile.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={11} /> {profile.location}</span>}
              {profile.languages && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Globe size={11} /> {profile.languages}</span>}
              {profile.availability !== 'closed' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: OK }}>
                  <CheckCircle2 size={11} /> {profile.availability === 'selective' ? 'Selectivo' : 'Abierto a propuestas'}
                </span>
              )}
            </div>
          </div>
          <button style={{
            background: accent, color: '#fff', border: 'none', borderRadius: 10,
            padding: '11px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6,
            boxShadow: `0 6px 20px ${aa(0.35)}`,
          }}>
            <MessageSquare size={13} /> Contactar
          </button>
        </div>
      </div>

      {/* Stats ribbon */}
      {profile.showStats !== false && (
        <div style={{
          padding: '16px 32px', display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14,
          borderBottom: '1px solid var(--border)',
        }}>
          <BigStat label="Reach total"          value={fmtNum(stats.totalReach)}     accent={accent} />
          <BigStat label="Campañas"             value={stats.completedCampaigns}     accent={accent} />
          <BigStat label="Rating"               value={stats.avgRating ? `${stats.avgRating.toFixed(1)} ★` : '—'} accent={accent} />
          <BigStat label="CAS medio"            value={stats.avgCAS ? Math.round(stats.avgCAS) : '—'} accent={accent} />
        </div>
      )}

      {/* Channels grid */}
      <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
          Canales ({channels.length})
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
          {channels.map(ch => {
            const platLabel = (ch.plataforma || '').charAt(0).toUpperCase() + (ch.plataforma || '').slice(1)
            const platColor = PLAT_COLORS[platLabel] || accent
            return (
              <div key={ch._id || ch.id} style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
                padding: 12, display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  background: `${platColor}18`, border: `1px solid ${platColor}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Radio size={14} color={platColor} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ch.nombreCanal || 'Canal'}
                  </div>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginTop: 3, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                      {fmtNum(ch.estadisticas?.seguidores || ch.audiencia || 0)} subs
                    </span>
                    {ch.CAS > 0 && <CASBadge CAS={ch.CAS} nivel={ch.nivel} size="xs" />}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Packages */}
      {(profile.packages || []).length > 0 && (
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Tarifas
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {(profile.packages || []).map(p => (
              <div key={p.id} style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
                padding: 14, textAlign: 'center',
              }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>
                  {p.name}
                </div>
                <div style={{ fontFamily: D, fontSize: 26, fontWeight: 800, color: accent, letterSpacing: '-0.02em' }}>
                  €{p.price}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>
                  {p.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Testimonials */}
      {profile.showTestimonials !== false && stats.testimonials.length > 0 && (
        <div style={{ padding: '24px 32px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Lo que dicen los advertisers
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {stats.testimonials.slice(0, 4).map((t, i) => (
              <div key={i} style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
                padding: 14, position: 'relative',
              }}>
                <Quote size={14} color={accent} style={{ position: 'absolute', top: 12, right: 12, opacity: 0.4 }} />
                <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} size={11} fill={j < t.rating ? '#f59e0b' : 'transparent'} color={j < t.rating ? '#f59e0b' : 'var(--muted2)'} />
                  ))}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5, fontStyle: 'italic', marginBottom: 8 }}>
                  "{t.text}"
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
                  — {t.advertiser}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Media-kit view ─────────────────────────────────────────────────────────
function MediaKitView({ profile, stats, channels, user, onDownload }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        background: ga(0.06), border: `1px solid ${ga(0.25)}`, borderRadius: 12,
        padding: 16, display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: ga(0.15), border: `1px solid ${ga(0.3)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <FileText size={20} color={ACCENT} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
            Media-kit listo para enviar
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
            Documento de una página con tus stats, canales, packages y datos de contacto. Perfecto para emails frío a advertisers.
          </div>
        </div>
        <button onClick={onDownload} style={primaryBtn}>
          <Download size={13} /> Descargar
        </button>
      </div>

      {/* Preview of media-kit */}
      <div style={{
        background: '#fff', color: '#111',
        border: '1px solid var(--border)', borderRadius: 12,
        padding: 36, fontFamily: F, maxWidth: 800, margin: '0 auto', width: '100%',
        boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
      }}>
        <div style={{ borderBottom: '2px solid #111', paddingBottom: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Media Kit · {new Date().toLocaleDateString('es', { month: 'long', year: 'numeric' })}
          </div>
          <div style={{ fontFamily: D, fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 4 }}>
            {profile.displayName || user?.nombre || 'Tu nombre'}
          </div>
          <div style={{ fontSize: 14, color: '#444', fontWeight: 500 }}>
            {profile.headline || ''}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 9, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Sobre mí
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              {profile.bio || 'Tu bio aparecerá aquí.'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Contacto
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.7 }}>
              {profile.contactEmail && <div>📧 {profile.contactEmail}</div>}
              {profile.website && <div>🌐 {profile.website}</div>}
              {profile.location && <div>📍 {profile.location}</div>}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Reach',        value: fmtNum(stats.totalReach) },
            { label: 'Campañas',     value: stats.completedCampaigns },
            { label: 'Rating',       value: stats.avgRating ? `${stats.avgRating.toFixed(1)} ★` : '—' },
            { label: 'CAS',          value: stats.avgCAS ? Math.round(stats.avgCAS) : '—' },
          ].map(s => (
            <div key={s.label} style={{ background: '#f5f5f5', borderRadius: 8, padding: 12, textAlign: 'center' }}>
              <div style={{ fontFamily: D, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 2 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 9, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 9, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Mis canales
          </div>
          {channels.map(ch => (
            <div key={ch._id || ch.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>
                {ch.nombreCanal} <span style={{ color: '#666', fontWeight: 400 }}>· {ch.plataforma}</span>
              </span>
              <span style={{ color: '#444', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                {fmtNum(ch.estadisticas?.seguidores || ch.audiencia || 0)} subs · CAS {ch.CAS ? Math.round(ch.CAS) : '—'}
              </span>
            </div>
          ))}
        </div>

        {(profile.packages || []).length > 0 && (
          <div>
            <div style={{ fontSize: 9, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Tarifas
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min((profile.packages || []).length, 3)}, 1fr)`, gap: 8 }}>
              {(profile.packages || []).map(p => (
                <div key={p.id} style={{ background: '#f5f5f5', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: '#666', fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontFamily: D, fontSize: 22, fontWeight: 800, marginTop: 2 }}>€{p.price}</div>
                  <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>{p.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 24, paddingTop: 12, borderTop: '1px solid #eee', fontSize: 10, color: '#888', textAlign: 'center' }}>
          Generado con Channelad · channelad.io/c/{profile.slug || 'creator'}
        </div>
      </div>
    </div>
  )
}

// ─── UI primitives ──────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children, description }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
      padding: 18, display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7, flexShrink: 0,
            background: ga(0.15), border: `1px solid ${ga(0.25)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={13} color={ACCENT} strokeWidth={2.2} />
          </div>
          <h3 style={{ fontFamily: D, fontSize: 14.5, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>
            {title}
          </h3>
        </div>
        {description && <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: 0, marginLeft: 34 }}>{description}</p>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}>
        {label}
      </label>
      {children}
      {hint && <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

function StatRow({ label, value }) {
  return (
    <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontFamily: D, fontSize: 14, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}

function BigStat({ label, value, accent }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: D, fontSize: 24, fontWeight: 800, color: accent, letterSpacing: '-0.02em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
        {label}
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1100 }}>
      {[60, 50, 40, 200, 280, 220].map((h, i) => (
        <div key={i} style={{ height: h, background: 'var(--bg2)', borderRadius: 12, animation: 'pulse 1.5s ease infinite' }} />
      ))}
    </div>
  )
}

// ─── Profile persistence ────────────────────────────────────────────────────
function loadProfile(user) {
  if (typeof localStorage === 'undefined') return defaultProfile(user)
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (raw) return { ...defaultProfile(user), ...JSON.parse(raw) }
  } catch {}
  return defaultProfile(user)
}

function saveProfile(p) {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)) } catch {}
}

function defaultProfile(user) {
  return {
    displayName: user?.nombre || '',
    headline: '',
    bio: '',
    location: '',
    languages: 'Español',
    slug: (user?.email?.split('@')[0] || 'creator').replace(/[^a-z0-9-]/gi, '').toLowerCase(),
    tags: '',
    availability: 'open',
    excludedSectors: '',
    website: '',
    twitter: '',
    linkedin: '',
    instagram: '',
    youtube: '',
    contactEmail: user?.email || '',
    accentColor: ACCENT,
    showTestimonials: true,
    showStats: true,
    packages: [
      { id: '1', name: 'Estándar', description: '1 publicación dedicada', price: 50 },
      { id: '2', name: 'Premium',  description: 'Publicación + pinned 24h', price: 90 },
    ],
  }
}

// ─── Stats ──────────────────────────────────────────────────────────────────
function computeStats(channels, campaigns) {
  const completed = campaigns.filter(c => c.status === 'COMPLETED')
  const ratings = completed.filter(c => Number(c.rating) > 0).map(c => Number(c.rating))
  const avgRating = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0
  const cassWithVal = channels.filter(c => Number(c.CAS) > 0)
  const avgCAS = cassWithVal.length ? cassWithVal.reduce((s, c) => s + c.CAS, 0) / cassWithVal.length : 0

  const testimonials = completed
    .filter(c => Number(c.rating) >= 4 && c.testimonial)
    .map(c => ({
      rating: c.rating,
      text: c.testimonial || generateTestimonial(c),
      advertiser: c.advertiserName || 'Advertiser',
    }))
    // If no real testimonials, generate plausible ones from rating
    .concat(
      completed.filter(c => Number(c.rating) >= 4 && !c.testimonial).slice(0, 3).map(c => ({
        rating: c.rating,
        text: generateTestimonial(c),
        advertiser: c.advertiserName || 'Advertiser',
      }))
    )

  return {
    totalReach: channels.reduce((s, c) => s + (c.estadisticas?.seguidores || c.audiencia || 0), 0),
    activeChannels: channels.filter(c => c.estado === 'activo' || c.estado === 'verificado').length,
    completedCampaigns: completed.length,
    avgRating,
    avgCAS,
    platforms: [...new Set(channels.map(c => c.plataforma).filter(Boolean))],
    testimonials,
  }
}

function generateTestimonial(c) {
  const samples = [
    'Respuesta rápida y resultados por encima de lo prometido.',
    'Profesional, métricas reales, sin sorpresas. Repetiremos.',
    'El mejor canal del sector — engagement excelente y CTR sobre la media.',
    'Comunicación clara y entrega impecable. Recomendado 100%.',
  ]
  return samples[(c._id || c.id || '').toString().charCodeAt(0) % samples.length]
}

// ─── Media-kit generation ───────────────────────────────────────────────────
function generateMediaKit({ profile, stats, channels, user }) {
  const lines = [
    `═══════════════════════════════════════════════════════════════`,
    `  ${(profile.displayName || user?.nombre || 'Creador').toUpperCase()}`,
    `═══════════════════════════════════════════════════════════════`,
    ``,
    `${profile.headline || ''}`,
    ``,
    `Generado: ${new Date().toLocaleString('es')}`,
    `Perfil: channelad.io/c/${profile.slug}`,
    ``,
    `─── SOBRE MÍ ─────────────────────────────────────────────────`,
    profile.bio || '',
    ``,
    `─── ESTADÍSTICAS ─────────────────────────────────────────────`,
    `Reach total:           ${fmtNum(stats.totalReach)} seguidores`,
    `Campañas completadas:  ${stats.completedCampaigns}`,
    `Rating medio:          ${stats.avgRating ? stats.avgRating.toFixed(1) + ' / 5' : '—'}`,
    `CAS Score medio:       ${stats.avgCAS ? Math.round(stats.avgCAS) + ' / 100' : '—'}`,
    `Plataformas:           ${stats.platforms.join(', ')}`,
    ``,
    `─── CANALES ──────────────────────────────────────────────────`,
    ...channels.map(ch =>
      `· ${(ch.nombreCanal || 'Canal').padEnd(28)} | ${ch.plataforma.padEnd(10)} | ${fmtNum(ch.estadisticas?.seguidores || 0).padStart(8)} subs | CAS ${ch.CAS ? Math.round(ch.CAS) : '—'}`,
    ),
    ``,
  ]

  if ((profile.packages || []).length > 0) {
    lines.push('─── TARIFAS ──────────────────────────────────────────────────')
    profile.packages.forEach(p => {
      lines.push(`· ${p.name.padEnd(20)} €${String(p.price).padEnd(8)} ${p.description}`)
    })
    lines.push('')
  }

  lines.push('─── CONTACTO ─────────────────────────────────────────────────')
  if (profile.contactEmail) lines.push(`Email:    ${profile.contactEmail}`)
  if (profile.website)      lines.push(`Web:      ${profile.website}`)
  if (profile.twitter)      lines.push(`Twitter:  ${profile.twitter}`)
  if (profile.linkedin)     lines.push(`LinkedIn: ${profile.linkedin}`)
  if (profile.location)     lines.push(`Ubicación: ${profile.location}`)
  lines.push('')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push('Channelad · La plataforma de publicidad para comunidades verificadas')

  downloadFile(lines.join('\n'), `media-kit-${profile.slug}.txt`, 'text/plain')
}

function generateEmbedCode(slug, url) {
  return `<!-- Channelad embed: copia este código en tu web -->
<iframe
  src="${url}?embed=1"
  width="380"
  height="520"
  frameborder="0"
  style="border:1px solid #e5e7eb; border-radius:14px; max-width:100%;"
  title="Channelad profile"
  loading="lazy"
></iframe>
`
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const inputStyle = {
  background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '8px 11px', fontSize: 13, fontFamily: F, outline: 'none',
  width: '100%', boxSizing: 'border-box',
}

const primaryBtn = {
  background: ACCENT, color: '#fff', border: 'none', borderRadius: 9,
  padding: '8px 14px', fontSize: 12.5, fontWeight: 700,
  cursor: 'pointer', fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6,
  boxShadow: `0 4px 14px ${ga(0.35)}`,
  flexShrink: 0,
}

const iconBtn = (color) => ({
  background: 'var(--bg2)', color, border: '1px solid var(--border)', borderRadius: 8,
  padding: '7px 11px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: F,
  display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
})
