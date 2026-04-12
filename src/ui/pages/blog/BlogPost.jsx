import React, { Suspense, useState, useEffect } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import SEO from '../../components/SEO'
import CrossLinks from '../../components/landing/CrossLinks'
import { PURPLE, purpleAlpha, PLATFORM_BRAND } from '../../theme/tokens'
import { getPostBySlug, getPublishedPosts } from './blogPosts'

const SERIF = "'Instrument Serif', Georgia, serif"
const SANS = "'DM Sans', system-ui, sans-serif"

/* ─── Grain Overlay ─── */
function GrainOverlay() {
  return (
    <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999, opacity: 0.028 }}>
      <filter id="grain-post"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" /></filter>
      <rect width="100%" height="100%" filter="url(#grain-post)" />
    </svg>
  )
}

/* ─── Reading Progress Bar ─── */
function ReadingProgress() {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const update = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight
      if (h > 0) setProgress(Math.min((window.scrollY / h) * 100, 100))
    }
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, zIndex: 1000, width: `${progress}%`, height: '3px', background: `linear-gradient(90deg, ${PURPLE}, #a78bfa)`, transition: 'width 0.08s linear' }} />
  )
}

/* ─── Back to Top ─── */
function BackToTop() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const update = () => setVisible(window.scrollY > 600)
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
  if (!visible) return null
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      style={{
        position: 'fixed', bottom: 32, right: 32, width: 40, height: 40,
        borderRadius: '50%', background: 'var(--surface, #fff)', border: '1px solid var(--border)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', zIndex: 100, color: 'var(--muted)', transition: 'all 0.3s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = PURPLE; e.currentTarget.style.color = PURPLE }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.color = '' }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6" /></svg>
    </button>
  )
}

/* ─── Share Bar ─── */
function ShareBar({ post }) {
  const [copied, setCopied] = useState(false)
  const url = `https://channelad.io/blog/${post.slug}`
  const copyLink = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  const btnStyle = {
    width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border)',
    background: 'var(--surface, #fff)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'all 0.2s', color: 'var(--muted)', textDecoration: 'none',
  }
  return (
    <>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 32px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, fontFamily: SANS }}>Compartir</span>
        <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(post.title)}`} target="_blank" rel="noopener noreferrer" style={btnStyle} title="Compartir en X"
          onMouseEnter={e => { e.currentTarget.style.borderColor = PURPLE; e.currentTarget.style.color = PURPLE }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.color = '' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
        </a>
        <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" style={btnStyle} title="Compartir en LinkedIn"
          onMouseEnter={e => { e.currentTarget.style.borderColor = PURPLE; e.currentTarget.style.color = PURPLE }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.color = '' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
        </a>
        <button onClick={copyLink} style={{ ...btnStyle, border: '1px solid var(--border)' }} title="Copiar enlace"
          onMouseEnter={e => { e.currentTarget.style.borderColor = PURPLE; e.currentTarget.style.color = PURPLE }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.color = '' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
        </button>
      </div>
      {copied && (
        <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', background: 'var(--text)', color: 'var(--bg)', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500, zIndex: 1001, fontFamily: SANS }}>
          Enlace copiado
        </div>
      )}
    </>
  )
}

/* ─── Author Box ─── */
function AuthorBox() {
  return (
    <div style={{ maxWidth: 720, margin: '48px auto 0', padding: '32px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg, ${PURPLE}, #a78bfa)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 20, flexShrink: 0 }}>RF</div>
      <div>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, fontFamily: SANS }}>Rafa Ferrer</h4>
        <p style={{ fontSize: 11, color: PURPLE, fontWeight: 600, marginBottom: 4, fontFamily: SANS, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CEO, Channelad</p>
        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 8, fontFamily: SANS }}>
          Escribo sobre publicidad en comunidades, monetizacion de canales y estrategias de marketing en WhatsApp, Telegram y Discord.
        </p>
        <Link to="/blog" style={{ fontSize: 12, fontWeight: 600, color: PURPLE, textDecoration: 'none', fontFamily: SANS }}>Ver todos los articulos →</Link>
      </div>
    </div>
  )
}

/* ─── Related Posts ─── */
function RelatedPosts({ currentSlug }) {
  const others = getPublishedPosts().filter(p => p.slug !== currentSlug).slice(0, 3)
  if (others.length === 0) return null
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
      <h2 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 400, marginBottom: 28 }}>Tambien te puede interesar</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
        {others.map(p => (
          <Link key={p.slug} to={`/blog/${p.slug}`} style={{
            textDecoration: 'none', color: 'inherit', borderRadius: 12,
            background: 'var(--bg2)', border: '1px solid var(--border)',
            padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 12,
            transition: 'transform 0.3s cubic-bezier(.22,1,.36,1), border-color 0.3s, box-shadow 0.3s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = PURPLE + '30'; e.currentTarget.style.boxShadow = `0 8px 24px ${purpleAlpha(0.06)}` }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = '' }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: PURPLE, fontFamily: SANS }}>{p.category}</span>
            <span style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 400, lineHeight: 1.3 }}>{p.title}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)', marginTop: 'auto', fontFamily: SANS }}>{p.readTime} · {p.date}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

/* ─── Prev/Next Navigation ─── */
function PrevNextNav({ currentSlug }) {
  const idx = getPublishedPosts().findIndex(p => p.slug === currentSlug)
  const prev = idx > 0 ? getPublishedPosts()[idx - 1] : null
  const next = idx < getPublishedPosts().length - 1 ? getPublishedPosts()[idx + 1] : null
  if (!prev && !next) return null
  return (
    <nav style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      {prev ? (
        <Link to={`/blog/${prev.slug}`} style={{ textDecoration: 'none', color: 'inherit', padding: 16, borderRadius: 12, transition: 'background 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background = purpleAlpha(0.03)}
          onMouseLeave={e => e.currentTarget.style.background = ''}>
          <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, display: 'block', marginBottom: 8, fontFamily: SANS }}>← Anterior</span>
          <span style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 400, lineHeight: 1.35 }}>{prev.title}</span>
        </Link>
      ) : <div />}
      {next ? (
        <Link to={`/blog/${next.slug}`} style={{ textDecoration: 'none', color: 'inherit', padding: 16, borderRadius: 12, textAlign: 'right', transition: 'background 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background = purpleAlpha(0.03)}
          onMouseLeave={e => e.currentTarget.style.background = ''}>
          <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, display: 'block', marginBottom: 8, fontFamily: SANS }}>Siguiente →</span>
          <span style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 400, lineHeight: 1.35 }}>{next.title}</span>
        </Link>
      ) : <div />}
    </nav>
  )
}

/* ─── Table of Contents with Scrollspy ─── */
function TableOfContents() {
  const [headings, setHeadings] = useState([])
  const [activeId, setActiveId] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      const article = document.querySelector('[data-blog-content]')
      if (!article) return
      const els = article.querySelectorAll('h2, h3')
      const items = Array.from(els).map((el, i) => {
        if (!el.id) el.id = `heading-${i}`
        return { id: el.id, text: el.textContent, level: el.tagName === 'H3' ? 3 : 2 }
      })
      setHeadings(items)
    }, 600)
    return () => clearTimeout(timer)
  }, [])
  useEffect(() => {
    if (headings.length === 0) return
    const observer = new IntersectionObserver(
      entries => { const v = entries.filter(e => e.isIntersecting); if (v.length > 0) setActiveId(v[0].target.id) },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
    )
    headings.forEach(h => { const el = document.getElementById(h.id); if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [headings])
  if (headings.length < 3) return null
  return (
    <nav style={{ position: 'sticky', top: 100, maxHeight: 'calc(100vh - 140px)', overflowY: 'auto', paddingRight: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 16, fontFamily: SANS }}>Contenido</div>
      {headings.map(h => {
        const isActive = activeId === h.id
        return (
          <a key={h.id} href={`#${h.id}`} onClick={e => { e.preventDefault(); document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
            style={{ display: 'block', padding: `6px 0 6px ${h.level === 3 ? '14px' : '12px'}`, fontSize: 13, lineHeight: 1.4, color: isActive ? PURPLE : 'var(--muted)', fontWeight: isActive ? 600 : 400, textDecoration: 'none', borderLeft: `2px solid ${isActive ? PURPLE : 'transparent'}`, transition: 'all 0.2s', fontFamily: SANS }}>
            {h.text}
          </a>
        )
      })}
    </nav>
  )
}

export default function BlogPost() {
  const { slug } = useParams()
  const post = getPostBySlug(slug)

  if (!post) return <Navigate to="/blog" replace />

  const platformColor = PLATFORM_BRAND[post.platform]?.color || PURPLE
  const platformLabel = PLATFORM_BRAND[post.platform]?.label || post.platform
  const ArticleContent = post.component

  return (
    <article style={{ fontFamily: SANS, color: 'var(--text)', background: 'var(--bg)', minHeight: '100vh' }}>
      <GrainOverlay />
      <ReadingProgress />
      <BackToTop />

      <SEO
        title={post.title} description={post.description} path={`/blog/${post.slug}`}
        type="article" date={post.date} dateModified={post.dateModified || post.date}
        lang={post.lang}
      />

      <Helmet>
        <link rel="alternate" type="application/rss+xml" title="Channelad Blog" href="https://channelad.io/blog/feed.xml" />
        {/* Schema (Article, FAQPage, BreadcrumbList) is already in the static HTML built by build-blog.js — do NOT duplicate here */}
      </Helmet>

      {/* ─── HEADER ─── */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px 0' }}>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 32, flexWrap: 'wrap', fontFamily: SANS }}>
          <Link to="/" style={{ color: PURPLE, textDecoration: 'none', fontWeight: 500 }}>Inicio</Link>
          <span style={{ color: 'var(--border-heavy)', fontSize: 10 }}>›</span>
          <Link to="/blog" style={{ color: PURPLE, textDecoration: 'none', fontWeight: 500 }}>Blog</Link>
          <span style={{ color: 'var(--border-heavy)', fontSize: 10 }}>›</span>
          <span style={{ color: 'var(--muted)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</span>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: platformColor, background: `${platformColor}15`, padding: '5px 12px', borderRadius: 6 }}>{platformLabel}</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{post.readTime}</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>·</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(post.date).toLocaleDateString(post.lang === 'en' ? 'en-US' : 'es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>

        <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 400, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 16 }}>{post.title}</h1>
        <p style={{ fontSize: 18, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 32, maxWidth: 600, fontFamily: SANS }}>{post.description}</p>
      </div>

      {/* ─── SHARE BAR ─── */}
      <ShareBar post={post} />

      {/* ─── CONTENT AREA with TOC sidebar ─── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 220px', gap: 48, padding: '32px 24px 0' }} className="blog-layout-grid">
        <style>{`.blog-layout-grid { grid-template-columns: 1fr 220px !important; } @media (max-width: 900px) { .blog-layout-grid { grid-template-columns: 1fr !important; } .blog-toc-sidebar { display: none !important; } }`}</style>
        <div className="blog-content-area" data-blog-content style={{ maxWidth: 720, minWidth: 0 }}>
          {ArticleContent ? (
            <Suspense fallback={
              <div style={{ minHeight: 400, padding: '20px 0' }}>
                {[80, 100, 95, 88, 72].map((w, i) => (
                  <div key={i} style={{ height: i === 0 ? 24 : 16, background: 'var(--bg2)', borderRadius: 6, marginBottom: i === 0 ? 20 : 12, width: `${w}%` }} />
                ))}
              </div>
            }>
              <ArticleContent />
            </Suspense>
          ) : null}
        </div>
        <aside className="blog-toc-sidebar" style={{ minWidth: 0 }}>
          <TableOfContents />
        </aside>
      </div>

      {/* ─── AUTHOR BOX ─── */}
      <AuthorBox />

      {/* ─── KEYWORD TAGS ─── */}
      {post.keywords?.length > 0 && (
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 24px 0' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: 10, fontFamily: SANS }}>Temas</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {post.keywords.map(k => (
              <span key={k} style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--bg2)', padding: '4px 12px', borderRadius: 100, border: '1px solid var(--border)', fontFamily: SANS }}>{k}</span>
            ))}
          </div>
        </div>
      )}

      {/* ─── PREV/NEXT NAV ─── */}
      <PrevNextNav currentSlug={post.slug} />

      {/* ─── RELATED POSTS ─── */}
      <RelatedPosts currentSlug={post.slug} />

      {/* ─── CTA ─── */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 48px' }}>
        <div style={{ padding: '40px 36px', borderRadius: 20, textAlign: 'center', background: `linear-gradient(135deg, ${purpleAlpha(0.05)} 0%, ${purpleAlpha(0.02)} 100%)`, border: `1px solid ${purpleAlpha(0.1)}` }}>
          <h3 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 400, marginBottom: 12 }}>
            {post.lang === 'en' ? 'Ready to advertise in communities?' : '¿Listo para anunciarte en comunidades?'}
          </h3>
          <p style={{ fontSize: 15, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.65, fontFamily: SANS }}>
            {post.lang === 'en' ? 'Channelad connects you with verified channels on WhatsApp, Telegram and Discord.' : 'Channelad conecta tu marca con canales verificados de WhatsApp, Telegram y Discord.'}
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/para-anunciantes" style={{ display: 'inline-block', background: PURPLE, color: '#fff', padding: '12px 28px', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none', fontFamily: SANS }}>{post.lang === 'en' ? 'For advertisers' : 'Para anunciantes'}</Link>
            <Link to="/para-canales" style={{ display: 'inline-block', color: '#25d366', padding: '12px 28px', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none', border: '1.5px solid #25d366', fontFamily: SANS }}>{post.lang === 'en' ? 'For creators' : 'Para canales'}</Link>
          </div>
        </div>
      </div>

      <CrossLinks exclude="/blog" />
    </article>
  )
}
