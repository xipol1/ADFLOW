#!/usr/bin/env node
/**
 * Per-route prerender for the SPA shell.
 *
 * Vite ships a single dist/index.html for every route. HTML-only crawlers
 * (Ahrefs Site Audit, social unfurlers, bots that don't run JS) then read the
 * same <title>, description and canonical for /pricing, /marketplace, etc. and
 * flag them as duplicates of the homepage.
 *
 * This script runs AFTER `vite build`. For each public route it writes a copy
 * of dist/index.html with the <title>, meta description, canonical and OG/
 * Twitter tags baked in. vercel.json rewrites each route to its prerendered
 * file. react-helmet-async still owns runtime overrides after hydration — the
 * baked tags only need to be correct for the first HTML-only read.
 *
 * Home ("/") is NOT prerendered here: dist/index.html already carries the
 * homepage metadata as its baseline.
 *
 * Run: node scripts/prerender-routes.js  (wired into `npm run build`)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const INDEX = path.join(DIST, 'index.html');
const DOMAIN = 'https://channelad.io';
const OG_IMAGE = `${DOMAIN}/og-default.png`;

// Shared hreflang set for the /para-canales ↔ /en/for-creators bilingual pair.
const FORCREATORS_ALT = [
  { hreflang: 'es', href: DOMAIN + '/para-canales' },
  { hreflang: 'en', href: DOMAIN + '/en/for-creators' },
  { hreflang: 'x-default', href: DOMAIN + '/para-canales' },
];

// route → { title, description, lang?, alternates? }. Titles <= 60 chars, descriptions <= 160.
// Kept in sync with each page's <SEO>/<Helmet> props (client/src/ui/pages/**).
const ROUTES = {
  '/en/for-creators': {
    title: 'Monetize your WhatsApp, Telegram or Discord channel',
    description: 'Free for creators: list your channel, receive verified advertiser proposals and keep 100% of your price, protected by escrow. Get paid for sponsored posts in 2026.',
    lang: 'en',
    alternates: FORCREATORS_ALT,
  },
  '/blog/calculadora-precios-publicidad': {
    title: 'Calculadora precios publicidad Telegram/WhatsApp/Discord 2026',
    description: 'Calculadora interactiva 2026: cuánto cobrar por publicidad en tu canal en 30 segundos. CPMs reales del mercado español para Telegram, WhatsApp y Discord.',
  },
  '/para-anunciantes': {
    title: 'Publicidad en canales privados para marcas — Channelad',
    description: 'Compra publicidad en canales verificados de Telegram, WhatsApp, Discord y newsletters. Pago en escrow, métricas certificadas y benchmarks de CPM.',
  },
  '/para-canales': {
    title: 'Monetiza tu canal de WhatsApp, Telegram o Discord',
    description: 'Gratis para creadores: lista tu canal, recibe propuestas verificadas y cobra el 100% de tu precio en escrow. Toolkit de crecimiento incluido.',
    alternates: FORCREATORS_ALT,
  },
  '/marketplace': {
    title: 'Marketplace de canales verificados — Channelad',
    description: 'Explora canales verificados de WhatsApp, Telegram y Discord para publicitar tu marca. Filtra por nicho, audiencia y precio. Pagos custodiados.',
  },
  '/explore': {
    title: 'Explorar canales verificados — Channelad',
    description: 'Descubre canales verificados de Telegram, WhatsApp, Discord y Newsletter para publicidad. Filtra por categoría, audiencia y score.',
  },
  '/rankings': {
    title: 'Rankings de canales para publicidad — Channelad',
    description: 'Ranking de los mejores canales para publicidad en comunidades de Telegram, WhatsApp y Discord. Datos de audiencia y CPM por nicho.',
  },
  '/herramientas': {
    title: 'Herramientas para anunciantes — Channelad',
    description: '+30 herramientas para descubrir canales, analizar audiencia, optimizar ROI y ejecutar campañas en comunidades privadas.',
  },
  '/pricing': {
    title: 'Precios y planes — Channelad',
    description: 'Plan Free para empezar y Plan Pro con comisión rebajada (15%), bulk launcher, analytics avanzados y atribución. 14 días gratis sin tarjeta.',
  },
  '/que-es-channelad': {
    title: '¿Qué es Channelad? Cómo funciona',
    description: 'Marketplace de publicidad en canales de WhatsApp, Telegram y Discord con escrow, verificación de métricas vía API y factura emitida.',
  },
  '/sobre-nosotros': {
    title: 'Sobre nosotros — Channelad',
    description: 'Channelad es el marketplace de publicidad en comunidades de WhatsApp, Telegram y Discord. Hecho en España. Transparencia y pagos custodiados.',
  },
  '/soporte': {
    title: 'Centro de ayuda — Channelad',
    description: 'Soporte y preguntas frecuentes de Channelad. Resolvemos dudas sobre pagos custodiados, verificación de canales, disputas y más.',
  },
  '/privacidad': {
    title: 'Política de Privacidad — Channelad',
    description: 'Política de privacidad de Channelad. Cómo protegemos tus datos personales y gestionamos la información de anunciantes y creadores.',
  },
  '/terminos': {
    title: 'Términos de Uso — Channelad',
    description: 'Términos y condiciones de uso de Channelad. Reglas del marketplace de publicidad en comunidades de WhatsApp, Telegram y Discord.',
  },
};

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Replace the content of <meta name|property="key" content="..."> in place.
function setMeta(html, attr, key, value) {
  const re = new RegExp(
    `(<meta ${attr}="${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" content=")[^"]*(">)`
  );
  if (re.test(html)) return html.replace(re, `$1${escapeHtml(value)}$2`);
  return html;
}

function prerender(html, route, meta) {
  const url = DOMAIN + route;
  let out = html;
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(meta.title)}</title>`);
  out = out.replace(
    /(<link rel="canonical" href=")[^"]*(">)/,
    `$1${url}$2`
  );
  // Per-route language + reciprocal hreflang (bilingual pages). Baked into the
  // static HTML so HTML-only crawlers see them; SEO.jsx keeps them at runtime.
  if (meta.lang) {
    out = out.replace(/<html lang="[^"]*"/, `<html lang="${meta.lang}"`);
  }
  if (meta.alternates && meta.alternates.length) {
    const links = meta.alternates
      .map((a) => `<link rel="alternate" hreflang="${a.hreflang}" href="${a.href}">`)
      .join('\n    ');
    out = out.replace(/(<link rel="canonical" href="[^"]*">)/, `$1\n    ${links}`);
  }
  out = setMeta(out, 'name', 'description', meta.description);
  out = setMeta(out, 'property', 'og:title', meta.title);
  out = setMeta(out, 'property', 'og:description', meta.description);
  out = setMeta(out, 'property', 'og:url', url);
  out = setMeta(out, 'property', 'og:image', OG_IMAGE);
  out = setMeta(out, 'name', 'twitter:title', meta.title);
  out = setMeta(out, 'name', 'twitter:description', meta.description);
  out = setMeta(out, 'name', 'twitter:image', OG_IMAGE);
  return out;
}

// Home ("/") static hero: inject the prerendered shell (captured locally by
// scripts/snapshot-home.js) INTO dist/index.html so the hero paints before JS.
//
// Why index.html and not a separate file + rewrite: Vercel resolves the
// filesystem BEFORE `rewrites`, so a request for "/" is auto-served from
// dist/index.html and a `"/" -> "/home.html"` rewrite never fires. The only
// way to control what "/" returns is to put the markup in index.html itself.
//
// To keep the home hero from leaking onto OTHER SPA routes, the shell-free
// shell is written to dist/app.html and vercel.json points the catch-all
// (`/(.*)`) at /app.html instead of /index.html. So:
//   /                      -> index.html (hero shell)        [filesystem]
//   /pricing, /para-*, …   -> *.html (shell-free + meta)     [rewrite]
//   /dashboard, /auth, …   -> app.html (shell-free)          [catch-all rewrite]
// No-op (index.html left shell-free) if the snapshot is absent.
function injectHomeShell(baseHtml) {
  const SHELL = path.join(__dirname, 'home-shell.html');
  if (!fs.existsSync(SHELL)) {
    console.log('  ⏭️  scripts/home-shell.html missing — index.html served without prerendered hero');
    return;
  }
  const shell = fs.readFileSync(SHELL, 'utf-8');
  const out = baseHtml.replace('<div id="root"></div>', `<div id="root">${shell}</div>`);
  fs.writeFileSync(INDEX, out, 'utf-8');
  console.log(`  ✅ index.html (home hero shell injected, ${(shell.length / 1024).toFixed(1)} KB)`);
}

function build() {
  if (!fs.existsSync(INDEX)) {
    console.log('  ⏭️  dist/index.html missing — skipping prerender');
    return;
  }
  // Capture the shell-free build output first; every other artifact derives
  // from it before the shell is injected into index.html.
  const baseHtml = fs.readFileSync(INDEX, 'utf-8');

  // Shell-free SPA fallback for the catch-all rewrite (all non-prerendered,
  // non-home routes). Keeps an empty #root so app/marketing routes never flash
  // the home hero.
  fs.writeFileSync(path.join(DIST, 'app.html'), baseHtml, 'utf-8');
  console.log('  ✅ app.html (shell-free SPA fallback)');

  let count = 0;
  for (const [route, meta] of Object.entries(ROUTES)) {
    const out = prerender(baseHtml, route, meta);
    const file = path.join(DIST, route.replace(/^\//, '') + '.html');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, out, 'utf-8');
    console.log(`  ✅ ${path.basename(file)} (${meta.title.length}c title)`);
    count++;
  }

  injectHomeShell(baseHtml);
  console.log(`\n✨ Prerendered ${count} route(s) + app.html + home hero → dist/\n`);
}

console.log('\n🪞 Channelad route prerender\n');
build();
