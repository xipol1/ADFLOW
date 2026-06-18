/**
 * product.ts — THE single source of truth for this bridge page.
 * To launch a new product with this template, edit ONLY this file.
 *
 * Hard rule (Amazon Associates compliance): NEVER hardcode a price.
 */

export interface FaqItem { q: string; a: string }
export interface Testimonial { text: string; who: string }
export interface SceneConfig {
  video: string;
  poster: string;
  word: string;     // big cinematic word
  caption: string;  // one-line supporting copy
}

export interface ProductConfig {
  store: { name: string; operator: string };
  amazon: { url: string; tag: string; newTabDesktop: boolean };
  tracking: { apiBaseUrl: string; productKey: string };
  cta: { label: string; stickyLabel: string; bottomLabel: string; sub: string };
  hero: {
    h1: string;
    subhead: string;
    video: string;
    poster: string;     // also the LCP/fallback image
    chips: string[];
  };
  trust: { rating: number; reviews: number; reviewsLabel: string };
  disclosure: { micro: string; full: string };
  scenes: { spray: SceneConfig; pour: SceneConfig };
  labels: { title: string; sub: string; items: string[] };
  benefits: { icon: 'leaf' | 'flame' | 'droplet'; title: string; body: string }[];
  stat: string;
  social: { testimonials: Testimonial[]; footnote: string };
  faq: FaqItem[];
  finalCta: { headline: string; sub: string; riskReversal: string };
}

export const product: ProductConfig = {
  store: {
    name: 'Cocina Lista',
    operator: 'Michi Solucions SL',
  },

  amazon: {
    // SWEET VIEW Aceitera Spray 2-en-1, vidrio 470ml (ASIN B0F2DJV6SZ).
    url: 'https://www.amazon.es/dp/B0F2DJV6SZ',
    // ⚠️ Replace with your real Associates tag.
    tag: 'cocinalista-21',
    newTabDesktop: true,
  },

  tracking: {
    apiBaseUrl: 'https://channelad.io',
    productKey: 'aceitera-sweetview',
  },

  cta: {
    label: 'Ver en Amazon →',
    stickyLabel: 'Ver en Amazon',
    bottomLabel: 'Ver precio en Amazon →',
    sub: 'Envío rápido con Prime · Devolución fácil',
  },

  hero: {
    h1: 'Aceite, bajo control.',
    subhead: 'La aceitera de vidrio 2 en 1: niebla fina para la air fryer o un chorro al punto. Tú decides.',
    video: '/assets/v/hero.mp4',
    poster: '/assets/v/hero-poster.webp',
    chips: ['Spray + vertedor 2 en 1', 'Vidrio · 470 ml', '10 etiquetas incluidas'],
  },

  trust: {
    rating: 4.3,
    reviews: 10829,
    reviewsLabel: '+10.000 valoraciones',
  },

  disclosure: {
    micro: 'Enlace de afiliado · Como afiliado de Amazon, gano por las compras adscritas.',
    full:
      'Cocina Lista participa en el Programa de Afiliados de Amazon. Como afiliado de Amazon, ' +
      'obtenemos ingresos por las compras adscritas que cumplen los requisitos. Esto no supone ' +
      'coste adicional para ti.',
  },

  scenes: {
    spray: {
      video: '/assets/v/spray.mp4',
      poster: '/assets/v/spray-poster.webp',
      word: 'Pulveriza.',
      caption: 'Niebla fina y uniforme: la capa justa para la air fryer, la ensalada o la plancha.',
    },
    pour: {
      video: '/assets/v/pour.mp4',
      poster: '/assets/v/pour-poster.webp',
      word: 'O vierte.',
      caption: 'Gira el cabezal y cae un chorro limpio y al punto, sin goteos por el cristal.',
    },
  },

  labels: {
    title: 'Una botella, diez ingredientes.',
    sub: 'Trae 10 etiquetas pre-escritas: cámbiale el nombre, no de aceitera.',
    items: [
      'Olive Oil', 'Vinagre', 'Aguacate', 'Coco', 'Sésamo',
      'Girasol', 'Soja', 'Maíz', 'Cacahuete', 'Canola',
    ],
  },

  benefits: [
    {
      icon: 'flame',
      title: 'Menos aceite, menos calorías',
      body: 'La dosis justa en cada pulsación. Tu bolsillo y tu báscula lo notan.',
    },
    {
      icon: 'leaf',
      title: 'Vidrio a prueba de luz',
      body: 'El tono oscuro protege el aceite de la luz y conserva su sabor.',
    },
    {
      icon: 'droplet',
      title: 'Sin goteo, sin marranadas',
      body: 'Boca ancha para rellenar fácil y cierre que no mancha la encimera.',
    },
  ],

  stat: 'Una pulsación ≈ 10 kcal. Un chorro a ojo ≈ 120 kcal.',

  social: {
    testimonials: [
      {
        text: 'El spray reparte finísimo y el modo jarra va genial para la sartén.',
        who: 'Cocina a diario con air fryer',
      },
      {
        text: 'Bonita en la encimera y nada de dedos pringosos. Repetiría.',
        who: 'La usa para ensaladas y plancha',
      },
    ],
    footnote: 'Opiniones basadas en valoraciones públicas de Amazon, parafraseadas.',
  },

  faq: [
    {
      q: '¿Cuánto cuesta?',
      a: 'El precio lo pone Amazon y cambia con sus ofertas. Toca cualquier botón y lo ves al momento, sin compromiso.',
    },
    {
      q: '¿Dónde la compro?',
      a: 'En Amazon, con envío Prime y la garantía de Amazon.',
    },
    {
      q: '¿Puedo devolverla?',
      a: 'Sí, la compra y la devolución las gestiona Amazon.',
    },
    {
      q: '¿Sirve para la freidora de aire?',
      a: 'Sí: el modo spray crea la capa fina y uniforme que pide la air fryer, sin aerosoles de supermercado.',
    },
    {
      q: '¿Qué modelo es?',
      a: 'La aceitera SWEET VIEW 2 en 1 de vidrio (470 ml), con spray, vertedor y 10 etiquetas incluidas.',
    },
  ],

  finalCta: {
    headline: 'Llévatela a tu cocina.',
    sub: 'Aceite, bajo control desde el primer uso.',
    riskReversal: 'Si no te convence, la devuelves: Amazon se encarga de todo.',
  },
};
