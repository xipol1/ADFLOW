// Frozen synthetic dataset for the /para-anunciantes Product Demo section.
// All data anonymized; channels referenced numerically (Canal #042) so we
// never imply a real partner. Mirror the shape of the live Insights endpoint
// so the visual language stays close to the real product.

import { PLATFORM_BRAND } from '../../../theme/tokens'

export const CATALOG_CHANNELS = [
  { id: '042', platform: 'telegram',   tier: 'A', score: 82, niche: 'Tecnología', region: 'ES',    subs: '18.3K', cpm: '6–8 €' },
  { id: '018', platform: 'whatsapp',   tier: 'S', score: 91, niche: 'Finanzas',   region: 'ES',    subs: '24.7K', cpm: '12–15 €' },
  { id: '103', platform: 'telegram',   tier: 'A', score: 78, niche: 'Marketing',  region: 'MX',    subs: '12.1K', cpm: '5–7 €' },
  { id: '211', platform: 'discord',    tier: 'B', score: 64, niche: 'Gaming',     region: 'ES',    subs: '8.9K',  cpm: '2–3 €' },
  { id: '057', platform: 'newsletter', tier: 'A', score: 85, niche: 'B2B SaaS',   region: 'ES',    subs: '6.4K',  cpm: '16–20 €' },
  { id: '009', platform: 'telegram',   tier: 'S', score: 94, niche: 'Crypto',     region: 'LATAM', subs: '41.2K', cpm: '8–11 €' },
]

// Map platform key → { color, label } using the project's PLATFORM_BRAND
// so the demo stays in sync with the marketplace if brand colors change.
// Newsletter overrides the default (#8b5cf6 collides with our primary purple).
// `ink` is the WCAG-AA-safe deep brand shade used for the platform tag chip
// (white text on a saturated brand color failed contrast on the 8px tag).
export const PLATFORM_DEMO = {
  telegram:   { color: PLATFORM_BRAND.telegram.color,  ink: PLATFORM_BRAND.telegram.ink,  label: 'TELEGRAM' },
  whatsapp:   { color: PLATFORM_BRAND.whatsapp.color,  ink: PLATFORM_BRAND.whatsapp.ink,  label: 'WHATSAPP' },
  discord:    { color: PLATFORM_BRAND.discord.color,   ink: PLATFORM_BRAND.discord.ink,   label: 'DISCORD' },
  newsletter: { color: '#b45309',                      ink: '#b45309',                    label: 'NEWSLETTER' },
}

// Tier text colors are darkened versions of each accent so the label clears
// WCAG AA (>=4.5:1) on its own light tint background. The previous greens/
// ambers (#16a34a / #b45309) measured ~2.9-3.0:1 and failed Lighthouse's
// color-contrast audit on the 10px tier badge.
export const TIER_STYLES = {
  S: { bg: 'rgba(124,58,237,0.14)', text: '#6D28D9' },
  A: { bg: 'rgba(34,197,94,0.16)',  text: '#166534' },
  B: { bg: 'rgba(245,158,11,0.18)', text: '#92400E' },
  C: { bg: 'rgba(239,68,68,0.14)',  text: '#991B1B' },
}

export const SCORE_DETAIL_CHANNEL = {
  id: '042',
  platform: 'telegram',
  name: 'Canal #042 · Tecnología',
  meta: 'Telegram · ES · 18.342 suscriptores',
  cas: 82,
  tier: 'A',
  benchmarkPercentile: 15,
  niche: 'Tecnología',
  region: 'ES',
  metrics: [
    { code: 'CAF', label: 'Audiencia real',        value: 87 },
    { code: 'CTF', label: 'Tráfico real',          value: 79 },
    { code: 'CER', label: 'Engagement rate',       value: 84 },
    { code: 'CVS', label: 'View score',            value: 76 },
    { code: 'CAP', label: 'Performance histórico', value: 81 },
  ],
  // SVG y-coords (0=top, 60=bottom). Lower = better. Trend descends → improves.
  sparkline: [42, 38, 40, 34, 32, 28, 30, 24, 26, 22, 20, 24, 18, 16, 20, 14, 12, 16, 10, 8, 12],
  trendDelta: '+7 puntos',
}

export const CAMPAIGN_DATA = {
  name: 'Campaña Q4_Test · Canal #042',
  publishedAt: '12 nov 2026 · 18:00 · publicación verificada',
  status: 'Entregado · 100%',
  stats: [
    { label: 'Impresiones',  value: '24.891',                delta: '+18% vs benchmark' },
    { label: 'Clics',        value: '1.247',                 delta: '+12% vs benchmark' },
    { label: 'CTR',          value: '5.01', suffix: '%',     delta: 'Top 20% del nicho' },
    { label: 'CPM efectivo', value: '9,84', suffix: ' €',    delta: 'Dentro del rango' },
  ],
  // Impressions per hour for first 24h. Peak at index 0-5 (early publish bump).
  // Inverted Y: lower number = higher value visually. Range 22–128.
  series: [128, 120, 108, 82, 52, 30, 22, 28, 38, 46, 52, 58, 64, 70, 74, 78, 82, 86, 88, 92, 94, 96, 98, 100, 102],
}
