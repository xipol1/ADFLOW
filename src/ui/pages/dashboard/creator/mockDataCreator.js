export const MOCK_CREATOR_USER = {
  name: 'María García',
  email: 'maria@creadores.com',
  avatar: 'MG',
  channels: 3,
}

export const MOCK_CHANNELS = [
  {
    id: 'ch1', name: 'Tech Insights ES', platform: 'Telegram',
    audience: 42800, engagement: 6.2, pricePerPost: 450,
    status: 'activo', verified: true,
    description: 'Canal de tecnología, startups e IA en español.',
    postsThisMonth: 18, earningsThisMonth: 2340, totalEarnings: 8920,
    category: 'Tecnología',
  },
  {
    id: 'ch2', name: 'Marketing Pro WA', platform: 'WhatsApp',
    audience: 15200, engagement: 11.3, pricePerPost: 180,
    status: 'activo', verified: true,
    description: 'Grupo de WhatsApp con profesionales del marketing digital.',
    postsThisMonth: 9, earningsThisMonth: 810, totalEarnings: 2430,
    category: 'Marketing',
  },
  {
    id: 'ch3', name: 'Dev & Code ES', platform: 'Telegram',
    audience: 38900, engagement: 7.3, pricePerPost: 380,
    status: 'pendiente', verified: false,
    description: 'Canal para desarrolladores hispanohablantes.',
    postsThisMonth: 0, earningsThisMonth: 0, totalEarnings: 0,
    category: 'Tecnología',
  },
]

export const MOCK_REQUESTS = [
  {
    id: 'r1', advertiser: 'TechStartup SL', channel: 'Tech Insights ES',
    title: 'Lanzamiento App TechStartup', budget: 450, platform: 'Telegram',
    status: 'pendiente', receivedAt: 'Hace 2h',
    message: 'Hola, nos gustaría publicar el lanzamiento de nuestra app en tu canal. ¿Tienes disponibilidad esta semana?',
    category: 'Tecnología',
  },
  {
    id: 'r2', advertiser: 'GrowthAgency', channel: 'Marketing Pro WA',
    title: 'Webinar gratuito Growth Hacking', budget: 180, platform: 'WhatsApp',
    status: 'pendiente', receivedAt: 'Hace 5h',
    message: 'Queremos promocionar nuestro webinar de growth hacking a tu audiencia de marketing.',
    category: 'Marketing',
  },
  {
    id: 'r3', advertiser: 'SaaSCorp', channel: 'Tech Insights ES',
    title: 'SaaS para equipos remotos', budget: 300, platform: 'Telegram',
    status: 'aceptado', receivedAt: 'Hace 1d',
    message: 'Nos encanta tu contenido. Queremos mostrar nuestra herramienta de gestión de equipos.',
    category: 'Tecnología',
  },
  {
    id: 'r4', advertiser: 'EduTech ES', channel: 'Tech Insights ES',
    title: 'Plataforma de cursos online', budget: 200, platform: 'Telegram',
    status: 'rechazado', receivedAt: 'Hace 3d',
    message: 'Buscamos promocionar nuestra plataforma de cursos de programación.',
    category: 'Educación',
  },
  {
    id: 'r5', advertiser: 'DevTools Inc', channel: 'Dev & Code ES',
    title: 'Herramienta de debugging', budget: 380, platform: 'Telegram',
    status: 'completado', receivedAt: 'Hace 5d',
    message: 'Queremos presentar nuestra nueva herramienta de debugging a tu comunidad de devs.',
    category: 'Tecnología',
  },
]

export const MOCK_EARNINGS = [
  { id: 'e1', date: '26 Mar 2026', desc: 'Tech Insights ES — TechStartup SL', amount: 450, status: 'pendiente' },
  { id: 'e2', date: '22 Mar 2026', desc: 'Marketing Pro WA — GrowthAgency', amount: 180, status: 'completado' },
  { id: 'e3', date: '20 Mar 2026', desc: 'Tech Insights ES — SaaSCorp', amount: 300, status: 'completado' },
  { id: 'e4', date: '15 Mar 2026', desc: 'Tech Insights ES — EduTech ES', amount: 200, status: 'retirado' },
  { id: 'e5', date: '10 Mar 2026', desc: 'Retiro a cuenta bancaria', amount: -800, status: 'retirado' },
  { id: 'e6', date: '5 Mar 2026', desc: 'Marketing Pro WA — DevTools Inc', amount: 380, status: 'completado' },
  { id: 'e7', date: '28 Feb 2026', desc: 'Tech Insights ES — FinanceApp', amount: 450, status: 'retirado' },
]

export const MOCK_MONTHLY_EARNINGS = [
  { label: 'Oct', value: 420 },
  { label: 'Nov', value: 680 },
  { label: 'Dic', value: 1100 },
  { label: 'Ene', value: 580 },
  { label: 'Feb', value: 830 },
  { label: 'Mar', value: 1150 },
]

export const PLATFORM_COLORS = {
  Telegram: '#2aabee', WhatsApp: '#25d366', Discord: '#5865f2',
  Instagram: '#e1306c', Newsletter: '#8b5cf6', Facebook: '#1877f2',
}

export const MOCK_ACTIVITY_FEED = [
  { id: 'af1', icon: '📥', color: '#3b82f6', title: 'Nueva solicitud', desc: 'Tech Insights ES — €450', time: 'Hace 2h' },
  { id: 'af2', icon: '💰', color: '#25d366', title: 'Pago recibido', desc: 'Marketing Pro WA — €180', time: 'Hace 8h' },
  { id: 'af3', icon: '📢', color: '#10b981', title: 'Publicada', desc: 'Tech Insights ES — SaaSCorp', time: 'Ayer' },
  { id: 'af4', icon: '💬', color: '#8b5cf6', title: 'Nuevo mensaje', desc: 'GrowthAgency en Marketing Pro WA', time: 'Ayer' },
  { id: 'af5', icon: '💰', color: '#25d366', title: 'Pago recibido', desc: 'Dev & Code ES — €380', time: 'Hace 3 dias' },
  { id: 'af6', icon: '✕', color: '#ef4444', title: 'Solicitud rechazada', desc: 'Tech Insights ES — €200', time: 'Hace 5 dias' },
]

export const MOCK_PAYOUT_SCHEDULE = [
  { id: 'ps1', date: '28 Mar 2026', amount: 630, method: 'Cuenta bancaria', status: 'programado' },
  { id: 'ps2', date: '15 Mar 2026', amount: 800, method: 'Cuenta bancaria', status: 'completado' },
  { id: 'ps3', date: '28 Feb 2026', amount: 450, method: 'PayPal', status: 'completado' },
]

export const MOCK_CHANNEL_ANALYTICS = {
  ch1: {
    campanasTotal: 24, tasaCompletadas: 92, ingresosTotales: 8920,
    monthlyEarnings: [
      { label: 'Oct', value: 680 }, { label: 'Nov', value: 920 },
      { label: 'Dic', value: 1540 }, { label: 'Ene', value: 810 },
      { label: 'Feb', value: 1200 }, { label: 'Mar', value: 1630 },
    ],
    recentCampaigns: [
      { advertiser: 'TechStartup SL', amount: 450, status: 'PAID', date: '26 Mar' },
      { advertiser: 'SaaSCorp', amount: 300, status: 'COMPLETED', date: '20 Mar' },
      { advertiser: 'FinanceApp', amount: 450, status: 'COMPLETED', date: '5 Mar' },
    ],
  },
  ch2: {
    campanasTotal: 12, tasaCompletadas: 83, ingresosTotales: 2430,
    monthlyEarnings: [
      { label: 'Oct', value: 180 }, { label: 'Nov', value: 360 },
      { label: 'Dic', value: 540 }, { label: 'Ene', value: 270 },
      { label: 'Feb', value: 360 }, { label: 'Mar', value: 450 },
    ],
    recentCampaigns: [
      { advertiser: 'GrowthAgency', amount: 180, status: 'PAID', date: '26 Mar' },
      { advertiser: 'DevTools Inc', amount: 180, status: 'COMPLETED', date: '15 Mar' },
    ],
  },
}

// ─── Creator Analytics (matches GET /api/estadisticas/creator/analytics response) ───
const generateTimeline = (days, baseRevenue, baseCampaigns) => {
  const timeline = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000)
    const dayOfWeek = d.getDay()
    const weekdayMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.4 : 1 + Math.random() * 0.6
    timeline.push({
      date: d.toISOString().split('T')[0],
      revenue: Math.round(baseRevenue * weekdayMultiplier * (0.7 + Math.random() * 0.6)),
      campaigns: Math.round(baseCampaigns * weekdayMultiplier * (0.5 + Math.random())),
    })
  }
  return timeline
}

export const MOCK_CREATOR_ANALYTICS = {
  period: '30d',
  startDate: new Date(Date.now() - 30 * 86400000).toISOString(),
  revenueTimeline: generateTimeline(30, 85, 1.2),
  campaignsTimeline: generateTimeline(30, 1, 1).map(d => ({
    date: d.date,
    completed: Math.max(0, d.campaigns),
    total: Math.max(1, d.campaigns + Math.round(Math.random() * 0.8)),
  })),
  channelComparison: [
    { channelId: 'ch1', name: 'Tech Insights ES', platform: 'telegram', revenue: 4820, campaigns: 14, avgPrice: 344 },
    { channelId: 'ch2', name: 'Marketing Pro WA', platform: 'whatsapp', revenue: 1620, campaigns: 9, avgPrice: 180 },
    { channelId: 'ch3', name: 'Dev & Code ES', platform: 'telegram', revenue: 760, campaigns: 2, avgPrice: 380 },
  ],
  topChannels: [
    { channelId: 'ch1', name: 'Tech Insights ES', platform: 'telegram', revenue: 4820 },
    { channelId: 'ch2', name: 'Marketing Pro WA', platform: 'whatsapp', revenue: 1620 },
    { channelId: 'ch3', name: 'Dev & Code ES', platform: 'telegram', revenue: 760 },
  ],
  clickMetrics: {
    totalClicks: 12480,
    uniqueClicks: 8920,
    timeline: generateTimeline(30, 420, 300).map(d => ({
      date: d.date,
      clicks: d.revenue,
      uniqueClicks: Math.round(d.revenue * 0.72),
    })),
  },
}

// ─── Channel Deep Analytics (matches GET /api/estadisticas/channels/:id/analytics) ───
export const MOCK_CHANNEL_DEEP_ANALYTICS = {
  period: '30d',
  revenueTimeline: generateTimeline(30, 120, 0.8),
  campaignTimeline: generateTimeline(30, 0.6, 0.4).map(d => ({
    date: d.date,
    count: Math.max(0, d.campaigns),
    revenue: d.revenue,
  })),
  ratingTimeline: Array.from({ length: 6 }, (_, i) => ({
    month: new Date(Date.now() - (5 - i) * 30 * 86400000).toISOString().slice(0, 7),
    avg: +(4.2 + Math.random() * 0.7).toFixed(1),
    count: Math.round(3 + Math.random() * 8),
  })),
  clickAnalytics: {
    totalClicks: 5840,
    uniqueClicks: 4120,
    devices: { desktop: 2340, mobile: 2920, tablet: 580 },
    countries: [
      { country: 'ES', clicks: 2100, pct: 36 },
      { country: 'MX', clicks: 1170, pct: 20 },
      { country: 'AR', clicks: 876, pct: 15 },
      { country: 'CO', clicks: 584, pct: 10 },
      { country: 'CL', clicks: 350, pct: 6 },
      { country: 'PE', clicks: 292, pct: 5 },
      { country: 'US', clicks: 234, pct: 4 },
      { country: 'Otros', clicks: 234, pct: 4 },
    ],
    browsers: [
      { browser: 'Chrome', clicks: 3504, pct: 60 },
      { browser: 'Safari', clicks: 1168, pct: 20 },
      { browser: 'Firefox', clicks: 584, pct: 10 },
      { browser: 'Edge', clicks: 350, pct: 6 },
      { browser: 'Otros', clicks: 234, pct: 4 },
    ],
    timeline: generateTimeline(30, 195, 140).map(d => ({
      date: d.date,
      clicks: d.revenue,
      uniqueClicks: Math.round(d.revenue * 0.7),
    })),
  },
  audienceGrowth: Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000)
    return {
      date: d.toISOString().split('T')[0],
      estimatedReach: Math.round(32000 + i * 380 + Math.random() * 1200),
      newFollowers: Math.round(40 + Math.random() * 80),
    }
  }),
}
