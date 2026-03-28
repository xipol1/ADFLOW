import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

/* ─── TOKENS ─────────────────────────────────────────────── */
const A  = '#8b5cf6'            // accent purple
const AD = '#7c3aed'            // accent dark
const AG = (o) => `rgba(139,92,246,${o})`  // accent with opacity

/* ─── DATA ───────────────────────────────────────────────── */

const TRUST_PLATFORMS = ['WhatsApp', 'Telegram', 'Discord', 'YouTube', 'Instagram', 'TikTok', 'Twitch', 'Patreon']

const CATEGORIES = [
  { icon: '🛒', name: 'Ecommerce',  count: '3.180' },
  { icon: '💪', name: 'Fitness',    count: '1.205' },
  { icon: '📈', name: 'Marketing',  count: '2.340' },
  { icon: '🎮', name: 'Gaming',     count: '1.890' },
  { icon: '🤖', name: 'IA & Tech',  count: '870'   },
  { icon: '📚', name: 'Educación',  count: '520'   },
  { icon: '🎨', name: 'Diseño',     count: '640'   },
  { icon: '🌍', name: 'Lifestyle',  count: '430'   },
]

// Badge system — 3 colors only
const BADGE = {
  verified: { bg: AG(0.12), color: A,         border: AG(0.22) },
  trending: { bg: 'rgba(249,115,22,0.12)',  color: '#f97316', border: 'rgba(249,115,22,0.22)' },
  new:      { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6', border: 'rgba(59,130,246,0.22)' },
}

// Platform palette
const PLAT = {
  wa: { color: '#25d366', bg: 'rgba(37,211,102,0.12)',  label: 'WhatsApp' },
  tg: { color: '#2aabee', bg: 'rgba(42,171,238,0.12)',  label: 'Telegram' },
  dc: { color: '#5865f2', bg: 'rgba(88,101,242,0.12)',  label: 'Discord'  },
  yt: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   label: 'YouTube'  },
  cr: { color: '#a855f7', bg: 'rgba(168,85,247,0.12)',  label: 'Discord'  },
  in: { color: '#f97316', bg: 'rgba(249,115,22,0.12)',  label: 'Telegram' },
}

// WhatsApp as dominant platform (first 2 listings)
const LISTINGS = [
  { platCls: 'wa', badge: 'TOP',   badgeType: 'verified', seller: 'ecomhub',      initials: 'EH', color: '#25d366', isPro: true,  title: 'Comunidad de compradores activos en ecommerce con alto poder adquisitivo',           rating: '5.0', reviews:  97, members: '12.400', price: '€320', unit: '/post' },
  { platCls: 'wa', badge: 'Hot',   badgeType: 'trending', seller: 'fitcoach_lu',  initials: 'FT', color: '#25d366', isPro: true,  title: 'Canal fitness con audiencia comprometida, recetas, retos semanales y productos',       rating: '4.9', reviews: 214, members: '8.700',  price: '€180', unit: '/post' },
  { platCls: 'tg', badge: 'TOP',   badgeType: 'verified', seller: 'techpro',      initials: 'TP', color: '#2aabee', isPro: true,  title: 'Audiencia tech hispanohablante con alta tasa de engagement y conversión',              rating: '4.9', reviews: 312, members: '8.200',  price: '€450', unit: '/post' },
  { platCls: 'dc', badge: 'Nuevo', badgeType: 'new',      seller: 'gamermk',      initials: 'GM', color: '#5865f2', isPro: false, title: 'Servidor gaming con comunidad activa, torneos semanales y alto engagement',             rating: '4.8', reviews: 189, members: '4.500',  price: '€280', unit: '/post' },
  { platCls: 'cr', badge: 'TOP',   badgeType: 'verified', seller: 'ai_labs_co',   initials: 'AI', color: '#a855f7', isPro: true,  title: 'Comunidad IA: prompts, herramientas, automatizaciones y novedades del sector',         rating: '4.9', reviews: 421, members: '11.000', price: '€220', unit: '/post' },
  { platCls: 'in', badge: null,    badgeType: null,       seller: 'lifestyle_co', initials: 'LS', color: '#f97316', isPro: false, title: 'Audiencia lifestyle con interés en moda, viajes y tendencias de consumo',               rating: '4.8', reviews: 138, members: '3.400',  price: '€150', unit: '/post' },
]

const STEPS = [
  { n: '01', title: 'Encuentra tu audiencia', desc: 'Explora más de 12.000 canales de WhatsApp, Telegram y Discord filtrados por nicho, precio y plataforma.' },
  { n: '02', title: 'Pago protegido',          desc: 'Los fondos quedan en custodia hasta que el canal publique. Si no cumple, recuperas el dinero automáticamente.' },
  { n: '03', title: 'Campaña publicada',        desc: 'El canal publica tu anuncio en el tiempo acordado. Recibes confirmación y métricas de rendimiento en tiempo real.' },
  { n: '04', title: 'Métricas verificables',    desc: 'Controla clicks, alcance y conversiones desde tu dashboard. Repite con los canales que mejor rendimiento ofrecen.' },
]

// WhatsApp sellers first
const SELLERS = [
  { initials: 'EH', color: '#25d366', name: 'ecomhub',      niche: 'Ecommerce · WhatsApp', rating: '5.0', reviews:  97, badge: 'Top Canal',  badgeType: 'verified', price: '€320/post' },
  { initials: 'FT', color: '#25d366', name: 'fitcoach_lu',  niche: 'Fitness · WhatsApp',   rating: '4.9', reviews: 214, badge: 'Verificado', badgeType: 'verified', price: '€180/post' },
  { initials: 'TP', color: '#2aabee', name: 'techpro',      niche: 'Marketing · Telegram', rating: '4.9', reviews: 312, badge: 'Top Canal',  badgeType: 'verified', price: '€450/post' },
  { initials: 'GM', color: '#5865f2', name: 'gamermk',      niche: 'Gaming · Discord',     rating: '4.8', reviews: 189, badge: 'Trending',   badgeType: 'trending', price: '€280/post' },
  { initials: 'AI', color: '#a855f7', name: 'ai_labs_co',   niche: 'IA · Discord',         rating: '4.8', reviews: 138, badge: 'Emergente',  badgeType: 'new',      price: '€220/post' },
]

/* ─── FADE-UP HOOK ───────────────────────────────────────── */
function useFadeUp() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.08 }
    )
    document.querySelectorAll('.fade-up').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

/* ─── COMPONENT ──────────────────────────────────────────── */
export default function LandingPage() {
  useFadeUp()
  const navigate = useNavigate()
  const [hovCat,    setHovCat]    = useState(null)
  const [hovCard,   setHovCard]   = useState(null)
  const [hovSeller, setHovSeller] = useState(null)
  const [searchFoc, setSearchFoc] = useState(false)
  const [searchVal, setSearchVal] = useState('')

  const goSearch = () => navigate('/marketplace' + (searchVal.trim() ? `?q=${encodeURIComponent(searchVal.trim())}` : ''))

  const F = "'Inter', system-ui, sans-serif"
  const D = "'Sora', system-ui, sans-serif"

  // Section heading style
  const H2 = { fontFamily: D, fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }
  // Section label style
  const Label = { fontFamily: F, fontSize: '11px', fontWeight: 600, color: A, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: F }}>

      {/* ── ANNOUNCEMENT ── */}
      <div style={{
        borderBottom: `1px solid ${AG(0.2)}`,
        background: AG(0.06),
        padding: '9px 0', textAlign: 'center',
        fontSize: '13px', color: 'var(--muted)',
      }}>
        <span style={{ color: A, fontWeight: 600 }}>Nuevo</span>
        {' '}— Adflow Premium: campañas multi-canal con métricas unificadas en WhatsApp, Telegram y Discord.{' '}
        <a href="#how-it-works" style={{ color: 'var(--text)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>Saber más →</a>
      </div>

      {/* ── HERO ── */}
      <section style={{
        position: 'relative', padding: '112px 48px 88px',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}>
        {/* Radial glow */}
        <div style={{
          position: 'absolute', top: '-10%', left: '28%',
          width: '700px', height: '500px',
          background: `radial-gradient(ellipse,${AG(0.07)} 0%,transparent 65%)`,
          pointerEvents: 'none',
        }} />

        <div style={{
          position: 'relative', zIndex: 1,
          maxWidth: '1160px', margin: '0 auto',
          display: 'grid', gridTemplateColumns: '1fr 260px',
          gap: '64px', alignItems: 'center',
        }}>

          {/* LEFT */}
          <div>
            <p style={{ ...Label, marginBottom: '20px' }}>
              Marketplace de publicidad · WhatsApp · Telegram · Discord
            </p>

            <h1 style={{
              fontFamily: D, fontSize: 'clamp(36px,4vw,52px)',
              fontWeight: 700, lineHeight: 1.08,
              letterSpacing: '-0.03em', color: 'var(--text)',
              marginBottom: '20px',
            }}>
              Compra espacios publicitarios<br />
              en <span style={{ color: A }}>comunidades reales</span>
            </h1>

            <p style={{
              fontFamily: F, fontSize: '17px', fontWeight: 300,
              lineHeight: 1.7, color: 'var(--muted)',
              maxWidth: '460px', marginBottom: '40px',
            }}>
              Conecta con audiencias activas en WhatsApp, Telegram y Discord.
              Pago custodiado y métricas verificables.
            </p>

            {/* Search */}
            <div style={{
              display: 'flex',
              background: 'var(--surface)',
              border: `1px solid ${searchFoc ? AG(0.55) : 'var(--border-med)'}`,
              borderRadius: '12px', overflow: 'hidden',
              boxShadow: searchFoc
                ? `0 0 0 3px ${AG(0.15)}, 0 20px 40px rgba(0,0,0,0.15)`
                : '0 8px 24px rgba(0,0,0,0.12)',
              maxWidth: '600px', height: '58px',
              transition: 'border-color .2s, box-shadow .2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', flex: 1, padding: '0 18px', gap: '12px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ color: 'var(--muted2)', flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input type="text"
                  placeholder="Buscar audiencias, canales o temáticas..."
                  value={searchVal}
                  onChange={e => setSearchVal(e.target.value)}
                  onFocus={() => setSearchFoc(true)}
                  onBlur={() => setSearchFoc(false)}
                  onKeyDown={e => e.key === 'Enter' && goSearch()}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '15px', color: 'var(--text)', fontFamily: F }}
                />
              </div>
              <button onClick={goSearch} style={{
                background: A, color: '#fff',
                margin: '8px', borderRadius: '8px', padding: '0 22px',
                fontWeight: 600, fontSize: '14px',
                display: 'flex', alignItems: 'center',
                border: 'none', cursor: 'pointer', flexShrink: 0,
                transition: 'background .2s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = AD}
                onMouseLeave={e => e.currentTarget.style.background = A}
              >
                Buscar
              </button>
            </div>

            {/* Chips — WhatsApp first */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px', marginBottom: '32px' }}>
              {[['WhatsApp','platform'],['Telegram','platform'],['Discord','platform'],['Ecommerce','category'],['Fitness','category']].map(([chip, key]) => (
                <Link key={chip} to={`/marketplace?${key}=${encodeURIComponent(chip)}`} style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '999px', padding: '5px 13px',
                  fontSize: '13px', color: 'var(--muted)',
                  textDecoration: 'none', transition: 'all .15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = AG(0.12); e.currentTarget.style.color = A; e.currentTarget.style.borderColor = AG(0.22) }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                >{chip}</Link>
              ))}
            </div>

            {/* Metrics */}
            <div style={{
              display: 'flex', gap: '36px',
              paddingBottom: '32px',
              borderBottom: '1px solid var(--border)',
              marginBottom: '28px',
            }}>
              {[['12.4K', 'Canales verificados'], ['98.7%', 'Satisfacción'], ['340K+', 'Anunciantes']].map(([v, l]) => (
                <div key={l}>
                  <strong style={{ fontFamily: D, fontSize: '22px', fontWeight: 700, color: 'var(--text)', display: 'block', lineHeight: 1.1, marginBottom: '4px' }}>{v}</strong>
                  <span style={{ fontSize: '12px', color: 'var(--muted2)' }}>{l}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <Link to="/marketplace" style={{
                background: A, color: '#fff',
                padding: '11px 22px', borderRadius: '8px',
                fontWeight: 600, fontSize: '14px',
                textDecoration: 'none', transition: 'background .2s, transform .15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = AD; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = A; e.currentTarget.style.transform = 'none' }}
              >
                Explorar canales
              </Link>
              <Link to="/auth/register" style={{
                color: 'var(--muted)', fontSize: '14px',
                textDecoration: 'none', transition: 'color .2s',
              }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
              >
                Empezar campaña →
              </Link>
            </div>
          </div>

          {/* RIGHT — WhatsApp card first */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '8px' }}>
            {[
              { icon: '🛒', platColor: '#25d366', platform: 'WhatsApp', name: 'Ecommerce Growth Hub', members: '12.4K', price: '€320/post', cls: 'animate-float',   offset: '0'   },
              { icon: '💻', platColor: '#2aabee', platform: 'Telegram',  name: 'Tech Audience ES',    members: '8.2K',  price: '€450/post', cls: 'animate-float-2', offset: '16px' },
              { icon: '🎮', platColor: '#5865f2', platform: 'Discord',   name: 'Gaming Community',    members: '4.5K',  price: '€280/post', cls: 'animate-float-3', offset: '0'   },
            ].map(card => (
              <div key={card.name} className={card.cls} style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px', padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: '12px',
                backdropFilter: 'blur(16px)',
                marginLeft: card.offset,
              }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '9px',
                  background: `${card.platColor}18`,
                  border: `1px solid ${card.platColor}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '17px', flexShrink: 0,
                }}>{card.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '3px' }}>{card.name}</p>
                  <p style={{ fontSize: '11px', color: 'var(--muted2)' }}>{card.platform} · {card.members}</p>
                </div>
                <span style={{ color: A, fontWeight: 700, fontSize: '12px', flexShrink: 0 }}>{card.price}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST BAR — marquee carousel ── */}
      <div style={{
        borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
        background: 'var(--bg2)', padding: '16px 0',
        overflow: 'hidden',
        maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
      }}>
        <div className="marquee-track">
          {[...TRUST_PLATFORMS, ...TRUST_PLATFORMS].map((p, i) => (
            <React.Fragment key={i}>
              <span style={{ fontSize: '13px', color: 'var(--muted)', whiteSpace: 'nowrap', padding: '0 28px', fontWeight: 500 }}>{p}</span>
              <span style={{ color: 'var(--muted2)', opacity: 0.3, flexShrink: 0 }}>·</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── CATEGORIES ── */}
      <section id="categories" className="fade-up" style={{ padding: '80px 48px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '36px' }}>
            <h2 style={H2}>Explorar por categoría</h2>
            <Link to="/marketplace" style={{ fontSize: '13px', color: A, fontWeight: 500, textDecoration: 'none' }}>Ver todas →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '10px' }}>
            {CATEGORIES.map((cat, i) => (
              <div key={cat.name}
                onClick={() => navigate(`/marketplace?category=${encodeURIComponent(cat.name)}`)}
                onMouseEnter={() => setHovCat(i)}
                onMouseLeave={() => setHovCat(null)}
                style={{
                  background: hovCat === i ? 'var(--surface2)' : 'var(--surface)',
                  border: `1px solid ${hovCat === i ? AG(0.28) : 'var(--border)'}`,
                  borderRadius: '12px', padding: '20px 16px',
                  cursor: 'pointer', textAlign: 'center',
                  transition: 'all .2s',
                  transform: hovCat === i ? 'translateY(-4px)' : 'none',
                  boxShadow: hovCat === i ? '0 12px 32px rgba(0,0,0,0.45)' : 'none',
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>{cat.icon}</div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px', lineHeight: 1.3 }}>{cat.name}</p>
                <p style={{ fontSize: '11px', color: A, fontWeight: 500 }}>{cat.count}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED LISTINGS — WhatsApp first ── */}
      <section id="listings" className="fade-up" style={{ padding: '80px 48px', background: 'var(--bg2)' }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '36px' }}>
            <h2 style={H2}>Canales destacados</h2>
            <Link to="/marketplace" style={{ fontSize: '13px', color: A, fontWeight: 500, textDecoration: 'none' }}>Ver todos →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {LISTINGS.map((l, i) => {
              const plat  = PLAT[l.platCls]
              const badge = l.badgeType ? BADGE[l.badgeType] : null
              const isHov = hovCard === i
              return (
                <div key={l.seller + i}
                  onMouseEnter={() => setHovCard(i)}
                  onMouseLeave={() => setHovCard(null)}
                  style={{
                    background: 'var(--surface)',
                    border: `1px solid ${isHov ? 'rgba(255,255,255,0.13)' : 'var(--border)'}`,
                    borderRadius: '14px', overflow: 'hidden', cursor: 'pointer',
                    transition: 'all .2s',
                    transform: isHov ? 'translateY(-4px)' : 'none',
                    boxShadow: isHov ? '0 20px 48px rgba(0,0,0,0.5)' : 'none',
                  }}
                >
                  {/* Thumbnail — neutral + platform stripe */}
                  <div style={{
                    height: '136px', position: 'relative',
                    background: 'var(--bg3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: plat.color }} />
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '12px',
                      background: plat.bg, border: `1px solid ${plat.color}25`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                    }}>
                      {['🛒','💪','💻','🎮','🤖','💡'][i]}
                    </div>
                    <div style={{
                      position: 'absolute', top: '10px', left: '16px',
                      background: plat.bg, color: plat.color,
                      borderRadius: '6px', padding: '3px 8px',
                      fontSize: '11px', fontWeight: 600,
                    }}>{plat.label}</div>
                    {badge && (
                      <div style={{
                        position: 'absolute', top: '10px', right: '10px',
                        background: badge.bg, color: badge.color,
                        border: `1px solid ${badge.border}`,
                        borderRadius: '6px', padding: '2px 8px',
                        fontSize: '10px', fontWeight: 700, letterSpacing: '0.03em',
                      }}>{l.badge}</div>
                    )}
                  </div>

                  {/* Body */}
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <div style={{
                        width: '26px', height: '26px', borderRadius: '50%',
                        background: `${l.color}20`, border: `1px solid ${l.color}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', fontWeight: 700, color: l.color, flexShrink: 0,
                      }}>{l.initials}</div>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>
                        {l.seller}
                        {l.isPro && <span style={{ fontSize: '10px', background: AG(0.12), color: A, borderRadius: '4px', padding: '1px 6px', fontWeight: 600, marginLeft: '5px' }}>PRO</span>}
                      </span>
                    </div>

                    <p style={{
                      fontSize: '13px', lineHeight: 1.5, color: 'var(--text)', marginBottom: '12px',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>{l.title}</p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: 'var(--muted)', marginBottom: '14px' }}>
                      <span style={{ color: '#f59e0b' }}>★ <span style={{ color: 'var(--text)', fontWeight: 600 }}>{l.rating}</span></span>
                      <span>({l.reviews})</span>
                      <span style={{ marginLeft: 'auto' }}>{l.members} seguidores</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                      <div>
                        <span style={{ fontFamily: D, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>{l.price}</span>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '2px' }}>{l.unit}</span>
                      </div>
                      <Link to="/auth/login" style={{
                        background: 'transparent', color: A,
                        border: `1px solid ${AG(0.3)}`,
                        borderRadius: '7px', padding: '6px 14px',
                        fontSize: '12px', fontWeight: 600,
                        textDecoration: 'none', transition: 'all .2s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = A; e.currentTarget.style.color = '#fff' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = A }}
                      >Ver canal</Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="fade-up" style={{ padding: '80px 48px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto' }}>
          <p style={{ ...Label, textAlign: 'center' }}>Proceso</p>
          <h2 style={{ ...H2, textAlign: 'center', marginBottom: '64px' }}>¿Cómo funciona?</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', position: 'relative' }}>
            {/* Connector line */}
            <div style={{
              position: 'absolute', top: '27px',
              left: '12.5%', right: '12.5%', height: '1px',
              background: `linear-gradient(to right, ${A}, rgba(255,255,255,0.05))`,
              zIndex: 0,
            }} />
            {STEPS.map((s, i) => (
              <div key={s.n} style={{ padding: '0 28px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <div style={{
                  width: '54px', height: '54px', borderRadius: '50%',
                  border: `1px solid ${i === 0 ? A : 'rgba(255,255,255,0.1)'}`,
                  background: i === 0 ? AG(0.12) : 'var(--surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 28px',
                }}>
                  <span style={{ fontFamily: D, fontSize: '14px', fontWeight: 700, color: i === 0 ? A : 'var(--muted2)' }}>{s.n}</span>
                </div>
                <h3 style={{ fontFamily: D, fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '10px' }}>{s.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.7, fontWeight: 300 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROMO BANNER ── */}
      <div className="fade-up" style={{ padding: '0 48px 80px', background: 'var(--bg2)' }}>
        <div style={{
          maxWidth: '1160px', margin: '0 auto',
          background: 'linear-gradient(135deg, #0d0718 0%, #110a20 100%)',
          border: `1px solid ${AG(0.18)}`,
          borderRadius: '18px', padding: '56px 60px',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: '40px', flexWrap: 'wrap',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-80px', right: '-80px',
            width: '320px', height: '320px', borderRadius: '50%',
            background: `radial-gradient(${AG(0.1)},transparent 70%)`,
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ ...Label, marginBottom: '10px' }}>Para propietarios de canales</p>
            <h2 style={{ ...H2, marginBottom: '10px' }}>Monetiza tu comunidad</h2>
            <p style={{ fontSize: '15px', color: 'var(--muted)', maxWidth: '400px', lineHeight: 1.65, fontWeight: 300 }}>
              Conecta con anunciantes verificados en WhatsApp, Telegram y Discord. Cobra de forma segura y mide el impacto real.
            </p>
          </div>
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', position: 'relative', zIndex: 1 }}>
            <Link to="/auth/register" style={{
              background: A, color: '#fff',
              padding: '12px 24px', borderRadius: '8px',
              fontWeight: 600, fontSize: '14px',
              textDecoration: 'none', whiteSpace: 'nowrap',
              transition: 'background .2s, transform .15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = AD; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = A; e.currentTarget.style.transform = 'none' }}
            >Vender espacios →</Link>
            <p style={{ fontSize: '12px', color: 'var(--muted2)' }}>Sin exclusividad · Comisión solo al cobrar</p>
          </div>
        </div>
      </div>

      {/* ── TOP SELLERS — WhatsApp first ── */}
      <section className="fade-up" style={{ padding: '80px 48px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '36px' }}>
            <h2 style={H2}>Canales mejor valorados</h2>
            <Link to="/marketplace" style={{ fontSize: '13px', color: A, fontWeight: 500, textDecoration: 'none' }}>Ver todos →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
            {SELLERS.map((s, i) => {
              const isHov = hovSeller === i
              const b = BADGE[s.badgeType]
              return (
                <div key={s.name}
                  onClick={() => navigate(`/marketplace?platform=${encodeURIComponent(s.niche.split(' · ')[1])}`)}
                  onMouseEnter={() => setHovSeller(i)}
                  onMouseLeave={() => setHovSeller(null)}
                  style={{
                    background: 'var(--surface)',
                    border: `1px solid ${isHov ? 'rgba(255,255,255,0.12)' : 'var(--border)'}`,
                    borderRadius: '14px', padding: '22px 18px', textAlign: 'center',
                    cursor: 'pointer', transition: 'all .2s',
                    transform: isHov ? 'translateY(-3px)' : 'none',
                    boxShadow: isHov ? '0 12px 32px rgba(0,0,0,0.4)' : 'none',
                  }}
                >
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '50%',
                    margin: '0 auto 14px',
                    background: 'var(--bg3)',
                    border: `2px solid ${s.color}35`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '15px', fontWeight: 700, color: s.color, fontFamily: D,
                  }}>{s.initials}</div>
                  <p style={{ fontFamily: D, fontSize: '14px', fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>{s.name}</p>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '10px' }}>{s.niche}</p>
                  <div style={{ color: '#f59e0b', fontSize: '12px', marginBottom: '4px' }}>
                    ★ <span style={{ color: 'var(--text)', fontWeight: 600 }}>{s.rating}</span>
                    <span style={{ color: 'var(--muted)', marginLeft: '4px' }}>({s.reviews})</span>
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: A, marginBottom: '12px' }}>{s.price}</p>
                  <span style={{
                    display: 'inline-block',
                    background: b.bg, color: b.color,
                    border: `1px solid ${b.border}`,
                    borderRadius: '99px', padding: '3px 10px',
                    fontSize: '11px', fontWeight: 600,
                  }}>{s.badge}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', padding: '60px 48px 32px' }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: '48px', marginBottom: '48px' }}>
            <div>
              <span style={{ fontFamily: D, fontWeight: 700, fontSize: '20px', display: 'block', marginBottom: '12px', color: 'var(--text)' }}>
                Ad<span style={{ color: A }}>flow</span>
              </span>
              <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.7, maxWidth: '240px', fontWeight: 300 }}>
                El marketplace de publicidad en canales privados de WhatsApp, Telegram y Discord más avanzado de Europa.
              </p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                {[['T','Telegram'],['X','X / Twitter'],['IG','Instagram'],['YT','YouTube']].map(([label, title]) => (
                  <a key={label} href="#" title={title} style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 700, color: 'var(--muted)',
                    textDecoration: 'none', transition: 'border-color .2s, color .2s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'var(--text)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}
                  >{label}</a>
                ))}
              </div>
            </div>
            {[
              { title: 'Plataformas', key: 'platform', links: ['WhatsApp', 'Telegram', 'Discord', 'YouTube', 'TikTok'] },
              { title: 'Categorías',  key: 'category', links: ['Ecommerce', 'Fitness', 'Gaming', 'Educación', 'IA & Tech'] },
              { title: 'Empresa',     key: null,        links: ['Sobre nosotros', 'Blog', 'Afiliados', 'Soporte', 'Privacidad'] },
            ].map(col => (
              <div key={col.title}>
                <h4 style={{ fontFamily: F, fontSize: '11px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: '16px' }}>{col.title}</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {col.links.map(link => (
                    <li key={link}>
                      {col.key ? (
                        <Link to={`/marketplace?${col.key}=${encodeURIComponent(link)}`} style={{ fontSize: '13px', color: 'var(--muted)', textDecoration: 'none', transition: 'color .15s' }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                        >{link}</Link>
                      ) : (
                        <a href="#" style={{ fontSize: '13px', color: 'var(--muted)', textDecoration: 'none', transition: 'color .15s' }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                        >{link}</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{
            paddingTop: '24px', borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: '12px', color: 'var(--muted2)', flexWrap: 'wrap', gap: '12px',
          }}>
            <span>© 2026 Adflow. Todos los derechos reservados.</span>
            <div style={{ display: 'flex', gap: '24px' }}>
              {['Privacidad','Términos','Cookies'].map(l => (
                <a key={l} href="#" style={{ color: 'var(--muted2)', textDecoration: 'none', transition: 'color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--muted)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--muted2)'}
                >{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
