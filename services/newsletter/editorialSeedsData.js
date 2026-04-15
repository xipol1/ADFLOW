/**
 * Editorial seeds — curated list of Spanish-language newsletters.
 *
 * Aggregated from public editorial sources (no scraping required):
 *   - Marketing4eCommerce Top 40 (marketing4ecommerce.net)
 *   - InboxReads "Best Spanish Substack Newsletters"
 *   - Directorio Substack España (directorio.substack.com)
 *   - Fleet Street rankings (fleetstreet.substack.com)
 *   - Public press about Suma Positiva, Dealflow.es, Al Día, etc.
 *
 * Each entry is the MINIMUM we can guarantee from the source. The orchestrator
 * will enrich them in-place with live data (subscribers, real description,
 * author) via the Substack public JSON API when the URL is a Substack one.
 *
 * Fields:
 *   - title:       human-readable newsletter name
 *   - url:         canonical homepage (used for provider detection)
 *   - source:      editorial source that surfaced this entry (audit trail)
 *   - rawCategory: label from the source (will be normalized by taxonomy)
 *   - subscribers: only set when the source explicitly publishes it
 *
 * Deduping is done in the orchestrator by slug, so it's OK if the same
 * newsletter appears under multiple sources here.
 */

const NEWSLETTER_SEEDS = [
  // ─── From Marketing4eCommerce Top 40 ─────────────────────────────────────
  {
    title: 'Ecommartech',
    url: 'https://ecommartech.substack.com/',
    source: 'marketing4ecommerce',
    rawCategory: 'eCommerce Marketing Tech',
    subscribers: 2000,
  },
  {
    title: '10 Links Azules',
    url: 'https://useo.es/newsletter-seo/',
    source: 'marketing4ecommerce',
    rawCategory: 'SEO eCommerce',
  },
  {
    title: 'Emprende en Remoto',
    url: 'https://emprendeenremoto.substack.com/',
    source: 'marketing4ecommerce',
    rawCategory: 'Emprendimiento trabajo remoto',
    subscribers: 4000,
  },
  {
    title: 'Product Hackers',
    url: 'https://producthackers.ac-page.com/newsletter',
    source: 'marketing4ecommerce',
    rawCategory: 'Growth Marketing Producto',
  },
  {
    title: 'Marketing Paradise',
    url: 'https://mkparadise.com/email',
    source: 'marketing4ecommerce',
    rawCategory: 'Marketing digital',
    subscribers: 12000,
  },
  {
    title: 'Chus Naharro',
    url: 'https://chusnaharro.com/newsletter/',
    source: 'marketing4ecommerce',
    rawCategory: 'Marketing',
  },
  {
    title: 'Disaaster',
    url: 'https://disaaster.io/',
    source: 'marketing4ecommerce',
    rawCategory: 'Marketing',
  },
  {
    title: 'El Blog de HubSpot',
    url: 'https://blog.hubspot.es/',
    source: 'marketing4ecommerce',
    rawCategory: 'Marketing Ventas',
  },
  {
    title: 'Haken',
    url: 'https://haken.io/',
    source: 'marketing4ecommerce',
    rawCategory: 'Marketing',
  },
  {
    title: 'Honos',
    url: 'https://www.honos.es/',
    source: 'marketing4ecommerce',
    rawCategory: 'Marketing',
  },
  {
    title: 'Leanalytics — Experimentación Online',
    url: 'https://www.experimentaciononline.com/',
    source: 'marketing4ecommerce',
    rawCategory: 'Marketing analytics CRO',
  },
  {
    title: 'Mind Tricks',
    url: 'https://mindtricks.substack.com/',
    source: 'marketing4ecommerce',
    rawCategory: 'Marketing psicología',
  },
  {
    title: 'Nicho SEO',
    url: 'https://nichoseo.com/newsletter/',
    source: 'marketing4ecommerce',
    rawCategory: 'SEO',
  },
  {
    title: 'Raúl Abad — Email Marketing Pro',
    url: 'https://www.emailmarketingpro.com/newsletter',
    source: 'marketing4ecommerce',
    rawCategory: 'Email marketing',
  },
  {
    title: 'Rebujito Marketing',
    url: 'https://rebujitomarketing.com/newsletter',
    source: 'marketing4ecommerce',
    rawCategory: 'Marketing',
  },
  {
    title: 'Remazing',
    url: 'https://remazing.eu/es',
    source: 'marketing4ecommerce',
    rawCategory: 'Amazon marketing ecommerce',
  },
  {
    title: 'Rodobo',
    url: 'https://www.rodobo.es/',
    source: 'marketing4ecommerce',
    rawCategory: 'Marketing',
  },
  {
    title: 'Samu Parra',
    url: 'https://samuparra.com/suscripcion-newsletter/',
    source: 'marketing4ecommerce',
    rawCategory: 'Marketing copywriting',
  },
  {
    title: 'Secretos de Copywriter',
    url: 'https://www.javicarnicero.com/',
    source: 'marketing4ecommerce',
    rawCategory: 'Copywriting',
  },
  {
    title: 'Social Things',
    url: 'https://jordisanildefonso.substack.com/',
    source: 'marketing4ecommerce',
    rawCategory: 'Social media marketing',
  },
  {
    title: 'Notas de SEO',
    url: 'https://notasdeseo.com/',
    source: 'marketing4ecommerce',
    rawCategory: 'SEO',
  },
  {
    title: 'Notas de Marketing',
    url: 'https://notasdmarketing.substack.com/',
    source: 'marketing4ecommerce',
    rawCategory: 'Marketing',
  },

  // ─── From InboxReads Top Spanish Substack ───────────────────────────────
  {
    title: 'Espresso Matutino',
    url: 'https://espresso-matutino.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Noticias negocios tecnología',
    subscribers: 138000,
  },
  {
    title: 'El Pez Gordo',
    url: 'https://el-pez-gordo.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Criptomonedas cripto',
  },
  {
    title: 'Trabajar por el Mundo',
    url: 'https://trabajarporelmundo.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Trabajo remoto viajes',
    subscribers: 120000,
  },
  {
    title: 'Boletín de Francys Romero',
    url: 'https://boletin-de-francys-romero.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Deporte béisbol',
  },
  {
    title: 'Ahorradoras',
    url: 'https://ahorradoras.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Finanzas personales ahorro',
  },
  {
    title: 'Better Business for a Better World',
    url: 'https://better-business-for-a-better-world.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Emprendimiento',
  },
  {
    title: 'Vacantes Remotas',
    url: 'https://vacantes-remotas.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Empleo trabajo remoto',
  },
  {
    title: 'La Newsletter de AJRA',
    url: 'https://la-newsletter-de-ajra.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Tecnología Apple iPad',
  },
  {
    title: 'El Escandallo',
    url: 'https://el-escandallo.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Negocios restauración delivery',
  },
  {
    title: 'Lovely Indies',
    url: 'https://lovely-indies.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Videojuegos gaming indie',
  },
  {
    title: 'MultiVersial',
    url: 'https://multiversial.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Negocios digitales',
  },
  {
    title: 'CEO en Camiseta',
    url: 'https://ceo-en-camiseta.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Emprendimiento',
  },
  {
    title: 'Nudista Investor',
    url: 'https://nudista-investor.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Finanzas personales inversión negocios online',
  },
  {
    title: 'Señoras con WiFi',
    url: 'https://senoras-con-wifi.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Cultura tecnología',
  },
  {
    title: 'Suma Positiva',
    url: 'https://sumapositiva.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Tecnología startups venture capital',
  },
  {
    title: 'Zumitow',
    url: 'https://zumitow.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Finanzas Wall Street bolsa',
  },
  {
    title: 'Irene Pardo — Notion',
    url: 'https://irenes-notion.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Productividad Notion',
  },
  {
    title: 'Desalineación Funcional',
    url: 'https://desalineacion-funcional.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Desarrollo personal',
  },
  {
    title: '7x7',
    url: 'https://7x7.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Política noticias internacional',
  },
  {
    title: 'DMNTR Network Solutions',
    url: 'https://la-newsletter-de-dmntr-network-solutions.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Tecnología redes ciberseguridad IT',
  },

  // ─── Widely recognized Spanish newsletters (press, public rankings) ────
  {
    title: 'Dealflow.es',
    url: 'https://newsletter.dealflow.es/',
    source: 'editorial_seed',
    rawCategory: 'Startups venture capital',
  },
  {
    title: 'Al Día — elDiario.es',
    url: 'https://www.eldiario.es/newsletter/',
    source: 'editorial_seed',
    rawCategory: 'Noticias política actualidad',
    subscribers: 150000,
  },
  {
    title: 'Mientras Dormías — El Español',
    url: 'https://www.elespanol.com/newsletter/mientras-dormias/',
    source: 'editorial_seed',
    rawCategory: 'Noticias actualidad',
    subscribers: 500000,
  },
  {
    title: 'Adelanto Premium — El Mundo',
    url: 'https://www.elmundo.es/newsletter/adelanto-premium.html',
    source: 'editorial_seed',
    rawCategory: 'Noticias premium',
    subscribers: 58000,
  },
  {
    title: 'Kaizen Spanish',
    url: 'https://kaizenspanish.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Idiomas comunicación español',
  },
  {
    title: 'Gente Interesante',
    url: 'https://genteinteresante.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Biohacking salud longevidad',
  },
  {
    title: 'No Solo Suerte',
    url: 'https://nosolosuerte.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Estrategia personal profesional',
  },
  {
    title: 'Fleet Street',
    url: 'https://fleetstreet.substack.com/',
    source: 'fleet_street',
    rawCategory: 'Periodismo newsletters medios',
  },
  {
    title: 'Nuevo Sector',
    url: 'https://nuevosector.substack.com/',
    source: 'marketing4ecommerce',
    rawCategory: 'eCommerce retail startups',
  },
  {
    title: 'Tech, Science and Future',
    url: 'https://techscienceandfuture.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Tecnología ciencia futuro',
  },
  {
    title: 'Emprender — Substack',
    url: 'https://emprender.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Tecnología emprendimiento economía',
  },
  {
    title: 'Directorio de Substack',
    url: 'https://directorio.substack.com/',
    source: 'substack_directory',
    rawCategory: 'Newsletters recomendaciones',
  },
  {
    title: 'Rocker Insider',
    url: 'https://rockerinsider.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Música rock entretenimiento',
    subscribers: 920000,
  },
  {
    title: 'Aprender Gratis',
    url: 'https://aprendergratis.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Educación cursos online',
    subscribers: 92000,
  },
  {
    title: 'Digital Brain',
    url: 'https://digitalbrain.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Inteligencia artificial tecnología',
    subscribers: 83000,
  },

  // ─── Additional well-known Spanish Substack publications ───────────────
  {
    title: 'Semanal de Inversión',
    url: 'https://semanaldeinversion.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Finanzas inversión bolsa',
  },
  {
    title: 'Startups Oasis',
    url: 'https://startupsoasis.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Startups tecnología',
  },
  {
    title: 'Marketing4eCommerce',
    url: 'https://marketing4ecommerce.substack.com/',
    source: 'marketing4ecommerce',
    rawCategory: 'Marketing eCommerce',
  },
  {
    title: 'La Vida es un Juego',
    url: 'https://lavidaesunjuego.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Desarrollo personal productividad',
  },
  {
    title: 'El Viaje Interminable',
    url: 'https://elviajeinterminable.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Cultura filosofía libros',
  },
  {
    title: 'IA en Español',
    url: 'https://iaenespanol.substack.com/',
    source: 'autonewsletter_ai',
    rawCategory: 'Inteligencia artificial IA español',
  },
  {
    title: 'Evolupedia',
    url: 'https://evolupedia.substack.com/',
    source: 'autonewsletter_ai',
    rawCategory: 'Cultura evolución ciencia',
  },
  {
    title: 'Cinco Bastos',
    url: 'https://cincobastos.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Cultura humor español',
  },
  {
    title: 'La Mirada Lúcida',
    url: 'https://lamiradalucida.substack.com/',
    source: 'editorial_seed',
    rawCategory: 'Análisis actualidad política',
  },
];

module.exports = {
  NEWSLETTER_SEEDS,
};
