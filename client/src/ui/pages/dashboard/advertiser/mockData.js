export const MOCK_USER = {
  name: 'Rafael Ferrer',
  email: 'rafael@techstartup.com',
  company: 'TechStartup SL',
  avatar: 'RF',
  timezone: 'Europe/Madrid',
}

export const MOCK_ADS = [
  { id: '1', title: 'Lanzamiento App TechStartup', channel: 'Tech Insights ES', platform: 'Telegram', category: 'Tecnología', views: 18420, clicks: 847, ctr: 4.6, budget: 450, spent: 450, status: 'activo', period: '15–28 Mar 2026', image: null },
  { id: '2', title: 'SaaS para equipos remotos', channel: 'Negocios Digitales', platform: 'Newsletter', category: 'Negocios', views: 11200, clicks: 539, ctr: 4.8, budget: 300, spent: 300, status: 'activo', period: '20–31 Mar 2026', image: null },
  { id: '3', title: 'Webinar gratuito: Growth Hacking', channel: 'Marketing Pro WA', platform: 'WhatsApp', category: 'Marketing', views: 7800, clicks: 312, ctr: 4.0, budget: 180, spent: 180, status: 'activo', period: '22 Mar–4 Apr 2026', image: null },
  { id: '4', title: 'Oferta Black Friday anticipada', channel: 'Descuentos y Chollos', platform: 'Telegram', category: 'Ecommerce', views: 24100, clicks: 1205, ctr: 5.0, budget: 600, spent: 600, status: 'completado', period: '1–15 Mar 2026', image: null },
  { id: '5', title: 'Newsletter patrocinada Q1', channel: 'Startup Weekly', platform: 'Newsletter', category: 'Tecnología', views: 9800, clicks: 431, ctr: 4.4, budget: 350, spent: 350, status: 'completado', period: '1–15 Feb 2026', image: null },
  { id: '6', title: 'Campaña Instagram Stories', channel: 'Emprendedores IG', platform: 'Instagram', category: 'Marketing', views: 0, clicks: 0, ctr: 0, budget: 250, spent: 0, status: 'pendiente', period: '1–10 Apr 2026', image: null },
]

export const MOCK_CHANNELS = [
  { id: 'c1', name: 'Tech Insights ES', platform: 'Telegram', category: 'Tecnología', audience: 42800, engagement: 6.2, pricePerPost: 450, verified: true, description: 'Canal de referencia sobre tecnología, startups e IA en español. Publicaciones diarias con alto engagement.', freq: '5 posts/semana', demo: '25-40 años, profesionales tech' },
  { id: 'c2', name: 'Negocios Digitales', platform: 'Newsletter', category: 'Negocios', audience: 28500, engagement: 8.4, pricePerPost: 300, verified: true, description: 'Newsletter semanal enfocada en estrategias de negocio digital, marketing y growth.', freq: '2 posts/semana', demo: '28-45 años, emprendedores' },
  { id: 'c3', name: 'Marketing Pro WA', platform: 'WhatsApp', category: 'Marketing', audience: 15200, engagement: 11.3, pricePerPost: 180, verified: true, description: 'Grupo de WhatsApp con profesionales del marketing digital. Contenido de alta calidad y comunidad muy activa.', freq: '3 posts/semana', demo: '22-38 años, marketers' },
  { id: 'c4', name: 'Startup Weekly', platform: 'Newsletter', category: 'Tecnología', audience: 19800, engagement: 7.1, pricePerPost: 350, verified: true, description: 'La newsletter de referencia para el ecosistema startup español. Curada y leída por fundadores e inversores.', freq: '1 post/semana', demo: '30-50 años, fundadores' },
  { id: 'c5', name: 'Emprendedores IG', platform: 'Instagram', category: 'Negocios', audience: 87400, engagement: 3.8, pricePerPost: 650, verified: true, description: 'Cuenta de Instagram sobre emprendimiento, finanzas personales y estilo de vida empresarial.', freq: '7 posts/semana', demo: '20-35 años, aspirantes' },
  { id: 'c6', name: 'Gaming España DC', platform: 'Discord', category: 'Gaming', audience: 31200, engagement: 9.7, pricePerPost: 220, verified: false, description: 'Servidor de Discord líder en gaming en español. Torneos, noticias y comunidad activa 24/7.', freq: '10 posts/semana', demo: '16-28 años, gamers' },
  { id: 'c7', name: 'Finanzas Para Todos', platform: 'Telegram', category: 'Finanzas', audience: 52100, engagement: 5.9, pricePerPost: 520, verified: true, description: 'Canal Telegram sobre educación financiera, inversión y ahorro. Audiencia muy comprometida.', freq: '4 posts/semana', demo: '25-45 años, ahorradores' },
  { id: 'c8', name: 'Ecommerce PRO', platform: 'WhatsApp', category: 'Ecommerce', audience: 12400, engagement: 13.1, pricePerPost: 160, verified: false, description: 'Grupo de WhatsApp para profesionales del ecommerce. Estrategias, herramientas y casos de éxito.', freq: '5 posts/semana', demo: '25-40 años, tiendas online' },
  { id: 'c9', name: 'Design & UX Hub', platform: 'Discord', category: 'Diseño', audience: 23700, engagement: 8.8, pricePerPost: 280, verified: true, description: 'Comunidad de diseñadores UX/UI en Discord. Portfolio reviews, recursos y job board.', freq: '6 posts/semana', demo: '22-35 años, diseñadores' },
  { id: 'c10', name: 'Salud Activa IG', platform: 'Instagram', category: 'Fitness', audience: 134000, engagement: 4.2, pricePerPost: 890, verified: true, description: 'Instagram de fitness y vida saludable con comunidad muy fiel. Ideal para marcas de salud y bienestar.', freq: '7 posts/semana', demo: '20-40 años, fitness lovers' },
  { id: 'c11', name: 'Dev & Code ES', platform: 'Telegram', category: 'Tecnología', audience: 38900, engagement: 7.3, pricePerPost: 380, verified: true, description: 'Canal Telegram para desarrolladores hispanohablantes. Tutoriales, ofertas de trabajo y noticias tech.', freq: '5 posts/semana', demo: '20-35 años, developers' },
  { id: 'c12', name: 'Foodie Madrid FB', platform: 'Facebook', category: 'Gastronomía', audience: 61200, engagement: 2.9, pricePerPost: 290, verified: false, description: 'Grupo de Facebook sobre gastronomía en Madrid. Recomendaciones, recetas y eventos culinarios.', freq: '4 posts/semana', demo: '30-55 años, amantes gastronomía' },
]

export const MOCK_TRANSACTIONS = [
  { id: 't1', date: '26 Mar 2026', desc: 'Lanzamiento App TechStartup — Tech Insights ES', type: 'cargo', amount: -450, status: 'completado' },
  { id: 't2', date: '22 Mar 2026', desc: 'Recarga de saldo', type: 'recarga', amount: 1000, status: 'completado' },
  { id: 't3', date: '20 Mar 2026', desc: 'SaaS para equipos remotos — Negocios Digitales', type: 'cargo', amount: -300, status: 'completado' },
  { id: 't4', date: '15 Mar 2026', desc: 'Oferta Black Friday — Descuentos y Chollos', type: 'cargo', amount: -600, status: 'completado' },
  { id: 't5', date: '10 Mar 2026', desc: 'Recarga de saldo', type: 'recarga', amount: 500, status: 'completado' },
  { id: 't6', date: '1 Mar 2026', desc: 'Webinar Growth Hacking — Marketing Pro WA', type: 'cargo', amount: -180, status: 'completado' },
  { id: 't7', date: '15 Feb 2026', desc: 'Newsletter patrocinada Q1 — Startup Weekly', type: 'cargo', amount: -350, status: 'completado' },
  { id: 't8', date: '1 Feb 2026', desc: 'Recarga de saldo', type: 'recarga', amount: 800, status: 'completado' },
]

export const MOCK_NOTIFICATIONS = [
  { id: 'n1', type: 'success', title: 'Anuncio aprobado', desc: '"Lanzamiento App TechStartup" fue aprobado por Tech Insights ES', time: 'Hace 2h', read: false },
  { id: 'n2', type: 'info', title: 'Milestone alcanzado', desc: 'Tu campaña superó las 10.000 impresiones', time: 'Hace 5h', read: false },
  { id: 'n3', type: 'warning', title: 'Anuncio pendiente', desc: '"Campaña Instagram Stories" está esperando aprobación', time: 'Hace 1d', read: false },
  { id: 'n4', type: 'success', title: 'Campaña completada', desc: '"Oferta Black Friday" finalizó con éxito: 1.205 clicks', time: 'Hace 2d', read: true },
  { id: 'n5', type: 'info', title: 'Nuevo canal disponible', desc: 'Tech Insights ES tiene disponibilidad para próxima semana', time: 'Hace 3d', read: true },
]

export const MOCK_MONTHLY_SPEND = [
  { label: 'Oct', value: 320 },
  { label: 'Nov', value: 580 },
  { label: 'Dic', value: 940 },
  { label: 'Ene', value: 410 },
  { label: 'Feb', value: 350 },
  { label: 'Mar', value: 1930 },
]

export const PLATFORM_COLORS = {
  Telegram:   '#2aabee',
  Newsletter: '#8b5cf6',
  WhatsApp:   '#25d366',
  Discord:    '#5865f2',
  Instagram:  '#e1306c',
  Facebook:   '#1877f2',
}
