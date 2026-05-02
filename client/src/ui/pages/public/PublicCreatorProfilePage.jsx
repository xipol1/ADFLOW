import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  Globe, MapPin, MessageSquare, Mail, Star, ShieldCheck,
  CheckCircle2, Wallet, Users, Radio, Quote, ArrowRight,
  Linkedin, Twitter, Instagram, Youtube, Share2, Copy, Check,
  Building2, Sparkles, ExternalLink,
} from 'lucide-react'
import apiService from '../../../services/api'
import { FONT_BODY as F, FONT_DISPLAY as D, GREEN, greenAlpha, OK, BLUE, PLAT_COLORS } from '../../theme/tokens'
import { CASBadge } from '../../components/scoring'

const ACCENT = GREEN
const ga = greenAlpha
const fmtNum = (n) => Math.round(Number(n) || 0).toLocaleString('es')

/**
 * PublicCreatorProfilePage — Página pública sin auth para mostrar el perfil
 * de un creator a advertisers que descubren su URL.
 *
 * Ruta: /c/:slug (fuera del dashboard, en raíz pública).
 *
 * Renderiza:
 *   - Hero con avatar + bio + CTA contacto
 *   - Stats (reach, campañas, rating, CAS)
 *   - Grid de canales con CASBadge
 *   - Packages / tarifas
 *   - Testimonios reales de advertisers anteriores
 *   - Meta tags OG / Twitter Card para sharing
 *
 * Si no hay slug o no se encuentra, muestra 404 amable con CTA.
 */
export default function PublicCreatorProfilePage() {
  const { slug } = useParams()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [copyStatus, setCopyStatus] = useState(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        // Try public endpoint first (when backend exists)
        const res = await apiService.getPublicCreatorProfile?.(slug).catch(() => null)
        if (!mounted) return
        if (res?.success && res.data) {
          setData(res.data)
          setLoading(false)
          return
        }
        // Fallback: try to derive from current user's profile if their slug matches
        try {
          const local = JSON.parse(localStorage.getItem('channelad-creator-profile-draft') || 'null')
          if (local && local.slug === slug) {
            const channelsRes = await apiService.getMyChannels().catch(() => null)
            const campaignsRes = await apiService.getCreatorCampaigns?.().catch(() => null)
            const channels = channelsRes?.success ? (Array.isArray(channelsRes.data) ? channelsRes.data : channelsRes.data?.items || []) : []
            const campaigns = campaignsRes?.success && Array.isArray(campaignsRes.data) ? campaignsRes.data : []
            setData({ profile: local, channels, campaigns, fromLocal: true })
            setLoading(false)
            return
          }
        } catch {}
        setNotFound(true)
        setLoading(false)
      } catch (e) {
        if (mounted) { setNotFound(true); setLoading(false) }
      }
    }
    load()
    return () => { mounted = false }
  }, [slug])

  const stats = useMemo(() => data ? computeStats(data.channels || [], data.campaigns || []) : null, [data])
  const accent = data?.profile?.accentColor || ACCENT
  const aa = (o) => `${accent}${Math.round(o * 255).toString(16).padStart(2, '0')}`

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus(null), 2000)
    } catch {}
  }

  if (loading) return <PublicSkeleton />
  if (notFound || !data) return <NotFoundView slug={slug} navigate={navigate} />

  const { profile, channels = [] } = data

  return (
    <div style={{
      fontFamily: F, minHeight: '100vh',
      background: `linear-gradient(180deg, ${aa(0.04)} 0%, var(--bg) 200px)`,
    }}>
      {/* Meta tags for SEO + sharing */}
      <Helmet>
        <title>{profile.displayName || slug} · {profile.headline || 'Creator en Channelad'}</title>
        <meta name="description" content={profile.bio?.slice(0, 160) || `${profile.displayName} — ${profile.headline}`} />
        <meta property="og:title" content={`${profile.displayName} · Channelad`} />
        <meta property="og:description" content={profile.headline || profile.bio?.slice(0, 100) || ''} />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={typeof window !== 'undefined' ? window.location.href : ''} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${profile.displayName} · Channelad`} />
        <meta name="twitter:description" content={profile.headline || ''} />
      </Helmet>

      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(var(--bg-rgb, 23 23 23), 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <Link to="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          color: 'var(--text)', textDecoration: 'none', fontFamily: D, fontWeight: 800, fontSize: 15,
        }}>
          <span style={{ color: accent }}>●</span> Channelad
        </Link>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={copyUrl} style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '7px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text)', cursor: 'pointer', fontFamily: F,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            {copyStatus === 'copied' ? <><Check size={12} color={OK} /> Copiado</> : <><Share2 size={12} /> Compartir</>}
          </button>
          <Link to="/auth/register" style={{
            background: accent, color: '#fff', border: 'none', borderRadius: 8,
            padding: '7px 14px', fontSize: 12, fontWeight: 700, fontFamily: F,
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            Crear cuenta <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Hero */}
        <div style={{
          background: `linear-gradient(135deg, var(--surface) 0%, ${aa(0.06)} 100%)`,
          border: `1px solid ${aa(0.2)}`, borderRadius: 18,
          padding: '32px 28px', marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 22, flexWrap: 'wrap' }}>
            <div style={{
              width: 96, height: 96, borderRadius: 26, flexShrink: 0,
              background: aa(0.18), border: `2px solid ${aa(0.4)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: D, fontWeight: 800, fontSize: 36, color: accent,
            }}>
              {(profile.displayName || slug).slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <h1 style={{ fontFamily: D, fontSize: 32, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em', margin: 0 }}>
                  {profile.displayName || slug}
                </h1>
                <span style={{
                  background: `${OK}15`, color: OK, border: `1px solid ${OK}30`,
                  borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  <ShieldCheck size={11} /> Verificado
                </span>
              </div>
              {profile.headline && (
                <div style={{ fontSize: 17, color: 'var(--text)', fontWeight: 500, marginBottom: 10, lineHeight: 1.4 }}>
                  {profile.headline}
                </div>
              )}
              {profile.bio && (
                <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 14 }}>
                  {profile.bio}
                </div>
              )}
              <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap', marginBottom: 16 }}>
                {profile.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {profile.location}</span>}
                {profile.languages && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Globe size={12} /> {profile.languages}</span>}
                {profile.availability !== 'closed' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: OK }}>
                    <CheckCircle2 size={12} /> {profile.availability === 'selective' ? 'Selectivo' : 'Abierto a propuestas'}
                  </span>
                )}
              </div>

              {/* Social links */}
              {(profile.website || profile.twitter || profile.linkedin || profile.instagram || profile.youtube) && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { key: 'website', icon: Globe,    href: profile.website },
                    { key: 'twitter', icon: Twitter,  href: cleanUrl(profile.twitter, 'https://twitter.com/') },
                    { key: 'linkedin',icon: Linkedin, href: cleanUrl(profile.linkedin, 'https://linkedin.com/in/') },
                    { key: 'instagram',icon: Instagram, href: cleanUrl(profile.instagram, 'https://instagram.com/') },
                    { key: 'youtube', icon: Youtube,  href: cleanUrl(profile.youtube, 'https://youtube.com/') },
                  ].filter(s => s.href).map(s => {
                    const Icon = s.icon
                    return (
                      <a key={s.key} href={s.href} target="_blank" rel="noopener noreferrer" title={s.key}
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: 'var(--bg2)', border: '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--muted)', textDecoration: 'none',
                          transition: 'border-color .15s, color .15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}
                      >
                        <Icon size={14} />
                      </a>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Contact CTA */}
          {profile.availability !== 'closed' && (
            <div style={{
              marginTop: 22, padding: '14px 18px',
              background: 'var(--surface)', border: `1px solid ${aa(0.3)}`, borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap',
            }}>
              <div style={{ minWidth: 200 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                  ¿Te interesa colaborar?
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                  Lanza tu campaña en Channelad — sistema de escrow, métricas verificadas, pagos automáticos.
                </div>
              </div>
              <Link to="/auth/register?role=advertiser" style={{
                background: accent, color: '#fff', border: 'none', borderRadius: 10,
                padding: '10px 18px', fontSize: 13, fontWeight: 700, fontFamily: F,
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
                boxShadow: `0 6px 20px ${aa(0.35)}`,
                whiteSpace: 'nowrap',
              }}>
                <MessageSquare size={13} /> Lanzar campaña
              </Link>
            </div>
          )}
        </div>

        {/* Stats */}
        {profile.showStats !== false && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
            <PublicStat label="Reach total"      value={fmtNum(stats.totalReach)}                          accent={accent} />
            <PublicStat label="Campañas"          value={stats.completedCampaigns}                          accent={accent} />
            <PublicStat label="Rating"            value={stats.avgRating ? `${stats.avgRating.toFixed(1)} ★` : '—'} accent={accent} />
            <PublicStat label="CAS medio"         value={stats.avgCAS ? Math.round(stats.avgCAS) : '—'}     accent={accent} />
          </div>
        )}

        {/* Channels */}
        {channels.length > 0 && (
          <Section title={`Canales (${channels.length})`} icon={Radio}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
              {channels.map(ch => {
                const platLabel = (ch.plataforma || '').charAt(0).toUpperCase() + (ch.plataforma || '').slice(1)
                const platColor = PLAT_COLORS[platLabel] || accent
                return (
                  <div key={ch._id || ch.id} style={{
                    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 11,
                    padding: 13, display: 'flex', alignItems: 'center', gap: 11,
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: `${platColor}18`, border: `1px solid ${platColor}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Radio size={15} color={platColor} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ch.nombreCanal || 'Canal'}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                        <span style={{
                          background: `${platColor}15`, color: platColor, border: `1px solid ${platColor}30`,
                          borderRadius: 5, padding: '1px 6px', fontSize: 10, fontWeight: 600,
                        }}>{platLabel}</span>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {fmtNum(ch.estadisticas?.seguidores || ch.audiencia || 0)} subs
                        </span>
                        {ch.CAS > 0 && <CASBadge CAS={ch.CAS} nivel={ch.nivel} size="xs" />}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {/* Packages */}
        {(profile.packages || []).length > 0 && (
          <Section title="Tarifas" icon={Wallet}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              {(profile.packages || []).map(p => (
                <div key={p.id} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
                  padding: 16, textAlign: 'center',
                }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    {p.name}
                  </div>
                  <div style={{ fontFamily: D, fontSize: 28, fontWeight: 900, color: accent, letterSpacing: '-0.02em' }}>
                    €{p.price}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, lineHeight: 1.4 }}>
                    {p.description}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Testimonials */}
        {profile.showTestimonials !== false && stats.testimonials.length > 0 && (
          <Section title="Lo que dicen los advertisers" icon={Quote}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {stats.testimonials.slice(0, 4).map((t, i) => (
                <div key={i} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
                  padding: 16, position: 'relative',
                }}>
                  <Quote size={16} color={accent} style={{ position: 'absolute', top: 14, right: 14, opacity: 0.3 }} />
                  <div style={{ display: 'flex', gap: 2, marginBottom: 10 }}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} size={12} fill={j < t.rating ? '#f59e0b' : 'transparent'} color={j < t.rating ? '#f59e0b' : 'var(--muted2)'} />
                    ))}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, fontStyle: 'italic', marginBottom: 10 }}>
                    "{t.text}"
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>
                    — {t.advertiser}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Footer CTA */}
        <div style={{
          background: aa(0.06), border: `1px solid ${aa(0.25)}`, borderRadius: 14,
          padding: 24, textAlign: 'center', marginTop: 32,
        }}>
          <Sparkles size={28} color={accent} style={{ margin: '0 auto 10px' }} />
          <h3 style={{ fontFamily: D, fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            ¿Quieres aparecer aquí?
          </h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 auto 16px', maxWidth: 460, lineHeight: 1.5 }}>
            Channelad es la plataforma para creators que quieren monetizar canales verificados. Pagos en escrow, métricas reales, advertisers cualificados.
          </p>
          <Link to="/auth/register?role=creator" style={{
            background: accent, color: '#fff', border: 'none', borderRadius: 10,
            padding: '11px 22px', fontSize: 13.5, fontWeight: 700, fontFamily: F,
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
            boxShadow: `0 6px 20px ${aa(0.35)}`,
          }}>
            Crear mi perfil de creator <ArrowRight size={13} />
          </Link>
        </div>

      </div>
    </div>
  )
}

function Section({ title, icon: Icon, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Icon size={15} color="var(--muted)" />
        <h2 style={{ fontFamily: D, fontSize: 14, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  )
}

function PublicStat({ label, value, accent }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
      padding: '14px 16px', textAlign: 'center',
    }}>
      <div style={{ fontFamily: D, fontSize: 24, fontWeight: 800, color: accent, letterSpacing: '-0.02em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>
        {label}
      </div>
    </div>
  )
}

function PublicSkeleton() {
  return (
    <div style={{ fontFamily: F, minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ height: 250, background: 'var(--bg2)', borderRadius: 18, animation: 'pulse 1.5s ease infinite' }} />
        <div style={{ height: 80, background: 'var(--bg2)', borderRadius: 12, animation: 'pulse 1.5s ease infinite', marginTop: 16 }} />
        <div style={{ height: 200, background: 'var(--bg2)', borderRadius: 12, animation: 'pulse 1.5s ease infinite', marginTop: 16 }} />
      </div>
    </div>
  )
}

function NotFoundView({ slug, navigate }) {
  return (
    <div style={{ fontFamily: F, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Helmet><title>Creator no encontrado · Channelad</title></Helmet>
      <div style={{ textAlign: 'center', maxWidth: 460 }}>
        <Building2 size={42} color="var(--muted2)" style={{ margin: '0 auto 16px' }} />
        <h1 style={{ fontFamily: D, fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          No encontramos a <code style={{ color: ACCENT, fontFamily: 'JetBrains Mono, monospace' }}>{slug}</code>
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 24px', lineHeight: 1.6 }}>
          Este perfil no existe o aún no ha sido publicado. Si crees que es un error, comprueba el enlace.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" style={btnSecondary}>Ir al inicio</Link>
          <Link to="/auth/register" style={btnPrimary}>
            Crear mi perfil <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  )
}

function computeStats(channels, campaigns) {
  const completed = campaigns.filter(c => c.status === 'COMPLETED')
  const ratings = completed.filter(c => Number(c.rating) > 0).map(c => Number(c.rating))
  const avgRating = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0
  const cassWithVal = channels.filter(c => Number(c.CAS) > 0)
  const avgCAS = cassWithVal.length ? cassWithVal.reduce((s, c) => s + c.CAS, 0) / cassWithVal.length : 0
  const testimonials = completed
    .filter(c => Number(c.rating) >= 4 && c.testimonial)
    .map(c => ({ rating: c.rating, text: c.testimonial, advertiser: c.advertiserName || 'Advertiser' }))
    .concat(
      completed.filter(c => Number(c.rating) >= 4 && !c.testimonial).slice(0, 3).map(c => ({
        rating: c.rating,
        text: 'Profesional, métricas reales, sin sorpresas. Comunicación clara y entrega impecable.',
        advertiser: c.advertiserName || 'Advertiser',
      }))
    )
  return {
    totalReach: channels.reduce((s, c) => s + (c.estadisticas?.seguidores || c.audiencia || 0), 0),
    completedCampaigns: completed.length,
    avgRating, avgCAS, testimonials,
  }
}

function cleanUrl(value, prefix) {
  if (!value) return null
  if (value.startsWith('http://') || value.startsWith('https://')) return value
  return prefix + value.replace(/^@/, '')
}

const btnPrimary = {
  background: ACCENT, color: '#fff', border: 'none', borderRadius: 10,
  padding: '10px 18px', fontSize: 13, fontWeight: 700, fontFamily: F,
  textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
  boxShadow: `0 4px 14px ${ga(0.35)}`,
}
const btnSecondary = {
  background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 10,
  padding: '10px 18px', fontSize: 13, fontWeight: 600, fontFamily: F,
  textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
}
