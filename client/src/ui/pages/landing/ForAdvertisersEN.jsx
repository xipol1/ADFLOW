import React from 'react'
import { Link } from 'react-router-dom'
import SEO from '../../components/SEO'
import { PURPLE, FONT_BODY, FONT_DISPLAY, MAX_W } from '../../theme/tokens'

// Lean, self-contained EN landing for advertisers (the EN counterpart of
// /para-anunciantes). Standalone (own minimal EN header/footer) so English
// visitors don't see the Spanish global nav. hreflang pair via SEO `alternates`.
const SITE = 'https://channelad.io'
const ALTERNATES = [
  { hreflang: 'es', href: `${SITE}/para-anunciantes` },
  { hreflang: 'en', href: `${SITE}/en/for-advertisers` },
  { hreflang: 'x-default', href: `${SITE}/para-anunciantes` },
]

const INK = '#0B1220'
const MUTED = '#5b6472'
const BORDER = 'rgba(11,18,32,0.08)'

const STEPS = [
  { n: '1', t: 'Browse verified channels', d: 'Filter real WhatsApp, Telegram and Discord communities by niche, audience size and CPM. Every channel is verified via official API — no inflated follower counts.' },
  { n: '2', t: 'Launch a campaign', d: 'Set your budget and brief, pick the channels that fit, and send proposals. You approve the exact post before it goes live.' },
  { n: '3', t: 'Pay into escrow', d: 'Your budget is held in escrow. The creator is paid only after the post is verified live — no upfront risk, no prepaying strangers.' },
  { n: '4', t: 'Verified delivery + one invoice', d: 'Channelad verifies the post and its metrics, releases payment, and issues you a single invoice. No chasing, no fake reach.' },
]

const VALUES = [
  { t: 'Verified audiences', d: 'Metrics pulled from official APIs, not screenshots. You pay for real reach, not inflated follower counts.' },
  { t: 'Escrow on every campaign', d: 'Funds release only after the post is verified live. If it does not run as agreed, you do not pay.' },
  { t: 'CPM benchmarks before you pay', d: 'See what each niche and platform actually costs, so you never overpay for a sponsored post.' },
  { t: 'One invoice, clean compliance', d: 'Channelad issues the invoice and handles the paperwork. Treat community ads like any other media buy.' },
]

// Niche · CPM (per 1k reads) · typical post for ~10k reach.
const CPMS = [
  ['Finance & investing', '€8 – 15', '€80 – 150'],
  ['Tech', '€5 – 10', '€50 – 100'],
  ['Marketing', '€4 – 8', '€40 – 80'],
  ['News & general', '€1.5 – 3', '€15 – 30'],
]

const GUIDES = [
  { href: '/blog/best-whatsapp-advertising-platforms', t: 'Best WhatsApp advertising platforms' },
  { href: '/blog/channelad-vs-meta-ads', t: 'Channelad vs Meta Ads' },
  { href: '/blog/channelad-vs-influencer-marketplaces', t: 'Channelad vs influencer marketplaces' },
]

const btnPrimary = {
  display: 'inline-block', background: PURPLE, color: '#fff', fontWeight: 700,
  fontFamily: FONT_BODY, fontSize: 16, padding: '14px 26px', borderRadius: 12,
  textDecoration: 'none', border: 'none',
}

export default function ForAdvertisersEN() {
  return (
    <div style={{ background: '#fff', color: INK, fontFamily: FONT_BODY, minHeight: '100vh' }}>
      <SEO
        title="Advertise in WhatsApp, Telegram & Discord communities"
        description="Buy ads in verified WhatsApp, Telegram and Discord channels. Real audiences, CPM benchmarks before you pay, and escrow on every campaign — you pay only for verified delivery."
        path="/en/for-advertisers"
        lang="en"
        alternates={ALTERNATES}
      />

      {/* ── Minimal EN header ── */}
      <header style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/en/for-advertisers" style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 19, color: INK, textDecoration: 'none' }}>
            Channel<span style={{ color: PURPLE }}>ad</span>
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 14 }}>
            <Link to="/blog/best-whatsapp-advertising-platforms" style={{ color: MUTED, textDecoration: 'none' }}>Guides</Link>
            <a href="/para-anunciantes" style={{ color: MUTED, textDecoration: 'none' }} hrefLang="es">ES</a>
            <Link to="/marketplace" style={{ ...btnPrimary, padding: '9px 18px', fontSize: 14 }}>Browse channels</Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ maxWidth: MAX_W, margin: '0 auto', padding: '72px 24px 56px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', fontSize: 13, fontWeight: 600, color: PURPLE, background: 'rgba(124,58,237,0.1)', padding: '6px 14px', borderRadius: 100, marginBottom: 22 }}>
          Verified channels · Escrow on every campaign
        </div>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 'clamp(34px, 5.5vw, 58px)', lineHeight: 1.08, letterSpacing: '-0.02em', margin: '0 auto 20px', maxWidth: 860 }}>
          Advertise in private WhatsApp, Telegram &amp; Discord communities
        </h1>
        <p style={{ fontSize: 19, lineHeight: 1.6, color: MUTED, maxWidth: 640, margin: '0 auto 32px' }}>
          Reach engaged, verified audiences with metrics you can trust — and pay only for delivery that is <strong style={{ color: INK }}>verified live</strong>, protected by escrow on every campaign.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/marketplace" style={btnPrimary}>Browse channels</Link>
          <a href="#how" style={{ ...btnPrimary, background: 'transparent', color: INK, border: `1px solid ${BORDER}`, fontWeight: 600 }}>How it works</a>
        </div>
        <p style={{ fontSize: 13, color: MUTED, marginTop: 18 }}>Verified metrics · Pay in escrow · One invoice</p>
      </section>

      {/* ── How it works ── */}
      <section id="how" style={{ background: '#f7f8fa', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto', padding: '64px 24px' }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 'clamp(26px,3.5vw,38px)', textAlign: 'center', marginBottom: 40 }}>How it works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 20 }}>
            {STEPS.map((s) => (
              <div key={s.n} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: '24px 22px' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: PURPLE, color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>{s.n}</div>
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{s.t}</h3>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: MUTED }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Channelad ── */}
      <section style={{ maxWidth: MAX_W, margin: '0 auto', padding: '64px 24px' }}>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 'clamp(26px,3.5vw,38px)', textAlign: 'center', marginBottom: 40 }}>Why advertisers choose Channelad</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {VALUES.map((v) => (
            <div key={v.t} style={{ borderLeft: `3px solid ${PURPLE}`, padding: '6px 0 6px 18px' }}>
              <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{v.t}</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: MUTED }}>{v.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CPM benchmarks ── */}
      <section style={{ background: '#f7f8fa', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '64px 24px' }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 'clamp(24px,3.2vw,34px)', textAlign: 'center', marginBottom: 10 }}>What a campaign costs</h2>
          <p style={{ textAlign: 'center', color: MUTED, fontSize: 15, marginBottom: 30 }}>Typical CPM ranges by niche — see the real number per channel before you commit.</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15, background: '#fff', borderRadius: 12, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
              <thead>
                <tr style={{ background: '#fff', textAlign: 'left' }}>
                  <th style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, fontWeight: 700 }}>Niche</th>
                  <th style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, fontWeight: 700 }}>CPM (per 1k)</th>
                  <th style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, fontWeight: 700 }}>Post at ~10k reach</th>
                </tr>
              </thead>
              <tbody>
                {CPMS.map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding: '13px 18px', borderBottom: i < CPMS.length - 1 ? `1px solid ${BORDER}` : 'none' }}>{row[0]}</td>
                    <td style={{ padding: '13px 18px', borderBottom: i < CPMS.length - 1 ? `1px solid ${BORDER}` : 'none', color: MUTED }}>{row[1]}</td>
                    <td style={{ padding: '13px 18px', borderBottom: i < CPMS.length - 1 ? `1px solid ${BORDER}` : 'none', fontWeight: 700, color: PURPLE }}>{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 13, color: MUTED, marginTop: 14, textAlign: 'center' }}>Messaging-app audiences open posts at 55–80% — far above email or social feeds.</p>
        </div>
      </section>

      {/* ── Guides / internal links ── */}
      <section style={{ maxWidth: MAX_W, margin: '0 auto', padding: '56px 24px' }}>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 22, marginBottom: 22 }}>Guides for advertisers</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
          {GUIDES.map((p) => (
            <Link key={p.href} to={p.href} style={{ display: 'block', border: `1px solid ${BORDER}`, borderRadius: 14, padding: '20px 22px', textDecoration: 'none', color: INK }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16 }}>{p.t}</span>
              <span style={{ display: 'block', color: PURPLE, fontSize: 14, fontWeight: 600, marginTop: 10 }}>Read guide →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── CTA band ── */}
      <section style={{ background: INK, color: '#fff' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 'clamp(26px,3.5vw,40px)', marginBottom: 14 }}>Launch your first campaign</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 17, maxWidth: 560, margin: '0 auto 28px' }}>Browse verified channels by niche and CPM, send a proposal, and pay only when the post is verified live.</p>
          <Link to="/marketplace" style={btnPrimary}>Browse channels</Link>
        </div>
      </section>

      {/* ── Minimal footer ── */}
      <footer style={{ borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto', padding: '32px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, fontSize: 13, color: MUTED }}>
          <span>© 2026 Channelad</span>
          <span style={{ display: 'flex', gap: 18 }}>
            <a href="/para-anunciantes" hrefLang="es" style={{ color: MUTED, textDecoration: 'none' }}>Español</a>
            <Link to="/blog/best-whatsapp-advertising-platforms" style={{ color: MUTED, textDecoration: 'none' }}>Guides</Link>
            <Link to="/marketplace" style={{ color: PURPLE, textDecoration: 'none', fontWeight: 600 }}>Browse channels</Link>
          </span>
        </div>
      </footer>
    </div>
  )
}
