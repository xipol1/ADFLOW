import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import SEO from '../../components/SEO'
import { PURPLE, purpleAlpha, PLATFORM_BRAND } from '../../theme/tokens'
import { getPublishedPosts } from './blogPosts'

const SERIF = "'Instrument Serif', Georgia, serif"
const SANS = "'DM Sans', system-ui, sans-serif"

const CATEGORY_COLORS = {
  'Guias': { color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
  'Monetizacion': { color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
  'Comparativas': { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
}

const ALL_CATEGORIES = ['Todos', ...Object.keys(CATEGORY_COLORS)]

function GrainOverlay() {
  return (
    <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999, opacity: 0.028 }}>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" /></filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  )
}

export default function BlogIndex() {
  const [activeCategory, setActiveCategory] = useState('Todos')
  const publishedPosts = useMemo(() => getPublishedPosts(), [])

  const filtered = useMemo(() => {
    if (activeCategory === 'Todos') return publishedPosts
    return publishedPosts.filter(p => p.category === activeCategory)
  }, [activeCategory, publishedPosts])

  const featured = publishedPosts[0]
  const rest = filtered.filter(p => p.slug !== featured?.slug)

  const totalMinutes = publishedPosts.reduce((s, p) => s + parseInt(p.readTime), 0)
  const latestDate = publishedPosts.reduce((max, p) => p.date > max ? p.date : max, '2000-01-01')
  const featuredCat = CATEGORY_COLORS[featured.category] || { color: PURPLE, bg: purpleAlpha(0.08) }
  const featuredPlatformColor = PLATFORM_BRAND[featured.platform]?.color || PURPLE

  return (
    <div style={{ fontFamily: SANS, color: 'var(--text)', background: 'var(--bg)', minHeight: '100vh' }}>
      <GrainOverlay />

      <SEO
        title="Blog — Channelad"
        description="Guias, estrategias y comparativas sobre publicidad en comunidades de WhatsApp, Telegram y Discord."
        path="/blog"
      />

      {/* Custom scrollbar */}
      <Helmet>
        <style>{`
          ::-webkit-scrollbar { width: 5px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; transition: background 0.2s; }
          ::-webkit-scrollbar-thumb:hover { background: ${PURPLE}; }
          * { scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
        `}</style>
      </Helmet>

      {/* ─── HERO ─── */}
      <section style={{
        position: 'relative',
        padding: '120px 24px 48px',
        textAlign: 'center',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: `radial-gradient(ellipse 80% 50% at 50% -20%, ${purpleAlpha(0.06)} 0%, transparent 70%)`,
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '680px', margin: '0 auto' }}>
          <Link to="/" style={{
            fontSize: '13px', color: PURPLE, textDecoration: 'none', fontWeight: 500,
            display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '32px',
            fontFamily: SANS,
          }}>
            ← Volver al inicio
          </Link>

          <h1 style={{
            fontFamily: SERIF, fontSize: 'clamp(48px, 8vw, 80px)', fontWeight: 400,
            fontStyle: 'italic', letterSpacing: '-0.02em', lineHeight: 1.05,
            marginBottom: '20px',
          }}>
            Blog
          </h1>
          <p style={{
            fontFamily: SANS, fontSize: '17px', color: 'var(--muted)', lineHeight: 1.7,
            maxWidth: '480px', margin: '0 auto', fontWeight: 400,
          }}>
            Guias practicas, numeros reales y estrategias para posicionar marcas en comunidades de Discord, Telegram y WhatsApp.
          </p>
        </div>
      </section>

      {/* ─── STATS STRIP ─── */}
      <section style={{
        maxWidth: '800px', margin: '0 auto 40px',
        padding: '0 24px',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
        }}>
          {[
            { value: BLOG_POSTS.length, label: 'Articulos publicados' },
            { value: `${totalMinutes} min`, label: 'Tiempo total de lectura' },
            { value: new Date(latestDate).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }), label: 'Ultima actualizacion' },
          ].map((stat, i) => (
            <div key={i} style={{
              padding: '20px 16px', textAlign: 'center',
              borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ fontFamily: SERIF, fontSize: '24px', fontWeight: 400, marginBottom: '4px' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 500 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURED ARTICLE ─── */}
      <section style={{
        maxWidth: '960px', margin: '0 auto 48px',
        padding: '0 24px',
      }}>
        <Link
          to={`/blog/${featured.slug}`}
          style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
        >
          <div style={{
            position: 'relative',
            padding: '48px 40px',
            borderRadius: '20px',
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            transition: 'border-color 0.3s cubic-bezier(.22,1,.36,1)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = PURPLE + '40' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '' }}
          >
            {/* Ghost text */}
            <div style={{
              position: 'absolute', top: '-12px', left: '24px',
              fontFamily: SERIF, fontStyle: 'italic', fontSize: 'clamp(80px, 12vw, 140px)',
              fontWeight: 400, color: 'var(--text)', opacity: 0.025,
              lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
              letterSpacing: '-0.02em',
            }}>
              DESTACADO
            </div>

            {/* Top accent line */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
              background: `linear-gradient(90deg, ${featuredPlatformColor}, ${featuredPlatformColor}66)`,
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px',
                  color: featuredCat.color, background: featuredCat.bg,
                  padding: '4px 10px', borderRadius: '6px',
                }}>
                  {featured.category}
                </span>
                <span style={{
                  fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px',
                  color: featuredPlatformColor, background: `${featuredPlatformColor}12`,
                  padding: '4px 10px', borderRadius: '6px',
                }}>
                  {PLATFORM_BRAND[featured.platform]?.label || featured.platform}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  {featured.readTime}
                </span>
              </div>

              <h2 style={{
                fontFamily: SERIF, fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 400,
                lineHeight: 1.2, letterSpacing: '-0.02em',
                marginBottom: '14px',
              }}>
                {featured.title}
              </h2>

              <p style={{
                fontSize: '16px', color: 'var(--muted)', lineHeight: 1.65,
                maxWidth: '600px', marginBottom: '20px',
              }}>
                {featured.description}
              </p>

              <span style={{
                fontSize: '13px', fontWeight: 600, color: PURPLE,
                display: 'inline-flex', alignItems: 'center', gap: '6px',
              }}>
                Leer articulo
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 7h12M8 2l5 5-5 5" />
                </svg>
              </span>
            </div>
          </div>
        </Link>
      </section>

      {/* ─── CATEGORY FILTERS ─── */}
      <section style={{
        maxWidth: '960px', margin: '0 auto 32px',
        padding: '0 24px',
        display: 'flex', gap: '8px', flexWrap: 'wrap',
      }}>
        {ALL_CATEGORIES.map(cat => {
          const isActive = activeCategory === cat
          const catMeta = CATEGORY_COLORS[cat]
          const pillColor = isActive
            ? (catMeta ? catMeta.color : PURPLE)
            : 'var(--muted)'
          const pillBg = isActive
            ? (catMeta ? catMeta.bg : purpleAlpha(0.08))
            : 'transparent'

          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                fontFamily: SANS, fontSize: '12px', fontWeight: 600,
                padding: '7px 16px', borderRadius: '100px',
                border: isActive ? 'none' : '1px solid var(--border)',
                background: pillBg, color: pillColor,
                cursor: 'pointer', transition: 'all 0.2s',
                letterSpacing: '0.3px',
              }}
            >
              {cat}
            </button>
          )
        })}
      </section>

      {/* ─── POSTS GRID ─── */}
      <section style={{
        maxWidth: '960px', margin: '0 auto',
        padding: '0 24px 120px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
        gap: '20px',
      }}>
        {rest.map(post => {
          const platformColor = PLATFORM_BRAND[post.platform]?.color || PURPLE
          const catMeta = CATEGORY_COLORS[post.category] || { color: PURPLE, bg: purpleAlpha(0.08) }

          return (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              style={{
                textDecoration: 'none', color: 'inherit',
                borderRadius: '16px', display: 'flex', flexDirection: 'column',
                background: 'var(--bg2)', border: '1px solid var(--border)',
                overflow: 'hidden',
                transition: 'transform 0.3s cubic-bezier(.22,1,.36,1), border-color 0.3s cubic-bezier(.22,1,.36,1), box-shadow 0.3s cubic-bezier(.22,1,.36,1)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.borderColor = PURPLE + '30'
                e.currentTarget.style.boxShadow = `0 8px 32px ${purpleAlpha(0.08)}`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = ''
                e.currentTarget.style.borderColor = ''
                e.currentTarget.style.boxShadow = ''
              }}
            >
              {/* Color accent */}
              <div style={{
                height: '3px',
                background: `linear-gradient(90deg, ${platformColor}, ${platformColor}66)`,
              }} />

              <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                {/* Tags */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px',
                    color: catMeta.color, background: catMeta.bg,
                    padding: '3px 8px', borderRadius: '5px',
                  }}>
                    {post.category}
                  </span>
                  {post.lang === 'en' && (
                    <span style={{
                      fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px',
                      color: 'var(--muted)', background: 'var(--bg)', padding: '3px 8px', borderRadius: '5px',
                    }}>EN</span>
                  )}
                </div>

                {/* Title */}
                <h2 style={{
                  fontFamily: SERIF, fontSize: '20px', fontWeight: 400,
                  lineHeight: 1.3, letterSpacing: '-0.01em', margin: 0,
                }}>
                  {post.title}
                </h2>

                {/* Description */}
                <p style={{
                  fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6,
                  margin: 0, flex: 1,
                }}>
                  {post.description}
                </p>

                {/* Footer */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  paddingTop: '14px', borderTop: '1px solid var(--border)',
                  fontSize: '12px', color: 'var(--muted)',
                }}>
                  <span>{post.readTime}</span>
                  <span>{new Date(post.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            </Link>
          )
        })}
      </section>
    </div>
  )
}
