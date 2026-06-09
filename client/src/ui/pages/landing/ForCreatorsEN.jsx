import React from 'react'
import { Link } from 'react-router-dom'
import SEO from '../../components/SEO'
import { PURPLE, GREEN, FONT_BODY, FONT_DISPLAY, MAX_W } from '../../theme/tokens'

// Lean, self-contained EN landing for channel creators (the EN counterpart of
// /para-canales). Standalone (own minimal EN header/footer) so English visitors
// don't see the Spanish global nav. hreflang pair declared via SEO `alternates`.
const SITE = 'https://channelad.io'
const ALTERNATES = [
  { hreflang: 'es', href: `${SITE}/para-canales` },
  { hreflang: 'en', href: `${SITE}/en/for-creators` },
  { hreflang: 'x-default', href: `${SITE}/para-canales` },
]

const INK = '#0B1220'
const MUTED = '#5b6472'
const BORDER = 'rgba(11,18,32,0.08)'

const STEPS = [
  { n: '1', t: 'List your channel for free', d: 'Add your WhatsApp, Telegram or Discord channel. Verification is automatic via API — no screenshots, no waiting.' },
  { n: '2', t: 'Receive verified proposals', d: 'Brands that match your niche send you sponsored-post offers. You set your rate and approve every campaign.' },
  { n: '3', t: 'Publish on your terms', d: 'Post the approved ad. You decide the format, the timing and what fits your audience.' },
  { n: '4', t: 'Get paid — 100% in escrow', d: 'Funds are held in escrow before you publish and released to you after. No chasing invoices, no non-payment.' },
]

const VALUES = [
  { t: '100% of your price', d: 'The advertiser pays the platform fee on top. You keep the full rate you set.' },
  { t: 'Escrow protection', d: 'Money is locked before the post goes live, so you publish only once payment is secured.' },
  { t: 'Verified advertisers', d: 'Every brand is vetted. No spam, no shady info-products hitting your audience.' },
  { t: 'No exclusivity', d: 'Keep selling directly, on other platforms, however you want. Channelad is additive.' },
]

const EARNINGS = [
  ['500 – 1,500', '2 – 4', '€30 – 120'],
  ['1,500 – 5,000', '4 – 8', '€120 – 450'],
  ['5,000 – 15,000', '6 – 12', '€350 – 1,500'],
  ['15,000 – 50,000', '10 – 18', '€1,200 – 4,500'],
]

const PILLARS = [
  { href: '/blog/how-to-monetize-whatsapp-channel', t: 'How to monetize a WhatsApp channel' },
  { href: '/blog/how-to-monetize-telegram-channel', t: 'How to monetize a Telegram channel' },
  { href: '/blog/how-to-monetize-discord-server', t: 'How to monetize a Discord server' },
]

const btnPrimary = {
  display: 'inline-block', background: GREEN, color: '#04150b', fontWeight: 700,
  fontFamily: FONT_BODY, fontSize: 16, padding: '14px 26px', borderRadius: 12,
  textDecoration: 'none', border: 'none',
}

export default function ForCreatorsEN() {
  return (
    <div style={{ background: '#fff', color: INK, fontFamily: FONT_BODY, minHeight: '100vh' }}>
      <SEO
        title="Monetize your WhatsApp, Telegram or Discord channel"
        description="Free for creators: list your channel, receive verified advertiser proposals and keep 100% of your price, protected by escrow. Get paid for sponsored posts in 2026."
        path="/en/for-creators"
        lang="en"
        alternates={ALTERNATES}
      />

      {/* ── Minimal EN header ── */}
      <header style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/en/for-creators" style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 19, color: INK, textDecoration: 'none' }}>
            Channel<span style={{ color: PURPLE }}>ad</span>
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 14 }}>
            <Link to="/blog/how-to-monetize-whatsapp-channel" style={{ color: MUTED, textDecoration: 'none' }}>Guides</Link>
            <a href="/para-canales" style={{ color: MUTED, textDecoration: 'none' }} hrefLang="es">ES</a>
            <Link to="/auth/register" style={{ ...btnPrimary, padding: '9px 18px', fontSize: 14 }}>Register channel</Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ maxWidth: MAX_W, margin: '0 auto', padding: '72px 24px 56px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', fontSize: 13, fontWeight: 600, color: GREEN, background: 'rgba(37,211,102,0.1)', padding: '6px 14px', borderRadius: 100, marginBottom: 22 }}>
          Free for creators · No exclusivity
        </div>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 'clamp(34px, 5.5vw, 58px)', lineHeight: 1.08, letterSpacing: '-0.02em', margin: '0 auto 20px', maxWidth: 820 }}>
          Monetize your WhatsApp, Telegram &amp; Discord channel
        </h1>
        <p style={{ fontSize: 19, lineHeight: 1.6, color: MUTED, maxWidth: 620, margin: '0 auto 32px' }}>
          List your channel, get matched with verified advertisers, and keep <strong style={{ color: INK }}>100% of your price</strong> — protected by escrow on every campaign.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/auth/register" style={btnPrimary}>Register channel</Link>
          <a href="#how" style={{ ...btnPrimary, background: 'transparent', color: INK, border: `1px solid ${BORDER}`, fontWeight: 600 }}>How it works</a>
        </div>
        <p style={{ fontSize: 13, color: MUTED, marginTop: 18 }}>No fixed costs · Get paid by SEPA · Verification via API</p>
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
        <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 'clamp(26px,3.5vw,38px)', textAlign: 'center', marginBottom: 40 }}>Why creators choose Channelad</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {VALUES.map((v) => (
            <div key={v.t} style={{ borderLeft: `3px solid ${GREEN}`, padding: '6px 0 6px 18px' }}>
              <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{v.t}</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: MUTED }}>{v.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Earnings snapshot ── */}
      <section style={{ background: '#f7f8fa', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '64px 24px' }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 'clamp(24px,3.2vw,34px)', textAlign: 'center', marginBottom: 10 }}>What channels actually earn</h2>
          <p style={{ textAlign: 'center', color: MUTED, fontSize: 15, marginBottom: 30 }}>Realistic monthly ranges, assuming active monetization.</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15, background: '#fff', borderRadius: 12, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
              <thead>
                <tr style={{ background: '#fff', textAlign: 'left' }}>
                  <th style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, fontWeight: 700 }}>Subscribers</th>
                  <th style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, fontWeight: 700 }}>Sponsored posts/mo</th>
                  <th style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, fontWeight: 700 }}>Monthly income</th>
                </tr>
              </thead>
              <tbody>
                {EARNINGS.map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding: '13px 18px', borderBottom: i < EARNINGS.length - 1 ? `1px solid ${BORDER}` : 'none' }}>{row[0]}</td>
                    <td style={{ padding: '13px 18px', borderBottom: i < EARNINGS.length - 1 ? `1px solid ${BORDER}` : 'none', color: MUTED }}>{row[1]}</td>
                    <td style={{ padding: '13px 18px', borderBottom: i < EARNINGS.length - 1 ? `1px solid ${BORDER}` : 'none', fontWeight: 700, color: GREEN }}>{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 13, color: MUTED, marginTop: 14, textAlign: 'center' }}>Niche matters more than size — finance and crypto channels earn well above these ranges.</p>
        </div>
      </section>

      {/* ── Guides / internal links ── */}
      <section style={{ maxWidth: MAX_W, margin: '0 auto', padding: '56px 24px' }}>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 22, marginBottom: 22 }}>Guides for creators</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
          {PILLARS.map((p) => (
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
          <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 'clamp(26px,3.5vw,40px)', marginBottom: 14 }}>Start monetizing your channel</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 17, maxWidth: 540, margin: '0 auto 28px' }}>Free to join. Set up your first channel in under 10 minutes and start receiving verified proposals.</p>
          <Link to="/auth/register" style={btnPrimary}>Register channel</Link>
        </div>
      </section>

      {/* ── Minimal footer ── */}
      <footer style={{ borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto', padding: '32px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, fontSize: 13, color: MUTED }}>
          <span>© 2026 Channelad</span>
          <span style={{ display: 'flex', gap: 18 }}>
            <a href="/para-canales" hrefLang="es" style={{ color: MUTED, textDecoration: 'none' }}>Español</a>
            <Link to="/blog/how-to-monetize-whatsapp-channel" style={{ color: MUTED, textDecoration: 'none' }}>Guides</Link>
            <Link to="/auth/register" style={{ color: PURPLE, textDecoration: 'none', fontWeight: 600 }}>Register channel</Link>
          </span>
        </div>
      </footer>
    </div>
  )
}
